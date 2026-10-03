// relojes-arena/test.mjs — batería de pruebas de «Relojes de arena», todo en una pasada:  node juego/relojes-arena/test.mjs
import * as G from './game.js';

let ok = 0, ko = 0;
const t = (c, msg) => { if (c) ok++; else { ko++; console.log('  FALLO:', msg); } };
const lanza = f => { try { f(); return false; } catch (e) { return true; } };
const A = (tt, c, a) => ({ t: tt, c, a });

console.log('== 1. El original (7, 11, 15 → 24, un giro por reloj) como línea base: lo que dijo Cowork');
const orig = G.analizar([7, 11, 15], 1, 24);
{
  const com = [A(0, 0, 'arrancar'), A(0, 2, 'arrancar'), A(7, 0, 'girar'), A(14, 1, 'arrancar'), A(15, 1, 'girar'), A(16, 2, 'girar')];   // la del comentarista
  const s = G.simular([7, 11, 15], 1, com);
  t(s.ok && s.instantes.join() === '0,7,14,15,16,31', 'la solución del comentarista valida: instantes 0, 7, 14, 15, 16, 31 (' + s.instantes + ')');
  t(G.periodo(s.instantes, 24).join() === '7,31', 'su periodo de 24 minutos va del 7 al 31');
  t(orig.resuelve && orig.minAcciones === 6, 'el solver encuentra solución mínima de 6 acciones (' + orig.minAcciones + ')');
  const primera = orig.soluciones[0];
  t(JSON.stringify(primera.acciones.map(x => [x.t, x.c, x.a])) === JSON.stringify(com.map(x => [x.t, x.c, x.a])) && primera.periodo.join() === '7,31', 'la solución mínima del solver COINCIDE con la de Cowork (periodo 7..31)');
  t(orig.solMinimas === 2, 'hay exactamente 2 soluciones mínimas esencialmente distintas (' + orig.solMinimas + ')');
  const otra = orig.soluciones[1];
  t(otra.periodo.join() === '14,38' && otra.acciones.map(x => x.t + x.a[0] + [7, 11, 15][x.c]).join(' ') === '0a7 0a15 7g7 7a11 15g11 23g15', 'la otra solución: arranca 7 y 15; en 7 gira el 7 y arranca el 11; en 15 gira el 11; en 23 gira el 15; periodo 14..38');
  t(orig.minInicio === 7 && orig.minFin === 31, 'el periodo empieza como pronto en el minuto 7 y acaba en el 31');
  t(G.recetaDirecta([7, 11, 15], 24) === null, '24 no es suma ni diferencia directa de dos relojes (ni su suma 33)');
  t(G.analizar([7, 11, 15], 1, 24).hojas === 1984, 'se revisan los 1 984 calendarios posibles');
}

console.log('== 2. Reglas: lo que se rechaza');
{
  const com = [A(0, 0, 'arrancar'), A(0, 2, 'arrancar'), A(7, 0, 'girar'), A(14, 1, 'arrancar'), A(15, 1, 'girar'), A(16, 2, 'girar')];
  const mal = (acc, txt) => { const s = G.simular([7, 11, 15], 1, acc); return !s.ok && txt.test(s.error); };
  t(mal(com.concat(A(14, 0, 'girar')), /no permitida/), 'un giro de más (el 7 ya giró en el minuto 7) se rechaza');
  t(mal([A(0, 0, 'arrancar'), A(7, 0, 'girar'), A(7, 0, 'girar')], /mismo reloj/), 'dos acciones sobre el mismo reloj en el mismo minuto se rechazan');
  t(mal([A(0, 0, 'arrancar'), A(3, 1, 'arrancar')], /instante reconocible/), 'actuar en un minuto que no es reconocible (3) se rechaza');
  t(mal([A(0, 0, 'girar')], /no permitida/), 'girar un reloj que no está en marcha se rechaza');
  t(mal([A(0, 0, 'arrancar'), A(0, 0, 'arrancar')], /mismo reloj/), 'arrancar dos veces en el mismo instante se rechaza');
  t(mal([A(0, 0, 'arrancar'), A(7, 0, 'arrancar')], /no permitida/), 'arrancar un reloj ya usado se rechaza (se gira)');
  t(mal([A(0, 0, 'arrancar'), A(0, 1, 'arrancar'), A(5, 0, 'girar')], /instante reconocible/), 'girar a mitad de camino sin que se acabe ningún reloj se rechaza');
  // sin la regla (giros libres), ese giro de más sí es legal
  t(G.simular([7, 11, 15], Infinity, com.concat(A(14, 0, 'girar'))).ok, 'sin la regla, la secuencia con un giro de más sí es legal');
  t(G.simular([7, 11, 15], Infinity, [A(0, 0, 'arrancar'), A(7, 0, 'girar'), A(14, 0, 'girar')]).ok, 'sin la regla: tres giros del mismo reloj son legales');
  t(!G.simular([7, 11, 15], 1, [A(0, 0, 'arrancar'), A(7, 0, 'girar'), A(14, 0, 'girar')]).ok, 'con la regla: el mismo calendario se rechaza');
}

