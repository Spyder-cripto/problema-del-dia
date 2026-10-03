// suma-15/main.js — interfaz de «Sumar 15» (el tres en raya disfrazado). La lógica vive en game.js (probada en test.mjs).
// Autocontenido: solo usa la hoja de estilo del hub. Las cartas son botones que se colocan con coordenadas en %
// y se mueven con una transición: de la mesa a la mano de quien las coge, o al cuadrado mágico al revelar el truco.
import { CARDS, newGame, turn, play, hand, result, isOver, legalMoves, threats, machineMove, magicPos, analyze } from './game.js';

const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- geometría (unidades de un lienzo de 100 × 144; las cartas miden 19 × 26) ----------
const TX = [17.5, 40.5, 63.5], TY = [30, 59, 88];         // columnas y filas de la mesa 3 × 3
const HAND_X0 = 5.5, HAND_STEP = 17.5, HAND_Y = [118, 0];  // fila de la mano: jugador 0 abajo, jugador 1 arriba
const W = 19, H = 26, VH = 144;
const pct = (v, total) => (v / total * 100).toFixed(3) + '%';

// ---------- estado ----------
let S, history, mode = 'maquina', level = 'mcts', first = 0, reveal = false, avisos = true, timer = null, thinking = false, why = false;
const names = () => mode === 'maquina' ? ['Tú', 'La máquina'] : ['Jugador 1', 'Jugador 2'];
const isHumanTurn = () => !isOver(S) && !thinking && (mode === 'dos' || turn(S) === 0);

// ---------- DOM ----------
root.innerHTML = '';
const wrap = h('div', 'wrap');
const header = h('header');
header.appendChild(h('h1', null, 'Sumar 15'));
header.appendChild(h('p', 'sub', 'Nueve cartas, dos jugadores y un truco escondido.'));
const back = h('a', 'back', '← Volver a los juegos'); back.href = '../'; header.appendChild(back);
wrap.appendChild(header);

const card = h('div', 'card');
const ctrl = h('div', 's15-ctrl');
const modeSel = h('select'); modeSel.setAttribute('aria-label', 'Modo de juego');
[['maquina', 'Contra la máquina'], ['dos', 'Dos jugadores']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; modeSel.appendChild(o); });
const levelSel = h('select'); levelSel.setAttribute('aria-label', 'Nivel de la máquina');
[['aleatorio', 'Máquina: aleatoria'], ['mcts', 'Máquina: MCTS corto'], ['perfecto', 'Máquina: perfecta']].forEach(([v, t]) => { const o = h('option', null, t); o.value = v; levelSel.appendChild(o); });
levelSel.value = level;
const firstSel = h('select'); firstSel.setAttribute('aria-label', 'Quién empieza');
const bNew = h('button', 'primary', 'Nueva partida'); bNew.type = 'button';
ctrl.append(modeSel, levelSel, firstSel, bNew);
card.appendChild(ctrl);

const status = h('div', 's15-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
const aviso = h('div', 's15-aviso');
card.append(status, aviso);

const labTop = h('div', 's15-lab'), labBottom = h('div', 's15-lab');
const mesa = h('div', 's15-mesa'); mesa.setAttribute('role', 'group'); mesa.setAttribute('aria-label', 'Mesa con las nueve cartas, del 1 al 9, y las manos de los dos jugadores');
card.append(labTop, mesa, labBottom);
for (const p of [1, 0]) {   // recuadros de las manos
  const z = h('div', 's15-zone'); z.setAttribute('aria-hidden', 'true'); z.style.top = pct(HAND_Y[p], VH); mesa.appendChild(z);
}
// líneas del tres en raya (aparecen al revelar el truco), sobre la mesa
const NS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 's15-grid'); svg.setAttribute('viewBox', '0 0 100 144'); svg.setAttribute('aria-hidden', 'true');
const vx = [(TX[0] + W + TX[1]) / 2, (TX[1] + W + TX[2]) / 2], hy = [(TY[0] + H + TY[1]) / 2, (TY[1] + H + TY[2]) / 2];
const x0 = TX[0] - 2, x1 = TX[2] + W + 2, y0 = TY[0] - 2, y1 = TY[2] + H + 2;
const addLine = (a, b, c, d) => { const l = document.createElementNS(NS, 'line'); l.setAttribute('x1', a); l.setAttribute('y1', b); l.setAttribute('x2', c); l.setAttribute('y2', d); svg.appendChild(l); };
vx.forEach(x => addLine(x, y0, x, y1)); hy.forEach(y => addLine(x0, y, x1, y));
mesa.appendChild(svg);

