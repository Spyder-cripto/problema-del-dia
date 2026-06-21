// dots-and-boxes/game.js — Juego: Puntos y Cajas (Dots and Boxes).
//
// Por turnos se traza una arista entre dos puntos vecinos. Quien CIERRA una caja
// (su cuarto lado) se la anota y VUELVE A JUGAR (turno extra). Cuando no quedan
// aristas, GANA quien más cajas tenga. Tableros impares (3×3=9, 5×5=25) → sin empate.
//
// ── POR QUÉ NO USA LA NEGAMAX DEL MOTOR ────────────────────────────────────────
// Rompe DOS supuestos de _engine/ai.js: (1) hay TURNO EXTRA al capturar (sin
// alternancia estricta); (2) se gana por PUNTUACIÓN, no «el último que movió».
// La negamax niega siempre (-rec) y cablea todo terminal a -(WIN-ply). Por eso el
// juego declara `meta.aiDriver:'custom'` y aporta su PROPIA IA, su «¿quién gana?»
// y su «pista». El motor no toca su negamax; solo despacha por capacidad declarada.
//
// El turno extra NO necesita nada del motor: `apply` simplemente NO voltea el turno
// cuando se cierra una caja; tanto el clic humano como el bucle `maybeAI` reentran
// solos mientras `current(state)` siga siendo el mismo jugador.
//
// IA = híbrida VALIDADA (de dots-boxes-verificacion): capturar → jugar seguro →
// abrir sacrificando lo mínimo; y en los FINALES, minimax EXACTO (margen neto con
// `cap>0 ? cap+rec(next) : -rec(next)`), donde emerge solo el double-dealing.

import { el } from '../_engine/svg.js';

const other = (p) => p ^ 1;

const PAD = 26, CELL = 56, DOT = 4.2;

// ── Geometría de líneas, cacheada por n (fuera del estado, como geom() de Havannah) ──
// Líneas horizontales H(r,c): de (fila r, col c) a (fila r, col c+1), r∈0..n, c∈0..n-1.
// Líneas verticales   V(r,c): de (fila r, col c) a (fila r+1, col c), r∈0..n-1, c∈0..n.
const _geom = {};
function geom(n){
  if (_geom[n]) return _geom[n];
  const numH = (n + 1) * n;
  const H = (r, c) => r * n + c;
  const V = (r, c) => numH + r * (n + 1) + c;
  const numLines = numH + n * (n + 1);
  const numBoxes = n * n;

  const boxLines = [];                                  // 4 líneas de cada caja (r*n+c)
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++)
    boxLines.push([H(r, c), H(r + 1, c), V(r, c), V(r, c + 1)]);

  const lineBoxes = Array.from({ length: numLines }, () => []);   // cajas que toca cada línea
  boxLines.forEach((ls, b) => ls.forEach(L => lineBoxes[L].push(b)));

  // Coordenadas de cada línea (para el render) y centro de cada caja.
  const lineGeo = new Array(numLines);
  for (let r = 0; r <= n; r++) for (let c = 0; c < n; c++){
    const L = H(r, c);
    lineGeo[L] = { horiz: true, x1: PAD + c * CELL, y1: PAD + r * CELL, x2: PAD + (c + 1) * CELL, y2: PAD + r * CELL };
  }
  for (let r = 0; r < n; r++) for (let c = 0; c <= n; c++){
    const L = V(r, c);
    lineGeo[L] = { horiz: false, x1: PAD + c * CELL, y1: PAD + r * CELL, x2: PAD + c * CELL, y2: PAD + (r + 1) * CELL };
  }
  const boxCenter = boxLines.map((_, b) => {
    const r = (b / n) | 0, c = b % n;
    return { x: PAD + (c + 0.5) * CELL, y: PAD + (r + 0.5) * CELL };
  });

  return (_geom[n] = { n, numH, H, V, numLines, numBoxes, boxLines, lineBoxes, lineGeo, boxCenter });
}

// ¿La caja b tiene sus 4 lados trazados en `lines`?
function boxDone(G, lines, b){
  const ls = G.boxLines[b];
  return lines[ls[0]] && lines[ls[1]] && lines[ls[2]] && lines[ls[3]];
}
// nº de lados trazados de la caja b.
function sidesOf(G, lines, b){
  const ls = G.boxLines[b];
  return lines[ls[0]] + lines[ls[1]] + lines[ls[2]] + lines[ls[3]];
}

