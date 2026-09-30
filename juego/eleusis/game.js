// eleusis/game.js — lógica pura de Eleusis solitario (El Nuevo Eleusis de Robert Abbott, según Martin Gardner).
// Sin DOM: se puede probar en Node (ver test.mjs). Las 16 reglas secretas y sus textos son los del original de Cowork,
// copiados literalmente; el flujo de juego (cadenas, «no tengo jugada», Profeta, expulsión, puntos) es el mismo.
//  · Mano de 14 cartas, doble baraja (104), regla secreta que solo depende de la línea de cartas correctas.
//  · Carta incorrecta: cuelga bajo la última correcta y robas 2; en cadena (2 a 4 cartas) falla toda y robas el doble.
//  · «No tengo jugada»: acierto = mano con 4 cartas menos (o fin si tenías 4 o menos); error = juega una buena y robas 5.
//  · Profeta: 10 cartas (5 válidas, 5 no) a decir si valen; acertar todas = +10 (+15 experto, +20 maestro) y fin; fallar = +5 cartas.
//  · Expulsión: con 30 o más cartas en la mesa, un fallo termina la ronda.

export const SUITS = ['♠', '♣', '♥', '♦'];
export const SUIT_NAMES = ['picas', 'tréboles', 'corazones', 'diamantes'];
export const VALS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const HAND_SIZE = 14, EXPEL_AT = 30;

const PRIMES = new Set([2, 3, 5, 7, 11, 13]);
const SUIT_NEXT = { 0: 2, 2: 1, 1: 3, 3: 0 };
const isBlack = c => c.s < 2, isFig = c => c.v >= 11;
const opp = c => c === 0 ? 1 : 0;
const col = c => c.s < 2 ? 0 : 1;

