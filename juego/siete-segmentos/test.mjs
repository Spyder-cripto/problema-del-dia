// siete-segmentos/test.mjs — batería de pruebas de «Siete segmentos», todo en una pasada:  node juego/siete-segmentos/test.mjs
// Recalcula cada reto desde cero (sin fiarse de los datos escritos) y comprueba la lógica de respuestas y de palillos.
import * as G from './game.js';

let ok = 0, ko = 0;
const t = (c, msg) => { if (c) ok++; else { ko++; console.log('  FALLO:', msg); } };
const P = G.PUZZLES, byId = id => P.find(p => p.id === id);
const terms = p => p.tokens.filter(x => x !== '?').concat(+p.answer);   // los términos de la serie con la respuesta al final
const segSet = d => new Set(G.SEGS[d]);
const union = (a, b) => [...new Set([...G.SEGS[a], ...G.SEGS[b]])].sort().join('');
const xorCount = (a, b) => { const A = segSet(a), B = segSet(b); let n = 0; for (const l of G.LETRAS) if (A.has(l) !== B.has(l)) n++; return n; };

console.log('== 1. Los dígitos');
t(G.segCount(8) === 7 && G.segCount(1) === 2 && G.segCount(7) === 3 && G.segCount(6) === 6 && G.segCount(9) === 6, 'recuentos básicos: 8→7, 1→2, 7→3, 6→6, 9→6');
t([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(G.segCount).join() === '6,2,5,5,4,5,6,3,7,6', 'tabla completa 0-9: 6,2,5,5,4,5,6,3,7,6');
t(new Set(Object.values(G.SEGS)).size === 10, 'los diez dígitos tienen dibujos distintos');
t(G.segCount(5040) === 21 && G.segCount(100) === 14, 'recuento de números de varias cifras (5040→21, 100→14)');

console.log('== 2. Estructura de los datos');
t(new Set(P.map(p => p.id)).size === P.length, 'ids únicos');
t(G.LEVELS.every((_, l) => G.byLevel(l).length >= 6), 'cada nivel tiene al menos 6 retos (' + G.LEVELS.map((_, l) => G.byLevel(l).length) + ')');
for (const p of P) {
  t(p.hints.length === 3, p.id + ': tiene 3 pistas');
  t(p.title && p.prompt && p.why, p.id + ': tiene título, enunciado y explicación');
  if (p.kind === 'match') t(p.k >= 1 && p.eq.length === 4 && p.sol.length === 4, p.id + ': igualdad bien formada');
  else t(/^\d+$/.test(p.answer), p.id + ': la respuesta son cifras');
  if (p.kind === 'series') t(p.tokens[p.tokens.length - 1] === '?', p.id + ': la serie acaba en «?»');
}

console.log('== 3. Series de totales: los términos son los segmentos de la sucesión base');
for (const p of P.filter(p => p.totals)) {
  const calc = p.base.map(G.segCount);
  t(terms(p).join() === calc.join(), `${p.id} (${p.title}): ${terms(p)} = segmentos de ${p.base}`);
}
{
  const m5 = byId('m5'), m2 = byId('m2');
  t(terms(m5).join() === m5.base.map(n => 7 - G.segCount(n)).join(), 'm5: segmentos apagados de 0-9');
  let run = 0;
  t(terms(m2).join() === m2.base.map(n => (run += G.segCount(n))).join(), 'm2: suma acumulada de los segmentos de 1-7');
  t(byId('d3').base.every((n, i) => n === 2 ** i), 'd3: la base son potencias de 2');
  t(byId('d4').base.every((n, i, a) => i < 2 ? n === 1 : n === a[i - 1] + a[i - 2]), 'd4: la base es Fibonacci');
  t(byId('d6').base.every((n, i) => n === 7 * (i + 1)), 'd6: la base son múltiplos de 7');
  t(byId('e2').base.every((n, i) => n === [1, 2, 6, 24, 120, 720, 5040][i]), 'e2: la base son factoriales');
  const primo = n => n > 1 && [...Array(n).keys()].slice(2).every(d => n % d);
  const e3 = byId('e3').base; t(e3.every(primo) && e3.length === 10 && e3[9] === 29, 'e3: los diez primeros primos');
  t(byId('e4').base.every((n, i, a) => i === 0 || n === (a[i - 1] % 2 ? 3 * a[i - 1] + 1 : a[i - 1] / 2)), 'e4: la base sigue la regla de Collatz');
  t(byId('e5').base.every((n, i) => n === (i + 1) * (i + 2) / 2), 'e5: la base son triangulares');
  t(byId('e7').base.every((n, i) => n === (i + 1) ** 2), 'e7: la base son cuadrados');
}

console.log('== 4. Series de dígitos: la respuesta es la única posible');
for (const [id, paso] of [['f1', 1], ['f5', -1]]) {
  const p = byId(id), c = terms(p).map(G.segCount);
  t(c.every((x, i) => i === 0 || x - c[i - 1] === paso), `${id}: los segmentos van de ${paso > 0 ? 'uno en uno hacia arriba' : 'uno en uno hacia abajo'} (${c})`);
  const cands = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => G.segCount(d) === c[c.length - 1]);
  t(cands.join() === p.answer, `${id}: solo un dígito tiene ${c[c.length - 1]} segmentos (${cands})`);
}
{
  const p = byId('f2'), cnt = d => p.tokens.filter(x => G.segCount(x) === G.segCount(d)).length;
  const intrusos = [...new Set(p.tokens)].filter(d => cnt(d) === 1);
  t(intrusos.join() === p.answer, 'f2: el único dígito con un recuento distinto es el ' + intrusos);
}
{
  const p = byId('m1'), s = terms(p);
  t(s.every((d, i) => i === 0 || xorCount(s[i - 1], d) === 1), 'm1: cada paso cambia exactamente un segmento');
  const previos = s.slice(0, -1), ult = previos[previos.length - 1];
  const opciones = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => xorCount(ult, d) === 1 && !previos.includes(d));
  t(opciones.join() === p.answer, 'm1: desde el 8, sin repetir, solo queda el ' + opciones);
  t(Object.keys(p.alt).every(k => previos.includes(+k) && xorCount(ult, +k) === 1), 'm1: los mensajes «casi» son los dígitos a un paso ya usados');
}
{
  const p = byId('d1');
  for (const r of p.rows.slice(0, -1)) t(union(r[0], r[2]) === G.SEGS[r[4]], `d1: ${r[0]} + ${r[2]} = ${r[4]} al superponer`);
  const [a, , , , c] = p.rows[p.rows.length - 1];
  const sirven = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => union(a, d) === G.SEGS[c]).sort((x, y) => G.segCount(x) - G.segCount(y));
  t(String(sirven[0]) === p.answer && G.segCount(sirven[0]) < G.segCount(sirven[1]), 'd1: el que menos segmentos usa es el ' + sirven[0] + ' (sirven ' + sirven + ')');
  t(Object.keys(p.alt).every(k => sirven.includes(+k)), 'd1: los mensajes «casi» son respuestas que también completan el 8');
}
{
  const c = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => xorCount(d, (d + 1) % 10));
  t(terms(byId('d2')).join() === c.join(), 'd2: segmentos que cambian al contar 0→1…9→0 (' + c + ')');
}
{
  // el mayor número que se escribe con exactamente n segmentos (programación dinámica)
  const mejor = [''];
  for (let n = 1; n <= 12; n++) {
    let m = null;
    for (let d = 0; d <= 9; d++) {
      const s = G.segCount(d); if (s > n || mejor[n - s] == null) continue;
      const cand = String(d) + mejor[n - s];
      if (cand.length > 1 && cand[0] === '0') continue;
      if (m == null || cand.length > m.length || (cand.length === m.length && cand > m)) m = cand;
    }
    mejor[n] = m;
  }
  const p = byId('e1');
  t(terms(p).map(String).join() === mejor.slice(2, 2 + terms(p).length).join(), 'e1: son los mayores números con 2, 3… 9 segmentos (' + mejor.slice(2, 10) + ')');
}

