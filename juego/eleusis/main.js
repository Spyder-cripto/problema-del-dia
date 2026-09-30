// eleusis/main.js — interfaz de Eleusis (El Nuevo Eleusis de Robert Abbott, según Martin Gardner).
// Autocontenido: solo usa la hoja de estilo del hub (_engine/style.css). La lógica vive en game.js (probada en test.mjs).
import { RULES, SUITS, SUIT_NAMES, VALS, EXPEL_AT, pickRule, newRound, toggleSel, playSelection, noPlay, startProphet, prophetAnswer,
  giveUp, cardName, cardShort, newTotals, applyTotals, serialize, restore } from './game.js';

const STORE_KEY = 'problema-del-dia.eleusis.v1';
const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- estado ----------
let S = null, lastRuleId = null, focusCardId = null, focusProphet = false;
let T = newTotals();

// ---------- persistencia (siempre dentro de try/catch: modo privado, cuota, almacenamiento bloqueado) ----------
function save() { try { localStorage.setItem(STORE_KEY, serialize(T)); } catch (e) { /* se juega igual */ } }
function load() {
  try { const raw = localStorage.getItem(STORE_KEY); if (!raw) return; const r = restore(raw); if (r) T = r; } catch (e) { /* nada */ }
}
function wipe() { try { localStorage.removeItem(STORE_KEY); } catch (e) { /* nada */ } }

// ---------- DOM ----------
root.innerHTML = '';
const wrap = h('div', 'wrap');
const header = h('header');
header.appendChild(h('h1', null, 'Eleusis'));
header.appendChild(h('p', 'sub', 'El juego de Robert Abbott que Martin Gardner llamó una simulación del método científico. El repartidor esconde una regla; tú solo ves «Correcto» o «Incorrecto».'));
const back = h('a', 'back', '← Volver a los juegos'); back.href = '../'; header.appendChild(back);
wrap.appendChild(header);

// controles
const card1 = h('div', 'card el-pad');
const row = h('div', 'el-row');
const levelSel = h('select'); levelSel.setAttribute('aria-label', 'Dificultad');
[['1', 'Nivel 1 · fácil'], ['2', 'Nivel 2 · medio'], ['3', 'Nivel 3 · difícil'], ['0', 'Al azar']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; levelSel.appendChild(o); });
const hintLab = h('label', 'el-chk'); const hintChk = h('input'); hintChk.type = 'checkbox';
hintLab.appendChild(hintChk); hintLab.appendChild(document.createTextNode('Pista del repartidor (−3 puntos)'));
const bNew = h('button', 'primary', 'Nueva ronda'); bNew.type = 'button';
row.appendChild(levelSel); row.appendChild(hintLab); row.appendChild(bNew);
card1.appendChild(row);
const how = h('details', 'el-how');
how.appendChild(h('summary', null, 'Cómo se juega'));
[
  '<b>Objetivo.</b> Quedarte sin cartas o, mejor aún, demostrar que sabes la regla.',
  '<b>Jugar.</b> Toca cartas de tu mano (en el orden en que quieras jugarlas) y pulsa Jugar. Con una sola carta juegas normal. Con 2 a 4 juegas una <i>cadena</i>: si alguna falla, falla toda y te dan el doble de cartas de castigo que las de la cadena.',
  '<b>Resultado.</b> Si es correcta, la carta va a la línea principal. Si es incorrecta, cuelga debajo de la última carta correcta (línea lateral) y robas 2 cartas.',
  '<b>Sin jugada.</b> Si crees que ninguna de tus cartas vale, pulsa «No tengo jugada». Si aciertas te dan una mano con 4 cartas menos (si tenías 4 o menos, termina la ronda). Si te equivocas, el repartidor juega por ti una carta buena y robas 5.',
  '<b>Profeta.</b> Cuando creas conocer la regla, declárate Profeta: te irán mostrando 10 cartas y debes decir si valen o no. Si aciertas las 10, ganas 10 puntos y termina la ronda. Si fallas, eres un Falso Profeta y robas 5 cartas.',
  '<b>Expulsión.</b> Cuando ya hay 30 cartas sobre la mesa, un fallo te expulsa y la ronda termina. Las chinchetas numeradas marcan cada décima carta; la roja marca que ya se puede expulsar.',
  '<b>Puntos.</b> 14 menos las cartas que te quedan (mínimo 0), +4 si te quedas sin cartas, +10 si eres Profeta, −3 si pediste pista. La regla solo depende de la secuencia de cartas correctas.',
  '<b>Valores.</b> A=1, J=11, Q=12, K=13. Negras: ♠ ♣. Rojas: ♥ ♦.'
].forEach(t => { const p = h('p'); p.innerHTML = t; how.appendChild(p); });
card1.appendChild(how);
const stats = h('div', 'el-stats');
const mk = label => { const s = h('span', null, label + ': '); const b = h('b', null, '0'); s.appendChild(b); stats.appendChild(s); return b; };
const stR = mk('Rondas'), stW = mk('Reglas descubiertas'), stF = mk('Reglas distintas'), stP = mk('Puntos totales');
const bWipe = h('button', null, 'Borrar mis puntos'); bWipe.type = 'button'; stats.appendChild(bWipe);
card1.appendChild(stats);
wrap.appendChild(card1);

