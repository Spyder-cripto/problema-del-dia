// suma-15/test.mjs — batería de pruebas de la lógica de «Sumar 15», todo en una pasada:  node juego/suma-15/test.mjs
import * as G from './game.js';

let ok = 0, ko = 0;
const t = (c, msg) => { if (c) ok++; else { ko++; console.log('  FALLO:', msg); } };
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
const sorted = a => a.slice().sort((x, y) => x - y);
const tkey = a => sorted(a).join(',');

console.log('== 1. Las ocho ternas y el cuadrado mágico');
{
  const esperadas = ['1,5,9', '1,6,8', '2,4,9', '2,5,8', '2,6,7', '3,4,8', '3,5,7', '4,5,6'];
  t(G.TRIPLES.length === 8, 'hay exactamente 8 ternas de cartas distintas que suman 15 (hay ' + G.TRIPLES.length + ')');
  t(G.TRIPLES.map(tkey).join('|') === esperadas.join('|'), 'las ternas son las ocho de siempre: ' + G.TRIPLES.map(tkey).join(' '));
  t(G.TRIPLES.every(x => x.reduce((a, b) => a + b, 0) === 15 && new Set(x).size === 3 && x.every(c => c >= 1 && c <= 9)), 'cada terna suma 15 y tiene tres cartas distintas');
  t(sorted(G.MAGIC.flat()).join() === '1,2,3,4,5,6,7,8,9', 'el cuadrado mágico usa 1..9 una vez cada una');
  t(G.MAGIC_LINES.length === 8 && G.MAGIC_LINES.every(l => l.reduce((a, b) => a + b, 0) === 15), 'filas, columnas y diagonales suman 15');
  t(G.MAGIC_LINES.map(tkey).sort().join('|') === esperadas.slice().sort().join('|'), 'las 8 líneas del tres en raya son EXACTAMENTE las 8 ternas');
  t(G.CARDS.every(c => { const [r, k] = G.magicPos(c); return G.MAGIC[r][k] === c; }), 'magicPos devuelve la casilla de cada carta');
}

console.log('== 2. Estado, jugadas ilegales y victoria');
{
  let S = G.newGame(0);
  t(G.turn(S) === 0 && G.legalMoves(S).length === 9, 'al empezar: turno del 0 y 9 jugadas');
  t(G.turn(G.newGame(1)) === 1, 'newGame(1): empieza el jugador 1');
  S = G.play(S, 5);
  t(G.turn(S) === 1 && S.owner[5] === 0 && G.legalMoves(S).length === 8 && !G.legalMoves(S).includes(5), 'jugada 1: la carta pasa al que la coge');
  let lanzo = false; try { G.play(S, 5); } catch (e) { lanzo = true; } t(lanzo, 'no se puede coger una carta ya cogida');
  lanzo = false; try { G.play(S, 10); } catch (e) { lanzo = true; } t(lanzo, 'no se puede coger la carta 10');
  lanzo = false; try { G.play(S, 0); } catch (e) { lanzo = true; } t(lanzo, 'no se puede coger la carta 0');
  t(G.newGame(0).owner.every(o => o === -1) && S !== G.newGame(0), 'play no muta el estado anterior');
  // victoria con 4+5+6 (jugador 0) y 1+2 del otro
  S = G.newGame(0); for (const c of [4, 1, 5, 2, 6]) S = G.play(S, c);
  const r = G.result(S);
  t(r.over && r.winner === 0 && tkey(r.triple) === '4,5,6', 'gana el 0 con 4+5+6');
  lanzo = false; try { G.play(S, 9); } catch (e) { lanzo = true; } t(lanzo, 'terminada la partida no se puede seguir');
  // empate
  S = G.newGame(0); for (const c of [5, 1, 9, 2, 8, 3, 7, 4, 6]) S = G.play(S, c);
  // 5,9,8,7,6 (0) y 1,2,3,4 (1): comprobar a mano que no hay terna de ningún jugador
  const re = G.result(S);
  t(re.over && re.winner === null && re.triple === null && S.moves.length === 9, 'empate real: 5,9,8,7,6 contra 1,2,3,4 (ninguna terna) y la novena carta cierra la partida');
}

