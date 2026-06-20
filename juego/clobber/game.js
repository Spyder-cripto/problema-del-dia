// clobber/game.js — Juego: Clobber (partisano, de Albert, Grossman y Nowakowski).
// Tablero en damero: Azul (0) y Rojo (1) alternados. En tu turno coges una ficha
// TUYA y la mueves a una casilla ortogonalmente adyacente ocupada por una ficha
// del RIVAL: la aplastas (la eliminas) y ocupas su casilla.
// Juego NORMAL: a quien le toca y no tiene jugada, pierde.
//
// Estado: { rows, cols, cells:[-1 vacío | 0 azul | 1 rojo ...], turn }.
// Selección por clic: clic en ficha propia -> se resalta y se muestran sus
// destinos (fantasmas); clic en un destino ejecuta el movimiento.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 46, RAD = 18;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '4x4', label: '4×4', rows: 4, cols: 4 },
  { key: '5x4', label: '5×4', rows: 5, cols: 4 },
  { key: '3x4', label: '3×4', rows: 3, cols: 4 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
const idx = (s, r, c) => r * s.cols + c;
function other(p){ return p ^ 1; }

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Recorre las jugadas legales del jugador en turno: ficha propia -> vecino del rival.
function eachMove(s, fn){
  const me = s.turn, rival = other(me);
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
    if (s.cells[idx(s, r, c)] !== me) continue;
    for (const [dr, dc] of DIRS){
      const r2 = r + dr, c2 = c + dc;
      if (r2 < 0 || r2 >= s.rows || c2 < 0 || c2 >= s.cols) continue;
      if (s.cells[idx(s, r2, c2)] === rival) fn(r, c, r2, c2);
    }
  }
}

// Cuenta las jugadas legales de un jugador dado (independiente del turno).
function mobility(s, player){
  const rival = other(player);
  let n = 0;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
    if (s.cells[idx(s, r, c)] !== player) continue;
    for (const [dr, dc] of DIRS){
      const r2 = r + dr, c2 = c + dc;
      if (r2 < 0 || r2 >= s.rows || c2 < 0 || c2 >= s.cols) continue;
      if (s.cells[idx(s, r2, c2)] === rival) n++;
    }
  }
  return n;
}

