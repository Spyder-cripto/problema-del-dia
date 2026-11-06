// completa-la-tabla/test.mjs — pruebas de la lógica del juego:  node juego/completa-la-tabla/test.mjs
import * as G from './game.js';

let ok = 0, ko = 0;
const t = (c, msg) => { if (c) ok++; else { ko++; console.log('  FALLO:', msg); } };
const cfg = k => G.configDe(k);

console.log('== 1. Repartos de colores');
for (const [k, p] of Object.entries(G.PALETAS)) {
  const todas = p.flat().sort((a, b) => a - b);
  t(p.length === 4 && p.every(c => c.length === 4), k + ': cuatro colores de cuatro fichas');
  t(todas.join() === Array.from({ length: 16 }, (_, i) => i + 1).join(), k + ': usa las 16 fichas una sola vez');
}
t(G.colorDe(cfg('orig'), 14) === 3 && G.colorDe(cfg('orig'), 4) === 2 && G.colorDe(cfg('orig'), 16) === 0 && G.colorDe(cfg('orig'), 15) === 1, 'original: 14 azul, 4 verde, 16 rojo, 15 amarillo');

console.log('== 2. Recuentos de soluciones (calculados por búsqueda exhaustiva)');
const n = k => G.soluciones(cfg(k)).length;
t(n('orig') === 384, 'original: 384 soluciones (' + n('orig') + ')');
t(n('exp') === 128, 'extendida sin casillas dadas: 128 soluciones (' + n('exp') + ')');
t(n('ext') === 2, 'medio, con el 1 y el 8 dados: dos soluciones (' + n('ext') + ')');
t(n('ayuda') === 1, 'fácil, con las 4 esquinas dadas (1, 15, 12 y 6): solución única (' + n('ayuda') + ')');
t(Object.keys(cfg('ayuda').dados).join() === '0,3,12,15' && G.soluciones(cfg('ayuda'))[0].join() === '1,8,10,15,14,11,5,4,7,2,16,9,12,13,3,6', 'fácil: las esquinas dadas y la solución es la misma que la del reto medio');
for (const c of G.CONFIGS) {
  const sols = G.soluciones(c);
  t(sols.every(s => G.esSolucion(c, s)), c.key + ': todas las soluciones pasan el validador');
  t(sols.every(s => Object.entries(c.dados).every(([i, v]) => s[+i] === v)), c.key + ': todas respetan las casillas dadas');
  t(new Set(sols.map(s => s.join())).size === sols.length, c.key + ': sin soluciones repetidas');
}

console.log('== 3. La solución publicada y el reparto original');
const SOL = [1, 8, 10, 15, 14, 11, 5, 4, 7, 2, 16, 9, 12, 13, 3, 6];
t(G.esSolucion(cfg('ext'), SOL), 'la solución del reto extendido es válida');
t(G.soluciones(cfg('ext')).some(x => x.join() === SOL.join()), 'una de las dos del reto medio');
t(G.soluciones(cfg('ext')).map(x => x.join()).includes('1,8,11,14,15,10,5,4,6,3,16,9,12,13,2,7'), 'y la otra, con 11 y 14 en lugar de 10 y 15');
{ const mid = cfg('ext'); const todas = G.soluciones({ ...mid, key: 'ext-libre', dados: {} }); let unica = 0; for (let a = 0; a < 16; a++) for (let c = a + 1; c < 16; c++) { if (G.soluciones({ ...mid, key: 'par' + a + '_' + c, dados: { [a]: SOL[a], [c]: SOL[c] } }).length === 1) unica++; } t(todas.length === 128 && unica === 0, 'con solo 2 casillas dadas de la solución nunca hay solución única (por eso el medio tiene dos)'); }
t(!G.esSolucion(cfg('orig'), SOL), 'con los colores originales esa solución NO vale (el reparto es distinto)');
{
  // sin la regla de diagonales ni 2×2, el reparto en bloques admite más soluciones que con ellas
  const base = { ...cfg('ext'), key: 'tmp1', diagColor: false, cuadrados: false, dados: {} };
  t(G.soluciones(base).length > 128, 'quitar las reglas extra admite más soluciones (' + G.soluciones(base).length + ')');
  const conDiag = { ...cfg('ext'), key: 'tmp2', diagColor: true, cuadrados: false, dados: {} };
  t(G.soluciones(conDiag).length >= 128 && G.soluciones(conDiag).length <= G.soluciones(base).length, 'solo diagonales de colores: entre las dos');
}
{
  // el hecho que motivó la versión extendida: con los colores originales ninguna solución tiene diagonales de cuatro colores
  const origDiag = { ...cfg('orig'), key: 'tmp3', diagColor: true };
  t(G.soluciones(origDiag).length === 0, 'con los colores originales, exigir diagonales de cuatro colores no deja ninguna solución');
}

