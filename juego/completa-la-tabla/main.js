// completa-la-tabla/main.js — interfaz de «Completa la tabla». La lógica vive en game.js (probada en test.mjs).
// Autocontenido: solo usa la hoja de estilo del hub. Se coloca con toque (elige ficha, elige casilla) o arrastrando.
import { CONFIGS, configDe, colorDe, COLORES, EMOJI, SUMA, CELDAS, tableroVacio, colocadas, fichasLibres, analiza, jugadaLimpia,
  esSolucion, soluciones, pista as pedirJugada } from './game.js?v=20261106c';

const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- estado ----------
let cfg = configDe(new URLSearchParams(location.search).get('v') || 'ayuda');
let b = tableroVacio(cfg), sel = null, moves = 0, hints = 0, elapsed = 0, since = null;
let solved = false, revealed = false, ayuda = true, avisos = true, comprobado = false;
let msg = { text: '', cls: '' }, pista = null, drag = null;
const historial = [];
const locked = () => solved || revealed;
const esFija = i => cfg.dados[i] !== undefined;

// ---------- DOM ----------
root.innerHTML = '';
const wrap = h('div', 'wrap');
const header = h('header');
const titulo = h('h1', 'cb-titulo');
// título con una letra de cada color del arcoíris
const letras = 'Completa la tabla'.split('');
const paleta = ['#ee2e4b', '#ff8a1f', '#ffc81e', '#14b85a', '#1f78ff', '#8a4dff'];
let ci = 0; letras.forEach(ch => { const s = h('span', null, ch); if (ch !== ' ') { s.style.color = paleta[ci % paleta.length]; ci++; } titulo.appendChild(s); });
titulo.setAttribute('aria-label', 'Completa la tabla');
header.appendChild(titulo);
header.appendChild(h('div', 'cb-franja'));
header.appendChild(h('p', 'sub', 'Dieciséis fichas de cuatro colores, una tabla y mucho 34.'));
const back = h('a', 'back', '← Volver a los juegos'); back.href = '../'; header.appendChild(back);
wrap.appendChild(header);

const card = h('div', 'card cb-card');
const ctrl = h('div', 'cb-ctrl');
const modo = h('select'); modo.setAttribute('aria-label', 'Variante');
CONFIGS.forEach(c => { const o = h('option', null, c.label); o.value = c.key; modo.appendChild(o); });
modo.value = cfg.key;
const bNew = h('button', 'cb-btn cb-b-new', 'Reiniciar'); bNew.type = 'button';
const bUndo = h('button', 'cb-btn cb-b-undo', 'Deshacer'); bUndo.type = 'button';
ctrl.append(modo, bNew, bUndo);
card.appendChild(ctrl);

const opts = h('div', 'cb-ctrl');
const mk = (txt, checked, fn) => { const l = h('label', 'cb-opt'); const c = document.createElement('input'); c.type = 'checkbox'; c.checked = checked; c.addEventListener('change', () => fn(c.checked)); l.append(c, document.createTextNode(txt)); return l; };
opts.append(
  mk('Avisos en vivo (sumas y colores repetidos)', true, v => { avisos = v; render(); }),
  mk('Marcar casillas buenas', true, v => { ayuda = v; render(); }));
card.appendChild(opts);

const resumen = h('p', 'cb-resumen');
const datos = h('div', 'cb-datos');
const msgEl = h('div', 'cb-msg'); msgEl.setAttribute('role', 'status'); msgEl.setAttribute('aria-live', 'polite');
card.append(resumen, datos, msgEl);

const zona = h('div', 'cb-zona');
const tab = h('div', 'cb-tab'); const rej = h('div', 'cb-rej'); rej.setAttribute('role', 'group'); rej.setAttribute('aria-label', 'Tabla 4 por 4');
tab.appendChild(rej);
const sf = h('div', 'cb-sf'), sc = h('div', 'cb-sc');
const chipD1 = h('div', 'cb-chip cb-d1'), chipD2 = h('div', 'cb-chip cb-d2');
zona.append(chipD2, tab, sf, sc, chipD1);
card.appendChild(zona);

const mano = h('div', 'cb-mano'); mano.setAttribute('role', 'group'); mano.setAttribute('aria-label', 'Fichas por colocar');
card.appendChild(mano);