const CONFIGS = [
  { key: '3', label: '3×3 (9 cajas)', n: 3 },
  { key: '5', label: '5×5 (25 cajas)', n: 5 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// ── Caps de la IA (medidos: 3×3 con ≤16 líneas restantes resuelve en ~33 ms) ──
const AI_EXACT_CAP = 16;     // la IA juega EXACTO cuando quedan ≤ esto
const WHO_MAP_CAP  = 20;     // «¿quién gana?» resuelve por Map cuando quedan ≤ esto (~2 s)

export const game = {
  meta: {
    nombre: 'Puntos y Cajas',
    slug: 'dots-and-boxes',
    subtitulo: 'Cierra más cajas que tu rival — y aprende a sacrificar para ganar',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'empieza' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'responde' },
    ],
    aiPlayer: 1,
    aiDriver: 'custom',          // ← el juego aporta su IA / análisis / pista (no la negamax)
    legend:
      'Por turnos trazáis una <b>arista</b> entre dos puntos vecinos. ' +
      'Quien dibuja el <b>cuarto lado</b> de una caja se la queda <b>y vuelve a jugar</b>. ' +
      'Cuando no quedan aristas, <b>gana quien más cajas tenga</b>.',
    help:
      '<p>Se juega sobre una rejilla de puntos. En tu turno trazas una arista (segmento corto) ' +
      'entre dos puntos contiguos. <b>Si tu arista completa el cuarto lado de una caja</b>, esa caja es tuya ' +
      'y <b>juegas otra vez</b> (puedes encadenar varias). Si no cierras ninguna, le toca al rival.</p>' +
      '<p>El truco no es comer todas las cajas que puedas: a menudo conviene <b>sacrificar dos</b> al final de una ' +
      'cadena (la jugada del «doble trato») para <b>conservar el turno</b> y obligar al rival a abrir la siguiente. ' +
      'Quien controla esa paridad gana las cadenas largas.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">La máquina juega la heurística de capturas y, en los finales, ' +
      '<b>resuelve la partida de forma exacta</b> (de ahí aparece el doble trato). En el 3×3, «⚖️ ¿Quién gana?» da el ' +
      'resultado con <b>juego perfecto</b> (gana el 2.º jugador, 6-3).</p>',
    footer: 'Puntos y Cajas (Édouard Lucas, «La Pipopipette», 1889) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const n = cfg(key).n;
    const G = geom(n);
    return { n, lines: new Array(G.numLines).fill(0), owner: new Array(G.numBoxes).fill(-1), score: [0, 0], turn: 0, last: null };
  },

  current(s){ return s.turn; },

  // Jugadas legales = índices de aristas sin trazar.
  legalMoves(s){
    const G = geom(s.n);
    const out = [];
    for (let L = 0; L < G.numLines; L++) if (!s.lines[L]) out.push(L);
    return out;
  },

  // PURO. Traza la arista; si cierra ≥1 caja, anota y MANTIENE el turno; si no, lo pasa.
  apply(s, L){
    const G = geom(s.n);
    const lines = s.lines.slice();
    lines[L] = 1;
    const owner = s.owner.slice();
    const score = s.score.slice();
    let cap = 0;
    for (const b of G.lineBoxes[L]) if (owner[b] === -1 && boxDone(G, lines, b)){ owner[b] = s.turn; cap++; }
    let turn = s.turn;
    if (cap > 0) score[turn] += cap;     // turno extra: NO se voltea
    else turn = other(turn);
    return { n: s.n, lines, owner, score, turn, last: L };
  },

  isTerminal(s){
    const G = geom(s.n);
    for (let L = 0; L < G.numLines; L++) if (!s.lines[L]) return false;
    return true;
  },

  // Gana quien más cajas tenga (tableros impares → nunca hay empate).
  winner(s){
    if (!this.isTerminal(s)) return null;
    return s.score[0] >= s.score[1] ? 0 : 1;
  },

  // Heurística de respaldo (solo la usaría la negamax del motor, que aquí NO se usa).
  evaluate(s, player){ return s.score[player] - s.score[other(player)]; },

  key(s){ return s.lines.join('') + '|' + s.turn; },

  exactOK(){ return false; },     // ← el motor NO debe resolver esto con su solver win/loss

  viewBox(s){ const w = PAD * 2 + s.n * CELL; return '0 0 ' + w + ' ' + w; },

  // ── IA (driver 'custom') ──────────────────────────────────────────────────
  // Híbrida: en los finales, minimax exacto; en el medio juego, heurística.
  chooseMove(s, opts){
    opts = opts || {};
    const moves = this.legalMoves(s);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];
    const randomness = opts.randomness || 0;
    if (randomness > 0 && Math.random() < randomness) return moves[(Math.random() * moves.length) | 0];
    return bestMove(s, moves, AI_EXACT_CAP);
  },

  // Pista = mejor jugada determinista (sin azar), exacta si el final lo permite.
  hintMove(s){
    const moves = this.legalMoves(s);
    if (!moves.length) return null;
    return bestMove(s, moves, WHO_MAP_CAP, true);
  },

  // «⚖️ ¿Quién gana?» — exacto cuando es viable; si no, heurística de cadenas largas.
  analysis(s, players){
    if (this.isTerminal(s)){
      const w = this.winner(s);
      return 'Final: gana <b style="color:' + players[w].color + '">' + players[w].nombre + '</b> por ' +
        Math.max(s.score[0], s.score[1]) + '-' + Math.min(s.score[0], s.score[1]) + '.';
    }
    const mover = s.turn;
    const m = exactMargin(s, WHO_MAP_CAP);     // margen NETO del jugador en turno con juego perfecto
    if (m != null){
      const net = (s.score[mover] - s.score[other(mover)]) + m;
      if (net === 0) return 'Con juego perfecto, la partida queda <b>igualada</b>.';
      const w = net > 0 ? mover : other(mover);
      return 'Con juego perfecto gana <b style="color:' + players[w].color + '">' + players[w].nombre +
        '</b> (por ' + Math.abs(net) + (Math.abs(net) === 1 ? ' caja' : ' cajas') + ').';
    }
    // Sin solución exacta viable (5×5 en apertura/medio juego): heurística + marcador.
    const fav = longChainFavored(s);
    const sc = 'Vais ' + s.score[0] + '-' + s.score[1] + '. ';
    return '(Tablero grande para resolverlo exacto.) ' + sc +
      'La regla de las cadenas largas favorece a <b style="color:' + players[fav].color + '">' + players[fav].nombre + '</b>.';
  },

  render(svg, s, ctx){
    const G = geom(s.n), n = s.n;

    // 1) cajas ya cerradas (color del dueño + inicial).
    for (let b = 0; b < G.numBoxes; b++){
      if (s.owner[b] === -1) continue;
      const r = (b / n) | 0, c = b % n;
      el('rect', { class: 'box b' + s.owner[b], x: PAD + c * CELL + 3, y: PAD + r * CELL + 3, width: CELL - 6, height: CELL - 6, rx: 5 }, svg);
      const ct = G.boxCenter[b];
      el('text', { class: 'boxlab', x: ct.x, y: ct.y }, svg).textContent = game.meta.players[s.owner[b]].corto[0];
    }

    // 2) aristas trazadas (la última, resaltada).
    for (let L = 0; L < G.numLines; L++){
      if (!s.lines[L]) continue;
      const g = G.lineGeo[L];
      el('line', { class: 'edge' + (L === s.last ? ' last' : ''), x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 }, svg);
    }

    // 3) pista (arista sugerida).
    if (ctx.hint != null && G.lineGeo[ctx.hint]){
      const g = G.lineGeo[ctx.hint];
      el('line', { class: 'hintedge', x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 }, svg);
    }

    // 4) zonas-clic en las aristas sin trazar.
    if (ctx.interactive){
      for (let L = 0; L < G.numLines; L++){
        if (s.lines[L]) continue;
        const g = G.lineGeo[L];
        const hit = el('line', { class: 'hit', x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2 }, svg);
        const LL = L;
        hit.addEventListener('click', () => ctx.onMove(LL));
      }
    }

    // 5) puntos (encima de todo).
    for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++)
      el('circle', { class: 'dot', cx: PAD + c * CELL, cy: PAD + r * CELL, r: DOT }, svg);
  },
};

