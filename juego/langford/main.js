// langford/main.js — interfaz del Solitario de Langford con cartas. La lógica vive en game.js (probada en test.mjs).
// Autocontenido: solo usa la hoja de estilo del hub. Se coloca con toque (elige carta, elige hueco) o arrastrando.
import { solve, countSolutions, distinctCount, canon, isSolution, pairStatus, legalSlots, remaining, hint, emptyBoard,
  place, removeAt, hayRazon } from './game.js';

const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- estado ----------
let n = 3, a = emptyBoard(3), sel = null, marks = {}, moves = 0, hints = 0, elapsed = 0, since = null;
let solved = false, revealed = false, ayuda = true, msg = { text: '', cls: '' }, pista = null, drag = null;
const encontradas = new Map();   // n -> Map(clave sin contar el reverso -> la solución tal como la encontró) en esta visita
const locked = () => solved || revealed;
const colocadas = () => a.filter(v => v).length;

// ---------- DOM ----------
root.innerHTML = '';
const wrap = h('div', 'wrap');
const header = h('header');
header.appendChild(h('h1', null, 'Solitario de Langford'));
header.appendChild(h('p', 'sub', 'Dos cartas de cada valor y una sola regla de colocación.'));
const back = h('a', 'back', '← Volver a los juegos'); back.href = '../'; header.appendChild(back);
wrap.appendChild(header);

const card = h('div', 'card');
const ctrl = h('div', 'lg-ctrl');
const nSel = h('select'); nSel.setAttribute('aria-label', 'Número de parejas');
const g1 = document.createElement('optgroup'); g1.label = 'Con solución';
[[3, '3 parejas · fácil'], [4, '4 parejas · fácil'], [7, '7 parejas · difícil'], [8, '8 parejas · muy difícil']].forEach(([v, t]) => { const o = h('option', null, t); o.value = String(v); g1.appendChild(o); });
const g2 = document.createElement('optgroup'); g2.label = 'Avanzado: sin solución';
[[5, '5 parejas (no se puede)'], [6, '6 parejas (no se puede)']].forEach(([v, t]) => { const o = h('option', null, t); o.value = String(v); g2.appendChild(o); });
nSel.append(g1, g2);
const bNew = h('button', 'primary', 'Reiniciar'); bNew.type = 'button';
const ayLab = h('label', 'lg-opt'); const ayChk = document.createElement('input'); ayChk.type = 'checkbox'; ayChk.checked = true;
ayLab.append(ayChk, document.createTextNode('Marcar huecos legales'));
ctrl.append(nSel, bNew, ayLab);
card.appendChild(ctrl);

const datos = h('div', 'lg-datos');
const msgEl = h('div', 'lg-msg'); msgEl.setAttribute('role', 'status'); msgEl.setAttribute('aria-live', 'polite');
card.append(datos, msgEl);
const fila = h('div', 'lg-fila'); fila.setAttribute('role', 'group'); fila.setAttribute('aria-label', 'Fila de huecos');
const mano = h('div', 'lg-mano'); mano.setAttribute('role', 'group'); mano.setAttribute('aria-label', 'Cartas por colocar');
card.append(fila, mano);
const ctrl2 = h('div', 'lg-ctrl lg-ctrl2');
const bCheck = h('button', null, 'Comprobar'); bCheck.type = 'button';
const bHint = h('button', null, 'Pista'); bHint.type = 'button'; bHint.title = 'Gasta una pista: te dice la siguiente carta compatible con alguna solución completa';
const bSolve = h('button', null, 'Resolver'); bSolve.type = 'button';
ctrl2.append(bCheck, bHint, bSolve);
card.appendChild(ctrl2);
const info = h('div', 'lg-info');
card.appendChild(info);
wrap.appendChild(card);