console.log('== 3. El puzzle NUEVO (10, 13, 16 → 18 minutos, un giro por reloj)');
const nuevo = G.analizar([10, 13, 16], 1, 18);
{
  t(nuevo.resuelve, 'tiene solución');
  t(nuevo.solMinimas === 1, 'solución ÚNICA (una sola solución mínima; el original tiene 2) (' + nuevo.solMinimas + ')');
  t(nuevo.minAcciones === 6 && nuevo.maxAccionesSol === 6, 'su solución mínima usa 6 acciones, como el original (' + nuevo.minAcciones + ')');
  t(nuevo.minInicio === 20 && nuevo.minFin === 38, 'el periodo empieza en el minuto 20 (el original: 7) y acaba en el 38 (' + nuevo.minInicio + '..' + nuevo.minFin + ')');
  t(nuevo.soluciones[0].acciones.map(x => x.t + x.a[0] + [10, 13, 16][x.c]).join(' ') === '0a10 0a16 10g10 10a13 16g13 22g16', 'la solución: arranca 10 y 16; en 10 gira el 10 y arranca el 13; en 16 gira el 13; en 22 gira el 16');
  t(G.recetaDirecta([10, 13, 16], 18) === null, '18 no es suma ni diferencia directa de dos relojes: 10+13=23, 10+16=26, 13+16=29, 16−10=6, 16−13=3, 13−10=3, ni su suma 39');
  // «receta directa»: no hay ninguna solución con menos acciones que la mínima ni solución corta (2, 3, 4 o 5 acciones)
  const cortas = G.enumerar([10, 13, 16], 1).filter(h => h.acciones.length <= 5 && G.periodo(h.instantes, 18));
  t(cortas.length === 0, 'ningún calendario de ≤ 5 acciones mide 18 minutos (' + cortas.length + ')');
  // objetivos con receta directa SÍ tienen solución corta: el detector funciona
  const dir = G.analizar([10, 13, 16], 1, 23);
  t(G.recetaDirecta([10, 13, 16], 23) === '10 + 13' && dir.minAcciones <= 4, 'contraste: 23 = 10 + 13 sí es receta directa y se resuelve con pocas acciones (' + dir.minAcciones + ')');
  t(G.recetaDirecta([1, 2, 3], 3) === 'es la duración de un reloj' && G.recetaDirecta([7, 11, 15], 33) === 'suma de todos', 'recetaDirecta: duración de un reloj y suma de todos');
  // comparación con la base: igual en acciones, mejor en soluciones y en inicio del periodo; el objetivo tampoco es receta directa
  t(nuevo.solMinimas < orig.solMinimas && nuevo.minAcciones >= orig.minAcciones && nuevo.minInicio > orig.minInicio && nuevo.minFin >= orig.minFin, 'NUEVO vs ORIGINAL: menos soluciones (1 < 2), mismas acciones (6), el periodo empieza más tarde (20 > 7) y no acaba antes (38 ≥ 31)');
  // sin la regla de un giro se hace mucho más fácil: el solver lo comprueba (más soluciones mínimas)
  t(G.analizar([10, 13, 16], Infinity, 18, { maxAcciones: 8 }).solMinimas > 100, 'sin la regla de un giro hay muchísimas soluciones (la regla es lo que lo hace difícil)');
}