console.log('== 3. Avisos: cartas libres que harían sumar 15');
{
  let S = G.newGame(0); for (const c of [4, 1, 5]) S = G.play(S, c);   // 0 tiene 4 y 5 → le falta el 6; 1 tiene el 1
  t(G.threats(S, 0).join() === '6', 'con 4 y 5 le falta el 6 (' + G.threats(S, 0).join() + ')');
  t(G.threats(S, 1).join() === '', 'con una sola carta no hay amenaza');
  S = G.newGame(0); for (const c of [5, 1, 9]) S = G.play(S, c);       // 0: 5 y 9 → falta el 1, que ya es del otro: no hay amenaza
  t(G.threats(S, 0).join() === '', 'si la carta que falta ya la tiene el rival, no hay amenaza');
  S = G.newGame(0); for (const c of [2, 1, 7, 9]) S = G.play(S, c);    // 0: 2 y 7 → falta el 6; 1: 1 y 9 → falta el 5
  t(G.threats(S, 0).join() === '6' && G.threats(S, 1).join() === '5', 'amenazas de los dos jugadores a la vez');
  // contraste con la definición por fuerza bruta en TODAS las posiciones alcanzables
  const visto = new Set(); let n = 0, mal = 0;
  (function dfs(S) {
    const k = S.owner.join(','); if (visto.has(k)) return; visto.add(k);
    for (const p of [0, 1]) {
      const bruto = new Set();
      for (const c of G.CARDS) if (S.owner[c] === -1) {
        const mias = G.CARDS.filter(x => S.owner[x] === p).concat(c);
        for (const tr of G.TRIPLES) if (tr.includes(c) && tr.every(x => mias.includes(x))) bruto.add(c);
      }
      n++; if (G.threats(S, p).join() !== sorted([...bruto]).join()) mal++;
    }
    if (!G.isOver(S)) for (const c of G.legalMoves(S)) dfs(G.play(S, c));
  })(G.newGame(0));
  t(mal === 0, 'threats = fuerza bruta en ' + n + ' consultas (' + mal + ' diferencias)');
}

console.log('== 4. Es el tres en raya: recuento de TODAS las partidas y equivalencia posición a posición');
{
  let total = 0, w0 = 0, w1 = 0, emp = 0, nodos = 0, malIso = 0;
  const lineasTTT = G.MAGIC_LINES;   // en coordenadas del cuadrado mágico
  (function dfs(S) {
    nodos++;
    const r = G.result(S);
    // tres en raya "de verdad" sobre el tablero 3x3 construido con el cuadrado mágico
    const tablero = G.MAGIC.map(f => f.map(c => S.owner[c]));
    const tt = [0, 1].find(p => [0, 1, 2].some(i => tablero[i].every(x => x === p) || [0, 1, 2].map(j => tablero[j][i]).every(x => x === p)) ||
      [0, 1, 2].every(i => tablero[i][i] === p) || [0, 1, 2].every(i => tablero[i][2 - i] === p));
    if ((tt === undefined ? null : tt) !== r.winner) malIso++;
    if (r.over) { total++; if (r.winner === 0) w0++; else if (r.winner === 1) w1++; else emp++; return; }
    for (const c of G.legalMoves(S)) dfs(G.play(S, c));
  })(G.newGame(0));
  t(total === 255168, 'partidas completas del tres en raya: 255 168 (' + total + ')');
  t(w0 === 131184 && w1 === 77904 && emp === 46080, 'gana el primero 131 184, el segundo 77 904 y empatan 46 080 (' + w0 + ' / ' + w1 + ' / ' + emp + ')');
  t(malIso === 0, 'en las ' + nodos + ' posiciones, «tres cartas que suman 15» = «tres en raya del cuadrado mágico» (' + malIso + ' diferencias)');
  t(lineasTTT.length === 8, 'ocho líneas');
}

console.log('== 5. Valor del juego con juego perfecto = empate, en cualquier orden de salida');
{
  t(G.value(G.newGame(0)) === 0 && G.score(G.newGame(0)) === 0, 'empieza el jugador 0: empate');
  t(G.value(G.newGame(1)) === 0 && G.score(G.newGame(1)) === 0, 'empieza el jugador 1: empate');
  // tras cualquier primera jugada, con juego perfecto: el centro (5) y las esquinas (2,4,6,8) mantienen el empate, los bordes (1,3,7,9) también
  for (const c of G.CARDS) t(G.value(G.play(G.newGame(0), c)) === 0, 'primera jugada ' + c + ': sigue empatado');
  // una posición ganadora conocida: el 0 tiene 5, el 1 juega un borde (1): gana el 0 con juego perfecto (tres en raya: centro + borde = error)
  let S = G.play(G.play(G.newGame(0), 5), 1);
  t(G.value(S) === 1, 'tras 5 y respuesta en un borde (1), el primero gana con juego perfecto');
  S = G.play(G.play(G.newGame(0), 5), 2);
  t(G.value(S) === 0, 'tras 5 y respuesta en una esquina (2), sigue empatado');
}

