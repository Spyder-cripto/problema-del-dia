// siete-segmentos/game.js — «Siete segmentos»: series lógicas con dígitos de display. Datos de los retos y lógica pura,
// SIN DOM (probada en test.mjs). La interfaz vive en main.js.
//
// MODELO:
//  · Cada dígito se dibuja con los segmentos a–g de un display:  a arriba, b arriba-derecha, c abajo-derecha,
//    d abajo, e abajo-izquierda, f arriba-izquierda, g centro. Aquí el 7 usa 3 segmentos (abc) y el 6 y el 9 usan 6.
//  · Retos de tipo 'series' (escribir el término que falta), 'eqs' (completar una «suma de luces»), 'odd' (elegir el
//    intruso) y 'match' (igualdades de palillos: mover exactamente k segmentos para que la igualdad sea cierta).
//  · En las igualdades, el estado es un conjunto de claves 'pos:seg'. Posiciones: 0 primer número, 1 signo
//    (h = barra horizontal, v = barra vertical; con las dos es +, solo con h es −), 2 segundo número, 3 resultado.
//    El = es fijo. Mover = quitar un segmento encendido y encender otro apagado (k quitados y k puestos).

export const SEGS = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
export const LETRAS = 'abcdefg';
export const INV = {};
for (const d in SEGS) INV[[...SEGS[d]].sort().join('')] = +d;

export const segCount = n => [...String(n)].reduce((s, c) => s + SEGS[c].length, 0);
export const starsFor = pistas => pistas === 0 ? 3 : pistas < 3 ? 2 : 1;

export const LEVELS = [
  { name: 'Fácil', c: '#7cff6b' }, { name: 'Medio', c: '#2de2e6' }, { name: 'Difícil', c: '#ffd23f' }, { name: 'Experto', c: '#ff4d8d' }
];

const TOTALS = 'Cada número de la serie es un total de segmentos. ¿Cuál continúa?';
const DIGIT_RULE = 'Cada dígito sigue una regla. ¿Qué dígito continúa la serie?';

