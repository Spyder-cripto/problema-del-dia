// completa-la-tabla/game.js — "Completa la tabla" (Junio Puzzles). Lógica pura, SIN DOM (probada en test.mjs).
//
// 16 fichas numeradas 1..16, cada una de uno de cuatro colores, que hay que colocar en una tabla 4×4 de modo que
// cada fila, columna y diagonal larga sume 34 y cada color aparezca una vez en cada fila y columna.
// La versión extendida añade dos reglas: las dos diagonales tampoco repiten color y los 9 cuadrados 2×2
// interiores también suman 34.
//
// Un tablero es un array `b` de longitud 16 (fila a fila): b[i] = número de la ficha (1..16) o 0 si está vacío.

export const N = 4, CELDAS = 16, SUMA = 34;
export const COLORES = ['rojo', 'amarillo', 'verde', 'azul'];                // índice de color 0..3
export const EMOJI = ['🟥', '🟨', '🟩', '🟦'];

// Reparto de colores: fichas de cada color (rojo, amarillo, verde, azul).
export const PALETAS = {
  // El de la imagen original del acertijo.
  orig: [[16, 6, 11, 1], [15, 8, 9, 2], [7, 10, 13, 4], [14, 12, 3, 5]],
  // El único tipo de reparto que admite las reglas extendidas con colores en bloques de cuatro números seguidos.
  ext: [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]],
};

// Una solución de la versión extendida, para las variantes con casillas dadas.
const SOL_EXT = [1, 8, 10, 15, 14, 11, 5, 4, 7, 2, 16, 9, 12, 13, 3, 6];

const dados = cs => Object.fromEntries(cs.map(i => [i, SOL_EXT[i]]));
export const CONFIGS = [
  { key: 'orig', label: 'Original · sin casillas dadas', paleta: 'orig', diagColor: false, cuadrados: false, dados: {},
    corto: 'Original', resumen: 'El acertijo tal como se publicó: sumas de 34 y un color de cada en cada fila y columna.' },
  { key: 'ayuda', label: 'Fácil · versión extendida con 8 casillas dadas', paleta: 'ext', diagColor: true, cuadrados: true, dados: dados([0, 1, 2, 3, 4, 5, 6, 7]),
    corto: 'Fácil', resumen: 'Con las dos primeras filas ya colocadas. Para entrar en materia.' },
  { key: 'ext', label: 'Medio · versión extendida con 3 casillas dadas (solución única)', paleta: 'ext', diagColor: true, cuadrados: true, dados: dados([0, 1, 2]),
    corto: 'Medio', resumen: 'Versión extendida: solo se dan el 1, el 8 y el 10 y se resuelve por deducción, sin adivinar. Tiene una única solución.' },
  { key: 'uno', label: 'Medio · un solo color, con 3 casillas dadas (solución única)', paleta: 'ext', diagColor: false, cuadrados: true, cubre: 0, dados: dados([0, 1, 2]),
    corto: 'Medio · un solo color', resumen: 'Sin la regla de las diagonales, pero con una ficha roja en cada uno de los 9 cuadrados 2×2. Se dan el 1, el 8 y el 10; se resuelve por deducción y tiene una única solución.' },
  { key: 'exp', label: 'Difícil · versión extendida sin casillas dadas', paleta: 'ext', diagColor: true, cuadrados: true, dados: {},
    corto: 'Difícil', resumen: 'Versión extendida sin ninguna casilla dada: hay que probar y comprobar. Hay 128 soluciones (contando giros y reflejos), y vale cualquiera.' },
];
export const configDe = key => CONFIGS.find(c => c.key === key) || CONFIGS[0];

// ---------- colores ----------
const cacheColor = {};
export function mapaColor(cfg) {
  if (cacheColor[cfg.paleta]) return cacheColor[cfg.paleta];
  const m = new Array(17).fill(-1);
  PALETAS[cfg.paleta].forEach((fichas, c) => fichas.forEach(n => { m[n] = c; }));
  return (cacheColor[cfg.paleta] = m);
}
export const colorDe = (cfg, n) => mapaColor(cfg)[n];

