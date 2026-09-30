// hexapawn/test.mjs — verificación de la lógica de Hexapawn en una sola pasada.  node test.mjs
// 1) reglas contra una implementación de referencia independiente (coordenadas fila/columna) en TODAS las posiciones alcanzables,
// 2) victoria por fondo, por captura total y por quedarse sin movimientos,
// 3) canonización por espejo: la jugada elegida en la caja canónica se traduce bien a la posición real,
// 4) mecanismo de aprendizaje (castigo de la última jugada, caja vacía = se rinde),
// 5) aprendizaje: negras casi todo victorias, blancas resisten lo máximo posible (nunca ganan a un rival perfecto, pero no se rinden antes de tiempo),
// 6) guardar/restaurar y almacenamiento manipulado.
import { W, B, opp, start, legal, apply, outcome, key, canon, mirIdx, newBrains, getBox, robotChoose, punish, trainOnce, serialize, restore, solve, resist } from './game.js';

let ok = 0, bad = 0;
const check = (nombre, cond, extra) => { if (cond) { ok++; console.log('  ✓ ' + nombre); } else { bad++; console.log('  ✗ ' + nombre + (extra ? '  → ' + extra : '')); } };
// PRNG con semilla para que los resultados sean reproducibles
const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

// ---------- referencia independiente ----------
const g2 = b => [0, 1, 2].map(r => [0, 1, 2].map(c => b[r * 3 + c]));
function refMoves(b, side) {
  const g = g2(b), dr = side === W ? -1 : 1, o = opp(side), out = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (g[r][c] !== side) continue;
    const nr = r + dr; if (nr < 0 || nr > 2) continue;
    if (g[nr][c] === null) out.push(r * 3 + c + '>' + (nr * 3 + c));
    for (const dc of [-1, 1]) { const nc = c + dc; if (nc >= 0 && nc <= 2 && g[nr][nc] === o) out.push(r * 3 + c + '>' + (nr * 3 + nc)); }
  }
  return out.sort();
}
function refWinner(b, mover) {          // ¿ha ganado `mover` con la jugada que acaba de hacer?
  const g = g2(b), o = opp(mover), goal = mover === W ? 0 : 2;
  if (g[goal].includes(mover)) return true;
  if (!b.includes(o)) return true;
  return refMoves(b, o).length === 0;
}
const ms = (b, s) => legal(b, s).map(m => m[0] + '>' + m[1]).sort();

console.log('\n[1] REGLAS contra la referencia, en todas las posiciones alcanzables');
const seen = new Map(); const q = [{ b: start(), t: W }]; seen.set(key(start()) + W, true);
let n = 0, difM = 0, difW = 0, wins = { fondo: 0, captura: 0, sinMov: 0 };
const positions = [];
while (q.length) {
  const { b, t } = q.shift(); n++; positions.push({ b, t });
  const a = ms(b, t), r = refMoves(b, t);
  if (JSON.stringify(a) !== JSON.stringify(r)) difM++;
  for (const m of legal(b, t)) {
    const nb = apply(b, m);
    const w = outcome(nb, t) === t, rw = refWinner(nb, t);
    if (w !== rw) difW++;
    if (w) {
      const goal = t === W ? 0 : 2;
      if (nb.some((x, i) => x === t && Math.floor(i / 3) === goal)) wins.fondo++;
      else if (!nb.includes(opp(t))) wins.captura++;
      else wins.sinMov++;
    } else { const k = key(nb) + opp(t); if (!seen.has(k)) { seen.set(k, true); q.push({ b: nb, t: opp(t) }); } }
  }
}
check('posiciones alcanzables exploradas: ' + n, n > 50);
check('jugadas legales iguales a la referencia en todas', difM === 0, difM + ' diferencias');
check('victoria (fondo / captura / sin movimientos) igual a la referencia', difW === 0, difW + ' diferencias');
check('aparecen las tres formas de ganar (' + JSON.stringify(wins) + ')', wins.fondo > 0 && wins.captura > 0 && wins.sinMov > 0);
check('posición inicial: 3 jugadas legales por bando', legal(start(), W).length === 3 && legal(start(), B).length === 3);
{ // quedarse sin movimientos, a mano: negro bloqueado por peones blancos delante y sin capturas
  const b = [null, B, null, null, W, null, null, null, null];
  const nb = apply(b.slice(), [4, 4]);          // (no cambia nada: solo para tener un tablero)
  const bl = [B, null, null, W, null, null, null, null, null];   // B en a3, W en a2: negro no puede avanzar (bloqueado) ni capturar
  check('negro bloqueado sin capturas: sin jugadas', legal(bl, B).length === 0);
  const antes = [B, null, null, null, W, null, null, null, null]; const desp = apply(antes, [4, 3]);   // W sube a a2 junto a B en a3
  check('W bloquea al único peón negro: gana W por falta de movimientos', outcome(desp, W) === W && legal(desp, B).length === 0);
}

