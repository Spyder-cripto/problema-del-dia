// bridg-it/game.js — Juego de conexión de David Gale (Bridg-It / Gale).
// Dos rejillas de puntos entrelazadas: AZUL (jugador 0) une sus puntos para conectar
// ARRIBA↔ABAJO; ROJO (jugador 1) une los suyos para conectar IZQUIERDA↔DERECHA.
// Un puente azul y uno rojo de la misma celda interior se cruzarían: son MUTUAMENTE
// EXCLUYENTES. Gana quien completa su conexión. La victoria se decide por CONECTIVIDAD
// (BFS sobre la red de puentes) y la IA evalúa por DISTANCIA DE CONEXIÓN (BFS 0-1).
import { el } from '../_engine/svg.js';

// ---------------------------------------------------------------------------
// MODELO
// ---------------------------------------------------------------------------
// Tablero SIMÉTRICO de tamaño n (geometría clásica de Bridg-It):
//   · rejilla AZUL: (n+1) filas × n columnas de puntos.  Azul une ARRIBA↔ABAJO,
//     así que necesita exactamente n puentes verticales para cruzar.
//   · rejilla ROJA: n filas × (n+1) columnas de puntos, desplazada media celda.
//     Rojo une IZQUIERDA↔DERECHA y necesita exactamente n puentes para cruzar.
//   Las dos rejillas son la una el giro de 90° de la otra: el tablero es JUSTO
//   (ninguno parte con ventaja estructural de distancia). n=4 es el Bridg-It clásico.
//
//   Coordenadas (en unidades de celda, paso GAP): el punto azul (r,c) está en
//   (x=c, y=r); el punto rojo (r,c) está en (x=c-0.5, y=r+0.5). Así los rojos se
//   intercalan entre los azules.
//
// Puentes AZULES (unen dos puntos azules vecinos):
//   · vertical   (r,c)-(r+1,c)   r∈0..n-1, c∈0..n-1
//   · horizontal (r,c)-(r,c+1)   r∈0..n,   c∈0..n-2
// Puentes ROJOS:
//   · vertical   (r,c)-(r+1,c)   r∈0..n-2, c∈0..n
//   · horizontal (r,c)-(r,c+1)   r∈0..n-1, c∈0..n-1
//
// CRUCE (exclusión mutua): cada celda interior aloja un par cruzado azul/rojo.
//   azul VERTICAL   (r,c)-(r+1,c)  ⟂  rojo HORIZONTAL (r,c)-(r,c+1)
//     (el puente azul vertical en (x=c, y=r..r+1) corta el rojo horizontal que va de
//      (c-0.5,r+0.5) a (c+0.5,r+0.5): se cruzan en (c, r+0.5)).
//   azul HORIZONTAL (r,c)-(r,c+1)  ⟂  rojo VERTICAL   (r-1,c+1)-(r,c+1)
//     (se cruzan en (c+0.5, r)).
// Modelamos cada par como una "arista interior" que solo uno de los dos colores ocupa.
//
// Estado (JSON-serializable, solo arrays/objetos planos):
//   { n, turn, blue:[...], red:[...] }  con blue[i]/red[i] ∈ {0:libre,1:puesto}.
// Cada índice identifica un puente vía las tablas de topo(n) (deterministas).

// --- Generación determinista de la lista de puentes y del mapa de cruces ----
// Cacheamos por n para no recomputar (las tablas son puras y deterministas).
const TOPO = {};

