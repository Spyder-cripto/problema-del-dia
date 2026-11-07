// siete-segmentos/main.js — interfaz de «Siete segmentos». Los datos y la lógica (comprobación de respuestas, lectura de las
// igualdades de palillos) viven en game.js, probada en test.mjs. Autocontenido: no usa la hoja del hub porque el juego tiene
// su propia estética de display de neón. Guarda las estrellas, el último reto y el sonido en localStorage.
import {
  SEGS, LEVELS, PUZZLES as P, byLevel, segCount, starsFor,
  eqState, decode, diff, showEq, eqObj, comprobarRespuesta, comprobarPalillos
} from './game.js';

const COL = { a: '#ff4d8d', b: '#ffd23f', c: '#7cff6b', d: '#2de2e6', e: '#3d8bff', f: '#9b5cff', g: '#ff8a3d', h: '#ff4d8d', v: '#ffd23f' };
const SEG_NAME = { a: 'Segmento superior', b: 'Segmento superior derecho', c: 'Segmento inferior derecho', d: 'Segmento inferior',
  e: 'Segmento inferior izquierdo', f: 'Segmento superior izquierdo', g: 'Segmento central', h: 'Barra horizontal', v: 'Barra vertical' };
const POS_NAME = { 0: 'primer número', 1: 'signo', 2: 'segundo número', 3: 'resultado' };
const H = y => `6,${y} 12,${y - 5} 48,${y - 5} 54,${y} 48,${y + 5} 12,${y + 5}`;
const V = (cx, y1, y2) => `${cx},${y1} ${cx + 5},${y1 + 5} ${cx + 5},${y2 - 5} ${cx},${y2} ${cx - 5},${y2 - 5} ${cx - 5},${y1 + 5}`;
const PTS = { a: H(8), g: H(50), d: H(92), f: V(5, 11, 47), b: V(55, 11, 47), e: V(5, 53, 89), c: V(55, 53, 89), h: H(50), v: V(30, 20, 80) };
const LS_KEY = 'siete-segmentos-v2';

const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const $ = s => document.querySelector(s);
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- dibujo ---------- */
const poly = (key, lit, extra = '', color) =>
  `<polygon points="${PTS[key]}" class="seg ${lit ? 'on' : 'off'}" style="--c:${color || COL[key]}" ${extra}/>`;
const svg = (inner, hidden = true) =>
  `<svg class="gl" viewBox="0 0 60 100" ${hidden ? 'aria-hidden="true" focusable="false"' : 'role="group"'}>${inner}</svg>`;
const digitSVG = d => svg([...'abcdefg'].map(l => poly(l, SEGS[d].includes(l))).join(''));
const glyphs = n => `<span class="num">${[...String(n)].map(c => digitSVG(+c)).join('')}</span>`;
const opSVG = plus => svg(poly('h', true) + poly('v', plus));
const eqSVG = () => svg(`<polygon points="${H(38)}" class="seg on" style="--c:#f6f1ff"/><polygon points="${H(62)}" class="seg on" style="--c:#f6f1ff"/>`);

function interactive(pos, keys, on, orig, lk) {
  let out = '', over = '';
  for (const l of keys) {
    const k = `${pos}:${l}`, isOn = on.has(k), was = orig.has(k);
    out += poly(l, isOn, `data-k="${k}" ${lk ? '' : 'tabindex="0"'} role="button" aria-pressed="${isOn}" aria-label="${SEG_NAME[l]} del ${POS_NAME[pos]}"`);
    if (was && !isOn) over += `<polygon points="${PTS[l]}" class="ghost"/>`;   // hueco que has dejado
    if (!was && isOn) over += `<polygon points="${PTS[l]}" class="ring"/>`;    // segmento que has colocado
  }
  return svg(out + over, false);
}

