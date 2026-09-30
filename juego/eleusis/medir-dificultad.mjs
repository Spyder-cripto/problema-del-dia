// medir-dificultad.mjs — dificultad de cada regla de Eleusis: coste de la explicación más sencilla (hasta 4 ideas de un catálogo con coste 1 a 4)
// que la reproduce exactamente, comprobada con datos de entrenamiento y de prueba distintos.   node juego/eleusis/medir-dificultad.mjs
// Es una medida orientativa: el catálogo de ideas lo ha escrito quien diseñó las reglas nuevas, y no sustituye a probar con jugadores.
import * as G from './game.js';
const PR = new Set([2, 3, 5, 7, 11, 13]), NEXT = { 0: 2, 2: 1, 1: 3, 3: 0 };
const blk = c => c.s < 2, fig = c => c.v >= 11, sg = x => x < 0 ? 0 : x === 0 ? 1 : 2;
const cartas = []; for (let s = 0; s < 4; s++) for (let v = 1; v <= 13; v++) cartas.push({ v, s });

const T3 = h => h.length >= 3 ? h[h.length - 3] : h[0];
const tot = h => h.reduce((a, x) => a + x.v, 0);
const cat = [
  ['nColor', 1, 2, (h, c) => blk(c) ? 0 : 1], ['nPalo', 1, 4, (h, c) => c.s], ['nParidad', 1, 2, (h, c) => c.v % 2], ['nFigura', 1, 2, (h, c) => fig(c) ? 1 : 0], ['nPrimo', 1, 2, (h, c) => PR.has(c.v) ? 1 : 0], ['nAlto', 1, 2, (h, c) => c.v > 7 ? 1 : 0], ['nValor', 3, 13, (h, c) => c.v - 1],
  ['uColor', 1, 2, (h, c, l) => blk(l) ? 0 : 1], ['uPalo', 1, 4, (h, c, l) => l.s], ['uParidad', 1, 2, (h, c, l) => l.v % 2], ['uFigura', 1, 2, (h, c, l) => fig(l) ? 1 : 0], ['uPrimo', 1, 2, (h, c, l) => PR.has(l.v) ? 1 : 0], ['uAlto', 1, 2, (h, c, l) => l.v > 7 ? 1 : 0], ['uValor', 3, 13, (h, c, l) => l.v - 1],
  ['mismoColor', 1, 2, (h, c, l) => blk(c) === blk(l) ? 1 : 0], ['mismoPalo', 1, 2, (h, c, l) => c.s === l.s ? 1 : 0], ['mismaParidad', 1, 2, (h, c, l) => c.v % 2 === l.v % 2 ? 1 : 0], ['sube/baja', 1, 3, (h, c, l) => sg(c.v - l.v)], ['cerca2', 1, 2, (h, c, l) => Math.abs(c.v - l.v) <= 2 ? 1 : 0],
  ['aColor', 2, 2, (h, c, l, p) => blk(p) ? 0 : 1], ['aPalo', 2, 4, (h, c, l, p) => p.s], ['aParidad', 2, 2, (h, c, l, p) => p.v % 2], ['aFigura', 2, 2, (h, c, l, p) => fig(p) ? 1 : 0], ['aValor', 3, 13, (h, c, l, p) => p.v - 1],
  ['sube/baja vs anterior', 2, 3, (h, c, l, p) => sg(c.v - p.v)], ['mismoColor vs anterior', 2, 2, (h, c, l, p) => blk(c) === blk(p) ? 1 : 0], ['mismoPalo vs anterior', 2, 2, (h, c, l, p) => c.s === p.s ? 1 : 0], ['mismaParidad vs anterior', 2, 2, (h, c, l, p) => c.v % 2 === p.v % 2 ? 1 : 0],
  ['posición par', 2, 2, h => h.length % 2], ['posición mod 3', 2, 3, h => h.length % 3], ['posición mod 4', 2, 4, h => h.length % 4],
  ['suma(ú+n) mod 3', 2, 3, (h, c, l) => (l.v + c.v) % 3], ['paso en ciclo de palos', 2, 4, (h, c, l) => { let s = l.s, k = 0; while (s !== c.s && k < 4) { s = NEXT[s]; k++; } return k; }], ['distancia de valores', 2, 6, (h, c, l) => { const d = Math.abs(c.v - l.v); return d <= 3 ? d : d <= 6 ? 4 : 5; }],
  ['color mayoritario de las 3 últimas', 3, 3, (h, c) => { const u = h.slice(-3); const n = u.filter(blk).length, r = u.length - n; return n > r ? 0 : r > n ? 1 : 2; }],
  ['suma(2 últimas+n) mod 3', 3, 3, (h, c) => (h.slice(-2).reduce((a, x) => a + x.v, 0) + c.v) % 3],
  ['distancia circular a la última', 3, 13, (h, c, l) => (c.v - l.v + 13) % 13], ['distancia circular a la anterior', 3, 13, (h, c, l, p) => (c.v - p.v + 13) % 13],
  ['paridad del total de la línea', 3, 2, h => tot(h) % 2],
  ['3 atrás es figura', 3, 2, h => fig(T3(h)) ? 1 : 0], ['valor de la nueva mod 4', 3, 4, (h, c) => c.v % 4], ['valor de la última mod 4', 3, 4, (h, c, l) => l.v % 4],
  ['suma(ú+a) mod 4', 4, 4, (h, c, l, p) => (l.v + p.v) % 4], ['total de la línea mod 4', 4, 4, h => tot(h) % 4],
];
let x = 777; const rnd = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
const muestra = n => Array.from({ length: n }, () => { const len = 3 + Math.floor(rnd() * 10); return [Array.from({ length: len }, () => cartas[Math.floor(rnd() * 52)]), cartas[Math.floor(rnd() * 52)]]; });
const N = 9000, TR = muestra(N), TE = muestra(N);
const feat = S => S.map(([h, c]) => { const l = h[h.length - 1], p = h.length >= 2 ? h[h.length - 2] : l; return cat.map(f => f[3](h, c, l, p)); });
const FT = feat(TR), FE = feat(TE), M = cat.length;
function explica(tt, te) {
  let mejor = null;
  const prueba = idx => {
    const cs = idx.map(i => cat[i][2]); let cells = 1; for (const c of cs) cells *= c; const tab = new Int8Array(cells).fill(-1);
    for (let i = 0; i < N; i++) { let k = 0; for (let j = 0; j < idx.length; j++) k = k * cs[j] + FT[i][idx[j]]; const t = tt[i]; if (tab[k] === -1) tab[k] = t; else if (tab[k] !== t) return false; }
    for (let i = 0; i < N; i++) { let k = 0; for (let j = 0; j < idx.length; j++) k = k * cs[j] + FE[i][idx[j]]; if (tab[k] !== te[i]) return false; }
    return true;
  };
  const co = idx => idx.reduce((a, i) => a + cat[i][1], 0);
  const visita = (n, ini, act) => {
    if (act.length === n) { const c = co(act); if (mejor && c >= mejor.c) return; if (prueba(act)) mejor = { c, n: act.map(i => cat[i][0]) }; return; }
    for (let i = ini; i < M; i++) { if (mejor && co([...act, i]) >= mejor.c) continue; visita(n, i + 1, [...act, i]); }
  };
  for (const n of [1, 2, 3, 4]) visita(n, 0, []);
  return mejor;
}
console.log('\n--- dificultad (coste de la explicación más sencilla, hasta 4 ideas) ---');
const todas = G.RULES.map(r => ({ id: r.id, level: r.level, fn: r.fn }));
const res = [];
for (const r of todas) {
  const tt = TR.map(([h, c]) => r.fn(h, c) ? 1 : 0), te = TE.map(([h, c]) => r.fn(h, c) ? 1 : 0); const m = explica(tt, te);
  res.push({ id: r.id, nivel: r.level, coste: m ? m.c : null });
  console.log(r.level, String(m ? m.c : '—').padStart(2), r.id.padEnd(20), m ? m.n.join(' + ') : '(no se explica con hasta 4 ideas del catálogo)');
}
console.log('\nresumen por nivel:');
for (let n = 1; n <= 5; n++) { const c = res.filter(r => r.nivel === n).map(r => r.coste ?? 12); console.log(' nivel', n, '· mín', Math.min(...c), '· media', (c.reduce((a, b) => a + b, 0) / c.length).toFixed(1), '· máx', Math.max(...c)); }
