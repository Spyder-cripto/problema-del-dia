// fibonacci-nim/game.js — Juego: Nim de Fibonacci (imparcial, convención normal).
// Hay una pila de fichas. Por turnos cada jugador retira al menos una; en la PRIMERA
// jugada se puede retirar 1..N-1, y luego como mucho el DOBLE de lo que retiró el rival.
// Quien retira la última ficha, gana. La estrategia óptima vive en la representación de
// Zeckendorf (suma de números de Fibonacci no consecutivos), pero el tablero es pequeño,
// así que el motor lo resuelve de forma EXACTA y juega perfecto.
import { el } from '../_engine/svg.js';
import { solve } from '../_engine/ai.js';

const PAD = 18, GAP = 8, R = 13, ROWGAP = 8;
const CELL = R * 2 + GAP;          // ancho reservado por ficha
const PERROW = 10;                 // fichas por fila al envolver

const CONFIGS = [
  { key: 'n20', label: '20 fichas', n: 20 },
  { key: 'n30', label: '30 fichas', n: 30 },
  { key: 'n15', label: '15 fichas', n: 15 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// Cuántas fichas se pueden retirar como mucho AHORA.
function maxTake(s){
  return (s.last === 0) ? s.rem - 1 : Math.min(2 * s.last, s.rem);
}

// Posición (x,y) del centro de la ficha i-ésima (i=0 es la de más a la izquierda),
// envolviendo en filas de PERROW. La pila se vacía por el extremo DERECHO/inferior.
function chipPos(i){
  const row = Math.floor(i / PERROW);
  const col = i % PERROW;
  return {
    x: PAD + R + col * CELL,
    y: PAD + R + row * (CELL + ROWGAP),
  };
}

export const game = {
  meta: {
    nombre: 'Nim de Fibonacci',
    slug: 'fibonacci-nim',
    subtitulo: 'Retira fichas… pero nunca más del doble que tu rival',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'retira primero' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'responde' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      '<b class="az">Azul</b> y <b class="ro">Rojo</b> retiran fichas por turnos. ' +
      'En la <b>primera</b> jugada puedes llevarte de 1 a N−1; después, como mucho el ' +
      '<b>doble</b> de lo que acaba de retirar tu rival. <b>Quien coge la última ficha, gana.</b>',
    help:
      '<p>Hay una pila de fichas. En tu turno retiras al menos una. La regla del límite es la sal del juego: ' +
      'puedes coger <b>como mucho el doble</b> de lo que tu rival acaba de retirar (y en la primera jugada, ' +
      'de 1 a N−1, pero nunca todas). <b>Gana quien retira la última ficha.</b> Las fichas resaltadas son las que ' +
      'puedes coger ahora: pulsa una y te llevas esa y todas las que tenga a su derecha.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Este es el <b>Nim de Fibonacci</b> de Whinihan. La estrategia perfecta se lee en la ' +
      '<b>representación de Zeckendorf</b>: todo número se escribe de forma única como suma de números de Fibonacci ' +
      'no consecutivos (1, 2, 3, 5, 8, 13, 21…), y quien mueve pierde justo cuando el total es un número de Fibonacci. ' +
      'Como el tablero es pequeño, “⚖️ ¿Quién gana?” lo resuelve exacto y “💡 Pista” te muestra la jugada ganadora.</p>',
    footer: 'Nim de Fibonacci, de Michael J. Whinihan (1963) · teorema de Zeckendorf · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    return { rem: cfg(key).n, last: 0, turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    const mx = maxTake(s);
    for (let k = 1; k <= mx; k++) moves.push({ k });
    return moves;
  },

  apply(s, m){
    return { rem: s.rem - m.k, last: m.k, turn: s.turn ^ 1 };
  },

  isTerminal(s){ return s.rem === 0; },

  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // El tablero es pequeño y la búsqueda por profundidad no llega al final (rem=20/30),
  // así que una heurística neutra dejaría a la IA jugando casi al azar. Como el espacio de
  // estados es minúsculo, resolvemos EXACTO desde la óptica de `player` (el que mueve en `s`):
  // +1 si quien mueve gana con juego perfecto, −1 si pierde. Esto convierte el negamax en
  // juego perfecto (la teoría de Zeckendorf de Whinihan, calculada de forma exacta y memoizada).
  evaluate(s, player){
    const r = solve(this, s);                 // ¿gana quien mueve en s?
    const moverWins = r.capped ? false : r.winnerIsCurrent;
    // `player` es siempre el jugador en turno en `s` (así lo llama el motor en sus hojas).
    return (player === s.turn ? moverWins : !moverWins) ? 1 : -1;
  },

  key(s){ return s.rem + ',' + s.last + ',' + s.turn; },

  // Seguro de resolver exacto: el espacio de estados es minúsculo (rem,last acotados).
  exactOK(s){ return s.rem <= 40; },

  viewBox(s){
    const rows = Math.max(1, Math.ceil(s.rem / PERROW));
    const w = PAD * 2 + Math.min(s.rem, PERROW) * CELL;
    const h = PAD * 2 + rows * CELL + (rows - 1) * ROWGAP + 26; // +26 para el rótulo
    return '0 0 ' + Math.max(w, PAD * 2 + 4 * CELL) + ' ' + h;
  },

  render(svg, s, ctx){
    const mx = maxTake(s);
    const cur = s.turn;
    // Las "fichas retirables" son las últimas mx (extremo derecho/inferior de la pila).
    const firstTakeable = s.rem - mx; // índice de la primera ficha retirable

    for (let i = 0; i < s.rem; i++){
      const p = chipPos(i);
      const takeable = i >= firstTakeable;        // ¿está dentro del alcance de este turno?
      const k = s.rem - i;                         // pulsar esta ficha retira k fichas
      const base = (cur === 0) ? 'piece0' : 'piece1';

      if (ctx.interactive && takeable){
        // halo si la pista coincide con retirar exactamente k fichas
        if (ctx.hint && ctx.hint.k === k)
          el('circle', { class: 'halo', cx: p.x, cy: p.y, r: R + 5 }, svg);
        // ficha sólida tenue de fondo + fantasma clicable encima
        el('circle', { class: base, cx: p.x, cy: p.y, r: R, opacity: 0.22 }, svg);
        const g = el('circle', { class: 'ghost g' + cur, cx: p.x, cy: p.y, r: R }, svg);
        g.addEventListener('click', () => ctx.onMove({ k }));
      } else {
        // ficha fija (no retirable este turno, o vista no interactiva)
        el('circle', { class: base, cx: p.x, cy: p.y, r: R, opacity: takeable ? 0.9 : 0.5 }, svg);
      }
    }

    // Rótulo: cuántas fichas quedan y el máximo que se puede retirar ahora.
    const rows = Math.max(1, Math.ceil(s.rem / PERROW));
    const ty = PAD + rows * CELL + (rows - 1) * ROWGAP + 14;
    const txt = el('text', {
      x: PAD, y: ty, class: 'nimlabel',
      'font-size': 15, 'font-family': 'Georgia, serif', fill: 'var(--muted)',
    }, svg);
    txt.textContent = s.rem === 0
      ? 'Sin fichas — ¡fin!'
      : 'Quedan ' + s.rem + ' · ahora puedes retirar hasta ' + mx;
  },
};