const ctrl2 = h('div', 'cb-ctrl cb-ctrl2');
const bCheck = h('button', 'cb-btn cb-b-comp', 'Comprobar'); bCheck.type = 'button';
const bHint = h('button', 'cb-btn cb-b-pista', '💡 Pista'); bHint.type = 'button';
bHint.title = 'Primero te dice el color de la ficha y de la casilla; si pulsas otra vez, el número. Cada pulsación cuenta como una pista gastada.';
const bSolve = h('button', 'cb-btn cb-b-res', 'Resolver'); bSolve.type = 'button';
ctrl2.append(bCheck, bHint, bSolve);
card.appendChild(ctrl2);

const leyenda = h('div', 'cb-leyenda');
card.appendChild(leyenda);
const info = h('div', 'cb-info');
card.appendChild(info);
wrap.appendChild(card);

const rules = h('div', 'card');
rules.appendChild(h('h2', null, 'Reglas'));
const r0 = h('p', 'cb-intro'); r0.innerHTML = '<b>Coloca las 16 fichas en la tabla de forma que:</b>';
const ul = h('ul', 'cb-reglas'); ul.id = 'cb-reglas';
const r1 = h('p', 'cb-intro'); r1.innerHTML = '<b>Cómo se juega.</b> Toca una ficha de la mano y luego una casilla, o arrástrala. Toca una ficha colocada para devolverla a la mano, o arrástrala a otra casilla (si está ocupada, se intercambian). Las fichas con 📌 son pistas fijas y no se pueden mover. Los círculos de los bordes dan la suma de cada fila, columna y diagonal, y, en la versión extendida, los redondos entre cuatro casillas dan la de cada cuadrado 2×2. «Pista» primero te dice qué color va en una casilla y, si la pulsas otra vez, qué número. «Comprobar» marca en verde lo que ya está bien y en rojo lo que no.';
const r2 = h('p', 'cb-intro'); r2.innerHTML = '<b>Un detalle curioso.</b> Con los colores del acertijo original no existe ninguna solución en la que además las dos diagonales tengan los cuatro colores. Por eso la versión extendida usa otro reparto: rojas 1–4, amarillas 5–8, verdes 9–12 y azules 13–16. Con ese reparto, y con 1, 8 y 10 en la primera fila, la solución es única. La variante «un solo color» quita la regla de las diagonales, porque no es compatible con tener una ficha roja en cada cuadrado 2×2.';
rules.append(r0, ul, r1, r2);
wrap.appendChild(rules);
const foot = h('footer'); foot.innerHTML = 'Acertijo «Completa la tabla» de Junio Puzzles, con una versión extendida de este sitio · <a href="../">Juegos</a> · <a href="../../">El problema del día</a>';
wrap.appendChild(foot);
root.appendChild(wrap);