// ---------- líneas de la tabla ----------
export function lineas(cfg) {
  const filas = [], cols = [], diags = [], cuads = [];
  for (let r = 0; r < N; r++) { filas.push([0, 1, 2, 3].map(c => r * N + c)); cols.push([0, 1, 2, 3].map(c => c * N + r)); }
  diags.push([0, 5, 10, 15], [3, 6, 9, 12]);
  if (cfg.cuadrados) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const i = r * N + c; cuads.push([i, i + 1, i + N, i + N + 1]); }
  return { filas, cols, diags, cuads };
}
// líneas donde no puede repetirse color
export function lineasColor(cfg) {
  const L = lineas(cfg);
  return [...L.filas, ...L.cols, ...(cfg.diagColor ? L.diags : [])];
}
// líneas que deben sumar 34
export function lineasSuma(cfg) {
  const L = lineas(cfg);
  return [...L.filas, ...L.cols, ...L.diags, ...L.cuads];
}

export const tableroVacio = cfg => { const b = new Array(CELDAS).fill(0); for (const [i, v] of Object.entries(cfg.dados)) b[+i] = v; return b; };
export const colocadas = b => b.filter(v => v).length;
export const fichasLibres = b => { const usado = new Set(b.filter(v => v)); const out = []; for (let n = 1; n <= 16; n++) if (!usado.has(n)) out.push(n); return out; };

// ---------- análisis de un tablero (parcial o completo) ----------
// estado de una línea de suma: 'vacia' | 'parcial' | 'ok' (completa y suma 34) | 'mal' (completa sin 34, o ya pasada de 34)
export function estadoLinea(b, idx) {
  let suma = 0, llenas = 0;
  for (const i of idx) if (b[i]) { suma += b[i]; llenas++; }
  const estado = llenas === 0 ? 'vacia' : llenas === idx.length ? (suma === SUMA ? 'ok' : 'mal') : (suma > SUMA ? 'mal' : 'parcial');
  return { suma, llenas, estado };
}
// casillas que repiten color con otra de la misma fila, columna (o diagonal en la versión extendida)
export function conflictosColor(cfg, b) {
  const out = new Set();
  for (const idx of lineasColor(cfg)) {
    const vistos = {};
    for (const i of idx) if (b[i]) { const c = colorDe(cfg, b[i]); (vistos[c] = vistos[c] || []).push(i); }
    for (const c of Object.keys(vistos)) if (vistos[c].length > 1) vistos[c].forEach(i => out.add(i));
  }
  return out;
}
export function analiza(cfg, b) {
  const L = lineas(cfg);
  const f = ix => ix.map(i => estadoLinea(b, i));
  const filas = f(L.filas), cols = f(L.cols), diags = f(L.diags), cuads = f(L.cuads);
  const conflictos = conflictosColor(cfg, b);
  const todas = [...filas, ...cols, ...diags, ...cuads];
  const completo = colocadas(b) === CELDAS;
  // regla de «un solo color»: cada cuadrado 2×2 debe llevar al menos una ficha de ese color (estado por cuadrado)
  const cubren = cfg.cubre === undefined ? [] : L.cuads.map(idx => {
    const tiene = idx.some(i => b[i] && colorDe(cfg, b[i]) === cfg.cubre), llenos = idx.every(i => b[i]);
    return { tiene, estado: tiene ? 'ok' : llenos ? 'mal' : 'parcial' };
  });
  return { filas, cols, diags, cuads, cubren, conflictos, completo,
    correcto: completo && conflictos.size === 0 && todas.every(l => l.estado === 'ok') && cubren.every(c => c.estado === 'ok'),
    errores: todas.filter(l => l.estado === 'mal').length + conflictos.size + cubren.filter(c => c.estado === 'mal').length };
}
export const esSolucion = (cfg, b) => b.length === CELDAS && new Set(b).size === CELDAS && analiza(cfg, b).correcto;

// ¿se puede poner la ficha v en la casilla i sin chocar con nada de lo ya colocado? (color repetido o suma ya pasada)
export function jugadaLimpia(cfg, b, i, v) {
  const t = b.slice(); t[i] = v;
  const c = colorDe(cfg, v);
  for (const idx of lineasColor(cfg)) if (idx.includes(i)) for (const j of idx) if (j !== i && t[j] && colorDe(cfg, t[j]) === c) return false;
  for (const idx of lineasSuma(cfg)) if (idx.includes(i)) { const e = estadoLinea(t, idx); if (e.estado === 'mal') return false; }
  return true;
}

