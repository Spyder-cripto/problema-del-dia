// langford/game.js — Solitario de Langford con cartas. Lógica pura, SIN DOM (probada en test.mjs).
//
// Se usan 2n cartas: dos de cada valor 1..n. Hay que colocarlas en una fila de 2n huecos de modo que, entre las dos
// cartas de valor k, haya exactamente k cartas; es decir, que sus posiciones difieran en k + 1.
// Hay solución si y solo si n deja resto 0 o 3 al dividir entre 4.
//
// Una colocación es un array `a` de longitud 2n: a[i] = valor de la carta del hueco i (1..n) o 0 si está vacío.

export const NS_JUGABLES = [3, 4, 7, 8];       // con solución, de fácil a difícil
export const NS_SIN_SOLUCION = [5, 6];          // avanzado: se explica que no se puede
export const COUNTS_ESPERADOS = { 1: 0, 2: 0, 3: 2, 4: 2, 5: 0, 6: 0, 7: 52, 8: 300, 9: 0 };   // criterio de aceptación

export const hayRazon = n => n % 4 === 0 || n % 4 === 3;   // condición necesaria y suficiente

// ---------- solucionador: todas las soluciones por búsqueda con retroceso ----------
// Se colocan los valores de n a 1: para cada valor k se prueban las posiciones i con los huecos i e i+k+1 libres.
// Eso reproduce exactamente el recuento: las dos cartas de un valor son idénticas, así que cada pareja de huecos cuenta una vez.
const cache = new Map();
export function solve(n) {
  if (cache.has(n)) return cache.get(n);
  const len = 2 * n, a = new Array(len).fill(0), out = [];
  (function rec(k) {
    if (k === 0) { out.push(a.slice()); return; }
    for (let i = 0; i + k + 1 < len; i++) {
      if (a[i] === 0 && a[i + k + 1] === 0) { a[i] = a[i + k + 1] = k; rec(k - 1); a[i] = a[i + k + 1] = 0; }
    }
  })(n);
  cache.set(n, out);
  return out;
}
export const countSolutions = n => solve(n).length;
// soluciones distintas sin contar el reverso (la solución leída al revés también lo es)
export const reverseOf = a => a.slice().reverse();
export const canon = a => { const x = a.join(' '), y = reverseOf(a).join(' '); return x <= y ? x : y; };
export const distinctCount = n => new Set(solve(n).map(canon)).size;

// ---------- validación ----------
export function isSolution(a, n) {
  if (!Array.isArray(a) || a.length !== 2 * n) return false;
  const pos = positions(a, n);
  for (let k = 1; k <= n; k++) if (pos[k].length !== 2 || pos[k][1] - pos[k][0] !== k + 1) return false;
  return true;
}
// posiciones de cada valor: { k: [huecos...] }
export function positions(a, n) {
  const pos = {}; for (let k = 1; k <= n; k++) pos[k] = [];
  a.forEach((v, i) => { if (v >= 1 && v <= n) pos[v].push(i); });
  return pos;
}
// estado de cada valor: 'vacio' (ninguna carta), 'abierta' (una sola), 'ok' (las dos a la distancia justa), 'mal'
export function pairStatus(a, n) {
  const pos = positions(a, n), st = {};
  for (let k = 1; k <= n; k++) {
    const p = pos[k];
    st[k] = p.length === 0 ? 'vacio' : p.length === 1 ? 'abierta' : (p[1] - p[0] === k + 1 ? 'ok' : 'mal');
  }
  return st;
}
// huecos vacíos donde puede ir la pareja de una carta ya colocada de valor k (a distancia k+1); [] si no hay una sola colocada
export function legalSlots(a, n, k) {
  const p = positions(a, n)[k];
  if (p.length !== 1) return [];
  return [p[0] - (k + 1), p[0] + (k + 1)].filter(i => i >= 0 && i < 2 * n && a[i] === 0);
}
// cuántas cartas de cada valor quedan por colocar
export const remaining = (a, n) => { const r = {}; const pos = positions(a, n); for (let k = 1; k <= n; k++) r[k] = 2 - pos[k].length; return r; };

// ---------- ayuda con el solucionador ----------
// soluciones completas que respetan lo ya colocado (cada hueco ocupado coincide con la solución)
export function compatible(a, n) { return solve(n).filter(s => a.every((v, i) => v === 0 || s[i] === v)); }
// Siguiente carta compatible con alguna solución completa. Devuelve:
//  { tipo: 'sin-solucion' }                         el n no tiene solución
//  { tipo: 'completa' }                             ya está resuelto
//  { tipo: 'conflicto', quitar: [huecos...] }       lo colocado no lleva a ninguna solución (y qué cartas, quitadas de una en una, lo arreglarían)
//  { tipo: 'poner', k, hueco, soluciones }          coloca un k en ese hueco
export function hint(a, n) {
  if (solve(n).length === 0) return { tipo: 'sin-solucion' };
  if (isSolution(a, n)) return { tipo: 'completa' };
  const m = compatible(a, n);
  if (!m.length) {
    const quitar = [];
    a.forEach((v, i) => { if (v) { const b = a.slice(); b[i] = 0; if (compatible(b, n).length) quitar.push(i); } });
    return { tipo: 'conflicto', quitar };
  }
  // 1.º: cerrar una pareja abierta (la jugada más natural); 2.º: el valor mayor que aún no se ha empezado
  const pos = positions(a, n);
  const elegir = (k, hueco_de) => {
    const cuenta = new Map();
    for (const s of m) { const h = hueco_de(s); if (h !== undefined && a[h] === 0) cuenta.set(h, (cuenta.get(h) || 0) + 1); }
    let best = null; for (const [h, c] of cuenta) if (!best || c > best[1] || (c === best[1] && h < best[0])) best = [h, c];
    return best ? { tipo: 'poner', k, hueco: best[0], soluciones: m.length } : null;
  };
  for (let k = n; k >= 1; k--) if (pos[k].length === 1) {
    const r = elegir(k, s => { const q = s.indexOf(k) === pos[k][0] ? s.lastIndexOf(k) : s.indexOf(k); return q; });
    if (r) return r;
  }
  for (let k = n; k >= 1; k--) if (pos[k].length === 0) {
    const r = elegir(k, s => s.indexOf(k));
    if (r) return r;
  }
  return { tipo: 'completa' };
}

// ---------- utilidades de partida ----------
export const emptyBoard = n => new Array(2 * n).fill(0);
export function place(a, n, hueco, k) {   // devuelve una colocación NUEVA; lanza si no se puede
  if (!(hueco >= 0 && hueco < 2 * n) || a[hueco] !== 0) throw new Error('hueco no libre: ' + hueco);
  if (!(k >= 1 && k <= n) || remaining(a, n)[k] < 1) throw new Error('no quedan cartas de ese valor: ' + k);
  const b = a.slice(); b[hueco] = k; return b;
}
export function removeAt(a, hueco) {
  if (!a[hueco]) throw new Error('hueco vacío: ' + hueco);
  const b = a.slice(); b[hueco] = 0; return b;
}
export function move(a, n, desde, hasta) {   // mueve la carta de un hueco a otro libre
  const k = a[desde]; if (!k) throw new Error('hueco vacío: ' + desde);
  return place(removeAt(a, desde), n, hasta, k);
}