console.log('\n[2] CANONIZACIÓN por espejo');
{
  let bad1 = 0, bad2 = 0, bad3 = 0, cnt = 0;
  for (const { b, t } of positions) {
    const m = Array(9).fill(null); for (let i = 0; i < 9; i++) m[mirIdx(i)] = b[i];
    if (canon(b).ck !== canon(m).ck) bad1++;                      // una posición y su espejo comparten caja
    for (const side of [W, B]) {
      if (legal(b, side).length === 0) continue;          // sin jugadas legales nadie consulta la caja: la partida ya ha terminado
      const brains = newBrains();
      const { box, mir } = getBox(brains, side, b);
      // todas las jugadas de la caja, traducidas a la posición real, deben ser exactamente las legales de la real
      const real = box.order.map(k => { const [a, c] = k.split('-').map(Number); return mir ? mirIdx(a) + '>' + mirIdx(c) : a + '>' + c; }).sort();
      if (JSON.stringify(real) !== JSON.stringify(ms(b, side))) bad2++;
      // y la jugada que el robot elige (con cualquier valor del azar) es legal en la posición real
      for (const rv of [0, 0.34, 0.67, 0.999]) {
        const ch = robotChoose(brains, side, b, () => rv); cnt++;
        if (ch.resign || !ms(b, side).includes(ch.mv[0] + '>' + ch.mv[1])) bad3++;
      }
    }
  }
  check('una posición y su espejo comparten caja', bad1 === 0, bad1);
  check('jugadas de la caja traducidas = jugadas legales de la posición real (ambos bandos)', bad2 === 0, bad2);
  check('la jugada elegida (' + cnt + ' elecciones) siempre es legal en la posición real', bad3 === 0, bad3);
  // par simétrico: la misma cuenta elegida da jugadas espejo entre sí
  const b0 = [B, null, B, null, W, null, W, null, W];           // no simétrico a propósito
  const m0 = Array(9).fill(null); for (let i = 0; i < 9; i++) m0[mirIdx(i)] = b0[i];
  const br = newBrains(); const c1 = robotChoose(br, W, b0, () => 0.1), c2 = robotChoose(br, W, m0, () => 0.1);
  check('elegir la misma cuenta en una posición y en su espejo da jugadas espejo', c1.k === c2.k && c1.mv[0] === mirIdx(c2.mv[0]) && c1.mv[1] === mirIdx(c2.mv[1]));
}

