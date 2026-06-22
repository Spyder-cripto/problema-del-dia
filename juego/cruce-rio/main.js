// cruce-rio/main.js — FASE 3: UI de los dos acertijos de cruce de río (misioneros y caníbales).
// Solitario, AUTOCONTENIDO (NO usa el motor _engine/): la lógica vive en game.js, que se apoya en
// el oráculo BFS de solver.js (Fases 1 y 2, verificadas). Aquí solo está la presentación:
// orillas/islote como tierra sobre el río, figuras con remeros marcados, embarcar/desembarcar a
// clic, remar, contador de travesías vs óptimo, pista y deshacer/reiniciar.
import { makeRowers, makeIsland } from './game.js';

const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// ---------- definición de los dos acertijos ----------
const PUZZLES = {
  rowers: {
    label: 'Los únicos remeros', emoji: '🚣',
    make: () => makeRowers(18, 18, 1, 1, 5),
    M: 18, C: 18, MR: 1, CR: 1, b: 5,
    places: [{ id: 0, name: 'Orilla izquierda' }, { id: 1, name: 'Orilla derecha' }],
    blurb: '18 misioneros y 18 caníbales, barca de 5 — pero solo 1 misionero y 1 caníbal saben remar (★), y la regla cuenta también dentro de la barca.',
  },
  island: {
    label: 'El islote de relevo', emoji: '🏝️',
    make: () => makeIsland(10, 10, 3),
    M: 10, C: 10, b: 3,
    places: [{ id: 0, name: 'Orilla izquierda' }, { id: 1, name: 'Islote' }, { id: 2, name: 'Orilla derecha' }],
    blurb: '10 misioneros y 10 caníbales, barca de 3, con un islote en mitad del río: la corriente obliga a hacer relevo y la regla vale en las tres ubicaciones.',
  },
};

// ---------- estado de la partida ----------
let pk = 'rowers';                       // clave del puzzle activo
let P, game, state, optimal, load, history, count, status, lossReason, hint, notice;
let stage;                               // contenedor dinámico

const emptyLoad = () => pk === 'rowers' ? { mn: 0, mr: 0, cn: 0, cr: 0 } : { m: 0, c: 0 };
const loadTotal = () => pk === 'rowers' ? load.mn + load.mr + load.cn + load.cr : load.m + load.c;
const loadHasRower = () => load.mr + load.cr > 0;     // solo variante remeros
const dock = () => state[4];                          // ubicación de la barca

// ocupantes (totales) de una ubicación según el estado actual
function occupants(place) {
  if (pk === 'rowers') {
    const [mnL, mrL, cnL, crL] = state;
    if (place === 0) return { mn: mnL, mr: mrL, cn: cnL, cr: crL };
    return { mn: (P.M - P.MR) - mnL, mr: P.MR - mrL, cn: (P.C - P.CR) - cnL, cr: P.CR - crL };
  }
  if (place === 0) return { m: state[0], c: state[1] };
  if (place === 1) return { m: state[2], c: state[3] };
  return { m: P.M - state[0] - state[2], c: P.C - state[1] - state[3] };
}

// ---------- icono de figura (SVG): misionero (azul, aureola) / caníbal (rojo, moño); remero con remo + ★
function figSVG(kind, rower) {
  const col = kind === 'M' ? 'var(--azul)' : 'var(--rojo)';
  const p = [];
  if (kind === 'M') p.push(`<ellipse cx="15" cy="5.4" rx="6.3" ry="2" fill="none" stroke="#cba43c" stroke-width="1.5"/>`);
  else p.push(`<circle cx="15" cy="5" r="2.1" fill="${col}"/>`);
  p.push(`<circle cx="15" cy="13" r="5" fill="${col}"/>`);
  p.push(`<path d="M7.5 40 L15 20 L22.5 40 Z" fill="${col}"/>`);
  if (rower) {
    p.push(`<line x1="2.5" y1="33" x2="27" y2="14" stroke="#7a5a2e" stroke-width="2.3" stroke-linecap="round"/>`);
    p.push(`<ellipse cx="28" cy="12.5" rx="2.7" ry="1.5" fill="#7a5a2e" transform="rotate(-38 28 12.5)"/>`);
    p.push(`<circle cx="6" cy="9" r="4.6" fill="#ecc760" stroke="#a9802f" stroke-width="1"/>`);
    p.push(`<text x="6" y="11.3" text-anchor="middle" font-size="6.4" fill="#5a3d12">★</text>`);
  }
  return `<svg viewBox="0 0 30 42" class="cr-svg">${p.join('')}</svg>`;
}

