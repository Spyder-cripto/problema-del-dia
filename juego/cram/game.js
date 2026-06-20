// cram/game.js — Cram: Domineering IMPARCIAL (juego normal: quien no puede colocar, pierde).
// AMBOS jugadores colocan dominós en CUALQUIER orientación (horizontal o vertical) sobre dos
// casillas vacías contiguas. Como las dos jugadas son iguales para los dos, el juego es imparcial.
// Azul (jugador 0) abre; Rojo (jugador 1) es la IA. En tableros par×par gana el 2.º por simetría.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 46, INSET = 5, RAD = 8;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '4x4', label: '4×4', rows: 4, cols: 4 },
  { key: '6x4', label: '6×4', rows: 6, cols: 4 },
  { key: '6x6', label: '6×6', rows: 6, cols: 6 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
const idx = (s, r, c) => r * s.cols + c;

// Cuenta TODAS las colocaciones posibles (ambas orientaciones) sobre la ocupación actual.
function countMoves(s){
  let n = 0;
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols - 1; c++)
    if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r, c + 1)]) n++;      // horizontal
  for (let r = 0; r < s.rows - 1; r++) for (let c = 0; c < s.cols; c++)
    if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r + 1, c)]) n++;      // vertical
  return n;
}

export const game = {
  meta: {
    nombre: 'Cram',
    slug: 'cram',
    subtitulo: 'Domineering imparcial — dominós en cualquier dirección',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '↕↔ coloca dominós' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '↕↔ coloca dominós' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Los <b>dos</b> jugadores hacen lo mismo: colocar un dominó sobre dos casillas vacías ' +
      'contiguas, en <b>horizontal ↔ o vertical ↕</b>, a elección. ' +
      '<b>Quien no puede colocar, pierde.</b>',
    help:
      '<p>Por turnos, cada jugador coloca un dominó sobre dos casillas vacías contiguas, ' +
      'en la orientación que quiera. Como ambos disponen exactamente de las mismas jugadas, ' +
      'Cram es un <b>juego imparcial</b> (a diferencia de Domineering, donde cada color va en una sola dirección). ' +
      'Pierde el primero que se queda sin un par de casillas libres donde colocar.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">En los juegos imparciales manda la <b>teoría de Sprague–Grundy</b>. ' +
      'Aquí hay un truco precioso: en cualquier tablero <b>par×par</b>, el <b>segundo</b> jugador gana copiando con ' +
      '<i>simetría central</i> cada jugada del rival. En tableros pequeños, «⚖️ ¿Quién gana?» lo resuelve de forma exacta ' +
      'y «💡 Pista» te enseña la jugada ganadora.</p>',
    footer: 'Cram, juego imparcial popularizado por Martin Gardner (<i>Scientific American</i>) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { rows: c.rows, cols: c.cols, occ: new Array(c.rows * c.cols).fill(0), pieces: [], turn: 0 };
  },

  current(s){ return s.turn; },

  // Iguales para ambos jugadores: todas las parejas vacías contiguas, horizontal y vertical.
  legalMoves(s){
    const moves = [];
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols - 1; c++)
      if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r, c + 1)]) moves.push({ r, c, o: 'h' });
    for (let r = 0; r < s.rows - 1; r++) for (let c = 0; c < s.cols; c++)
      if (!s.occ[idx(s, r, c)] && !s.occ[idx(s, r + 1, c)]) moves.push({ r, c, o: 'v' });
    return moves;
  },

  apply(s, m){
    const occ = s.occ.slice();
    occ[idx(s, m.r, m.c)] = 1;
    if (m.o === 'v') occ[idx(s, m.r + 1, m.c)] = 1; else occ[idx(s, m.r, m.c + 1)] = 1;
    return { rows: s.rows, cols: s.cols, occ, pieces: s.pieces.concat([{ r: m.r, c: m.c, o: m.o, p: s.turn }]), turn: s.turn ^ 1 };
  },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Heurística de movilidad: cuantas más colocaciones le queden a quien va a mover, mejor para él.
  evaluate(s, player){
    const m = countMoves(s);
    return player === s.turn ? m : -m;
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

    // piezas colocadas (color de quien la puso)
    for (const p of s.pieces){
      const w = p.o === 'h' ? CELL * 2 : CELL;
      const hh = p.o === 'v' ? CELL * 2 : CELL;
      el('rect', { class: 'piece' + p.p, x: cellX(p.c) + INSET, y: cellY(p.r) + INSET, width: w - 2 * INSET, height: hh - 2 * INSET, rx: RAD, opacity: 0.9 }, svg);
    }

    // jugadas legales (fantasmas) del jugador en turno — AMBAS orientaciones
    if (ctx.interactive){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const w = m.o === 'h' ? CELL * 2 : CELL;
        const hh = m.o === 'v' ? CELL * 2 : CELL;
        const x = cellX(m.c) + INSET, y = cellY(m.r) + INSET;
        if (ctx.hint && ctx.hint.r === m.r && ctx.hint.c === m.c && ctx.hint.o === m.o)
          el('rect', { class: 'halo', x: x - 4, y: y - 4, width: w - 2 * INSET + 8, height: hh - 2 * INSET + 8, rx: RAD + 3 }, svg);
        const g = el('rect', { class: 'ghost g' + cur, x, y, width: w - 2 * INSET, height: hh - 2 * INSET, rx: RAD }, svg);
        g.addEventListener('click', () => ctx.onMove({ r: m.r, c: m.c, o: m.o }));
      }
    }
  },
};