const cardEls = {};
for (const c of CARDS) {
  const b = h('button', 's15-card'); b.type = 'button'; b.dataset.card = String(c);
  b.appendChild(h('span', 's15-num', String(c)));
  const m = h('span', 's15-mark'); m.setAttribute('aria-hidden', 'true'); b.appendChild(m);
  b.addEventListener('click', () => onCard(c));
  mesa.appendChild(b); cardEls[c] = b;
}

const ctrl2 = h('div', 's15-ctrl s15-ctrl2');
const bTruco = h('button', null, 'Revelar el truco'); bTruco.type = 'button'; bTruco.setAttribute('aria-pressed', 'false');
const bUndo = h('button', null, '↶ Deshacer'); bUndo.type = 'button';
const optLab = h('label', 's15-opt'); const optChk = document.createElement('input'); optChk.type = 'checkbox'; optChk.checked = true;
optLab.append(optChk, document.createTextNode('Mostrar avisos'));
ctrl2.append(bTruco, bUndo, optLab);
card.appendChild(ctrl2);
const trucoBox = h('p', 's15-truco'); trucoBox.hidden = true;
trucoBox.innerHTML = '<b>El truco.</b> Las cartas del 1 al 9 están colocadas sobre un cuadrado mágico: <b>cada fila, cada columna y cada diagonal suman 15</b>, y esas ocho líneas son justo las ocho formas de sumar 15 con tres cartas distintas. Coger una carta es marcar su casilla, y conseguir tres cartas que sumen 15 es hacer <b>tres en raya</b>. Por eso, con juego perfecto, nadie puede ganar: es un empate, como en el tres en raya.';
card.appendChild(trucoBox);
const finalBox = h('div', 's15-final'); finalBox.hidden = true;
card.appendChild(finalBox);
wrap.appendChild(card);

const rules = h('div', 'card');
rules.appendChild(h('h2', null, 'Reglas'));
const ri = h('p', 's15-intro');
ri.innerHTML = '<b>Sobre la mesa hay nueve cartas, del 1 al 9.</b> Por turnos, cada jugador coge una y se la queda. Gana el primero que consiga <b>tres cartas que sumen exactamente 15</b>. Si se acaban las cartas y nadie lo ha logrado, hay empate. ' +
  'Los puntos azul y rojo de algunas cartas son avisos: marcan una carta con la que alguien sumaría 15 en su próxima jugada (puedes quitarlos). ¿Cuántas ternas distintas suman 15? Hay ocho… y ese número lo cambia todo: pulsa «Revelar el truco».';
rules.appendChild(ri);
const note = h('p', 's15-intro'); note.style.marginTop = '8px';
note.innerHTML = '<b>Niveles de la máquina.</b> <b>Aleatoria</b> coge cartas al azar. <b>MCTS corto</b> prueba unas pocas partidas al azar antes de cada jugada: juega bien, pero a veces se equivoca. <b>Perfecta</b> lo calcula todo: no se la puede ganar, y si te equivocas, te gana.';
rules.appendChild(note);
wrap.appendChild(rules);
const foot = h('footer'); foot.innerHTML = 'Un clásico de la matemática recreativa: el tres en raya disfrazado · <a href="../">Juegos</a> · <a href="../../">El problema del día</a>';
wrap.appendChild(foot);
root.appendChild(wrap);

// ---------- utilidades de texto ----------
const lista = cs => cs.length === 1 ? 'el ' + cs[0] : 'el ' + cs.slice(0, -1).join(', el ') + ' o el ' + cs[cs.length - 1];
function avisosHtml() {
  if (!avisos || isOver(S)) return '';
  const nm = names(), parts = [];
  const cls = ['a', 'r'];
  const turno = turn(S);
  for (const p of [turn(S), 1 - turn(S)]) {
    const th = threats(S, p); if (!th.length) continue;
    let txt;
    if (p === turno) txt = (mode === 'maquina' && p === 0) ? '¡Puedes ganar ya con ' + lista(th) + '!' : '¡' + nm[p] + ' puede ganar ya con ' + lista(th) + '!';
    else txt = (mode === 'maquina' && p === 1) ? 'Cuidado: ' + nm[p].toLowerCase() + ' ganaría con ' + lista(th) + ', así que tendrías que cogerlo.' : 'Cuidado: ' + nm[p] + ' ganaría con ' + lista(th) + '.';
    parts.push('<span class="' + cls[p] + '">' + txt + '</span>');
  }
  return parts.join(' ');
}