console.log('== 4. Verificación independiente: simulación minuto a minuto');
{
  // Otro modo de enumerar: se avanza de MINUTO en MINUTO y solo se actúa en los minutos en que algo se acaba (o en el 0).
  function porMinutos(clocks, maxGiros, maxAcc) {
    const n = clocks.length; let hojas = 0; const sol = [];
    (function rec(estado, tmin, acciones, instantes) {
      const ops = clocks.map((D, c) => { const o = [null]; if (estado[c].s === 'nuevo') o.push('arrancar'); else if (estado[c].g < maxGiros && !(estado[c].s === 'marcha' && estado[c].top === D)) o.push('girar'); return o; });
      (function comb(c, est, hechas) {
        if (c === n) {
          if (acciones.length + hechas.length > maxAcc) return;
          const todas = acciones.concat(hechas);
          if (!est.some(e => e.s === 'marcha')) { hojas++; sol.push({ acciones: todas, instantes }); return; }
          // avanzar minuto a minuto hasta que algo se acabe
          let e2 = est.map(e => ({ ...e })), m = tmin;
          for (;;) {
            m++; let acabo = false;
            e2 = e2.map(e => { if (e.s !== 'marcha') return e; const top = e.top - 1; if (top === 0) { acabo = true; return { ...e, s: 'vacio', top: 0 }; } return { ...e, top }; });
            if (acabo) break;
          }
          rec(e2, m, todas, instantes.concat(m));
          return;
        }
        for (const o of ops[c]) {
          if (o === null) { comb(c + 1, est, hechas); continue; }
          const e2 = est.map(e => ({ ...e })), D = clocks[c], e = e2[c];
          if (o === 'arrancar') { e.s = 'marcha'; e.top = D; }
          else { e.g++; if (e.s === 'marcha') { e.top = D - e.top; if (e.top === 0) e.s = 'vacio'; } else { e.s = 'marcha'; e.top = D; } }
          comb(c + 1, e2, hechas.concat({ t: tmin, c, a: o }));
        }
      })(0, estado, []);
    })(clocks.map(() => ({ s: 'nuevo', top: 0, g: 0 })), 0, [], [0]);
    return { hojas, sol };
  }
  const casos = [[[7, 11, 15], 24, 1], [[10, 13, 16], 18, 1], [[3, 5, 8], 4, 1], [[2, 3, 5], 4, 1], [[4, 6, 7], 9, 1], [[3, 7], 5, 1], [[5, 8, 9, 12], 11, 1]];
  for (const [D, obj, g] of casos) {
    const a = G.enumerar(D, g), b = porMinutos(D, g, 2 * D.length);
    t(a.length === b.hojas, 'mismo número de calendarios que la simulación minuto a minuto, relojes ' + D.join('-') + ': ' + a.length + ' / ' + b.hojas);
    // mismas soluciones: el conjunto de (acciones, instantes) coincide
    const clave = h => h.acciones.map(x => x.t + ':' + x.c + ':' + x.a[0]).join(' ') + '|' + h.instantes.join(',');
    const sa = new Set(a.map(clave)), sb = new Set(b.sol.map(clave));
    t(sa.size === sb.size && [...sa].every(k => sb.has(k)), 'los mismos calendarios con los mismos instantes, relojes ' + D.join('-'));
  }
  // y `simular` coincide con la simulación minuto a minuto para todos los calendarios del original
  let mal = 0;
  for (const h of G.enumerar([7, 11, 15], 1)) { const s = G.simular([7, 11, 15], 1, h.acciones); if (!s.ok || s.instantes.join() !== h.instantes.join()) mal++; }
  t(mal === 0, 'simular reproduce los instantes de los 1 984 calendarios del original (' + mal + ' diferencias)');
  // soluciones mínimas por el otro método (inclusión de acciones)
  const b = porMinutos([7, 11, 15], 1, 6), sol = b.sol.filter(h => G.periodo(h.instantes, 24));
  const minimas = sol.filter(h => !sol.some(o => o.acciones.length < h.acciones.length && o.acciones.every(x => h.acciones.some(y => y.t === x.t && y.c === x.c && y.a === x.a))));
  t(minimas.length === 2, 'por el otro método, el original también tiene 2 soluciones mínimas (' + minimas.length + ')');
  const b2 = porMinutos([10, 13, 16], 1, 6), sol2 = b2.sol.filter(h => G.periodo(h.instantes, 18));
  const min2 = sol2.filter(h => !sol2.some(o => o.acciones.length < h.acciones.length && o.acciones.every(x => h.acciones.some(y => y.t === x.t && y.c === x.c && y.a === x.a))));
  t(min2.length === 1, 'por el otro método, el nuevo tiene 1 solución mínima (' + min2.length + ')');
  // la regla de un giro restringe: todo calendario válido con ella lo es también sin ella
  const libres = (D) => G.enumerar(D, Infinity, { maxAcciones: 6 });
  const claveL = new Set(libres([7, 11, 15]).map(h => h.acciones.map(x => x.t + ':' + x.c + ':' + x.a[0]).join(' ')));
  t(G.enumerar([7, 11, 15], 1).every(h => claveL.has(h.acciones.map(x => x.t + ':' + x.c + ':' + x.a[0]).join(' '))), 'los calendarios con la regla son un subconjunto de los de giros libres');
}