// ════════════════════════════════════════════════════════════════════════════
//  IA — heurística + minimax EXACTO de finales (portado de dots-boxes-verificacion)
// ════════════════════════════════════════════════════════════════════════════

function boxDoneBefore(G, lines, b){ return sidesOf(G, lines, b) === 4; }

// ¿es L una jugada SEGURA? (no captura y no deja ninguna caja a 3 lados → no regala)
function isSafe(G, lines, L){
  // solo cambian las cajas que tocan L
  for (const b of G.lineBoxes[L]){
    const sd = sidesOf(G, lines, b);
    if (sd === 3) return false;        // ya había una caja a 3 → sería captura, no «seguro»
    if (sd === 2) return false;        // trazar L la dejaría a 3 → regala
  }
  return true;
}

// Cosecha de un rival CODICIOSO desde `lines` (captura mientras pueda). Mide «cuánto regalo».
function greedyGift(G, lines){
  const L2 = lines.slice();
  let total = 0, again = true;
  while (again){
    again = false;
    for (let L = 0; L < G.numLines; L++){
      if (L2[L]) continue;
      let cap = 0;
      for (const b of G.lineBoxes[L]) if (sidesOf(G, L2, b) === 3) cap++;
      if (cap > 0){ L2[L] = 1; total += cap; again = true; break; }
    }
  }
  return total;
}

