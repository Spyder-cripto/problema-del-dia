// game.mjs — FASE 2: lógica de juego (modelo de estado + movimientos legales + game-over +
// pista) para los dos acertijos de cruce de río. Puro (sin deps de node), importable en el
// navegador igual que solver.mjs.
//
// Construido SOBRE el oráculo (solver.mjs): comparte el predicado de seguridad `safeBank` y
// reusa SU misma función de transición, de modo que el juego y el óptimo son consistentes por
// construcción. Cada factory devuelve un objeto-juego con la misma interfaz:
//   { initial, isGoal, legalMoves, apply, hint, optimal, banks/peopleAt }
//
// Convención de MOVIMIENTO (objeto, no tupla — pensado para la UI):
//   remeros: { mn, mr, cn, cr, from, to, safe }   (no-remeros/remeros mis. + can., lado origen/destino)
//   islote : { m, c, from, to, safe }             (mis., can., ubicación origen/destino 0=izq 1=islote 2=der)
// Convención de RESULTADO de apply(state, move):
//   { next, status, reason? }
//   status: 'win' | 'loss' | 'ongoing' | 'invalid'
//   reason (loss):    'boat' (devorados en la barca) | 'bank'/'location' (devorados en una orilla/ubicación)
//   reason (invalid): 'empty' | 'capacity' | 'norower' | 'unavailable' | 'contiguity'

import { safeBank } from './solver.js';

const key = (s) => s.join(',');

// BFS desde un estado ARBITRARIO hasta la meta, recorriendo SOLO estados seguros (legales del
// puzzle). Devuelve { dist, move } — distancia mínima en travesías y el PRIMER movimiento óptimo
// de un camino más corto — o null si ya es meta / la meta es inalcanzable.
function bfsHint(start, goalKey, safeNeighbors){
  if (key(start) === goalKey) return null;
  const q = [start];
  const dist = new Map([[key(start), 0]]);
  const first = new Map([[key(start), null]]);   // primer movimiento del camino más corto hasta cada nodo
  let head = 0;
  while (head < q.length){
    const cur = q[head++]; const ck = key(cur); const d = dist.get(ck);
    if (ck === goalKey) return { dist: d, move: first.get(ck) };
    for (const { mv, ns } of safeNeighbors(cur)){
      const nk = key(ns);
      if (!dist.has(nk)){
        dist.set(nk, d + 1);
        first.set(nk, first.get(ck) ?? mv);       // hereda el primer movimiento; en el inicio (null) toma mv
        q.push(ns);
      }
    }
  }
  return null;
}

// ===================== Acertijo 1 — REMEROS =====================
// Estado [mnL, mrL, cnL, crL, side]: mis. no-remeros, mis. remeros, can. no-remeros, can. remeros
// en la orilla IZQUIERDA + lado de la barca (0=izq, 1=der). Idéntico al del oráculo.
export function makeRowers(M, C, MR, CR, b){
  const goal = [0, 0, 0, 0, 1];
  const goalKey = key(goal);
  const initial = [M - MR, MR, C - CR, CR, 0];

  // totales por orilla: [mIzq, cIzq, mDer, cDer]
  const banks = (s) => { const mL = s[0] + s[1], cL = s[2] + s[3]; return [mL, cL, M - mL, C - cL]; };

  // pasajeros disponibles en el lado donde está la barca, por categoría
  const avail = (s) => {
    const [mnL, mrL, cnL, crL, side] = s;
    if (side === 0) return { mn: mnL, mr: mrL, cn: cnL, cr: crL };
    const [, , mR, cR] = banks(s);
    const mrR = MR - mrL, crR = CR - crL;
    return { mn: mR - mrR, mr: mrR, cn: cR - crR, cr: crR };
  };

  // aplica el reparto a un estado (sin juzgar seguridad)
  const step = (s, { mn, mr, cn, cr }) => {
    const side = s[4];
    return side === 0
      ? [s[0] - mn, s[1] - mr, s[2] - cn, s[3] - cr, 1]
      : [s[0] + mn, s[1] + mr, s[2] + cn, s[3] + cr, 0];
  };

  const isGoal = (s) => key(s) === goalKey;

  // todos los movimientos FÍSICAMENTE posibles desde s (cabe en la barca + ≥1 remero); cada uno
  // anotado con `safe` (true si NO mata a nadie ni en la barca ni en las orillas).
  const legalMoves = (s) => {
    const a = avail(s); const side = s[4]; const out = [];
    for (let mn = 0; mn <= a.mn; mn++)
    for (let mr = 0; mr <= a.mr; mr++)
    for (let cn = 0; cn <= a.cn; cn++)
    for (let cr = 0; cr <= a.cr; cr++){
      const tot = mn + mr + cn + cr;
      if (tot < 1 || tot > b) continue;          // barca vacía o sobrecargada → imposible
      if (mr + cr < 1) continue;                 // sin remero → la barca no se mueve
      const ns = step(s, { mn, mr, cn, cr });
      const [nmL, ncL, nmR, ncR] = banks(ns);
      const safe = safeBank(mn + mr, cn + cr) && safeBank(nmL, ncL) && safeBank(nmR, ncR);
      out.push({ mn, mr, cn, cr, from: side, to: 1 - side, safe });
    }
    return out;
  };

  const apply = (s, mv) => {
    const a = avail(s); const { mn, mr, cn, cr } = mv; const tot = mn + mr + cn + cr;
    // validación física (la UI no debería ofrecer estos, pero la lógica se defiende)
    if (mn < 0 || mr < 0 || cn < 0 || cr < 0 || mn > a.mn || mr > a.mr || cn > a.cn || cr > a.cr)
      return { status: 'invalid', reason: 'unavailable' };
    if (tot < 1) return { status: 'invalid', reason: 'empty' };
    if (tot > b) return { status: 'invalid', reason: 'capacity' };
    if (mr + cr < 1) return { status: 'invalid', reason: 'norower' };
    const next = step(s, mv);
    if (!safeBank(mn + mr, cn + cr)) return { next, status: 'loss', reason: 'boat' };
    const [nmL, ncL, nmR, ncR] = banks(next);
    if (!safeBank(nmL, ncL) || !safeBank(nmR, ncR)) return { next, status: 'loss', reason: 'bank' };
    if (isGoal(next)) return { next, status: 'win' };
    return { next, status: 'ongoing' };
  };

  const safeNeighbors = (s) =>
    legalMoves(s).filter(m => m.safe).map(m => ({ mv: m, ns: step(s, m) }));

  const hint = (s) => bfsHint(s, goalKey, safeNeighbors);
  const optimal = () => { const h = hint(initial); return h ? h.dist : 0; };

  return { kind: 'rowers', M, C, MR, CR, b, initial, goal, isGoal, banks, legalMoves, apply, hint, optimal };
}