export const game = {
  meta: {
    nombre: 'Clobber',
    slug: 'clobber',
    subtitulo: 'Aplasta la ficha del rival — el juego partisano del damero',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'aplasta rojas' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'aplasta azules' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Coge una ficha <b class="az">tuya</b> y muévela a una casilla contigua con una ficha ' +
      '<b class="ro">del rival</b>: la <b>aplastas</b> y ocupas su sitio. ' +
      '<b>Quien no puede mover, pierde.</b>',
    help:
      '<p>El tablero arranca como un <b>damero</b>: fichas <b style="color:var(--azul)">azules</b> y ' +
      '<b style="color:var(--rojo)">rojas</b> alternadas, sin huecos. En tu turno eliges una ficha ' +
      '<b>tuya</b> y la mueves a una casilla pegada (arriba, abajo, izquierda o derecha) que tenga una ' +
      'ficha <b>del rival</b>: la quitas del tablero —la «aplastas»— y te quedas en su casilla.</p>' +
      '<p>Como solo se puede mover hacia una ficha enemiga, el tablero se va vaciando y las fichas ' +
      'quedan aisladas. <b>Pierde el primero que se queda sin ninguna jugada.</b> No importa cuántas ' +
      'fichas tengas: importa quién se queda sin movimientos.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Clobber es un <b>juego partisano</b> de la teoría ' +
      'combinatoria de juegos (Albert, Grossman y Nowakowski, 2001): cada posición se descompone en ' +
      'trozos con un <b>valor</b> propio. En tableros pequeños, “⚖️ ¿Quién gana?” lo resuelve de forma ' +
      'exacta y “💡 Pista” te enseña la jugada ganadora.</p>',
    footer: 'Clobber, de Michael Albert, J.P. Grossman y Richard Nowakowski (2001) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    const cells = new Array(c.rows * c.cols);
    for (let r = 0; r < c.rows; r++) for (let col = 0; col < c.cols; col++)
      cells[r * c.cols + col] = (r + col) % 2;     // damero: azul/rojo alternados
    return { rows: c.rows, cols: c.cols, cells, turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    eachMove(s, (r, c, r2, c2) => moves.push({ from: [r, c], to: [r2, c2] }));
    return moves;
  },

  // PURO: la ficha de origen se va (-1), el destino pasa a ser nuestra ficha, cambia el turno.
  apply(s, m){
    const cells = s.cells.slice();
    const [fr, fc] = m.from, [tr, tc] = m.to;
    cells[idx(s, fr, fc)] = -1;
    cells[idx(s, tr, tc)] = s.turn;
    return { rows: s.rows, cols: s.cols, cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  // Juego normal: el que no puede mover pierde; gana el otro (el último que movió).
  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Heurística de movilidad desde la óptica de `player`: mis jugadas menos las del rival.
  evaluate(s, player){
    return mobility(s, player) - mobility(s, other(player));
  },

  key(s){ return s.cells.join(',') + s.turn; },

  // Solver exacto seguro cuando hay pocas fichas en juego.
  exactOK(s){
    let n = 0; for (let i = 0; i < s.cells.length; i++) if (s.cells[i] >= 0) n++;
    return n <= 12;
  },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    const me = s.turn;

    // casillas de fondo (damero suave)
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
      el('rect', { class: 'cell', x: cellX(c) + 1.5, y: cellY(r) + 1.5, width: CELL - 3, height: CELL - 3, rx: 5 }, svg);

    // ¿hay una ficha propia seleccionada cuyos destinos mostrar?
    const sel = ctx.interactive ? this._selected : null;
    const selValid = sel != null && s.cells[idx(s, sel[0], sel[1])] === me;
    const dests = {};   // "r,c" -> true  (destinos de la ficha seleccionada)
    if (selValid){
      eachMove(s, (r, c, r2, c2) => { if (r === sel[0] && c === sel[1]) dests[r2 + ',' + c2] = true; });
    }

    // fichas sobre el tablero
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      const v = s.cells[idx(s, r, c)];
      if (v < 0) continue;
      const isSel = selValid && r === sel[0] && c === sel[1];
      const circ = el('circle', {
        class: 'piece' + v + (isSel ? ' sel' : ''),
        cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: RAD,
      }, svg);
      // clic en ficha propia -> seleccionarla / deseleccionarla y re-pintar
      if (ctx.interactive && v === me){
        circ.style.cursor = 'pointer';
        circ.addEventListener('click', () => {
          this._selected = (isSel) ? null : [r, c];
          if (ctx.svg){ while (ctx.svg.firstChild) ctx.svg.removeChild(ctx.svg.firstChild); this.render(ctx.svg, s, ctx); }
        });
      }
    }

    if (!ctx.interactive){ this._selected = null; return; }

    // halo de PISTA: marca la ficha de origen de la jugada sugerida.
    if (ctx.hint){
      const [hr, hc] = ctx.hint.from;
      el('circle', { class: 'halo', cx: cellX(hc) + CELL / 2, cy: cellY(hr) + CELL / 2, r: RAD + 5 }, svg);
      const [tr, tc] = ctx.hint.to;
      el('circle', { class: 'halo', cx: cellX(tc) + CELL / 2, cy: cellY(tr) + CELL / 2, r: RAD + 5 }, svg);
    }

    // fantasmas: si hay ficha seleccionada, sus destinos clicables; si no, las
    // fichas propias movibles ya son clicables (arriba). Pintamos los destinos.
    if (selValid){
      eachMove(s, (r, c, r2, c2) => {
        if (r !== sel[0] || c !== sel[1]) return;
        const g = el('circle', {
          class: 'ghost g' + me,
          cx: cellX(c2) + CELL / 2, cy: cellY(r2) + CELL / 2, r: RAD,
        }, svg);
        g.addEventListener('click', () => { this._selected = null; ctx.onMove({ from: [sel[0], sel[1]], to: [r2, c2] }); });
      });
    }
  },
};
