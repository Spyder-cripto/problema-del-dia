// eleusis/main.js — interfaz de Eleusis (El Nuevo Eleusis de Robert Abbott, según Martin Gardner).
// Autocontenido: solo usa la hoja de estilo del hub (_engine/style.css). La lógica vive en game.js (probada en test.mjs).
import { RULES, SUITS, VALS, EXPEL_AT, pickRule, newRound, toggleSel, playSelection, noPlay, startProphet, prophetAnswer,
  giveUp, abandonRound, pointsNow, cardName, cardShort, newTotals, applyTotals, serialize, restore } from './game.js';

const STORE_KEY = 'problema-del-dia.eleusis.v1';
const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- estado ----------
let S = null, lastRuleId = null, focusCardId = null, focusProphet = false, prefijo = '', placedAntes = 0;
let T = newTotals();   // acumulado de todas las visitas (se guarda)
let V = newTotals();   // solo esta visita (empieza en 0 al abrir la página)

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
const levelSel = h('select'); levelSel.setAttribute('aria-label', 'Dificultad (se aplica a la próxima ronda)');
[['1', 'Nivel 1 · fácil'], ['2', 'Nivel 2 · medio'], ['3', 'Nivel 3 · difícil'], ['4', 'Nivel 4 · experto'], ['5', 'Nivel 5 · maestro'], ['0', 'Al azar (niveles 1 a 3)']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; levelSel.appendChild(o); });
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
  '<b>Profeta.</b> Cuando creas conocer la regla, declárate Profeta: te irán mostrando 10 cartas y debes decir si valen o no. Si aciertas las 10, ganas 10 puntos (15 en el nivel experto y 20 en el maestro) y termina la ronda. Si fallas, eres un Falso Profeta y robas 5 cartas. Si en algún punto la regla acepta cualquier carta, no hay ninguna rechazada que enseñar: verás solo cartas válidas y un aviso.',
  '<b>Expulsión.</b> Solo cuentan las cartas de la mesa, no las de tu mano. Cuando ya hay 30 cartas sobre la mesa, un fallo te expulsa y la ronda termina; acertar nunca te expulsa. Las chinchetas numeradas marcan cada décima carta; la roja marca que ya se puede expulsar.',
  '<b>Puntos.</b> 14 menos las cartas que te quedan (mínimo 0), +4 si te quedas sin cartas, +10 si eres Profeta (+15 en el nivel 4 y +20 en el 5), −3 si pediste pista. La regla solo depende de la secuencia de cartas correctas.',
  '<b>Niveles.</b> Del 1 al 3, la regla mira la última carta, las dos últimas o la posición en la línea. El <b>nivel 4 (experto)</b> junta varias condiciones a la vez: colores, palos, paridad, un círculo de valores o la posición, con casos distintos según la última carta. El <b>nivel 5 (maestro)</b> es el más difícil: además hay que fijarse en tres cartas seguidas, hacer cuentas con los valores de varias cartas, o llevar una cuenta de toda la línea. Es normal tardar mucho en dar con la regla, o no darla: son reglas para expertos. «Al azar» reparte reglas de los niveles 1 a 3; el experto y el maestro se eligen a propósito. La puntuación es la misma en todos los niveles, salvo el bonus de Profeta (+10, +15 o +20).',
  '<b>Cambiar de ronda.</b> «Rendirme y ver la regla» termina la ronda, te enseña la regla secreta y cuenta con 0 puntos. El botón de arriba, cuando ya has jugado alguna carta, se llama «Abandonar y nueva ronda»: también cuenta con 0 puntos, pero no te enseña la regla. Cuando la ronda ha terminado, «Otra ronda» empieza la siguiente sin perder nada.',
  '<b>Marcador.</b> Ronda, Puntos y Reglas descubiertas cuentan desde que abres la página y se actualizan cuando termina cada ronda. «Puntos ahora» son los que ganarías si la ronda terminara ahora sin rendirte. Debajo verás el acumulado de todas tus visitas, que se guarda en este navegador, con el detalle en «Mis rondas». Rendirte o abandonar una ronda empezada cuenta como ronda jugada con 0 puntos.',
  '<b>Valores.</b> A=1, J=11, Q=12, K=13. Negras: ♠ ♣. Rojas: ♥ ♦.'
].forEach(t => { const p = h('p'); p.innerHTML = t; how.appendChild(p); });
card1.appendChild(how);
wrap.appendChild(card1);

