// eleusis/test.mjs — batería de pruebas de la lógica de Eleusis, todo en una pasada:  node juego/eleusis/test.mjs
import * as G from './game.js';
import crypto from 'node:crypto';

let ok = 0, ko = 0; const avisos = [];
const t = (c, msg) => { if (c) ok++; else { ko++; console.log('  FALLO:', msg); } };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const rule = id => G.RULES.find(r => r.id === id);
let uid = 5000;
const C = (v, s) => ({ id: uid++, v, s });
// ronda a medida: mano y línea principal fijadas a mano, mazo completo aparte (para que se pueda robar)
function mk(ruleId, hand, main, opts = {}) {
  const S = G.newRound(rule(ruleId), mulberry(opts.seed || 7), !!opts.hint);
  S.hand = hand.map(([v, s]) => C(v, s)); G.sortHand(S);
  S.main = main.map(([v, s]) => C(v, s)); S.main[0].start = true; S.side = S.main.map(() => []);
  S.placed = opts.placed ?? S.main.length; S.sel = [];
  return S;
}
const sel = (S, idx) => { S.sel = idx.map(i => S.hand[i].id); };
// selecciona por (valor, palo): la mano se ordena por valor, así que no se puede elegir por posición
const selC = (S, specs) => { S.sel = specs.map(([v, s]) => { const c = S.hand.find(x => x.v === v && x.s === s && !S.sel.includes(x.id)); if (!c) throw new Error('carta no está en la mano: ' + v + '-' + s); return c.id; }); };

console.log('== 1. Las 16 reglas: cuántas, niveles, textos intactos');
t(G.RULES.length === 16, 'debe haber 16 reglas');
t(G.RULES.filter(r => r.level === 1).length === 6 && G.RULES.filter(r => r.level === 2).length === 6 && G.RULES.filter(r => r.level === 3).length === 4, 'reparto de niveles 6/6/4');
t(new Set(G.RULES.map(r => r.id)).size === 16, 'ids únicos');
const huella = crypto.createHash('sha1').update(G.RULES.map(r => r.id + '|' + r.level + '|' + r.text + '|' + r.hint).join('\n')).digest('hex').slice(0, 12);
t(huella === '2457d9ca0fb8', 'los textos/pistas de las reglas han cambiado (huella ' + huella + ')');

console.log('== 2. Invariante: tras CUALQUIER historial existe al menos una carta válida (y una no válida)');
{
  // las reglas solo miran las dos últimas cartas de la línea y su longitud (mod 4); se barre todo eso
  const cartas = []; for (let s = 0; s < 4; s++) for (let v = 1; v <= 13; v++) cartas.push({ v, s });
  let sinValida = 0, sinInvalida = 0, casos = 0;
  for (const r of G.RULES) {
    const hist = [];
    for (const a of cartas) hist.push([a]);
    for (const L of [2, 3, 4, 5]) for (const p of cartas) for (const l of cartas) hist.push([...Array.from({ length: L - 2 }, () => ({ v: 1, s: 0 })), p, l]);
    for (const h of hist) {
      casos++;
      let v = 0, n = 0; for (const c of cartas) { if (r.fn(h, c)) v++; else n++; }
      if (v === 0) { sinValida++; console.log('  sin carta válida:', r.id, h.length); }
      if (n === 0) sinInvalida++;
    }
  }
  t(sinValida === 0, 'hay historiales sin ninguna carta válida: ' + sinValida);
  if (sinInvalida) avisos.push('historiales donde todas las cartas serían válidas: ' + sinInvalida);
  console.log('  historiales barridos:', casos, '· sin válida:', sinValida, '· sin inválida:', sinInvalida);
}

console.log('== 3. Ronda nueva y mazo');
{
  const S = G.newRound(rule('only-odd'), mulberry(1));
  t(S.hand.length === 14 && S.deck.length === 104 - 1 - 14 && S.main.length === 1 && S.main[0].start === true, 'ronda: 14 en mano, mazo 89, carta inicial marcada');
  const todas = [...S.deck, ...S.hand, ...S.main];
  t(todas.length === 104 && new Set(todas.map(c => c.id)).size === 104, '104 cartas distintas');
  const cnt = {}; todas.forEach(c => { const k = c.v + '-' + c.s; cnt[k] = (cnt[k] || 0) + 1; });
  t(Object.keys(cnt).length === 52 && Object.values(cnt).every(x => x === 2), 'doble baraja: cada carta dos veces');
  for (const lvl of [0, 1, 2, 3]) for (let i = 0; i < 40; i++) { const r = G.pickRule(lvl, 'only-odd', mulberry(i)); t(r.id !== 'only-odd' && (lvl === 0 || r.level === lvl), 'pickRule nivel ' + lvl); }
  t(G.pickRule(1, null, () => 0.99).level === 1, 'pickRule sin anterior');
}