// Mejor jugada: exacta si quedan pocas líneas; si no, heurística (capturar/seguro/min-sacrificio).
function bestMove(s, moves, exactCap, deterministic){
  const G = geom(s.n);
  if (moves.length <= exactCap){
    const E = buildEndgame(G, s.lines);
    let best = -Infinity, pick = [];
    for (const L of moves){
      const child = E.applyLocal(E.root, L);
      const val = child.cap > 0 ? child.cap + E.rec(child.mask) : -E.rec(child.mask);
      if (val > best + 1e-9){ best = val; pick = [L]; }
      else if (Math.abs(val - best) <= 1e-9) pick.push(L);
    }
    return deterministic ? pick[0] : pick[(Math.random() * pick.length) | 0];
  }
  // Heurística (medio juego):
  const caps = moves.filter(L => {
    for (const b of G.lineBoxes[L]) if (sidesOf(G, s.lines, b) === 3) return true;
    return false;
  });
  if (caps.length) return deterministic ? caps[0] : caps[(Math.random() * caps.length) | 0];
  const safe = moves.filter(L => isSafe(G, s.lines, L));
  if (safe.length) return deterministic ? safe[0] : safe[(Math.random() * safe.length) | 0];
  // Forzado a abrir: elegir la apertura que menos regala.
  let best = Infinity, pick = [];
  for (const L of moves){
    const lines = s.lines.slice(); lines[L] = 1;
    const gift = greedyGift(G, lines);
    if (gift < best){ best = gift; pick = [L]; }
    else if (gift === best) pick.push(L);
  }
  return deterministic ? pick[0] : pick[(Math.random() * pick.length) | 0];
}

// Margen neto óptimo para el jugador en turno (positivo = va ganando), o null si es inviable exacto.
function exactMargin(s, mapCap){
  const G = geom(s.n);
  const remaining = game.legalMoves(s).length;
  if (remaining === 0) return 0;
  if (remaining <= mapCap) return buildEndgame(G, s.lines).rec(0);
  if (G.numLines <= 24) return full3x3(G, s.lines);   // 3×3: Int8Array cacheado (exacto desde cualquier posición)
  return null;
}

// ── Minimax EXACTO de finales (remapeo de las líneas SIN trazar a bits locales 0..k-1) ──
// Margen NETO = mis cajas − cajas del rival en lo que queda; con `cap>0 ? cap+rec : -rec`.
function buildEndgame(G, lines){
  const U = [];                                  // líneas sin trazar (índices globales)
  for (let L = 0; L < G.numLines; L++) if (!lines[L]) U.push(L);
  const k = U.length;
  const localOf = new Map(); U.forEach((L, i) => localOf.set(L, i));
  // Para cada caja AÚN abierta: máscara local de sus lados sin trazar + nº de lados ya trazados.
  const boxLocalMask = [], boxOfLocal = Array.from({ length: k }, () => []);
  for (let b = 0; b < G.numBoxes; b++){
    if (boxDoneBefore(G, lines, b)) continue;     // caja ya cerrada: no participa
    let m = 0;
    for (const L of G.boxLines[b]) if (!lines[L]) m |= (1 << localOf.get(L));
    const bi = boxLocalMask.length; boxLocalMask.push(m);
    for (let i = 0; i < k; i++) if (m & (1 << i)) boxOfLocal[i].push(bi);
  }
  const FULL = k === 0 ? 0 : ((k >= 31) ? null : ((1 << k) - 1));
  const memo = new Map();
  function rec(mask){
    if (mask === FULL) return 0;
    const c = memo.get(mask); if (c !== undefined) return c;
    let best = -Infinity;
    for (let i = 0; i < k; i++){
      const bit = 1 << i; if (mask & bit) continue;
      const nm = mask | bit;
      let cap = 0;
      for (const bi of boxOfLocal[i]){ const bm = boxLocalMask[bi]; if ((nm & bm) === bm && (mask & bm) !== bm) cap++; }
      const val = cap > 0 ? cap + rec(nm) : -rec(nm);
      if (val > best) best = val;
    }
    memo.set(mask, best);
    return best;
  }
  // applyLocal(mask, globalLine) → { mask', cap } para evaluar una jugada concreta.
  function applyLocal(mask, globalLine){
    const i = localOf.get(globalLine), bit = 1 << i, nm = mask | bit;
    let cap = 0;
    for (const bi of boxOfLocal[i]){ const bm = boxLocalMask[bi]; if ((nm & bm) === bm && (mask & bm) !== bm) cap++; }
    return { mask: nm, cap };
  }
  return { rec, applyLocal, root: 0, k };
}