console.log('== 6. La máquina perfecta nunca pierde (se barren TODAS las respuestas del rival)');
{
  for (const first of [0, 1]) for (const yo of [0, 1]) {
    let hojas = 0, perdidas = 0, victorias = 0, noOptima = 0;
    (function dfs(S) {
      const r = G.result(S);
      if (r.over) { hojas++; if (r.winner === 1 - yo) perdidas++; if (r.winner === yo) victorias++; return; }
      if (G.turn(S) === yo) {
        // todas las jugadas óptimas de la máquina (empates incluidos): ninguna puede acabar en derrota
        const p = G.turn(S), ms = G.legalMoves(S), vals = ms.map(c => G.score(G.play(S, c)));
        const best = p === 0 ? Math.max(...vals) : Math.min(...vals);
        ms.forEach((c, i) => { if (vals[i] === best) dfs(G.play(S, c)); });
        const m = G.perfectMove(S, mulberry(S.moves.length * 17 + 3));
        if (vals[ms.indexOf(m)] !== best) noOptima++;
      } else for (const c of G.legalMoves(S)) dfs(G.play(S, c));
    })(G.newGame(first));
    t(perdidas === 0 && hojas > 0, 'perfecta como jugador ' + yo + ' saliendo el ' + first + ': 0 derrotas en ' + hojas + ' partidas (' + perdidas + ')');
    t(noOptima === 0, 'perfectMove siempre elige una jugada óptima (' + noOptima + ')');
  }
  // gana siempre que puede y bloquea siempre: tácticas inmediatas
  let mal = 0, n = 0; const vistos = new Set();
  (function dfs(S) {
    const k = S.owner.join(','); if (vistos.has(k)) return; vistos.add(k);
    if (G.isOver(S)) return;
    const p = G.turn(S), propio = G.threats(S, p), rival = G.threats(S, 1 - p), m = G.perfectMove(S, mulberry(11));
    n++;
    if (propio.length && !propio.includes(m)) mal++;                          // si puede ganar ya, gana
    for (const c of G.legalMoves(S)) dfs(G.play(S, c));
  })(G.newGame(0));
  t(mal === 0, 'si puede ganar ya, la máquina perfecta gana (' + n + ' posiciones, ' + mal + ' fallos)');
  // la perfecta contra una aleatoria no pierde nunca en 3000 partidas (y gana muchas)
  let pierde = 0, gana = 0; const rng = mulberry(2026);
  for (let g = 0; g < 3000; g++) {
    const first = g % 2, yo = (g >> 1) % 2; let S = G.newGame(first);
    while (!G.isOver(S)) S = G.play(S, G.turn(S) === yo ? G.machineMove('perfecto', S, rng) : G.machineMove('aleatorio', S, rng));
    const r = G.result(S); if (r.winner === 1 - yo) pierde++; if (r.winner === yo) gana++;
  }
  t(pierde === 0 && gana > 1500, 'perfecta vs aleatoria (3000 partidas): 0 derrotas, ' + gana + ' victorias');
  // perfecta contra perfecta: siempre empate
  let empates = 0;
  for (let g = 0; g < 200; g++) { let S = G.newGame(g % 2); while (!G.isOver(S)) S = G.play(S, G.machineMove('perfecto', S, rng)); if (G.result(S).winner === null) empates++; }
  t(empates === 200, 'perfecta vs perfecta: 200 empates de 200');
}

