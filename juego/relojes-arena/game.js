// relojes-arena/game.js — Relojes de arena: modelo exacto, solver exhaustivo y puzzles. Lógica pura, SIN DOM (probada en test.mjs).
//
// MODELO (el de «Tres relojes de arena», Junio Puzzles, 6-dic-2023):
//  · Cada reloj tiene una duración D (minutos) y dos ampollas: arriba (top) y abajo. La arena cae a 1 minuto por minuto.
//  · Estados de un reloj: 'nuevo' (nunca puesto en marcha), 'marcha' (corriendo, con `top` minutos por caer) y 'vacio'
//    (toda la arena abajo, parado).
//  · «Arrancar» (solo un reloj nuevo): lo pone en marcha con top = D. Es gratis y no cuenta como giro.
//  · «Girar»: le da la vuelta. En marcha, con top = t, pasa a top = D − t (la arena que ya cayó es la que queda por caer).
//    Un reloj vacío girado vuelve a ponerse en marcha. La regla del puzzle: cada reloj se puede girar como mucho
//    `maxGiros` veces después de ponerlo en marcha (en el original, UNA sola vez). Variante sin regla: maxGiros = Infinity.
//  · Solo se sabe la hora por los relojes: se puede actuar únicamente en un INSTANTE RECONOCIBLE: el minuto 0 y cada
//    momento en que se acaba la arena de algún reloj. Todos los tiempos son enteros.
//  · Se mide un periodo entre dos instantes reconocibles: se pide que duren EXACTAMENTE `objetivo` minutos. El periodo
//    no tiene por qué empezar en el minuto 0.

export const ARRANCAR = 'arrancar', GIRAR = 'girar';
export const minutos = n => n + (n === 1 ? ' minuto' : ' minutos');

// ---------- un paso del modelo ----------
const clonar = S => ({ t: S.t, st: S.st.slice(), top: S.top.slice(), giros: S.giros.slice() });
export const estadoInicial = (clocks) => ({ t: 0, st: clocks.map(() => 0), top: clocks.map(() => 0), giros: clocks.map(() => 0) });   // st: 0 nuevo, 1 marcha, 2 vacío

// ¿qué acciones admite el reloj c ahora mismo? (en un instante reconocible)
export function accionesPosibles(clocks, maxGiros, S, c) {
  const out = [];
  if (S.st[c] === 0) out.push(ARRANCAR);
  else if (S.giros[c] < maxGiros && !(S.st[c] === 1 && S.top[c] === clocks[c])) out.push(GIRAR);   // girar uno recién arrancado no sirve de nada
  return out;
}
export function aplicar(clocks, S, c, accion) {   // devuelve un estado NUEVO o lanza
  const T = clonar(S), D = clocks[c];
  if (accion === ARRANCAR) { if (T.st[c] !== 0) throw new Error('solo se arranca un reloj nuevo'); T.st[c] = 1; T.top[c] = D; return T; }
  if (accion === GIRAR) {
    if (T.st[c] === 0) throw new Error('un reloj sin arrancar no se gira: se arranca');
    T.giros[c]++;
    if (T.st[c] === 1) { T.top[c] = D - T.top[c]; if (T.top[c] === 0) T.st[c] = 2; }
    else { T.st[c] = 1; T.top[c] = D; }
    return T;
  }
  throw new Error('acción desconocida: ' + accion);
}
// avanza hasta el siguiente instante reconocible (se acaba la arena de algún reloj); null si no corre ninguno
export function avanzar(S) {
  let dt = Infinity;
  S.st.forEach((s, c) => { if (s === 1 && S.top[c] < dt) dt = S.top[c]; });
  if (dt === Infinity) return null;
  const T = clonar(S); T.t += dt;
  T.st.forEach((s, c) => { if (s === 1) { T.top[c] -= dt; if (T.top[c] === 0) T.st[c] = 2; } });
  return T;
}