// ---------- utilidades ----------
const fmt = ms => { const t = Math.floor(ms / 1000); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
const nowElapsed = () => elapsed + (since ? Date.now() - since : 0);
function startClock() { if (!since && !locked()) since = Date.now(); }
function stopClock() { if (since) { elapsed += Date.now() - since; since = null; } }
function setMsg(text, cls) { msg = { text, cls: cls || '' }; }
const fichasDe = c => ({ 0: 'rojas', 1: 'amarillas', 2: 'verdes', 3: 'azules' }[c]);
function changed() { pista = null; comprobado = false; }
const hayAvisos = () => avisos || comprobado;
function legalesPara(v) {
  const s = new Set(); if (!ayuda || !v) return s;
  for (let i = 0; i < CELDAS; i++) if (!esFija(i) && jugadaLimpia(cfg, b.map((x, k) => (k === i ? 0 : x)), i, v)) s.add(i);
  return s;
}
function fichaActiva() { return drag && drag.moved ? drag.v : sel; }

// ---------- pintar ----------
function ficha(v, extra) {
  const e = h('button', 'cb-t c' + colorDe(cfg, v) + (extra ? ' ' + extra : ''), String(v)); e.type = 'button';
  return e;
}
function chip(cls, texto, titulo) { const e = h('div', 'cb-chip ' + cls); e.textContent = texto; if (titulo) e.title = titulo; return e; }
function textoChip(l, titulo) {
  const mal = l.estado === 'mal' && hayAvisos(), ok = l.estado === 'ok' && hayAvisos();
  const cls = l.estado === 'vacia' ? 'vacia' : (mal ? 'mal' : ok ? 'ok' : (l.estado === 'ok' || l.estado === 'mal') ? 'parcial' : 'parcial');
  return [cls, l.estado === 'vacia' ? '·' : String(l.suma), titulo];
}
function renderTabla() {
  const A = analiza(cfg, b), leg = legalesPara(fichaActiva());
  rej.innerHTML = ''; sf.innerHTML = ''; sc.innerHTML = '';
  tab.querySelectorAll('.cb-sq').forEach(e => e.remove());
  for (let i = 0; i < CELDAS; i++) {
    const v = b[i], fija = esFija(i);
    const cls = ['cb-hueco'];
    if (fija) cls.push('fijo');
    if (!v && leg.has(i)) cls.push('legal');
    if (pista && pista.celda === i && !pista.quitar) cls.push('pista');
    if (v && hayAvisos() && A.conflictos.has(i)) cls.push('dup');
    const el = h('div', cls.join(' ')); el.dataset.celda = String(i); el.setAttribute('role', 'button'); el.tabIndex = v ? -1 : 0;
    el.appendChild(h('span', 'cb-i', String(i + 1)));
    if (v) {
      const ex = [];
      if (fija) ex.push('fija');
      if (hayAvisos() && A.conflictos.has(i)) ex.push('mal');
      if (pista && pista.quitar && pista.celda === i) ex.push('pista');
      const t = ficha(v, ex.join(' '));
      t.setAttribute('aria-label', 'Casilla ' + (i + 1) + ': ficha ' + v + ' ' + COLORES[colorDe(cfg, v)] + (fija ? ', fija' : locked() ? '' : '. Pulsa para devolverla a la mano'));
      if (locked() || fija) { t.disabled = locked() && !fija ? true : false; if (fija) t.style.cursor = 'not-allowed'; }
      if (!locked() && !fija) bindDrag(t, v, i);
      else if (fija) t.addEventListener('click', () => { setMsg('📌 Esa ficha es una pista fija: va ahí y no se puede mover.', ''); render(); });
      el.appendChild(t);
    } else {
      el.setAttribute('aria-label', 'Casilla ' + (i + 1) + ', vacía' + (leg.has(i) ? ', buena para la ficha elegida' : ''));
      el.addEventListener('click', () => onCelda(i));
    }
    rej.appendChild(el);
  }
  // sumas de filas, columnas y diagonales
  A.filas.forEach((l, k) => { const [c, t, ti] = textoChip(l, 'Fila ' + (k + 1)); sf.appendChild(chip(c, t, ti)); });
  A.cols.forEach((l, k) => { const [c, t, ti] = textoChip(l, 'Columna ' + (k + 1)); sc.appendChild(chip(c, t, ti)); });
  { const [c, t] = textoChip(A.diags[0], 'Diagonal ↘'); chipD1.className = 'cb-chip cb-d1 ' + c; chipD1.textContent = (t === '·' ? '↘' : t); chipD1.title = 'Diagonal larga ↘ (de arriba a la izquierda a abajo a la derecha)'; }
  { const [c, t] = textoChip(A.diags[1], 'Diagonal ↙'); chipD2.className = 'cb-chip cb-d2 ' + c; chipD2.textContent = (t === '·' ? '↙' : t); chipD2.title = 'Diagonal larga ↙ (de arriba a la derecha a abajo a la izquierda)'; }
  // cuadrados 2×2: redondos en el cruce de cuatro casillas
  if (cfg.cuadrados) A.cuads.forEach((l, k) => {
    const r = Math.floor(k / 3), c = k % 3, [cl0, t] = textoChip(l, '');
    const cub = cfg.cubre !== undefined ? A.cubren[k] : null;   // regla de «un solo color»
    const completo = l.estado === 'ok' || l.estado === 'mal';
    let cl = cl0, oculto = !completo;
    if (cub) {
      if (completo) cl = (l.estado === 'ok' && cub.estado === 'ok') ? (hayAvisos() ? 'ok' : 'parcial') : (hayAvisos() ? 'mal' : 'parcial');
      else if (cub.tiene) { cl = 'parcial'; oculto = false; }
    }
    const e = chip((oculto ? 'vacia' : cl) + ' cb-sq', oculto || !completo ? '' : t, 'Cuadrado 2×2' + (cub ? ' (suma 34 y una ficha ' + COLORES[cfg.cubre] + ')' : ''));
    if (cub && cub.tiene) e.style.boxShadow = '0 0 0 3px ' + ['#ee2e4b', '#ffc81e', '#14b85a', '#1f78ff'][cfg.cubre] + ', 0 1px 4px rgba(0,0,0,.25)';
    e.style.left = 'calc(' + (c + 1) * 25 + '% + (' + (c - 1) + ') * var(--g) / 4)';
    e.style.top = 'calc(' + (r + 1) * 25 + '% + (' + (r - 1) + ') * var(--g) / 4)';
    tab.appendChild(e);
  });
  return A;
}
function renderMano() {
  const libres = fichasDe_libres();
  mano.innerHTML = '';
  libres.forEach(v => {
    const t = ficha(v, (sel === v ? 'sel ' : '') + (pista && pista.valor === v && pista.nivel === 2 ? 'pista' : ''));
    t.dataset.val = String(v);
    t.setAttribute('aria-label', 'Ficha ' + v + ' ' + COLORES[colorDe(cfg, v)] + (sel === v ? ', elegida' : '')); t.setAttribute('aria-pressed', String(sel === v));
    t.disabled = locked();
    if (!t.disabled) bindDrag(t, v, null);
    mano.appendChild(t);
  });
  if (!libres.length) mano.appendChild(h('div', 'cb-vacia', 'Ya has colocado todas las fichas.'));
}
function fichasDe_libres() { return fichasLibres(b); }
function renderDatos(A) {
  datos.innerHTML = '';
  const add = (cls, t, v, id) => { const s = h('span', 'cb-dato ' + cls); s.appendChild(document.createTextNode(t + ' ')); const bb = document.createElement('b'); bb.textContent = v; if (id) bb.id = id; s.appendChild(bb); datos.appendChild(s); };
  add('d1', 'Colocadas', colocadas(b) + ' de ' + CELDAS); add('d2', 'Movimientos', String(moves)); add('d3', 'Pistas', String(hints)); add('d4', 'Tiempo', fmt(nowElapsed()), 'cb-time');
}
function renderLeyenda() {
  leyenda.innerHTML = '';
  [0, 1, 2, 3].forEach(c => {
    const s = h('span'); const i = document.createElement('i'); i.style.background = ['#ee2e4b', '#ffc81e', '#14b85a', '#1f78ff'][c];
    const lista = fichasDeColor(c).join(', ');
    s.append(i, document.createTextNode(fichasDe(c)[0].toUpperCase() + fichasDe(c).slice(1) + ': ' + lista)); leyenda.appendChild(s);
  });
}
function fichasDeColor(c) { const out = []; for (let n = 1; n <= 16; n++) if (colorDe(cfg, n) === c) out.push(n); return out; }
function renderReglas() {
  const ul = document.getElementById('cb-reglas'); ul.innerHTML = '';
  const li = t => { const e = h('li'); e.innerHTML = t; ul.appendChild(e); };
  li('Cada fila, columna y diagonal larga suma <b>34</b>.');
  li('Un cuadrado de cada color (rojo, amarillo, verde y azul) aparece en cada fila y columna' + (cfg.diagColor ? ' <b>y en las dos diagonales largas</b>' : '') + '.');
  if (cfg.cuadrados) li('Cada uno de los <b>9 cuadrados 2×2</b> interiores suma 34.');
  if (cfg.cubre !== undefined) li('En cada uno de los 9 cuadrados 2×2 hay <b>una ficha ' + COLORES[cfg.cubre] + '</b> (el redondo se rodea de ' + COLORES[cfg.cubre] + ' cuando ya la tiene).');
}
function renderInfo() {
  info.innerHTML = '';
  const n = soluciones(cfg).length, dados = Object.keys(cfg.dados).length;
  info.appendChild(h('p', null, cfg.corto + ': ' + n + (n === 1 ? ' solución en total.' : ' soluciones en total, contando giros y reflejos del tablero.') + (dados ? ' Hay ' + dados + ' casillas dadas (📌).' : '')));
}
function renderBotones() {
  bCheck.disabled = locked() || colocadas(b) === Object.keys(cfg.dados).length;
  bHint.disabled = locked();
  bSolve.disabled = revealed;
  bUndo.disabled = !historial.length || revealed;
}
function render() {
  msgEl.innerHTML = ''; if (msg.text) { msgEl.append(document.createTextNode(msg.text)); } msgEl.className = 'cb-msg ' + msg.cls;
  resumen.textContent = cfg.resumen;
  const A = renderTabla(); renderMano(); renderDatos(A); renderBotones();
}
setInterval(() => { const e = document.getElementById('cb-time'); if (e && since) e.textContent = fmt(nowElapsed()); }, 500);

// ---------- acciones ----------
function snapshot() { historial.push({ b: b.slice(), moves }); if (historial.length > 200) historial.shift(); }
function afterMove() {
  changed();
  if (colocadas(b) === CELDAS) {
    if (esSolucion(cfg, b)) { solved = true; stopClock(); setMsg('🎉 ¡Resuelto! ' + moves + ' movimientos, ' + hints + (hints === 1 ? ' pista' : ' pistas') + ' y ' + fmt(nowElapsed()) + '.', 'ok'); confeti(); }
    else { comprobado = true; setMsg('Están todas colocadas, pero algo no cuadra: mira los círculos rojos y las fichas con «!». Cambia fichas de sitio hasta que todo sea verde.', 'bad'); }
  } else setMsg('', '');
  render();
}
function poner(v, i) {   // v sale de la mano (o de otra casilla) y va a i; lo que hubiera en i vuelve a la mano
  startClock(); snapshot();
  b[i] = v; moves++; sel = null; afterMove();
}
function devolver(i) { startClock(); snapshot(); b[i] = 0; moves++; sel = null; afterMove(); }
function mover(desde, hasta) { startClock(); snapshot(); const t = b[hasta]; b[hasta] = b[desde]; b[desde] = t; moves++; sel = null; afterMove(); }
function onCelda(i) {
  if (locked()) return;
  if (esFija(i)) { setMsg('📌 Esa casilla es una pista fija.', ''); render(); return; }
  if (!sel) { setMsg('Primero elige una ficha de la mano (o arrástrala hasta aquí).', ''); render(); return; }
  poner(sel, i);
}
function onTap(v, desde) {
  if (locked()) return;
  if (desde === null) { sel = sel === v ? null : v; setMsg('', ''); pista = null; render(); }
  else devolver(desde);
}

// ---------- arrastrar (ratón y dedo) ----------
let ignorarClick = 0;
function bindDrag(el, v, desde) {
  el.addEventListener('pointerdown', e => {
    if (locked() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    drag = { v, desde, el, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
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
    if (d.moved) { ignorarClick = performance.now() + 400; endDrag(d, e.clientX, e.clientY); }
    else if (desde === null) onTap(v, desde);   // la mano se gestiona aquí; las casillas, con el click (ratón, dedo y teclado)
  });
  el.addEventListener('pointercancel', () => { if (drag && drag.el === el) { cancelDrag(drag); drag = null; render(); } });
  el.addEventListener('click', e => {
    if (desde === null) { if (e.detail === 0) onTap(v, desde); return; }
    if (performance.now() < ignorarClick) return;
    onTap(v, desde);
  });
}
function startDrag() {
  drag.moved = true;
  const g = h('div', 'cb-ghost c' + colorDe(cfg, drag.v), String(drag.v)); document.body.appendChild(g); drag.ghost = g;
  drag.el.style.opacity = '.3';
  const leg = legalesPara(drag.v);
  rej.querySelectorAll('.cb-hueco').forEach(s => { if (leg.has(+s.dataset.celda) && !b[+s.dataset.celda]) s.classList.add('legal'); });
  moveGhost(drag.x0, drag.y0);
}
function moveGhost(x, y) { if (drag && drag.ghost) drag.ghost.style.transform = 'translate(' + (x - 29) + 'px,' + (y - 31) + 'px)'; }
function cancelDrag(d) { if (d.ghost) d.ghost.remove(); d.el.style.opacity = ''; }
function endDrag(d, x, y) {
  cancelDrag(d);
  const target = document.elementFromPoint(x, y), cel = target && target.closest ? target.closest('[data-celda]') : null;
  const enMano = target && target.closest ? target.closest('.cb-mano') : null;
  if (cel) {
    const i = +cel.dataset.celda;
    if (esFija(i)) { setMsg('📌 Esa casilla es una pista fija: no se puede cambiar.', 'bad'); render(); return; }
    if (d.desde === null) { poner(d.v, i); return; }
    if (i === d.desde) { render(); return; }
    mover(d.desde, i); return;
  }
  if (enMano && d.desde !== null) { devolver(d.desde); return; }
  render();
}

// ---------- botones ----------
function comprobar() {
  comprobado = true; pista = null;
  const A = analiza(cfg, b);
  const malas = [...A.filas, ...A.cols, ...A.diags, ...A.cuads].filter(l => l.estado === 'mal').length;
  const dup = A.conflictos.size;
  if (!malas && !dup) setMsg('Todo lo colocado hasta ahora va bien: ninguna suma pasa de 34 y no se repite ningún color. ' + (colocadas(b) < CELDAS ? 'Sigue así.' : ''), 'ok');
  else setMsg((dup ? dup + (dup === 1 ? ' ficha repite color' : ' fichas repiten color') + ' en su fila, columna o diagonal (marcadas con «!»)' : '') + (dup && malas ? ' y ' : '') +
    (malas ? malas + (malas === 1 ? ' línea tiene' : ' líneas tienen') + ' una suma que no puede ser 34 (en rojo)' : '') + '.', 'bad');
  render();
}
function pedirPista() {
  if (locked()) return;
  // segundo toque sobre la misma pista: se revela el número
  if (pista && pista.nivel === 1 && !pista.quitar && !b[pista.celda]) {
    hints++; pista = { ...pista, nivel: 2 }; sel = null;
    setMsg('Pista (gastada): en la casilla ' + (pista.celda + 1) + ' va el ' + pista.valor + ' ' + EMOJI[pista.color] + '. Está resaltado en la mano.', 'pista');
    render(); return;
  }
  const r = pedirJugada(cfg, b); hints++; sel = null; pista = null;
  if (r.tipo === 'completo') setMsg('Ya no hace falta pista: está completo.', 'ok');
  else if (r.tipo === 'quitar') {
    pista = { celda: r.celda, quitar: true };
    setMsg(r.celda >= 0 ? 'Pista (gastada): lo que has colocado no lleva a ninguna solución. Prueba a devolver la ficha marcada de la casilla ' + (r.celda + 1) + '.' : 'Lo colocado no lleva a ninguna solución; reinicia o devuelve fichas a la mano.', 'bad');
  } else {
    pista = { celda: r.celda, valor: r.valor, color: r.color, nivel: 1 };
    setMsg('Pista (gastada): en la casilla ' + (r.celda + 1) + ' (resaltada) va una ficha ' + EMOJI[r.color] + ' ' + COLORES[r.color] + '. ' + (r.forzada ? 'Es la única jugada posible ahí. ' : '') + 'Pulsa «Pista» otra vez si quieres saber el número.', 'pista');
  }
  render();
}
function resolver() {
  if (revealed) return;
  const comp = soluciones(cfg).filter(s => b.every((v, i) => !v || s[i] === v));
  const s = (comp.length ? comp : soluciones(cfg))[0];
  snapshot(); b = s.slice(); revealed = true; stopClock(); sel = null; pista = null; comprobado = true;
  setMsg(comp.length ? 'Aquí tienes una solución que encaja con lo que habías colocado.' : 'Lo que habías colocado no lleva a ninguna solución. Aquí tienes una.', '');
  render();
}
function reiniciar(nuevoCfg) {
  if (nuevoCfg) cfg = nuevoCfg;
  b = tableroVacio(cfg); sel = null; moves = 0; hints = 0; elapsed = 0; since = null; solved = false; revealed = false; pista = null; comprobado = false; historial.length = 0;
  setMsg('', ''); renderLeyenda(); renderReglas(); renderInfo(); render();
}
function deshacer() {
  if (!historial.length || revealed) return;
  const s = historial.pop(); b = s.b; moves = s.moves; solved = false; sel = null; pista = null; comprobado = false; setMsg('', ''); render();
}
function confeti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = h('div', 'cb-confeti'); const cols = ['#ee2e4b', '#ffc81e', '#14b85a', '#1f78ff', '#8a4dff', '#ff8a1f'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('i'); p.style.left = Math.random() * 100 + '%'; p.style.background = cols[i % cols.length];
    p.style.animationDelay = (Math.random() * 0.9) + 's'; p.style.animationDuration = (2 + Math.random() * 1.6) + 's'; c.appendChild(p);
  }
  document.body.appendChild(c); setTimeout(() => c.remove(), 4800);
}

modo.addEventListener('change', () => { reiniciar(configDe(modo.value)); history.replaceState(null, '', '?v=' + cfg.key); });
bNew.addEventListener('click', () => reiniciar());
bUndo.addEventListener('click', deshacer);
bCheck.addEventListener('click', comprobar);
bHint.addEventListener('click', pedirPista);
bSolve.addEventListener('click', resolver);
window.__cb = { get b() { return b; }, get cfg() { return cfg; } };   // para las pruebas en navegador
reiniciar();