console.log('== 5. La partida (la que usa la página)');
{
  const P = new G.Partida(G.PUZZLES[1]);
  t(P.enInstante && P.tiempo === 0 && P.proximo === null, 'al empezar: minuto 0, ningún reloj en marcha');
  t(lanza(() => P.accion(0, 'girar')), 'no se puede girar un reloj sin arrancar');
  P.accion(0, 'arrancar'); P.accion(2, 'arrancar');
  t(P.proximo === 10 && P.vista()[0].st === 1 && P.vista()[1].st === 0, 'tras arrancar el 10 y el 16, el próximo instante es el 10');
  t(!P.correr(3) && !P.enInstante && P.tiempo === 3, 'a los 3 minutos no hay instante: se sigue corriendo');
  t(lanza(() => P.accion(1, 'arrancar')) && /instante reconocible/.test(P.motivoNo(1, 'arrancar')), 'a mitad de camino no se puede actuar, y lo explica');
  t(Math.abs(P.vista()[0].top - 7) < 1e-9 && Math.abs(P.vista()[0].bajo - 3) < 1e-9, 'a los 3 minutos al reloj de 10 le quedan 7 arriba y han caído 3');
  t(P.correr(7) && P.enInstante && P.tiempo === 10 && P.corriendo === false, 'al llegar al minuto 10 el reloj SE DETIENE (autopausa) y estamos en un instante');
  t(P.log[P.log.length - 1].texto === 'Se acaba la arena del reloj de 10.', 'queda anotado en el registro');
  P.accion(0, 'girar'); P.accion(1, 'arrancar');
  t(lanza(() => P.accion(0, 'girar')) && /Regla del puzzle/.test(P.motivoNo(0, 'girar')), 'segundo giro del 10: rechazado con la regla explicada');
  t(P.saltar() && P.tiempo === 16, 'saltar lleva hasta el siguiente instante (minuto 16)');
  P.accion(1, 'girar');
  t(P.saltar() && P.tiempo === 20 && P.saltar() && P.tiempo === 22, 'se llega a los minutos 20 y 22');
  P.accion(2, 'girar'); t(P.saltar() && P.tiempo === 38 && P.proximo === null, 'y al 38; ya no corre nada');
  t(lanza(() => P.marcar('inicio', 7)), 'no se puede marcar un instante que no ha ocurrido');
  P.marcar('inicio', 20); P.marcar('fin', 38);
  const m = P.medida(); t(m.ok && m.dur === 18 && m.acciones === 6, 'medida: 18 minutos, correcto, con 6 acciones');
  P.marcar('inicio', 22); t(P.medida().dur === 16 && !P.medida().ok, 'otra pareja de instantes: 16 minutos, no vale');
  P.reiniciar(); t(P.log.length === 1 && P.medida() === null && P.acciones.length === 0, 'reiniciar lo deja como al principio');
  // correr con pasos pequeños llega exactamente a los mismos instantes que saltar
  const Q = new G.Partida(G.PUZZLES[0]); Q.accion(0, 'arrancar'); Q.accion(2, 'arrancar');
  let n = 0; while (!Q.correr(0.01) && n++ < 100000) { /* avanza */ }
  t(Q.tiempo === 7 && Q.enInstante, 'a pasos de 0,01 minutos llega EXACTAMENTE al minuto 7 (' + Q.tiempo + ')');
  // sin la regla de giros (variante): se puede girar más de una vez
  const L = new G.Partida({ ...G.PUZZLES[0], maxGiros: Infinity }); L.accion(0, 'arrancar'); L.saltar(); L.accion(0, 'girar'); L.saltar(); L.accion(0, 'girar');
  t(L.vista()[0].giros === 2, 'variante sin la regla: dos giros del mismo reloj');
  // reproducir las soluciones de los dos puzzles con la partida
  for (const p of G.PUZZLES) {
    const R = new G.Partida(p), sol = G.solucionDe(p); let k = 0;
    for (let paso = 0; paso < 30; paso++) { while (k < sol.acciones.length && sol.acciones[k].t === R.S.t && R.enInstante) { R.accion(sol.acciones[k].c, sol.acciones[k].a); k++; } if (!R.saltar()) break; }
    R.marcar('inicio', sol.periodo[0]); R.marcar('fin', sol.periodo[1]);
    t(k === sol.acciones.length && R.medida().ok, 'la partida reproduce la solución de «' + p.id + '» y mide ' + p.objetivo + ' minutos');
  }
}

