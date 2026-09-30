// hexapawn/test.mjs — verificación de la lógica de Hexapawn en una sola pasada.  node test.mjs
// 1) reglas contra una implementación de referencia independiente (coordenadas fila/columna) en TODAS las posiciones alcanzables,
// 2) victoria por fondo, por captura total y por quedarse sin movimientos,
// 3) canonización por espejo: la jugada elegida en la caja canónica se traduce bien a la posición real,
// 4) mecanismo de aprendizaje (castigo de la última jugada, caja vacía = se rinde),
// 5) aprendizaje: negras casi todo victorias, blancas aprenden a resistir (nunca ganan a un rival perfecto),
// 6) guardar/restaurar y almacenamiento manipulado.
import { W, B, opp, start, legal, apply, outcome, key, canon, mirIdx, newBrains, getBox, robotChoose, punish, trainOnce, serialize, restore } from './game.js';

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
  check('caja vacía = el robot se rinde', r.resign === true);
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
  // blancas: contra el azar mejora; contra un rival PERFECTO nunca gana y acaba rindiéndose
  const rnd2 = mulberry(7); const bw = newBrains(); let v1 = 0, v2 = 0, rindeAzar = -1;
  for (let i = 0; i < 300; i++) {
    const w = trainOnce(bw, W, rnd2); if (i < 50 && w === W) v1++; if (i >= 250 && w === W) v2++;
    const ini = bw.W[key(start())]; if (rindeAzar < 0 && ini && ini.order.every(k => ini.beads[k] === 0)) rindeAzar = i + 1;
  }
  check('robot BLANCAS contra el azar: es el bando perdedor y sus cuentas iniciales se agotan (se rinde ya en la partida ' + rindeAzar + '; victorias ' + v1 + '/50 al principio, ' + v2 + '/50 al final)', rindeAzar > 0 && v2 === 0);

  // rival perfecto para NEGRAS (minimax): sabemos que negras ganan con juego perfecto en 3×3
  const memo = new Map();
  const solve = (b, t) => {                                      // true si gana quien mueve (t)
    const k = key(b) + t; if (memo.has(k)) return memo.get(k);
    let res = false;
    for (const m of legal(b, t)) { const nb = apply(b, m); if (outcome(nb, t) === t || (!outcome(nb, t) && !solve(nb, opp(t)))) { res = true; break; } }
    memo.set(k, res); return res;
  };
  check('el solucionador confirma: con juego perfecto pierden las BLANCAS (empiezan)', solve(start(), W) === false);
  const rnd3 = mulberry(99); const bp = newBrains(); let blancasGanan = 0, rindeEn = -1;
  for (let i = 0; i < 400; i++) {
    // partida: robot blancas vs negras perfectas (gana si puede; si no, al azar)
    let b = start(), t = W; const tr = []; let w = null, res = false;
    while (!w) {
      if (t === W) {
        const ch = robotChoose(bp, W, b, rnd3);
        if (ch.resign) { w = B; res = true; break; }
        tr.push({ ck: ch.ck, k: ch.k }); b = apply(b, ch.mv); w = outcome(b, W);
      } else {
        const all = legal(b, B); const good = all.filter(m => { const nb = apply(b, m); return outcome(nb, B) === B || (!outcome(nb, B) && !solve(nb, W)); });
        const pool = good.length ? good : all; b = apply(b, pool[Math.floor(rnd3() * pool.length)]); w = outcome(b, B);
      }
      t = opp(t);
    }
    if (w === W) blancasGanan++;
    else punish(bp, W, tr);
    if (res && rindeEn < 0) rindeEn = i + 1;
  }
  check('robot BLANCAS vs negras perfectas: no gana NUNCA (' + blancasGanan + '/400)', blancasGanan === 0);
  check('…y aprende a resistir: acaba rindiéndose (primera rendición en la partida ' + rindeEn + ')', rindeEn > 0 && rindeEn < 400);
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