// mesa
const card2 = h('div', 'card el-pad');
const msg = h('p', 'el-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite'); card2.appendChild(msg);
const hintBox = h('div'); card2.appendChild(hintBox);
const counts = h('div', 'el-small'); counts.style.margin = '6px 0'; card2.appendChild(counts);
const table = h('div', 'el-table'); table.setAttribute('role', 'group'); table.setAttribute('aria-label', 'Mesa: línea principal y líneas laterales'); table.tabIndex = 0;
card2.appendChild(table);
const handArea = h('div');
const handLab = h('div', 'el-small', 'Tu mano'); handLab.style.marginTop = '12px'; handArea.appendChild(handLab);
const handEl = h('div', 'el-hand'); handEl.setAttribute('role', 'group'); handEl.setAttribute('aria-label', 'Tu mano'); handArea.appendChild(handEl);
const actions = h('div', 'el-actions');
const bPlay = h('button', 'primary', 'Jugar'); bPlay.type = 'button';
const bClear = h('button', null, 'Deseleccionar'); bClear.type = 'button';
const bNoPlay = h('button', null, 'No tengo jugada'); bNoPlay.type = 'button';
const bProphet = h('button', null, 'Declararme Profeta'); bProphet.type = 'button';
const bGiveUp = h('button', null, 'Rendirme y ver la regla'); bGiveUp.type = 'button';
[bPlay, bClear, bNoPlay, bProphet, bGiveUp].forEach(b => actions.appendChild(b));
handArea.appendChild(actions);
card2.appendChild(handArea);
const panelEl = h('div'); card2.appendChild(panelEl);
const finalEl = h('div'); card2.appendChild(finalEl);
wrap.appendChild(card2);

const foot = h('footer'); foot.innerHTML = 'Martin Gardner, «El Gran Libro de las Matemáticas», cap. 38 (El Nuevo Eleusis, de Robert Abbott) · <a href="../">Juegos</a> · <a href="../../">El problema del día</a>';
wrap.appendChild(foot);
root.appendChild(wrap);

// ---------- partida ----------
function setMsg(t, cls) { msg.textContent = t; msg.className = 'el-msg ' + (cls || ''); }

function startRound() {
  const rule = pickRule(+levelSel.value, lastRuleId);
  lastRuleId = rule.id;
  S = newRound(rule, Math.random, hintChk.checked);
  finalEl.innerHTML = ''; panelEl.innerHTML = '';
  hintBox.innerHTML = '';
  if (S.hintUsed) { const d = h('div', 'el-hintbox'); const b = h('b', null, 'Pista del repartidor: '); d.appendChild(b); d.appendChild(document.createTextNode(rule.hint)); hintBox.appendChild(d); }
  focusCardId = null; focusProphet = false;
  setMsg('Ronda nueva. Hay una regla secreta. Elige una carta de tu mano y pulsa Jugar.', '');
  renderAll();
}