console.log('== 4. Cadenas: una que falla hace fallar a todas y se roba el doble');
{
  // only-odd: valen las cartas de valor impar
  let S = mk('only-odd', [[3, 0], [5, 1], [7, 2], [4, 3], [9, 0], [2, 1]], [[1, 0]]);
  selC(S, [[3, 0]]); let r = G.playSelection(S);
  t(r.type === 'ok' && r.n === 1 && S.main.length === 2 && S.hand.length === 5, 'carta válida: va a la línea principal');
  S = mk('only-odd', [[3, 0], [4, 1], [7, 2], [9, 3], [2, 1], [6, 0]], [[1, 0]]);
  const antes = S.hand.length, mainAntes = S.main.length;
  selC(S, [[3, 0], [4, 1], [7, 2]]);   // 3 (v), 4 (no), 7 (v): falla toda la cadena
  r = G.playSelection(S);
  t(r.type === 'bad' && r.n === 3 && r.pen === 6, 'cadena con una mala: incorrecta y castigo doble');
  t(S.main.length === mainAntes, 'la línea principal no cambia');
  t(S.side[S.side.length - 1].length === 1 && S.side[S.side.length - 1][0].length === 3, 'las 3 cartas cuelgan de la última correcta como un grupo');
  t(S.hand.length === antes - 3 + 6, 'mano: -3 jugadas +6 de castigo');
  t(S.side[0][0].every(c => c.wrong === true), 'las cartas quedan marcadas como incorrectas');
  S = mk('only-odd', [[3, 0], [5, 1], [7, 2], [9, 3], [2, 1]], [[1, 0]]);
  selC(S, [[7, 2], [3, 0], [5, 1], [9, 3]]); const orden = S.sel.map(id => S.hand.find(c => c.id === id));
  r = G.playSelection(S);
  t(r.type === 'ok' && r.n === 4 && S.main.slice(1).map(c => c.id).join() === orden.map(c => c.id).join(), 'cadena de 4 correcta: entra en el orden elegido');
  // cada carta se juzga contra la línea + las anteriores de la cadena: alt-color desde una roja
  S = mk('alt-color', [[2, 0], [3, 2], [4, 1], [5, 1]], [[9, 2]]);
  selC(S, [[2, 0], [3, 2], [4, 1]]);   // negra, roja, negra tras roja inicial: válida
  t(G.playSelection(S).type === 'ok', 'alt-color: cadena que alterna es válida');
  S = mk('alt-color', [[2, 0], [3, 1], [4, 0]], [[9, 2]]);
  selC(S, [[2, 0], [3, 1]]);      // negra, negra: la segunda falla
  t(G.playSelection(S).type === 'bad', 'alt-color: la segunda carta se juzga contra la primera de la cadena');
  // máximo 4 cartas seleccionables
  S = mk('only-odd', [[1, 0], [3, 0], [5, 0], [7, 0], [9, 0]], [[1, 1]]);
  S.hand.forEach(c => G.toggleSel(S, c.id)); t(S.sel.length === 4, 'no se pueden seleccionar más de 4');
  const id0 = S.sel[0]; G.toggleSel(S, id0); t(S.sel.length === 3 && !S.sel.includes(id0), 'volver a tocar deselecciona');
  // quedarse sin cartas termina la ronda
  S = mk('only-odd', [[3, 0]], [[1, 0]]); selC(S, [[3, 0]]); r = G.playSelection(S);
  t(r.type === 'empty' && S.over && S.result.why === 'empty' && S.result.score === 18, 'última carta: ronda terminada, 14 + 4 = 18');
  S = mk('only-odd', [[3, 0]], [[1, 0]], { hint: true }); selC(S, [[3, 0]]); G.playSelection(S);
  t(S.result.score === 15, 'con pista: 18 − 3 = 15');
}