// ── 3×3 exacto por bitmask global (Int8Array 16 MB, cacheado por sesión) ──
// Solo para «¿quién gana?» en posiciones tempranas del 3×3 (el final usa buildEndgame).
const _tt3 = {};
function full3x3(G, lines){
  if (G.numLines > 30) return null;
  let tt = _tt3[G.n];
  if (!tt){
    tt = new Int8Array(1 << G.numLines).fill(127);
    const FULL = (1 << G.numLines) - 1, lb = G.lineBoxes, bm = G.boxLines.map(ls => ls.reduce((m, L) => m | (1 << L), 0));
    (function rec(mask){
      if (mask === FULL) return 0;
      const c = tt[mask]; if (c !== 127) return c;
      let best = -128;
      for (let L = 0; L < G.numLines; L++){
        const bit = 1 << L; if (mask & bit) continue;
        const nm = mask | bit;
        let cap = 0;
        for (const b of lb[L]){ const m = bm[b]; if ((nm & m) === m && (mask & m) !== m) cap++; }
        const val = cap > 0 ? cap + rec(nm) : -rec(nm);
        if (val > best) best = val;
      }
      tt[mask] = best; return best;
    })(0);
    _tt3[G.n] = tt;
  }
  let mask = 0;
  for (let L = 0; L < G.numLines; L++) if (lines[L]) mask |= (1 << L);
  return tt[mask];
}

// ── Heurística de cadenas largas (paridad) para 5×5 en apertura ──
// El 1.º quiere que (puntos + cadenas largas) sea PAR; el 2.º, IMPAR. Devuelve 0|1.
function longChainFavored(s){
  const G = geom(s.n);
  const dots = (s.n + 1) * (s.n + 1);
  // Estructura del dual: grado de cada caja abierta = lados sin trazar.
  const deg = [], openBox = [];
  for (let b = 0; b < G.numBoxes; b++){ const d = 4 - sidesOf(G, s.lines, b); if (d > 0){ openBox.push(b); deg[b] = d; } }
  // Componentes de cajas de grado ≤2 → cadenas; largas = longitud ≥3.
  const seen = new Set(); let longChains = 0;
  // adyacencia entre cajas por aristas sin trazar
  const nbrs = (b) => {
    const r = (b / s.n) | 0, c = b % s.n, out = [];
    const H = G.H, V = G.V;
    if (!s.lines[H(r, c)] && r > 0) out.push(b - s.n);
    if (!s.lines[H(r + 1, c)] && r < s.n - 1) out.push(b + s.n);
    if (!s.lines[V(r, c)] && c > 0) out.push(b - 1);
    if (!s.lines[V(r, c + 1)] && c < s.n - 1) out.push(b + 1);
    return out;
  };
  for (const b of openBox){
    if (seen.has(b) || deg[b] > 2) continue;
    const comp = []; const stack = [b];
    while (stack.length){ const x = stack.pop(); if (seen.has(x)) continue; seen.add(x); comp.push(x); for (const y of nbrs(x)) if (!seen.has(y) && deg[y] <= 2) stack.push(y); }
    if (comp.length >= 3) longChains++;
  }
  return ((dots + longChains) % 2 === 0) ? 0 : 1;
}
