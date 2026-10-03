// langford/test.mjs — batería de pruebas de la lógica del Solitario de Langford, todo en una pasada:  node juego/langford/test.mjs
import * as G from './game.js';

let ok = 0, ko = 0;
const t = (c, msg) => { if (c) ok++; else { ko++; console.log('  FALLO:', msg); } };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }

console.log('== 1. Recuentos de soluciones, n = 1 a 9 (criterio de aceptación)');
for (let n = 1; n <= 9; n++) t(G.countSolutions(n) === G.COUNTS_ESPERADOS[n], 'n=' + n + ': ' + G.COUNTS_ESPERADOS[n] + ' soluciones (' + G.countSolutions(n) + ')');
t(G.distinctCount(3) === 1 && G.distinctCount(4) === 1 && G.distinctCount(7) === 26 && G.distinctCount(8) === 150, 'sin contar el reverso: 1, 1, 26 y 150');
for (const n of [3, 4, 7, 8]) {
  const sols = G.solve(n), claves = new Set(sols.map(s => s.join(' ')));
  t(claves.size === sols.length, 'n=' + n + ': todas las soluciones son distintas');
  t(sols.every(s => G.isSolution(s, n)), 'n=' + n + ': todas cumplen la regla');
  t(sols.every(s => claves.has(G.reverseOf(s).join(' '))), 'n=' + n + ': el reverso de cada solución también es solución');
  t(sols.every(s => s.join(' ') !== G.reverseOf(s).join(' ')), 'n=' + n + ': ninguna solución es capicúa (por eso son exactamente la mitad)');
}
t(G.solve(3).some(s => s.join(' ') === '3 1 2 1 3 2'), 'ejemplo n=3: 3 1 2 1 3 2');
t(G.solve(4).some(s => s.join(' ') === '4 1 3 1 2 4 3 2'), 'ejemplo n=4: 4 1 3 1 2 4 3 2');
t(G.solve(7).some(s => s.join(' ') === '7 3 6 2 5 3 2 4 7 6 5 1 4 1'), 'ejemplo n=7: 7 3 6 2 5 3 2 4 7 6 5 1 4 1');
t(G.solve(8).some(s => s.join(' ') === '8 3 7 2 6 3 2 4 5 8 7 6 4 1 5 1'), 'ejemplo n=8: 8 3 7 2 6 3 2 4 5 8 7 6 4 1 5 1');
t([1, 2, 3, 4, 5, 6, 7, 8, 9].every(n => (G.countSolutions(n) > 0) === G.hayRazon(n)), 'hay solución si y solo si n ≡ 0 o 3 (mod 4), para n = 1..9');

console.log('== 2. Dos comprobaciones independientes del recuento');
{
  // (a) otro orden de búsqueda: se rellena de izquierda a derecha, cada hueco libre abre una pareja nueva o es el cierre forzado de una abierta
  function izquierdaDerecha(n) {
    const len = 2 * n, a = new Array(len).fill(0), usado = new Array(n + 1).fill(false); let cuenta = 0;
    (function rec(i) {
      while (i < len && a[i] !== 0) i++;
      if (i === len) { cuenta++; return; }
      for (let k = 1; k <= n; k++) if (!usado[k] && i + k + 1 < len && a[i + k + 1] === 0) {
        usado[k] = true; a[i] = a[i + k + 1] = k; rec(i + 1); a[i] = a[i + k + 1] = 0; usado[k] = false;
      }
    })(0);
    return cuenta;
  }
  for (let n = 1; n <= 9; n++) t(izquierdaDerecha(n) === G.COUNTS_ESPERADOS[n], 'búsqueda de izquierda a derecha, n=' + n + ': ' + izquierdaDerecha(n));
  // (b) fuerza bruta SIN poda: todas las colocaciones de las 2n cartas (con las dos de cada valor idénticas), n = 1..6
  function bruta(n) {
    const len = 2 * n, a = new Array(len).fill(0), resta = new Array(n + 1).fill(2); let cuenta = 0;
    (function rec(i) {
      if (i === len) { if (G.isSolution(a, n)) cuenta++; return; }
      for (let k = 1; k <= n; k++) if (resta[k] > 0) { resta[k]--; a[i] = k; rec(i + 1); a[i] = 0; resta[k]++; }
    })(0);
    return cuenta;
  }
  for (let n = 1; n <= 6; n++) t(bruta(n) === G.COUNTS_ESPERADOS[n], 'fuerza bruta sin poda, n=' + n + ': ' + bruta(n));
}

