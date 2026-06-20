// isola/game.js — Juego: Isola (también «Isolation», editado por Schmidt Spiele).
// Cada bando tiene UN peón. En tu turno haces DOS cosas seguidas:
//   1) MUEVES tu peón a una de las 8 casillas vecinas que esté en el tablero, no
//      destruida y no ocupada por el rival;
//   2) DESTRUYES una casilla cualquiera (en el tablero, no destruida y no ocupada por
//      ningún peón) — la casilla que acabas de dejar SÍ se puede destruir.
// PIERDE quien, al empezar su turno, no puede mover su peón (queda aislado).
//
// Encaje con el motor (juego NORMAL: a quien le toca y no puede mover, pierde):
// cada turno destruye exactamente una casilla → el tablero solo encoge → la partida
// SIEMPRE termina (a lo sumo filas·cols−2 turnos) y NUNCA hay empate. Gana el último
// que movió → winner = other(turn). Sin contadores ni topes: el contrato sale natural.
import { el } from '../_engine/svg.js';

const PAD = 14, CELL = 44;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '5x5', label: '5×5', rows: 5, cols: 5 },
  { key: '6x6', label: '6×6', rows: 6, cols: 6 },
  { key: '7x7', label: '7×7', rows: 7, cols: 7 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

const idx = (s, r, c) => r * s.cols + c;
const other = (p) => p ^ 1;
const inB = (s, r, c) => r >= 0 && r < s.rows && c >= 0 && c < s.cols;
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

// Casillas a las que el peón en [r,c] puede moverse (vecinas abiertas, no el rival).
function pawnDests(s, r, c, oppPos){
  const out = [];
  for (const [dr, dc] of DIRS){
    const r2 = r + dr, c2 = c + dc;
    if (!inB(s, r2, c2)) continue;
    if (s.cells[idx(s, r2, c2)] !== 0) continue;          // destruida
    if (r2 === oppPos[0] && c2 === oppPos[1]) continue;    // ocupada por el rival
    out.push([r2, c2]);
  }
  return out;
}

// Cuántas casillas alcanza cada peón ANTES que el otro (heurística de territorio /
// Voronoi: el motor del Tron). BFS 8-direccional simultáneo sobre casillas abiertas.
function territory(s){
  const N = s.rows * s.cols;
  const dist = [new Array(N).fill(-1), new Array(N).fill(-1)];
  for (let p = 0; p < 2; p++){
    const [pr, pc] = s.pawns[p];
    const q = [[pr, pc]];
    dist[p][idx(s, pr, pc)] = 0;
    for (let h = 0; h < q.length; h++){
      const [r, c] = q[h], d = dist[p][idx(s, r, c)];
      for (const [dr, dc] of DIRS){
        const r2 = r + dr, c2 = c + dc;
        if (!inB(s, r2, c2)) continue;
        const i2 = idx(s, r2, c2);
        if (s.cells[i2] !== 0) continue;                  // no se puede pisar destruida
        if (dist[p][i2] !== -1) continue;
        dist[p][i2] = d + 1;
        q.push([r2, c2]);
      }
    }
  }
  let mine = 0, theirs = 0;
  for (let i = 0; i < N; i++){
    const a = dist[0][i], b = dist[1][i];
    if (a === -1 && b === -1) continue;
    if (a === -1) { theirs++; continue; }
    if (b === -1) { mine++; continue; }
    if (a < b) mine++; else if (b < a) theirs++;          // empate de distancia: neutral
  }
  return [mine, theirs]; // desde la óptica del jugador 0
}

export const game = {
  meta: {
    nombre: 'Isola',
    slug: 'isola',
    subtitulo: 'Aísla a tu rival — muévete y destruye una casilla',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '' },
    ],
    aiPlayer: 1,
    legend:
      'Cada turno: <b>1)</b> mueve tu peón a una casilla vecina (las 8 direcciones) ' +
      'y <b>2)</b> <b>destruye</b> una casilla del tablero. ' +
      '<b>Pierde quien no pueda mover</b> porque ha quedado rodeado de huecos y bordes.',
    help:
      '<p>Hay un peón de cada color. En tu turno haces <b>dos cosas, en este orden</b>: ' +
      'primero <b>mueves tu peón</b> a una de las ocho casillas que lo rodean (debe estar en el tablero, ' +
      'no puede estar destruida ni ocupada por el rival); después <b>destruyes una casilla</b> cualquiera ' +
      'que siga en pie y esté vacía —incluida la que acabas de abandonar—.</p>' +
      '<p>La casilla destruida ya no vuelve. Poco a poco el tablero se va llenando de huecos. ' +
      '<b>Pierde el primero que, al llegarle el turno, no tenga ni una casilla a la que saltar.</b> ' +
      'La gracia está en <b>destruir las casillas que le sirven al rival</b> sin quedarte tú sin salidas.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">El tablero encoge una casilla por turno, así que la partida ' +
      'siempre acaba y nunca hay empate. La máquina valora el <b>territorio</b>: cuántas casillas alcanza cada peón ' +
      'antes que el otro. «💡 Pista» te sugiere su mejor jugada.</p>',
    footer: 'Isola (Isolation), un clásico de tablero de mediados del siglo XX · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    const cells = new Array(c.rows * c.cols).fill(0);     // 0 = en pie, 1 = destruida
    const mid = (c.cols - 1) >> 1;
    return {
      rows: c.rows, cols: c.cols, cells,
      pawns: [[0, mid], [c.rows - 1, mid]],                // Azul arriba, Rojo abajo
      turn: 0,
    };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const p = s.turn, opp = other(p);
    const dests = pawnDests(s, s.pawns[p][0], s.pawns[p][1], s.pawns[opp]);
    if (!dests.length) return [];                          // aislado → terminal, sin jugadas
    const N = s.rows * s.cols;
    const moves = [];
    for (const to of dests){
      const ti = idx(s, to[0], to[1]);
      const oi = idx(s, s.pawns[opp][0], s.pawns[opp][1]);
      for (let i = 0; i < N; i++){
        if (s.cells[i] !== 0) continue;                    // ya destruida
        if (i === ti || i === oi) continue;                // ocupada tras el movimiento
        moves.push({ to, rem: [Math.floor(i / s.cols), i % s.cols] });
      }
    }
    return moves;
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[idx(s, m.rem[0], m.rem[1])] = 1;                 // destruir
    const pawns = [s.pawns[0].slice(), s.pawns[1].slice()];
    pawns[s.turn] = m.to.slice();                          // mover (después de fijar rem)
    return { rows: s.rows, cols: s.cols, cells, pawns, turn: other(s.turn) };
  },

  isTerminal(s){
    const p = s.turn, opp = other(p);
    return pawnDests(s, s.pawns[p][0], s.pawns[p][1], s.pawns[opp]).length === 0;
  },

  winner(s){ return this.isTerminal(s) ? other(s.turn) : null; },

  // Heurística desde la óptica de `player`: territorio (Voronoi) + movilidad inmediata.
  evaluate(s, player){
    const opp = other(player);
    const myMob = pawnDests(s, s.pawns[player][0], s.pawns[player][1], s.pawns[opp]).length;
    const opMob = pawnDests(s, s.pawns[opp][0], s.pawns[opp][1], s.pawns[player]).length;
    if (myMob === 0) return -1e6 + 1;                      // me quedo sin salida: casi perdido
    const [t0, t1] = territory(s);
    const myT = player === 0 ? t0 : t1;
    const opT = player === 0 ? t1 : t0;
    return (myT - opT) * 8 + (myMob - opMob) * 2;
  },

  key(s){ return s.cells.join('') + '|' + s.pawns[0] + '|' + s.pawns[1] + '|' + s.turn; },

  // Espacio de estados grande (posiciones de peón × subconjuntos de casillas): no exacto.
  exactOK(s){ return false; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    const cur = s.turn, opp = other(cur);
    const INSET = 3, RAD = 6;
    const moves = ctx.interactive ? this.legalMoves(s) : [];

    // Selección efímera de la fase 2 (destino elegido, esperando qué casilla destruir).
    // Se guarda en el nodo svg para sobrevivir entre redibujados del mismo turno.
    let pick = svg._isoPick || null;
    if (pick){                                             // validar que sigue siendo legal
      const ok = moves.some(m => m.to[0] === pick.to[0] && m.to[1] === pick.to[1]);
      if (!ok) pick = null;
    }
    svg._isoPick = pick;

    // Posición de cada peón AHORA (con la previsualización si ya elegimos destino).
    const pawnPos = [s.pawns[0].slice(), s.pawns[1].slice()];
    if (pick) pawnPos[cur] = pick.to.slice();

    // 1) casillas (en pie / destruidas).
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      const dead = s.cells[idx(s, r, c)] === 1;
      el('rect', {
        class: dead ? 'dead' : 'cell',
        x: cellX(c) + INSET, y: cellY(r) + INSET,
        width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD,
      }, svg);
    }

    if (ctx.interactive && ctx.hint){
      // Pista: resalta destino del peón y casilla a destruir.
      const [hr, hc] = ctx.hint.to, [rr, rc] = ctx.hint.rem;
      el('rect', { class: 'halo', x: cellX(hc) + INSET - 2, y: cellY(hr) + INSET - 2, width: CELL - 2 * INSET + 4, height: CELL - 2 * INSET + 4, rx: RAD + 2 }, svg);
      el('rect', { class: 'halo', x: cellX(rc) + INSET - 2, y: cellY(rr) + INSET - 2, width: CELL - 2 * INSET + 4, height: CELL - 2 * INSET + 4, rx: RAD + 2 }, svg);
    }

    // 2) FASE 1 — destinos del peón en turno (si no hemos elegido aún).
    if (ctx.interactive && !pick){
      const seen = {};
      for (const m of moves){
        const k = m.to[0] + ',' + m.to[1];
        if (seen[k]) continue; seen[k] = true;
        const g = el('circle', { class: 'ghost g' + cur, cx: cellX(m.to[1]) + CELL / 2, cy: cellY(m.to[0]) + CELL / 2, r: CELL * 0.30 }, svg);
        g.addEventListener('click', () => { svg._isoPick = { to: m.to.slice() }; rerender(); });
      }
    }

    // 3) FASE 2 — casillas que se pueden destruir (tras fijar el destino).
    if (ctx.interactive && pick){
      const dests = moves.filter(m => m.to[0] === pick.to[0] && m.to[1] === pick.to[1]);
      for (const m of dests){
        const [rr, rc] = m.rem;
        const g = el('rect', {
          class: 'remtarget',
          x: cellX(rc) + INSET, y: cellY(rr) + INSET,
          width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD,
        }, svg);
        g.addEventListener('click', () => { svg._isoPick = null; ctx.onMove({ to: pick.to.slice(), rem: [rr, rc] }); });
      }
    }

    // 4) peones (el del turno en su posición previsualizada; un aro si está en fase 2).
    for (let p = 0; p < 2; p++){
      const [pr, pc] = pawnPos[p];
      if (pick && p === cur)
        el('circle', { class: 'selring', cx: cellX(pc) + CELL / 2, cy: cellY(pr) + CELL / 2, r: CELL * 0.34 }, svg);
      el('circle', { class: 'piece' + p, cx: cellX(pc) + CELL / 2, cy: cellY(pr) + CELL / 2, r: CELL * 0.28 }, svg);
    }

    // 5) en fase 2, clic sobre el propio peón para CANCELAR y reelegir destino.
    if (ctx.interactive && pick){
      const [pr, pc] = pawnPos[cur];
      const hit = el('circle', { class: 'cancelhit', cx: cellX(pc) + CELL / 2, cy: cellY(pr) + CELL / 2, r: CELL * 0.34 }, svg);
      hit.addEventListener('click', () => { svg._isoPick = null; rerender(); });
    }

    function rerender(){ while (svg.firstChild) svg.removeChild(svg.firstChild); game.render(svg, s, ctx); }
  },
};