console.log('== 5. «No tengo jugada»');
{
  // acierto con más de 4 cartas: mano nueva con 4 menos
  let S = mk('only-odd', [[2, 0], [4, 0], [6, 0], [8, 0], [10, 0], [12, 0]], [[1, 0]]);
  const total = () => S.hand.length + S.deck.length;
  const t0 = total(), ids0 = [...S.hand, ...S.deck].map(c => c.id).sort((a, b) => a - b).join();
  let r = G.noPlay(S);
  t(r.type === 'noplay-ok' && r.n === 2 && S.hand.length === 2 && !S.over, 'acierto con 6 cartas: nueva mano de 2');
  t(total() === t0 && [...S.hand, ...S.deck].map(c => c.id).sort((a, b) => a - b).join() === ids0, 'no se pierde ni se duplica ninguna carta');
  // acierto con 4 o menos: termina, sin bonificación de mano vacía
  S = mk('only-odd', [[2, 0], [4, 0], [6, 0], [8, 0]], [[1, 0]]);
  r = G.noPlay(S);
  t(r.type === 'noplay-end' && S.over && S.result.why === 'noplay' && S.result.won && S.noBonus, 'acierto con 4 cartas: fin de ronda');
  t(S.result.score === 14, 'sin +4: 14 puntos (mano vacía por «sin jugada»)');
  // error: había una válida; el repartidor la juega y robas 5
  S = mk('only-odd', [[2, 0], [3, 0], [4, 0], [6, 0], [8, 0]], [[1, 0]]);
  const mano = S.hand.length, mesa = S.main.length;
  r = G.noPlay(S);
  t(r.type === 'noplay-bad' && r.card.v === 3 && S.main.length === mesa + 1 && S.hand.length === mano - 1 + 5, 'error: juega la primera válida por ti y robas 5');
  // error estando ya en expulsión
  S = mk('only-odd', [[2, 0], [3, 0], [4, 0]], [[1, 0]], { placed: 30 });
  r = G.noPlay(S);
  t(r.type === 'expelled-noplay' && S.over && S.result.why === 'expelled', 'error con 30 cartas en mesa: expulsión');
  // se ve solo si es cadena o sola: noPlay solo mira cartas sueltas (como el original)
  S = mk('alt-color', [[2, 0], [4, 0]], [[9, 0]]);   // ninguna es roja: no hay jugada válida
  t(G.noPlay(S).type === 'noplay-end', 'alt-color: sin cartas del color que toca');
}

console.log('== 6. Expulsión y chinchetas');
{
  let S = mk('only-odd', [[2, 0], [4, 0], [6, 0]], [[1, 0]], { placed: 30 });
  selC(S, [[2, 0]]); let r = G.playSelection(S);
  t(r.type === 'expelled' && S.over && S.result.why === 'expelled' && S.hand.length === 2, 'con 30 en mesa, un fallo expulsa y no se roba');
  t(S.result.detail === 'Carta incorrecta', 'detalle: carta incorrecta');
  S = mk('only-odd', [[2, 0], [4, 0], [6, 0]], [[1, 0]], { placed: 30 }); selC(S, [[2, 0], [4, 0]]); r = G.playSelection(S);
  t(S.result.detail === 'La cadena falló', 'detalle: la cadena falló');
  S = mk('only-odd', [[2, 0], [4, 0], [6, 0]], [[1, 0]], { placed: 29 }); selC(S, [[2, 0]]); r = G.playSelection(S);
  t(r.type === 'bad' && !S.over && S.placed === 30, 'con 29 en mesa el fallo no expulsa (se mira antes de jugar)');
  S = mk('only-odd', [[2, 0], [4, 0], [6, 0]], [[1, 0]], { placed: 29 }); selC(S, [[2, 0], [4, 0], [6, 0]]); r = G.playSelection(S);
  t(r.type === 'bad' && !S.over && S.placed === 32, 'cadena de 3 con 29 en mesa: no expulsa aunque supere 30');
  S = mk('only-odd', [[3, 0], [5, 0]], [[1, 0]], { placed: 30 }); selC(S, [[3, 0]]); r = G.playSelection(S);
  t(r.type === 'ok' && !S.over, 'con 30 en mesa, acertar no expulsa');
  // chinchetas: la carta que ocupa el puesto 10, 20 y 30 lleva su número
  S = G.newRound(rule('only-odd'), mulberry(3)); S.main = [S.main[0]]; S.side = [[]]; S.placed = 0;
  const marcas = [];
  for (let i = 0; i < 31; i++) { S.hand.push({ id: 9000 + i, v: 1 + 2 * (i % 7), s: 0 }); S.sel = [9000 + i]; G.playSelection(S); const c = S.main[S.main.length - 1]; if (c.mark) marcas.push(c.mark); }
  t(marcas.join() === '10,20,30', 'chinchetas en 10, 20 y 30 (' + marcas.join() + ')');
}