const rules = h('div', 'card');
rules.appendChild(h('h2', null, 'Reglas'));
const r1 = h('p', 'lg-intro'); r1.innerHTML = '<b>Hay 2n cartas: dos de cada valor, del 1 al n.</b> Colócalas en la fila de 2n huecos de modo que <b>entre las dos cartas de valor k haya exactamente k cartas</b>. Dos unos con una carta en medio, dos doses con dos cartas en medio, y así hasta las dos de valor n. Dicho de otro modo, los huecos de las dos cartas de valor k se llevan k + 1 de distancia.';
const r2 = h('p', 'lg-intro'); r2.innerHTML = '<b>Cómo se juega.</b> Toca una carta de la mano y luego un hueco, o arrástrala. Toca una carta colocada para quitarla (y volver a colocarla donde quieras), o arrástrala a otro hueco. Cuando pones la primera carta de un valor, se marcan los huecos donde puede ir su pareja. «Comprobar» pone en verde las parejas bien colocadas y en rojo las que no cumplen la distancia. «Pista» usa el solucionador y cuenta como una pista gastada. «Resolver» te enseña una solución.';
const r3 = h('p', 'lg-intro'); r3.innerHTML = '<b>No siempre se puede.</b> Hay solución si y solo si n, al dividirlo entre 4, deja resto 0 o 3. Con 5 o 6 parejas no hay ninguna colocación válida (se demuestra con un argumento de paridad). Aquí puedes comprobarlo: el solucionador lo confirma probando todas las colocaciones posibles.';
// cuántas soluciones hay según n, calculado por el propio solucionador al abrir la página (también cada una leída al revés)
const conSol = [], sinSol = [];
for (let k = 1; k <= 9; k++) (countSolutions(k) ? conSol : sinSol).push(k);
const r4 = h('p', 'lg-intro');
r4.innerHTML = '<b>Cuántas soluciones hay</b> (las calcula el solucionador al abrir la página; cuenta también cada una leída al revés): ' +
  conSol.map(k => 'con ' + k + ' parejas, <b>' + countSolutions(k) + '</b>').join('; ') + '; con ' + sinSol.slice(0, -1).join(', ') + ' y ' + sinSol[sinSol.length - 1] + ' parejas, <b>ninguna</b>.';
rules.append(r1, r2, r3, r4);
wrap.appendChild(rules);
const foot = h('footer'); foot.innerHTML = 'Problema de C. D. Langford, en «The Colossal Book of Short Puzzles and Problems» de Martin Gardner (1.13) · <a href="../">Juegos</a> · <a href="../../">El problema del día</a>';
wrap.appendChild(foot);
root.appendChild(wrap);