/* ---------- almacenamiento ---------- */
let SAVED = {}, soundOn = true, savedPos = null;
try {
  const o = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  if (o) { SAVED = o.stars || {}; savedPos = o.pos || null; soundOn = o.sound !== false; }
} catch (e) { SAVED = {}; }
for (const k of Object.keys(SAVED)) if (!P.some(p => p.id === k) || !(SAVED[k] >= 1 && SAVED[k] <= 3)) delete SAVED[k];
function persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ stars: SAVED, pos: { li, pi }, sound: soundOn })); } catch (e) {}
}

/* ---------- estado ---------- */
let li = 0, pi = 0, S = {}, wipeArm = false, solArm = null, flagShake = false, lastLive = '';
const cur = () => byLevel(li)[pi];
function st(p) {
  if (!S[p.id]) S[p.id] = { input: '', hist: [], hints: 0, revealed: false, solved: false, tries: 0,
    on: p.kind === 'match' ? eqState(p.eq) : null, msg: null };
  return S[p.id];
}
const locked = s => s.solved || s.revealed;
const snap = (p, s) => p.kind === 'match' ? Array.from(s.on) : s.input;
const restore = (p, s, v) => { if (p.kind === 'match') s.on = new Set(v); else s.input = v; };
function goTo(p) { li = p.lv; pi = byLevel(li).indexOf(p); solArm = null; render(); }

/* ---------- sonido (Web Audio, sin archivos) ---------- */
let actx = null;
function tone(freq, dur, type = 'sine', vol = .07, delay = 0) {
  if (!soundOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + .03);
  } catch (e) {}
}
const sfx = {
  tap: () => tone(720, .05, 'square', .025),
  ok: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .08, i * .08)),
  big: () => [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, .22, 'triangle', .08, i * .07)),
  bad: () => { tone(196, .16, 'sawtooth', .045); tone(147, .24, 'sawtooth', .045, .09); },
  hint: () => { tone(880, .1, 'sine', .06); tone(1175, .14, 'sine', .05, .08); }
};