console.log('== 3. Colocar, quitar, mover y estado de las parejas');
{
  const n = 4; let a = G.emptyBoard(n);
  t(a.length === 8 && a.every(v => v === 0), 'tablero vacío de 2n huecos');
  t(JSON.stringify(G.remaining(a, n)) === '{"1":2,"2":2,"3":2,"4":2}', 'al empezar quedan dos cartas de cada valor');
  const b = G.place(a, n, 2, 3);
  t(a[2] === 0 && b[2] === 3, 'place no muta el tablero anterior');
  t(G.remaining(b, n)[3] === 1, 'queda una carta del 3');
  t(G.legalSlots(b, n, 3).join() === '6', 'el 3 en el hueco 2: su pareja solo puede ir al 6 (el −2 no existe)');
  t(G.legalSlots(G.place(b, n, 6, 1), n, 3).join() === '' , 'si el hueco está ocupado, no es legal');
  t(G.legalSlots(G.emptyBoard(n), n, 3).join() === '', 'sin ninguna colocada no hay huecos legales');
  const c = G.place(b, n, 6, 3);
  t(G.pairStatus(c, n)[3] === 'ok' && G.pairStatus(c, n)[1] === 'vacio' && G.pairStatus(G.place(a, n, 0, 2), n)[2] === 'abierta', 'estados: ok, vacío, abierta');
  t(G.pairStatus(G.place(b, n, 3, 3), n)[3] === 'mal', 'dos 3 seguidos: mal');
  let lanza = (f) => { try { f(); return false; } catch (e) { return true; } };
  t(lanza(() => G.place(b, n, 2, 1)), 'no se puede colocar sobre un hueco ocupado');
  t(lanza(() => G.place(c, n, 0, 3)), 'no quedan más cartas de ese valor');
  t(lanza(() => G.place(a, n, 8, 1)) && lanza(() => G.place(a, n, -1, 1)), 'hueco fuera del tablero');
  t(lanza(() => G.place(a, n, 0, 5)) && lanza(() => G.place(a, n, 0, 0)), 'valor fuera de 1..n');
  t(lanza(() => G.removeAt(a, 0)), 'no se puede quitar de un hueco vacío');
  const d = G.move(c, n, 6, 7);
  t(d[6] === 0 && d[7] === 3 && c[6] === 3, 'move cambia de hueco y no muta');
  t(G.removeAt(d, 7)[7] === 0, 'removeAt');
}