// mesa
const card2 = h('div', 'card el-pad');
const score = h('div', 'el-score'); score.setAttribute('role', 'group'); score.setAttribute('aria-label', 'Marcador');
const chip = (label, cls) => { const d = h('div', 'el-chip' + (cls ? ' ' + cls : '')); d.appendChild(h('small', null, label)); const b = h('b', null, '0'); d.appendChild(b); score.appendChild(d); return b; };
const scR = chip('Ronda'), scP = chip('Puntos'), scF = chip('Reglas descubiertas'), scN = chip('Puntos ahora', 'now');
card2.appendChild(score);
const acum = h('p', 'el-leyenda'); acum.style.margin = '-2px 0 10px'; card2.appendChild(acum);
const msg = h('p', 'el-msg'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite'); card2.appendChild(msg);
const finalEl = h('div'); card2.appendChild(finalEl);   // fin de ronda: justo bajo el mensaje, para que sea lo primero que se ve
const hintBox = h('div'); card2.appendChild(hintBox);
const counts = h('div', 'el-small'); counts.style.margin = '6px 0'; card2.appendChild(counts);
const aviso = h('div', 'el-aviso'); aviso.hidden = true; card2.appendChild(aviso);
const table = h('div', 'el-table'); table.setAttribute('role', 'group'); table.setAttribute('aria-label', 'Mesa: línea principal y líneas laterales'); table.tabIndex = 0;
card2.appendChild(table);
const leyenda = h('p', 'el-leyenda'); leyenda.appendChild(h('i')); leyenda.appendChild(document.createTextNode('Arriba, la línea de cartas correctas (la del borde amarillo es la inicial). Debajo de una carta, en rosa, lo que se rechazó después de ella.'));
card2.appendChild(leyenda);
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
const ayuda = h('p', 'el-leyenda', '¿Atascado? «No tengo jugada» si ninguna carta vale, «Declararme Profeta» si crees saber la regla, o «Rendirme y ver la regla» para terminar la ronda y verla.');
ayuda.style.marginTop = '10px';
handArea.appendChild(ayuda);
card2.appendChild(handArea);
const panelEl = h('div'); card2.appendChild(panelEl);
wrap.appendChild(card2);

// mis rondas y reglas descubiertas
const card3 = h('div', 'card el-pad');
const hist = h('details', 'el-hist');
const histSum = h('summary'); hist.appendChild(histSum);
hist.appendChild(h('h3', null, 'Mis últimas rondas (numeradas en el acumulado de todas tus visitas)'));
const logEl = h('ol', 'el-log'); hist.appendChild(logEl);
hist.appendChild(h('h3', null, 'Reglas descubiertas'));
const rulesEl = h('ul', 'el-rules'); hist.appendChild(rulesEl);
const bWipe = h('button', null, 'Borrar mis puntos y mi historial'); bWipe.type = 'button'; hist.appendChild(bWipe);
card3.appendChild(hist);
wrap.appendChild(card3);

const foot = h('footer'); foot.innerHTML = 'Martin Gardner, «El Gran Libro de las Matemáticas», cap. 38 (El Nuevo Eleusis, de Robert Abbott) · <a href="../">Juegos</a> · <a href="../../">El problema del día</a>';
wrap.appendChild(foot);
root.appendChild(wrap);

// ---------- partida ----------
function setMsg(t, cls) { msg.textContent = t; msg.className = 'el-msg ' + (cls || ''); }

function startRound() {
  // una ronda empezada que se deja a medias cuenta como jugada con 0 puntos
  prefijo = '';
  if (S && !S.over && abandonRound(S)) { applyTotals(T, S); applyTotals(V, S); save(); prefijo = 'Ronda anterior abandonada: cuenta como jugada, con 0 puntos. '; }
  const rule = pickRule(+levelSel.value, lastRuleId);
  lastRuleId = rule.id;
  S = newRound(rule, Math.random, hintChk.checked);
  finalEl.innerHTML = ''; panelEl.innerHTML = '';
  hintBox.innerHTML = '';
  if (S.hintUsed) { const d = h('div', 'el-hintbox'); const b = h('b', null, 'Pista del repartidor: '); d.appendChild(b); d.appendChild(document.createTextNode(rule.hint)); hintBox.appendChild(d); }
  focusCardId = null; focusProphet = false;
  setMsg(prefijo + 'Ronda nueva. Hay una regla secreta. Elige una carta de tu mano y pulsa Jugar.', '');
  renderAll();
}

const TITLES = {
  empty: '¡Te has quedado sin cartas!', prophet: '¡Profeta verdadero! Has descubierto la regla.', noplay: 'Ronda terminada: no tenías jugada.',
  gaveup: 'Te has rendido.'
};
const ETIQ = { empty: 'Sin cartas', prophet: 'Profeta verdadero', noplay: 'Sin jugada', expelled: 'Expulsado', gaveup: 'Rendido', abandoned: 'Abandonada' };
function roundOver() {
  const r = S.result;
  applyTotals(T, S); applyTotals(V, S); save();
  const title = r.why === 'expelled' ? 'Expulsado. ' + (r.detail || '') : TITLES[r.why];
  finalEl.innerHTML = '';
  const box = h('div', 'el-final');
  box.appendChild(h('h3', null, title));
  if (r.why === 'expelled') box.appendChild(h('p', 'el-expulsado', 'Has sido expulsado: esta ronda ha terminado y ya no puedes jugar en ella. Pulsa «Otra ronda» para empezar la siguiente.'));
  const d1 = h('div'); d1.appendChild(h('b', null, 'Regla secreta: ')); d1.appendChild(document.createTextNode(S.rule.text)); box.appendChild(d1);
  const d2 = h('div', 'el-small'); d2.appendChild(document.createTextNode('Nivel ' + S.rule.level + ' · cartas en mano: ' + r.n + ' · puntos de la ronda: '));
  d2.appendChild(h('b', null, String(r.score)));
  d2.appendChild(document.createTextNode(' · esta visita: ' + V.points + ' puntos en ' + V.rounds + (V.rounds === 1 ? ' ronda' : ' rondas'))); box.appendChild(d2);
  if (r.why === 'prophet') box.appendChild(h('div', 'el-small', 'Reglas descubiertas en total: ' + T.found.length + ' de ' + RULES.length + '.'));
  const act = h('div', 'el-actions'); const again = h('button', 'primary', 'Otra ronda'); again.type = 'button'; again.addEventListener('click', startRound);
  act.appendChild(again); box.appendChild(act); finalEl.appendChild(box);
  setMsg(title, r.won ? 'ok' : 'bad');
  finalEl.scrollIntoView({ block: 'center' });
}
// tras cualquier acción: si la ronda ha terminado, cierra; si no, muestra el mensaje
function after(res, text, cls) {
  // al cruzar las 30 cartas en la mesa, el mensaje avisa de que el próximo error expulsa
  const cruza = !S.over && placedAntes < EXPEL_AT && S.placed >= EXPEL_AT;
  if (S.over) roundOver(); else if (text) setMsg(text + (cruza ? ' ¡Cuidado! Ya hay ' + EXPEL_AT + ' cartas en la mesa: el próximo error te expulsa.' : ''), cruza ? 'bad' : cls);
  else if (cruza) setMsg('¡Cuidado! Ya hay ' + EXPEL_AT + ' cartas en la mesa: el próximo error te expulsa.', 'bad');
  renderAll();
  return res;
}

function onToggle(id) { if (S.over || S.prophet) return; toggleSel(S, id); focusCardId = id; renderAll(); }
function onPlay() {
  focusCardId = null;
  const nombres = S.sel.map(id => { const c = S.hand.find(x => x.id === id); return c ? cardShort(c) : ''; }).join(' ');
  const res = playSelection(S); if (!res) return;
  if (res.type === 'ok') after(res, res.n > 1 ? '¡Cadena correcta! Las ' + res.n + ' cartas (' + nombres + ') van a la línea principal.' : 'Correcto: ' + nombres + ' va a la línea principal.', 'ok');
  else if (res.type === 'bad') after(res, (res.n > 1 ? 'Cadena incorrecta: ' + nombres + '. Si una carta de la cadena falla, fallan todas, y no se te dice cuál. ' : 'Incorrecto: el ' + nombres + ' no valía. ') + 'Robas ' + res.pen + ' cartas.', 'bad');
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
  d.setAttribute('aria-label', cardName(c) + (c.start ? ', carta inicial' : '') + (wrong ? ', rechazada' : ', correcta'));
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
    b.disabled = S.over;   // ronda terminada (también por expulsión): la mano ya no se puede usar
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
  if (P.card.forced) d.appendChild(h('div', 'el-small', 'En esta situación la regla acepta cualquier carta, así que no hay cartas rechazadas que mostrar.'));
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
  counts.textContent = 'Cartas en la mesa (sin contar la inicial): ' + S.placed + ' · En tu mano: ' + S.hand.length + ' · Mazo: ' + S.deck.length +
    (exp ? '' : ' · Expulsión a partir de ' + EXPEL_AT + ' cartas en la mesa');
  aviso.hidden = !(exp && !S.over);
  aviso.textContent = 'Cuidado: ya hay ' + S.placed + ' cartas en la mesa. El próximo error (una carta o cadena incorrecta, o un «No tengo jugada» equivocado) te expulsa y termina la ronda. Acertar no te expulsa.';
}
function renderScore() {
  // «Ronda» es la que se está jugando (o la que acaba de terminar)
  scR.textContent = S.over ? V.rounds : V.rounds + 1;
  scP.textContent = V.points;
  scF.textContent = V.found.length;
  acum.textContent = 'Este marcador cuenta desde que abriste la página. Acumulado de todas tus visitas: ' + T.rounds + (T.rounds === 1 ? ' ronda' : ' rondas') + ' · ' + T.points + ' puntos · ' + T.found.length + ' de ' + RULES.length + ' reglas descubiertas.';
  scN.textContent = S.over ? S.result.score : pointsNow(S);
}
function renderLog() {
  const rr = n => n + (n === 1 ? ' ronda' : ' rondas');
  histSum.textContent = 'Historial de todas mis visitas: ' + rr(T.rounds) + ' · ' + T.found.length + ' de ' + RULES.length + ' reglas descubiertas (esta visita: ' + rr(V.rounds) + ')';
  logEl.innerHTML = '';
  if (!T.log.length) { const li = h('li', 'el-small', 'Aún no has terminado ninguna ronda.'); logEl.appendChild(li); }
  const primera = T.rounds - T.log.length + 1;
  T.log.slice().reverse().forEach((e, i) => {
    const r = RULES.find(x => x.id === e.id); const li = h('li');
    const pts = h('span', 'pts' + (e.score === 0 ? ' cero' : ''), (e.score > 0 ? '+' : '') + e.score + ' pts'); li.appendChild(pts);
    const n = T.log.length - 1 - i; li.appendChild(h('b', null, 'Ronda ' + (primera + n) + ' · ' + ETIQ[e.why]));
    li.appendChild(document.createElement('br')); li.appendChild(document.createTextNode('Nivel ' + r.level + ' · ' + r.text));
    logEl.appendChild(li);
  });
  rulesEl.innerHTML = '';
  RULES.forEach(r => {
    const ok = T.found.includes(r.id);
    const li = h('li', ok ? 'ok' : 'no'); li.appendChild(h('span', 'niv', 'Nivel ' + r.level));
    li.appendChild(document.createTextNode(ok ? '✓ ' + r.text : 'Sin descubrir'));
    rulesEl.appendChild(li);
  });
}
function renderNewBtn() {
  const empezada = !S.over && S.placed > 0;   // hay una ronda a medias: pulsarlo la abandona
  bNew.textContent = empezada ? 'Abandonar y nueva ronda' : 'Nueva ronda';
  ayuda.hidden = S.over;   // la ayuda solo tiene sentido con la ronda en curso
  bNew.title = empezada ? 'Termina esta ronda sin verla: cuenta como jugada con 0 puntos y no te enseña la regla. Para verla, usa «Rendirme y ver la regla».' : 'Empieza una ronda nueva.';
}
function renderAll() { renderTable(); renderHand(); renderPanel(); renderCounts(); renderScore(); renderLog(); renderNewBtn(); placedAntes = S.placed; }

// ---------- eventos ----------
bPlay.addEventListener('click', onPlay);
bClear.addEventListener('click', () => { if (S.over || S.prophet) return; S.sel = []; focusCardId = null; renderHand(); });
bNoPlay.addEventListener('click', onNoPlay);
bProphet.addEventListener('click', onProphet);
bGiveUp.addEventListener('click', onGiveUp);
bNew.addEventListener('click', startRound);
bWipe.addEventListener('click', () => { T = newTotals(); V = newTotals(); wipe(); renderAll(); });

load();
startRound();