// ---------- reproducir un calendario concreto ----------
// acciones: [{ t, c, a }] (t entero; c índice de reloj). Comprueba que cada acción cae en un instante reconocible
// y que respeta la regla de giros. Devuelve { ok, error, instantes: [0, ...], fin }.
export function simular(clocks, maxGiros, acciones) {
  const orden = acciones.map((x, i) => ({ ...x, i })).sort((p, q) => p.t - q.t || p.c - q.c || p.i - q.i);
  let S = estadoInicial(clocks), k = 0; const instantes = [0];
  for (;;) {
    const aqui = [];
    while (k < orden.length && orden[k].t === S.t) aqui.push(orden[k++]);
    const vistos = new Set();
    for (const x of aqui) {
      if (vistos.has(x.c)) return { ok: false, error: 'dos acciones sobre el mismo reloj en el minuto ' + S.t, instantes };
      vistos.add(x.c);
      if (!accionesPosibles(clocks, maxGiros, S, x.c).includes(x.a)) return { ok: false, error: 'acción no permitida (' + x.a + ' reloj ' + clocks[x.c] + ') en el minuto ' + S.t, instantes };
      S = aplicar(clocks, S, x.c, x.a);
    }
    if (k < orden.length && orden[k].t < S.t) return { ok: false, error: 'acción fuera de un instante reconocible (minuto ' + orden[k].t + ')', instantes };
    const N = avanzar(S);
    if (!N) { if (k < orden.length) return { ok: false, error: 'acción fuera de un instante reconocible (minuto ' + orden[k].t + ')', instantes }; return { ok: true, instantes, fin: S.t }; }
    if (k < orden.length && orden[k].t < N.t) return { ok: false, error: 'acción fuera de un instante reconocible (minuto ' + orden[k].t + ')', instantes };
    S = N; instantes.push(S.t);
  }
}
// ¿hay dos instantes reconocibles a `objetivo` minutos? devuelve la pareja [t1, t2] con t2 mínimo, o null
export function periodo(instantes, objetivo) {
  const set = new Set(instantes); let mejor = null;
  for (const a of instantes) if (set.has(a + objetivo) && (!mejor || a + objetivo < mejor[1])) mejor = [a, a + objetivo];
  return mejor;
}

// ---------- solver exhaustivo ----------
// Recorre TODOS los calendarios posibles (en cada instante reconocible, para cada reloj: nada, arrancar o girar).
// Devuelve las hojas { acciones, instantes }. `maxAcciones` acota el recorrido cuando los giros no están limitados.
export function enumerar(clocks, maxGiros, { horizonte = 400, maxAcciones = 2 * clocks.length, alHoja } = {}) {
  const hojas = [];
  (function rec(S, acciones, instantes) {
    // todas las combinaciones de acciones de este instante (una por reloj como mucho)
    const opciones = clocks.map((_, c) => [null, ...accionesPosibles(clocks, maxGiros, S, c)]);
    (function combos(c, T, hechas) {
      if (c === clocks.length) {
        if (acciones.length + hechas.length > maxAcciones) return;
        const todas = acciones.concat(hechas);
        const N = avanzar(T);
        if (!N || N.t > horizonte) {
          // sin relojes en marcha: el calendario termina aquí; si hay acciones nuevas todavía no se ha avanzado
          if (hechas.length === 0 && !N) { const h = { acciones: todas, instantes }; hojas.push(h); if (alHoja) alHoja(h); return; }
          if (!N) { const h = { acciones: todas, instantes }; hojas.push(h); if (alHoja) alHoja(h); }
          return;
        }
        rec(N, todas, instantes.concat(N.t));
        return;
      }
      for (const a of opciones[c]) {
        if (a === null) combos(c + 1, T, hechas);
        else combos(c + 1, aplicar(clocks, T, c, a), hechas.concat({ t: T.t, c, a }));
      }
    })(0, S, []);
  })(estadoInicial(clocks), [], [0]);
  return hojas;
}