console.log('== 5. Igualdades de palillos: solución única y con el número exacto de movimientos');
for (const p of P.filter(p => p.kind === 'match')) {
  const q0 = G.eqObj(p.eq), qs = G.eqObj(p.sol);
  t(!G.truthy(q0), `${p.id}: ${G.showEq(q0)} es falsa al principio`);
  t(G.truthy(qs), `${p.id}: la solución ${G.showEq(qs)} es cierta`);
  for (let m = 1; m < p.k; m++) t(G.solucionesPalillos(p.eq, m).length === 0, `${p.id}: no se resuelve con ${m} movimiento(s)`);
  const sols = G.solucionesPalillos(p.eq, p.k);
  t(sols.length === 1 && G.showEq(sols[0]) === G.showEq(qs), `${p.id}: con ${p.k} movimiento(s) la única solución es ${G.showEq(qs)} (${sols.map(G.showEq).join(' | ')})`);
  const d = G.diff(G.eqState(p.eq), G.eqState(p.sol));
  t(d.add === p.k && d.rem === p.k, `${p.id}: la solución quita ${p.k} y pone ${p.k}`);
}
{
  let ida = 0;
  for (let a = 0; a <= 9; a++) for (const op of ['+', '-']) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
    const q = G.decode(G.eqState([a, op, b, c]));
    if (q && q.a === a && q.op === op && q.b === b && q.c === c) ida++;
  }
  t(ida === 2000, 'decode(eqState(x)) devuelve x en las 2 000 igualdades posibles (' + ida + ')');
  const s = G.eqState([1, '+', 1, 3]); s.delete('1:h');
  t(G.decode(s) === null, 'sin barra horizontal el signo no es válido');
  const s2 = G.eqState([1, '+', 1, 3]); s2.delete('3:a');
  t(G.decode(s2) === null, 'un dígito a medias no se lee');
}

