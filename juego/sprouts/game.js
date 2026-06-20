// sprouts/game.js — Sprouts (Conway & Paterson, 1967). JUEGO IMPARCIAL.
// NÚCLEO COMBINATORIO (mapa planar por caras) — se verifica contra el oráculo antes
// de añadir render/IA. NO se toca _engine/. La IA usa el negamax del motor: para n
// pequeño busca hasta el terminal -> juego perfecto (Sprouts es impartial; NADA de
// evaluate de conexión).
//
// MODELO (esfera): un estado es
//   { lives:[grado-restante por punto], regions:[ region... ], turn, next }
//   region = [ boundary... ];  boundary = [idPunto...] (ciclo).  Un punto aislado es
//   un boundary de un solo elemento. lives[p] = 3 - grado(p).
//
// Una jugada une dos OCURRENCIAS (esquinas) de puntos vivos en una MISMA región, con
// un punto nuevo N (grado 2, vida 1) sobre la curva. Cada jugada lleva ya calculado su
// estado sucesor (m.next) para que applyMove sea trivial y no se desincronice.
import { el } from '../_engine/svg.js';

const other = (p) => p ^ 1;

// n=2 y n=3: la negamax del motor llega al terminal dentro del presupuesto -> IA PERFECTA.
// (n>=4 tardaría demasiado en resolverse en vivo; se omite para no degradar la IA.)
const CONFIGS = [
  { key: 'n3', label: '3 puntos', n: 3 },
  { key: 'n2', label: '2 puntos', n: 2 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// rota un ciclo para que empiece en el índice p
function rotate(arr, p){ return arr.slice(p).concat(arr.slice(0, p)); }

// clave canónica de un boundary (ciclo): la rotación lexicográficamente menor
function canonBoundary(b){
  let best = null;
  for (let i = 0; i < b.length; i++){
    const r = rotate(b, i).join('.');
    if (best === null || r < best) best = r;
  }
  return best;
}
// clave canónica de una región: sus boundaries canónicos, ordenados
function canonRegion(reg){ return reg.map(canonBoundary).sort().join('|'); }
// clave canónica del estado: regiones ordenadas + turno (+ vidas, reindexadas por estructura)
function stateKey(s){
  const regs = s.regions.map(canonRegion).sort().join('#');
  // vidas: como las ids son arbitrarias, incluimos el multiconjunto de vidas por punto
  // presente en cada región para distinguir posiciones; aquí basta el vector de vidas
  // de los puntos que aún aparecen, ordenado de forma estable junto a la estructura.
  return regs + '~' + livesSignature(s) + '~' + s.turn;
}
// firma de vidas estable: para cada región canónica, la lista de vidas de sus puntos
function livesSignature(s){
  const parts = [];
  for (const reg of s.regions){
    const vs = [];
    for (const b of reg) for (const id of b) vs.push(s.lives[id]);
    parts.push(vs.slice().sort().join(','));
  }
  return parts.sort().join(';');
}

// ---- enumeración de jugadas (calcula cada sucesor) ----
function genMoves(s){
  const out = [], seen = new Set();
  const push = (next) => {
    const k = stateKey(next);
    if (seen.has(k)) return;       // dedup de jugadas estructuralmente idénticas
    seen.add(k);
    out.push({ next });
  };

  for (let ri = 0; ri < s.regions.length; ri++){
    const reg = s.regions[ri];
    // ocurrencias vivas dentro de esta región: (bi, pos, id)
    const occ = [];
    for (let bi = 0; bi < reg.length; bi++)
      for (let pos = 0; pos < reg[bi].length; pos++){
        const id = reg[bi][pos];
        if (s.lives[id] > 0) occ.push({ bi, pos, id });
      }

    for (let i = 0; i < occ.length; i++){
      for (let j = i; j < occ.length; j++){
        const A = occ[i], B = occ[j];
        if (i === j){
          // BUCLE en una misma esquina (punto a sí mismo): exige >=2 vidas.
          if (s.lives[A.id] < 2) continue;
          loopMoves(s, ri, A, push);
        } else {
          if (A.id === B.id && s.lives[A.id] < 2) continue;  // dos esquinas del mismo punto: 2 vidas
          if (A.bi === B.bi) splitMoves(s, ri, A, B, push);
          else mergeMove(s, ri, A, B, push);
        }
      }
    }
  }
  return out;
}

// clona estado base aplicando: consumir vidas y crear N
function baseNext(s, consume){            // consume: {id: cuánto}
  const lives = s.lives.slice();
  for (const id in consume) lives[id] -= consume[id];
  const N = s.next;
  lives[N] = 1;                            // grado 2 -> 1 vida
  return { lives, next: s.next + 1, turn: s.turn ^ 1, N };
}

// distribuye `others` (array) en 2 subconjuntos -> [ [reg1extra, reg2extra] ... ]
function distributions(others){
  const res = [];
  const k = others.length;
  for (let mask = 0; mask < (1 << k); mask++){
    const a = [], b = [];
    for (let t = 0; t < k; t++) (mask & (1 << t) ? a : b).push(others[t]);
    res.push([a, b]);
  }
  return res;
}

// SPLIT: A y B en el mismo boundary -> parte la cara, reparte los demás boundaries
function splitMoves(s, ri, A, B, push){
  const reg = s.regions[ri];
  const Bd = reg[A.bi];
  let p1 = A.pos, p2 = B.pos;
  // part1 = de p1 a p2 (inclusive) hacia delante; part2 = de p2 a p1 hacia delante
  const fwd = (from, to) => { const r = []; let k = from; while (true){ r.push(Bd[k]); if (k === to) break; k = (k + 1) % Bd.length; } return r; };
  const part1 = fwd(p1, p2);
  const part2 = fwd(p2, p1);
  const others = reg.filter((_, bi) => bi !== A.bi);
  for (const [extra1, extra2] of distributions(others)){
    const nb = baseNext(s, A.id === B.id ? { [A.id]: 2 } : { [A.id]: 1, [B.id]: 1 });
    const reg1 = [part1.concat([nb.N]), ...extra1.map(x => x.slice())];
    const reg2 = [part2.concat([nb.N]), ...extra2.map(x => x.slice())];
    const regions = s.regions.filter((_, k) => k !== ri).concat([reg1, reg2]);
    push({ lives: nb.lives, regions, turn: nb.turn, next: nb.next });
  }
}

// MERGE: A y B en boundaries distintos de la misma región -> fusiona los dos boundaries
function mergeMove(s, ri, A, B, push){
  const reg = s.regions[ri];
  const r1 = rotate(reg[A.bi], A.pos);   // empieza en A.id
  const r2 = rotate(reg[B.bi], B.pos);   // empieza en B.id
  const nb = baseNext(s, A.id === B.id ? { [A.id]: 2 } : { [A.id]: 1, [B.id]: 1 });
  // recorrido fusionado: alrededor de r1 desde A, cruzar por N a B, alrededor de r2, volver por N
  const merged = r1.concat([nb.N], r2, [nb.N]);
  const others = reg.filter((_, bi) => bi !== A.bi && bi !== B.bi);
  const newReg = [merged, ...others.map(x => x.slice())];
  const regions = s.regions.filter((_, k) => k !== ri).concat([newReg]);
  push({ lives: nb.lives, regions, turn: nb.turn, next: nb.next });
}

// LOOP: bucle en una esquina (A=B misma ocurrencia). Crea un ciclo [id, N] que parte la
// región; reparte los demás boundaries entre dentro y fuera del bucle.
function loopMoves(s, ri, A, push){
  const reg = s.regions[ri];
  const others = reg.filter((_, bi) => bi !== A.bi);
  // el boundary de A puede tener más puntos (si A.id tiene grado>0): el bucle nace en la
  // esquina de A; los demás elementos de ese boundary quedan en el lado "fuera".
  const restOfBd = reg[A.bi].filter((_, pos) => pos !== A.pos); // (heurística: resto del borde fuera)
  for (const [extra1, extra2] of distributions(others)){
    const nb = baseNext(s, { [A.id]: 2 });
    const loop = [A.id, nb.N];
    const inside = [loop, ...extra1.map(x => x.slice())];
    const outsideExtra = extra2.map(x => x.slice());
    const outside = [loop.slice(), ...outsideExtra];
    if (restOfBd.length) outside.push(restOfBd.slice());  // resto del borde original, fuera
    const regions = s.regions.filter((_, k) => k !== ri).concat([inside, outside]);
    push({ lives: nb.lives, regions, turn: nb.turn, next: nb.next });
  }
}

export const game = {
  meta: {
    nombre: 'Sprouts', slug: 'sprouts',
    subtitulo: 'Brotes — el juego topológico de Conway y Paterson',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'mueve primero' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'responde' },
    ],
    aiPlayer: 1,
    legend: 'Une dos puntos (o un punto consigo mismo) con una curva que no cruce nada, y pon un punto nuevo encima. Cada punto admite 3 líneas. <b>Quien no puede trazar, pierde.</b>',
    help: '<p>Sprouts es topológico: cada jugada une dos puntos con una curva que no puede cruzar otra curva ni a sí misma, y crea un punto nuevo sobre ella. De cada punto pueden salir como mucho <b>tres</b> líneas. Pierde quien se queda sin jugada legal.</p>',
    footer: 'Sprouts, de John Conway y Michael Paterson (1967)',
  },
  configs: CONFIGS,

  initial(key){
    const c = cfg(key), lives = [], regions = [[]];
    for (let i = 0; i < c.n; i++){ lives.push(3); regions[0].push([i]); }
    return { lives, regions, turn: 0, next: c.n };
  },

  current(s){ return s.turn; },
  legalMoves(s){ return genMoves(s); },
  apply(s, m){ return m.next; },
  isTerminal(s){ return genMoves(s).length === 0; },
  winner(s){ return this.isTerminal(s) ? other(s.turn) : null; },

  // Impartial: la negamax del motor busca hasta el terminal en n pequeño (juego perfecto).
  // Si alguna vez se capa la profundidad, heurística de PARIDAD/vidas (nunca conexión).
  // Impartial + n pequeño: el motor llega al terminal (juego exacto), así que la heurística
  // es solo un fallback neutro. NUNCA distancia de conexión (Sprouts no va de conectar).
  evaluate(){ return 0; },

  key(s){ return stateKey(s); },
  exactOK(s){ let v = 0; for (const x of s.lives) v += x; return v <= 12; },

  viewBox(){ return '0 0 420 360'; },
  render(svg){ el('text', { x: 210, y: 180, 'text-anchor': 'middle', fill: 'var(--muted)' }, svg).textContent = '(render pendiente: primero el oráculo)'; },
};