const firma = acc => acc.map(x => x.t + ':' + x.c + ':' + x.a[0]).join(' ');
const esSubconjunto = (peq, gran) => { const g = new Set(gran.map(x => x.t + ':' + x.c + ':' + x.a)); return peq.every(x => g.has(x.t + ':' + x.c + ':' + x.a)); };

// Analiza las hojas ya enumeradas para un objetivo: soluciones MÍNIMAS (ningún subconjunto estricto de sus acciones resuelve) y medidas.
export function analizarHojas(clocks, maxGiros, objetivo, hojas) {
  const sol = [];   // calendarios que resuelven
  for (const h of hojas) { const p = periodo(h.instantes, objetivo); if (p) sol.push({ acciones: h.acciones, instantes: h.instantes, periodo: p }); }
  // mínimas: se descarta toda solución que contiene estrictamente a otra
  const porTamano = sol.slice().sort((a, b) => a.acciones.length - b.acciones.length);
  const minimas = [];
  for (const s of porTamano) if (!minimas.some(m => m.acciones.length < s.acciones.length && esSubconjunto(m.acciones, s.acciones))) minimas.push(s);
  const vistas = new Map();   // por si dos hojas dan el mismo calendario
  for (const m of minimas) { const f = firma(m.acciones); if (!vistas.has(f)) vistas.set(f, m); }
  const unicas = [...vistas.values()].sort((a, b) => a.acciones.length - b.acciones.length || a.periodo[1] - b.periodo[1]);
  const acc = unicas.map(m => m.acciones.length);
  return {
    clocks, maxGiros, objetivo, hojas: hojas.length, resuelve: unicas.length > 0,
    solMinimas: unicas.length,
    minAcciones: unicas.length ? Math.min(...acc) : null,
    maxAccionesSol: unicas.length ? Math.max(...acc) : null,
    minFin: unicas.length ? Math.min(...unicas.map(m => m.periodo[1])) : null,
    minInicio: unicas.length ? Math.min(...unicas.map(m => m.periodo[0])) : null,
    soluciones: unicas,
  };
}
export const analizar = (clocks, maxGiros, objetivo, opts = {}) => analizarHojas(clocks, maxGiros, objetivo, enumerar(clocks, maxGiros, opts));

// «receta directa»: el objetivo se obtiene como suma o diferencia de dos duraciones, o es una duración, o la suma de las tres
export function recetaDirecta(clocks, objetivo) {
  const D = clocks, set = new Set(D);
  if (set.has(objetivo)) return 'es la duración de un reloj';
  for (let i = 0; i < D.length; i++) for (let j = 0; j < D.length; j++) if (i !== j) {
    if (D[i] + D[j] === objetivo) return D[i] + ' + ' + D[j];
    if (D[i] - D[j] === objetivo) return D[i] + ' − ' + D[j];
  }
  if (D.reduce((a, b) => a + b, 0) === objetivo) return 'suma de todos';
  return null;
}

// ---------- narrar una solución, en español ----------
// Devuelve [{ t, texto }]: en cada instante, qué relojes se acaban y qué se hace.
export function narrar(clocks, maxGiros, acciones, objetivo) {
  const orden = acciones.map((x, i) => ({ ...x, i })).sort((p, q) => p.t - q.t || p.c - q.c || p.i - q.i);
  const out = []; let S = estadoInicial(clocks), k = 0;
  for (;;) {
    while (k < orden.length && orden[k].t === S.t) {
      const x = orden[k++], D = clocks[x.c];
      if (x.a === ARRANCAR) out.push({ t: S.t, texto: 'Arrancas el reloj de ' + D + ' (se acabará en el minuto ' + (S.t + D) + ').' });
      else if (S.st[x.c] === 1) { const e = D - S.top[x.c]; out.push({ t: S.t, texto: 'Giras el reloj de ' + D + ': lleva ' + minutos(e) + ' corriendo, así que ahora le quedan ' + e + ' (se acabará en el minuto ' + (S.t + e) + ').' }); }
      else out.push({ t: S.t, texto: 'Giras el reloj de ' + D + ', que estaba vacío: vuelve a correr ' + minutos(D) + ' (se acabará en el minuto ' + (S.t + D) + ').' });
      S = aplicar(clocks, S, x.c, x.a);
    }
    const N = avanzar(S);
    if (!N) break;
    clocks.forEach((D, c) => { if (S.st[c] === 1 && N.st[c] === 2) out.push({ t: N.t, texto: 'Se acaba la arena del reloj de ' + D + '.' }); });
    S = N;
  }
  const r = simular(clocks, maxGiros, acciones), p = r.ok ? periodo(r.instantes, objetivo) : null;
  if (p) out.push({ t: p[1], texto: 'El periodo va del minuto ' + p[0] + ' al minuto ' + p[1] + ': ' + p[1] + ' − ' + p[0] + ' = ' + minutos(objetivo) + '.' });
  return out;
}

