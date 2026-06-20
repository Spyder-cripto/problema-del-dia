// col/game.js — COL: coloración partisana (juego normal).
// Azul (jugador 0) colorea de azul; Rojo (jugador 1) colorea de rojo.
// REGLA: no puedes colorear una casilla que sea ortogonalmente adyacente a otra de TU PROPIO color.
// Juego normal: quien no puede colorear, pierde. Es un juego partisano clásico de la CGT.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 56, INSET = 5, RAD = 8;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '3x3', label: '3×3', rows: 3, cols: 3 },
  { key: '4x4', label: '4×4', rows: 4, cols: 4 },
  { key: '4x3', label: '4×3', rows: 4, cols: 3 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
const idx = (s, r, c) => r * s.cols + c;

// ¿Puede el jugador `p` colorear la casilla (r,c)?  Vacía y sin vecino ortogonal de su color.
function canColor(s, r, c, p){
  if (s.cells[idx(s, r, c)] !== -1) return false;
  if (r > 0          && s.cells[idx(s, r - 1, c)] === p) return false;
  if (r < s.rows - 1 && s.cells[idx(s, r + 1, c)] === p) return false;
  if (c > 0          && s.cells[idx(s, r, c - 1)] === p) return false;
  if (c < s.cols - 1 && s.cells[idx(s, r, c + 1)] === p) return false;
  return true;
}

// Cuenta cuántas casillas podría colorear el jugador `p` ahora mismo.
function countMoves(s, p){
  let n = 0;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
    if (canColor(s, r, c, p)) n++;
  return n;
}

export const game = {
  meta: {
    nombre: 'Col',
    slug: 'col',
    subtitulo: 'Coloración partisana — sin tocar tu propio color',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'colorea de azul' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'colorea de rojo' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      '<b class="az">Azul</b> y <b class="ro">Rojo</b> van coloreando casillas vacías. ' +
      'La única prohibición: <b>no puedes pintar una casilla pegada (en horizontal o vertical) a otra de tu propio color.</b> ' +
      '<b>Quien no puede colorear, pierde.</b>',
    help:
      '<p>Por turnos, cada jugador pinta una casilla vacía con su color: ' +
      '<b style="color:var(--azul)">Azul</b> de azul, <b style="color:var(--rojo)">Rojo</b> de rojo. ' +
      'La regla es una sola: una casilla nunca puede quedar tocando, por un lado horizontal o vertical, a otra de su mismo color. ' +
      'Las casillas en diagonal sí valen, y dos colores distintos pueden ser vecinos sin problema. ' +
      'Pierde el primero que se queda sin ninguna casilla legal donde colorear.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Col es un <b>juego partisano</b> (cada jugador tiene jugadas distintas) de la teoría combinatoria de juegos: ' +
      'su nombre juega con «<i>colour</i>» y con su pariente imparcial «Snort». En tableros pequeños, ' +
      '«⚖️ ¿Quién gana?» lo resuelve de forma exacta y «💡 Pista» te enseña la jugada ganadora.</p>',
    footer: 'Col, juego partisano de coloración estudiado por Berlekamp, Conway &amp; Guy (<i>Winning Ways</i>) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { rows: c.rows, cols: c.cols, cells: new Array(c.rows * c.cols).fill(-1), turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
      if (canColor(s, r, c, s.turn)) moves.push({ r, c });
    return moves;
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[idx(s, m.r, m.c)] = s.turn;
    return { rows: s.rows, cols: s.cols, cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  // Juego normal: el jugador en turno no puede mover, así que gana el otro (el último que movió).
  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Heurística de movilidad: mis casillas coloreables menos las del rival, desde la óptica de `player`.
  evaluate(s, player){
    return countMoves(s, player) - countMoves(s, player ^ 1);
  },

  key(s){ return s.cells.join(',') + s.turn; },

  exactOK(s){ return s.cells.length <= 14; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    // casillas vacías
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
      el('rect', { class: 'cell', x: cellX(c) + 1.5, y: cellY(r) + 1.5, width: CELL - 3, height: CELL - 3, rx: 5 }, svg);

    // casillas coloreadas
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      const v = s.cells[idx(s, r, c)];
      if (v === 0 || v === 1)
        el('rect', { class: 'piece' + v, x: cellX(c) + INSET, y: cellY(r) + INSET, width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD, opacity: 0.9 }, svg);
    }

    // jugadas legales (fantasmas) del jugador en turno
    if (ctx.interactive){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const x = cellX(m.c) + INSET, y = cellY(m.r) + INSET;
        if (ctx.hint && ctx.hint.r === m.r && ctx.hint.c === m.c)
          el('rect', { class: 'halo', x: x - 4, y: y - 4, width: CELL - 2 * INSET + 8, height: CELL - 2 * INSET + 8, rx: RAD + 3 }, svg);
        const g = el('rect', { class: 'ghost g' + cur, x, y, width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD }, svg);
        g.addEventListener('click', () => ctx.onMove({ r: m.r, c: m.c }));
      }
    }
  },
};
