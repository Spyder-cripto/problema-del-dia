// havannah/game.js — Juego de conexión Havannah (Christian Freeling, 1979).
// Tablero con forma de HEXÁGONO (no rombo como Hex), de lado `base`. Tiene 6 esquinas
// y 6 lados; los lados NO incluyen las esquinas. Por turnos colocas una piedra de tu
// color en una celda vacía. Hay TRES formas de ganar, todas por conexión:
//   1) PUENTE   — una cadena propia que una dos cualesquiera de las 6 esquinas.
//   2) HORQUILLA— una cadena propia que toque tres cualesquiera de los 6 lados.
//   3) ANILLO   — un lazo cerrado de piedras propias que rodee >=1 celda (vacía o no).
// El empate es teórico y rarísimo (tablero lleno sin ninguna de las tres) -> winner null.
//
// Estado { n, cells:[-1|0|1...], turn }  (-1 vacía; índice = posición en geom(n).cells).
// Coordenadas axiales (q,r) con s=-q-r; hexágono centrado: max(|q|,|r|,|s|) <= n-1.
// NO se toca _engine/: se usa la IA del motor (negamax + tiempo) con evaluate de conexión.
import { el } from '../_engine/svg.js';

// ---------- geometría (caché por base, fuera del estado) ----------
const GEOM = {};
function geom(n){
  if (GEOM[n]) return GEOM[n];
  const cells = [], index = new Map(), m = n - 1;
  for (let q = -m; q <= m; q++) for (let r = -m; r <= m; r++){
    const s = -q - r;
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= m){
      index.set(q + ',' + r, cells.length);
      cells.push({ q, r, s });
    }
  }
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];
  const neighbors = cells.map(({ q, r }) => {
    const out = [];
    for (const [dq, dr] of DIRS){ const j = index.get((q + dq) + ',' + (r + dr)); if (j !== undefined) out.push(j); }
    return out;
  });
  const cornerSet = new Set(), edgeOf = new Array(cells.length).fill(-1), boundary = [], corners = [];
  cells.forEach(({ q, r, s }, i) => {
    const ext = (Math.abs(q) === m ? 1 : 0) + (Math.abs(r) === m ? 1 : 0) + (Math.abs(s) === m ? 1 : 0);
    if (ext >= 1) boundary.push(i);
    if (ext === 2){ cornerSet.add(i); corners.push(i); }
    else if (ext === 1){
      edgeOf[i] = q === m ? 0 : q === -m ? 1 : r === m ? 2 : r === -m ? 3 : s === m ? 4 : 5;
    }
  });
  // cornerBit[i] = índice 0..5 de la esquina (para máscaras de bits en el rollout incremental);
  // -1 si la celda no es esquina. (Aditivo: no afecta a winner/evaluate, solo lo usa fastBoard.)
  const cornerBit = new Int8Array(cells.length).fill(-1);
  corners.forEach((ci, j) => { cornerBit[ci] = j; });
  return (GEOM[n] = { cells, index, neighbors, corners, cornerSet, edgeOf, boundary, cornerBit });
}

// ---------- disposición en píxeles (caché por base) ----------
const LAYOUT = {};
function layout(n){
  if (LAYOUT[n]) return LAYOUT[n];
  const g = geom(n), size = 18, SQ3 = Math.sqrt(3);
  const px = [], py = [];
  let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (const { q, r } of g.cells){
    const x = size * SQ3 * (q + r / 2), y = size * 1.5 * r;
    px.push(x); py.push(y);
    if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y;
  }
  const PAD = size + 10;
  for (let i = 0; i < px.length; i++){ px[i] += PAD - minx; py[i] += PAD - miny; }
  const W = Math.ceil(maxx - minx + 2 * PAD), H = Math.ceil(maxy - miny + 2 * PAD);
  return (LAYOUT[n] = { size, px, py, W, H });
}

