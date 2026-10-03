// relojes-arena/main.js — interfaz de «Relojes de arena». La lógica (modelo, solver, partida) vive en game.js (probada en test.mjs).
// Autocontenido: solo usa la hoja de estilo del hub. La arena cae de verdad (animación con requestAnimationFrame) y el reloj
// se detiene solo en cada instante reconocible: ahí se actúa, y solo ahí se pueden marcar el inicio y el fin del periodo.
import { PUZZLES, Partida, ARRANCAR, GIRAR, analizar, narrar, solucionDe, minutos } from './game.js';

const root = document.getElementById('app');
const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const NS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

// ---------- estado ----------
let puzzle = PUZZLES[0], P = new Partida(puzzle), velocidad = 60, cronometro = false, pistasDadas = 0, verSolucion = false;
let plan = null, ultimo = null;   // plan: acciones de una solución que se reproducen solas
const infoPuzzle = new Map();     // id -> { sol, total }
const info = p => { if (!infoPuzzle.has(p.id)) { const a = analizar(p.clocks, p.maxGiros, p.objetivo); infoPuzzle.set(p.id, { a, sol: a.soluciones[0] }); } return infoPuzzle.get(p.id); };

// ---------- DOM ----------
root.innerHTML = '';
const wrap = h('div', 'wrap');
const header = h('header');
header.appendChild(h('h1', null, 'Relojes de arena'));
header.appendChild(h('p', 'sub', 'Mide un tiempo exacto con relojes que no sirven para eso.'));
const back = h('a', 'back', '← Volver a los juegos'); back.href = '../'; header.appendChild(back);
wrap.appendChild(header);

const card = h('div', 'card');
const sel = h('select'); sel.setAttribute('aria-label', 'Elige el puzzle');
PUZZLES.forEach(p => { const o = h('option', null, p.titulo); o.value = p.id; sel.appendChild(o); });
const enunciado = h('p', 'ra-enun');
card.append(sel, enunciado);

const clocksEl = h('div', 'ra-relojes');
card.appendChild(clocksEl);

