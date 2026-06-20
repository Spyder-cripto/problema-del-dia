// domineering/game.js — Juego #1: Domineering (dominós cruzados de Conway).
// Azul (jugador 0) coloca dominós VERTICALES; Rojo (jugador 1) los coloca HORIZONTALES.
// Juego normal: quien no puede colocar, pierde. Es un juego partisano clásico de la CGT.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 46, INSET = 5, RAD = 8;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '4x4', label: '4×4', rows: 4, cols: 4 },
  { key: '5x5', label: '5×5', rows: 5, cols: 5 },
  { key: '6x6', label: '6×6', rows: 6, cols: 6 },
  { key: '7x7', label: '7×7', rows: 7, cols: 7 },
  { key: '8x8', label: '8×8', rows: 8, cols: 8 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[2]; }
const idx = (s, r, c) => r * s.cols + c;

// Cuenta colocaciones posibles de una orientación sobre la ocupación actual.
function countMoves(s, vertical){
  let n = 0;
  if (vertical){
    for (let r = 0; r < s.rows - 1; r++) for (let c = 0; c < s.cols; c++)
      if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r + 1, c)]) n++;
  } else {
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols - 1; c++)
      if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r, c + 1)]) n++;
  }
  return n;
}

export const game = {
  meta: {
    nombre: 'Domineering',
    slug: 'domineering',
    subtitulo: 'Dominós cruzados — el juego partisano de Conway',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '↕ verticales' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '↔ horizontales' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      '<b class="az">Azul</b> coloca dominós <b>verticales ↕</b>; ' +
      '<b class="ro">Rojo</b> los coloca <b>horizontales ↔</b>. ' +
      'Cada dominó ocupa dos casillas contiguas vacías. <b>Quien no puede colocar, pierde.</b>',
    help:
      '<p>Por turnos, cada jugador coloca su dominó sobre dos casillas vacías contiguas: ' +
      '<b style="color:var(--azul)">Azul</b> solo en vertical, <b style="color:var(--rojo)">Rojo</b> solo en horizontal. ' +
      'Como cada uno bloquea el tablero en una dirección distinta, no es una carrera de territorio: es un pulso por dejar al rival sin huecos. ' +
      'Pierde el primero que se queda sin sitio donde colocar.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Domineering es un <b>juego partisano</b> (cada jugador tiene jugadas distintas), el mismo terreno donde John Conway encontró los ' +
      '<i>números surreales</i>: cada posición tiene un <b>valor</b> exacto que dice quién gana y por cuánto. En tableros pequeños, ' +
      '“⚖️ ¿Quién gana?” lo resuelve de forma exacta y “💡 Pista” te enseña la jugada ganadora.</p>',
    footer: 'Domineering, de Göran Andersson, popularizado por Berlekamp, Conway &amp; Guy (<i>Winning Ways</i>) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { rows: c.rows, cols: c.cols, occ: new Array(c.rows * c.cols).fill(0), pieces: [], turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    if (s.turn === 0){
      for (let r = 0; r < s.rows - 1; r++) for (let c = 0; c < s.cols; c++)
        if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r + 1, c)]) moves.push({ r, c });
    } else {
      for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols - 1; c++)
        if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r, c + 1)]) moves.push({ r, c });
    }
    return moves;
  },

  apply(s, m){
    const occ = s.occ.slice();
    const o = s.turn === 0 ? 'v' : 'h';
    occ[idx(s, m.r, m.c)] = 1;
    if (o === 'v') occ[idx(s, m.r + 1, m.c)] = 1; else occ[idx(s, m.r, m.c + 1)] = 1;
    return { rows: s.rows, cols: s.cols, occ, pieces: s.pieces.concat([{ r: m.r, c: m.c, o, p: s.turn }]), turn: s.turn ^ 1 };
  },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Heurística de movilidad: mis colocaciones menos las del rival, desde la óptica de `player`.
  evaluate(s, player){
    const v = countMoves(s, true), hh = countMoves(s, false);
    const mine = player === 0 ? v : hh;
    const opp  = player === 0 ? hh : v;
    return mine - opp;
  },

  key(s){ return s.occ.join('') + s.turn; },

  exactOK(s){
    let free = 0; for (let i = 0; i < s.occ.length; i++) if (!s.occ[i]) free++;
    return free <= 16;
  },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    // casillas
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
      el('rect', { class: 'cell', x: cellX(c) + 1.5, y: cellY(r) + 1.5, width: CELL - 3, height: CELL - 3, rx: 5 }, svg);

    // piezas colocadas
    for (const p of s.pieces){
      const w = p.o === 'h' ? CELL * 2 : CELL;
      const hh = p.o === 'v' ? CELL * 2 : CELL;
      el('rect', { class: 'piece' + p.p, x: cellX(p.c) + INSET, y: cellY(p.r) + INSET, width: w - 2 * INSET, height: hh - 2 * INSET, rx: RAD, opacity: 0.9 }, svg);
    }

    // jugadas legales (fantasmas) del jugador en turno
    if (ctx.interactive){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const w = cur === 1 ? CELL * 2 : CELL;
        const hh = cur === 0 ? CELL * 2 : CELL;
        const x = cellX(m.c) + INSET, y = cellY(m.r) + INSET;
        if (ctx.hint && ctx.hint.r === m.r && ctx.hint.c === m.c)
          el('rect', { class: 'halo', x: x - 4, y: y - 4, width: w - 2 * INSET + 8, height: hh - 2 * INSET + 8, rx: RAD + 3 }, svg);
        const g = el('rect', { class: 'ghost g' + cur, x, y, width: w - 2 * INSET, height: hh - 2 * INSET, rx: RAD }, svg);
        g.addEventListener('click', () => ctx.onMove({ r: m.r, c: m.c }));
      }
    }
  },
};