function topo(n){
  if (TOPO[n]) return TOPO[n];

  // dimensiones de cada rejilla de PUNTOS
  const blueRows = n + 1, blueCols = n;   // azul: alto n+1, ancho n
  const redRows  = n,     redCols  = n + 1; // rojo: alto n, ancho n+1

  const blue = []; // { o, r, c, a:[r,c], b:[r,c] }  (índices de PUNTO azul)
  for (let r = 0; r < blueRows - 1; r++) for (let c = 0; c < blueCols; c++)
    blue.push({ o: 'v', r, c, a: [r, c], b: [r + 1, c] });
  for (let r = 0; r < blueRows; r++) for (let c = 0; c < blueCols - 1; c++)
    blue.push({ o: 'h', r, c, a: [r, c], b: [r, c + 1] });

  const red = []; // (índices de PUNTO rojo)
  for (let r = 0; r < redRows - 1; r++) for (let c = 0; c < redCols; c++)
    red.push({ o: 'v', r, c, a: [r, c], b: [r + 1, c] });
  for (let r = 0; r < redRows; r++) for (let c = 0; c < redCols - 1; c++)
    red.push({ o: 'h', r, c, a: [r, c], b: [r, c + 1] });

  // índice de puentes azules por clave para construir el cruce
  const blueKey = new Map();
  blue.forEach((b, i) => blueKey.set(b.o + ':' + b.r + ':' + b.c, i));

  // cruce: para cada puente rojo, ¿qué puente azul lo cruza? (deducido de la geometría)
  //   rojo HORIZONTAL (r,c)-(r,c+1)  <->  azul VERTICAL   (r,   c)      [se cruzan en (c, r+0.5)]
  //   rojo VERTICAL   (r,c)-(r+1,c)  <->  azul HORIZONTAL (r+1, c-1)    [se cruzan en (c-0.5, r+1)]
  const redCross = new Array(red.length).fill(-1);
  const blueCross = new Array(blue.length).fill(-1);
  red.forEach((rb, ri) => {
    let bk;
    if (rb.o === 'h') bk = 'v:' + rb.r + ':' + rb.c;
    else              bk = 'h:' + (rb.r + 1) + ':' + (rb.c - 1);
    const bi = blueKey.get(bk);
    if (bi !== undefined){ redCross[ri] = bi; blueCross[bi] = ri; }
  });

  const t = { n, blueRows, blueCols, redRows, redCols, blue, red, redCross, blueCross };
  TOPO[n] = t;
  return t;
}

