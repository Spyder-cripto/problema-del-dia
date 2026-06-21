// quoridor/game.js — Juego: Quoridor (Mirko Marchesi, Gigamic 1997).
// Carrera con muros. Azul (0) sale arriba y debe llegar a la fila de ABAJO; Rojo (1)
// sale abajo y debe llegar a la de ARRIBA. En tu turno: o MUEVES tu peón a una casilla
// ortogonal libre (saltando al rival si lo tienes enfrente), o COLOCAS un muro de dos
// tramos en una ranura (si te quedan). REGLA DE ORO: un muro NO puede dejar a ningún
// peón sin ningún camino a su meta (se comprueba con un BFS en cada muro candidato).
//
// Encaje con el motor: alternancia estricta y «gana quien llega» (= el último que movió)
// → la negamax del motor es correcta. Como dos peones podrían pasearse sin fin, el estado
// lleva contador + TOPE de jugadas. CLAVE (corregido tras auditoría): el terminal-por-tope se
// resuelve como «último que movió» (winner = other(turn)), igual que todo terminal del motor;
// desempatar por camino más corto podría declarar ganador al jugador en turno y la IA
// malvaloraría ese final (incoherencia con la negamax). En partida real el tope casi nunca
// salta (se gana llegando a la meta). exactOK = false.
import { el } from '../_engine/svg.js';

const PAD = 14, CELL = 46, GAP = 12;
const cellX = (c) => PAD + c * (CELL + GAP);
const cellY = (r) => PAD + r * (CELL + GAP);

