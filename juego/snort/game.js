// snort/game.js — Juego: Snort (coloración partisana, DUAL de Col; juego normal).
// Cada jugador colorea casillas con SU color: Azul (jugador 0) y Rojo (jugador 1).
// REGLA (inversa a Col): NO puedes colorear una casilla ortogonalmente adyacente a
// una casilla del color del RIVAL. Adyacente a una de TU color sí vale (de hecho,
// los vecinos del mismo color son «amistosos»). Juego normal: quien no puede
// colorear, pierde. Es un juego partisano clásico de la teoría combinatoria de juegos.
//
// Estado { rows, cols, cells:[-1|0|1...], turn }  con -1 = vacía, 0 = azul, 1 = rojo.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 46, INSET = 3, RAD = 6;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '3x3', label: '3×3', rows: 3, cols: 3 },
  { key: '4x4', label: '4×4', rows: 4, cols: 4 },
  { key: '4x3', label: '4×3', rows: 4, cols: 3 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
const idx = (s, r, c) => r * s.cols + c;

// ¿Tiene la casilla (r,c) algún vecino ortogonal coloreado con `color`?
function hasNeighborColor(s, r, c, color){
  if (r > 0 && s.cells[idx(s, r - 1, c)] === color) return true;
  if (r < s.rows - 1 && s.cells[idx(s, r + 1, c)] === color) return true;
  if (c > 0 && s.cells[idx(s, r, c - 1)] === color) return true;
  if (c < s.cols - 1 && s.cells[idx(s, r, c + 1)] === color) return true;
  return false;
}

// Casillas que `player` puede colorear: vacías cuyo entorno ortogonal NO tenga el color del rival.
function movesFor(s, player){
  const enemy = player ^ 1;
  const moves = [];
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
    if (s.cells[idx(s, r, c)] !== -1) continue;
    if (hasNeighborColor(s, r, c, enemy)) continue;
    moves.push({ r, c });
  }
  return moves;
}

export const game = {
  meta: {
    nombre: 'Snort',
    slug: 'snort',
    subtitulo: 'Coloración partisana — el dual amable de Col',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'colorea de azul' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'colorea de rojo' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      '<b class="az">Azul</b> y <b class="ro">Rojo</b> colorean casillas vacías con su color. ' +
      'No puedes colorear una casilla <b>pegada (en horizontal o vertical) a una del rival</b>; ' +
      'pegada a una tuya sí vale. <b>Quien no puede colorear, pierde.</b>',
    help:
      '<p>Por turnos, cada jugador pinta una casilla vacía de su color: ' +
      '<b style="color:var(--azul)">Azul</b> de azul, <b style="color:var(--rojo)">Rojo</b> de rojo. ' +
      'La única restricción: <b>no puedes pintar junto a una casilla del rival</b> (vecinas en horizontal o vertical). ' +
      'En cambio, pintar al lado de una casilla de tu propio color es perfectamente válido —¡y a menudo conviene!—.</p>' +
      '<p>El que se queda sin ninguna casilla donde pintar <b>pierde</b>. Por eso interesa ' +
      'tender tus colores para asfixiar al rival mientras te dejas a ti mismo huecos amistosos.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Snort es el <b>dual de Col</b>: las dos comparten tablero pero invierten la regla ' +
      '(en Col estorba el vecino de tu mismo color; en Snort estorba el del rival). Es un <b>juego partisano</b>, ' +
      'el mundo de los <i>números surreales</i> de Conway. En tableros pequeños, ' +
      '“⚖️ ¿Quién gana?” lo resuelve de forma exacta y “💡 Pista” te enseña una jugada ganadora.</p>',
    footer: 'Snort, inventado por Simon Norton; tratado en <i>Winning Ways</i> de Berlekamp, Conway &amp; Guy · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { rows: c.rows, cols: c.cols, cells: new Array(c.rows * c.cols).fill(-1), turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){ return movesFor(s, s.turn); },

  // Colorea (r,c) con el color del jugador en turno. PURO.
  apply(s, m){
    const cells = s.cells.slice();
    cells[idx(s, m.r, m.c)] = s.turn;
    return { rows: s.rows, cols: s.cols, cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  // Juego normal: a quien le toca y no puede colorear, pierde. Gana el que acaba de mover.
  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Heurística de movilidad desde la óptica de `player`: mis jugadas menos las del rival.
  evaluate(s, player){
    const mine = movesFor(s, player).length;
    const opp  = movesFor(s, player ^ 1).length;
    return mine - opp;
  },

  key(s){ return s.cells.join(',') + '|' + s.turn; },

  // Solver exacto seguro con pocas casillas vacías.
  exactOK(s){
    let free = 0; for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === -1) free++;
    return free <= 16;
  },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    // Casillas: fondo neutro o coloreadas.
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      const v = s.cells[idx(s, r, c)];
      const cls = v === 0 ? 'piece0' : v === 1 ? 'piece1' : 'cell';
      el('rect', {
        class: cls,
        x: cellX(c) + INSET, y: cellY(r) + INSET,
        width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD,
        opacity: v === -1 ? null : 0.9,
      }, svg);
    }

    if (!ctx.interactive) return;

    const cur = s.turn;
    const moves = this.legalMoves(s);
    for (const m of moves){
      const x = cellX(m.c) + INSET, y = cellY(m.r) + INSET;
      if (ctx.hint && ctx.hint.r === m.r && ctx.hint.c === m.c)
        el('rect', {
          class: 'halo',
          x: x - 2, y: y - 2,
          width: CELL - 2 * INSET + 4, height: CELL - 2 * INSET + 4, rx: RAD + 2,
        }, svg);
      const g = el('rect', {
        class: 'ghost g' + cur,
        x, y, width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD,
      }, svg);
      g.addEventListener('click', () => ctx.onMove({ r: m.r, c: m.c }));
    }
  },
};
