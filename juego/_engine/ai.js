// _engine/ai.js — IA genérica para juegos por turnos de información perfecta.
//   chooseMove : negamax + alfa-beta con PROFUNDIZACIÓN ITERATIVA y presupuesto de tiempo.
//   solve      : resolutor EXACTO memoizado (¿gana quien mueve?) para tableros pequeños.
//   deepScore  : puntuación de búsqueda desde la óptica del jugador en turno (acotada en tiempo).
//
// Convención de juego NORMAL: si te toca y no tienes jugada, PIERDES.
//
// Detalle clave: el valor de un final lleva DESCUENTO POR PROFUNDIDAD (WIN - ply). Así, entre
// varias líneas ganadoras la IA elige la que REMATA antes (y aplaza las derrotas), en vez de
// empatarlas todas en WIN y elegir al azar una lenta. Esto es esencial en juegos de conexión.

const WIN = 1e6;
const MATE = WIN - 50000;   // por encima de este umbral, es un final forzado (no una heurística)

// negamax con poda. `ply` = nº de jugadas desde la raíz (para descontar los finales).
function negamax(game, state, depth, alpha, beta, ply){
  if (game.isTerminal(state)) return -(WIN - ply);         // quien mueve no puede -> pierde (antes = peor)
  if (depth <= 0) return game.evaluate ? game.evaluate(state, game.current(state)) : 0;
  let best = -Infinity;
  const moves = game.legalMoves(state);
  for (let i = 0; i < moves.length; i++){
    const v = -negamax(game, game.apply(state, moves[i]), depth - 1, -beta, -alpha, ply + 1);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Elige jugada. opts = { depth (máx), randomness, timeMs }.
// Profundiza 1,2,...,depth y se detiene si agota el presupuesto de tiempo; se queda con el
// resultado de la última profundidad COMPLETADA (nunca se congela aunque la ramificación sea alta).
export function chooseMove(game, state, opts){
  opts = opts || {};
  const maxDepth = opts.depth != null ? opts.depth : 4;
  const randomness = opts.randomness || 0;
  const timeMs = opts.timeMs != null ? opts.timeMs : 1500;
  const moves = game.legalMoves(state);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (randomness > 0 && Math.random() < randomness) return moves[(Math.random() * moves.length) | 0];

  const start = Date.now();
  let best = [moves[0]];
  for (let d = 1; d <= maxDepth; d++){
    let curBest = [], curScore = -Infinity, aborted = false;
    for (let i = 0; i < moves.length; i++){
      const v = -negamax(game, game.apply(state, moves[i]), d - 1, -Infinity, Infinity, 1);
      if (v > curScore + 1e-9){ curScore = v; curBest = [moves[i]]; }
      else if (Math.abs(v - curScore) <= 1e-9){ curBest.push(moves[i]); }
      if (Date.now() - start > timeMs){ aborted = true; break; }
    }
    if (!aborted && curBest.length) best = curBest;   // solo me fío de una profundidad completada
    if (aborted) break;
    if (curScore >= MATE || curScore <= -MATE) break; // final forzado encontrado: no profundizo más
    if (Date.now() - start > timeMs) break;
  }
  return best[(Math.random() * best.length) | 0];
}

// ===================== MCTS (UCT) — driver 'mcts' =====================
// IA por SIMULACIÓN para juegos donde el negamax se ahoga (árbol gigante → prof. 1 →
// heurística sin lookahead): p.ej. Havannah base-8. UCT vanilla: selección UCB1 →
// expansión → playout aleatorio hasta terminal → retropropagación. Devuelve el hijo MÁS
// VISITADO. Presupuesto de TIEMPO (coherente con el resto del motor). RNG SEMBRADO
// (reproducible para regresión). v1 NO usa evaluate (playouts puros aleatorios).
//
// ADITIVO: el negamax y su despacho quedan INTACTOS; esto solo añade funciones nuevas y la
// rama 'mcts' en aiMove. Solo usa el CONTRATO (legalMoves/apply/isTerminal/winner/current).
// Si el juego ofrece un `rollout(state, rng)` rápido (playout especializado, p.ej. detección
// de victoria incremental), MCTS lo usa para la SIMULACIÓN; si no, hace el playout genérico.

const _other = (p) => (p === 0 ? 1 : 0);

// PRNG sembrable (mulberry32): determinista por semilla → regresión reproducible.
function mcRng(seed){
  let a = seed >>> 0;
  return function(){
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function mcHash(str){ let h = 2166136261; for (let i = 0; i < str.length; i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// Playout genérico (SOLO contrato): jugadas legales uniformemente aleatorias hasta terminal.
// legalMoves(s) == [] tanto con ganador como con tablero lleno → detector de terminal (1 sola
// llamada a winner() por ply, no 2). Devuelve el ganador (0/1/null).
function genericRollout(game, state, rng){
  let s = state;
  for (let guard = 0; guard < 100000; guard++){
    const moves = game.legalMoves(s);
    if (!moves.length) break;
    s = game.apply(s, moves[(rng() * moves.length) | 0]);
  }
  return game.winner(s);
}

function mcNode(game, state, parent, move){
  const terminal = game.isTerminal(state);
  return {
    state, parent, move, children: [],
    untried: terminal ? [] : game.legalMoves(state),
    N: 0, W: 0, terminal, winner: terminal ? game.winner(state) : null,
  };
}

// MCTS: opts = { timeMs, randomness, seed }. params = game.meta.aiParams = { c, maxSims }.
// Mete en mcts.lastSims el nº de simulaciones logradas (solo para medir; no afecta la jugada).
export function mcts(game, state, opts, params){
  opts = opts || {}; params = params || {};
  const timeMs = opts.timeMs != null ? opts.timeMs : 1500;
  const cParam = params.c != null ? params.c : 1.414;
  const maxSims = params.maxSims != null ? params.maxSims : Infinity;
  const randomness = opts.randomness || 0;

  const rootMoves = game.legalMoves(state);
  if (!rootMoves.length) return null;
  if (rootMoves.length === 1){ mcts.lastSims = 0; return rootMoves[0]; }

  const seed = (opts.seed != null) ? (opts.seed >>> 0)
             : mcHash(game.key ? game.key(state) : JSON.stringify(state));
  const rng = mcRng(seed);

  // Ruido de dificultad (espejo del `randomness` del negamax): a veces juega al azar.
  if (randomness > 0 && rng() < randomness){ mcts.lastSims = 0; return rootMoves[(rng() * rootMoves.length) | 0]; }

  const hasFast = (typeof game.rollout === 'function');
  const rollout = hasFast ? (s) => game.rollout(s, rng) : (s) => genericRollout(game, s, rng);

  const root = mcNode(game, state, null, null);
  const start = Date.now();
  let iters = 0;
  while (iters < maxSims && Date.now() - start < timeMs){
    // SELECCIÓN: desciende por UCB1 hasta una hoja con jugadas sin probar o un terminal.
    let node = root;
    while (node.untried.length === 0 && node.children.length > 0){
      let best = null, bestVal = -Infinity; const lnN = Math.log(node.N);
      for (let i = 0; i < node.children.length; i++){
        const ch = node.children[i];
        const v = ch.W / ch.N + cParam * Math.sqrt(lnN / ch.N);
        if (v > bestVal){ bestVal = v; best = ch; }
      }
      node = best;
    }
    // EXPANSIÓN: añade un hijo nuevo (jugada sin probar elegida al azar).
    if (node.untried.length > 0){
      const idx = (rng() * node.untried.length) | 0;
      const m = node.untried.splice(idx, 1)[0];
      const child = mcNode(game, game.apply(node.state, m), node, m);
      node.children.push(child);
      node = child;
    }
    // SIMULACIÓN: playout aleatorio hasta terminal (o resultado directo si el nodo es terminal).
    const z = node.terminal ? node.winner : rollout(node.state);
    // RETROPROPAGACIÓN: en cada nodo, recompensa desde la óptica de quien MOVIÓ para llegar a él.
    for (let u = node; u; u = u.parent){
      u.N++;
      const mover = _other(game.current(u.state));   // jugador que movió para crear u
      u.W += (z === null) ? 0.5 : (z === mover ? 1 : 0);
    }
    iters++;
  }
  mcts.lastSims = iters;

  // Devuelve el hijo MÁS VISITADO (más robusto que el de mayor win-rate ante la varianza de UCB).
  let best = null, bestN = -1;
  for (let i = 0; i < root.children.length; i++){
    if (root.children[i].N > bestN){ bestN = root.children[i].N; best = root.children[i]; }
  }
  return best ? best.move : rootMoves[0];
}

// Despachador de elección de jugada por DRIVER DECLARADO (game.meta.aiDriver).
//   'negamax' (defecto) → camino histórico INTACTO: los juegos eligen igual que siempre.
//   'custom'            → el juego aporta su PROPIA IA en game.chooseMove(state, opts)
//                         (p.ej. Dots and Boxes: scoring + turno extra, ajenos a la negamax).
//   'mcts'              → UCT por simulación (p.ej. Havannah base-8); params en meta.aiParams.
// Despacho por capacidad, NO por nombre de juego.
export function aiMove(game, state, opts){
  const driver = (game.meta && game.meta.aiDriver) || 'negamax';
  if (driver === 'mcts') return mcts(game, state, opts, game.meta && game.meta.aiParams);
  if (driver === 'custom' && typeof game.chooseMove === 'function') return game.chooseMove(state, opts);
  return chooseMove(game, state, opts);
}

// Puntuación de la posición desde la óptica de quien mueve (para "¿quién gana?" aproximado).
// Profundización iterativa acotada en tiempo: devuelve el valor de la profundidad más honda completada.
export function deepScore(game, state, maxDepth, timeMs){
  timeMs = timeMs != null ? timeMs : 1200;
  const start = Date.now();
  let score = game.isTerminal(state)
    ? -WIN
    : (game.evaluate ? game.evaluate(state, game.current(state)) : 0);
  for (let d = 1; d <= maxDepth; d++){
    score = negamax(game, state, d, -Infinity, Infinity, 0);
    if (Date.now() - start > timeMs) break;
  }
  return score;
}

// Resolutor EXACTO: ¿gana el jugador en turno con juego perfecto? Memoizado por game.key.
export function solve(game, state, nodeCap){
  nodeCap = nodeCap || 600000;
  const memo = new Map();
  let nodes = 0, capped = false;
  function win(s){
    if (game.isTerminal(s)) return false;                  // quien mueve pierde
    const k = game.key ? game.key(s) : null;
    if (k != null){ const m = memo.get(k); if (m !== undefined) return m; }
    if (++nodes > nodeCap){ capped = true; return false; }
    let res = false;
    const moves = game.legalMoves(s);
    for (let i = 0; i < moves.length; i++){
      if (!win(game.apply(s, moves[i]))){ res = true; break; }   // dejo al rival en posición perdedora
    }
    if (k != null && !capped) memo.set(k, res);
    return res;
  }
  const r = win(state);
  return { winnerIsCurrent: r, capped };
}