/* ---------- acciones ---------- */
function press(d) {
  const p = cur(), s = st(p);
  if (locked(s) || p.kind === 'match' || p.kind === 'odd') return;
  if (s.input.length >= Math.min(6, p.answer.length + 1)) {
    s.msg = { t: 'info', x: `La respuesta tiene como mucho ${p.answer.length + 1} cifras. Usa Deshacer para corregir.` }; render(); return;
  }
  s.hist.push(snap(p, s)); s.input += d; s.msg = null; sfx.tap(); render();
}
function pick(d) {
  const p = cur(), s = st(p);
  if (locked(s) || p.kind !== 'odd' || s.input === String(d)) return;
  s.hist.push(snap(p, s)); s.input = String(d); s.msg = null; sfx.tap(); render();
}
function toggle(k) {
  const p = cur(), s = st(p);
  if (locked(s) || p.kind !== 'match') return;
  s.hist.push(snap(p, s));
  if (s.on.has(k)) s.on.delete(k); else s.on.add(k);
  s.msg = null; sfx.tap(); render();
}
function undo() {
  const p = cur(), s = st(p);
  if (locked(s) || !s.hist.length) return;
  restore(p, s, s.hist.pop()); s.msg = null; render();
}
function reset() {
  const p = cur(), s = st(p);
  s.hist = []; s.solved = false; s.revealed = false; solArm = null;
  s.msg = { t: 'info', x: 'Reto reiniciado. Las pistas que ya viste siguen contando.' };
  if (p.kind === 'match') s.on = eqState(p.eq); else s.input = '';
  render();
}
function hint() {
  const p = cur(), s = st(p);
  if (locked(s) || s.hints >= 3) return;
  s.hints++; sfx.hint();
  s.msg = { t: 'info', x: `Pista ${s.hints} de 3. Si aciertas ahora: ${starStr(starsFor(s.hints))}` };
  render();
}
function reveal() {
  const p = cur(), s = st(p);
  if (s.solved || s.revealed) return;
  if (solArm !== p.id) {   // primera pulsación: pide confirmación, porque ver la solución no suma estrellas
    solArm = p.id;
    setTimeout(() => { if (solArm === p.id) { solArm = null; render(); } }, 4000);
    render(); return;
  }
  solArm = null; s.revealed = true;
  s.msg = { t: 'info', x: 'Solución mostrada. Este intento no suma estrellas; puedes reiniciar el reto y resolverlo tú.', next: true };
  if (p.kind === 'match') s.on = eqState(p.sol); else s.input = p.answer;
  render();
}
function solve(p, s) {
  const lvWasDone = byLevel(p.lv).every(q => SAVED[q.id]);
  const stars = starsFor(s.hints);
  s.solved = true;
  SAVED[p.id] = Math.max(SAVED[p.id] || 0, stars);
  persist();
  const lvDone = byLevel(p.lv).every(q => SAVED[q.id]);
  const allDone = P.every(q => SAVED[q.id]);
  let x = `¡Correcto! ${starStr(stars)}`;
  if (s.tries === 0 && s.hints === 0) x += ' A la primera.';
  if (allDone) x += ' Has resuelto todos los retos.';
  else if (lvDone && !lvWasDone) x += ` Nivel ${LEVELS[p.lv].name} completado.`;
  s.msg = { t: 'ok', x, next: true };
  if (lvDone && !lvWasDone) { sfx.big(); burst(80); } else { sfx.ok(); burst(36); }
  render();
}
function check() {
  const p = cur(), s = st(p);
  if (locked(s)) return;
  const r = p.kind === 'match' ? comprobarPalillos(p, s.on) : comprobarRespuesta(p, s.input, s.tries);
  if (r.ok) return solve(p, s);
  if (r.tipo === 'mal') { s.tries++; flagShake = true; sfx.bad(); }
  s.msg = { t: r.tipo === 'mal' ? 'bad' : 'info', x: r.msg };
  render();
}
function next() {
  const idx = P.indexOf(cur());
  const target = P.slice(idx + 1).find(q => !SAVED[q.id]) || P.find(q => !SAVED[q.id]) || P[(idx + 1) % P.length];
  goTo(target);
}
function burst(n) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fx = $('#fx'), cols = Object.values(COL).slice(0, 7);
  for (let i = 0; i < n; i++) {
    const e = document.createElement('i');
    e.style.left = (Math.random() * 100) + '%';
    e.style.background = cols[i % cols.length];
    e.style.animationDelay = (Math.random() * .4) + 's';
    e.style.animationDuration = (1.3 + Math.random() * .9) + 's';
    fx.appendChild(e);
    setTimeout(() => e.remove(), 2800);
  }
}