function figEl(kind, rower, onClick) {
  const e = h(onClick ? 'button' : 'span', 'cr-fig' + (onClick ? '' : ' cr-static'));
  e.innerHTML = figSVG(kind, rower);
  const lbl = (kind === 'M' ? 'Misionero' : 'Caníbal') + (rower ? ' remero' : '');
  e.title = lbl; e.setAttribute('aria-label', lbl);
  if (onClick) e.addEventListener('click', onClick);
  return e;
}

function boatHull() {
  return `<svg class="cr-hull" viewBox="0 0 170 46" preserveAspectRatio="none" aria-hidden="true">
    <rect x="3" y="20" width="164" height="3" rx="1.5" fill="#6f4f29"/>
    <path d="M5 22 L165 22 L146 42 Q85 51 24 42 Z" fill="#a47e49" stroke="#6f4f29" stroke-width="2.5"/>
  </svg>`;
}

// ---------- acciones ----------
function reset() {
  P = PUZZLES[pk];
  game = P.make();
  state = game.initial.slice();
  optimal = game.optimal();
  load = emptyLoad();
  history = []; count = 0; status = 'playing'; lossReason = null; hint = null; notice = null;
  renderStage();
}

function board(type) {
  if (status !== 'playing' || loadTotal() >= P.b) return;
  const o = occupants(dock());
  if ((o[type] - load[type]) <= 0) return;            // no queda ese tipo en la orilla de la barca
  load[type]++; hint = null; notice = null; renderStage();
}

function unboard(type) {
  if (status !== 'playing' || load[type] <= 0) return;
  load[type]--; hint = null; notice = null; renderStage();
}

function sail(to) {
  if (status !== 'playing' || loadTotal() === 0) return;
  let move;
  if (pk === 'rowers') {
    if (!loadHasRower()) return;
    move = { mn: load.mn, mr: load.mr, cn: load.cn, cr: load.cr, from: dock(), to: 1 - dock() };
  } else {
    move = { m: load.m, c: load.c, from: dock(), to };
  }
  const res = game.apply(state, move);
  if (res.status === 'invalid') { notice = 'Esa jugada no es válida.'; renderStage(); return; }
  history.push({ state: state.slice(), count });
  state = res.next.slice(); count++;
  load = emptyLoad(); hint = null; notice = null;
  if (res.status === 'win') status = 'won';
  else if (res.status === 'loss') { status = 'lost'; lossReason = res.reason; }
  renderStage();
}

function undo() {
  if (!history.length) return;
  const prev = history.pop();
  state = prev.state.slice(); count = prev.count;
  load = emptyLoad(); status = 'playing'; lossReason = null; hint = null; notice = null;
  renderStage();
}

function doHint() {
  if (status !== 'playing') return;
  const hnt = game.hint(state);
  if (!hnt) { notice = 'Desde aquí ya no se puede llegar a la meta. Deshaz o reinicia.'; hint = null; renderStage(); return; }
  load = pk === 'rowers'
    ? { mn: hnt.move.mn, mr: hnt.move.mr, cn: hnt.move.cn, cr: hnt.move.cr }
    : { m: hnt.move.m, c: hnt.move.c };
  hint = { dist: hnt.dist, to: pk === 'rowers' ? 1 - dock() : hnt.move.to };
  notice = null; renderStage();
}

// ---------- textos ----------
function describeLoad() {
  const m = pk === 'rowers' ? load.mn + load.mr : load.m;
  const c = pk === 'rowers' ? load.cn + load.cr : load.c;
  const parts = [];
  if (m) parts.push(`${m} misionero${m > 1 ? 's' : ''}`);
  if (c) parts.push(`${c} caníbal${c > 1 ? 'es' : ''}`);
  return parts.join(' y ');
}

function lossMessage(reason) {
  if (reason === 'boat') return 'En la barca quedaron más caníbales que misioneros.';
  if (reason === 'location') return 'En una de las ubicaciones (orilla u islote) quedaron más caníbales que misioneros.';
  return 'En una de las orillas quedaron más caníbales que misioneros.';
}