// ---------- utilidades ----------
const fmt = ms => { const t = Math.floor(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const nowElapsed = () => elapsed + (since ? Date.now() - since : 0);
function startClock() { if (!since && !locked()) since = Date.now(); }
function stopClock() { if (since) { elapsed += Date.now() - since; since = null; } }
function setMsg(text, cls) { msg = { text, cls: cls || '' }; }
function legalSet() { const k = drag && drag.moved ? drag.k : sel; return ayuda && k ? new Set(legalSlots(a.map((v, i) => (drag && drag.from === i ? 0 : v)), n, k)) : new Set(); }
function changed() { marks = {}; pista = null; }

// ---------- pintar ----------
function renderFila() {
  const cols = 2 * n <= 8 ? 2 * n : Math.ceil(2 * n / 2);
  fila.style.setProperty('--cols', String(cols));
  fila.innerHTML = '';
  const legal = legalSet();
  const st = pairStatus(a, n);
  for (let i = 0; i < 2 * n; i++) {
    const v = a[i];
    const b = h('button', 'lg-slot' + (v ? ' lleno' : '')); b.type = 'button'; b.dataset.slot = String(i);
    b.appendChild(h('span', 'lg-i', String(i + 1)));
    if (v) {
      b.appendChild(document.createTextNode(String(v)));
      if (marks[v] === 'ok' || (solved && st[v] === 'ok')) b.classList.add('ok');
      else if (marks[v] === 'bad') b.classList.add('bad');
      b.setAttribute('aria-label', 'Hueco ' + (i + 1) + ': carta ' + v + (locked() ? '' : '. Pulsa para quitarla'));
      if (!locked()) bindDrag(b, v, i);
    } else {
      b.setAttribute('aria-label', 'Hueco ' + (i + 1) + ', vacío' + (legal.has(i) ? ', aquí puede ir la pareja del ' + (drag && drag.moved ? drag.k : sel) : ''));
      b.addEventListener('click', () => onEmpty(i));
    }
    if (legal.has(i)) b.classList.add('legal');
    if (pista && pista.hueco === i) b.classList.add('pista');
    if (pista && pista.quitar && pista.quitar.includes(i)) b.classList.add('pista', 'quitar');
    if (locked() && !v) b.disabled = true;
    fila.appendChild(b);
  }
}
function renderMano() {
  const rem = remaining(a, n);
  mano.innerHTML = '';
  let alguna = false;
  for (let k = 1; k <= n; k++) {
    const b = h('button', 'lg-val' + (sel === k ? ' sel' : '') + (pista && pista.k === k ? ' pista' : '')); b.type = 'button'; b.dataset.val = String(k);
    b.appendChild(document.createTextNode(String(k)));
    if (rem[k] > 0) { b.appendChild(h('span', 'lg-q', '×' + rem[k])); alguna = true; }
    b.disabled = rem[k] === 0 || locked();
    b.setAttribute('aria-label', 'Carta ' + k + ', quedan ' + rem[k] + (sel === k ? ', elegida' : '')); b.setAttribute('aria-pressed', String(sel === k));
    if (!b.disabled) bindDrag(b, k, null);
    mano.appendChild(b);
  }
  if (!alguna) mano.appendChild(h('div', 'lg-vacia', 'Ya has colocado todas las cartas.'));
}
function renderDatos() {
  datos.innerHTML = '';
  const add = (t, v) => { const s = document.createElement('span'); s.appendChild(document.createTextNode(t + ' ')); const b = document.createElement('b'); b.textContent = v; s.appendChild(b); datos.appendChild(s); };
  add('Colocadas', colocadas() + ' de ' + 2 * n); add('Movimientos', String(moves)); add('Pistas', String(hints));
  const t = document.createElement('span'); t.appendChild(document.createTextNode('Tiempo ')); const tb = document.createElement('b'); tb.id = 'lg-time'; tb.textContent = fmt(nowElapsed()); t.appendChild(tb); datos.appendChild(t);
}
function renderInfo() {
  info.innerHTML = '';
  const total = countSolutions(n);
  if (!total) {
    info.appendChild(h('p', null, 'Con ' + n + ' parejas no hay solución: el solucionador ha repasado todas las colocaciones posibles y ninguna cumple la regla. ' +
      (hayRazon(n) ? '' : 'Es lo que predice la regla de n módulo 4: ' + n + ' deja resto ' + (n % 4) + '.')));
    return;
  }
  const dist = distinctCount(n), got = encontradas.get(n) || new Map();
  info.appendChild(h('p', null, 'Con ' + n + ' parejas hay ' + total + ' soluciones en total; sin contar cada una leída al revés, ' + dist + '. Has encontrado ' + got.size + ' de ' + dist + ' en esta visita.'));
  if (got.size) info.appendChild(h('p', 'lg-found', [...got.values()].join('  ·  ')));
}
function renderBotones() {
  bCheck.disabled = locked() || colocadas() === 0;
  bHint.disabled = locked();
  bSolve.disabled = revealed;
}
function render() {
  msgEl.textContent = msg.text; msgEl.className = 'lg-msg ' + msg.cls;
  renderFila(); renderMano(); renderDatos(); renderInfo(); renderBotones();
}
setInterval(() => { const e = document.getElementById('lg-time'); if (e && since) e.textContent = fmt(nowElapsed()); }, 500);

// ---------- acciones ----------
function afterMove() {
  changed();
  if (colocadas() === 2 * n && isSolution(a, n)) {
    solved = true; stopClock();
    const c = canon(a); const set = encontradas.get(n) || new Map(); const nueva = !set.has(c); if (nueva) set.set(c, a.join(' ')); encontradas.set(n, set);
    setMsg('¡Resuelto! ' + a.join(' ') + (nueva ? ' Es una solución nueva para ti.' : ' Ya la habías encontrado (o su reverso). Prueba a buscar otra: pulsa «Reiniciar».'), 'ok');
  } else if (colocadas() === 2 * n) setMsg('Están todas colocadas, pero alguna pareja no cumple la distancia. Pulsa «Comprobar» para ver cuáles.', 'bad');
  else setMsg('', '');
  render();
}
function colocar(k, hueco) {
  startClock(); a = place(a, n, hueco, k); moves++;
  if (remaining(a, n)[k] === 0) sel = null;
  afterMove();
}
function quitar(hueco) { const k = a[hueco]; startClock(); a = removeAt(a, hueco); moves++; sel = k; afterMove(); }
function mover(desde, hasta) {
  startClock(); const b = a.slice();
  [b[desde], b[hasta]] = [b[hasta], b[desde]]; a = b; moves++; afterMove();
}
function onEmpty(i) {
  if (locked()) return;
  if (!sel) { setMsg('Primero elige una carta de la mano (o arrástrala hasta aquí).', ''); render(); return; }
  colocar(sel, i);
}
function onTap(k, from) {
  if (locked()) return;
  if (from === null) { sel = sel === k ? null : k; setMsg('', ''); pista = null; render(); }
  else quitar(from);
}

// ---------- arrastrar (ratón y dedo) ----------
function bindDrag(el, k, from) {
  el.addEventListener('pointerdown', e => {
    if (locked() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { k, from, el, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* sin captura */ }
  });
  el.addEventListener('pointermove', e => {
    if (!drag || drag.el !== el || e.pointerId !== drag.id) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 8) startDrag();
    if (drag.moved) { e.preventDefault(); moveGhost(e.clientX, e.clientY); }
  });
  el.addEventListener('pointerup', e => {
    if (!drag || drag.el !== el || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (d.moved) endDrag(d, e.clientX, e.clientY); else onTap(k, from);
  });
  el.addEventListener('pointercancel', () => { if (drag && drag.el === el) { cancelDrag(drag); drag = null; render(); } });
  el.addEventListener('click', e => { if (e.detail === 0) onTap(k, from); });   // teclado
}
function startDrag() {
  drag.moved = true;
  const g = h('div', 'lg-ghost', String(drag.k)); document.body.appendChild(g); drag.ghost = g;
  drag.el.style.opacity = '.3';
  const legal = legalSet(); fila.querySelectorAll('.lg-slot').forEach(s => { if (legal.has(+s.dataset.slot)) s.classList.add('legal'); });
  moveGhost(drag.x0, drag.y0);
}
function moveGhost(x, y) { if (drag && drag.ghost) drag.ghost.style.transform = 'translate(' + (x - 24) + 'px,' + (y - 33) + 'px)'; }
function cancelDrag(d) { if (d.ghost) d.ghost.remove(); d.el.style.opacity = ''; }
function endDrag(d, x, y) {
  cancelDrag(d);
  const target = document.elementFromPoint(x, y), slotEl = target && target.closest ? target.closest('[data-slot]') : null;
  const enMano = target && target.closest ? target.closest('.lg-mano') : null;
  if (slotEl) {
    const s = +slotEl.dataset.slot;
    if (d.from === null) {
      if (a[s] === 0) { colocar(d.k, s); return; }
      setMsg('Ese hueco ya está ocupado: suelta la carta en un hueco vacío.', 'bad'); render(); return;
    }
    if (s === d.from) { render(); return; }
    mover(d.from, s); return;   // hueco libre: se mueve; ocupado: se intercambian
  }
  if (enMano && d.from !== null) { quitar(d.from); sel = null; render(); return; }
  render();
}

// ---------- botones ----------
function comprobar() {
  const st = pairStatus(a, n); marks = {}; pista = null;
  let bien = 0, mal = 0, abiertas = 0;
  for (let k = 1; k <= n; k++) { if (st[k] === 'ok') { marks[k] = 'ok'; bien++; } else if (st[k] === 'mal') { marks[k] = 'bad'; mal++; } else if (st[k] === 'abierta') abiertas++; }
  setMsg(mal ? mal + (mal === 1 ? ' pareja no cumple' : ' parejas no cumplen') + ' la distancia (en rojo). Bien colocadas: ' + bien + '.' :
    bien || abiertas ? 'Todo lo colocado hasta ahora va bien: ' + bien + (bien === 1 ? ' pareja completa' : ' parejas completas') + (abiertas ? ' y ' + abiertas + (abiertas === 1 ? ' carta suelta' : ' cartas sueltas') + ' (aún sin pareja)' : '') + '.' : 'Aún no hay nada que comprobar.', mal ? 'bad' : 'ok');
  render();
}
function pedirPista() {
  if (locked()) return;
  const r = hint(a, n); hints++; sel = null; pista = null;
  if (r.tipo === 'sin-solucion') setMsg('Con ' + n + ' parejas no hay solución, así que no hay ninguna jugada que te acerque a ella.', '');
  else if (r.tipo === 'completa') setMsg('Ya no hace falta pista: está completo.', 'ok');
  else if (r.tipo === 'conflicto') {
    pista = { quitar: r.quitar };
    setMsg('Pista (gastada): lo que has colocado no lleva a ninguna solución.' + (r.quitar.length ? ' Si quitas la carta de uno de los huecos marcados, otra vez se puede resolver.' : ' Quita varias cartas y vuelve a intentarlo.'), 'bad');
  } else { pista = { k: r.k, hueco: r.hueco }; setMsg('Pista (gastada): pon un ' + r.k + ' en el hueco ' + (r.hueco + 1) + '. Con eso todavía hay ' + r.soluciones + (r.soluciones === 1 ? ' solución posible.' : ' soluciones posibles.'), ''); }
  render();
}
function resolver() {
  if (revealed) return;
  const sols = solve(n);
  if (!sols.length) { setMsg('Con ' + n + ' parejas no hay solución: ' + (hayRazon(n) ? '' : 'n deja resto ' + (n % 4) + ' al dividir entre 4, y ') + 'el solucionador ha probado todas las colocaciones y no cumple ninguna.', ''); render(); return; }
  const compat = sols.filter(s => a.every((v, i) => v === 0 || s[i] === v));
  const pool = compat.length ? compat : sols;
  a = pool[Math.floor(Math.random() * pool.length)].slice();
  revealed = true; stopClock(); changed(); sel = null;
  setMsg('Solución mostrada: ' + a.join(' ') + '. No cuenta como encontrada por ti. Pulsa «Reiniciar» para intentarlo tú.', '');
  render();
}
function reiniciar(nuevoN) {
  if (nuevoN) n = nuevoN;
  a = emptyBoard(n); sel = null; marks = {}; pista = null; moves = 0; hints = 0; elapsed = 0; since = null; solved = false; revealed = false; drag = null;
  setMsg(countSolutions(n) ? 'Elige una carta de la mano y colócala en un hueco.' : 'Con ' + n + ' parejas no hay solución; puedes intentarlo y comprobarlo.', '');
  render();
}

nSel.addEventListener('change', () => reiniciar(+nSel.value));
bNew.addEventListener('click', () => reiniciar());
ayChk.addEventListener('change', () => { ayuda = ayChk.checked; render(); });
bCheck.addEventListener('click', comprobar);
bHint.addEventListener('click', pedirPista);
bSolve.addEventListener('click', resolver);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && sel) { sel = null; render(); } });

reiniciar(3);
