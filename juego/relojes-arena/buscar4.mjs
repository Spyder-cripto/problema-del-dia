// relojes-arena/buscar4.mjs — barrido de 4 relojes sobre una muestra aleatoria (con semilla) de conjuntos; escribe los candidatos en un fichero.
//   node buscar4.mjs <n_conjuntos> <semilla> <salida.jsonl> [dmax=16]
// Medidas por objetivo, en una pasada sobre todos los calendarios: acciones mínimas de una solución; solo si ese mínimo es ≥ 7 (la base tiene 6)
// y hay pocas soluciones, se calculan las soluciones MÍNIMAS exactas (inclusión de acciones).
import fs from 'node:fs';
import * as G from './game.js';
const [nSets, seed, out, dmax = '16'] = process.argv.slice(2);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const rng = mulberry(+seed), todos = [];
for (let a = 3; a <= +dmax; a++) for (let b = a + 1; b <= +dmax; b++) for (let c = b + 1; c <= +dmax; c++) for (let d = c + 1; d <= +dmax; d++) todos.push([a, b, c, d]);
for (let i = todos.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [todos[i], todos[j]] = [todos[j], todos[i]]; }
fs.writeFileSync(out, '');
let hechos = 0;
for (const D of todos.slice(0, +nSets)) {
  const hojas = G.enumerar(D, 1);
  const minAcc = new Map(), nMin = new Map();
  for (const h of hojas) {
    const dif = new Set(); const I = h.instantes;
    for (let i = 0; i < I.length; i++) for (let j = i + 1; j < I.length; j++) dif.add(I[j] - I[i]);
    for (const d of dif) { const n = h.acciones.length; if (!minAcc.has(d) || n < minAcc.get(d)) { minAcc.set(d, n); nMin.set(d, 1); } else if (n === minAcc.get(d)) nMin.set(d, nMin.get(d) + 1); }
  }
  for (const [obj, acc] of minAcc) {
    if (acc < 7 || obj < 6 || obj > 50 || G.recetaDirecta(D, obj)) continue;
    if (nMin.get(obj) > 6) continue;   // demasiadas soluciones de tamaño mínimo: no será casi única
    const r = G.analizarHojas(D, 1, obj, hojas);
    if (r.solMinimas <= 2) fs.appendFileSync(out, JSON.stringify({ D, obj, sol: r.solMinimas, acc: r.minAcciones, ini: r.minInicio, fin: r.minFin }) + '\n');
  }
  hechos++; if (hechos % 10 === 0) fs.appendFileSync(out + '.progreso', hechos + '\n');
}
fs.appendFileSync(out + '.progreso', 'FIN ' + hechos + '\n');
