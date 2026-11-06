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
t(n('ext') === 1, 'extendida con 1, 8 y 10: solución única (' + n('ext') + ')');
t(n('ayuda') >= 1, 'extendida con 8 casillas dadas: al menos una (' + n('ayuda') + ')');
for (const c of G.CONFIGS) {
  const sols = G.soluciones(c);
  t(sols.every(s => G.esSolucion(c, s)), c.key + ': todas las soluciones pasan el validador');
  t(sols.every(s => Object.entries(c.dados).every(([i, v]) => s[+i] === v)), c.key + ': todas respetan las casillas dadas');
  t(new Set(sols.map(s => s.join())).size === sols.length, c.key + ': sin soluciones repetidas');
}

console.log('== 3. La solución publicada y el reparto original');
const SOL = [1, 8, 10, 15, 14, 11, 5, 4, 7, 2, 16, 9, 12, 13, 3, 6];
t(G.esSolucion(cfg('ext'), SOL), 'la solución del reto extendido es válida');
t(G.soluciones(cfg('ext'))[0].join() === SOL.join(), 'y es la única');
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
  t(b.filter(v => v).length === 3 && b[0] === 1 && b[1] === 8 && b[2] === 10, 'el tablero inicial trae el 1, el 8 y el 10 en la primera fila');
  const a0 = G.analiza(c, b);
  t(a0.filas[0].estado === 'parcial' && a0.filas[0].suma === 19 && a0.filas[1].estado === 'vacia', 'fila 1 parcial con suma 19; fila 2 vacía');
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
  t(G.fichasLibres(b).join() === [2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16].join(), 'fichas libres al empezar: las 13 restantes');
  t(G.jugadaLimpia(c, b, 3, 15) && !G.jugadaLimpia(c, b, 3, 16), 'en la casilla 4: el 15 no choca, el 16 sí (suma 35)');
  t(!G.jugadaLimpia(c, b, 3, 9), 'el 9 es verde y ya hay un verde (el 10) en la fila');
  t(G.analiza(cfg('orig'), G.tableroVacio(cfg('orig'))).cuads.length === 0, 'el original no tiene cuadrados 2×2');
}

console.log('== 5. Pistas');
{
  const c = cfg('ext');
  const p = G.pista(c, G.tableroVacio(c));
  t(p.tipo === 'poner' && p.forzada && p.celda === 3 && p.valor === 15 && p.color === 3, 'con 1, 8 y 10 la casilla 4 está forzada: un 15 azul (' + JSON.stringify(p) + ')');
  // aplicando pistas una tras otra se llega a la solución en 13 pasos
  let b = G.tableroVacio(c), pasos = 0;
  while (!G.esSolucion(c, b) && pasos < 20) { const q = G.pista(c, b); t(q.tipo === 'poner', 'solo hay jugadas de poner mientras no haya errores'); b[q.celda] = q.valor; pasos++; }
  t(G.esSolucion(c, b) && pasos === 13, 'las pistas encadenadas resuelven el reto en 13 jugadas (' + pasos + ')');
  t(G.pista(c, SOL).tipo === 'completo', 'con el tablero resuelto: completo');
  // error: una ficha que no lleva a ninguna solución
  const e = G.tableroVacio(c); e[3] = 14;
  const q = G.pista(c, e);
  t(q.tipo === 'quitar' && q.celda === 3, 'el 14 en la casilla 4 es un error: pide quitarlo (' + JSON.stringify(q) + ')');
  // nunca pide quitar una casilla dada
  const e2 = G.tableroVacio(c); e2[3] = 14; e2[4] = 14 === 14 ? 13 : 0;
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

console.log(ko ? '\n' + ko + ' FALLOS de ' + (ok + ko) : '\nTodo bien: ' + ok + ' comprobaciones');
process.exit(ko ? 1 : 0);