console.log('== 7. Profeta');
{
  let falloMarca = 0, casos = 0, desequilibradas = 0;
  const baraja = []; for (let s = 0; s < 4; s++) for (let v = 1; v <= 13; v++) baraja.push({ v, s });
  for (const r of G.RULES) for (let seed = 1; seed <= 20; seed++) {
    const S = G.newRound(r, mulberry(seed * 131 + r.level));
    // avanza un poco la línea con jugadas reales para que haya historia
    for (let k = 0; k < 3; k++) { const c = S.hand.find(x => r.fn(S.main, x)); if (c) { S.sel = [c.id]; G.playSelection(S); } }
    const mesa0 = S.placed, mano0 = S.hand.length;
    t(G.startProphet(S) === true && !!S.prophet, 'startProphet');
    t(G.startProphet(S) === false, 'no se puede ser Profeta dos veces a la vez');
    t(G.playSelection(S) === null && G.noPlay(S) === null, 'con Profeta en curso no se puede jugar ni pedir «sin jugada»');
    let verdaderas = 0, res;
    for (let i = 0; i < 10; i++) {
      const actual = !!r.fn(S.prophet.line, S.prophet.card); if (actual) verdaderas++;
      const etiqueta = S.prophet.labels[i];
      if (actual !== etiqueta && baraja.some(c => !!r.fn(S.prophet.line, c) === etiqueta)) falloMarca++;   // había carta posible y no salió
      res = G.prophetAnswer(S, actual);
      t(res.type === (i < 9 ? 'right' : 'done'), 'respuesta correcta ' + (i + 1));
    }
    casos++;
    if (verdaderas !== 5) desequilibradas++;
    t(S.over && S.prophetOK && S.result.why === 'prophet' && S.result.won, 'Profeta verdadero termina la ronda');
    t(S.placed === mesa0 + 10, 'las 10 cartas probadas quedan en la mesa');
    t(S.result.score === G.scoreOf(mano0, { noBonus: false, prophetOK: true, hintUsed: false, gaveup: false }) && S.result.score >= 10, 'puntos con Profeta: incluye +10');
  }
  t(falloMarca === 0, 'cartas del Profeta que no corresponden a su etiqueta pudiendo hacerlo: ' + falloMarca);
  if (desequilibradas) avisos.push('pruebas de Profeta sin 5 válidas + 5 no válidas (la línea dejaba a toda la baraja como válida): ' + desequilibradas + ' de ' + casos);
  // fallo: Falso Profeta
  for (const r of [rule('only-odd'), rule('cycle4'), rule('color-two')]) for (const paso of [0, 4, 9]) {
    const S = G.newRound(r, mulberry(77 + paso)); const mano0 = S.hand.length;
    G.startProphet(S); let res = null;
    for (let i = 0; i <= paso; i++) { const actual = !!r.fn(S.prophet.line, S.prophet.card); res = G.prophetAnswer(S, i === paso ? !actual : actual); }
    t(res.type === 'wrong' && S.prophet === null && !S.over, 'Falso Profeta en el paso ' + (paso + 1) + ': sigue la ronda');
    t(S.hand.length === mano0 + 5, 'Falso Profeta: robas 5');
    const enMesa = S.main.some(c => c.id === res.card.id) || S.side.some(col => col.some(g => g.some(c => c.id === res.card.id)));
    t(enMesa, 'la carta fallada queda en la mesa');
  }
}