// Reglas: h = cartas de la línea principal (h[0] es la inicial), c = carta candidata. (Literal del original.)
export const RULES=[
  {id:'alt-color',level:1,text:'Alterna colores: negra tras roja, roja tras negra.',hint:'Solo importa el color de la última carta correcta.',
    fn:(h,c)=>col(c)!==col(h[h.length-1])},
  {id:'odd-black',level:1,text:'Si la última carta correcta es impar, juega negra; si es par, roja (A=1, J=11, Q=12, K=13).',hint:'Hay que mirar el valor de la última carta y el color de la nueva.',
    fn:(h,c)=>h[h.length-1].v%2===1?isBlack(c):!isBlack(c)},
  {id:'same-suit-or-val',level:1,text:'La carta debe tener el mismo palo o el mismo valor que la última carta correcta.',hint:'Solo cuentan la última carta correcta y la nueva.',
    fn:(h,c)=>{const l=h[h.length-1];return c.s===l.s||c.v===l.v;}},
  {id:'black-up-red-down',level:1,text:'Si la última carta correcta es negra, valor igual o mayor; si es roja, igual o menor.',hint:'El color de la última carta decide si el valor debe subir o bajar.',
    fn:(h,c)=>{const l=h[h.length-1];return isBlack(l)?c.v>=l.v:c.v<=l.v;}},
  {id:'only-odd',level:1,text:'Solo cartas de valor impar (A, 3, 5, 7, 9, J, K).',hint:'La regla no mira las cartas anteriores: solo la carta nueva.',
    fn:(h,c)=>c.v%2===1},
  {id:'alt-parity',level:1,text:'Alterna valores pares e impares.',hint:'Solo importa la paridad de la última carta correcta.',
    fn:(h,c)=>c.v%2!==h[h.length-1].v%2},

  {id:'alt-prime',level:2,text:'Alterna cartas de valor primo (2, 3, 5, 7, J, K) y no primo.',hint:'Fíjate en el valor numérico, no en el palo ni en el color.',
    fn:(h,c)=>PRIMES.has(c.v)!==PRIMES.has(h[h.length-1].v)},
  {id:'close-value',level:2,text:'El valor debe diferir como máximo 2 del valor de la última carta correcta.',hint:'Solo cuentan la última carta correcta y la nueva; los palos no importan.',
    fn:(h,c)=>Math.abs(c.v-h[h.length-1].v)<=2},
  {id:'alt-figure',level:2,text:'Alterna figuras (J, Q, K) y cartas que no son figura.',hint:'Los palos y los colores no importan.',
    fn:(h,c)=>isFig(c)!==isFig(h[h.length-1])},
  {id:'diff-suit',level:2,text:'El palo debe ser distinto al de la última carta correcta.',hint:'Solo importa el palo de la última carta correcta; el valor no.',
    fn:(h,c)=>c.s!==h[h.length-1].s},
  {id:'same-parity',level:2,text:'El valor debe tener la misma paridad que el de la última carta correcta.',hint:'Solo importa la última carta correcta y la nueva.',
    fn:(h,c)=>c.v%2===h[h.length-1].v%2},
  {id:'suit-cycle',level:2,text:'Los palos van en ciclo: ♠ → ♥ → ♣ → ♦ → ♠…',hint:'El valor y el color no importan; el palo siguiente está determinado.',
    fn:(h,c)=>c.s===SUIT_NEXT[h[h.length-1].s]},

  {id:'cycle4',level:3,text:'Cíclico: roja, negra, impar, par, y repite.',hint:'Depende de cuántas cartas correctas van, no solo de la última.',
    fn:(h,c)=>{const k=(h.length-1)%4;return k===0?!isBlack(c):k===1?isBlack(c):k===2?c.v%2===1:c.v%2===0;}},
  {id:'two-back',level:3,text:'Mira la carta correcta anterior a la última (dos atrás): si es negra, valor igual o mayor que el suyo; si es roja, igual o menor.',hint:'Depende de una carta anterior a la última, no de la última.',
    fn:(h,c)=>{if(h.length<2)return true;const p=h[h.length-2];return isBlack(p)?c.v>=p.v:c.v<=p.v;}},
  {id:'color-two',level:3,text:'Si las dos últimas cartas correctas son del mismo color, juega el color contrario; si son de colores distintos, juega el color de la última.',hint:'Depende de las dos últimas cartas, y solo de sus colores.',
    fn:(h,c)=>{if(h.length<2)return true;const l=h[h.length-1],p=h[h.length-2];return col(c)===(col(l)===col(p)?opp(col(l)):col(l));}},
  {id:'fig-even-else-gt7',level:3,text:'Si la última carta correcta es figura, juega valor par; si no lo es, juega valor mayor que 7.',hint:'Hay dos condiciones distintas según la última carta, y ninguna mira el palo.',
    fn:(h,c)=>isFig(h[h.length-1])?c.v%2===0:c.v>7}
];