// base: la sucesión «de verdad» que hay detrás; la explicación la dibuja con su recuento de segmentos.
// totals: los términos son los segmentos de base (test.mjs lo comprueba). mode 'off' = segmentos apagados, 'cum' = suma acumulada.
// alt: mensajes para respuestas casi correctas.
export const PUZZLES = [
  /* ---------- FÁCIL ---------- */
  { id: 'f1', lv: 0, kind: 'series', title: 'Más barras cada vez', prompt: DIGIT_RULE,
    tokens: [1, 7, 4, 2, 0, '?'], answer: '8', base: [1, 7, 4, 2, 0, 8],
    hints: ['Cuenta las barras encendidas de cada dígito.', 'El 1 tiene 2, el 7 tiene 3, el 4 tiene 4…', 'Sube de uno en uno. El siguiente debe tener 7 barras.'],
    why: 'Las barras encendidas son 2, 3, 4, 5, 6 y ahora 7. El 8 usa los siete segmentos.' },
  { id: 'f5', lv: 0, kind: 'series', title: 'Cuenta atrás', prompt: DIGIT_RULE,
    tokens: [8, 9, 3, 4, 7, '?'], answer: '1', base: [8, 9, 3, 4, 7, 1],
    hints: ['Cuenta las barras encendidas de cada dígito.', 'El 8 tiene 7, el 9 tiene 6, el 3 tiene 5…', 'Baja de uno en uno. El siguiente usa solo 2 barras.'],
    why: 'Las barras bajan de una en una: 7, 6, 5, 4, 3 y ahora 2. El único dígito con 2 segmentos es el 1.' },
  { id: 'f2', lv: 0, kind: 'odd', title: 'El intruso', prompt: 'Un dígito no encaja con los demás. Tócalo y pulsa Comprobar.',
    tokens: [6, 0, 9, 4, 6, 9], answer: '4', base: [6, 0, 9, 4],
    hints: ['Compara cuántas barras usa cada dígito.', 'El 6, el 0 y el 9 se parecen en algo.', 'Los tres usan 6 segmentos. Busca el que no.'],
    why: 'El 6, el 0 y el 9 usan 6 segmentos. El 4 usa solo 4.' },
  { id: 'f4', lv: 0, kind: 'match', title: 'Un palillo fuera de sitio', prompt: 'Mueve un segmento para que la igualdad sea cierta. Toca uno encendido para quitarlo y uno apagado para ponerlo.',
    eq: [1, '+', 1, 3], k: 1, sol: [1, '+', 1, 2],
    hints: ['La suma debería dar 2.', 'Solo hay que cambiar el 3.', 'Lleva el segmento inferior derecho del 3 abajo a la izquierda.'],
    why: 'El 3 pasa a 2 si su segmento inferior derecho se coloca abajo a la izquierda. Resultado: 1 + 1 = 2.' },
  { id: 'f3', lv: 0, kind: 'series', title: 'Contando barras', prompt: TOTALS,
    tokens: [2, 5, 5, 4, 5, 6, 3, 7, '?'], answer: '6', base: [1, 2, 3, 4, 5, 6, 7, 8, 9], totals: true,
    hints: ['Los números de la serie no son dígitos sueltos: son recuentos de barras.', 'Prueba con los dígitos 1, 2, 3… en orden. El 1 enciende 2 barras.', 'Los dígitos van 1, 2, 3, 4, 5, 6, 7, 8. Toca el 9.'],
    why: 'Cada término cuenta los segmentos de 1, 2, 3… 8. El siguiente dígito es el 9, que usa 6.' },
  { id: 'f6', lv: 0, kind: 'match', title: 'Resultado torcido', prompt: 'Mueve un segmento para que la igualdad sea cierta.',
    eq: [4, '+', 1, 3], k: 1, sol: [4, '+', 1, 5],
    hints: ['La suma debería dar 5.', 'Solo cambia el resultado.', 'Lleva la barra superior derecha del 3 a la superior izquierda.'],
    why: 'El 3 se convierte en 5 al pasar su barra superior derecha a la izquierda. Resultado: 4 + 1 = 5.' },

  /* ---------- MEDIO ---------- */
  { id: 'm1', lv: 1, kind: 'series', title: 'Un paso cada vez', prompt: 'Cada dígito sale del anterior encendiendo o apagando un solo segmento. Ningún dígito se repite.',
    tokens: [3, 9, 5, 6, 8, '?'], answer: '0',
    alt: { '6': 'El 6 ya salió en la serie y ningún dígito se repite.', '9': 'El 9 ya salió en la serie y ningún dígito se repite.' },
    hints: ['Compara el dibujo de dos dígitos seguidos.', 'De 3 a 9 se enciende la barra superior izquierda. De 9 a 5 se apaga la superior derecha.', 'Desde el 8 puedes llegar a 0, 6 o 9. Dos ya aparecieron.'],
    why: '3→9 enciende la superior izquierda, 9→5 apaga la superior derecha, 5→6 enciende la inferior izquierda, 6→8 enciende la superior derecha y 8→0 apaga la central. El 6 y el 9 ya salieron, así que queda el 0.' },
  { id: 'm2', lv: 1, kind: 'series', title: 'Suma acumulada', prompt: '¿Qué número continúa la serie?',
    tokens: [2, 7, 12, 16, 21, 27, '?'], answer: '30', base: [1, 2, 3, 4, 5, 6, 7], mode: 'cum',
    hints: ['Mira cuánto sube cada término: 5, 5, 4, 5, 6.', 'Son los segmentos de 2, 3, 4, 5 y 6. El primer término, 2, es el del 1.', 'Ahora toca sumar los segmentos del 7.'],
    why: 'Es la suma acumulada de los segmentos de 1, 2, 3… El 7 usa 3 segmentos, así que a 27 le sigue 30.' },
  { id: 'm3', lv: 1, kind: 'series', title: 'Números consecutivos', prompt: TOTALS,
    tokens: [8, 4, 7, 7, 6, 7, 8, '?'], answer: '5', base: [10, 11, 12, 13, 14, 15, 16, 17], totals: true,
    hints: ['Cada término es el total de un número de dos cifras.', '8 son los segmentos de 10 (2 + 6) y 4 son los de 11 (2 + 2).', 'Sigue 12, 13, 14, 15, 16… y ahora 17.'],
    why: 'Son los segmentos de 10, 11, 12… 16. Para 17 son 2 + 3 = 5.' },
  { id: 'm4', lv: 1, kind: 'match', title: 'Resta torcida', prompt: 'Mueve un segmento para que la igualdad sea cierta.',
    eq: [1, '-', 1, 8], k: 1, sol: [7, '-', 1, 6],
    hints: ['El resultado 8 gasta demasiados segmentos.', 'Quítale al 8 el segmento superior derecho: queda un 6.', 'Ponlo encima del primer 1 para formar un 7.'],
    why: 'Al 8 se le quita el segmento superior derecho y queda 6. Ese segmento sube al primer 1 y forma un 7: 7 − 1 = 6.' },
  { id: 'm5', lv: 1, kind: 'series', title: 'Lo que no se ve', prompt: '¿Qué número continúa la serie?',
    tokens: [1, 5, 2, 2, 3, 2, 1, 4, 0, '?'], answer: '1', base: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], mode: 'off',
    hints: ['Fíjate en los segmentos que quedan sin encender.', 'Recorre los dígitos 0, 1, 2… en orden. El 0 deja apagado solo el central.', 'Falta el 9, que deja apagado un solo segmento.'],
    why: 'Cada término cuenta los segmentos apagados de 0, 1, 2… 8. El 9 deja apagado solo el inferior izquierdo.' },
  { id: 'm6', lv: 1, kind: 'match', title: 'El signo también cuenta', prompt: 'Mueve un segmento para que la igualdad sea cierta.',
    eq: [0, '-', 1, 7], k: 1, sol: [0, '+', 1, 1],
    hints: ['El signo también está hecho de segmentos.', 'El 7 tiene una barra de más para que el resultado sea 1.', 'Quita la barra superior del 7 y úsala para convertir el − en +.'],
    why: 'El 7 cede su barra superior y queda 1. Esa barra, en vertical, convierte el − en +. Resultado: 0 + 1 = 1.' },

  /* ---------- DIFÍCIL ---------- */
  { id: 'd1', lv: 2, kind: 'eqs', title: 'Suma de luces', prompt: 'Al superponer los segmentos de dos dígitos se obtiene el tercero. ¿Qué dígito falta? Si varios sirven, elige el de menos segmentos.',
    rows: [[5, '+', 1, '=', 9], [3, '+', 6, '=', 8], [0, '+', 4, '=', 8], [2, '+', '?', '=', 8]], answer: '4',
    alt: { '9': 'El 9 también completa el 8, pero otro dígito lo hace con menos segmentos.', '8': 'El 8 sirve, pero gasta los siete segmentos. Busca uno que use menos.' },
    hints: ['El signo + significa unir las barras encendidas de los dos dígitos.', 'Al 2 le faltan el segmento inferior derecho y el superior izquierdo para ser un 8.', 'El 4 aporta justo esos dos y usa solo 4 segmentos.'],
    why: 'Superponer es unir barras. El 2 más el 4 deja encendidas las siete. El 9 y el 8 también servirían, pero el 4 usa menos segmentos.' },
  { id: 'd2', lv: 2, kind: 'series', title: 'Cambios al contar', prompt: '¿Qué número continúa la serie?',
    tokens: [4, 5, 2, 3, 3, 1, 5, 4, 1, '?'], answer: '2',
    hints: ['Piensa en los dígitos 0, 1, 2, 3… en orden.', 'Cada término cuenta cuántos segmentos cambian al pasar de un dígito al siguiente.', 'Falta el paso del 9 al 0.'],
    why: 'Segmentos que cambian en 0→1, 1→2… 8→9 y 9→0: 4, 5, 2, 3, 3, 1, 5, 4, 1, 2. En el último paso se apaga el inferior izquierdo y se enciende el central.' },
  { id: 'd3', lv: 2, kind: 'series', title: 'Potencias de 2', prompt: TOTALS,
    tokens: [2, 5, 4, 7, 8, 10, 10, 14, '?'], answer: '16', base: [1, 2, 4, 8, 16, 32, 64, 128, 256], totals: true,
    hints: ['Son totales de números enteros, no de dígitos sueltos.', 'Los números son 1, 2, 4, 8, 16, 32…', 'Falta el 256: 5 + 5 + 6.'],
    why: 'Son los segmentos de las potencias de 2. La siguiente es 256, que usa 5 + 5 + 6 = 16.' },
  { id: 'd4', lv: 2, kind: 'series', title: 'Fibonacci encendido', prompt: TOTALS,
    tokens: [2, 2, 5, 5, 5, 7, 7, 7, 9, '?'], answer: '10', base: [1, 1, 2, 3, 5, 8, 13, 21, 34, 55], totals: true,
    hints: ['Cuenta los segmentos de una sucesión famosa.', 'Empieza 1, 1, 2, 3, 5, 8…', 'El décimo término es 55: 5 + 5.'],
    why: 'Son los segmentos de la sucesión de Fibonacci. Los tres cincos y los tres sietes seguidos son casualidad. El décimo término es 55, que usa 10.' },
  { id: 'd5', lv: 2, kind: 'match', title: 'El 8 que sobra', prompt: 'Mueve un segmento para que la igualdad sea cierta.',
    eq: [5, '-', 3, 8], k: 1, sol: [9, '-', 3, 6],
    hints: ['Al 8 le sobra un segmento y al 5 le falta uno.', 'Quita el segmento superior derecho del 8.', 'Ponlo en el 5 para formar un 9.'],
    why: 'El 8 pierde su segmento superior derecho y queda 6. El 5 lo recibe y queda 9. Resultado: 9 − 3 = 6.' },
  { id: 'd6', lv: 2, kind: 'series', title: 'Tabla del 7', prompt: TOTALS,
    tokens: [3, 6, 7, 12, 10, 9, 10, '?'], answer: '11', base: [7, 14, 21, 28, 35, 42, 49, 56], totals: true,
    hints: ['Son totales de números que avanzan de un salto fijo.', 'El primero es 7, el segundo 14…', 'Falta el 56: 5 + 6.'],
    why: 'Son los segmentos de los múltiplos de 7. El octavo es 56, que usa 5 + 6 = 11.' },

  /* ---------- EXPERTO ---------- */
  { id: 'e1', lv: 3, kind: 'series', title: 'El mayor número', prompt: '¿Qué número continúa la serie?',
    tokens: [1, 7, 11, 71, 111, 711, 1111, '?'], answer: '7111', base: [1, 7, 11, 71, 111, 711, 1111, 7111],
    alt: { '1117': 'Usa los segmentos justos, pero ordenados de otra forma da un número mayor.', '11111': 'Ese número usa 10 segmentos. Toca usar 9.' },
    hints: ['Cada término gasta un total fijo de segmentos y es el mayor número posible.', 'Los totales son 2, 3, 4, 5, 6, 7 y 8 segmentos.', 'Con 9 segmentos caben un 7 y tres 1.'],
    why: 'Es el mayor número que se escribe con 2, 3, 4… 8 segmentos. El 1 gasta solo 2, así que conviene repetirlo. Con un total impar, el 7 va delante. Con 9 segmentos, el máximo es 7111.' },
  { id: 'e2', lv: 3, kind: 'series', title: 'Factoriales', prompt: TOTALS,
    tokens: [2, 5, 6, 9, 13, 14, '?'], answer: '21', base: [1, 2, 6, 24, 120, 720, 5040], totals: true,
    hints: ['Los números crecen muy deprisa: busca una sucesión que se dispara.', 'Son 1, 2, 6, 24, 120, 720…', 'Falta 5040: 5 + 6 + 4 + 6.'],
    why: 'Son los segmentos de los factoriales. El siguiente es 7! = 5040, que usa 21.' },
  { id: 'e3', lv: 3, kind: 'series', title: 'Primos encendidos', prompt: TOTALS,
    tokens: [5, 5, 5, 3, 4, 7, 5, 8, 10, '?'], answer: '11', base: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29], totals: true,
    hints: ['Los términos suben y bajan sin orden aparente.', 'Son los números primos: 2, 3, 5, 7, 11, 13, 17, 19, 23…', 'Después del 23 viene el 29: 5 + 6.'],
    why: 'Son los segmentos de los números primos. Después del 23 viene el 29, que usa 11.' },
  { id: 'e4', lv: 3, kind: 'series', title: 'Collatz', prompt: TOTALS,
    tokens: [6, 5, 8, 5, 8, 7, 4, 5, '?'], answer: '2', base: [6, 3, 10, 5, 16, 8, 4, 2, 1], totals: true,
    hints: ['La sucesión sube y baja. Piensa en una regla de pares e impares.', 'Si es par se divide entre 2. Si es impar se multiplica por 3 y se suma 1. Empieza en 6.', '6, 3, 10, 5, 16, 8, 4, 2 y después 1.'],
    why: 'Es la sucesión de Collatz desde 6. Tras el 2 llega el 1, que usa 2 segmentos.' },
  { id: 'e5', lv: 3, kind: 'series', title: 'Triangulares', prompt: TOTALS,
    tokens: [2, 5, 6, 8, 7, 7, 12, 11, 9, 10, '?'], answer: '12', base: [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66], totals: true,
    hints: ['Los términos suben despacio y con saltos raros.', 'Son 1, 3, 6, 10, 15, 21, 28, 36…', 'Son las sumas 1, 1+2, 1+2+3… El undécimo es 66.'],
    why: 'Son los segmentos de los números triangulares. El undécimo es 66, que usa 12.' },
  { id: 'e7', lv: 3, kind: 'series', title: 'Cuadrados', prompt: TOTALS,
    tokens: [2, 4, 6, 8, 10, 11, 10, 10, 9, '?'], answer: '14', base: [1, 4, 9, 16, 25, 36, 49, 64, 81, 100], totals: true,
    alt: { '12': 'La serie empezó subiendo de 2 en 2, pero no sigue así.', '8': 'Mira otra vez: no se repite el tramo inicial.' },
    hints: ['No te fíes del 2, 4, 6, 8, 10: la serie se rompe enseguida.', 'Son totales de 1, 4, 9, 16, 25…', 'El décimo cuadrado es 100: 2 + 6 + 6.'],
    why: 'Son los segmentos de los cuadrados perfectos. El comienzo 2, 4, 6, 8, 10 es pura casualidad. El décimo cuadrado es 100, que usa 14.' },
  { id: 'e6', lv: 3, kind: 'match', title: 'Dos palillos', prompt: 'Esta vez hay que mover exactamente dos segmentos para que la igualdad sea cierta.',
    eq: [0, '+', 5, 6], k: 2, sol: [3, '+', 5, 8],
    hints: ['Un solo movimiento no basta.', 'El 0 puede convertirse en 3 y el 6 en 8.', 'Las dos barras de la izquierda del 0 salen: una va al centro del propio 0 y la otra a la parte superior derecha del 6.'],
    why: 'El 0 cede sus dos barras izquierdas: una forma la barra central (0 pasa a 3) y la otra sube a la derecha del 6 (6 pasa a 8). Resultado: 3 + 5 = 8.' }
];

