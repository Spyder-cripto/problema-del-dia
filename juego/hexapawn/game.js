// hexapawn/game.js — lógica pura de Hexapawn y de la «máquina de cajas de cerillas» de Martin Gardner.
// Sin DOM: se puede probar en Node (ver test.mjs). Las reglas y el mecanismo de aprendizaje son los del original:
//  · una cuenta por cada jugada legal de la caja (posición),
//  · el robot saca una cuenta al azar y hace esa jugada,
//  · si pierde, se quita la cuenta de la ÚLTIMA jugada que hizo,
//  · una caja sin cuentas significa que el robot se rinde en esa posición.
// Tablero 3×3, índices 0..8 por filas (0 = a3 arriba a la izquierda). Blancas (W) empiezan abajo y suben.

export const W = 'W', B = 'B';
export const files = 'abc';
export const opp = s => (s === W ? B : W);
export const name = i => files[i % 3] + (3 - Math.floor(i / 3));
export const mirIdx = i => Math.floor(i / 3) * 3 + (2 - (i % 3));

export function start() {
  const b = Array(9).fill(null);
  for (let c = 0; c < 3; c++) { b[c] = B; b[6 + c] = W; }
  return b;
}

// jugadas legales [desde, hasta]: avance a casilla libre o captura en diagonal hacia delante
export function legal(b, side) {
  const dir = side === W ? -3 : 3, o = opp(side), out = [];
  for (let i = 0; i < 9; i++) {
    if (b[i] !== side) continue;
    const f = i + dir, col = i % 3;
    if (f < 0 || f > 8) continue;
    if (b[f] === null) out.push([i, f]);
    if (col > 0 && b[f - 1] === o) out.push([i, f - 1]);
    if (col < 2 && b[f + 1] === o) out.push([i, f + 1]);
  }
  return out;
}

export function apply(b, m) { const n = b.slice(); n[m[1]] = n[m[0]]; n[m[0]] = null; return n; }

// ganador (bando) tras mover `mover`, o null: llega al fondo, captura todo o deja al rival sin movimientos
export function outcome(b, mover) {
  const far = mover === W ? 0 : 2;
  for (let i = 0; i < 9; i++) if (b[i] === mover && Math.floor(i / 3) === far) return mover;
  const o = opp(mover);
  if (!b.includes(o)) return mover;
  if (legal(b, o).length === 0) return mover;
  return null;
}

export const key = b => b.map(x => x || '.').join('');

// posición canónica por simetría de espejo (izquierda↔derecha): la menor de las dos claves
export function canon(b) {
  const m = Array(9).fill(null);
  for (let i = 0; i < 9; i++) m[mirIdx(i)] = b[i];
  const k1 = key(b), k2 = key(m);
  return k2 < k1 ? { ck: k2, cb: m, mir: true } : { ck: k1, cb: b, mir: false };
}

// ---------- el cerebro del robot ----------
export function newBrains() { return { W: {}, B: {} }; }

// caja de la posición b para el bando `side` (se crea la primera vez que se ve)
export function getBox(brains, side, b) {
  const { ck, cb, mir } = canon(b);
  let box = brains[side][ck];
  if (!box) {
    box = { board: cb, beads: {}, order: [] };
    legal(cb, side).forEach(m => { const k = m[0] + '-' + m[1]; box.beads[k] = 1; box.order.push(k); });
    brains[side][ck] = box;
  }
  return { box, ck, mir };
}

// elige una jugada: devuelve {mv, ck, k} (mv en coordenadas REALES) o {resign:true, ck}
export function robotChoose(brains, side, b, rnd = Math.random) {
  const { box, ck, mir } = getBox(brains, side, b);
  const keys = box.order.filter(k => box.beads[k] > 0);
  let total = 0; keys.forEach(k => { total += box.beads[k]; });
  if (total === 0) return { resign: true, ck };
  let r = rnd() * total, pick = keys[0];
  for (const k of keys) { r -= box.beads[k]; if (r < 0) { pick = k; break; } }
  const [a, c] = pick.split('-').map(Number);
  const mv = mir ? [mirIdx(a), mirIdx(c)] : [a, c];
  return { mv, ck, k: pick };
}

// castigo: quita una cuenta de la última jugada del robot (`trail` = sus jugadas en esta partida)
export function punish(brains, side, trail) {
  const t = trail[trail.length - 1];
  if (!t) return;
  const box = brains[side][t.ck];
  if (box && box.beads[t.k] > 0) box.beads[t.k] -= 1;
}

// una partida de entrenamiento: el robot (`rside`) contra un rival que mueve al azar. Devuelve el ganador.
export function trainOnce(brains, rside, rnd = Math.random) {
  let b = start(), t = W; const tr = [];
  let w = null, guard = 0;
  while (!w && guard++ < 50) {
    if (t === rside) {
      const ch = robotChoose(brains, rside, b, rnd);
      if (ch.resign) { w = opp(rside); break; }
      tr.push({ ck: ch.ck, k: ch.k });
      b = apply(b, ch.mv);
      w = outcome(b, rside);
    } else {
      const ms = legal(b, t);
      const m = ms[Math.floor(rnd() * ms.length)];
      b = apply(b, m);
      w = outcome(b, t);
    }
    t = opp(t);
  }
  if (w !== rside) punish(brains, rside, tr);
  return w;
}

// ---------- guardar / restaurar (validado: un almacenamiento manipulado nunca rompe el juego) ----------
export function serialize(brains, stats) {
  return JSON.stringify({ v: 1, brains, stats: { games: stats.games, robot: stats.robot, you: stats.you, seq: stats.seq.slice(-200) } });
}

const isCount = n => Number.isInteger(n) && n >= 0 && n <= 1000000;

function cleanBrain(raw, side) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const ck of Object.keys(raw)) {
    const box = raw[ck];
    if (!/^[.WB]{9}$/.test(ck) || !box || !Array.isArray(box.order) || !box.beads || typeof box.beads !== 'object') continue;
    // la clave debe ser canónica y el tablero de la caja debe coincidir con ella
    const cb = ck.split('').map(x => (x === '.' ? null : x));
    if (canon(cb).ck !== ck) continue;
    // las jugadas de la caja deben ser EXACTAMENTE las legales de esa posición, cada una con una cuenta válida
    const want = legal(cb, side).map(m => m[0] + '-' + m[1]);
    if (box.order.length !== want.length || !want.every((k, i) => box.order[i] === k)) continue;
    if (!want.every(k => isCount(box.beads[k]))) continue;
    const beads = {}; want.forEach(k => { beads[k] = box.beads[k]; });
    out[ck] = { board: cb, beads, order: want.slice() };
  }
  return out;
}

// devuelve {brains, stats} o null si no hay nada aprovechable
export function restore(text) {
  let d;
  try { d = JSON.parse(text); } catch (e) { return null; }
  if (!d || d.v !== 1 || !d.brains || !d.stats) return null;
  const brains = { W: cleanBrain(d.brains.W, W), B: cleanBrain(d.brains.B, B) };
  const s = d.stats;
  if (![s.games, s.robot, s.you].every(isCount)) return null;
  const seq = Array.isArray(s.seq) ? s.seq.filter(x => x === 'r' || x === 'h').slice(-200) : [];
  return { brains, stats: { games: s.games, robot: s.robot, you: s.you, seq } };
}