// ---------- Niveles 4 (experto) y 5 (maestro): reglas nuevas del hub, añadidas DESPUÉS de las 16 originales ----------
// Dificultad medida (coste de la explicación más sencilla con un catálogo de ideas, hasta 4): nivel 3 = media 3,3 (máx. 4); experto = 5 en las cuatro;
// maestro = entre 6 y 9 (media 7,0). Todas combinan varias condiciones: nada que se resuelva mirando solo la última carta.
// `dep` dice de qué depende cada regla, para que test.mjs barra todas las situaciones posibles:
//   k = cuántas cartas finales de la línea mira (valor y palo), mod = depende también de la longitud de la línea, agg = depende de toda la línea.
// Todas dejan siempre entre 12 y 28 cartas válidas de las 52 y al menos 8 no válidas: nunca se atasca la ronda y el Profeta puede probar las dos cosas.
const prev2 = h => h.length >= 2 ? h[h.length - 2] : h[0];
const advance = (s, n) => { for (let i = 0; i < n; i++) s = SUIT_NEXT[s]; return s; };
const majorityColor = (u, c) => { const n = u.filter(isBlack).length, r = u.length - n; return n > r ? !isBlack(c) : r > n ? isBlack(c) : isBlack(c) === isBlack(u[u.length - 1]); };
const EXTRA_RULES = [
  { id: 'figura-bifurca', level: 4, dep: { k: 2 },
    text: 'Si la última carta correcta es figura (J, Q, K), la nueva debe ser del mismo palo que la carta anterior a la última; si no lo es, la nueva debe ser de valor par y de color distinto al de la última.',
    hint: 'Hay dos casos distintos según la última carta, y en cada uno se mira algo diferente.',
    fn: (h, c) => { const l = h[h.length - 1]; return isFig(l) ? c.s === prev2(h).s : (c.v % 2 === 0 && isBlack(c) !== isBlack(l)); } },
  { id: 'ciclo-de-tres', level: 4, dep: { k: 1, mod: 3 },
    text: 'Cuenta la posición de la nueva carta en la línea (la inicial es la 1.ª): en las posiciones múltiplo de 3 debe ser figura; en las que dejan resto 1 al dividir entre 3, del mismo color que la última; en las que dejan resto 2, de valor mayor que 7.',
    hint: 'Las exigencias se repiten en grupos de tres posiciones.',
    fn: (h, c) => { const r = (h.length + 1) % 3; return r === 0 ? isFig(c) : r === 1 ? isBlack(c) === isBlack(h[h.length - 1]) : c.v > 7; } },
  { id: 'circulo-doble', level: 4, dep: { k: 2 },
    text: 'Coloca los valores en un círculo A-2-…-K-A y mide hacia delante, desde la carta anterior a la última hasta la nueva: si la última es roja, de 0 a 6 pasos; si es negra, de 7 a 12. Además, la nueva debe tener un palo distinto al de la última.',
    hint: 'Hay dos condiciones a la vez: una con un círculo de valores y otra con los palos.',
    fn: (h, c) => { const l = h[h.length - 1]; const d = (c.v - prev2(h).v + 13) % 13; return (isBlack(l) ? d >= 7 : d <= 6) && c.s !== l.s; } },
  { id: 'paridad-doble', level: 4, dep: { k: 2 },
    text: 'Si la nueva carta es negra, su valor y el de la carta anterior a la última deben tener distinta paridad; si es roja, su valor y el de la última deben tener la misma paridad. Si la última carta es figura, se cumple lo contrario.',
    hint: 'El color de la nueva carta decide con qué carta se compara, y una figura cambia el sentido de la regla.',
    fn: (h, c) => { const l = h[h.length - 1]; const base = isBlack(c) ? (prev2(h).v + c.v) % 2 === 1 : (l.v + c.v) % 2 === 0; return isFig(l) ? !base : base; } },

  { id: 'mayoria-y-posicion', level: 5, dep: { k: 3, mod: 2 },
    text: 'Dos condiciones a la vez: (1) el color de la nueva es el contrario al de la mayoría de las tres últimas cartas (si hay empate, el de la última); (2) su valor es par si ocupa una posición par en la línea (la inicial es la 1.ª) e impar si ocupa una impar.',
    hint: 'Hay que vigilar a la vez una cuenta de colores y la posición de la carta.',
    fn: (h, c) => majorityColor(h.slice(-3), c) && ((h.length + 1) % 2 === 0 ? c.v % 2 === 0 : c.v % 2 === 1) },
  { id: 'memoria-de-tres', level: 5, dep: { k: 3 },
    text: 'Mira la antepenúltima carta correcta (la tercera empezando por el final; si hay menos de tres, la inicial): si es figura, la nueva debe ser del mismo palo que la última; si no lo es, del color contrario al de la carta anterior a la última.',
    hint: 'La regla depende de tres cartas distintas de la línea, y la más antigua decide qué hay que mirar.',
    fn: (h, c) => { const t = h.length >= 3 ? h[h.length - 3] : h[0]; return isFig(t) ? c.s === h[h.length - 1].s : isBlack(c) !== isBlack(prev2(h)); } },
  { id: 'suma-total-mod4', level: 5, dep: { agg: true },
    text: 'Suma los valores de TODAS las cartas de la línea principal: al dividir entre 4, el valor de la nueva carta debe dejar el mismo resto que esa suma (A=1, J=11, Q=12, K=13).',
    hint: 'Depende de toda la línea; hay que llevar una cuenta que se actualiza con cada carta correcta.',
    fn: (h, c) => c.v % 4 === h.reduce((a, x) => a + x.v, 0) % 4 },
  { id: 'palo-por-suma', level: 5, dep: { k: 2 },
    text: 'La nueva carta avanza en el ciclo de palos ♠ → ♥ → ♣ → ♦ → ♠… tantos pasos como resto deje, al dividir entre 4, la suma de los valores de las dos últimas cartas (0 pasos = el mismo palo que la última; si solo hay una carta, se cuenta dos veces).',
    hint: 'Importan los palos de la nueva y de la última, pero cuántos pasos se avanza depende de dos valores.',
    fn: (h, c) => { const l = h[h.length - 1]; return c.s === advance(l.s, (l.v + prev2(h).v) % 4); } },
  { id: 'dos-ramas', level: 5, dep: { k: 3, mod: 2 },
    text: 'Según la posición de la nueva carta en la línea (la inicial es la 1.ª): en las posiciones pares, su color es el contrario al de la mayoría de las tres últimas cartas (si hay empate, el de la última); en las impares, la suma de su valor y los de las dos últimas (o la única, si solo hay una) debe ser múltiplo de 3.',
    hint: 'Cada tipo de posición tiene su propia exigencia: una con colores y otra con una suma.',
    fn: (h, c) => (h.length + 1) % 2 === 0 ? majorityColor(h.slice(-3), c) : (h.slice(-2).reduce((a, x) => a + x.v, 0) + c.v) % 3 === 0 },
];
export const ORIGINAL_RULES = RULES.length;   // las 16 primeras son las de Cowork, literales
RULES.push(...EXTRA_RULES);