/* ---------- pintado ---------- */
// el pintado rehace la tarjeta entera; para no perder el foco del teclado se recuerda qué control lo tenía
function focusSig() {
  const a = document.activeElement;
  if (!a || a === document.body || !a.getAttribute) return null;
  for (const attr of ['id', 'data-k', 'data-n', 'data-pi', 'data-lv', 'data-t']) {
    const v = a.getAttribute(attr);
    if (v != null) return [attr, v];
  }
  return null;
}
function restoreFocus(sig, preferNext) {
  let el = null;
  if (preferNext) el = $('#b-next');
  if (!el && sig) el = sig[0] === 'id' ? document.getElementById(sig[1]) : document.querySelector(`[${sig[0]}="${sig[1]}"]`);
  if (el && el.disabled) el = $('#b-next') || $('#b-reset');
  if (el && document.activeElement !== el) { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
}
function qBox(s) {
  const cls = s.solved ? ' solved' : s.revealed ? ' shown' : s.input ? ' filled' : '';
  return `<span class="q${cls}" aria-label="Respuesta: ${s.input || 'vacía'}">${s.input ? [...s.input].map(c => digitSVG(+c)).join('') : '?'}</span>`;
}
function tokenHTML(t, s) {
  t = String(t);
  if (t === '?') return qBox(s);
  if (/^\d+$/.test(t)) return glyphs(t);
  if (t === '+') return opSVG(true);
  if (t === '-') return opSVG(false);
  if (t === '=') return eqSVG();
  return '';
}
function stepsHTML(p) {
  if (!p.base) return '';
  let run = 0;
  return '<div class="steps">' + p.base.map((n, i) => {
    const c = segCount(n); run += c;
    const lab = p.mode === 'off' ? `${7 - c} apagados` : p.mode === 'cum' ? `+${c} = ${run}` : `${c} seg.`;
    return `<div class="step${i === p.base.length - 1 && p.kind !== 'odd' ? ' last' : ''}">${glyphs(n)}<span>${lab}</span></div>`;
  }).join('') + '</div>';
}
function render() {
  const sig = focusSig();
  const p = cur(), s = st(p), lv = LEVELS[li], lk = locked(s);
  const tot = P.reduce((a, q) => a + (SAVED[q.id] || 0), 0);
  const solvedCount = P.filter(q => SAVED[q.id]).length;
  $('#stars').textContent = `${tot} / ${P.length * 3}`;
  $('#total-note').textContent = `${solvedCount} de ${P.length} retos resueltos.`;
  const sb = $('#b-sound'); sb.setAttribute('aria-pressed', String(soundOn)); sb.textContent = `Sonido: ${soundOn ? 'sí' : 'no'}`;

  $('#levels').innerHTML = LEVELS.map((L, i) => {
    const l = byLevel(i), done = l.filter(q => SAVED[q.id]).length;
    return `<button class="lvl" role="tab" type="button" data-lv="${i}" style="--lv:${L.c}" aria-selected="${i === li}" aria-controls="card">
      <span class="n">${L.name}</span><span class="c">${done} de ${l.length} resueltos</span>
      <span class="bar" aria-hidden="true"><i style="--p:${Math.round(done / l.length * 100)}%"></i></span></button>`;
  }).join('');
  $('#chips').innerHTML = byLevel(li).map((q, i) => {
    const sv = SAVED[q.id] || 0;
    return `<button class="chip${i === pi ? ' cur' : ''}${sv ? ' done' : ''}" type="button" data-pi="${i}" style="--lv:${lv.c}"
      ${i === pi ? 'aria-current="true"' : ''} aria-label="Reto ${i + 1}: ${esc(q.title)}${sv ? ', ' + sv + ' estrellas' : ''}">${i + 1}${sv ? `<small aria-hidden="true">${'★'.repeat(sv)}</small>` : ''}</button>`;
  }).join('');

  let html = `<div class="meta"><span class="pill">${lv.name.toUpperCase()} · ${pi + 1}/${byLevel(li).length}</span>
    <h2>${esc(p.title)}</h2><p>${esc(p.prompt)}</p></div>`;
  const best = SAVED[p.id] || 0;
  html += '<div class="info">' +
    (s.solved ? `<span>Conseguido: <b>${starStr(starsFor(s.hints))}</b></span>`
      : s.revealed ? '<span>Solución vista</span>'
      : `<span>Si aciertas ahora: <b>${starStr(starsFor(s.hints))}</b></span>`) +
    `<span>Intentos fallidos: ${s.tries}</span>` +
    (best ? `<span>Mejor marca: <b>${starStr(best)}</b></span>` : '') + '</div>';

  if (p.kind === 'match') {
    const orig = eqState(p.eq), on = s.on, d = diff(orig, on), q = decode(on);
    const reading = q ? `Se lee ${showEq(q)}` : 'Hay algún símbolo incompleto';
    html += `<div class="stage match${lk ? ' locked' : ''}" id="stage" aria-label="Igualdad original: ${showEq(eqObj(p.eq))}">
      <div class="row">${interactive(0, 'abcdefg', on, orig, lk)}${interactive(1, 'hv', on, orig, lk)}${interactive(2, 'abcdefg', on, orig, lk)}${eqSVG()}${interactive(3, 'abcdefg', on, orig, lk)}</div>
      <div class="status">Movimientos: <b>${Math.max(d.add, d.rem)}</b> de ${p.k} · ${reading}${d.add !== d.rem ? ' · falta colocar o quitar un segmento' : ''}</div></div>`;
  } else if (p.kind === 'eqs') {
    html += `<div class="stage" id="stage">${p.rows.map(r => `<div class="row eq">${r.map(t => tokenHTML(t, s)).join('')}</div>`).join('')}</div>`;
  } else if (p.kind === 'odd') {
    html += `<div class="stage" id="stage"><div class="row">${p.tokens.map((t, i) =>
      `<button class="tok${s.input === String(t) ? ' sel' : ''}" type="button" data-t="${i}" data-d="${t}" ${lk ? 'disabled' : ''} aria-pressed="${s.input === String(t)}" aria-label="Dígito ${t}">${glyphs(t)}</button>`).join('')}</div>
      <div class="status">${s.input ? `Has elegido el <b>${s.input}</b>.` : 'Toca el dígito que sobra.'}</div></div>`;
  } else {
    html += `<div class="stage" id="stage" aria-label="Serie: ${p.tokens.map(t => t === '?' ? 'interrogación' : t).join(', ')}"><div class="row series">${p.tokens.map(t => tokenHTML(t, s)).join('<span class="sep" aria-hidden="true"></span>')}</div></div>`;
  }
  if (p.kind === 'series' || p.kind === 'eqs') {
    html += `<div class="keys" aria-label="Teclado">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n =>
      `<button class="key" type="button" data-n="${n}" ${lk ? 'disabled' : ''} aria-label="Escribir ${n}">${digitSVG(n)}${n}</button>`).join('')}</div>`;
  }
  const armed = solArm === p.id;
  html += `<div class="actions">
    <button class="btn primary" type="button" id="b-check" style="--b:var(--pink)" ${lk ? 'disabled' : ''}>Comprobar</button>
    <button class="btn" type="button" id="b-hint" style="--b:var(--yellow)" ${lk || s.hints >= 3 ? 'disabled' : ''}>Pista ${s.hints}/3</button>
    <button class="btn" type="button" id="b-undo" style="--b:var(--cyan)" ${lk || !s.hist.length ? 'disabled' : ''}>Deshacer</button>
    <button class="btn" type="button" id="b-reset" style="--b:var(--violet)">Reiniciar</button>
    <button class="btn${armed ? ' armed' : ''}" type="button" id="b-sol" style="--b:var(--orange)" ${lk ? 'disabled' : ''}>${armed ? '¿Seguro? Pulsa otra vez' : 'Solución'}</button></div>`;
  const m = s.msg;
  html += `<div class="fb ${m ? m.t : ''}"><span>${m ? esc(m.x) : ''}</span>${m && m.next ? '<button class="btn" type="button" id="b-next" style="--b:var(--green)">Siguiente reto</button>' : ''}</div>`;
  if (s.hints) html += `<ul class="hints" aria-label="Pistas">${p.hints.slice(0, s.hints).map((h, i) => `<li><b>${i + 1}</b><span>${esc(h)}</span></li>`).join('')}</ul>`;
  if (lk) html += `<div class="why${s.revealed ? ' shown' : ''}"><strong>Cómo se resuelve</strong><p>${esc(p.why)}</p>${stepsHTML(p)}</div>`;
  if (P.every(q => SAVED[q.id])) html += `<div class="banner"><strong>¡Todos los retos resueltos!</strong>Llevas ${tot} de ${P.length * 3} estrellas. Reinicia cualquier reto para mejorar tu marca.</div>`;

  const card = $('#card');
  card.style.setProperty('--lv', lv.c);
  card.setAttribute('aria-label', `${lv.name}, reto ${pi + 1}: ${p.title}`);
  card.innerHTML = html;
  if (flagShake) { flagShake = false; const sg = $('#stage'); if (sg) sg.classList.add('shake'); }

  const liveText = m ? m.x : '';
  if (liveText && liveText !== lastLive) $('#live').textContent = liveText;
  lastLive = liveText;
  restoreFocus(sig, m && m.next && sig && sig[0] === 'id' && (sig[1] === 'b-check' || sig[1] === 'b-sol'));
  try { if (location.hash !== '#' + p.id) history.replaceState(null, '', '#' + p.id); } catch (e) {}
  persist();
}

/* ---------- eventos ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (!t.closest) return;
  const seg = t.closest('[data-k]');
  if (seg) { toggle(seg.getAttribute('data-k')); return; }
  let b;
  if ((b = t.closest('.key'))) { press(b.getAttribute('data-n')); return; }
  if ((b = t.closest('.tok'))) { pick(b.getAttribute('data-d')); return; }
  if ((b = t.closest('.lvl'))) {
    li = +b.getAttribute('data-lv');
    const l = byLevel(li), firstOpen = l.findIndex(q => !SAVED[q.id]);
    pi = firstOpen < 0 ? 0 : firstOpen; solArm = null; render(); return;
  }
  if ((b = t.closest('.chip'))) { pi = +b.getAttribute('data-pi'); solArm = null; render(); return; }
  if (t.closest('#b-check')) return check();
  if (t.closest('#b-hint')) return hint();
  if (t.closest('#b-undo')) return undo();
  if (t.closest('#b-reset')) return reset();
  if (t.closest('#b-sol')) return reveal();
  if (t.closest('#b-next')) return next();
  if (t.closest('#b-sound')) { soundOn = !soundOn; if (soundOn) sfx.tap(); render(); return; }
  if (t.closest('#wipe')) {
    const w = $('#wipe');
    if (!wipeArm) {
      wipeArm = true; w.textContent = 'Pulsa otra vez para borrar todo';
      setTimeout(() => { wipeArm = false; w.textContent = 'Borrar progreso'; }, 3500);
    } else {
      wipeArm = false; SAVED = {}; S = {}; li = 0; pi = 0; w.textContent = 'Borrar progreso';
      $('#live').textContent = 'Progreso borrado.'; render();
    }
  }
});
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const a = document.activeElement, k = a && a.getAttribute && a.getAttribute('data-k');
  if (k && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(k); return; }
  const p = cur();
  if (/^\d$/.test(e.key)) {
    if (p.kind === 'odd') { if (p.tokens.map(String).includes(e.key)) pick(e.key); }
    else if (p.kind !== 'match') press(e.key);
    return;
  }
  if (e.key === 'Backspace') { e.preventDefault(); undo(); return; }
  if (e.key === 'p' || e.key === 'P') { hint(); return; }
  if (e.key === 'Enter' && !(a && (a.tagName === 'BUTTON' || a.tagName === 'SUMMARY' || a.tagName === 'A'))) check();
});
document.addEventListener('animationend', e => { if (e.target.classList && e.target.classList.contains('shake')) e.target.classList.remove('shake'); });
window.addEventListener('hashchange', () => {
  const p = P.find(q => '#' + q.id === location.hash);
  if (p && p !== cur()) goTo(p);
});

$('#guide').innerHTML = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<div class="d">${digitSVG(d)}<span>${d} · ${SEGS[d].length}</span></div>`).join('');

/* ---------- arranque: el reto del enlace (#e7), el último que jugaste o el primero sin resolver ---------- */
{
  const fromHash = P.find(q => '#' + q.id === location.hash);
  if (fromHash) { li = fromHash.lv; pi = byLevel(li).indexOf(fromHash); }
  else if (savedPos) { li = savedPos.li | 0; pi = savedPos.pi | 0; }
  else { const first = P.find(q => !SAVED[q.id]) || P[0]; li = first.lv; pi = byLevel(li).indexOf(first); }
  if (!LEVELS[li]) li = 0;
  if (!byLevel(li)[pi]) pi = 0;
  render();
}
