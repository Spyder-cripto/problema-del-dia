// hexapawn/main.js — interfaz de Hexapawn (la máquina de cajas de cerillas de Gardner).
// Autocontenido: no usa el motor _engine/ (solo su hoja de estilo). La lógica vive en game.js (probada en test.mjs).
import { W, B, opp, name, start, legal, apply, outcome, canon, newBrains, robotChoose, punish, trainOnce, getBox, serialize, restore } from './game.js';

const STORE_KEY = 'problema-del-dia.hexapawn.v1';
const COLORS = ['var(--hx-c0)', 'var(--hx-c1)', 'var(--hx-c2)', 'var(--hx-c3)', 'var(--hx-c4)', 'var(--hx-c5)'];
const PAWN = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="7" r="4"/><path d="M8.2 19.5c.2-4.6 2.2-6 3.8-8.7 1.6 2.700 3.600 4.100 3.800 8.700z"/><rect x="6.500" y="19" width="11" height="2.400" rx="1.200"/></svg>';

const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- estado ----------
let brains = newBrains();
const stats = { games: 0, robot: 0, you: 0, seq: [] };
let board, turn, human, robot, over, selected, trail, lastMove, currentKey, snaps, timer = null;

// ---------- persistencia (siempre dentro de try/catch: modo privado, cuota, almacenamiento bloqueado) ----------
function save() {
  try { localStorage.setItem(STORE_KEY, serialize(brains, stats)); } catch (e) { /* sin almacenamiento: se juega igual */ }
}
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return false;
    const r = restore(raw);
    if (!r) return false;
    brains = r.brains; stats.games = r.stats.games; stats.robot = r.stats.robot; stats.you = r.stats.you; stats.seq = r.stats.seq;
    return true;
  } catch (e) { return false; }
}
function wipeStorage() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* nada */ } }

// ---------- DOM ----------
root.innerHTML = '';
const wrap = h('div', 'wrap');
const header = h('header');
header.appendChild(h('h1', null, 'Hexapawn'));
header.appendChild(h('p', 'sub', 'La máquina de cajas de cerillas de Martin Gardner: un robot que empieza sin saber nada y aprende de cada derrota.'));
const back = h('a', 'back', '← Volver a los juegos'); back.href = '../'; header.appendChild(back);
wrap.appendChild(header);

// tablero
const card = h('div', 'card');
const status = h('div', 'hx-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
card.appendChild(status);
const bw = h('div', 'hx-boardwrap');
const ranks = h('div', 'hx-ranks'); ['3', '2', '1'].forEach(t => ranks.appendChild(h('span', null, t))); ranks.setAttribute('aria-hidden', 'true');
const boardEl = h('div', 'hx-board'); boardEl.setAttribute('role', 'group'); boardEl.setAttribute('aria-label', 'Tablero de Hexapawn, 3 por 3. Casillas de a3 arriba a la izquierda a c1 abajo a la derecha.');
const fl = h('div', 'hx-files'); ['a', 'b', 'c'].forEach(t => fl.appendChild(h('span', null, t))); fl.setAttribute('aria-hidden', 'true');
bw.appendChild(ranks); bw.appendChild(boardEl); bw.appendChild(fl);
card.appendChild(bw);
const cells = [];
for (let i = 0; i < 9; i++) {
  const r = Math.floor(i / 3), c = i % 3;
  const d = h('button', 'hx-cell ' + (((r + c) % 2 === 0) ? 'l' : 'd')); d.type = 'button';
  d.addEventListener('click', () => onCell(i));
  boardEl.appendChild(d); cells.push(d);
}
const ctrl = h('div', 'hx-ctrl');
const bNew = h('button', 'primary', 'Nueva partida'); bNew.type = 'button';
const sideSel = h('select'); sideSel.setAttribute('aria-label', 'Tu bando');
[['W', 'Tú: blancas (empiezas)'], ['B', 'Tú: negras (empieza el robot)']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; sideSel.appendChild(o); });
const bUndo = h('button', null, '↶ Deshacer'); bUndo.type = 'button';
ctrl.appendChild(bNew); ctrl.appendChild(sideSel); ctrl.appendChild(bUndo);
card.appendChild(ctrl);
const whiteNote = h('p', 'hx-note', 'Ojo: si eliges negras, el robot juega con blancas, que es el bando que pierde con juego perfecto. Con la regla original de Gardner acabaría rindiéndose ya en el primer movimiento. Aquí está cambiado a propósito: con blancas, cuando una caja se vacía el robot no se rinde; juega la jugada que más retrasa la derrota (o la que gana, si la hay) y solo se rinde cuando ya no puede evitar perder en el turno siguiente.');
whiteNote.hidden = true;
card.appendChild(whiteNote);
const rules = h('p', 'hx-intro');
rules.innerHTML = '<b>Reglas.</b> Un peón avanza una casilla hacia delante si está libre, o captura en diagonal hacia delante. Gana quien llegue a la fila del fondo, capture todos los peones rivales o deje al rival sin movimientos. No hay tablas. Toca un peón y luego la casilla de destino.';
card.appendChild(rules);
wrap.appendChild(card);