const TITLES = {
  empty: '¡Te has quedado sin cartas!', prophet: '¡Profeta verdadero! Has descubierto la regla.', noplay: 'Ronda terminada: no tenías jugada.',
  gaveup: 'Te has rendido.'
};
function roundOver() {
  const r = S.result;
  applyTotals(T, S); save();
  const title = r.why === 'expelled' ? 'Expulsado. ' + (r.detail || '') : TITLES[r.why];
  finalEl.innerHTML = '';
  const box = h('div', 'el-final');
  box.appendChild(h('h3', null, title));
  const d1 = h('div'); d1.appendChild(h('b', null, 'Regla secreta: ')); d1.appendChild(document.createTextNode(S.rule.text)); box.appendChild(d1);
  const d2 = h('div', 'el-small'); d2.appendChild(document.createTextNode('Nivel ' + S.rule.level + ' · cartas en mano: ' + r.n + ' · puntos de la ronda: '));
  d2.appendChild(h('b', null, String(r.score))); box.appendChild(d2);
  const act = h('div', 'el-actions'); const again = h('button', 'primary', 'Otra ronda'); again.type = 'button'; again.addEventListener('click', startRound);
  act.appendChild(again); box.appendChild(act); finalEl.appendChild(box);
  setMsg(title, r.won ? 'ok' : 'bad');
}
// tras cualquier acción: si la ronda ha terminado, cierra; si no, muestra el mensaje
function after(res, text, cls) {
  if (S.over) roundOver(); else if (text) setMsg(text, cls);
  renderAll();
  return res;
}

function onToggle(id) { if (S.over || S.prophet) return; toggleSel(S, id); focusCardId = id; renderAll(); }
function onPlay() {
  focusCardId = null;
  const res = playSelection(S); if (!res) return;
  if (res.type === 'ok') after(res, res.n > 1 ? '¡Cadena correcta! Las ' + res.n + ' cartas van a la línea principal.' : 'Correcto.', 'ok');
  else if (res.type === 'bad') after(res, (res.n > 1 ? 'Cadena incorrecta. ' : 'Incorrecto. ') + 'Robas ' + res.pen + ' cartas.', 'bad');
  else after(res);
}
function onNoPlay() {
  focusCardId = null;
  const res = noPlay(S); if (!res) return;
  if (res.type === 'noplay-ok') after(res, 'Correcto: no tenías ninguna jugada. Nueva mano con ' + res.n + ' cartas.', 'ok');
  else if (res.type === 'noplay-bad') after(res, 'Incorrecto: sí tenías jugada. El repartidor juega el ' + cardShort(res.card) + ' por ti y robas 5 cartas.', 'bad');
  else after(res);
}
function onProphet() {
  if (!startProphet(S)) return;
  focusProphet = true;
  after(true, 'Eres Profeta. Dime si cada carta es válida en ese punto de la línea.', '');
}
function onAnswer(sayValid) {
  const res = prophetAnswer(S, sayValid);
  focusProphet = res.type === 'right';
  if (res.type === 'wrong') after(res, 'Falso Profeta. La carta ' + cardShort(res.card) + ' ' + (res.actual ? 'era válida' : 'no era válida') + '. Robas 5 cartas y la carta queda en la mesa.', 'bad');
  else if (res.type === 'right') after(res, 'Bien: era ' + (res.actual ? 'válida' : 'no válida') + '. Van ' + res.step + ' de 10.', 'ok');
  else after(res);
}
function onGiveUp() { if (!giveUp(S)) return; after(true); }