const CONFIGS = [
  { key: '5', label: '5×5 (3 muros)', n: 5, walls: 3 },
  { key: '7', label: '7×7 (5 muros)', n: 7, walls: 5 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

const other = (p) => p ^ 1;
const inB = (n, r, c) => r >= 0 && r < n && c >= 0 && c < n;
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

// Conjuntos de muros (desde los arrays serializables del estado).
function wallSets(s){ return { h: new Set(s.h), v: new Set(s.v) }; }

// ¿Hay muro entre dos casillas ortogonales adyacentes? (W = {h,v} sets)
function blocked(W, r1, c1, r2, c2){
  if (r1 === r2){                                   // movimiento horizontal
    const a = Math.min(c1, c2);
    return W.v.has(r1 + ',' + a) || W.v.has((r1 - 1) + ',' + a);
  } else {                                          // movimiento vertical
    const a = Math.min(r1, r2);
    return W.h.has(a + ',' + c1) || W.h.has(a + ',' + (c1 - 1));
  }
}

// Destinos legales del peón p (con la regla de salto sobre el rival).
function pawnMoves(s, p, W){
  const n = s.n;
  const [pr, pc] = s.pawns[p], [orr, occ] = s.pawns[other(p)];
  const out = [];
  for (const [dr, dc] of DIRS){
    const nr = pr + dr, nc = pc + dc;
    if (!inB(n, nr, nc) || blocked(W, pr, pc, nr, nc)) continue;
    if (nr === orr && nc === occ){                  // rival enfrente → salto
      const jr = nr + dr, jc = nc + dc;
      if (inB(n, jr, jc) && !blocked(W, nr, nc, jr, jc)) out.push([jr, jc]); // salto recto
      else {                                        // recto bloqueado → saltos diagonales
        const perp = dc === 0 ? [[0,-1],[0,1]] : [[-1,0],[1,0]];
        for (const [er, ec] of perp){
          const dr2 = nr + er, dc2 = nc + ec;
          if (inB(n, dr2, dc2) && !blocked(W, nr, nc, dr2, dc2)) out.push([dr2, dc2]);
        }
      }
    } else out.push([nr, nc]);
  }
  return out;
}

// Distancia (BFS, ignora al rival) del peón p a su fila-meta; Infinity si no hay camino.
function distToGoal(s, p, W){
  const n = s.n, goal = p === 0 ? n - 1 : 0;
  const [sr, sc] = s.pawns[p];
  if (sr === goal) return 0;
  const dist = new Array(n * n).fill(-1);
  const q = [[sr, sc]]; dist[sr * n + sc] = 0;
  for (let h = 0; h < q.length; h++){
    const [r, c] = q[h], d = dist[r * n + c];
    for (const [dr, dc] of DIRS){
      const nr = r + dr, nc = c + dc;
      if (!inB(n, nr, nc) || blocked(W, r, c, nr, nc) || dist[nr * n + nc] !== -1) continue;
      if (nr === goal) return d + 1;
      dist[nr * n + nc] = d + 1; q.push([nr, nc]);
    }
  }
  return Infinity;
}

// ¿Es legal colocar este muro? (no solapa/cruza y deja camino a AMBOS peones)
function wallLegal(s, W, o, r, c){
  if (o === 'h'){
    if (W.h.has(r + ',' + c) || W.h.has(r + ',' + (c - 1)) || W.h.has(r + ',' + (c + 1)) || W.v.has(r + ',' + c)) return false;
  } else {
    if (W.v.has(r + ',' + c) || W.v.has((r - 1) + ',' + c) || W.v.has((r + 1) + ',' + c) || W.h.has(r + ',' + c)) return false;
  }
  // probar el muro y exigir camino a ambos
  const W2 = { h: new Set(W.h), v: new Set(W.v) };
  (o === 'h' ? W2.h : W2.v).add(r + ',' + c);
  return distToGoal(s, 0, W2) !== Infinity && distToGoal(s, 1, W2) !== Infinity;
}

export const game = {
  meta: {
    nombre: 'Quoridor',
    slug: 'quoridor',
    subtitulo: 'Carrera con muros — llega al otro lado antes que el rival',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '↓ baja' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '↑ sube' },
    ],
    aiPlayer: 1,
    legend:
      '<b class="az">Azul</b> sale arriba y corre a la <b>fila de abajo</b>; ' +
      '<b class="ro">Rojo</b> sale abajo y corre a la <b>de arriba</b>. ' +
      'Cada turno: <b>mueve</b> tu peón o <b>coloca un muro</b> (los puntos en las ranuras). ' +
      'Un muro <b>nunca</b> puede dejar a alguien sin camino a su meta.',
    help:
      '<p>Es una carrera: el primero que llega a la fila del fondo contrario gana. En tu turno eliges entre ' +
      '<b>mover tu peón</b> una casilla (arriba, abajo, izquierda o derecha; si tienes al rival pegado puedes <b>saltarlo</b>) ' +
      'o <b>plantar un muro</b> de dos tramos en una ranura para alargarle el camino al otro.</p>' +
      '<p>Tienes pocos muros, así que gástalos bien. La <b>regla de oro</b>: un muro jamás puede <b>encerrar del todo</b> a un peón; ' +
      'siempre debe quedarle algún camino a su meta (el juego solo te deja colocar muros legales).</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">La máquina valora la <b>diferencia de caminos más cortos</b> a meta (los calcula con un BFS que respeta los muros) ' +
      'y usa los muros para estorbarte sin encerrarte. «💡 Pista» te sugiere su mejor jugada.</p>',
    footer: 'Quoridor, de Mirko Marchesi (Gigamic, 1997) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key), n = c.n, mid = (n - 1) >> 1;
    return { n, pawns: [[0, mid], [n - 1, mid]], h: [], v: [], wallsLeft: [c.walls, c.walls], turn: 0, moves: 0, cap: n * n * 8 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    if (this.isTerminal(s)) return [];
    const W = wallSets(s), out = [];
    for (const to of pawnMoves(s, s.turn, W)) out.push({ t: 'm', to });
    if (s.wallsLeft[s.turn] > 0){
      for (let r = 0; r < s.n - 1; r++) for (let c = 0; c < s.n - 1; c++){
        if (wallLegal(s, W, 'h', r, c)) out.push({ t: 'w', o: 'h', r, c });
        if (wallLegal(s, W, 'v', r, c)) out.push({ t: 'w', o: 'v', r, c });
      }
    }
    return out;
  },

  apply(s, m){
    const pawns = [s.pawns[0].slice(), s.pawns[1].slice()];
    const h = s.h.slice(), v = s.v.slice(), wallsLeft = s.wallsLeft.slice();
    if (m.t === 'm') pawns[s.turn] = m.to.slice();
    else { (m.o === 'h' ? h : v).push(m.r + ',' + m.c); wallsLeft[s.turn]--; }
    return { n: s.n, pawns, h, v, wallsLeft, turn: other(s.turn), moves: s.moves + 1, cap: s.cap };
  },

  isTerminal(s){
    if (s.pawns[0][0] === s.n - 1 || s.pawns[1][0] === 0) return true;   // alguien llegó
    if (s.moves >= s.cap) return true;
    return pawnMoves(s, s.turn, wallSets(s)).length === 0;               // (no debería: siempre hay camino)
  },

  winner(s){
    if (s.pawns[0][0] === s.n - 1) return 0;
    if (s.pawns[1][0] === 0) return 1;
    if (s.moves >= s.cap) return other(s.turn);   // tope = tablas → último que movió (coherente con la negamax)
    if (pawnMoves(s, s.turn, wallSets(s)).length === 0) return other(s.turn);
    return null;
  },

  evaluate(s, player){
    const W = wallSets(s), opp = other(player);
    const myD = distToGoal(s, player, W), opD = distToGoal(s, opp, W);
    return (opD - myD) * 10 + (s.wallsLeft[player] - s.wallsLeft[opp]) * 2;
  },

  key(s){ return s.pawns[0] + '|' + s.pawns[1] + '|' + s.h.join(';') + '|' + s.v.join(';') + '|' + s.wallsLeft + '|' + s.turn; },

  exactOK(s){ return false; },

  viewBox(s){ const W = PAD * 2 + s.n * CELL + (s.n - 1) * GAP; return '0 0 ' + W + ' ' + W; },

  render(svg, s, ctx){
    const n = s.n, cur = s.turn, W = wallSets(s);
    const goalRow = [n - 1, 0];

    // 1) casillas (resaltando las filas-meta de cada bando).
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){
      let cls = 'cell';
      if (r === goalRow[0]) cls += ' goal0';
      if (r === goalRow[1]) cls += ' goal1';
      el('rect', { class: cls, x: cellX(c), y: cellY(r), width: CELL, height: CELL, rx: 6 }, svg);
    }

    // 2) muros colocados.
    for (const k of s.h){ const [r, c] = k.split(',').map(Number); el('rect', { class: 'wall', x: cellX(c), y: cellY(r) + CELL, width: 2 * CELL + GAP, height: GAP, rx: 3 }, svg); }
    for (const k of s.v){ const [r, c] = k.split(',').map(Number); el('rect', { class: 'wall', x: cellX(c) + CELL, y: cellY(r), width: GAP, height: 2 * CELL + GAP, rx: 3 }, svg); }

    // 3) peones.
    for (let p = 0; p < 2; p++){ const [r, c] = s.pawns[p]; el('circle', { class: 'piece' + p, cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.30 }, svg); }

    if (!ctx.interactive) return;

    // 4) pista.
    if (ctx.hint){
      if (ctx.hint.t === 'm'){ const [r, c] = ctx.hint.to; el('rect', { class: 'halo', x: cellX(c) + 3, y: cellY(r) + 3, width: CELL - 6, height: CELL - 6, rx: 6 }, svg); }
      else if (ctx.hint.o === 'h'){ el('rect', { class: 'wall hintwall', x: cellX(ctx.hint.c), y: cellY(ctx.hint.r) + CELL, width: 2 * CELL + GAP, height: GAP, rx: 3 }, svg); }
      else { el('rect', { class: 'wall hintwall', x: cellX(ctx.hint.c) + CELL, y: cellY(ctx.hint.r), width: GAP, height: 2 * CELL + GAP, rx: 3 }, svg); }
    }

    const moves = this.legalMoves(s);

    // 5) destinos del peón como fantasmas clicables.
    for (const m of moves){
      if (m.t !== 'm') continue;
      const [r, c] = m.to;
      const g = el('circle', { class: 'ghost g' + cur, cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.30 }, svg);
      g.addEventListener('click', () => ctx.onMove(m));
    }

    // 6) muros legales: zona clicable en cada ranura (fina; se resalta al pasar el ratón).
    for (const m of moves){
      if (m.t !== 'w') continue;
      let attrs;
      if (m.o === 'h') attrs = { x: cellX(m.c), y: cellY(m.r) + CELL, width: 2 * CELL + GAP, height: GAP, rx: 3 };
      else attrs = { x: cellX(m.c) + CELL, y: cellY(m.r), width: GAP, height: 2 * CELL + GAP, rx: 3 };
      const z = el('rect', { class: 'wallslot', ...attrs }, svg);
      z.addEventListener('click', () => ctx.onMove(m));
    }
  },
};