console.log('== 6. Comprobación de respuestas');
{
  const p = byId('d3');
  t(G.comprobarRespuesta(p, '16').ok, 'd3: 16 es correcto');
  t(G.comprobarRespuesta(p, '').tipo === 'info', 'respuesta vacía: aviso, no fallo');
  t(/número de la sucesión/.test(G.comprobarRespuesta(p, '256').msg), 'd3: escribir 256 avisa de que se piden los segmentos');
  t(G.comprobarRespuesta(p, '15').tipo === 'mal', 'd3: 15 es un fallo');
  t(G.comprobarRespuesta(byId('d1'), '9').msg === byId('d1').alt['9'], 'd1: el 9 da su mensaje de «casi»');
  t(G.comprobarRespuesta(byId('m1'), '6').msg === byId('m1').alt['6'], 'm1: el 6 da su mensaje de «casi»');
  t(G.comprobarRespuesta(byId('e7'), '12').msg === byId('e7').alt['12'], 'e7: el 12 da su mensaje de «casi»');
  const msgs = new Set([0, 1, 2].map(i => G.comprobarRespuesta(p, '15', i).msg));
  t(msgs.size === 3, 'los fallos genéricos van variando');
  for (const q of P.filter(q => q.kind !== 'match')) t(G.comprobarRespuesta(q, q.answer).ok, q.id + ': su respuesta se acepta');
}
{
  const p = byId('e6'), on = G.eqState(p.eq);
  t(G.comprobarPalillos(p, on).tipo === 'info', 'e6: sin mover nada es un aviso');
  on.add('0:g');
  t(/de más/.test(G.comprobarPalillos(p, on).msg), 'e6: encender sin quitar avisa de que sobra un segmento');
  on.delete('0:g'); on.delete('0:e');
  t(/sin colocarlo/.test(G.comprobarPalillos(p, on).msg), 'e6: quitar sin poner avisa');
  t(G.comprobarPalillos(p, G.eqState(p.sol)).ok, 'e6: la solución se acepta');
  const f4 = byId('f4'), x = G.eqState(f4.eq); x.delete('3:c'); x.add('0:f');
  t(/no forma un dígito/.test(G.comprobarPalillos(f4, x).msg), 'f4: dejar símbolos rotos se rechaza');
  const y = G.eqState(f4.eq); y.delete('3:b'); y.add('3:f');   // 1 + 1 = 5: legible, pero falsa
  t(/Se lee 1 \+ 1 = 5/.test(G.comprobarPalillos(f4, y).msg), 'f4: una igualdad falsa dice cómo se lee');
  for (const q of P.filter(q => q.kind === 'match')) t(G.comprobarPalillos(q, G.eqState(q.sol)).ok, q.id + ': su solución se acepta');
}
{
  t(G.starsFor(0) === 3 && G.starsFor(1) === 2 && G.starsFor(2) === 2 && G.starsFor(3) === 1, 'estrellas: 3 sin pistas, 2 con 1-2, 1 con 3');
}

console.log(`\n${ok} pruebas correctas, ${ko} fallos`);
if (ko) process.exit(1);