console.log('== 8. Puntuación');
{
  const F = (n, o = {}) => G.scoreOf(n, { noBonus: false, prophetOK: false, hintUsed: false, gaveup: false, ...o });
  const ref = (n, o) => { if (o.gaveup) return 0; let s = Math.max(0, 14 - n); if (n === 0 && !o.noBonus) s += 4; if (o.prophetOK) s += 10; if (o.hintUsed) s -= 3; return Math.max(0, s); };
  for (let n = 0; n <= 24; n++) for (const noBonus of [false, true]) for (const prophetOK of [false, true]) for (const hintUsed of [false, true]) for (const gaveup of [false, true]) {
    const o = { noBonus, prophetOK, hintUsed, gaveup };
    t(F(n, o) === ref(n, o), `scoreOf(${n}, ${JSON.stringify(o)})`);
  }
  t(F(0) === 18 && F(14) === 0 && F(20) === 0 && F(3, { hintUsed: true }) === 8 && F(0, { noBonus: true }) === 14, 'valores clave');
  const S = G.newRound(rule('only-odd'), mulberry(9)); G.giveUp(S);
  t(S.over && S.result.why === 'gaveup' && S.result.score === 0 && G.giveUp(S) === null, 'rendirse: 0 puntos, y no se puede repetir');
}

console.log('== 9. Simulación: una ronda siempre acaba (jugador que ve la regla y jugador al azar)');
{
  let rondas = 0, sinFin = 0;
  const cuenta = {};
  for (const r of G.RULES) for (let seed = 1; seed <= 60; seed++) for (const modo of ['oraculo', 'azar']) {
    const rnd = mulberry(seed * 977 + r.level * 13 + (modo === 'azar' ? 5 : 0));
    const S = G.newRound(r, rnd, false); let mov = 0;
    while (!S.over && mov++ < 3000) {
      if (modo === 'oraculo') {
        const c = S.hand.find(x => r.fn(S.main, x));
        if (c) { S.sel = [c.id]; G.playSelection(S); } else G.noPlay(S);
      } else {
        const c = S.hand[Math.floor(rnd() * S.hand.length)]; S.sel = [c.id]; G.playSelection(S);
      }
    }
    rondas++; if (!S.over) { sinFin++; console.log('  sin terminar:', r.id, modo, seed); }
    if (S.over) cuenta[S.result.why] = (cuenta[S.result.why] || 0) + 1;
  }
  t(sinFin === 0, 'rondas que no terminan: ' + sinFin);
  console.log('  rondas simuladas:', rondas, '· finales:', JSON.stringify(cuenta));
}

console.log('== 10. Totales y guardado');
{
  const T = G.newTotals(); const S = G.newRound(rule('only-odd'), mulberry(4)); G.giveUp(S); G.applyTotals(T, S);
  t(T.rounds === 1 && T.points === 0 && T.wins === 0 && T.found.length === 0, 'rendirse suma una ronda y 0 puntos');
  const S2 = G.newRound(rule('only-odd'), mulberry(5)); G.startProphet(S2);
  for (let i = 0; i < 10; i++) G.prophetAnswer(S2, !!S2.rule.fn(S2.prophet.line, S2.prophet.card)); G.applyTotals(T, S2); G.applyTotals(T, S2);
  t(T.wins === 2 && T.found.join() === 'only-odd' && T.rounds === 3, 'regla descubierta: cuenta victoria y se guarda una sola vez en «distintas»');
  const back = G.restore(G.serialize(T));
  t(back && JSON.stringify(back) === JSON.stringify(T), 'ida y vuelta exacta');
  const malos = ['no es json', 'null', '{}', '{"v":2,"rounds":1,"wins":0,"points":0}', '{"v":1,"rounds":-1,"wins":0,"points":0}', '{"v":1,"rounds":"3","wins":0,"points":0}',
    '{"v":1,"rounds":1.5,"wins":0,"points":0}', '{"v":1,"rounds":1,"wins":0,"points":99999999999}'];
  malos.forEach((m, i) => t(G.restore(m) === null, 'debe rechazar la entrada hostil #' + i));
  const r3 = G.restore('{"v":1,"rounds":2,"wins":1,"points":9,"found":["only-odd","__proto__","constructor",5,"only-odd","nope"]}');
  t(r3 && r3.found.join() === 'only-odd' && ({}).polluted === undefined, 'reglas desconocidas o repetidas se descartan');
  t(G.restore('{"v":1,"rounds":2,"wins":1,"points":9}').found.length === 0, 'sin «found»: lista vacía');
}