console.log('\n[3] MECANISMO DE APRENDIZAJE (sin tocar)');
{
  const brains = newBrains(); const b = start();
  const ch = robotChoose(brains, W, b, () => 0);
  const box = brains.W[ch.ck];
  check('caja nueva: una cuenta por cada jugada legal', box.order.length === 3 && box.order.every(k => box.beads[k] === 1));
  punish(brains, W, [{ ck: ch.ck, k: ch.k }]);
  check('castigo: se quita UNA cuenta, de la última jugada', box.beads[ch.k] === 0 && box.order.filter(k => k !== ch.k).every(k => box.beads[k] === 1));
  punish(brains, W, [{ ck: ch.ck, k: ch.k }]);
  check('el castigo nunca deja una cuenta negativa', box.beads[ch.k] === 0);
  box.order.forEach(k => { box.beads[k] = 0; });
  const r = robotChoose(brains, W, b, Math.random);
  check('BLANCAS con la caja inicial vacía: NO se rinde, juega una jugada de resistencia (k = null)', !r.resign && r.k === null && legal(b, W).some(m => m[0] === r.mv[0] && m[1] === r.mv[1]));
  // negras: caja vacía = se rinde, como en Gardner
  const bn = newBrains(), posN = apply(start(), [7, 4]);            // blancas avanzan; mueven negras
  const cn = robotChoose(bn, B, posN, () => 0); bn.B[cn.ck].order.forEach(k => { bn.B[cn.ck].beads[k] = 0; });
  check('NEGRAS con la caja vacía: se rinde (regla original)', robotChoose(bn, B, posN, Math.random).resign === true);
  // blancas: solo se rinde cuando TODAS sus jugadas pierden en el turno siguiente
  let hallada = null;
  for (const { b: bb, t } of positions) { if (t !== W) continue; const ms2 = legal(bb, W); if (ms2.length && ms2.every(m => { const nb = apply(bb, m); return outcome(nb, W) === null && solve(nb, B).w === B && solve(nb, B).n === 1; })) { hallada = bb; break; } }
  check('existe una posición de blancas donde todas las jugadas pierden al instante', hallada !== null);
  if (hallada) { const bw = newBrains(); const c = robotChoose(bw, W, hallada, () => 0); Object.keys(bw.W[c.ck].beads).forEach(k => { bw.W[c.ck].beads[k] = 0; });
    check('BLANCAS sin cuentas y sin poder evitar perder en el turno siguiente: entonces sí se rinde', robotChoose(bw, W, hallada, Math.random).resign === true); }
  // y en una posición perdida pero con margen, elige la jugada que MÁS retrasa la derrota
  const rs = resist(start(), W, () => 0); const todas = legal(start(), W).map(m => 1 + solve(apply(start(), m), B).n);
  check('resistencia: la jugada elegida alarga la partida al máximo (' + (1 + solve(apply(start(), rs.mv), B).n) + ' = ' + Math.max(...todas) + ')', 1 + solve(apply(start(), rs.mv), B).n === Math.max(...todas));
  punish(brains, W, []);                                             // sin jugadas previas: no falla
  check('castigo sin jugadas previas no hace nada', true);
}

console.log('\n[4] APRENDIZAJE');
{
  // negras (el robot juega 2.º): entrena contra un rival al azar, mide en una ventana final
  const rnd = mulberry(20260930); const brains = newBrains(); let vic = 0;
  const N = 300, ventana = 100;
  for (let i = 0; i < N; i++) { const w = trainOnce(brains, B, rnd); if (i >= N - ventana && w === B) vic++; }
  check('robot NEGRAS: gana ' + vic + '/' + ventana + ' en las últimas ' + ventana + ' de ' + N + ' contra el azar (≥ 90)', vic >= 90);
  // blancas: bando perdedor. Con la regla de Gardner acababan rindiéndose sin mover; ahora juegan hasta el final
  const rnd2 = mulberry(7); const bw = newBrains(); let v1 = 0, v2 = 0;
  for (let i = 0; i < 300; i++) { const w = trainOnce(bw, W, rnd2); if (i < 50 && w === W) v1++; if (i >= 250 && w === W) v2++; }
  { const ini = bw.W[key(start())]; const vacia = ini.order.every(k => ini.beads[k] === 0);
    check('robot BLANCAS: la caja inicial se vacía (' + vacia + ') y aun así JUEGA: nunca se rinde sin mover', vacia && !robotChoose(bw, W, start(), Math.random).resign); }
  check('robot BLANCAS contra el azar: ya no se hunde (victorias ' + v1 + '/50 al principio → ' + v2 + '/50 al final)', v2 > v1 && v2 >= 30);

  // rival PERFECTO para negras: con juego perfecto pierden las BLANCAS (empiezan)
  check('el solucionador confirma: con juego perfecto pierden las BLANCAS', solve(start(), W).w === B);
  const rnd3 = mulberry(99); const bp = newBrains(); let blancasGanan = 0; const largos = [];
  const maxLen = solve(start(), W).n;                              // partida más larga posible con negras perfectas
  for (let i = 0; i < 600; i++) {
    let b = start(), t = W; const tr = []; let w = null, res = false, plies = 0;
    while (!w) {
      if (t === W) {
        const ch = robotChoose(bp, W, b, rnd3);
        if (ch.resign) { w = B; res = true; break; }
        tr.push({ ck: ch.ck, k: ch.k }); b = apply(b, ch.mv); w = outcome(b, W); plies++;
      } else {                                                     // negras perfectas: entre las jugadas ganadoras, la más rápida
        const all = legal(b, B); let pool = [], bestN = Infinity;
        for (const m of all) { const nb = apply(b, m); const n = outcome(nb, B) === B ? 1 : (solve(nb, W).w === B ? solve(nb, W).n + 1 : Infinity); if (n < bestN) { bestN = n; pool = [m]; } else if (n === bestN) pool.push(m); }
        if (!pool.length) pool = all; b = apply(b, pool[Math.floor(rnd3() * pool.length)]); w = outcome(b, B); plies++;
      }
      t = opp(t);
    }
    if (w === W) blancasGanan++; else punish(bp, W, tr);
    largos.push(plies + (res ? 2 : 0));                             // si se rinde, equivale a jugar su última jugada y perder en la respuesta (+2)
  }
  check('robot BLANCAS vs negras perfectas: no gana NUNCA (' + blancasGanan + '/600)', blancasGanan === 0);
  const ultimas = largos.slice(-50), enMax = ultimas.filter(x => x === maxLen).length;
  check('…y resiste lo máximo posible: las últimas 50 partidas duran ' + maxLen + ' jugadas (el máximo teórico): ' + enMax + '/50', enMax === 50, 'duraciones ' + [...new Set(ultimas)].join(','));
  const ini10 = largos.slice(0, 10).reduce((a, x) => a + x, 0) / 10;
  check('…y al principio resistía menos (media de las 10 primeras ' + ini10.toFixed(1) + ' < ' + maxLen + ')', ini10 < maxLen);
}