// ---------- los puzzles ----------
export const PUZZLES = [
  { id: 'junio', titulo: 'Tres relojes de arena (Junio Puzzles)', clocks: [7, 11, 15], objetivo: 24, maxGiros: 1,
    origen: 'Del blog Junio Puzzles, 6 de diciembre de 2023.',
    pistas: [
      'El periodo de 24 minutos no tiene por qué empezar en el minuto 0: puede empezar en cualquier instante en que se acabe la arena de un reloj.',
      'Arranca el reloj de 7 y el de 15 a la vez. Cuando se acabe el de 7, dale la vuelta.',
      'Cuando el de 7 se acabe por segunda vez (minuto 14), arranca el de 11. Al acabarse el de 15 (minuto 15), dale la vuelta al de 11.',
      'Cuando se acabe el de 11 (minuto 16), dale la vuelta al de 15. El periodo va del minuto 7 (la primera vez que se acaba el de 7) al minuto 31.',
    ] },
  { id: 'nuevo', titulo: 'Tres relojes: 10, 13 y 16 → 18 minutos', clocks: [10, 13, 16], objetivo: 18, maxGiros: 1,
    origen: 'Puzzle nuevo del hub, de la misma familia pero con otras duraciones y otro objetivo.',
    pistas: [
      'El periodo de 18 minutos no empieza en el minuto 0: va entre dos instantes en los que se acaba la arena de algún reloj.',
      'Arranca el reloj de 10 y el de 16 a la vez. Cuando se acabe el de 10, dale la vuelta y arranca el de 13.',
      'Cuando se acabe el de 16 (minuto 16), el de 13 lleva 6 minutos corriendo: dale la vuelta, y le quedarán 6 (se acabará en el minuto 22).',
      'El de 10 vuelve a acabarse en el minuto 20: ahí empieza el periodo. En el minuto 22 se acaba el de 13: dale la vuelta al de 16, que acabará en el 38. 38 − 20 = 18.',
    ] },
];
export const solucionDe = p => analizar(p.clocks, p.maxGiros, p.objetivo).soluciones[0];

