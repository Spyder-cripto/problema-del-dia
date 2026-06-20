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
// clave SEMI-canónica (CONSERVA las ids de los puntos): insensible a orden/rotación pero
// distingue jugadas sobre puntos distintos (p.ej. bucle en A vs en B) -> para el menú humano
// y para dedup de duplicados EXACTOS (no isomorfos). minRot por secuencia de ids.
function minRotId(b){ let best = null; for (let i = 0; i < b.length; i++){ const r = rotate(b, i).join('.'); if (best === null || r < best) best = r; } return best; }
function semiKey(s){
  const regs = s.regions.map(r => r.map(minRotId).sort().join('|')).sort().join('#');
  return regs + '~' + s.lives.join(',') + '~' + s.turn;
}
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
  const push = (next, a, b) => {
    const k = semiKey(next);
    if (seen.has(k)) return;       // dedup de duplicados EXACTOS (conserva jugadas distintas por punto)
    seen.add(k);
    out.push({ next, a, b });      // a,b = puntos unidos (a===b -> bucle), para la etiqueta del menú
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
    const edges = s.edges.concat([[A.id, nb.N], [nb.N, B.id]]);
    const regions = s.regions.filter((_, k) => k !== ri).concat([reg1, reg2]);
    push({ lives: nb.lives, regions, edges, turn: nb.turn, next: nb.next }, A.id, B.id);
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
  const edges = s.edges.concat([[A.id, nb.N], [nb.N, B.id]]);
  const regions = s.regions.filter((_, k) => k !== ri).concat([newReg]);
  push({ lives: nb.lives, regions, edges, turn: nb.turn, next: nb.next }, A.id, B.id);
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
    const edges = s.edges.concat([[A.id, nb.N], [nb.N, A.id]]);
    const regions = s.regions.filter((_, k) => k !== ri).concat([inside, outside]);
    push({ lives: nb.lives, regions, edges, turn: nb.turn, next: nb.next }, A.id, A.id);
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
    return { lives, regions, edges: [], turn: 0, next: c.n };
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

  // alto variable según nº de jugadas (el diagrama va arriba y NO se mueve; solo crece el menú)
  viewBox(s){ const rows = this.legalMoves(s).length; return '0 0 420 ' + (300 + Math.max(rows, 1) * 26 + 12); },

  render(svg, s, ctx){
    const L = (id) => id < 26 ? String.fromCharCode(65 + id) : 'Z' + (id - 25);
    const DIA = { cx: 210, cy: 150, r: 105 };
    // mapa de coordenadas PERSISTENTE en el nodo svg (estabilidad: los puntos no saltan).
    if (!svg._spr || s.edges.length === 0) svg._spr = {};   // edges vacío == posición inicial
    const pos = svg._spr, n = s.lives.length;

    // adyacencia desde las aristas
    const adj = {};
    for (const [a, b] of s.edges){ (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a); }

    // asignar coordenadas que falten: los iniciales (sin vecinos) en círculo; los nuevos en el
    // punto medio de sus vecinos ya colocados (determinista -> estable).
    const need = []; for (let id = 0; id < n; id++) if (!(id in pos)) need.push(id);
    const circ = need.filter(id => !(adj[id] && adj[id].length));
    circ.forEach((id, k) => { const a = -Math.PI / 2 + 2 * Math.PI * k / Math.max(circ.length, 1); pos[id] = [DIA.cx + DIA.r * Math.cos(a), DIA.cy + DIA.r * Math.sin(a)]; });
    let rem = need.filter(id => adj[id] && adj[id].length), guard = 0;
    while (rem.length && guard++ < 200){
      const still = [];
      for (const id of rem){
        const nb = adj[id].filter(x => x in pos);
        if (!nb.length){ still.push(id); continue; }
        let mx = 0, my = 0; for (const x of nb){ mx += pos[x][0]; my += pos[x][1]; } mx /= nb.length; my /= nb.length;
        if (nb.every(x => x === nb[0])){            // bucle: empuja hacia afuera del centro
          let dx = mx - DIA.cx, dy = my - DIA.cy; const d = Math.hypot(dx, dy) || 1;
          pos[id] = [mx + 42 * dx / d, my + 42 * dy / d];
        } else {                                     // punto medio + desvío perpendicular
          const [x0, y0] = pos[nb[0]]; let dx = mx - x0, dy = my - y0; const d = Math.hypot(dx, dy) || 1;
          const off = (id % 2 ? 1 : -1) * (20 + (id % 3) * 9);
          pos[id] = [mx + off * (-dy / d), my + off * (dx / d)];
        }
      }
      if (still.length === rem.length) break;
      rem = still;
    }
    for (const id of rem) if (!(id in pos)) pos[id] = [DIA.cx, DIA.cy];

    // aristas (arcos): leve comba alterna para separar paralelas (bucles)
    s.edges.forEach(([a, b], i) => {
      const [x1, y1] = pos[a], [x2, y2] = pos[b];
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; let dx = x2 - x1, dy = y2 - y1; const d = Math.hypot(dx, dy) || 1;
      const bow = (i % 2 ? 1 : -1) * (7 + (i % 3) * 5);
      el('path', { class: 'spr-edge', d: `M${x1.toFixed(1)},${y1.toFixed(1)} Q${(mx + bow * (-dy / d)).toFixed(1)},${(my + bow * (dx / d)).toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}` }, svg);
    });

    // puntos (vivos / muertos) con etiqueta
    for (let id = 0; id < n; id++){
      const [x, y] = pos[id], alive = s.lives[id] > 0;
      el('circle', { class: alive ? 'spr-spot' : 'spr-dead', cx: x.toFixed(1), cy: y.toFixed(1), r: 8 }, svg);
      el('text', { class: 'spr-label', x: x.toFixed(1), y: (y - 13).toFixed(1), 'text-anchor': 'middle' }, svg).textContent = L(id);
    }

    if (!ctx.interactive) return;

    // MENÚ de jugadas legales (Opción B): la lista ya verificada por el oráculo.
    const moves = this.legalMoves(s);
    const baseLabel = (m) => m.a === m.b ? ('Bucle en ' + L(m.a)) : ('Unir ' + L(m.a) + '–' + L(m.b));
    const total = {}; moves.forEach(m => { const l = baseLabel(m); total[l] = (total[l] || 0) + 1; });
    const seen = {};
    const hov = el('g', {}, svg);
    const clearHov = () => { while (hov.firstChild) hov.removeChild(hov.firstChild); };
    const hintKey = ctx.hint ? semiKey(ctx.hint.next) : null;

    el('text', { class: 'spr-menu-title', x: 22, y: 298 }, svg).textContent = 'Elige tu jugada:';
    moves.forEach((m, i) => {
      const l = baseLabel(m); seen[l] = (seen[l] || 0) + 1;
      const label = total[l] > 1 ? (l + ' · var. ' + seen[l]) : l;
      const ry = 308 + i * 26;
      const isHint = hintKey && semiKey(m.next) === hintKey;
      const row = el('rect', { class: 'spr-row' + (isHint ? ' spr-hint' : ''), x: 18, y: ry, width: 384, height: 22, rx: 6 }, svg);
      el('text', { class: 'spr-row-text', x: 30, y: ry + 16 }, svg).textContent = '▸ ' + label;
      row.addEventListener('click', () => ctx.onMove(m));
      row.addEventListener('mouseenter', () => { clearHov(); for (const id of [m.a, m.b]){ const [x, y] = pos[id]; el('circle', { class: 'spr-halo', cx: x.toFixed(1), cy: y.toFixed(1), r: 13 }, hov); } });
      row.addEventListener('mouseleave', clearHov);
    });
  },
};