// marcador
const card2 = h('div', 'card');
card2.appendChild(h('h2', null, 'Marcador'));
const st = h('div', 'hx-stats');
const mk = (label) => { const d = h('div', 'hx-stat'); const b = h('b', null, '0'); d.appendChild(b); d.appendChild(h('span', null, label)); st.appendChild(d); return b; };
const sGames = mk('partidas'), sRobot = mk('gana el robot'), sYou = mk('ganas tú');
card2.appendChild(st);
const legend = h('div', 'hx-legend'); legend.innerHTML = '<i style="background:var(--accent)"></i>robot<i style="background:var(--azul)"></i>tú (últimas 200 partidas)';
card2.appendChild(legend);
const hist = h('div', 'hx-hist'); hist.setAttribute('aria-hidden', 'true'); card2.appendChild(hist);
const ctrl2 = h('div', 'hx-ctrl');
const bTrain = h('button', null, 'Entrenar 50 partidas (rival aleatorio)'); bTrain.type = 'button';
const bReset = h('button', null, 'Borrar la memoria del robot'); bReset.type = 'button';
ctrl2.appendChild(bTrain); ctrl2.appendChild(bReset);
card2.appendChild(ctrl2);
card2.appendChild(h('p', 'hx-note', 'El entrenamiento pone a un rival que mueve al azar contra el robot para que acumule experiencia rápido. Contra ti aprende de verdad: si juegas bien, en pocas derrotas se vuelve casi imbatible como segundo jugador. La memoria se guarda en este navegador.'));
wrap.appendChild(card2);

// cerebro
const card3 = h('div', 'card');
const h2b = h('h2'); h2b.appendChild(document.createTextNode('Cerebro del robot: ')); const nBoxes = h('span', null, '0'); h2b.appendChild(nBoxes); h2b.appendChild(document.createTextNode(' cajas usadas'));
card3.appendChild(h2b);
const bp = h('p', 'hx-intro'); bp.style.marginTop = '0';
bp.innerHTML = 'Cada caja es una posición. Dentro hay una cuenta por cada jugada legal (el círculo de color marca la casilla de destino). El robot saca una cuenta al azar y hace esa jugada. Si pierde, tira la cuenta de la <b>última</b> jugada que hizo; si una caja se queda vacía, el robot se rinde en esa posición (con blancas no: ahí juega la jugada que más retrasa la derrota). Peones del mini-tablero: claro = blancas, oscuro = negras. Se resalta en naranja lo consultado en la partida actual.';
card3.appendChild(bp);
const brainsEl = h('div', 'hx-brains'); card3.appendChild(brainsEl);
wrap.appendChild(card3);

const foot = h('footer'); foot.innerHTML = 'Martin Gardner, «El Gran Libro de las Matemáticas», cap. 35 · <a href="../">Juegos</a> · <a href="../../">El problema del día</a>';
wrap.appendChild(foot);
root.appendChild(wrap);

// ---------- partida ----------
function setStatus(t, cls) { status.textContent = t; status.className = 'hx-status ' + (cls || ''); }
function clearTimer() { if (timer !== null) { clearTimeout(timer); timer = null; } }
function later(fn, ms) { clearTimer(); timer = setTimeout(() => { timer = null; fn(); }, ms); }