console.log('== 11. Marcador, rondas abandonadas y registro');
{
  let S = G.newRound(rule('only-odd'), mulberry(31));
  t(G.pointsNow(S) === 0, 'puntos ahora con 14 cartas: 0');
  S = mk('only-odd', [[3, 0], [5, 0], [7, 0]], [[1, 0]]);
  t(G.pointsNow(S) === 11, 'puntos ahora con 3 cartas: 14 − 3 = 11');
  S = mk('only-odd', [[3, 0], [5, 0], [7, 0]], [[1, 0]], { hint: true });
  t(G.pointsNow(S) === 8, 'con pista: 11 − 3 = 8');
  // abandonar: una ronda sin tocar no cuenta; una empezada cuenta con 0 puntos
  const T = G.newTotals(); S = G.newRound(rule('only-odd'), mulberry(32));
  t(G.abandonRound(S) === null && !S.over, 'ronda sin tocar: no se puede abandonar (no cuenta)');
  S = mk('only-odd', [[3, 0], [5, 0], [7, 0]], [[1, 0]]); selC(S, [[3, 0]]); G.playSelection(S);
  const r = G.abandonRound(S); G.applyTotals(T, S);
  t(r && r.type === 'abandoned' && S.over && S.result.why === 'abandoned' && S.result.score === 0 && !S.result.won, 'abandonar una ronda empezada: 0 puntos');
  t(T.rounds === 1 && T.points === 0 && T.log.length === 1 && T.log[0].why === 'abandoned', 'cuenta como ronda jugada y queda en el registro');
  t(G.abandonRound(S) === null, 'no se abandona dos veces');
  // el registro guarda las últimas ${G.LOG_MAX}
  const T2 = G.newTotals();
  for (let i = 0; i < G.LOG_MAX + 5; i++) { const s = G.newRound(rule('only-odd'), mulberry(100 + i)); G.giveUp(s); G.applyTotals(T2, s); }
  t(T2.rounds === G.LOG_MAX + 5 && T2.log.length === G.LOG_MAX, 'registro limitado a los últimos ' + G.LOG_MAX + ' con el contador total intacto');
  const back = G.restore(G.serialize(T2)); t(back && JSON.stringify(back) === JSON.stringify(T2), 'ida y vuelta del registro');
  const malo = JSON.parse(G.serialize(T)); malo.log = [{ id: 'nope', why: 'gaveup', score: 0 }, { id: 'only-odd', why: 'xx', score: 0 }, { id: 'only-odd', why: 'gaveup', score: -5 }, { id: 'only-odd', why: 'gaveup', score: 99 }, { id: 'only-odd', why: 'empty', score: 18 }, null, 5];
  const rr = G.restore(JSON.stringify(malo)); t(rr && rr.log.length === 1 && rr.log[0].score === 18, 'entradas del registro inválidas se descartan');
  const viejo = G.restore('{"v":1,"rounds":2,"wins":1,"points":9,"found":["only-odd"]}'); t(viejo && Array.isArray(viejo.log) && viejo.log.length === 0, 'datos guardados antes del registro se leen bien');
  // contadores tras varias rondas de distintos finales
  const T3 = G.newTotals();
  const fin = (ruleId, how) => { const s = G.newRound(rule(ruleId), mulberry(200)); if (how === 'prophet') { G.startProphet(s); for (let i = 0; i < 10; i++) G.prophetAnswer(s, !!s.rule.fn(s.prophet.line, s.prophet.card)); } else if (how === 'gaveup') G.giveUp(s); G.applyTotals(T3, s); return s; };
  fin('only-odd', 'prophet'); fin('alt-color', 'gaveup'); fin('only-odd', 'prophet'); fin('close-value', 'prophet');
  t(T3.rounds === 4 && T3.wins === 3 && T3.found.join() === 'only-odd,close-value' && T3.points === 3 * 10 && T3.log.length === 4, 'tres Profetas (dos con la misma regla) y una rendición: 4 rondas, 3 victorias, 2 reglas distintas, 30 puntos');
}

if (avisos.length) console.log('\nAvisos:', avisos.join(' | '));
console.log(`\nRESULTADO: ${ok} ok, ${ko} fallos`);
process.exit(ko ? 1 : 0);