// ---------- la partida (simulación con paradas en cada instante reconocible) ----------
// La arena corre continuamente, pero el reloj SE DETIENE solo en cada instante reconocible (se acaba la arena de algún reloj)
// y solo entonces se puede actuar. Así los tiempos son exactos y no se puede «medir» con el pulso.
export class Partida {
  constructor(puzzle) { this.puzzle = puzzle; this.reiniciar(); }
  reiniciar() {
    const { clocks } = this.puzzle;
    this.S = estadoInicial(clocks); this.prog = 0;            // prog: minutos transcurridos desde el último instante reconocible (0 = estamos en uno)
    this.corriendo = false; this.acciones = []; this.log = [{ t: 0, texto: 'Todo preparado. Es el minuto 0.' }];
    this.inicio = null; this.fin = null;                      // instantes marcados
  }
  get enInstante() { return this.prog === 0; }
  get tiempo() { return this.S.t + this.prog; }
  get proximo() { const N = avanzar(this.S); return N ? N.t - this.S.t : null; }   // minutos desde el último instante hasta el siguiente (null: nada corre)
  // arena por reloj en este momento: { st, top, bajo, giros }
  vista() {
    const { clocks } = this.puzzle;
    return clocks.map((D, c) => {
      const st = this.S.st[c]; let top = this.S.top[c];
      if (st === 1) top = Math.max(0, top - this.prog);
      return { D, st: st === 1 && top === 0 ? 2 : st, top, bajo: st === 0 ? 0 : D - top, giros: this.S.giros[c] };
    });
  }
  // deja pasar `min` minutos sin cruzar el próximo instante: se detiene en él. Devuelve true si llegó a un instante.
  correr(min) {
    const p = this.proximo; if (p === null) { this.corriendo = false; return false; }
    if (this.prog + min < p - 1e-9) { this.prog += min; return false; }
    const antes = this.S, N = avanzar(antes);
    this.S = N; this.prog = 0; this.corriendo = false;
    this.puzzle.clocks.forEach((D, c) => { if (antes.st[c] === 1 && N.st[c] === 2) this.log.push({ t: N.t, texto: 'Se acaba la arena del reloj de ' + D + '.' }); });
    return true;
  }
  saltar() { const p = this.proximo; if (p === null) return false; return this.correr(p - this.prog); }
  puede(c, a) { return this.enInstante && accionesPosibles(this.puzzle.clocks, this.puzzle.maxGiros, this.S, c).includes(a); }
  motivoNo(c, a) {   // por qué no se puede, en español
    const D = this.puzzle.clocks[c];
    if (!this.enInstante) return 'Solo puedes actuar en un instante reconocible: el minuto 0 o cuando se acaba la arena de algún reloj. Pulsa «Continuar».';
    if (a === ARRANCAR) return this.S.st[c] !== 0 ? 'El reloj de ' + D + ' ya se ha puesto en marcha. Si quieres darle la vuelta, usa «Girar».' : '';
    if (this.S.st[c] === 0) return 'El reloj de ' + D + ' aún no está en marcha: primero hay que arrancarlo.';
    if (this.S.giros[c] >= this.puzzle.maxGiros) return 'Regla del puzzle: después de ponerlo en marcha, cada reloj solo se puede girar ' + (this.puzzle.maxGiros === 1 ? 'una vez' : this.puzzle.maxGiros + ' veces') + '. El de ' + D + ' ya está girado.';
    if (this.S.st[c] === 1 && this.S.top[c] === D) return 'Girarlo recién arrancado no sirve de nada: la arena aún no ha empezado a caer.';
    return '';
  }
  accion(c, a) {
    if (!this.puede(c, a)) throw new Error(this.motivoNo(c, a) || 'acción no permitida');
    const D = this.puzzle.clocks[c], antes = this.S;
    let texto;
    if (a === ARRANCAR) texto = 'Arrancas el reloj de ' + D + '.';
    else if (antes.st[c] === 1) texto = 'Giras el reloj de ' + D + ' (lleva ' + minutos(D - antes.top[c]) + ' corriendo).';
    else texto = 'Giras el reloj de ' + D + ', que estaba vacío: vuelve a correr.';
    this.S = aplicar(this.puzzle.clocks, this.S, c, a);
    this.acciones.push({ t: this.S.t, c, a });
    this.log.push({ t: this.S.t, texto, accion: true });
    return texto;
  }
  instantesVistos() { return [...new Set(this.log.map(e => e.t))].sort((a, b) => a - b); }
  marcar(tipo, t) {
    if (!this.instantesVistos().includes(t)) throw new Error('solo se pueden marcar instantes reconocibles que ya han pasado');
    if (tipo === 'inicio') this.inicio = t; else this.fin = t;
  }
  // resultado de la medición: null si faltan marcas
  medida() {
    if (this.inicio === null || this.fin === null) return null;
    const dur = this.fin - this.inicio;
    return { dur, ok: dur === this.puzzle.objetivo, acciones: this.acciones.length };
  }
}