const CONFIGS = [
  { key: 'b6', label: 'Base 6 (normal)', n: 6 },
  { key: 'b8', label: 'Base 8 (grande)', n: 8 },
  { key: 'b4', label: 'Base 4 (rápida)', n: 4 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// ¿Gana `p` por PUENTE (>=2 esquinas) u HORQUILLA (>=3 lados) en alguna componente?
function structuresWin(s, p){
  const g = geom(s.n), cells = s.cells, N = cells.length, seen = new Array(N).fill(false);
  for (let i = 0; i < N; i++){
    if (cells[i] !== p || seen[i]) continue;
    let corners = 0; const sides = new Set();
    const stack = [i]; seen[i] = true;
    while (stack.length){
      const u = stack.pop();
      if (g.cornerSet.has(u)) corners++;
      else if (g.edgeOf[u] >= 0) sides.add(g.edgeOf[u]);
      const ns = g.neighbors[u];
      for (let k = 0; k < ns.length; k++){ const v = ns[k]; if (!seen[v] && cells[v] === p){ seen[v] = true; stack.push(v); } }
    }
    if (corners >= 2 || sides.size >= 3) return true;
  }
  return false;
}

// ¿Gana `p` por ANILLO? Flood-fill desde el borde sobre celdas NO-p: si alguna celda
// no-p queda inalcanzable desde el borde, está ENCERRADA por piedras de p => anillo.
function ringWin(s, p){
  const g = geom(s.n), cells = s.cells, N = cells.length, seen = new Array(N).fill(false);
  const stack = [];
  for (const b of g.boundary) if (cells[b] !== p && !seen[b]){ seen[b] = true; stack.push(b); }
  while (stack.length){
    const u = stack.pop(), ns = g.neighbors[u];
    for (let k = 0; k < ns.length; k++){ const v = ns[k]; if (!seen[v] && cells[v] !== p){ seen[v] = true; stack.push(v); } }
  }
  for (let i = 0; i < N; i++) if (cells[i] !== p && !seen[i]) return true;   // celda encerrada
  return false;
}

// Distancia de conexión (BFS 0-1 multifuente desde las piedras de p) a esquinas y lados.
function reach(s, p, cap){
  const g = geom(s.n), cells = s.cells, N = cells.length, opp = p ^ 1;
  const dist = new Array(N).fill(Infinity);
  let cur = [], nxt = [];
  for (let i = 0; i < N; i++) if (cells[i] === p){ dist[i] = 0; cur.push(i); }
  let layer = 0;
  while (cur.length || nxt.length){
    while (cur.length){
      const u = cur.pop();
      if (dist[u] !== layer) continue;
      const ns = g.neighbors[u];
      for (let k = 0; k < ns.length; k++){
        const v = ns[k];
        if (cells[v] === opp) continue;
        const w = cells[v] === p ? 0 : 1, nd = dist[u] + w;
        if (nd < dist[v]){ dist[v] = nd; (w === 0 ? cur : nxt).push(v); }
      }
    }
    cur = nxt; nxt = []; layer++;
  }
  const cornerCosts = g.corners.map(ci => Math.min(dist[ci], cap)).sort((a, b) => a - b);
  const sideCost = [cap, cap, cap, cap, cap, cap];
  for (let i = 0; i < N; i++){ const e = g.edgeOf[i]; if (e >= 0){ const d = Math.min(dist[i], cap); if (d < sideCost[e]) sideCost[e] = d; } }
  const ss = sideCost.slice().sort((a, b) => a - b);
  const bridgeProxy = (cornerCosts[0] ?? cap) + (cornerCosts[1] ?? cap);
  const forkProxy = ss[0] + ss[1] + ss[2];
  // ANILLO INMINENTE: una celda interior (6 vecinos) sin ningún vecino rival a la que
  // a `p` le faltan <=2 piedras para rodearla (anillo mínimo). Solo cuenta cuando está
  // cerca de cerrarse, para que la IA remate/BLOQUEE anillos sin amontonar en la apertura.
  let ringProxy = cap;
  for (let c = 0; c < N; c++){
    const ns = g.neighbors[c];
    if (ns.length !== 6) continue;
    let eN = 0, oN = 0;
    for (let k = 0; k < ns.length; k++){ const cv = cells[ns[k]]; if (cv === -1) eN++; else if (cv === opp) oN++; }
    if (oN === 0 && eN <= 2 && eN < ringProxy) ringProxy = eN;
  }
  let cornTouch = 0; for (const ci of g.corners) if (cells[ci] === p) cornTouch++;
  const touched = new Set(); for (let i = 0; i < N; i++) if (cells[i] === p && g.edgeOf[i] >= 0) touched.add(g.edgeOf[i]);
  return { proxy: Math.min(bridgeProxy, forkProxy, ringProxy), cornTouch, edgeTouch: touched.size };
}

// ---------- detección de victoria INCREMENTAL para los playouts del MCTS ----------
// El winner() canónico hace 4 flood-fills O(N) por jugada → demasiado lento para miles de
// playouts. fastBoard mantiene la victoria de forma incremental:
//   · PUENTE/HORQUILLA → union-find con máscara de esquinas/lados por componente (O(α)/piedra).
//     Las máscaras espejan structuresWin EXACTAMENTE (popcount esquinas≥2 / lados≥3).
//   · ANILLO → solo cuando una jugada CIERRA UN CICLO (un vecino del color ya conectado a otro)
//     se ejecuta el predicado EXACTO ringWin() sobre el tablero actual. Cerrar ciclo es condición
//     NECESARIA de anillo → nunca se escapa uno; el predicado exacto decide → nunca falso positivo.
// Es la EXCEPCIÓN de rendimiento del brief, verificada == winner() en _mcts_rollout_verify.mjs.
function popcount8(b){ b = b - ((b >> 1) & 0x55); b = (b & 0x33) + ((b >> 2) & 0x33); return (b + (b >> 4)) & 0x0f; }

export function fastBoard(n){
  const g = geom(n), N = g.cells.length;
  const cells  = new Int8Array(N).fill(-1);
  const parent = new Int32Array(N).fill(-1);
  const rnk    = new Uint8Array(N);
  const cMask  = new Uint8Array(N);   // máscara de esquinas tocadas por la componente (raíz)
  const eMask  = new Uint8Array(N);   // máscara de lados tocados por la componente (raíz)

  function find(x){ while (parent[x] !== x){ parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function unite(a, b){
    let ra = find(a), rb = find(b);
    if (ra === rb) return;
    if (rnk[ra] < rnk[rb]){ const t = ra; ra = rb; rb = t; }
    parent[rb] = ra;
    if (rnk[ra] === rnk[rb]) rnk[ra]++;
    cMask[ra] |= cMask[rb];
    eMask[ra] |= eMask[rb];
  }
  function mkNode(i, color){
    cells[i] = color; parent[i] = i; rnk[i] = 0;
    cMask[i] = (g.cornerBit[i] >= 0) ? (1 << g.cornerBit[i]) : 0;
    eMask[i] = (g.edgeOf[i]   >= 0) ? (1 << g.edgeOf[i])   : 0;
  }

  return {
    cells,
    // Reconstruye el union-find desde un tablero existente (posición de partida NO terminal,
    // así que no hace falta comprobar victorias durante el init).
    init(cells0){
      for (let i = 0; i < N; i++){ const c = cells0[i]; if (c === 0 || c === 1) mkNode(i, c); }
      for (let i = 0; i < N; i++){
        if (cells[i] < 0) continue;
        const ns = g.neighbors[i];
        for (let k = 0; k < ns.length; k++){ const v = ns[k]; if (cells[v] === cells[i]) unite(i, v); }
      }
    },
    // Coloca una piedra de `color` en i. Devuelve el color GANADOR si esta jugada gana, o null.
    place(i, color){
      mkNode(i, color);
      const ns = g.neighbors[i];
      // ¿se cierra un ciclo? cuenta vecinos del color (k) y componentes DISTINTAS entre ellos (d);
      // ciclos creados al unir = k - d. k-d>=1 ⇒ se cerró un ciclo ⇒ puede haber anillo.
      let k = 0; const roots = [];
      for (let t = 0; t < ns.length; t++){ const v = ns[t]; if (cells[v] === color){ roots.push(find(v)); k++; } }
      let distinct = 0; for (let a = 0; a < roots.length; a++){ let dup = false; for (let b = 0; b < a; b++) if (roots[b] === roots[a]){ dup = true; break; } if (!dup) distinct++; }
      for (let t = 0; t < ns.length; t++){ const v = ns[t]; if (cells[v] === color) unite(i, v); }
      const r = find(i);
      if (popcount8(cMask[r]) >= 2 || popcount8(eMask[r]) >= 3) return color;   // puente / horquilla
      if (k - distinct >= 1 && ringWin({ n, cells }, color)) return color;       // anillo (predicado exacto)
      return null;
    },
  };
}

export const game = {
  meta: {
    nombre: 'Havannah',
    slug: 'havannah',
    subtitulo: 'Tres caminos a la victoria — el juego de conexión de Christian Freeling',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '' },
    ],
    aiPlayer: 1,
    // Driver de IA: MCTS (UCT) en lugar de negamax. En base-8 (~169 celdas) el alfa-beta solo
    // alcanza profundidad 1 (heurística sin lookahead) y un humano lo bate trivialmente; el MCTS
    // simula miles de partidas/jugada y juega mucho mejor (medido: 14/16 vs negamax-prof-1 en
    // base-8 con solo 1200 sims, y ~13k sims/jugada en Difícil). Dificultad = presupuesto de
    // tiempo (DIFFS.timeMs) + ruido (DIFFS.randomness), igual que el modelo del negamax.
    aiDriver: 'mcts',
    aiParams: { c: 1.414 },          // constante de exploración UCB1 (vanilla, sin TT/RAVE)
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Coloca una piedra por turno. Ganas de <b>tres</b> formas, todas con una cadena propia: ' +
      '<b>puente</b> (une 2 esquinas), <b>horquilla</b> (toca 3 lados) o <b>anillo</b> (un lazo que rodee una celda). ' +
      'Las <b>esquinas</b> van marcadas en oro.',
    help:
      '<p>El tablero es un hexágono de celdas hexagonales: seis <b>esquinas</b> (en oro) y seis <b>lados</b> ' +
      '(las celdas del borde que no son esquina). Por turnos colocáis una piedra en cualquier celda libre. ' +
      'Gana quien complete primero una de estas tres figuras con sus piedras conectadas:</p>' +
      '<p>· <b>Puente:</b> una cadena que toque <b>dos esquinas</b> cualesquiera.<br>' +
      '· <b>Horquilla:</b> una cadena que toque <b>tres lados</b> distintos (las esquinas no cuentan como lado).<br>' +
      '· <b>Anillo:</b> un <b>lazo cerrado</b> de tus piedras que rodee al menos una celda, dé igual lo que haya dentro.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">El anillo es el más escurridizo: vigila los dos a la vez, porque ' +
      'tu rival puede colarte uno mientras defiendes un puente. El empate es teóricamente posible pero casi nunca ocurre. ' +
      'Como el tablero es grande, la máquina elige su jugada <b>simulando miles de partidas al azar</b> (búsqueda Monte ' +
      'Carlo); «💡 Pista» y «⚖️ ¿Quién gana?» son estimaciones, no veredictos exactos.</p>',
    footer: 'Havannah, de Christian Freeling (1979) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key), g = geom(c.n);
    return { n: c.n, cells: new Array(g.cells.length).fill(-1), turn: 0 };
  },

  current(s){ return s.turn; },

  // Celdas vacías, ORDENADAS (pegadas a piedras y hacia el centro primero) para la poda
  // alfa-beta del motor; sin jugadas si ya hay ganador.
  legalMoves(s){
    if (this.winner(s) !== null) return [];
    const g = geom(s.n), cells = s.cells, scored = [];
    for (let i = 0; i < cells.length; i++){
      if (cells[i] !== -1) continue;
      let adj = 0; const ns = g.neighbors[i];
      for (let k = 0; k < ns.length; k++) if (cells[ns[k]] !== -1) adj++;
      const c = g.cells[i], cdist = (Math.abs(c.q) + Math.abs(c.r) + Math.abs(c.s)) / 2;
      scored.push([i, adj * 100 - cdist]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    return scored.map(x => ({ i: x[0] }));
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[m.i] = s.turn;
    return { n: s.n, cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){
    if (this.winner(s) !== null) return true;
    const c = s.cells;
    for (let i = 0; i < c.length; i++) if (c[i] === -1) return false;   // queda hueco
    return true;   // tablero lleno (empate residual)
  },

  winner(s){
    if (structuresWin(s, 0) || ringWin(s, 0)) return 0;
    if (structuresWin(s, 1) || ringWin(s, 1)) return 1;
    return null;
  },

  // evaluate ≈ (distancia del rival) − (mi distancia) a la victoria más cercana (puente u
  // horquilla), con gradiente fuerte; + bonus por esquinas/lados ya tocados. Mayor = mejor
  // para quien mueve. (El motor solo lo llama en hojas NO terminales.)
  evaluate(s, player){
    const cap = s.cells.length + 1;
    const me = reach(s, player, cap), op = reach(s, player ^ 1, cap);
    return (op.proxy - me.proxy) * 1000
         + (me.cornTouch - op.cornTouch) * 6
         + (me.edgeTouch - op.edgeTouch) * 4;
  },

  key(s){ return s.cells.join(',') + s.turn; },

  exactOK(s){ return false; },

  // Playout aleatorio RÁPIDO para el MCTS del motor (driver 'mcts'): juega celdas vacías al
  // azar hasta terminal con detección de victoria incremental (fastBoard). Devuelve el ganador
  // (0/1) o null si se llena el tablero (empate residual) — misma semántica que winner().
  // Verificado == winner() en _mcts_rollout_verify.mjs. El motor lo usa vía el hook game.rollout.
  rollout(s, rng){
    const N = s.cells.length, fb = fastBoard(s.n);
    fb.init(s.cells);
    const empties = [];
    for (let i = 0; i < N; i++) if (s.cells[i] === -1) empties.push(i);
    let turn = s.turn;
    while (empties.length){
      const idx = (rng() * empties.length) | 0;
      const i = empties[idx];
      empties[idx] = empties[empties.length - 1]; empties.pop();
      const w = fb.place(i, turn);
      if (w !== null) return w;
      turn ^= 1;
    }
    return null;
  },

  viewBox(s){ const L = layout(s.n); return '0 0 ' + L.W + ' ' + L.H; },

  render(svg, s, ctx){
    const g = geom(s.n), L = layout(s.n), R = L.size;
    const hexPts = (cx, cy) => {
      const pts = [];
      for (let k = 0; k < 6; k++){
        const a = Math.PI / 180 * (60 * k - 90);
        pts.push((cx + R * Math.cos(a)).toFixed(2) + ',' + (cy + R * Math.sin(a)).toFixed(2));
      }
      return pts.join(' ');
    };

    // celdas (hexágonos); las esquinas con clase propia (oro) y los lados con un matiz.
    for (let i = 0; i < g.cells.length; i++){
      const cx = L.px[i], cy = L.py[i];
      let cls = 'hexcell';
      if (g.cornerSet.has(i)) cls += ' hexcorner';
      else if (g.edgeOf[i] >= 0) cls += ' hexedge';
      el('polygon', { class: cls, points: hexPts(cx, cy) }, svg);
      const v = s.cells[i];
      if (v === 0 || v === 1) el('circle', { class: 'piece' + v, cx, cy, r: R * 0.6 }, svg);
    }

    // jugadas legales (fantasmas) del jugador en turno + halo de pista.
    if (ctx.interactive){
      const cur = s.turn, moves = this.legalMoves(s);
      for (const m of moves){
        const cx = L.px[m.i], cy = L.py[m.i];
        if (ctx.hint && ctx.hint.i === m.i) el('circle', { class: 'halo', cx, cy, r: R * 0.74 }, svg);
        const gh = el('circle', { class: 'ghost g' + cur, cx, cy, r: R * 0.6 }, svg);
        gh.addEventListener('click', () => ctx.onMove({ i: m.i }));
      }
    }
  },
};