// ===================== Acertijo 2 — ISLOTE =====================
// Estado [mL, cL, mI, cI, boat]: mis./can. en la IZQUIERDA y en el ISLOTE + ubicación de la barca
// (0=izq, 1=islote, 2=der). Los de la derecha se deducen de los totales. Idéntico al del oráculo.
export function makeIsland(M, C, b){
  const goal = [0, 0, 0, 0, 2];
  const goalKey = key(goal);
  const initial = [M, C, 0, 0, 0];

  const peopleAt = (s, loc) =>
    loc === 0 ? [s[0], s[1]] :
    loc === 1 ? [s[2], s[3]] :
                [M - s[0] - s[2], C - s[1] - s[3]];

  const allSafe = (s) => [0, 1, 2].every(loc => { const [m, c] = peopleAt(s, loc); return safeBank(m, c); });

  const step = (s, { m, c, to }) => {
    const from = s[4]; const d = [s[0], s[1], s[2], s[3]];
    const add = (loc, dm, dc) => { if (loc === 0){ d[0] += dm; d[1] += dc; } else if (loc === 1){ d[2] += dm; d[3] += dc; } };
    add(from, -m, -c); add(to, m, c);
    return [d[0], d[1], d[2], d[3], to];
  };

  const isGoal = (s) => key(s) === goalKey;

  const legalMoves = (s) => {
    const boat = s[4]; const [mHere, cHere] = peopleAt(s, boat); const out = [];
    for (const to of [boat - 1, boat + 1]){
      if (to < 0 || to > 2) continue;            // la corriente solo deja navegar entre contiguos
      for (let m = 0; m <= mHere; m++)
      for (let c = 0; c <= cHere; c++){
        const tot = m + c;
        if (tot < 1 || tot > b) continue;
        const ns = step(s, { m, c, to });
        const safe = safeBank(m, c) && allSafe(ns);
        out.push({ m, c, from: boat, to, safe });
      }
    }
    return out;
  };

  const apply = (s, mv) => {
    const boat = s[4]; const [mHere, cHere] = peopleAt(s, boat);
    const { m, c, to } = mv; const tot = m + c;
    if (to < 0 || to > 2 || (to !== boat - 1 && to !== boat + 1))
      return { status: 'invalid', reason: 'contiguity' };
    if (m < 0 || c < 0 || m > mHere || c > cHere) return { status: 'invalid', reason: 'unavailable' };
    if (tot < 1) return { status: 'invalid', reason: 'empty' };
    if (tot > b) return { status: 'invalid', reason: 'capacity' };
    const next = step(s, mv);
    if (!safeBank(m, c)) return { next, status: 'loss', reason: 'boat' };
    if (!allSafe(next)) return { next, status: 'loss', reason: 'location' };
    if (isGoal(next)) return { next, status: 'win' };
    return { next, status: 'ongoing' };
  };

  const safeNeighbors = (s) =>
    legalMoves(s).filter(mv => mv.safe).map(mv => ({ mv, ns: step(s, mv) }));

  const hint = (s) => bfsHint(s, goalKey, safeNeighbors);
  const optimal = () => { const h = hint(initial); return h ? h.dist : 0; };

  return { kind: 'island', M, C, b, initial, goal, isGoal, peopleAt, legalMoves, apply, hint, optimal };
}