// ---------- solucionador: todas las soluciones por búsqueda con retroceso ----------
const cacheSol = {};
export function soluciones(cfg) {
  if (cacheSol[cfg.key]) return cacheSol[cfg.key];
  const col = mapaColor(cfg), sumas = lineasSuma(cfg), colores = lineasColor(cfg);
  // por casilla: qué líneas la contienen
  const sumasDe = Array.from({ length: CELDAS }, () => []), coloresDe = Array.from({ length: CELDAS }, () => []);
  sumas.forEach((idx, k) => idx.forEach(i => sumasDe[i].push(k)));
  colores.forEach((idx, k) => idx.forEach(i => coloresDe[i].push(k)));
  const ultima = sumas.map(idx => Math.max(...idx));   // la última casilla (en orden de lectura) de cada línea de suma
  // cuadrados 2×2 que deben llevar un color concreto: se comprueban cuando se coloca su última casilla
  const cuadsCubre = cfg.cubre === undefined ? [] : lineas(cfg).cuads;
  const cierraCubre = Array.from({ length: CELDAS }, () => []);
  cuadsCubre.forEach(idx => cierraCubre[Math.max(...idx)].push(idx));
  const b = new Array(CELDAS).fill(0), usado = new Array(17).fill(false), out = [];
  const parcial = sumas.map(() => 0), mask = colores.map(() => 0);
  for (const [i, v] of Object.entries(cfg.dados)) { b[+i] = v; usado[v] = true; }
  // las casillas dadas ya cuentan en las sumas y en las máscaras de color
  for (let i = 0; i < CELDAS; i++) if (b[i]) { sumasDe[i].forEach(k => { parcial[k] += b[i]; }); coloresDe[i].forEach(k => { mask[k] |= 1 << col[b[i]]; }); }
  (function rec(i) {
    while (i < CELDAS && cfg.dados[i] !== undefined) i++;
    if (i === CELDAS) {
      if (sumas.every((_, k) => parcial[k] === SUMA)) out.push(b.slice());
      return;
    }
    for (let v = 1; v <= 16; v++) {
      if (usado[v]) continue;
      const bit = 1 << col[v];
      if (coloresDe[i].some(k => mask[k] & bit)) continue;
      let ok = true;
      for (const k of sumasDe[i]) {
        const s = parcial[k] + v;
        if (s > SUMA || (ultima[k] === i && s !== SUMA)) { ok = false; break; }
      }
      if (!ok) continue;
      b[i] = v;
      if (cierraCubre[i].some(idx => !idx.some(j => col[b[j]] === cfg.cubre))) { b[i] = 0; continue; }
      usado[v] = true;
      sumasDe[i].forEach(k => { parcial[k] += v; }); coloresDe[i].forEach(k => { mask[k] |= bit; });
      rec(i + 1);
      sumasDe[i].forEach(k => { parcial[k] -= v; }); coloresDe[i].forEach(k => { mask[k] &= ~bit; });
      b[i] = 0; usado[v] = false;
    }
  })(0);
  return (cacheSol[cfg.key] = out);
}
// soluciones compatibles con lo que hay colocado (todas las casillas ocupadas coinciden)
export const compatibles = (cfg, b) => soluciones(cfg).filter(s => b.every((v, i) => !v || s[i] === v));

// Pista: dice la jugada siguiente que sigue siendo compatible con alguna solución completa.
//   { tipo: 'completo' }                          el tablero ya está resuelto
//   { tipo: 'quitar', celda }                     lo colocado no lleva a ninguna solución: quita la ficha de `celda`
//   { tipo: 'poner', celda, valor, color, forzada, soluciones }   pon `valor` en `celda`
export function pista(cfg, b) {
  if (esSolucion(cfg, b)) return { tipo: 'completo' };
  const comp = compatibles(cfg, b);
  if (!comp.length) {
    const propias = []; for (let i = 0; i < CELDAS; i++) if (b[i] && cfg.dados[i] === undefined) propias.push(i);
    // la ficha cuya retirada devuelve el tablero a un estado resoluble (probando de la última en orden de lectura a la primera)
    for (const i of propias.slice().reverse()) {
      const t = b.slice(); t[i] = 0;
      if (compatibles(cfg, t).length) return { tipo: 'quitar', celda: i, soluciones: 0 };
    }
    return { tipo: 'quitar', celda: propias.length ? propias[0] : -1, soluciones: 0 };
  }
  // casilla vacía con menos valores posibles entre las soluciones compatibles (si es 1: jugada forzada)
  let mejor = null;
  for (let i = 0; i < CELDAS; i++) {
    if (b[i]) continue;
    const vals = [...new Set(comp.map(s => s[i]))].sort((x, y) => x - y);
    if (!mejor || vals.length < mejor.vals.length) mejor = { i, vals };
  }
  return { tipo: 'poner', celda: mejor.i, valor: mejor.vals[0], color: colorDe(cfg, mejor.vals[0]), forzada: mejor.vals.length === 1, soluciones: comp.length };
}
