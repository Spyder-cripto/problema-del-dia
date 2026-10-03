// relojes-arena/buscar.mjs — busca puzzles nuevos con el solver exhaustivo y los compara con el original (7, 11, 15 → 24, un giro por reloj).
//   node juego/relojes-arena/buscar.mjs [n_relojes=3] [dmax=22] [giros=1] [tmax=60]
// Para cada conjunto de relojes enumera TODOS los calendarios una sola vez y, por objetivo, mide: soluciones mínimas, acciones, inicio y fin del periodo.
import * as G from './game.js';
const nRel = +(process.argv[2] || 3), dmax = +(process.argv[3] || 22), giros = process.argv[4] === 'inf' ? Infinity : +(process.argv[4] || 1), tmax = +(process.argv[5] || 60);
const base = G.analizar([7, 11, 15], 1, 24);
console.log('BASE (7,11,15 → 24, 1 giro): soluciones mínimas', base.solMinimas, '· acciones', base.minAcciones, '· periodo empieza en', base.minInicio, 'y acaba en', base.minFin, '· calendarios revisados', base.hojas);
const conjuntos = [];
(function rec(d, ini) { if (d.length === nRel) { conjuntos.push(d.slice()); return; } for (let x = ini; x <= dmax; x++) { d.push(x); rec(d, x + 1); d.pop(); } })([], 2);
const res = [];
const t0 = Date.now();
for (const D of conjuntos) {
  const hojas = G.enumerar(D, giros, { maxAcciones: giros === Infinity ? 2 * nRel : 2 * nRel });
  // objetivos alcanzables por algún calendario
  const porObj = new Map();
  for (const h of hojas) { const s = new Set(h.instantes); for (const a of h.instantes) for (const b of h.instantes) if (b > a && b - a <= tmax) { const d = b - a; if (!porObj.has(d)) porObj.set(d, []); } }
  for (const obj of porObj.keys()) {
    if (G.recetaDirecta(D, obj)) continue;
    const r = G.analizarHojas(D, giros, obj, hojas);
    if (!r.resuelve) continue;
    res.push({ D, obj, sol: r.solMinimas, acc: r.minAcciones, ini: r.minInicio, fin: r.minFin });
  }
}
console.log('conjuntos', conjuntos.length, '· puzzles resolubles sin receta directa', res.length, '·', Math.round((Date.now() - t0) / 1000), 's');
// los que igualan o superan la base: no peor en ninguna medida y mejor en al menos una
const mejor = res.filter(r => r.sol <= base.solMinimas && r.acc >= base.minAcciones && r.ini >= base.minInicio && r.fin >= base.minFin && (r.sol < base.solMinimas || r.acc > base.minAcciones || r.ini > base.minInicio || r.fin > base.minFin));
console.log('igualan o superan la base:', mejor.length);
if (process.env.SALIDA) (await import('node:fs')).writeFileSync(process.env.SALIDA, JSON.stringify(mejor));
mejor.sort((a, b) => a.sol - b.sol || b.acc - a.acc || b.ini - a.ini || b.fin - a.fin);
for (const r of mejor.slice(0, 40)) console.log(JSON.stringify(r));