console.log('== 4. La pista del solucionador');
{
  t(G.hint(G.emptyBoard(5), 5).tipo === 'sin-solucion' && G.hint(G.emptyBoard(6), 6).tipo === 'sin-solucion', 'n=5 y n=6: «no hay solución»');
  let malPoner = 0, noLlega = 0, casos = 0, conflictosMal = 0, conflictos = 0, extrasPoner = 0;
  const rng = mulberry(31);
  for (const n of [3, 4, 7, 8]) {
    const sols = G.solve(n), len = 2 * n;
    const intentos = n <= 4 ? sols.length * (1 << len) : 120;
    for (let w = 0; w < intentos; w++) {
      let s, mascara;
      if (n <= 4) { s = sols[Math.floor(w / (1 << len))]; mascara = w % (1 << len); }
      else { s = sols[Math.floor(rng() * sols.length)]; mascara = Math.floor(rng() * (1 << len)); }
      // colocación parcial sacada de una solución (siempre compatible)
      let a = s.map((v, i) => (mascara >> i & 1) ? v : 0);
      let pasos = 0;
      for (;;) {
        const h = G.hint(a, n); casos++;
        if (h.tipo === 'completa') { if (!G.isSolution(a, n)) noLlega++; break; }
        if (h.tipo !== 'poner') { malPoner++; break; }
        if (a[h.hueco] !== 0 || G.remaining(a, n)[h.k] < 1 || G.compatible(G.place(a, n, h.hueco, h.k), n).length === 0 || h.soluciones < 1) { malPoner++; break; }
        a = G.place(a, n, h.hueco, h.k); pasos++;
        if (pasos > len) { noLlega++; break; }
      }
    }
    // colocaciones con un error: se pone una carta fuera de lugar y la pista debe avisar de que no lleva a ninguna solución
    for (let w = 0; w < 80; w++) {
      const s = sols[Math.floor(rng() * sols.length)]; let a = G.emptyBoard(n);
      for (let i = 0; i < len; i++) if (rng() < 0.5) a[i] = s[i];
      const vacios = a.map((v, i) => v === 0 ? i : -1).filter(i => i >= 0); if (!vacios.length) continue;
      const hueco = vacios[Math.floor(rng() * vacios.length)], k = 1 + Math.floor(rng() * n);
      if (G.remaining(a, n)[k] < 1) continue;
      const b = G.place(a, n, hueco, k);
      if (G.compatible(b, n).length) { const h = G.hint(b, n); if (h.tipo === 'conflicto') extrasPoner++; continue; }
      conflictos++;
      const h = G.hint(b, n);
      if (h.tipo !== 'conflicto') { conflictosMal++; continue; }
      // cada hueco que sugiere quitar, quitado, deja un tablero con solución; y se ha sugerido alguno si existe alguno
      const todos = b.map((v, i) => v ? i : -1).filter(i => i >= 0).filter(i => G.compatible(G.removeAt(b, i), n).length);
      if (h.quitar.join() !== todos.join()) conflictosMal++;
    }
  }
  t(malPoner === 0, 'la pista siempre propone una carta que sigue llevando a alguna solución (' + malPoner + ' fallos en ' + casos + ' consultas)');
  t(noLlega === 0, 'siguiendo las pistas se llega siempre a una solución en ≤ 2n pasos (' + noLlega + ' fallos)');
  t(conflictos > 50 && conflictosMal === 0 && extrasPoner === 0, 'con una colocación que no lleva a ninguna solución, avisa de conflicto y dice qué quitar (' + conflictos + ' casos, ' + conflictosMal + ' fallos)');
  t(G.hint(G.solve(3)[0], 3).tipo === 'completa', 'un tablero resuelto: «completa»');
}

console.log('== 5. Validación de una colocación completa');
{
  const bien = [3, 1, 2, 1, 3, 2];
  t(G.isSolution(bien, 3), '3 1 2 1 3 2 es solución');
  t(!G.isSolution([3, 1, 2, 1, 2, 3], 3) && !G.isSolution([1, 1, 2, 2, 3, 3], 3), 'colocaciones incorrectas no lo son');
  t(!G.isSolution([3, 1, 2, 1, 3, 0], 3) && !G.isSolution([3, 1, 2, 1, 3], 3), 'incompleta o de otro tamaño: no');
  t(G.canon(bien) === G.canon(G.reverseOf(bien)), 'canon: una solución y su reverso son la misma');
  // para todas las colocaciones completas de n=3 (90), isSolution coincide con la lista del solucionador
  let mal = 0, total = 0; const sols = new Set(G.solve(3).map(s => s.join(' '))), resta = [0, 2, 2, 2], a = new Array(6).fill(0);
  (function rec(i) { if (i === 6) { total++; if (G.isSolution(a, 3) !== sols.has(a.join(' '))) mal++; return; } for (let k = 1; k <= 3; k++) if (resta[k]) { resta[k]--; a[i] = k; rec(i + 1); a[i] = 0; resta[k]++; } })(0);
  t(total === 90 && mal === 0, 'las 90 colocaciones de n=3: isSolution = solucionador (' + total + ' colocaciones, ' + mal + ' diferencias)');
}

console.log('\nRESULTADO: ' + ok + ' ok, ' + ko + ' fallos');
process.exit(ko ? 1 : 0);