function newGame() {
  clearTimer();
  human = sideSel.value; robot = opp(human);
  whiteNote.hidden = human !== B;
  board = start(); turn = W; over = false; selected = null; trail = []; lastMove = null; currentKey = null; snaps = [];
  if (turn === human) {
    setStatus('Empiezas tú (blancas). Elige un peón.', ''); snaps.push({ board: board.slice(), lastMove: null, trailLen: 0 });
  } else setStatus('El robot mueve primero…', '');
  draw(); drawBrains();
  if (turn === robot) later(robotTurn, 450);
}

function robotTurn() {
  if (over || turn !== robot) return;
  const ch = robotChoose(brains, robot, board);
  currentKey = ch.ck;
  if (ch.resign) { finish(human, true); return; }
  trail.push({ ck: ch.ck, k: ch.k });
  board = apply(board, ch.mv); lastMove = ch.mv;
  const w = outcome(board, robot);
  if (w) { finish(w, false); return; }
  turn = human;
  snaps.push({ board: board.slice(), lastMove: lastMove, trailLen: trail.length });
  setStatus('Tu turno. Elige un peón.', ''); draw(); drawBrains();
}

function record(w) {
  stats.games++;
  if (w === robot) { stats.robot++; stats.seq.push('r'); } else { stats.you++; stats.seq.push('h'); }
  if (stats.seq.length > 200) stats.seq = stats.seq.slice(-200);
}
function finish(w, resigned) {
  over = true; turn = null; selected = null;
  if (w !== robot) punish(brains, robot, trail);
  record(w);
  if (w === robot) setStatus('Gana el robot. Esta vez no pierde ninguna cuenta.', 'lose');
  else setStatus(resigned ? (robot === W ? '¡El robot se rinde! Con blancas ha retrasado la derrota todo lo que ha podido, pero ya no puede evitarla. Ganas tú.' : '¡El robot se rinde! Esa posición ya no tiene jugadas seguras. Ganas tú.') : '¡Ganas tú! El robot pierde una cuenta de la última caja.', 'win');
  save(); draw(); drawBrains(); updateStats();
}

function onCell(i) {
  if (over || turn !== human) return;
  const moves = legal(board, human);
  if (board[i] === human) {
    if (moves.some(m => m[0] === i)) { selected = (selected === i) ? null : i; draw(); }
    return;
  }
  if (selected !== null) {
    const m = moves.find(x => x[0] === selected && x[1] === i);
    if (!m) return;
    board = apply(board, m); lastMove = m; selected = null;
    const w = outcome(board, human);
    if (w) { finish(w, false); return; }
    turn = robot; setStatus('Piensa el robot…', ''); draw();
    later(robotTurn, 500);
  }
}

// deshacer: vuelve al inicio de tu turno anterior (solo en tu turno y con la partida en marcha)
function undo() {
  if (over || turn !== human || snaps.length < 2) return;
  snaps.pop();
  const s = snaps[snaps.length - 1];
  board = s.board.slice(); lastMove = s.lastMove; trail.length = s.trailLen; selected = null;
  setStatus('Jugada deshecha. Tu turno.', ''); draw(); drawBrains();
}

// ---------- render ----------
function draw() {
  const moves = (turn === human && !over) ? legal(board, human) : [];
  for (let i = 0; i < 9; i++) {
    const d = cells[i];
    const base = 'hx-cell ' + ((((Math.floor(i / 3)) + (i % 3)) % 2 === 0) ? 'l' : 'd');
    let cls = base, extra = '';
    const movable = moves.some(m => m[0] === i);
    const target = selected !== null && moves.some(m => m[0] === selected && m[1] === i);
    if (selected === i) { cls += ' sel'; extra = ', seleccionado'; }
    if (lastMove && lastMove[1] === i) cls += ' last';
    if (target) { cls += ' tgt can'; if (board[i]) cls += ' cap'; extra = board[i] ? ', captura posible' : ', destino posible'; }
    if (movable) cls += ' can';
    d.className = cls;
    d.innerHTML = board[i] ? '<div class="hx-pawn ' + board[i] + '">' + PAWN + '</div>' : '';
    const what = board[i] ? (board[i] === W ? 'peón blanco' : 'peón negro') : 'vacía';
    d.setAttribute('aria-label', name(i) + ', ' + what + (movable && selected !== i ? ', se puede mover' : '') + extra);
    d.setAttribute('aria-pressed', selected === i ? 'true' : 'false');
    d.setAttribute('aria-disabled', (movable || target) ? 'false' : 'true');
  }
  bUndo.disabled = over || turn !== human || snaps.length < 2;
}