console.log('== 4. Análisis de tableros');
{
  const c = cfg('ext'), b = G.tableroVacio(c);
  t(b.filter(v => v).length === 2 && b[0] === 1 && b[1] === 8, 'el tablero inicial trae el 1 y el 8 en la primera fila');
  const a0 = G.analiza(c, b);
  t(a0.filas[0].estado === 'parcial' && a0.filas[0].suma === 9 && a0.filas[1].estado === 'vacia', 'fila 1 parcial con suma 9; fila 2 vacía');
  const full = G.analiza(c, SOL);
  t(full.correcto && full.errores === 0 && full.completo, 'la solución se analiza como correcta y sin errores');
  t(full.filas.every(l => l.suma === 34) && full.cols.every(l => l.suma === 34) && full.diags.every(l => l.suma === 34) && full.cuads.length === 9 && full.cuads.every(l => l.suma === 34), 'filas, columnas, diagonales y los 9 cuadrados suman 34');
  const mal = SOL.slice(); [mal[0], mal[1]] = [mal[1], mal[0]];
  t(!G.analiza(c, mal).correcto && G.analiza(c, mal).errores > 0, 'intercambiar dos fichas estropea la solución');
  // color repetido en una fila: 1 y 2 son ambas rojas en el reparto extendido
  const rep = G.tableroVacio(c).map(() => 0); rep[0] = 1; rep[1] = 2;
  t(G.conflictosColor(c, rep).size === 2, 'el 1 y el 2 (rojas) juntas en una fila chocan');
  // línea ya pasada de 34
  const pasada = new Array(16).fill(0); pasada[0] = 16; pasada[1] = 15; pasada[2] = 14;
  t(G.estadoLinea(pasada, [0, 1, 2, 3]).estado === 'mal', 'una línea parcial que ya pasa de 34 está mal');
  t(G.estadoLinea(new Array(16).fill(0), [0, 1, 2, 3]).estado === 'vacia', 'línea vacía');
  t(G.fichasLibres(b).join() === [2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16].join(), 'fichas libres al empezar: las 14 restantes');
  t(G.jugadaLimpia(c, b, 3, 15) && !G.jugadaLimpia(c, b, 3, 2), 'en la casilla 4: el 15 no choca, el 2 sí (rojo repetido con el 1)');
  t(!G.jugadaLimpia(c, b, 2, 7), 'el 7 es amarillo y ya hay un amarillo (el 8) en la fila');
  t(G.analiza(cfg('orig'), G.tableroVacio(cfg('orig'))).cuads.length === 0, 'el original no tiene cuadrados 2×2');
}

console.log('== 5. Pistas');
{
  const c = cfg('ext');
  const p = G.pista(c, G.tableroVacio(c));
  t(p.tipo === 'poner' && p.soluciones === 2 && G.compatibles(c, Object.assign(G.tableroVacio(c), { [p.celda]: p.valor })).length >= 1, 'con el 1 y el 8: la pista propone una jugada con solución (' + JSON.stringify(p) + ')');
  // aplicando pistas una tras otra se llega a la solución en 14 pasos
  let b = G.tableroVacio(c), pasos = 0;
  while (!G.esSolucion(c, b) && pasos < 20) { const q = G.pista(c, b); t(q.tipo === 'poner', 'solo hay jugadas de poner mientras no haya errores'); b[q.celda] = q.valor; pasos++; }
  t(G.esSolucion(c, b) && pasos === 14, 'las pistas encadenadas resuelven el reto en 14 jugadas (' + pasos + ')');
  t(G.pista(c, SOL).tipo === 'completo', 'con el tablero resuelto: completo');
  // error: una ficha que no lleva a ninguna solución
  const e = G.tableroVacio(c); e[3] = 2;
  const q = G.pista(c, e);
  t(q.tipo === 'quitar' && q.celda === 3, 'el 2 (rojo, como el 1) en la casilla 4 es un error: pide quitarlo (' + JSON.stringify(q) + ')');
  // nunca pide quitar una casilla dada
  const e2 = G.tableroVacio(c); e2[3] = 2; e2[4] = 13;
  const q2 = G.pista(c, e2);
  t(q2.tipo === 'quitar' && !(q2.celda in c.dados), 'la pista de quitar nunca señala una casilla dada');
  // modo experto: la pista de un tablero vacío cuenta las 128 soluciones y devuelve algo compatible
  const ex = cfg('exp'), pe = G.pista(ex, G.tableroVacio(ex));
  t(pe.tipo === 'poner' && pe.soluciones === 128, 'experto sin nada: 128 soluciones compatibles');
  const b2 = G.tableroVacio(ex); b2[pe.celda] = pe.valor;
  t(G.compatibles(ex, b2).length >= 1, 'la jugada que sugiere sigue teniendo solución');
  // original: pista consistente
  const o = cfg('orig'), po = G.pista(o, G.tableroVacio(o)), bo = G.tableroVacio(o); bo[po.celda] = po.valor;
  t(po.tipo === 'poner' && G.compatibles(o, bo).length >= 1, 'original: la pista inicial tiene solución');
}