export const byLevel = l => PUZZLES.filter(p => p.lv === l);

// ---------- igualdades de palillos ----------
export const TODAS = [...[0, 2, 3].flatMap(pos => [...LETRAS].map(l => `${pos}:${l}`)), '1:h', '1:v'];

export function eqState(eq) {
  const s = new Set();
  [[0, eq[0]], [2, eq[2]], [3, eq[3]]].forEach(([pos, d]) => { for (const l of SEGS[d]) s.add(`${pos}:${l}`); });
  s.add('1:h');
  if (eq[1] === '+') s.add('1:v');
  return s;
}
// lee la igualdad que forman los segmentos encendidos; null si algún símbolo no es un dígito o un signo válido
export function decode(on) {
  const d = [];
  for (const pos of [0, 2, 3]) {
    const letters = [...LETRAS].filter(l => on.has(`${pos}:${l}`)).join('');
    if (!(letters in INV)) return null;
    d.push(INV[letters]);
  }
  if (!on.has('1:h')) return null;
  return { a: d[0], op: on.has('1:v') ? '+' : '-', b: d[1], c: d[2] };
}
export const truthy = q => (q.op === '+' ? q.a + q.b : q.a - q.b) === q.c;
export const showEq = q => `${q.a} ${q.op === '+' ? '+' : '−'} ${q.b} = ${q.c}`;
export const eqObj = eq => ({ a: eq[0], op: eq[1], b: eq[2], c: eq[3] });
export function diff(orig, on) {
  let add = 0, rem = 0;
  on.forEach(k => { if (!orig.has(k)) add++; });
  orig.forEach(k => { if (!on.has(k)) rem++; });
  return { add, rem };
}