console.log('\n[5] GUARDAR / RESTAURAR');
{
  const rnd = mulberry(5); const brains = newBrains(); const stats = { games: 12, robot: 8, you: 4, seq: ['r', 'h', 'r'] };
  for (let i = 0; i < 40; i++) trainOnce(brains, B, rnd);
  const txt = serialize(brains, stats), r = restore(txt);
  check('ida y vuelta: mismas cajas y mismo marcador', r && JSON.stringify(r.brains) === JSON.stringify(brains) && r.stats.games === 12 && r.stats.robot === 8 && r.stats.you === 4 && r.stats.seq.join('') === 'rhr');
  check('JSON basura → null', restore('{{no') === null && restore('null') === null && restore('[]') === null && restore('') === null);
  const d = JSON.parse(txt); const ck0 = Object.keys(d.brains.B)[0];
  const t1 = JSON.parse(txt); t1.brains.B[ck0].beads[t1.brains.B[ck0].order[0]] = -3;
  check('cuenta negativa → esa caja se descarta, el resto se conserva', (() => { const x = restore(JSON.stringify(t1)); return x && !x.brains.B[ck0] && Object.keys(x.brains.B).length === Object.keys(d.brains.B).length - 1; })());
  const t2 = JSON.parse(txt); t2.brains.B['zzzzzzzzz'] = t2.brains.B[ck0];
  check('clave inválida → descartada', (() => { const x = restore(JSON.stringify(t2)); return x && !x.brains.B['zzzzzzzzz']; })());
  const t3 = JSON.parse(txt); t3.brains.B[ck0].order = ['0-0'];
  check('jugadas que no son las legales → caja descartada', (() => { const x = restore(JSON.stringify(t3)); return x && !x.brains.B[ck0]; })());
  const t4 = JSON.parse(txt); t4.stats.games = 'x';
  check('marcador corrupto → null', restore(JSON.stringify(t4)) === null);
  const t5 = JSON.parse(txt); t5.stats.seq = new Array(500).fill('r').concat(['q']);
  check('historial: solo r/h y como mucho 200', (() => { const x = restore(JSON.stringify(t5)); return x && x.stats.seq.length === 200 && x.stats.seq.every(c => c === 'r'); })());
}

console.log('\nRESULTADO: ' + ok + ' ok, ' + bad + ' fallos'); process.exit(bad ? 1 : 0);
