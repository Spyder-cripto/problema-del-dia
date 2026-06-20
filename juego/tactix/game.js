// tactix/game.js — Juego: TacTix de Piet Hein (Nim bidimensional), versión MISÈRE.
// Sobre una rejilla cuadrada llena de fichas, en cada turno un jugador retira un bloque de
// fichas CONSECUTIVAS (sin huecos) de UNA fila o UNA columna. Versión misère: quien retira
// la ÚLTIMA ficha del tablero PIERDE.
//
// Nota de convención: el motor compartido (negamax y solver exacto) usa la regla NORMAL
// "quien no puede mover, pierde". Para que esa maquinaria juegue misère CORRECTAMENTE sin
// tocar _engine/, modelamos el final un paso antes: una posición con UNA SOLA ficha es
// TERMINAL y sin jugadas, de modo que el jugador en turno —obligado a retirar esa última
// ficha— es justo el que pierde en misère. Así `legalMoves`, `isTerminal`, `winner`, el
// negamax y el solver exacto quedan todos alineados con la regla misère.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 52, RAD = 18;
const cellCX = (c) => PAD + c * CELL + CELL / 2;
const cellCY = (r) => PAD + r * CELL + CELL / 2;

const CONFIGS = [
  { key: '4x4', label: '4×4', rows: 4, cols: 4 },
  { key: '5x5', label: '5×5', rows: 5, cols: 5 },
  { key: '6x6', label: '6×6', rows: 6, cols: 6 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
const idx = (s, r, c) => r * s.cols + c;
function countCells(s){ let n = 0; for (let i = 0; i < s.cells.length; i++) n += s.cells[i]; return n; }

// Todos los bloques de fichas presentes y CONTIGUAS en filas y columnas.
// Para un tramo maximal de longitud L generamos todos sus subsegmentos contiguos
// (from..to), que son las jugadas legales (retirar 1, 2, … de golpe).
function segments(s){
  const moves = [];
  // filas
  for (let r = 0; r < s.rows; r++){
    let start = -1;
    for (let c = 0; c <= s.cols; c++){
      const on = c < s.cols && s.cells[idx(s, r, c)] === 1;
      if (on && start < 0) start = c;
      if (!on && start >= 0){
        for (let a = start; a < c; a++) for (let b = a; b < c; b++) moves.push({ dir: 'r', line: r, from: a, to: b });
        start = -1;
      }
    }
  }
  // columnas
  for (let c = 0; c < s.cols; c++){
    let start = -1;
    for (let r = 0; r <= s.rows; r++){
      const on = r < s.rows && s.cells[idx(s, r, c)] === 1;
      if (on && start < 0) start = r;
      if (!on && start >= 0){
        for (let a = start; a < r; a++) for (let b = a; b < r; b++) moves.push({ dir: 'c', line: c, from: a, to: b });
        start = -1;
      }
    }
  }
  return moves;
}

export const game = {
  meta: {
    nombre: 'TacTix',
    slug: 'tactix',
    subtitulo: 'El Nim bidimensional de Piet Hein — versión misère',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'mueve primero' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'mueve segundo' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Por turnos, retira un bloque de fichas <b>contiguas</b> de una misma <b>fila</b> o <b>columna</b>. ' +
      'Es la versión <b>misère</b>: <b>quien retira la última ficha PIERDE</b>. ' +
      'Juegan <b class="az">Azul</b> y <b class="ro">Rojo</b>.',
    help:
      '<p>El tablero empieza lleno de fichas. En tu turno eliges una <b>fila</b> o una <b>columna</b> y retiras ' +
      'de ella tantas fichas seguidas como quieras (de una a todas las del tramo), pero deben ser ' +
      '<b>contiguas y sin huecos</b>. Para seleccionar un bloque, haz clic en la <b>primera</b> ficha y luego en la ' +
      '<b>última</b>; con un solo clic retiras una sola ficha.</p>' +
      '<p>Es la variante <b>misère</b>: el que se ve obligado a retirar la <b>última ficha del tablero pierde</b>. ' +
      'TacTix lo inventó <b>Piet Hein</b> (el del Hex y los <i>cubos Soma</i>) como un Nim en dos dimensiones. ' +
      'En el tablero pequeño, “⚖️ ¿Quién gana?” lo resuelve de forma exacta y “💡 Pista” te muestra una jugada ganadora.</p>',
    footer: 'TacTix, de Piet Hein (Nim bidimensional, versión misère) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { rows: c.rows, cols: c.cols, cells: new Array(c.rows * c.cols).fill(1), turn: 0 };
  },

  current(s){ return s.turn; },

  // Misère: si solo queda UNA ficha, el jugador en turno está obligado a retirarla y pierde;
  // tratamos esa posición como terminal y SIN jugadas (alinea negamax/solver con misère).
  legalMoves(s){
    if (countCells(s) <= 1) return [];
    return segments(s);
  },

  apply(s, m){
    const cells = s.cells.slice();
    if (m.dir === 'r'){ for (let c = m.from; c <= m.to; c++) cells[idx(s, m.line, c)] = 0; }
    else { for (let r = m.from; r <= m.to; r++) cells[idx(s, r, m.line)] = 0; }
    return { rows: s.rows, cols: s.cols, cells, turn: s.turn ^ 1 };
  },

  // Terminal cuando no quedan jugadas: tablero vacío, o una sola ficha (obligada y perdedora).
  isTerminal(s){ return countCells(s) <= 1; },

  // Misère, dos sub-casos terminales:
  //  · UNA ficha: el jugador EN TURNO está obligado a retirarla y PIERDE -> gana el rival (s.turn^1).
  //  · CERO fichas: el rival ACABA de retirar la última (en una sola jugada vació el tablero) y
  //    PIERDE -> gana el jugador en turno (s.turn), que ya no tiene que mover.
  winner(s){
    if (!this.isTerminal(s)) return null;
    return countCells(s) === 0 ? s.turn : (s.turn ^ 1);
  },

  // Tableros pequeños: la búsqueda exacta manda. Damos una heurística suave (preferir dejar
  // pocas fichas tiene poco sentido fijo en misère, así que devolvemos 0 y dejamos decidir a
  // la búsqueda; en niveles fáciles el ruido del motor varía el juego).
  evaluate(s){ return 0; },

  key(s){ return s.cells.join('') + s.turn; },

  // 4×4=16, 5×5=25, 6×6=36 fichas iniciales. El solver memoizado aguanta de sobra el 4×4
  // y posiciones avanzadas; lo habilitamos cuando quedan pocas fichas.
  exactOK(s){ return countCells(s) <= 14; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    // El motor compartido solo nos da ctx.onMove (que COMETE una jugada). La selección con
    // dos clics se gestiona aquí, manipulando el SVG en sitio, y solo se llama a onMove al
    // confirmar el bloque. `pending` guarda la primera ficha pulsada; se reinicia cuando
    // cambia la posición (key distinta).
    const k = this.key(s);
    if (selFor !== k){ selFor = k; pending = null; }

    // fondo de casillas
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
      el('rect', { class: 'cell', x: PAD + c * CELL + 1.5, y: PAD + r * CELL + 1.5, width: CELL - 3, height: CELL - 3, rx: 6 }, svg);

    // contorno de bloque (pista o previsualización de selección)
    const overlay = el('rect', { class: 'tx-band', x: 0, y: 0, width: 0, height: 0, rx: RAD - 4, opacity: 0 }, svg);
    function band(m, cls){
      const g = geom(m);
      overlay.setAttribute('class', cls);
      overlay.setAttribute('x', g.x); overlay.setAttribute('y', g.y);
      overlay.setAttribute('width', g.w); overlay.setAttribute('height', g.h);
      overlay.setAttribute('opacity', 1);
    }
    function clearBand(){ overlay.setAttribute('opacity', 0); }

    // fichas presentes (referencias para poder repintar selección sin re-render)
    const dots = {};
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      if (s.cells[idx(s, r, c)] !== 1) continue;
      const dot = el('circle', { class: 'tx-piece', cx: cellCX(c), cy: cellCY(r), r: RAD }, svg);
      dots[r + ',' + c] = dot;
    }

    function paintSel(){
      for (const key in dots) dots[key].setAttribute('class', 'tx-piece');
      if (!pending){ clearBand(); return; }
      const d = dots[pending.r + ',' + pending.c];
      if (d) d.setAttribute('class', 'tx-piece tx-sel');
      clearBand();
    }

    if (ctx.interactive){
      for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
        const dot = dots[r + ',' + c];
        if (!dot) continue;
        dot.style.cursor = 'pointer';
        dot.addEventListener('click', () => {
          if (!pending){ pending = { r, c }; paintSel(); return; }
          // segundo clic: intenta formar un bloque pending..(r,c) en la misma línea y contiguo
          if (pending.r === r && pending.c === c){
            const m = blockMove(s, pending, { r, c });   // un solo clic repetido = retirar 1
            if (m){ pending = null; ctx.onMove(m); } else { pending = null; paintSel(); }
            return;
          }
          const m = blockMove(s, pending, { r, c });
          if (m){ pending = null; ctx.onMove(m); }
          else { pending = { r, c }; paintSel(); }   // bloque inválido: empezar de nuevo aquí
        });
        dot.addEventListener('mouseenter', () => {
          if (!pending) return;
          const m = blockMove(s, pending, { r, c });
          if (m) band(m, 'tx-band tx-preview'); else clearBand();
        });
        dot.addEventListener('mouseleave', clearBand);
      }
      paintSel();
    }

    // pista: resalta el bloque de la jugada sugerida
    if (ctx.hint){ band(ctx.hint, 'tx-band halo'); }
  },
};