// ---------- pintar ----------
function layout() {
  const nm = names();
  const ths = [threats(S, 0), threats(S, 1)];
  const win = result(S);
  for (const c of CARDS) {
    const el = cardEls[c], o = S.owner[c];
    let x, y;
    if (reveal) { const [r, k] = magicPos(c); x = TX[k]; y = TY[r]; }
    else if (o === -1) { x = TX[(c - 1) % 3]; y = TY[Math.floor((c - 1) / 3)]; }
    else { const i = hand(S, o).indexOf(c); x = HAND_X0 + i * HAND_STEP; y = HAND_Y[o]; }
    el.style.left = pct(x, 100); el.style.top = pct(y, VH);
    el.style.zIndex = o === -1 ? '1' : String(1 + (reveal ? 0 : hand(S, o).indexOf(c)));
    const mark = el.querySelector('.s15-mark'); mark.textContent = o === 0 ? '✕' : o === 1 ? '◯' : '';
    el.className = 's15-card' + (o >= 0 ? ' o' + o : '') + (win.triple && win.triple.includes(c) ? ' win' : '');
    const amenaza = avisos && !isOver(S) && o === -1 ? [0, 1].filter(p => ths[p].includes(c)) : [];
    if (amenaza.length) el.classList.add('hint', 'h' + (amenaza.includes(turn(S)) ? turn(S) : amenaza[0]));
    el.disabled = o !== -1 || !isHumanTurn();
    el.setAttribute('aria-label', 'Carta ' + c + (o === -1 ? ', libre' + (amenaza.length ? ', con ella ' + amenaza.map(p => nm[p].toLowerCase()).join(' y ') + ' sumaría 15' : '') : ', de ' + nm[o].toLowerCase()) + (win.triple && win.triple.includes(c) ? ', parte de la terna ganadora' : ''));
  }
  mesa.classList.toggle('truco', reveal);
  trucoBox.hidden = !reveal;
  bTruco.textContent = reveal ? 'Volver a la mesa' : 'Revelar el truco'; bTruco.setAttribute('aria-pressed', String(reveal));
  const dot = (p) => '<i class="c' + p + '"></i>';
  const nCartas = n => n + (n === 1 ? ' carta' : ' cartas');
  labTop.innerHTML = dot(1) + '<span>' + nm[1] + ' · ' + nCartas(hand(S, 1).length) + '</span>';
  labBottom.innerHTML = dot(0) + '<span>' + nm[0] + ' · ' + nCartas(hand(S, 0).length) + '</span>';
}

function render() {
  const nm = names(), r = result(S);
  status.className = 's15-status';
  if (r.over) {
    if (r.winner === null) status.textContent = 'Empate: nadie ha conseguido tres cartas que sumen 15.';
    else {
      const sum = r.triple.join(' + ') + ' = 15';
      if (mode === 'maquina') { status.textContent = r.winner === 0 ? '¡Has ganado! ' + sum + '.' : 'Ha ganado la máquina: ' + sum + '.'; status.classList.add(r.winner === 0 ? 'win' : 'lose'); }
      else { status.textContent = 'Gana el ' + nm[r.winner].toLowerCase() + ': ' + sum + '.'; status.classList.add('win'); }
    }
  } else if (thinking) status.textContent = 'La máquina piensa…';
  else status.textContent = mode === 'maquina' ? 'Tu turno: elige una carta.' : 'Turno del ' + nm[turn(S)].toLowerCase() + ': elige una carta.';
  aviso.innerHTML = avisosHtml();
  layout();
  renderFinal();
  bUndo.disabled = !history.length || thinking;
  modeSel.disabled = false;
}

