// suma-15/game.js — «Sumar 15» con cartas: el tres en raya disfrazado. Lógica pura, SIN DOM (probada en test.mjs).
//
// Reglas: nueve cartas boca arriba, del 1 al 9. Dos jugadores cogen una carta por turno y se la quedan.
// Gana el primero que tenga TRES cartas que sumen 15. Si se acaban las cartas sin que nadie lo logre, empate.
//
// El truco: las ocho ternas de cartas distintas que suman 15 son exactamente las ocho líneas del cuadrado mágico
//   2 7 6 / 9 5 1 / 4 3 8
// (3 filas, 3 columnas y 2 diagonales). Coger una carta equivale a marcar esa casilla: es el tres en raya.
//
// Jugadores: 0 y 1. `first` dice quién mueve primero. Un estado es inmutable (play devuelve uno nuevo):
//   { owner: [-1, o1..o9]  (owner[carta] = -1 libre, 0 o 1),  moves: [cartas en orden],  first }

export const CARDS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
export const MAGIC = [[2, 7, 6], [9, 5, 1], [4, 3, 8]];
export const TRIPLES = (() => {
  const t = [];
  for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) for (let c = b + 1; c <= 9; c++) if (a + b + c === 15) t.push([a, b, c]);
  return t;
})();
// las ocho líneas del tres en raya sobre el cuadrado mágico (filas, columnas y diagonales), como listas de cartas
export const MAGIC_LINES = (() => {
  const L = [];
  for (let r = 0; r < 3; r++) L.push(MAGIC[r].slice());
  for (let c = 0; c < 3; c++) L.push([MAGIC[0][c], MAGIC[1][c], MAGIC[2][c]]);
  L.push([MAGIC[0][0], MAGIC[1][1], MAGIC[2][2]], [MAGIC[0][2], MAGIC[1][1], MAGIC[2][0]]);
  return L;
})();
export function magicPos(card) {   // [fila, columna] de la carta en el cuadrado mágico
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (MAGIC[r][c] === card) return [r, c];
  throw new Error('carta fuera de 1..9: ' + card);
}

// ---------- estado ----------
export function newGame(first = 0) { return { owner: [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1], moves: [], first }; }
export const turn = S => (S.first + S.moves.length) % 2;
export function play(S, card) {
  if (!Number.isInteger(card) || card < 1 || card > 9 || S.owner[card] !== -1) throw new Error('jugada ilegal: ' + card);
  if (isOver(S)) throw new Error('la partida ya ha terminado');
  const owner = S.owner.slice(); owner[card] = turn(S);
  return { owner, moves: S.moves.concat(card), first: S.first };
}
export const hand = (S, p) => CARDS.filter(c => S.owner[c] === p);

// ¿ha ganado el jugador p? devuelve la terna ganadora (la primera encontrada) o null
export function winTriple(S, p) {
  for (const t of TRIPLES) if (t.every(c => S.owner[c] === p)) return t.slice();
  return null;
}
export function result(S) {   // { over, winner: 0|1|null, triple }
  for (const p of [0, 1]) { const t = winTriple(S, p); if (t) return { over: true, winner: p, triple: t }; }
  return { over: S.moves.length === 9, winner: null, triple: null };
}
export const isOver = S => result(S).over;
export const legalMoves = S => (isOver(S) ? [] : CARDS.filter(c => S.owner[c] === -1));

// cartas LIBRES con las que el jugador p sumaría 15 (tiene ya las otras dos de una terna)
export function threats(S, p) {
  const out = new Set();
  for (const t of TRIPLES) {
    const libres = t.filter(c => S.owner[c] === -1), mias = t.filter(c => S.owner[c] === p);
    if (libres.length === 1 && mias.length === 2) out.add(libres[0]);
  }
  return [...out].sort((a, b) => a - b);
}

