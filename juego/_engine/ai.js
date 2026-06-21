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

// Despachador de elección de jugada por DRIVER DECLARADO (game.meta.aiDriver).
//   'negamax' (defecto) → camino histórico INTACTO: los 20 juegos eligen igual que siempre.
//   'custom'            → el juego aporta su PROPIA IA en game.chooseMove(state, opts)
//                         (p.ej. Dots and Boxes: scoring + turno extra, ajenos a la negamax).
//   (reservado: 'mcts' lo añadirá la tarea de MCTS de motor, despachando aquí mismo.)
// Despacho por capacidad, NO por nombre de juego.
export function aiMove(game, state, opts){
  const driver = (game.meta && game.meta.aiDriver) || 'negamax';
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