function renderFinal() {
  const r = result(S);
  finalBox.hidden = !r.over;
  if (!r.over) { why = false; return; }
  finalBox.innerHTML = '';
  const nm = names();
  finalBox.appendChild(h('h3', null, r.winner === null ? 'Fin de la partida: empate' : 'Fin de la partida: ' + (mode === 'maquina' ? (r.winner === 0 ? 'ganas tú' : 'gana la máquina') : 'gana el ' + nm[r.winner].toLowerCase())));
  if (r.triple) finalBox.appendChild(h('p', 's15-resumen', 'Terna ganadora: ' + r.triple.join(' + ') + ' = 15. Está marcada con un borde verde. En el cuadrado mágico es una línea recta.'));
  const b = h('button', null, why ? 'Ocultar el análisis' : '¿Cómo se decidió?'); b.type = 'button'; b.setAttribute('aria-expanded', String(why));
  b.addEventListener('click', () => { why = !why; renderFinal(); });
  finalBox.appendChild(b);
  if (!why) return;
  const a = analyze(S.moves, S.first);
  const gana = p => mode === 'maquina' ? (p === 0 ? 'ganabas tú' : 'ganaba la máquina') : 'ganaba el ' + nm[p].toLowerCase();
  const coge = (p, pasado) => mode === 'maquina' ? (p === 0 ? (pasado ? 'tú cogiste' : 'tú coges') : (pasado ? 'la máquina cogió' : 'la máquina coge')) : 'el ' + nm[p].toLowerCase() + (pasado ? ' cogió' : ' coge');
  const mayus = t => t.charAt(0).toUpperCase() + t.slice(1);
  const estado = v => v === 0 ? 'empate con juego perfecto' : gana(v === 1 ? 0 : 1) + ' con juego perfecto';
  const ul = h('ol', 's15-why'); ul.style.listStyle = 'none';
  for (const m of a.jugadas) {
    const li = h('li', (m.error ? 'err ' : '') + (a.decisiva && a.decisiva.n === m.n ? 'dec' : ''));
    li.textContent = 'Jugada ' + m.n + ' · ' + mayus(coge(m.player, false)) + ' el ' + m.card + ' → ' + estado(m.despues) + (m.error ? ' (error: antes ' + estado(m.antes) + ')' : '');
    ul.appendChild(li);
  }
  const resumen = h('p', 's15-resumen');
  const hubo = a.jugadas.some(m => m.error);
  if (a.decisiva) resumen.textContent = 'Se decidió en la jugada ' + a.decisiva.n + ': ' + coge(a.decisiva.player, true) + ' el ' + a.decisiva.card + ' y, a partir de ahí, la partida ya no se podía salvar (antes: ' + estado(a.decisiva.antes) + ').';
  else if (r.winner === null && !hubo) resumen.textContent = 'Empate sin errores: con juego perfecto esta partida estaba empatada desde el principio y los dos jugadores lo mantuvieron así.';
  else resumen.textContent = 'Empate con errores por el camino: alguien dejó escapar la ventaja, pero el rival no supo aprovecharla.';
  finalBox.append(resumen, ul);
}

// ---------- flujo de la partida ----------
function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } thinking = false; }
function fillFirst() {
  const nm = mode === 'maquina' ? ['Empiezas tú', 'Empieza la máquina'] : ['Empieza el jugador 1', 'Empieza el jugador 2'];
  firstSel.innerHTML = '';
  nm.forEach((t, i) => { const o = h('option', null, t); o.value = String(i); firstSel.appendChild(o); });
  firstSel.value = String(first);
}
function newGameStart() {
  clearTimer();
  S = newGame(first); history = []; why = false;
  levelSel.hidden = mode !== 'maquina';
  render(); maybeMachine();
}
function maybeMachine() {
  if (mode !== 'maquina' || isOver(S) || turn(S) !== 1) return;
  thinking = true; render();
  timer = setTimeout(() => {
    timer = null; thinking = false;
    if (isOver(S) || turn(S) !== 1) { render(); return; }
    history.push(S); S = play(S, machineMove(level, S)); render(); focusFirstFree();
  }, 650);
}
function focusFirstFree() { const el = CARDS.map(c => cardEls[c]).find(b => !b.disabled); if (el && document.activeElement === document.body) el.focus({ preventScroll: true }); }
function onCard(c) {
  if (!isHumanTurn() || S.owner[c] !== -1) return;
  const eraCarta = document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('s15-card');
  history.push(S); S = play(S, c);
  render();
  if (!isOver(S)) { maybeMachine(); if (!thinking && eraCarta) focusFirstFree(); }
}
function undo() {
  if (!history.length || thinking) return;
  clearTimer();
  if (mode === 'maquina') { do { S = history.pop(); } while (history.length && turn(S) !== 0); if (turn(S) !== 0) { S = newGame(first); history = []; } }
  else S = history.pop();
  why = false; render(); maybeMachine();
}

modeSel.addEventListener('change', () => { mode = modeSel.value; first = 0; fillFirst(); newGameStart(); });
levelSel.addEventListener('change', () => { level = levelSel.value; newGameStart(); });
firstSel.addEventListener('change', () => { first = +firstSel.value; newGameStart(); });
bNew.addEventListener('click', newGameStart);
bUndo.addEventListener('click', undo);
bTruco.addEventListener('click', () => { reveal = !reveal; render(); });
optChk.addEventListener('change', () => { avisos = optChk.checked; render(); });

fillFirst();
newGameStart();