// Estado de selección a nivel de módulo (persiste entre renders provocados por onMove).
let pending = null, selFor = null;

// Geometría (x,y,w,h) del rectángulo que cubre un bloque-jugada.
function geom(m){
  if (m.dir === 'r') return { x: PAD + m.from * CELL + 4, y: PAD + m.line * CELL + 4, w: (m.to - m.from + 1) * CELL - 8, h: CELL - 8 };
  return { x: PAD + m.line * CELL + 4, y: PAD + m.from * CELL + 4, w: CELL - 8, h: (m.to - m.from + 1) * CELL - 8 };
}

// Construye la jugada para el bloque entre dos fichas a y b si: misma fila o misma columna,
// y todas las fichas intermedias están presentes y son contiguas. Si no, devuelve null.
function blockMove(s, a, b){
  if (a.r === b.r){
    const r = a.r, lo = Math.min(a.c, b.c), hi = Math.max(a.c, b.c);
    for (let c = lo; c <= hi; c++) if (s.cells[idx(s, r, c)] !== 1) return null;
    return { dir: 'r', line: r, from: lo, to: hi };
  }
  if (a.c === b.c){
    const c = a.c, lo = Math.min(a.r, b.r), hi = Math.max(a.r, b.r);
    for (let r = lo; r <= hi; r++) if (s.cells[idx(s, r, c)] !== 1) return null;
    return { dir: 'c', line: c, from: lo, to: hi };
  }
  return null;
}