const ctrl = h('div', 'ra-ctrl');
const bPlay = h('button', 'primary', '▶ Continuar'); bPlay.type = 'button';
const bSalto = h('button', null, '⏭ Hasta el próximo instante'); bSalto.type = 'button';
const bReset = h('button', null, '↺ Reiniciar'); bReset.type = 'button';
ctrl.append(bPlay, bSalto, bReset);
card.appendChild(ctrl);
const velBox = h('div', 'ra-vel'); velBox.setAttribute('role', 'group'); velBox.setAttribute('aria-label', 'Velocidad');
velBox.appendChild(h('span', null, 'Velocidad:'));
const velBtns = [[1, '×1 (tiempo real)'], [10, '×10'], [60, '×60']].map(([v, t]) => { const b = h('button', null, t); b.type = 'button'; b.addEventListener('click', () => { velocidad = v; renderVel(); }); velBox.appendChild(b); return [v, b]; });
const cronoLab = h('label', 'ra-opt'); const cronoChk = document.createElement('input'); cronoChk.type = 'checkbox';
cronoLab.append(cronoChk, document.createTextNode('Mostrar cronómetro (con él el puzzle se simplifica mucho)'));
velBox.appendChild(cronoLab);
card.appendChild(velBox);
const status = h('div', 'ra-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
const crono = h('div', 'ra-crono'); crono.hidden = true;
card.append(status, crono);

card.appendChild(h('h2', 'ra-h2', 'Registro'));
const logEl = h('ol', 'ra-log');
card.appendChild(logEl);
const medidaEl = h('div', 'ra-medida'); medidaEl.setAttribute('aria-live', 'polite');
card.appendChild(medidaEl);

const ayudas = h('div', 'ra-ctrl ra-ayudas');
const bPista = h('button', null, 'Pista'); bPista.type = 'button';
const bSol = h('button', null, 'Ver solución'); bSol.type = 'button';
ayudas.append(bPista, bSol);
card.appendChild(ayudas);
const pistasEl = h('div', 'ra-pistas'), solEl = h('div', 'ra-solucion'); solEl.hidden = true;
card.append(pistasEl, solEl);
wrap.appendChild(card);

const reglas = h('div', 'card');
reglas.appendChild(h('h2', null, 'Reglas'));
const rp = h('p', 'ra-intro');
rp.innerHTML = '<b>Cada reloj tiene su duración</b> y la arena cae a un minuto por minuto. <b>Arrancar</b> pone en marcha un reloj nuevo. <b>Girar</b> le da la vuelta: en marcha, la arena que ya ha caído es la que queda por caer; si estaba vacío, vuelve a correr entero. <b>Después de ponerlo en marcha, cada reloj solo se puede girar una vez.</b> ' +
  'Solo sabes la hora por los relojes, así que <b>solo puedes actuar en un instante reconocible</b>: el minuto 0 o el momento exacto en que se acaba la arena de algún reloj (la animación se detiene sola ahí). ' +
  'El periodo que mides <b>no tiene por qué empezar en el minuto 0</b>: marca en el registro el instante de inicio y el de fin, y la página te dice cuántos minutos has medido.';
reglas.appendChild(rp);
const rq = h('p', 'ra-intro'); rq.id = 'ra-origen';
reglas.appendChild(rq);
wrap.appendChild(reglas);
const foot = h('footer'); foot.innerHTML = 'Un puzzle clásico de medir el tiempo · <a href="../">Juegos</a> · <a href="../../">El problema del día</a>';
wrap.appendChild(foot);
root.appendChild(wrap);

// ---------- relojes ----------
let refs = [];
function dibujarReloj(D) {
  const svg = sv('svg', { viewBox: '0 0 100 170', class: 'ra-svg', 'aria-hidden': 'true' });
  const id = 'rc' + Math.random().toString(36).slice(2, 8);
  const defs = sv('defs', {});
  const cArriba = sv('clipPath', { id: id + 'a' }); cArriba.appendChild(sv('path', { d: 'M18 14 H82 L54 82 H46 Z' }));
  const cAbajo = sv('clipPath', { id: id + 'b' }); cAbajo.appendChild(sv('path', { d: 'M46 88 H54 L82 156 H18 Z' }));
  defs.append(cArriba, cAbajo); svg.appendChild(defs);
  const arena1 = sv('rect', { x: 10, y: 82, width: 80, height: 0, fill: '#d8a93a', 'clip-path': 'url(#' + id + 'a)' });
  const arena2 = sv('rect', { x: 10, y: 156, width: 80, height: 0, fill: '#d8a93a', 'clip-path': 'url(#' + id + 'b)' });
  const chorro = sv('line', { x1: 50, y1: 82, x2: 50, y2: 156, stroke: '#d8a93a', 'stroke-width': 2.5, visibility: 'hidden' });
  svg.append(arena1, arena2, chorro);
  svg.appendChild(sv('path', { d: 'M18 14 H82 L54 82 H46 Z M46 88 H54 L82 156 H18 Z', fill: 'none', stroke: '#8a6a44', 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
  svg.appendChild(sv('path', { d: 'M46 82 H54 V88 H46 Z', fill: '#8a6a44' }));
  svg.appendChild(sv('rect', { x: 12, y: 6, width: 76, height: 8, rx: 3, fill: '#8a6a44' }));
  svg.appendChild(sv('rect', { x: 12, y: 156, width: 76, height: 8, rx: 3, fill: '#8a6a44' }));
  return { svg, arena1, arena2, chorro };
}
function construirRelojes() {
  clocksEl.innerHTML = ''; refs = [];
  puzzle.clocks.forEach((D, c) => {
    const box = h('div', 'ra-reloj');
    box.appendChild(h('div', 'ra-nombre', 'Reloj de ' + D));
    const g = dibujarReloj(D); box.appendChild(g.svg);
    const est = h('div', 'ra-est'); box.appendChild(est);
    const bA = h('button', null, 'Arrancar'); bA.type = 'button';
    const bG = h('button', null, 'Girar'); bG.type = 'button';
    bA.addEventListener('click', () => actuar(c, ARRANCAR)); bG.addEventListener('click', () => actuar(c, GIRAR));
    const acc = h('div', 'ra-acc'); acc.append(bA, bG); box.appendChild(acc);
    const gi = h('div', 'ra-giros'); box.appendChild(gi);
    clocksEl.appendChild(box);
    refs.push({ ...g, est, bA, bG, gi, box, D });
  });
}

// ---------- pintar ----------
function renderEnun() {
  enunciado.innerHTML = 'Tienes relojes de arena de <b>' + puzzle.clocks.join(', ').replace(/, (\d+)$/, ' y $1') + ' minutos</b>. Mide exactamente <b>' + minutos(puzzle.objetivo) + '</b>' +
    (puzzle.maxGiros === 1 ? ', sabiendo que <b>después de poner en marcha un reloj solo puedes darle la vuelta una vez</b>.' : '.');
  document.getElementById('ra-origen').textContent = puzzle.origen;
}
function renderVel() { velBtns.forEach(([v, b]) => { b.classList.toggle('on', v === velocidad); b.setAttribute('aria-pressed', String(v === velocidad)); }); }
const fmt = m => { const s = Math.round(m * 60), mm = Math.floor(s / 60); return mm + ':' + String(s % 60).padStart(2, '0'); };
function renderRelojes() {
  const v = P.vista();
  v.forEach((r, c) => {
    const f = refs[c], D = r.D, alto = 68;
    const arriba = r.st === 0 ? D : r.top, abajo = r.st === 0 ? 0 : D - r.top;   // un reloj nuevo se ve con toda la arena arriba
    f.arena1.setAttribute('y', String(82 - alto * arriba / D)); f.arena1.setAttribute('height', String(alto * arriba / D));
    f.arena2.setAttribute('y', String(156 - alto * abajo / D)); f.arena2.setAttribute('height', String(alto * abajo / D));
    f.chorro.setAttribute('visibility', r.st === 1 && P.corriendo ? 'visible' : 'hidden');
    f.est.textContent = r.st === 0 ? 'Sin arrancar' : r.st === 2 ? 'Vacío (toda la arena abajo)' : 'En marcha: caen ' + (Math.round(r.top * 10) / 10) + ' min';
    f.gi.textContent = r.st === 0 ? 'Giros: 0 de ' + (puzzle.maxGiros === Infinity ? '∞' : puzzle.maxGiros) : 'Giros usados: ' + r.giros + ' de ' + (puzzle.maxGiros === Infinity ? '∞' : puzzle.maxGiros);
    f.bA.classList.toggle('apagado', !P.puede(c, ARRANCAR));
    f.bG.classList.toggle('apagado', !P.puede(c, GIRAR));
    f.box.classList.toggle('acaba', r.st === 2 && P.enInstante && P.log.length && P.log[P.log.length - 1].t === P.S.t);
  });
}
function renderLog() {
  logEl.innerHTML = '';
  const porT = new Map();
  for (const e of P.log) { if (!porT.has(e.t)) porT.set(e.t, []); porT.get(e.t).push(e); }
  for (const [t, es] of porT) {
    const li = h('li', 'ra-instante' + (P.inicio === t ? ' ini' : '') + (P.fin === t ? ' fin' : ''));
    const cab = h('div', 'ra-cab'); cab.appendChild(h('b', null, 'Minuto ' + t));
    const bI = h('button', P.inicio === t ? 'on' : '', P.inicio === t ? '✓ Inicio' : 'Marcar inicio'); bI.type = 'button'; bI.addEventListener('click', () => { P.marcar('inicio', t); render(); });
    const bF = h('button', P.fin === t ? 'on' : '', P.fin === t ? '✓ Fin' : 'Marcar fin'); bF.type = 'button'; bF.addEventListener('click', () => { P.marcar('fin', t); render(); });
    const marcas = h('span', 'ra-marcas'); marcas.append(bI, bF); cab.appendChild(marcas); li.appendChild(cab);
    for (const e of es) li.appendChild(h('div', 'ra-ev' + (e.accion ? ' acc' : ''), e.texto));
    logEl.appendChild(li);
  }
  logEl.scrollTop = logEl.scrollHeight;
}
function renderMedida() {
  const m = P.medida(); medidaEl.className = 'ra-medida';
  if (P.inicio === null && P.fin === null) { medidaEl.textContent = 'Cuando creas que has medido el tiempo, marca en el registro el minuto de inicio y el de fin del periodo.'; return; }
  if (P.inicio === null || P.fin === null) { medidaEl.textContent = P.inicio === null ? 'Falta marcar el inicio.' : 'Falta marcar el fin.'; return; }
  const ini = P.inicio, fin = P.fin;
  if (fin <= ini) { medidaEl.textContent = 'El fin tiene que ser posterior al inicio.'; medidaEl.classList.add('mal'); return; }
  const optimo = info(puzzle).sol.acciones.length;
  if (m.ok) { medidaEl.classList.add('bien'); medidaEl.textContent = '¡Correcto! Del minuto ' + ini + ' al minuto ' + fin + ' hay exactamente ' + minutos(m.dur) + '. Lo has conseguido con ' + m.acciones + ' acciones' + (m.acciones === optimo ? ' (las mismas que la solución más corta).' : (m.acciones < optimo ? '.' : ' (la solución más corta usa ' + optimo + ').')); }
  else { medidaEl.classList.add('mal'); medidaEl.textContent = 'Del minuto ' + ini + ' al minuto ' + fin + ' hay ' + minutos(m.dur) + ', no ' + puzzle.objetivo + '. Prueba con otros instantes o con otras jugadas.'; }
}
function renderStatus() {
  if (plan) { status.textContent = 'Reproduciendo la solución…'; }
  else if (P.enInstante) {
    const ult = P.log[P.log.length - 1];
    status.textContent = P.proximo === null && P.acciones.length ? 'Minuto ' + P.S.t + ': ya no corre ningún reloj. Puedes girar alguno (si te quedan giros) o marcar el periodo.' :
      'Minuto ' + P.S.t + (ult && ult.t === P.S.t && !ult.accion && P.S.t > 0 ? ': ' + ult.texto : ': todo preparado') + ' Puedes actuar ahora o pulsar «Continuar».';
    if (P.S.t === 0 && !P.acciones.length) status.textContent = 'Minuto 0. Arranca algún reloj para empezar.';
  } else status.textContent = P.corriendo ? 'La arena cae… (se detendrá en el próximo instante reconocible)' : 'En pausa, entre dos instantes. Pulsa «Continuar» para llegar al próximo.';
  crono.hidden = !cronometro; crono.textContent = 'Cronómetro: ' + fmt(P.tiempo);
}
function renderBotones() {
  bPlay.textContent = P.corriendo ? '⏸ Pausa' : '▶ Continuar';
  bPlay.disabled = P.proximo === null || !!plan;
  bSalto.disabled = P.proximo === null || !!plan;
  bPista.textContent = pistasDadas >= puzzle.pistas.length ? 'Pistas (todas vistas)' : 'Pista (' + (pistasDadas + 1) + ' de ' + puzzle.pistas.length + ')';
  bPista.disabled = pistasDadas >= puzzle.pistas.length;
  bSol.textContent = verSolucion ? 'Ocultar la solución' : 'Ver solución';
}
function renderAyudas() {
  pistasEl.innerHTML = '';
  puzzle.pistas.slice(0, pistasDadas).forEach((t, i) => { const p = h('p', 'ra-pista'); p.appendChild(h('b', null, 'Pista ' + (i + 1) + ': ')); p.appendChild(document.createTextNode(t)); pistasEl.appendChild(p); });
  solEl.hidden = !verSolucion; solEl.innerHTML = '';
  if (verSolucion) {
    const { a, sol } = info(puzzle), nar = narrar(puzzle.clocks, puzzle.maxGiros, sol.acciones, puzzle.objetivo);
    solEl.appendChild(h('h3', null, 'Solución (la más corta: ' + sol.acciones.length + ' acciones)'));
    const ol = h('ol', 'ra-solol');
    nar.forEach(l => ol.appendChild(h('li', null, 'Minuto ' + l.t + ': ' + l.texto)));
    solEl.appendChild(ol);
    solEl.appendChild(h('p', 'ra-nota', 'El solucionador ha repasado los ' + a.hojas.toLocaleString('es') + ' calendarios posibles. ' + (a.solMinimas === 1 ? 'Esta es la única solución mínima.' : 'Hay ' + a.solMinimas + ' soluciones mínimas distintas; esta es la que acaba antes.')));
    const b = h('button', null, '▶ Reproducir la solución'); b.type = 'button'; b.addEventListener('click', reproducir); solEl.appendChild(b);
  }
}
function render() { renderRelojes(); renderLog(); renderMedida(); renderStatus(); renderBotones(); renderAyudas(); }
function renderLigero() { renderRelojes(); renderStatus(); }

// ---------- acciones ----------
function actuar(c, a) {
  if (plan) return;
  try { P.accion(c, a); P.corriendo = false; status.textContent = ''; render(); const f = refs[c]; f.svg.classList.remove('gira'); void f.svg.getBoundingClientRect(); if (a === GIRAR) f.svg.classList.add('gira'); }
  catch (e) { status.textContent = e.message; status.classList.add('aviso'); setTimeout(() => status.classList.remove('aviso'), 2500); }
}
function reproducir() {
  P.reiniciar(); plan = info(puzzle).sol.acciones.slice(); P.corriendo = true; render();
}
function reiniciar() { plan = null; P.reiniciar(); render(); }
function cambiarPuzzle(id) { puzzle = PUZZLES.find(p => p.id === id); P = new Partida(puzzle); plan = null; pistasDadas = 0; verSolucion = false; construirRelojes(); renderEnun(); render(); }

bPlay.addEventListener('click', () => { if (P.proximo === null) return; P.corriendo = !P.corriendo; render(); });
bSalto.addEventListener('click', () => { if (P.saltar()) { P.corriendo = false; render(); } });
bReset.addEventListener('click', reiniciar);
bPista.addEventListener('click', () => { if (pistasDadas < puzzle.pistas.length) { pistasDadas++; renderAyudas(); renderBotones(); } });
bSol.addEventListener('click', () => { verSolucion = !verSolucion; renderAyudas(); renderBotones(); });
cronoChk.addEventListener('change', () => { cronometro = cronoChk.checked; renderStatus(); });
sel.addEventListener('change', () => cambiarPuzzle(sel.value));

// ---------- bucle de animación ----------
function paso(ts) {
  if (ultimo === null) ultimo = ts;
  const dt = Math.min(0.25, (ts - ultimo) / 1000); ultimo = ts;
  // reproducción de la solución: en cada instante se hacen las acciones previstas y se sigue corriendo
  if (plan && P.enInstante) {
    let hizo = false;
    while (plan.length && plan[0].t === P.S.t) { const x = plan.shift(); try { P.accion(x.c, x.a); hizo = true; } catch (e) { plan = null; break; } }
    if (plan && !plan.length && P.proximo === null) { plan = null; P.corriendo = false; render(); }
    else if (plan) { P.corriendo = true; if (hizo) render(); }
  }
  if (P.corriendo) {
    const llego = P.correr(dt * velocidad / 60);
    if (llego) { render(); } else renderLigero();
  }
  requestAnimationFrame(paso);
}
construirRelojes(); renderEnun(); renderVel(); render();
requestAnimationFrame(paso);