function drawBrains() {
  brainsEl.innerHTML = '';
  const side = robot || opp(sideSel.value);
  const openKeys = new Set(trail.map(t => t.ck)); if (currentKey) openKeys.add(currentKey);
  const entries = Object.entries(brains[side]);
  nBoxes.textContent = entries.length;
  entries.sort((a, b) => (openKeys.has(b[0]) - openKeys.has(a[0])));
  if (!entries.length) { brainsEl.appendChild(h('p', 'hx-note', 'Aún no hay cajas: aparecerán a medida que el robot encuentre posiciones nuevas.')); return; }
  for (const [ck, box] of entries) {
    const total = box.order.reduce((s, k) => s + box.beads[k], 0);
    const el = h('div', 'hx-box' + (openKeys.has(ck) ? ' open' : '') + (total === 0 ? ' dead' : ''));
    const targets = {};
    box.order.forEach((k, idx) => { if (box.beads[k] > 0) targets[k.split('-')[1]] = COLORS[idx % COLORS.length]; });
    let mini = '<div class="hx-mini" aria-hidden="true">';
    for (let i = 0; i < 9; i++) {
      const r = Math.floor(i / 3), c = i % 3, t = targets[i];
      mini += '<div class="' + (((r + c) % 2 === 0) ? 'l' : 'd') + '">' + (box.board[i] ? '<span class="p ' + box.board[i] + '"></span>' : '') + (t ? '<span class="mv" style="background:' + t + '"></span>' : '') + '</div>';
    }
    mini += '</div>';
    let beads = '<div class="hx-beads">';
    box.order.forEach((k, idx) => {
      const [a, c] = k.split('-').map(Number), n = box.beads[k];
      beads += '<span class="hx-chip' + (n === 0 ? ' z' : '') + '" style="background:' + COLORS[idx % COLORS.length] + '">' + name(a) + '→' + name(c) + ' ×' + n + '</span>';
    });
    beads += '</div>';
    el.innerHTML = mini + beads + '<div class="hx-empty">' + (total === 0 ? (side === W ? 'caja vacía: retrasa la derrota' : 'caja vacía: se rinde') : '') + '</div>';
    brainsEl.appendChild(el);
  }
}

function updateStats() {
  sGames.textContent = stats.games; sRobot.textContent = stats.robot; sYou.textContent = stats.you;
  hist.innerHTML = '';
  stats.seq.slice(-200).forEach(x => { const i = document.createElement('i'); i.className = x; hist.appendChild(i); });
}

// ---------- eventos ----------
bNew.addEventListener('click', newGame);
sideSel.addEventListener('change', newGame);
bUndo.addEventListener('click', undo);
bTrain.addEventListener('click', () => {
  human = sideSel.value; robot = opp(human);
  for (let i = 0; i < 50; i++) {
    const w = trainOnce(brains, robot);
    stats.games++;
    if (w === robot) { stats.robot++; stats.seq.push('r'); } else { stats.you++; stats.seq.push('h'); }
  }
  if (stats.seq.length > 200) stats.seq = stats.seq.slice(-200);
  save(); updateStats(); newGame();
});
bReset.addEventListener('click', () => {
  brains = newBrains(); stats.games = 0; stats.robot = 0; stats.you = 0; stats.seq = [];
  wipeStorage(); updateStats(); newGame();
});

load();
updateStats(); newGame();
// ayuda a las pruebas en navegador (no se usa en el juego)
window.__hexapawn = { get brains() { return brains; }, stats, key: STORE_KEY };