console.log('== 6. Todas las variantes se pueden resolver siguiendo solo las pistas');
for (const c of G.CONFIGS) {
  let b = G.tableroVacio(c), pasos = 0;
  while (!G.esSolucion(c, b) && pasos < 17) { const q = G.pista(c, b); if (q.tipo !== 'poner') break; b[q.celda] = q.valor; pasos++; }
  t(G.esSolucion(c, b), c.key + ': resuelto solo con pistas en ' + pasos + ' jugadas');
}

console.log('== 7. Variante «un solo color» (una ficha roja en cada cuadrado 2×2, sin diagonales de color)');
{
  const c = cfg('uno');
  t(c.cubre === 0 && !c.diagColor && c.cuadrados, 'rojo en cada 2×2, sin regla de diagonales');
  t(G.soluciones(c).length === 1, 'con 1, 8 y 10: solución única (' + G.soluciones(c).length + ')');
  const sol = G.soluciones(c)[0];
  t(sol.join() === '1,8,10,15,12,13,3,6,7,2,16,9,14,11,5,4', 'es la solución publicada');
  t(G.esSolucion(c, sol), 'el validador la acepta');
  const an = G.analiza(c, sol);
  t(an.cubren.length === 9 && an.cubren.every(x => x.estado === 'ok'), 'los 9 cuadrados 2×2 llevan una ficha roja');
  // la solución de la versión extendida NO vale aquí (otro dibujo de colores) y la de aquí no vale allí (diagonales)
  t(!G.esSolucion(cfg('ext'), sol), 'esta solución no vale en la versión extendida (diagonales con colores repetidos)');
  t(!G.esSolucion(c, [1, 8, 10, 15, 14, 11, 5, 4, 7, 2, 16, 9, 12, 13, 3, 6]), 'la solución de la versión extendida no vale aquí: algún 2×2 no lleva rojo');
  // sin casillas dadas hay 32 soluciones, todas válidas
  const libre = { ...c, key: 'uno-libre', dados: {} };
  const todas = G.soluciones(libre);
  t(todas.length === 32 && todas.every(s => G.esSolucion(libre, s)), 'sin casillas dadas: 32 soluciones, todas válidas (' + todas.length + ')');
  // un 2×2 sin rojo completo es un error
  const sin = new Array(16).fill(0); [5, 6, 9, 10].forEach((i, k) => { sin[i] = [5, 9, 13, 6][k]; });
  t(G.analiza(c, sin).cubren[4].estado === 'mal', 'un 2×2 completo sin ficha roja está mal');
  let b = G.tableroVacio(c), pasos = 0;
  while (!G.esSolucion(c, b) && pasos < 20) { const q = G.pista(c, b); if (q.tipo !== 'poner') break; b[q.celda] = q.valor; pasos++; }
  t(G.esSolucion(c, b) && pasos === 13, 'resuelta solo con pistas en 13 jugadas (' + pasos + ')');
}

console.log(ko ? '\n' + ko + ' FALLOS de ' + (ok + ko) : '\nTodo bien: ' + ok + ' comprobaciones');
process.exit(ko ? 1 : 0);