// ---------- render ----------
function renderStage() {
  stage.innerHTML = '';

  // pestañas de variante
  const tabs = h('div', 'cr-tabs');
  for (const k of Object.keys(PUZZLES)) {
    const t = h('button', 'cr-tab' + (k === pk ? ' active' : ''), `${PUZZLES[k].emoji} ${PUZZLES[k].label}`);
    if (k !== pk) t.addEventListener('click', () => { pk = k; reset(); });
    tabs.appendChild(t);
  }
  stage.appendChild(tabs);
  stage.appendChild(h('p', 'cr-blurb', P.blurb));

  // panel-río: escena + barca
  const river = h('div', 'cr-river' + (status === 'lost' ? ' shake' : ''));
  const scene = h('div', 'cr-scene');
  for (const pl of P.places) scene.appendChild(renderPlace(pl.id, pl.name));
  river.appendChild(scene);
  river.appendChild(renderBoatbar());
  stage.appendChild(river);

  // aviso / pista
  const note = h('div', 'cr-notice');
  if (hint) {
    const dest = P.places[hint.to].name.toLowerCase();
    note.innerHTML = `💡 <b>Pista:</b> lleva ${describeLoad()} a ${dest}. Estás a <b>${hint.dist}</b> travesía${hint.dist === 1 ? '' : 's'} de la meta.`;
  } else if (notice) note.textContent = notice;
  stage.appendChild(note);

  // contadores
  const meta = h('div', 'cr-meta');
  meta.innerHTML = `<span>Travesías: <b>${count}</b></span><span>Óptimo: <b>${optimal}</b></span>`;
  stage.appendChild(meta);

  // banderín de fin de partida
  if (status === 'won') {
    const el = h('div', 'cr-banner win');
    el.innerHTML = `🎉 <b>¡Resuelto en ${count} travesías!</b> ` +
      (count === optimal ? '🏅 Y es el <b>óptimo</b>: imposible hacerlo en menos.' : `El óptimo es ${optimal} — ¿puedes igualarlo?`);
    stage.appendChild(el);
  } else if (status === 'lost') {
    const el = h('div', 'cr-banner loss');
    el.innerHTML = `❌ <b>Se los comieron.</b> ${lossMessage(lossReason)}<br>Pulsa <b>↶ Deshacer</b> para probar otra jugada o <b>🔄 Reiniciar</b>.`;
    stage.appendChild(el);
  }

  // controles
  const ctrl = h('div', 'controls'); ctrl.style.marginTop = '12px';
  const grp = h('div', 'grp');
  const hintBtn = h('button', null, '💡 Pista'); hintBtn.disabled = status !== 'playing'; hintBtn.addEventListener('click', doHint);
  const undoBtn = h('button', null, '↶ Deshacer'); undoBtn.disabled = !history.length; undoBtn.addEventListener('click', undo);
  const resetBtn = h('button', null, '🔄 Reiniciar'); resetBtn.addEventListener('click', reset);
  grp.appendChild(hintBtn); grp.appendChild(undoBtn); grp.appendChild(resetBtn);
  ctrl.appendChild(grp);
  stage.appendChild(ctrl);
}

function renderPlace(id, name) {
  const isDock = id === dock();
  const el = h('div', 'cr-place' + (isDock ? ' dock' : ''));
  const head = h('div', 'cr-place-head');
  head.appendChild(h('span', null, (isDock ? '⛵ ' : '') + name));

  const o = occupants(id);
  const mg = h('div', 'cr-grp'), cg = h('div', 'cr-grp');
  const canBoard = isDock && status === 'playing';
  // sobre la orilla quedan los ocupantes MENOS los que ya están embarcados (solo en el muelle)
  if (pk === 'rowers') {
    const sh = isDock ? { mn: o.mn - load.mn, mr: o.mr - load.mr, cn: o.cn - load.cn, cr: o.cr - load.cr } : o;
    for (let i = 0; i < sh.mr; i++) mg.appendChild(figEl('M', true, canBoard ? () => board('mr') : null));
    for (let i = 0; i < sh.mn; i++) mg.appendChild(figEl('M', false, canBoard ? () => board('mn') : null));
    for (let i = 0; i < sh.cr; i++) cg.appendChild(figEl('C', true, canBoard ? () => board('cr') : null));
    for (let i = 0; i < sh.cn; i++) cg.appendChild(figEl('C', false, canBoard ? () => board('cn') : null));
    head.appendChild(h('span', 'cr-pop', `${(sh.mn + sh.mr)}M · ${(sh.cn + sh.cr)}C`));
  } else {
    const m = isDock ? o.m - load.m : o.m, c = isDock ? o.c - load.c : o.c;
    for (let i = 0; i < m; i++) mg.appendChild(figEl('M', false, canBoard ? () => board('m') : null));
    for (let i = 0; i < c; i++) cg.appendChild(figEl('C', false, canBoard ? () => board('c') : null));
    head.appendChild(h('span', 'cr-pop', `${m}M · ${c}C`));
  }
  el.appendChild(head); el.appendChild(mg); el.appendChild(cg);
  return el;
}