// ---------------------------------------------------------------------------
// CONFIGS (pequeñas por defecto para que la IA por profundidad juegue bien)
// ---------------------------------------------------------------------------
const CONFIGS = [
  { key: '3', label: '3×3 (rápido)', n: 3 },
  { key: '4', label: '4×4 (clásico)', n: 4 },
  { key: '5', label: '5×5 (amplio)', n: 5 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[1]; }

// ---------------------------------------------------------------------------
// CONECTIVIDAD
// ---------------------------------------------------------------------------
// Construye, para el color dado, la lista de adyacencia entre "nodos de punto" más
// dos nodos virtuales de lado (LADO_A, LADO_B), recorriendo solo puentes PUESTOS, y
// hace BFS para ver si los dos lados quedan conectados.

function getList(adj, k){ let l = adj.get(k); if (!l){ l = []; adj.set(k, l); } return l; }

// Azul conecta ARRIBA (fila 0) <-> ABAJO (última fila) de su rejilla.
function blueConnected(t, blueArr){
  const cols = t.blueCols, lastRow = t.blueRows - 1;
  const id = (r, c) => r * cols + c;
  const adj = new Map();
  const link = (a, b) => { getList(adj, a).push(b); getList(adj, b).push(a); };
  const TOP = -1, BOT = -2;
  for (let c = 0; c < cols; c++){ link(TOP, id(0, c)); link(BOT, id(lastRow, c)); }
  t.blue.forEach((b, i) => { if (blueArr[i]) link(id(b.a[0], b.a[1]), id(b.b[0], b.b[1])); });
  return bfsReach(adj, TOP, BOT);
}

// Rojo conecta IZQUIERDA (col 0) <-> DERECHA (última col) de su rejilla.
function redConnected(t, redArr){
  const cols = t.redCols, lastCol = t.redCols - 1;
  const id = (r, c) => r * cols + c;
  const adj = new Map();
  const link = (a, b) => { getList(adj, a).push(b); getList(adj, b).push(a); };
  const LEFT = -1, RIGHT = -2;
  for (let r = 0; r < t.redRows; r++){ link(LEFT, id(r, 0)); link(RIGHT, id(r, lastCol)); }
  t.red.forEach((b, i) => { if (redArr[i]) link(id(b.a[0], b.a[1]), id(b.b[0], b.b[1])); });
  return bfsReach(adj, LEFT, RIGHT);
}

function bfsReach(adj, src, dst){
  const seen = new Set([src]);
  const q = [src];
  while (q.length){
    const u = q.shift();
    if (u === dst) return true;
    const ns = adj.get(u); if (!ns) continue;
    for (const v of ns) if (!seen.has(v)){ seen.add(v); q.push(v); }
  }
  return false;
}

// ---------------------------------------------------------------------------
// DISTANCIA DE CONEXIÓN (BFS 0-1) — corazón de evaluate()
// ---------------------------------------------------------------------------
// Para el jugador `player`, mínimo nº de puentes LIBRES (no bloqueados por un cruce
// rival ya puesto) que necesita añadir para completar su conexión. Sus puentes ya
// puestos cuestan 0; los libres cuestan 1; los que el rival ya bloqueó por cruce son
// intransitables. Es un BFS 0-1 sobre el grafo de puntos+lados, donde el "coste" de
// cruzar una arista es 0 si el puente ya está puesto y 1 si está libre.
function blueDist(t, s){
  const rows = t.blueRows, cols = t.blueCols, P = rows * cols, lastRow = rows - 1;
  const id = (r, c) => r * cols + c;
  const TOP = P, BOT = P + 1, N = P + 2;
  // edges: lista de [u, v, cost] (cost 0 puesto, 1 libre, omitido si bloqueado)
  const edges = [];
  for (let c = 0; c < cols; c++){ edges.push([TOP, id(0, c), 0]); edges.push([BOT, id(lastRow, c), 0]); }
  t.blue.forEach((b, i) => {
    if (s.blue[i]) edges.push([id(b.a[0], b.a[1]), id(b.b[0], b.b[1]), 0]);
    else {
      const x = t.blueCross[i];
      if (x >= 0 && s.red[x]) return; // bloqueado por cruce rojo ya puesto
      edges.push([id(b.a[0], b.a[1]), id(b.b[0], b.b[1]), 1]);
    }
  });
  return bfs01(buildAdj(edges, N), TOP, BOT, N);
}
function redDist(t, s){
  const rows = t.redRows, cols = t.redCols, P = rows * cols, lastCol = cols - 1;
  const id = (r, c) => r * cols + c;
  const LEFT = P, RIGHT = P + 1, N = P + 2;
  const edges = [];
  for (let r = 0; r < rows; r++){ edges.push([LEFT, id(r, 0), 0]); edges.push([RIGHT, id(r, lastCol), 0]); }
  t.red.forEach((b, i) => {
    if (s.red[i]) edges.push([id(b.a[0], b.a[1]), id(b.b[0], b.b[1]), 0]);
    else {
      const x = t.redCross[i];
      if (x >= 0 && s.blue[x]) return; // bloqueado por cruce azul ya puesto
      edges.push([id(b.a[0], b.a[1]), id(b.b[0], b.b[1]), 1]);
    }
  });
  return bfs01(buildAdj(edges, N), LEFT, RIGHT, N);
}

function buildAdj(edges, N){
  const adj = Array.from({ length: N }, () => []);
  for (const [u, v, w] of edges){ adj[u].push([v, w]); adj[v].push([u, w]); }
  return adj;
}

// BFS 0-1 con deque (coste de aristas 0/1). Devuelve dist(src->dst) o Infinity.
function bfs01(adj, src, dst, N){
  const dist = new Array(N).fill(Infinity);
  dist[src] = 0;
  // deque: array con doble extremo; unshift para coste 0, push para coste 1
  const dq = [src];
  while (dq.length){
    const u = dq.shift();
    if (u === dst) return dist[dst];
    for (const [v, w] of adj[u]){
      const nd = dist[u] + w;
      if (nd < dist[v]){
        dist[v] = nd;
        if (w === 0) dq.unshift(v); else dq.push(v);
      }
    }
  }
  return dist[dst];
}

// ---------------------------------------------------------------------------
// OBJETO game
// ---------------------------------------------------------------------------
export const game = {
  meta: {
    nombre: 'Bridg-It',
    slug: 'bridg-it',
    subtitulo: 'El juego de conexión de David Gale',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '↕ une arriba y abajo' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '↔ une izquierda y derecha' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '« El problema del día' },
    legend:
      '<b class="az">Azul</b> tiende puentes entre sus puntos para unir <b>arriba ↕ abajo</b>; ' +
      '<b class="ro">Rojo</b> los tiende para unir <b>izquierda ↔ derecha</b>. ' +
      'Un puente azul y uno rojo de la misma celda se cruzarían: poner el tuyo <b>bloquea</b> el del rival. ' +
      '<b>Gana quien completa su conexión.</b>',
    help:
      '<p>Hay dos rejillas de puntos entrelazadas, una <b style="color:var(--azul)">azul</b> y otra ' +
      '<b style="color:var(--rojo)">roja</b>, desplazada media casilla. En tu turno tiendes un <b>puente</b> ' +
      'entre dos de tus puntos vecinos. <b style="color:var(--azul)">Azul</b> quiere encadenar puentes desde el ' +
      'borde superior hasta el inferior; <b style="color:var(--rojo)">Rojo</b>, desde el borde izquierdo hasta el derecho.</p>' +
      '<p>La gracia está en el <b>cruce</b>: tu puente y el del rival no caben a la vez en la misma celda interior, ' +
      'así que cada puente que tiendes también <b>corta</b> una de sus opciones. No es una carrera de casillas: ' +
      'es tejer tu camino mientras desgarras el suyo.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Bridg-It lo inventó <b>David Gale</b> hacia 1958 (también se le ' +
      'llama «el juego de Gale» o «Puentes»). Está <b>resuelto</b>: el primer jugador gana con una elegante estrategia ' +
      'de <i>emparejamiento</i>. En <b>Fácil</b> y <b>Media</b> la máquina deja huecos: búscale las cosquillas.</p>',
    footer: 'Bridg-It, de David Gale (≈1958) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    const t = topo(c.n);
    return { n: c.n, turn: 0, blue: new Array(t.blue.length).fill(0), red: new Array(t.red.length).fill(0) };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    const t = topo(s.n);
    // si la partida ya está decidida por conexión, no hay jugadas legales
    if (blueConnected(t, s.blue) || redConnected(t, s.red)) return [];
    const moves = [];
    if (s.turn === 0){
      for (let i = 0; i < t.blue.length; i++){
        if (s.blue[i]) continue;
        const x = t.blueCross[i];
        if (x >= 0 && s.red[x]) continue; // bloqueado por cruce rojo
        moves.push({ i });
      }
    } else {
      for (let i = 0; i < t.red.length; i++){
        if (s.red[i]) continue;
        const x = t.redCross[i];
        if (x >= 0 && s.blue[x]) continue; // bloqueado por cruce azul
        moves.push({ i });
      }
    }
    // "Remata si puedes": si alguna jugada COMPLETA tu conexión, esas son las únicas
    // continuaciones sensatas. Restringir a ellas es seguro (siguen siendo legales y la
    // partida termina antes, nunca después) y resuelve la ceguera de profundidad del
    // negamax genérico del motor: ante varias victorias FORZADAS dentro del horizonte
    // de búsqueda, el motor las empata todas en ±WIN y elegía una lenta ("mareaba" sin
    // rematar teniendo la conexión a un puente). Aquí la IA SIEMPRE cierra al instante;
    // y en 2 jugadores resalta la jugada ganadora (se puede deshacer). No altera quién
    // gana ni la terminalidad.
    const wins = [];
    for (const m of moves){
      const ns = this.apply(s, m);
      if (s.turn === 0 ? blueConnected(t, ns.blue) : redConnected(t, ns.red)) wins.push(m);
    }
    return wins.length ? wins : moves;
  },

  apply(s, m){
    const blue = s.blue.slice(), red = s.red.slice();
    if (s.turn === 0) blue[m.i] = 1; else red[m.i] = 1;
    return { n: s.n, turn: s.turn ^ 1, blue, red };
  },

  isTerminal(s){
    const t = topo(s.n);
    return blueConnected(t, s.blue) || redConnected(t, s.red);
  },

  winner(s){
    const t = topo(s.n);
    if (blueConnected(t, s.blue)) return 0;
    if (redConnected(t, s.red)) return 1;
    return null;
  },

  // evaluate = DISTANCIA DE CONEXIÓN desde la óptica de `player`.
  // Cuanto MENOR sea mi distancia (menos puentes me faltan) y MAYOR la del rival, mejor.
  //
  // IMPORTANTE: NO devolvemos ±1e6 para posiciones "ya decididas" aquí. El motor
  // (negamax) ya puntúa los estados TERMINALES reales con ±WIN (1e6); si además
  // marcáramos como ±1e6 una posición no-terminal pero "ganada por fuerza", el motor
  // no distinguiría una victoria INMEDIATA (terminal, +1e6) de una victoria diferida
  // detectada solo en el horizonte de búsqueda, y empataría ambas: la IA podría
  // "marear" sin rematar teniendo la conexión a un puente. Usamos una magnitud
  // DECISIVA pero ACOTADA (DECISIVE) muy por debajo de WIN: domina cualquier
  // diferencia normal de distancia, pero deja que el remate terminal real (1e6)
  // gane siempre. Esto hace que la IA COMPLETE su conexión en cuanto puede.
  evaluate(s, player){
    const t = topo(s.n);
    const DECISIVE = 1e4; // « 1e6 (= WIN del motor para terminales reales)
    if (blueConnected(t, s.blue)) return player === 0 ?  DECISIVE : -DECISIVE;
    if (redConnected(t, s.red))   return player === 1 ?  DECISIVE : -DECISIVE;
    const dBlue = blueDist(t, s);
    const dRed  = redDist(t, s);
    const myDist  = player === 0 ? dBlue : dRed;
    const oppDist = player === 0 ? dRed  : dBlue;
    // si el rival está totalmente cortado (Infinity) tratamos como ventaja enorme
    const cap = (x) => (x === Infinity ? 1000 : x);
    return cap(oppDist) - cap(myDist);
  },

  key(s){
    // clave de transposición: estado de los puentes + turno
    return s.blue.join('') + '|' + s.red.join('') + '|' + s.turn;
  },

  // Tableros con árbol de juego enorme: NO resolver exacto (la IA va por profundidad).
  exactOK(){ return false; },

  viewBox(s){
    const { PAD, GAP } = METRICS;
    const W = PAD * 2 + s.n * GAP;
    return '0 0 ' + W + ' ' + W;
  },

  render(svg, s, ctx){
    const n = s.n, t = topo(n);
    const { PAD, GAP, R_DOT, R_RED } = METRICS;
    // transformada única en "unidades de celda": X(xcell), Y(ycell).
    const X = (xc) => PAD + (xc + 0.5) * GAP;
    const Y = (yc) => PAD + yc * GAP;
    // un punto AZUL (r,c) está en (xc=c, yc=r); un punto ROJO (r,c) en (xc=c-0.5, yc=r+0.5)
    const bx = (c) => X(c),       by = (r) => Y(r);
    const rx = (c) => X(c - 0.5), ry = (r) => Y(r + 0.5);

    // pintamos puentes puestos primero (debajo), luego fantasmas, luego los puntos encima.

    // --- puentes AZULES puestos ---
    t.blue.forEach((b, i) => {
      if (!s.blue[i]) return;
      el('line', { class: 'bridge bridge0', x1: bx(b.a[1]), y1: by(b.a[0]), x2: bx(b.b[1]), y2: by(b.b[0]) }, svg);
    });
    // --- puentes ROJOS puestos ---
    t.red.forEach((b, i) => {
      if (!s.red[i]) return;
      el('line', { class: 'bridge bridge1', x1: rx(b.a[1]), y1: ry(b.a[0]), x2: rx(b.b[1]), y2: ry(b.b[0]) }, svg);
    });

    // --- jugadas legales (fantasmas) del jugador en turno ---
    if (ctx.interactive){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        let x1, y1, x2, y2;
        if (cur === 0){ const b = t.blue[m.i]; x1 = bx(b.a[1]); y1 = by(b.a[0]); x2 = bx(b.b[1]); y2 = by(b.b[0]); }
        else          { const b = t.red[m.i];  x1 = rx(b.a[1]); y1 = ry(b.a[0]); x2 = rx(b.b[1]); y2 = ry(b.b[0]); }
        if (ctx.hint && ctx.hint.i === m.i)
          el('line', { class: 'halo', x1, y1, x2, y2 }, svg);
        const g = el('line', { class: 'ghost g' + cur, x1, y1, x2, y2 }, svg);
        g.addEventListener('click', () => ctx.onMove({ i: m.i }));
      }
    }

    // --- puntos ROJOS (n filas × n+1 cols) ---
    for (let r = 0; r < t.redRows; r++) for (let c = 0; c < t.redCols; c++)
      el('circle', { class: 'dot piece1', cx: rx(c), cy: ry(r), r: R_RED }, svg);

    // --- puntos AZULES (n+1 filas × n cols) ---
    for (let r = 0; r < t.blueRows; r++) for (let c = 0; c < t.blueCols; c++)
      el('circle', { class: 'dot piece0', cx: bx(c), cy: by(r), r: R_DOT }, svg);
  },
};

const METRICS = { PAD: 22, GAP: 60, R_DOT: 8, R_RED: 7 };
