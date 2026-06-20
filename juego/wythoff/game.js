// wythoff/game.js — Juego de Wythoff (imparcial, convención normal).
// Una dama de ajedrez vive en una casilla (a,b) de un tablero N×N. Por turnos, cada
// jugador la mueve hacia la esquina (0,0): a la izquierda, hacia abajo, o en diagonal
// abajo-izquierda, tantas casillas como quiera (al menos una). Quien la deja en (0,0) gana.
// Equivale al Nim de dos montones con un movimiento extra (restar lo mismo a ambos).
import { el } from '../_engine/svg.js';

const PHI = (1 + Math.sqrt(5)) / 2;

const PAD = 16, CELL = 44;
const cellX = (c) => PAD + c * CELL;            // columna a -> x (a crece a la derecha)
// La fila 0 (b=0) se dibuja ABAJO; b crece hacia arriba. Así la esquina (0,0) queda abajo-izquierda.
const cellY = (s, b) => PAD + (s.N - 1 - b) * CELL;

const CONFIGS = [
  { key: 'clasica', label: 'Clásica (7×4)', N: 8, a: 7, b: 4 },
  { key: 'grande',  label: 'Grande (10×6)', N: 11, a: 10, b: 6 },
  { key: 'diag',    label: 'Diagonal (8×8)', N: 9, a: 8, b: 8 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// ¿Es (a,b) una posición-P (perdedora para quien mueve)?
function esP(a, b){
  const x = Math.min(a, b), y = Math.max(a, b);
  return x === Math.floor((y - x) * PHI);
}

export const game = {
  meta: {
    nombre: 'Wythoff',
    slug: 'wythoff',
    subtitulo: 'La dama que solo retrocede — el juego de Wythoff',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'mueve la dama' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'mueve la dama' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Una <b>dama</b> de ajedrez se mueve por turnos hacia la esquina <b>(0,0)</b>: ' +
      '<b class="az">a la izquierda</b>, <b class="ro">hacia abajo</b> o en <b class="ve">diagonal abajo-izquierda</b>, ' +
      'cualquier número de casillas. <b>Quien la lleva a la esquina, gana.</b>',
    help:
      '<p>La dama solo puede ir en tres direcciones —izquierda, abajo o la diagonal que mezcla ambas— ' +
      'y siempre acercándose a la esquina inferior izquierda. Por turnos cada jugador la empuja lo que quiera en una de esas direcciones; ' +
      'el que consigue dejarla en la casilla <b>(0,0)</b> gana la partida.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Es el <b>juego de Wythoff</b> (1907), un Nim de dos montones con una jugada extra. ' +
      'Sus posiciones perdedoras —las «trampas» donde, juegues lo que juegues, el rival puede ganarte— caen sobre dos rectas ' +
      'de pendiente φ y 1/φ, el <b>número áureo</b>. Por eso «⚖️ ¿Quién gana?» y «💡 Pista» aciertan siempre: la teoría es exacta.</p>',
    footer: 'Juego de Willem Wythoff (1907) · las posiciones-P usan el número áureo φ · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { N: c.N, a: c.a, b: c.b, turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    // Izquierda: misma fila, columna menor.
    for (let k = 1; k <= s.a; k++) moves.push({ a: s.a - k, b: s.b });
    // Abajo: misma columna, fila menor.
    for (let k = 1; k <= s.b; k++) moves.push({ a: s.a, b: s.b - k });
    // Diagonal abajo-izquierda.
    for (let k = 1; k <= Math.min(s.a, s.b); k++) moves.push({ a: s.a - k, b: s.b - k });
    return moves;
  },

  apply(s, m){
    return { N: s.N, a: m.a, b: m.b, turn: s.turn ^ 1 };
  },

  isTerminal(s){ return s.a === 0 && s.b === 0; },

  // Juego normal: gana el último que movió (= el que NO está en turno en la posición terminal).
  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Heurística exacta: en una posición-P, quien mueve pierde (-1); si no, puede ganar (+1).
  evaluate(s, player){
    const val = esP(s.a, s.b) ? -1 : 1;
    // evaluate se mide desde la óptica de `player`; el motor lo invoca con player = quien mueve.
    return player === s.turn ? val : -val;
  },

  key(s){ return s.a + ',' + s.b + ',' + s.turn; },

  exactOK(s){ return s.a + s.b <= 20; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.N * CELL) + ' ' + (PAD * 2 + s.N * CELL); },

  render(svg, s, ctx){
    // Tablero de ajedrez. Reutilizo la clase compartida .cell y matizo los colores en línea
    // (no puedo tocar el CSS del motor) para distinguir casillas claras/oscuras.
    for (let b = 0; b < s.N; b++) for (let a = 0; a < s.N; a++){
      const dark = (a + b) % 2 === 1;
      el('rect', {
        class: 'cell',
        x: cellX(a), y: cellY(s, b), width: CELL, height: CELL,
        fill: dark ? 'color-mix(in srgb, var(--accent) 22%, var(--cell))' : 'var(--cell)',
      }, svg);
    }

    // La esquina meta (0,0), resaltada.
    el('rect', {
      x: cellX(0) + 2, y: cellY(s, 0) + 2, width: CELL - 4, height: CELL - 4, rx: 6,
      fill: 'none', stroke: 'var(--verde)', 'stroke-width': 2.5, 'stroke-dasharray': '5 4',
    }, svg);
    el('text', {
      x: cellX(0) + CELL / 2, y: cellY(s, 0) + CELL / 2,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: 'var(--verde)', 'font-size': CELL * 0.5, opacity: 0.85,
    }, svg).textContent = '★';

    // Jugadas legales (fantasmas) del jugador en turno.
    if (ctx.interactive && !this.isTerminal(s)){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const x = cellX(m.a) + 3, y = cellY(s, m.b) + 3, side = CELL - 6;
        if (ctx.hint && ctx.hint.a === m.a && ctx.hint.b === m.b)
          el('rect', { class: 'halo', x: x - 4, y: y - 4, width: side + 8, height: side + 8, rx: 9 }, svg);
        const g = el('rect', { class: 'ghost g' + cur, x, y, width: side, height: side, rx: 6 }, svg);
        g.addEventListener('click', () => ctx.onMove({ a: m.a, b: m.b }));
      }
    }

    // La dama, encima de todo.
    const qx = cellX(s.a) + CELL / 2, qy = cellY(s, s.b) + CELL / 2;
    el('circle', {
      cx: qx, cy: qy, r: CELL * 0.36,
      fill: 'var(--card)', stroke: 'var(--ink)', 'stroke-width': 2.5,
    }, svg);
    el('text', {
      x: qx, y: qy + 1,
      'text-anchor': 'middle', 'dominant-baseline': 'central',
      fill: 'var(--ink)', 'font-size': CELL * 0.5,
    }, svg).textContent = '♛';
  },
};