function renderBoatbar() {
  const bar = h('div', 'cr-boatbar');
  const boat = h('div', 'cr-boat'); boat.innerHTML = boatHull();
  const playing = status === 'playing';
  if (loadTotal() === 0) boat.appendChild(h('span', 'cr-boat-empty', '(barca vacía)'));
  else if (pk === 'rowers') {
    for (let i = 0; i < load.mr; i++) boat.appendChild(figEl('M', true, playing ? () => unboard('mr') : null));
    for (let i = 0; i < load.mn; i++) boat.appendChild(figEl('M', false, playing ? () => unboard('mn') : null));
    for (let i = 0; i < load.cr; i++) boat.appendChild(figEl('C', true, playing ? () => unboard('cr') : null));
    for (let i = 0; i < load.cn; i++) boat.appendChild(figEl('C', false, playing ? () => unboard('cn') : null));
  } else {
    for (let i = 0; i < load.m; i++) boat.appendChild(figEl('M', false, playing ? () => unboard('m') : null));
    for (let i = 0; i < load.c; i++) boat.appendChild(figEl('C', false, playing ? () => unboard('c') : null));
  }
  bar.appendChild(boat);

  const right = h('div', 'cr-sailwrap');
  right.appendChild(h('div', 'cr-cap', `Barca: ${loadTotal()}/${P.b}`));
  right.appendChild(renderSail());
  bar.appendChild(right);
  return bar;
}

function renderSail() {
  const wrap = h('div', 'cr-sail');
  if (status !== 'playing') return wrap;
  if (pk === 'rowers') {
    const to = 1 - dock();
    const btn = h('button', 'primary', to === 1 ? 'Remar a la derecha ▶' : '◀ Remar a la izquierda');
    btn.disabled = loadTotal() === 0 || !loadHasRower();
    if (loadTotal() > 0 && !loadHasRower()) btn.title = 'La barca necesita al menos un remero (★) a bordo';
    if (hint) btn.classList.add('hintglow');
    btn.addEventListener('click', () => sail(to));
    wrap.appendChild(btn);
  } else {
    for (const to of [dock() - 1, dock() + 1]) {
      if (to < 0 || to > 2) continue;
      const name = P.places[to].name;
      const btn = h('button', 'primary', to < dock() ? `◀ Remar a ${name}` : `Remar a ${name} ▶`);
      btn.disabled = loadTotal() === 0;
      if (hint && hint.to === to) btn.classList.add('hintglow');
      btn.addEventListener('click', () => sail(to));
      wrap.appendChild(btn);
    }
  }
  return wrap;
}

// ---------- página ----------
function helpCard() {
  const help = h('div', 'card');
  help.appendChild(h('h2', null, 'Cómo se juega'));
  const d = document.createElement('div');
  d.innerHTML =
    '<p>Hay que pasar a <b>todos</b> al otro lado del río sin que, en ningún momento y en <b>ningún sitio</b> ' +
    '(las orillas, la barca y —en la segunda variante— el islote), los <b>caníbales</b> superen en número a los ' +
    '<b>misioneros</b>: en cuanto eso ocurre, se los comen y pierdes.</p>' +
    '<p>Pulsa una figura de la orilla donde está la barca (⛵) para <b>subirla</b>; púlsala dentro de la barca para ' +
    '<b>bajarla</b>. Cuando la carga esté lista, pulsa <b>Remar</b> para cruzar. La barca no se mueve sola.</p>' +
    '<p><b>Los únicos remeros:</b> solo <b>un misionero y un caníbal</b> saben remar (los del remo y la estrella ★); ' +
    'cada viaje necesita al menos uno de ellos a bordo, y la regla cuenta también <b>dentro de la barca</b>.</p>' +
    '<p><b>El islote de relevo:</b> la corriente impide cruzar de un tirón — la barca solo navega entre sitios ' +
    '<b>contiguos</b> (orilla ↔ islote ↔ orilla), así que hay que hacer relevo en el islote.</p>' +
    '<p style="font-size:.92rem;color:var(--muted)">Cada variante tiene un <b>óptimo</b> hallado por búsqueda ' +
    'exhaustiva. Usa <b>💡 Pista</b> si te atascas: te da la mejor jugada y a cuántas travesías estás de la meta. ' +
    'Inspirados en «Grafos dirigidos y caníbales» de Martin Gardner.</p>';
  help.appendChild(d);
  return help;
}

function build() {
  root.innerHTML = '';
  const wrap = h('div', 'wrap');
  const header = h('header');
  header.appendChild(h('h1', null, 'Cruce del río'));
  header.appendChild(h('p', 'sub', 'Misioneros y caníbales: dos variantes endurecidas, cada una con su óptimo'));
  const back = h('a', 'back', '← Mes de la Matemática Recreativa'); back.href = '../'; header.appendChild(back);
  wrap.appendChild(header);

  const card = h('div', 'card');
  stage = h('div'); stage.id = 'cr-stage';
  card.appendChild(stage);
  wrap.appendChild(card);

  wrap.appendChild(helpCard());
  const foot = h('footer');
  foot.innerHTML = 'Acertijos de cruce de río · <a href="../">Mes de la Matemática Recreativa</a>';
  wrap.appendChild(foot);
  root.appendChild(wrap);
}

build();
reset();