// ---------- render ----------
function cardEl(c, tag, extra) {
  const d = h(tag || 'div', 'el-pc ' + (c.s >= 2 ? 'red' : 'blk') + (c.start ? ' start' : '') + (extra ? ' ' + extra : ''));
  const v = h('span', 'v', VALS[c.v - 1]), s = h('span', 's', SUITS[c.s]);
  v.setAttribute('aria-hidden', 'true'); s.setAttribute('aria-hidden', 'true');
  d.appendChild(v); d.appendChild(s);
  if (c.mark) {
    const p = h('span', 'pawn' + (c.mark >= EXPEL_AT ? ' exp' : ''), String(c.mark));
    p.title = c.mark >= EXPEL_AT ? 'Desde aquí un fallo expulsa' : 'Carta nº ' + c.mark; p.setAttribute('aria-hidden', 'true'); d.appendChild(p);
  }
  return d;
}
function tableCard(c, wrong) {
  const d = cardEl(c, 'div', wrong ? 'wrong' : '');
  d.setAttribute('role', 'img');
  d.setAttribute('aria-label', cardName(c) + (c.start ? ', carta inicial' : '') + (wrong ? ', incorrecta' : ', correcta'));
  return d;
}
function renderTable() {
  table.innerHTML = '';
  const line = h('div', 'el-line');
  S.main.forEach((c, i) => {
    const colm = h('div', 'el-colm');
    colm.appendChild(tableCard(c, false));
    const side = h('div', 'el-side');
    S.side[i].forEach(g => { const gr = h('div', 'el-grp'); g.forEach(x => gr.appendChild(tableCard(x, true))); side.appendChild(gr); });
    colm.appendChild(side); line.appendChild(colm);
  });
  table.appendChild(line);
  table.scrollLeft = table.scrollWidth;
}
function renderHand() {
  handEl.innerHTML = '';
  S.hand.forEach(c => {
    const sel = S.sel.includes(c.id);
    const b = cardEl(c, 'button', sel ? 'sel' : ''); b.type = 'button';
    b.setAttribute('aria-label', cardName(c) + (sel ? ', seleccionada, número ' + (S.sel.indexOf(c.id) + 1) : ''));
    b.setAttribute('aria-pressed', sel ? 'true' : 'false');
    if (sel) { const n = h('span', 'n', String(S.sel.indexOf(c.id) + 1)); n.setAttribute('aria-hidden', 'true'); b.appendChild(n); }
    b.addEventListener('click', () => onToggle(c.id));
    b.dataset.id = c.id;
    handEl.appendChild(b);
  });
  if (focusCardId !== null) { const f = handEl.querySelector('[data-id="' + focusCardId + '"]'); if (f) f.focus({ preventScroll: true }); }
  const n = S.sel.length;
  bPlay.textContent = n > 1 ? 'Jugar cadena de ' + n : 'Jugar';
  const busy = S.over || !!S.prophet;
  bPlay.disabled = busy || !n; bClear.disabled = busy || !n; bNoPlay.disabled = busy; bProphet.disabled = busy; bGiveUp.disabled = S.over;
}
function renderPanel() {
  panelEl.innerHTML = '';
  handArea.hidden = !!S.prophet;
  if (!S.prophet) return;
  const P = S.prophet;
  const d = h('div', 'el-panel');
  d.appendChild(h('div', 'el-prog', 'Prueba de Profeta · carta ' + (P.step + 1) + ' de 10'));
  d.appendChild(h('div', null, '¿Es válida esta carta como siguiente en la línea principal?'));
  const big = h('div', 'big'); const cc = cardEl(P.card, 'div'); cc.setAttribute('role', 'img'); cc.setAttribute('aria-label', cardName(P.card)); big.appendChild(cc); d.appendChild(big);
  const act = h('div', 'el-actions');
  const yes = h('button', 'primary', 'Es válida'); yes.type = 'button'; yes.addEventListener('click', () => onAnswer(true));
  const no = h('button', null, 'No es válida'); no.type = 'button'; no.addEventListener('click', () => onAnswer(false));
  act.appendChild(yes); act.appendChild(no); d.appendChild(act); panelEl.appendChild(d);
  if (focusProphet) yes.focus({ preventScroll: true });
}
function renderCounts() {
  const exp = S.placed >= EXPEL_AT;
  counts.textContent = 'Cartas en la mesa: ' + S.placed + ' · En tu mano: ' + S.hand.length + ' · Mazo: ' + S.deck.length +
    (exp ? ' · ¡Ya hay expulsión: un fallo termina la ronda!' : ' · Expulsión a partir de ' + EXPEL_AT + ' cartas en la mesa');
}
function renderStats() { stR.textContent = T.rounds; stW.textContent = T.wins; stF.textContent = T.found.length + ' de ' + RULES.length; stP.textContent = T.points; }
function renderAll() { renderTable(); renderHand(); renderPanel(); renderCounts(); renderStats(); }

// ---------- eventos ----------
bPlay.addEventListener('click', onPlay);
bClear.addEventListener('click', () => { if (S.over || S.prophet) return; S.sel = []; focusCardId = null; renderHand(); });
bNoPlay.addEventListener('click', onNoPlay);
bProphet.addEventListener('click', onProphet);
bGiveUp.addEventListener('click', onGiveUp);
bNew.addEventListener('click', startRound);
bWipe.addEventListener('click', () => { T = newTotals(); wipe(); renderStats(); });

load();
startRound();