export function shuffle(a, rnd = Math.random) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function makeDeck(rnd = Math.random) { const d = []; let id = 0; for (let k = 0; k < 2; k++) for (let s = 0; s < 4; s++) for (let v = 1; v <= 13; v++) d.push({ id: id++, v, s }); return shuffle(d, rnd); }
export const cardName = c => VALS[c.v - 1] + ' de ' + SUIT_NAMES[c.s];
export const cardShort = c => VALS[c.v - 1] + SUITS[c.s];

// elige la regla de la ronda: del nivel pedido (0 = cualquiera), distinta de la anterior si se puede
export const RANDOM_MAX_LEVEL = 3;   // «Al azar» solo reparte reglas de los niveles 1 a 3; el experto y el maestro se eligen a propósito
export function pickRule(level, lastRuleId, rnd = Math.random) {
  const pool = RULES.filter(r => level === 0 ? r.level <= RANDOM_MAX_LEVEL : r.level === level);
  const cand = pool.filter(r => r.id !== lastRuleId);
  const arr = cand.length ? cand : pool;
  return arr[Math.floor(rnd() * arr.length)];
}

export function newRound(rule, rnd = Math.random, hintUsed = false) {
  const deck = makeDeck(rnd), starter = deck.pop();
  const S = { rule, deck, main: [starter], side: [[]], hand: [], placed: 0, sel: [], over: false, prophet: null,
    hintUsed, noBonus: false, prophetOK: false, result: null, rnd };
  starter.start = true;
  draw(S, HAND_SIZE);
  return S;
}

export function sortHand(S) { S.hand.sort((a, b) => a.v - b.v || a.s - b.s); }
export function draw(S, n) { for (let i = 0; i < n && S.deck.length; i++) S.hand.push(S.deck.pop()); sortHand(S); }
function place(S, c) { S.placed++; if (S.placed % 10 === 0) c.mark = S.placed; return c; }
function addToMain(S, c) { S.main.push(place(S, c)); S.side.push([]); }
function addToSide(S, group) { group.forEach(c => place(S, c)); S.side[S.side.length - 1].push(group); }

