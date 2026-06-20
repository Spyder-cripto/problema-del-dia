// toads-and-frogs/game.js — Sapos y Ranas (Toads and Frogs), partisano 1D, juego normal.
// Una fila de casillas. Los SAPOS (Azul 0) avanzan a la DERECHA; las RANAS (Rojo 1) a la
// IZQUIERDA. Cada turno: avanzar 1 a un hueco vacío en tu dirección, o SALTAR sobre
// exactamente UNA ficha contraria a un hueco vacío. Sin capturas. Quien no puede mover, pierde.
// Estado: { cells:["T"|"F"|"" ...], turn }.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 52, GAP = 0, RAD = 8;
const cellX = (i) => PAD + i * CELL;
const cellY = () => PAD;

const CONFIGS = [
  { key: '2v2', label: '2 vs 2', cells: ['T', 'T', '', '', 'F', 'F'] },
  { key: '3v3', label: '3 vs 3', cells: ['T', 'T', 'T', '', '', 'F', 'F', 'F'] },
  { key: '4v4', label: '4 vs 4', cells: ['T', 'T', 'T', 'T', '', '', '', 'F', 'F', 'F', 'F'] },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[1]; }

// Movilidad: nº de jugadas legales de un jugador concreto sobre `cells`.
function mobility(cells, turn){
  let n = 0;
  const N = cells.length;
  if (turn === 0){ // sapos a la derecha
    for (let i = 0; i < N; i++) if (cells[i] === 'T'){
      if (i + 1 < N && cells[i + 1] === '') n++;
      else if (i + 2 < N && cells[i + 1] === 'F' && cells[i + 2] === '') n++;
    }
  } else { // ranas a la izquierda
    for (let i = 0; i < N; i++) if (cells[i] === 'F'){
      if (i - 1 >= 0 && cells[i - 1] === '') n++;
      else if (i - 2 >= 0 && cells[i - 1] === 'T' && cells[i - 2] === '') n++;
    }
  }
  return n;
}

export const game = {
  meta: {
    nombre: 'Sapos y Ranas',
    slug: 'toads-and-frogs',
    subtitulo: 'Toads and Frogs — el juego partisano de la fila',
    players: [
      { nombre: 'Sapos', corto: 'Azul', color: 'var(--azul)', desc: '→ a la derecha' },
      { nombre: 'Ranas', corto: 'Rojo', color: 'var(--rojo)', desc: '← a la izquierda' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Los <b class="az">sapos</b> avanzan a la <b>derecha →</b> y las <b class="ro">ranas</b> a la <b>izquierda ←</b>. ' +
      'En tu turno mueves una ficha tuya un paso a un hueco vacío, o la haces <b>saltar</b> sobre una sola ficha contraria a un hueco vacío. ' +
      '<b>Quien no puede mover, pierde.</b>',
    help:
      '<p>La fila empieza con los <b style="color:var(--azul)">sapos</b> a la izquierda y las <b style="color:var(--rojo)">ranas</b> a la derecha, ' +
      'separados por casillas vacías. Por turnos, eliges una ficha tuya y la mueves <b>en tu dirección</b> (los sapos hacia la derecha, las ranas hacia la izquierda): ' +
      'o un paso a la casilla vacía de delante, o un salto por encima de <b>exactamente una</b> ficha rival que tenga un hueco justo detrás. No hay capturas: las fichas solo se estorban.</p>' +
      '<p>Como cada bando va en sentido contrario, antes o después se atascan. <b>Pierde el primero que se queda sin ningún movimiento legal.</b></p>' +
      '<p style="font-size:.95rem;color:var(--muted)">«Sapos y Ranas» es un <b>juego partisano</b> (cada jugador tiene jugadas distintas) de Berlekamp, Conway &amp; Guy: ' +
      'una pequeña máquina de hacer <i>números surreales</i> a partir de una simple fila de fichas. En las filas cortas, ' +
      '«⚖️ ¿Quién gana?» lo resuelve de forma exacta y «💡 Pista» te muestra la jugada ganadora.</p>',
    footer: 'Sapos y Ranas (Toads and Frogs), de Berlekamp, Conway &amp; Guy (<i>Winning Ways</i>) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    return { cells: cfg(key).cells.slice(), turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    const cells = s.cells, N = cells.length;
    if (s.turn === 0){ // sapos a la derecha: avanzar a i+1, saltar a i+2
      for (let i = 0; i < N; i++) if (cells[i] === 'T'){
        if (i + 1 < N && cells[i + 1] === '') moves.push({ from: i, to: i + 1 });
        else if (i + 2 < N && cells[i + 1] === 'F' && cells[i + 2] === '') moves.push({ from: i, to: i + 2 });
      }
    } else { // ranas a la izquierda: avanzar a i-1, saltar a i-2
      for (let i = 0; i < N; i++) if (cells[i] === 'F'){
        if (i - 1 >= 0 && cells[i - 1] === '') moves.push({ from: i, to: i - 1 });
        else if (i - 2 >= 0 && cells[i - 1] === 'T' && cells[i - 2] === '') moves.push({ from: i, to: i - 2 });
      }
    }
    return moves;
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[m.to] = cells[m.from];
    cells[m.from] = '';
    return { cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  // Juego normal: quien está en turno y no puede mover, pierde; gana el otro.
  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Heurística de movilidad desde la óptica de `player`.
  evaluate(s, player){
    const mine = mobility(s.cells, player);
    const opp = mobility(s.cells, player ^ 1);
    return mine - opp;
  },

  key(s){ return s.cells.join('') + s.turn; },

  exactOK(s){ return s.cells.length <= 12; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cells.length * CELL) + ' ' + (PAD * 2 + CELL); },

  render(svg, s, ctx){
    const N = s.cells.length;

    // casillas de la fila
    for (let i = 0; i < N; i++)
      el('rect', { class: 'cell', x: cellX(i) + 1.5, y: cellY() + 1.5, width: CELL - 3, height: CELL - 3, rx: 6 }, svg);

    // fichas
    for (let i = 0; i < N; i++){
      const v = s.cells[i];
      if (v !== 'T' && v !== 'F') continue;
      const cx = cellX(i) + CELL / 2, cy = cellY() + CELL / 2;
      const cls = v === 'T' ? 'piece0' : 'piece1';
      el('circle', { class: cls + ' tf-piece', cx, cy, r: CELL * 0.34 }, svg);
      el('text', {
        class: 'tf-glyph', x: cx, y: cy + 1,
        'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': CELL * 0.42,
      }, svg).textContent = v === 'T' ? 'S' : 'R';
    }

    // jugadas legales (fantasmas) del jugador en turno, en la casilla de DESTINO
    if (ctx.interactive && !this.isTerminal(s)){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const x = cellX(m.to) + 4, y = cellY() + 4, side = CELL - 8;
        if (ctx.hint && ctx.hint.from === m.from && ctx.hint.to === m.to)
          el('rect', { class: 'halo', x: x - 4, y: y - 4, width: side + 8, height: side + 8, rx: RAD + 2 }, svg);
        const g = el('rect', { class: 'ghost g' + cur, x, y, width: side, height: side, rx: RAD }, svg);
        g.addEventListener('click', () => ctx.onMove({ from: m.from, to: m.to }));
      }
    }
  },
};
