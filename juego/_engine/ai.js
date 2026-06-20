// _engine/ai.js — IA genérica para juegos por turnos de información perfecta.
//   chooseMove : negamax + poda alfa-beta (con ruido para los niveles fáciles).
//   solve      : resolutor EXACTO memoizado (¿gana quien mueve?) para tableros pequeños.
//   deepScore  : puntuación de búsqueda desde la óptica del jugador en turno.
//
// Convención de juego NORMAL: si te toca y no tienes jugada, PIERDES.

const WIN = 1e6;

// negamax con poda. Valor desde la óptica del jugador en turno en `state`.
function negamax(game, state, depth, alpha, beta){
  if (game.isTerminal(state)) return -WIN;                 // quien mueve no puede -> pierde
  if (depth <= 0) return game.evaluate ? game.evaluate(state, game.current(state)) : 0;
  let best = -Infinity;
  const moves = game.legalMoves(state);
  for (let i = 0; i < moves.length; i++){
    const v = -negamax(game, game.apply(state, moves[i]), depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

// Elige jugada. opts = { depth, randomness }.
export function chooseMove(game, state, opts){
  opts = opts || {};
  const depth = opts.depth != null ? opts.depth : 4;
  const randomness = opts.randomness || 0;
  const moves = game.legalMoves(state);
  if (!moves.length) return null;
  if (moves.length === 1) return moves[0];
  if (randomness > 0 && Math.random() < randomness) return moves[(Math.random() * moves.length) | 0];
  let best = [], bestScore = -Infinity;
  for (let i = 0; i < moves.length; i++){
    const v = -negamax(game, game.apply(state, moves[i]), depth - 1, -Infinity, Infinity);
    if (v > bestScore + 1e-9){ bestScore = v; best = [moves[i]]; }
    else if (Math.abs(v - bestScore) <= 1e-9){ best.push(moves[i]); }
  }
  return best[(Math.random() * best.length) | 0];
}

// Puntuación de la posición desde la óptica de quien mueve (para "¿quién gana?" aproximado).
export function deepScore(game, state, depth){
  return negamax(game, state, depth, -Infinity, Infinity);
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