const combos = (arr, k, start = 0, pre = [], out = []) => {
  if (pre.length === k) { out.push(pre.slice()); return out; }
  for (let i = start; i < arr.length; i++) { pre.push(arr[i]); combos(arr, k, i + 1, pre, out); pre.pop(); }
  return out;
};
// todas las igualdades CIERTAS a las que se llega moviendo exactamente k segmentos (solucionador exhaustivo)
export function solucionesPalillos(eq, k) {
  const ini = eqState(eq), on = [...ini], off = TODAS.filter(x => !ini.has(x)), out = new Map();
  for (const quita of combos(on, k)) for (const pone of combos(off, k)) {
    const s = new Set(ini); quita.forEach(x => s.delete(x)); pone.forEach(x => s.add(x));
    const q = decode(s);
    if (q && truthy(q)) out.set(showEq(q), q);
  }
  return [...out.values()];
}

// ---------- comprobación de respuestas ----------
const FALLOS = ['Todavía no. Vuelve a mirar la regla.', 'Casi. Compara los dibujos otra vez.', 'No es esa. Una pista puede ayudar.'];
// devuelve { ok: true } o { ok: false, tipo: 'info' | 'mal', msg }. 'info' no cuenta como intento fallido.
export function comprobarRespuesta(p, input, intentos = 0) {
  if (!input) return { ok: false, tipo: 'info', msg: p.kind === 'odd' ? 'Toca primero el dígito que crees que sobra.' : 'Escribe una respuesta con los botones o el teclado.' };
  if (input === p.answer) return { ok: true };
  if (p.alt && p.alt[input]) return { ok: false, tipo: 'mal', msg: p.alt[input] };
  if (p.totals && input === String(p.base[p.base.length - 1])) return { ok: false, tipo: 'mal', msg: 'Ese es el número de la sucesión. La serie pide cuántos segmentos usa.' };
  return { ok: false, tipo: 'mal', msg: FALLOS[(intentos + 1) % FALLOS.length] };
}
export function comprobarPalillos(p, on) {
  const d = diff(eqState(p.eq), on);
  if (!d.add && !d.rem) return { ok: false, tipo: 'info', msg: 'Aún no has movido ningún segmento.' };
  if (d.add !== d.rem) {
    const n = Math.abs(d.add - d.rem), uno = n === 1;
    return { ok: false, tipo: 'mal', msg: d.add > d.rem
      ? `Has encendido ${uno ? 'un segmento' : n + ' segmentos'} de más. Cada segmento nuevo debe salir de otro sitio.`
      : `Has quitado ${uno ? 'un segmento' : n + ' segmentos'} sin colocarlo${uno ? '' : 's'} en otro sitio.` };
  }
  const q = decode(on);
  if (!q) return { ok: false, tipo: 'mal', msg: 'Algún símbolo no forma un dígito ni un signo válido.' };
  if (!truthy(q)) return { ok: false, tipo: 'mal', msg: `Se lee ${showEq(q)} y no es cierto.` };
  if (d.add !== p.k) return { ok: false, tipo: 'mal', msg: `La igualdad es cierta, pero has movido ${d.add} y el reto pide exactamente ${p.k}.` };
  return { ok: true };
}