console.log('== 6. Textos: narración y pistas');
{
  for (const p of G.PUZZLES) {
    const s = G.solucionDe(p), nar = G.narrar(p.clocks, p.maxGiros, s.acciones, p.objetivo), todo = nar.map(x => x.texto).join(' ');
    t(nar.length > 6 && /El periodo va del minuto/.test(nar[nar.length - 1].texto), 'narración de «' + p.id + '»: pasos y conclusión');
    t(nar[nar.length - 1].texto.includes(s.periodo[0] + ' al minuto ' + s.periodo[1]), 'la conclusión de «' + p.id + '» da el periodo ' + s.periodo.join('..'));
    t(!/ 1 minutos/.test(todo), 'plural correcto («1 minuto»)');
    t(p.pistas.length === 4, 'cuatro pistas escalonadas en «' + p.id + '»');
    t(p.pistas[3].includes('minuto ' + s.periodo[0]) || p.pistas[3].includes('minuto ' + s.periodo[1]), 'la última pista de «' + p.id + '» nombra el periodo real');
  }
  t(G.PUZZLES[0].clocks.join() === '7,11,15' && G.PUZZLES[0].objetivo === 24 && G.PUZZLES[1].clocks.join() !== G.PUZZLES[0].clocks.join() && G.PUZZLES[1].objetivo !== 24, 'el nuevo tiene otras duraciones y otro objetivo (no es copia del de Junio)');
}

console.log('\nRESULTADO: ' + ok + ' ok, ' + ko + ' fallos');
process.exit(ko ? 1 : 0);
