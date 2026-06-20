// kayles/game.js — Juego: Kayles (juego imparcial de Dudeney/Sam Loyd).
// Una fila de bolos. En tu turno derribas 1 bolo, o 2 bolos ADYACENTES, lo que
// parte la fila en tramos independientes. Juego normal: pierde quien no puede derribar.
// Estado { segs:[longitudes de tramos contiguos], turn }. Juego IMPARCIAL: ambos
// jugadores tienen las mismas jugadas, así que se resuelve con la teoría de Grundy.
import { el } from '../_engine/svg.js';

const PAD = 18, PIN = 30, GAP = 14, SEGGAP = 28, H = 92;
// x del centro del bolo nº `col` (índice global de columna, contando huecos entre tramos).
const pinCX = (col) => PAD + PIN / 2 + col * (PIN + GAP);

// Tabla de valores de Grundy (nim-values) de Kayles para longitudes 0..83.
// Periódica con periodo 12 a partir de n=72 (Winning Ways, Berlekamp-Conway-Guy).
const GRUNDY = [
  0,1,2,3,1,4,3,2,1,4,2,6,4,1,2,7,1,4,3,2,1,4,6,7,
  4,1,2,8,5,4,7,2,1,8,6,7,4,1,2,3,1,4,7,2,1,8,2,7,
  4,1,2,8,1,4,7,2,1,4,2,7,4,1,2,8,1,4,7,2,1,8,6,7,
  4,1,2,8,1,4,7,2,1,8,2,7,
];
function grundy(n){
  if (n < GRUNDY.length) return GRUNDY[n];
  return GRUNDY[72 + ((n - 72) % 12)];   // periodo 12 desde 72
}