// ---------- solución exacta (minimax con memoria): puntuación desde el punto de vista del JUGADOR 0 ----------
// ganar antes puntúa más y perder más tarde puntúa menos, para que la máquina perfecta no se demore ni se rinda pronto
const memo = new Map();
const keyOf = S => S.owner.slice(1).join('') + turn(S);
export function score(S) {
  const r = result(S);
  if (r.over) return r.winner === null ? 0 : (r.winner === 0 ? 1 : -1) * (10 - S.moves.length);
  const k = keyOf(S);
  if (memo.has(k)) return memo.get(k);
  const p = turn(S); let best = p === 0 ? -Infinity : Infinity;
  for (const c of legalMoves(S)) { const v = score(play(S, c)); if (p === 0 ? v > best : v < best) best = v; }
  memo.set(k, best);
  return best;
}
// valor del juego con juego perfecto: +1 gana el jugador 0, 0 empate, −1 gana el jugador 1
export const value = S => Math.sign(score(S));

// ---------- la máquina, en tres niveles ----------
export const LEVELS = ['aleatorio', 'mcts', 'perfecto'];
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function randomMove(S, rng = Math.random) { return pick(legalMoves(S), rng); }

export function perfectMove(S, rng = Math.random) {
  const p = turn(S), ms = legalMoves(S);
  const vals = ms.map(c => score(play(S, c)));
  const best = p === 0 ? Math.max(...vals) : Math.min(...vals);
  return pick(ms.filter((c, i) => vals[i] === best), rng);
}

// MCTS corto (UCT): pocas simulaciones, así que juega bien pero no siempre perfecto
export function mctsMove(S, rng = Math.random, sims = 150) {
  const mk = (st, parent, card) => ({ S: st, parent, card, N: 0, W: 0, kids: [], untried: legalMoves(st) });
  const root = mk(S, null, null);
  const rewardFor = (res, p) => (res.winner === null ? 0.5 : res.winner === p ? 1 : 0);
  for (let i = 0; i < sims; i++) {
    let n = root;
    while (!n.untried.length && n.kids.length) {   // selección UCB1
      const lnN = Math.log(n.N + 1);
      let best = null, bv = -Infinity;
      for (const k of n.kids) { const v = k.W / k.N + 1.4 * Math.sqrt(lnN / k.N); if (v > bv) { bv = v; best = k; } }
      n = best;
    }
    if (n.untried.length) {   // expansión
      const c = n.untried.splice(Math.floor(rng() * n.untried.length), 1)[0];
      const k = mk(play(n.S, c), n, c); n.kids.push(k); n = k;
    }
    let s = n.S;              // simulación al azar
    while (!isOver(s)) s = play(s, randomMove(s, rng));
    const res = result(s);
    for (let x = n; x.parent; x = x.parent) { x.N++; x.W += rewardFor(res, turn(x.parent.S)); }   // gana quien movió hacia x
    root.N++;
  }
  let best = root.kids[0];
  for (const k of root.kids) if (k.N > best.N) best = k;
  return best.card;
}

export function machineMove(level, S, rng = Math.random) {
  if (level === 'aleatorio') return randomMove(S, rng);
  if (level === 'mcts') return mctsMove(S, rng);
  if (level === 'perfecto') return perfectMove(S, rng);
  throw new Error('nivel desconocido: ' + level);
}

// ---------- ¿en qué momento se decidió? ----------
// Repasa la partida con el solucionador exacto. Para cada jugada: valor ANTES y DESPUÉS (desde el jugador 0: +1, 0, −1)
// y si fue un error (empeoró el resultado teórico para quien la jugó).
export function analyze(moves, first = 0) {
  let S = newGame(first); const out = [];
  for (let i = 0; i < moves.length; i++) {
    const antes = value(S), p = turn(S);
    S = play(S, moves[i]);
    const despues = value(S);
    const empeora = p === 0 ? despues < antes : despues > antes;
    out.push({ n: i + 1, player: p, card: moves[i], antes, despues, error: empeora });
  }
  const fin = result(S);
  // jugada decisiva: la que dejó el resultado teórico a favor del ganador para ya no cambiar (siempre es un error del perdedor)
  let decisiva = null;
  if (fin.winner !== null) {
    const v = fin.winner === 0 ? 1 : -1;
    let i = out.length - 1; while (i >= 0 && out[i].despues === v) i--;
    decisiva = out[i + 1] && out[i + 1].error ? out[i + 1] : null;
  }
  return { jugadas: out, resultado: fin, decisiva };
}