export function toggleSel(S, id) {
  if (S.over || S.prophet) return;
  const i = S.sel.indexOf(id);
  if (i >= 0) S.sel.splice(i, 1); else if (S.sel.length < 4) S.sel.push(id);
}

// juega la selección (1 carta, o cadena de 2 a 4 en el orden elegido)
export function playSelection(S) {
  if (S.over || S.prophet || !S.sel.length) return null;
  const cards = S.sel.map(id => S.hand.find(c => c.id === id));
  const expulsable = S.placed >= EXPEL_AT;
  const cur = S.main.slice(); let ok = true;
  for (const c of cards) { if (!S.rule.fn(cur, c)) { ok = false; break; } cur.push(c); }
  S.hand = S.hand.filter(c => !S.sel.includes(c.id));
  S.sel = [];
  if (ok) {
    cards.forEach(c => addToMain(S, c));
    if (!S.hand.length) { endRound(S, 'empty'); return { type: 'empty', n: cards.length }; }
    return { type: 'ok', n: cards.length };
  }
  cards.forEach(c => { c.wrong = true; });
  addToSide(S, cards);
  const pen = cards.length * 2;
  if (expulsable) { endRound(S, 'expelled', cards.length > 1 ? 'La cadena falló' : 'Carta incorrecta'); return { type: 'expelled', n: cards.length }; }
  draw(S, pen);
  return { type: 'bad', n: cards.length, pen };
}

export function noPlay(S) {
  if (S.over || S.prophet) return null;
  const anyLegal = S.hand.some(c => S.rule.fn(S.main, c));
  if (!anyLegal) {
    if (S.hand.length <= 4) {
      S.deck = S.deck.concat(S.hand); S.hand = []; S.noBonus = true;
      endRound(S, 'noplay');
      return { type: 'noplay-end' };
    }
    const n = S.hand.length - 4;
    S.deck = shuffle(S.deck.concat(S.hand), S.rnd); S.hand = [];
    draw(S, n); S.sel = [];
    return { type: 'noplay-ok', n };
  }
  const c = S.hand.find(x => S.rule.fn(S.main, x));
  S.hand = S.hand.filter(x => x !== c);
  const expulsable = S.placed >= EXPEL_AT;
  addToMain(S, c); S.sel = [];
  if (expulsable) { endRound(S, 'expelled', 'Declaraste "no tengo jugada" y sí la tenías'); return { type: 'expelled-noplay', card: c }; }
  draw(S, 5);
  return { type: 'noplay-bad', card: c };
}

// ---- Profeta ----
export function protoCard(S, line, want) {
  const r = S.rnd;
  for (let i = 0; i < 400; i++) {
    const c = { id: 'p' + r(), v: 1 + Math.floor(r() * 13), s: Math.floor(r() * 4) };
    if (!!S.rule.fn(line, c) === want) return c;
  }
  return { id: 'p' + r(), v: 1 + Math.floor(r() * 13), s: Math.floor(r() * 4) };
}
export function startProphet(S) {
  if (S.over || S.prophet) return false;
  S.sel = [];
  const labels = shuffle([true, true, true, true, true, false, false, false, false, false], S.rnd);
  S.prophet = { step: 0, labels, line: S.main.slice() };
  S.prophet.card = protoCard(S, S.prophet.line, labels[0]);
  return true;
}
export function prophetAnswer(S, sayValid) {
  const P = S.prophet, c = P.card;
  const actual = !!S.rule.fn(P.line, c);
  if (actual) { P.line.push(c); addToMain(S, c); } else { c.wrong = true; addToSide(S, [c]); }
  if (sayValid !== actual) { S.prophet = null; draw(S, 5); return { type: 'wrong', card: c, actual }; }
  P.step++;
  if (P.step >= 10) { S.prophet = null; S.prophetOK = true; endRound(S, 'prophet'); return { type: 'done' }; }
  P.card = protoCard(S, P.line, P.labels[P.step]);
  return { type: 'right', actual, step: P.step };
}