const CONFIGS = [
  { key: '9',  label: '9 bolos',  n: 9 },
  { key: '12', label: '12 bolos', n: 12 },
  { key: '10', label: '10 bolos', n: 10 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// Reconstruye un array `segs` reemplazando el tramo `s` por los dos trozos `a` y `b`,
// descartando longitudes 0 (no hay tramo vacío).
function splitSegs(segs, s, a, b){
  const out = [];
  for (let k = 0; k < segs.length; k++){
    if (k === s){ if (a > 0) out.push(a); if (b > 0) out.push(b); }
    else out.push(segs[k]);
  }
  return out;
}

// Total de bolos en pie.
function totalPins(segs){ let t = 0; for (let i = 0; i < segs.length; i++) t += segs[i]; return t; }

export const game = {
  meta: {
    nombre: 'Kayles',
    slug: 'kayles',
    subtitulo: 'Derriba bolos — el juego imparcial de los nim-values',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'derriba' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'derriba' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'En tu turno derribas <b>un bolo</b> o <b>dos bolos contiguos</b>; eso parte la fila en tramos. ' +
      'Pulsa un bolo para tumbarlo, o el <b>puente</b> entre dos contiguos para tumbar ambos. ' +
      '<b>Quien no puede derribar, pierde.</b>',
    help:
      '<p>Hay una fila de bolos. Por turnos, cada jugador derriba <b>un bolo</b> o <b>dos bolos adyacentes</b> ' +
      '(con una bola que rueda recto). Al quitar bolos del centro, la fila se rompe en tramos separados que ' +
      'siguen vivos por su cuenta. <b>Pierde quien se queda sin ningún bolo que derribar.</b></p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Kayles es un <b>juego imparcial</b> (los dos disponen de las mismas jugadas), ' +
      'el terreno del <b>teorema de Sprague-Grundy</b>: cada tramo tiene un <i>nim-value</i> y la posición se gana si el ' +
      '<b>XOR</b> de todos ellos es distinto de cero. La máquina conoce esa tabla, así que en «⚖️ ¿Quién gana?» y «💡 Pista» ' +
      'juega de forma perfecta.</p>',
    footer: 'Kayles, de Henry Dudeney y Sam Loyd, analizado en <i>Winning Ways</i> de Berlekamp, Conway &amp; Guy · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { segs: [c.n], turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const moves = [];
    for (let sgi = 0; sgi < s.segs.length; sgi++){
      const L = s.segs[sgi];
      // derribar 1 bolo en la posición i -> trozos [i, L-1-i]
      for (let i = 0; i < L; i++) moves.push({ s: sgi, i, take: 1 });
      // derribar 2 contiguos desde la posición i -> trozos [i, L-2-i]
      for (let i = 0; i + 1 < L; i++) moves.push({ s: sgi, i, take: 2 });
    }
    return moves;
  },

  apply(s, m){
    const L = s.segs[m.s];
    const a = m.i;
    const b = L - m.take - m.i;
    return { segs: splitSegs(s.segs, m.s, a, b), turn: s.turn ^ 1 };
  },

  isTerminal(s){ return totalPins(s.segs) === 0; },

  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Imparcial: XOR de los nim-values de cada tramo. Si !=0, gana quien mueve.
  // `evaluate` se invoca siempre desde la óptica de quien mueve, así que basta el signo.
  evaluate(s, player){
    let x = 0;
    for (let i = 0; i < s.segs.length; i++) x ^= grundy(s.segs[i]);
    const moverWins = x !== 0;
    // player es quien mueve en `s`; el motor maximiza para él.
    return moverWins ? 1 : -1;
  },

  // Clave de transposición: el orden de los tramos no importa.
  key(s){ return s.segs.slice().sort((a, b) => a - b).join(',') + '|' + s.turn; },

  exactOK(s){ return totalPins(s.segs) <= 18; },

  viewBox(s){
    // anchura: suma de columnas + huecos entre tramos.
    let cols = 0;
    for (let i = 0; i < s.segs.length; i++) cols += s.segs[i];
    const w = PAD * 2 + Math.max(1, cols) * PIN + Math.max(0, cols - 1) * GAP +
              Math.max(0, s.segs.length - 1) * SEGGAP;
    return '0 0 ' + w + ' ' + H;
  },

  render(svg, s, ctx){
    const cur = s.turn;
    const moves = ctx.interactive ? this.legalMoves(s) : [];
    // ¿hay un fantasma-pista para esta jugada exacta?
    const isHint = (mv) => ctx.hint && ctx.hint.s === mv.s && ctx.hint.i === mv.i && ctx.hint.take === mv.take;

    // Disponemos los bolos de izquierda a derecha; cada tramo añade un hueco extra (SEGGAP).
    // Guardamos para cada (tramo, posición) la coordenada x del centro.
    const cy = H / 2 + 4;
    let x = PAD + PIN / 2;
    const centers = [];           // centers[sgi][i] = x del bolo
    for (let sgi = 0; sgi < s.segs.length; sgi++){
      const L = s.segs[sgi];
      const row = [];
      for (let i = 0; i < L; i++){
        row.push(x);
        x += PIN + GAP;
      }
      centers.push(row);
      x += SEGGAP - GAP;          // hueco de tramo (sustituye al GAP normal)
    }

    // 1) bolos (palo: cabeza redonda + cuerpo)
    for (let sgi = 0; sgi < s.segs.length; sgi++){
      const L = s.segs[sgi];
      for (let i = 0; i < L; i++){
        const px = centers[sgi][i];
        const g = el('g', { class: 'pin' }, svg);
        el('circle', { class: 'pinhead', cx: px, cy: cy - PIN * 0.42, r: PIN * 0.30 }, g);
        el('rect', { class: 'pinbody', x: px - PIN * 0.18, y: cy - PIN * 0.16,
          width: PIN * 0.36, height: PIN * 0.78, rx: PIN * 0.18 }, g);
      }
    }

    if (!ctx.interactive) return;

    // 2) puentes (derribar 2 contiguos): halo + fantasma sobre el espacio entre dos bolos.
    for (const m of moves){
      if (m.take !== 2) continue;
      const x1 = centers[m.s][m.i], x2 = centers[m.s][m.i + 1];
      const bx = (x1 + x2) / 2;
      if (isHint(m))
        el('circle', { class: 'halo', cx: bx, cy, r: PIN * 0.5 + 7 }, svg);
      const gg = el('circle', { class: 'ghost g' + cur, cx: bx, cy, r: PIN * 0.42 }, svg);
      gg.addEventListener('click', () => ctx.onMove({ s: m.s, i: m.i, take: 2 }));
    }

    // 3) bolos clicables (derribar 1): halo + fantasma encima de cada bolo.
    for (const m of moves){
      if (m.take !== 1) continue;
      const px = centers[m.s][m.i];
      if (isHint(m))
        el('rect', { class: 'halo', x: px - PIN * 0.42, y: cy - PIN * 0.78,
          width: PIN * 0.84, height: PIN * 1.28, rx: PIN * 0.4 }, svg);
      const g = el('rect', { class: 'ghost g' + cur, x: px - PIN * 0.34, y: cy - PIN * 0.72,
        width: PIN * 0.68, height: PIN * 1.16, rx: PIN * 0.32 }, svg);
      g.addEventListener('click', () => ctx.onMove({ s: m.s, i: m.i, take: 1 }));
    }
  },
};