console.log('== 7. Ningún nivel de la máquina hace una jugada ilegal');
{
  // en TODAS las posiciones alcanzables (no terminales) y con los tres niveles
  const vistos = new Set(); let consultas = 0, ilegales = 0, nivelesMalos = 0;
  const rng = mulberry(77);
  (function dfs(S) {
    const k = S.owner.join(','); if (vistos.has(k)) return; vistos.add(k);
    if (G.isOver(S)) return;
    const ms = G.legalMoves(S);
    for (const nivel of G.LEVELS) {
      const m = G.machineMove(nivel, S, rng); consultas++;
      if (!Number.isInteger(m) || !ms.includes(m)) ilegales++;
    }
    for (const c of ms) dfs(G.play(S, c));
  })(G.newGame(0));
  t(ilegales === 0, 'los tres niveles en las ' + (consultas / 3) + ' posiciones no terminales (' + consultas + ' consultas): ' + ilegales + ' jugadas ilegales');
  let lanzo = false; try { G.machineMove('inventado', G.newGame(0), rng); } catch (e) { lanzo = true; } t(lanzo, 'un nivel desconocido da error');
  // partidas completas entre niveles
  let ilegalesPartida = 0, partidas = 0;
  for (const a of G.LEVELS) for (const b of G.LEVELS) for (let g = 0; g < 60; g++) {
    let S = G.newGame(g % 2); partidas++;
    while (!G.isOver(S)) { const m = G.machineMove(G.turn(S) === 0 ? a : b, S, rng); if (!G.legalMoves(S).includes(m)) { ilegalesPartida++; break; } S = G.play(S, m); }
  }
  t(ilegalesPartida === 0, partidas + ' partidas entre niveles sin jugadas ilegales');
  // calidad relativa: MCTS corto gana a la aleatoria bastante más de lo que pierde; la perfecta nunca pierde con ninguno
  let g1 = 0, p1 = 0;
  for (let g = 0; g < 400; g++) {
    const first = g % 2, yo = (g >> 1) % 2; let S = G.newGame(first);
    while (!G.isOver(S)) S = G.play(S, G.turn(S) === yo ? G.machineMove('mcts', S, rng) : G.machineMove('aleatorio', S, rng));
    const r = G.result(S); if (r.winner === yo) g1++; if (r.winner === 1 - yo) p1++;
  }
  t(g1 > p1 * 3 && g1 > 250, 'MCTS corto vs aleatoria (400): ' + g1 + ' victorias, ' + p1 + ' derrotas');
}

console.log('== 8. «¿En qué momento se decidió?»');
{
  // perfecta contra perfecta: ninguna jugada es un error
  const rng = mulberry(5); let errores = 0;
  for (let g = 0; g < 50; g++) { let S = G.newGame(g % 2); while (!G.isOver(S)) S = G.play(S, G.machineMove('perfecto', S, rng)); errores += G.analyze(S.moves, S.first).jugadas.filter(m => m.error).length; }
  t(errores === 0, 'sin errores si los dos juegan perfecto');
  // en TODA partida con ganador hay una jugada decisiva, que es un error del perdedor
  let ganadas = 0, sinDecisiva = 0, decisivaDelGanador = 0, valores = 0;
  (function dfs(S) {
    const r = G.result(S);
    if (r.over) {
      if (r.winner === null) return;
      ganadas++;
      const a = G.analyze(S.moves, S.first);
      if (!a.decisiva) { sinDecisiva++; return; }
      if (a.decisiva.player === r.winner) decisivaDelGanador++;
      if (a.decisiva.despues !== (r.winner === 0 ? 1 : -1) || a.decisiva.antes === a.decisiva.despues) valores++;
      return;
    }
    for (const c of G.legalMoves(S)) dfs(G.play(S, c));
  })(G.newGame(0));
  t(ganadas === 131184 + 77904, 'partidas con ganador analizadas: ' + ganadas);
  t(sinDecisiva === 0, 'todas las partidas con ganador tienen jugada decisiva (' + sinDecisiva + ' sin ella)');
  t(decisivaDelGanador === 0, 'la jugada decisiva siempre es un error del PERDEDOR (' + decisivaDelGanador + ' del ganador)');
  t(valores === 0, 'la decisiva cambia el valor teórico a favor del ganador (' + valores + ' incoherencias)');
  // ejemplo concreto: 5 (centro) y respuesta en el borde 1: ahí se decidió
  const a = G.analyze([5, 1, 4, 6, 9, 2, 8], 0);   // 0: 5,4,9,8 ; 1: 1,6,2 → la partida real
  t(a.jugadas.length === 7 && a.jugadas[0].antes === 0 && a.jugadas[0].despues === 0, 'el primer 5 mantiene el empate');
  t(a.jugadas[1].error && a.jugadas[1].antes === 0 && a.jugadas[1].despues === 1, 'la respuesta 1 (borde) es un error: pasa de empate a ganar el primero');
}

console.log('\nRESULTADO: ' + ok + ' ok, ' + ko + ' fallos');
process.exit(ko ? 1 : 0);