export function giveUp(S) { if (S.over) return null; S.prophet = null; endRound(S, 'gaveup'); return { type: 'gaveup' }; }

// abandonar una ronda empezada (pulsar «Nueva ronda» sin acabarla): cuenta como ronda jugada con 0 puntos. Una ronda sin tocar no cuenta.
export function abandonRound(S) {
  if (!S || S.over || S.placed === 0) return null;
  S.prophet = null; endRound(S, 'abandoned'); return { type: 'abandoned' };
}
// puntos de la ronda en curso si terminara ahora sin rendirse (14 menos las cartas de la mano; el +4 y el +10 llegan al final)
export function pointsNow(S) { return scoreOf(S.hand.length, { noBonus: S.noBonus, prophetOK: S.prophetOK, hintUsed: S.hintUsed, gaveup: false, level: S.rule.level }); }

// Profeta verdadero: +10 en los niveles 1 a 3, +15 en el experto (4) y +20 en el maestro (5)
export const prophetBonus = level => level === 5 ? 20 : level === 4 ? 15 : 10;
// puntos: 14 menos las cartas de la mano (mínimo 0), +4 si te quedas sin cartas (no si acabó por «sin jugada»), bonus de Profeta según el nivel, −3 pista, 0 si te rindes
export function scoreOf(n, { noBonus, prophetOK, hintUsed, gaveup, level = 1 }) {
  let score = Math.max(0, 14 - n);
  if (n === 0 && !noBonus) score += 4;
  if (prophetOK) score += prophetBonus(level);
  if (hintUsed) score -= 3;
  if (gaveup) score = 0;
  return Math.max(0, score);
}
export function endRound(S, why, detail) {
  S.over = true; S.prophet = null;
  const n = S.hand.length;
  const score = scoreOf(n, { noBonus: S.noBonus, prophetOK: S.prophetOK, hintUsed: S.hintUsed, gaveup: why === 'gaveup' || why === 'abandoned', level: S.rule.level });
  S.result = { why, detail, score, n, won: why === 'empty' || why === 'prophet' || why === 'noplay' };
  return S.result;
}

// ---------- totales y persistencia (validada: un almacenamiento manipulado nunca rompe el juego) ----------
export const LOG_MAX = 30;
export const WHY = ['empty', 'prophet', 'noplay', 'expelled', 'gaveup', 'abandoned'];
export const newTotals = () => ({ rounds: 0, wins: 0, points: 0, found: [], log: [] });
export function applyTotals(T, S) {
  const r = S.result; if (!r) return;
  T.rounds++; T.points += r.score;
  T.log.push({ id: S.rule.id, why: r.why, score: r.score }); if (T.log.length > LOG_MAX) T.log.splice(0, T.log.length - LOG_MAX);
  if (r.why === 'prophet') { T.wins++; if (!T.found.includes(S.rule.id)) T.found.push(S.rule.id); }
}
export function serialize(T) { return JSON.stringify({ v: 1, rounds: T.rounds, wins: T.wins, points: T.points, found: T.found, log: T.log }); }
const isCount = n => Number.isInteger(n) && n >= 0 && n <= 1000000000;
export function restore(text) {
  let d; try { d = JSON.parse(text); } catch (e) { return null; }
  if (!d || d.v !== 1 || ![d.rounds, d.wins, d.points].every(isCount)) return null;
  const ids = new Set(RULES.map(r => r.id));
  const found = Array.isArray(d.found) ? [...new Set(d.found.filter(x => typeof x === 'string' && ids.has(x)))] : [];
  const log = Array.isArray(d.log) ? d.log.filter(e => e && ids.has(e.id) && WHY.includes(e.why) && Number.isInteger(e.score) && e.score >= 0 && e.score <= 40).map(e => ({ id: e.id, why: e.why, score: e.score })).slice(-LOG_MAX) : [];
  return { rounds: d.rounds, wins: d.wins, points: d.points, found, log };
}
