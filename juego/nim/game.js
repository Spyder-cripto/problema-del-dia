// nim/game.js — Juego: Nim clásico (imparcial, juego normal).
// Dos jugadores retiran fichas por turnos de un solo montón; quien retira la última, gana
// (equivalente: quien no puede mover, pierde). Estrategia ganadora: dejar XOR (nim-suma) = 0.
// Estado { heaps:[n,...], turn }. Juego IMPARCIAL: ambos tienen las mismas jugadas.
import { el } from '../_engine/svg.js';

const PAD = 18, GAP = 12, TOK = 34, ROWH = TOK + 18, LABW = 36, RAD = TOK / 2 - 3;
const tokX = (j) => PAD + LABW + j * (TOK + GAP) + TOK / 2;
const tokY = (i) => PAD + i * ROWH + ROWH / 2;

const CONFIGS = [
  { key: 'clasico',   label: 'Clásico',   heaps: [3, 4, 5] },
  { key: 'marienbad', label: 'Marienbad', heaps: [1, 3, 5, 7] },
  { key: 'corto',     label: 'Corto',     heaps: [1, 2, 3] },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
function other(p){ return p === 0 ? 1 : 0; }

export const game = {
  meta: {
    nombre: 'Nim',
    slug: 'nim',
    subtitulo: 'El juego de los montones — quien retira la última ficha, gana',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'retira fichas' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'retira fichas' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Por turnos, cada jugador retira <b>las fichas que quiera</b> (al menos una) de <b>un solo montón</b>. ' +
      '<b class="az">Azul</b> y <b class="ro">Rojo</b> tienen las mismas jugadas. ' +
      '<b>Quien retira la última ficha, gana.</b>',
    help:
      '<p>Hay varios montones de fichas. En tu turno eliges <b>un</b> montón y retiras de él ' +
      'cuantas fichas quieras (de una a todas). Gana quien se lleva la <b>última</b> ficha del tablero. ' +
      'Pulsa una ficha y se retirarán esa y todas las de su lado hasta el extremo.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Nim es el <b>juego imparcial</b> por excelencia: el ' +
      'teorema de Sprague-Grundy demuestra que todo juego de este tipo equivale a un Nim. La estrategia perfecta ' +
      'usa la <b>nim-suma</b> (el XOR de los tamaños): si te toca y la nim-suma es <b>cero</b>, pierdes con juego ' +
      'perfecto; si no, hay una jugada que la deja en cero y ganas. “⚖️ ¿Quién gana?” y “💡 Pista” lo resuelven.</p>',
    footer: 'Nim · estrategia de la nim-suma (XOR), teoría de Sprague-Grundy · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    return { heaps: cfg(key).heaps.slice(), turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    for (let i = 0; i < s.heaps.length; i++)
      for (let k = 1; k <= s.heaps[i]; k++)
        moves.push({ h: i, k });
    return moves;
  },

  apply(s, m){
    const heaps = s.heaps.slice();
    heaps[m.h] = heaps[m.h] - m.k;
    return { heaps, turn: other(s.turn) };
  },

  isTerminal(s){
    for (let i = 0; i < s.heaps.length; i++) if (s.heaps[i] > 0) return false;
    return true;
  },

  // Juego normal: gana quien retiró la última ficha, es decir el que acaba de mover.
  winner(s){ return this.isTerminal(s) ? other(s.turn) : null; },

  // Nim-suma: si el XOR de los montones no es 0, quien mueve puede ganar (+1); si es 0, pierde (-1).
  evaluate(s){
    let x = 0;
    for (let i = 0; i < s.heaps.length; i++) x ^= s.heaps[i];
    return x !== 0 ? 1 : -1;
  },

  key(s){ return s.heaps.join(',') + s.turn; },

  exactOK(s){
    let sum = 0;
    for (let i = 0; i < s.heaps.length; i++) sum += s.heaps[i];
    return sum <= 18;
  },

  viewBox(s){
    let maxH = 1;
    for (let i = 0; i < s.heaps.length; i++) if (s.heaps[i] > maxH) maxH = s.heaps[i];
    const w = PAD * 2 + LABW + maxH * (TOK + GAP) - GAP + TOK / 2;
    const hgt = PAD * 2 + s.heaps.length * ROWH;
    return '0 0 ' + w + ' ' + hgt;
  },

  render(svg, s, ctx){
    const cur = s.turn;
    const hint = ctx.hint;

    for (let i = 0; i < s.heaps.length; i++){
      const n = s.heaps[i];
      const cy = tokY(i);
      const ghosts = [];  // capa fantasma de esta fila, para realzar el rango al pasar el ratón

      // etiqueta del montón (número de fichas)
      el('text', {
        x: PAD + LABW / 2, y: cy + 5, fill: 'var(--muted)',
        'text-anchor': 'middle', 'font-size': 18, 'font-family': 'var(--body)',
      }, svg).textContent = n;

      for (let j = 0; j < n; j++){
        const cx = tokX(j);
        // Pulsar la ficha j retira esa y todas hasta el extremo derecho: k = n - j fichas.
        const k = n - j;
        // si la pista cae en este montón, su primera ficha retirada es la j = n - hint.k
        if (hint && hint.h === i && (n - hint.k) === j)
          el('circle', { class: 'halo', cx, cy, r: RAD + 4 }, svg);

        el('circle', { class: 'piece' + cur, cx, cy, r: RAD, opacity: 0.92 }, svg);

        if (ctx.interactive){
          // capa fantasma clicable: resalta esta ficha y las de su lado (las que se retirarían)
          const g = el('circle', { class: 'ghost g' + cur, cx, cy, r: RAD }, svg);
          ghosts.push(g);
          const from = j;
          g.addEventListener('mouseenter', () => { for (let q = from; q < ghosts.length; q++) ghosts[q].style.opacity = 0.6; });
          g.addEventListener('mouseleave', () => { for (let q = 0; q < ghosts.length; q++) ghosts[q].style.opacity = ''; });
          g.addEventListener('click', () => ctx.onMove({ h: i, k }));
        }
      }
    }
  },
};
