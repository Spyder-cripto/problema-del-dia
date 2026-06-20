// shannon/game.js — Juego de Shannon (versión ARISTAS, sobre un grafo).
// «Short» (jugador 0) RECLAMA una arista libre en su turno; «Cut» (jugador 1) la BORRA.
// Short gana cuando sus aristas reclamadas conectan A con B; Cut gana si deja
// imposible toda ruta A-B. Es un juego de CONEXIÓN: la victoria se decide por
// caminos en el grafo (BFS), no por «último en mover».
//
// Está RESUELTO: Short gana (jugando segundo da igual) si y solo si existen DOS
// árboles generadores aristas-disjuntos que conecten A y B (teorema de
// Lehman/Nash-Williams-Tutte). Los grafos de aquí están elegidos para que Short
// gane con juego correcto, así la máquina es ganable en Fácil.
import { el } from '../_engine/svg.js';

const ST_FREE = -1, ST_SHORT = 0, ST_CUT = 1;

// ---------------------------------------------------------------------------
// GRAFOS. Cada uno: nodos con coordenadas (para dibujar) y aristas {u,v}.
// A y B son los vértices a conectar (índices de nodo). Pensados simétricos y
// con dos rutas aristas-disjuntas para que Short tenga estrategia ganadora.
// ---------------------------------------------------------------------------

// Puente de Wheatstone «doble»: A y B en los extremos, dos cadenas paralelas de
// dos nodos cada una, con un travesaño central. 6 nodos, 9 aristas.
const G_PUENTE = {
  label: 'Puente',
  nodes: [
    { x: 40,  y: 130 },  // 0 = A (izquierda)
    { x: 140, y: 55  },  // 1 (arriba-izq)
    { x: 140, y: 205 },  // 2 (abajo-izq)
    { x: 250, y: 55  },  // 3 (arriba-der)
    { x: 250, y: 205 },  // 4 (abajo-der)
    { x: 350, y: 130 },  // 5 = B (derecha)
  ],
  edges: [
    { u: 0, v: 1 }, { u: 0, v: 2 },
    { u: 1, v: 3 }, { u: 2, v: 4 },
    { u: 1, v: 2 }, { u: 3, v: 4 },   // travesaños vertical izq/der
    { u: 1, v: 4 }, { u: 2, v: 3 },   // diagonales centrales
    { u: 3, v: 5 }, { u: 4, v: 5 },
  ],
  A: 0, B: 5,
};

// Rejilla de nodos 3×3 con A y B en esquinas opuestas. Aristas ortogonales más
// las dos diagonales de las celdas hacia el centro: 9 nodos, simétrico.
const G_REJILLA = {
  label: 'Rejilla 3×3',
  nodes: (function(){
    const n = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      n.push({ x: 50 + c * 130, y: 40 + r * 130 });
    return n;
  })(),
  edges: (function(){
    const e = [], id = (r, c) => r * 3 + c;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++){
      if (c < 2) e.push({ u: id(r, c), v: id(r, c + 1) });   // horizontales
      if (r < 2) e.push({ u: id(r, c), v: id(r + 1, c) });   // verticales
    }
    // diagonales hacia el centro (4) para crear rutas alternativas
    e.push({ u: id(0, 0), v: id(1, 1) });
    e.push({ u: id(0, 2), v: id(1, 1) });
    e.push({ u: id(2, 0), v: id(1, 1) });
    e.push({ u: id(2, 2), v: id(1, 1) });
    return e;
  })(),
  A: 0, B: 8,   // esquina superior-izq y esquina inferior-der
};

// Triángulo doble (forma «diamante» minimal): A y B con dos rutas de 1 nodo y un
// travesaño. 4 nodos, 5 aristas — pequeñísimo, ideal para resolver de un vistazo.
const G_DIAMANTE = {
  label: 'Diamante',
  nodes: [
    { x: 40,  y: 130 },  // 0 = A
    { x: 180, y: 45  },  // 1
    { x: 180, y: 215 },  // 2
    { x: 320, y: 130 },  // 3 = B
  ],
  edges: [
    { u: 0, v: 1 }, { u: 0, v: 2 },
    { u: 1, v: 3 }, { u: 2, v: 3 },
    { u: 1, v: 2 },   // travesaño
  ],
  A: 0, B: 3,
};

const CONFIGS = [
  { key: 'diamante', label: 'Diamante (4)', graph: G_DIAMANTE },
  { key: 'puente',   label: 'Puente (6)',   graph: G_PUENTE },
  { key: 'rejilla',  label: 'Rejilla 3×3',  graph: G_REJILLA },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// --- utilidades de grafo (sobre el estado, sin mutarlo) ---

// Lista de adyacencia con un filtro sobre el estado de cada arista.
function adjacency(s, accept){
  const adj = [];
  for (let i = 0; i < s.nodes; i++) adj.push([]);
  for (const e of s.edges){
    if (accept(e.st)){ adj[e.u].push(e.v); adj[e.v].push(e.u); }
  }
  return adj;
}

// ¿Hay camino A-B usando solo aristas que pasen el filtro?
function connected(s, accept){
  const adj = adjacency(s, accept);
  const seen = new Array(s.nodes).fill(false);
  const stack = [s.A]; seen[s.A] = true;
  while (stack.length){
    const u = stack.pop();
    if (u === s.B) return true;
    for (const v of adj[u]) if (!seen[v]){ seen[v] = true; stack.push(v); }
  }
  return false;
}

// DISTANCIA DE CONEXIÓN de Short. Coste por ARISTA: reclamada(st=0)=0,
// libre(st=-1)=1, borrada(st=1)=bloqueada. Devuelve el nº MÍNIMO de aristas
// libres que Short debe aún reclamar para conectar A-B. Infinito si ya es
// imposible. Dijkstra simple (grafos diminutos): extrae el no-visitado de
// menor distancia. O(V^2), de sobra para estos tableros.
function shortDistance(s){
  const INF = Infinity;
  const adj = [];
  for (let i = 0; i < s.nodes; i++) adj.push([]);
  for (const e of s.edges){
    if (e.st === ST_CUT) continue;            // borrada: bloqueada
    const w = e.st === ST_SHORT ? 0 : 1;      // reclamada=0, libre=1
    adj[e.u].push({ to: e.v, w });
    adj[e.v].push({ to: e.u, w });
  }
  const dist = new Array(s.nodes).fill(INF);
  const done = new Array(s.nodes).fill(false);
  dist[s.A] = 0;
  for (let it = 0; it < s.nodes; it++){
    let u = -1, best = INF;
    for (let i = 0; i < s.nodes; i++) if (!done[i] && dist[i] < best){ best = dist[i]; u = i; }
    if (u === -1) break;                       // resto inalcanzable
    done[u] = true;
    for (const { to, w } of adj[u]){
      const nd = dist[u] + w;
      if (nd < dist[to]) dist[to] = nd;
    }
  }
  return dist[s.B];
}

// DISTANCIA DE CORTE de Cut: nº MÍNIMO de aristas LIBRES que Cut debe borrar
// para dejar imposible A-B. Es un corte mínimo A-B donde las aristas ya
// reclamadas por Short son INCORTABLES (capacidad ∞) y cada arista libre tiene
// capacidad 1 (las borradas no están). Por el teorema flujo-máx/corte-mín, el
// corte mínimo = flujo máximo entre A y B. Edmonds-Karp (BFS). Cuanto MAYOR,
// más seguro está Short; cuanto MENOR (0 = ya cortado), mejor para Cut.
function cutDistance(s){
  const N = s.nodes, INF = 1e9;
  // grafo residual: por cada arista no-borrada, dos arcos dirigidos.
  const to = [], cap = [], next = [], head = new Array(N).fill(-1);
  const addArc = (u, v, c) => { to.push(v); cap.push(c); next.push(head[u]); head[u] = to.length - 1; };
  const addEdge = (u, v, c) => { addArc(u, v, c); addArc(v, u, c); }; // no dirigida: ambos sentidos con cap c
  for (const e of s.edges){
    if (e.st === ST_CUT) continue;
    addEdge(e.u, e.v, e.st === ST_SHORT ? INF : 1);
  }
  let flow = 0;
  while (true){
    const prevArc = new Array(N).fill(-1);
    const seen = new Array(N).fill(false);
    seen[s.A] = true;
    const q = [s.A];
    let qi = 0, found = false;
    while (qi < q.length){
      const u = q[qi++];
      if (u === s.B){ found = true; break; }
      for (let a = head[u]; a !== -1; a = next[a]){
        const v = to[a];
        if (!seen[v] && cap[a] > 0){ seen[v] = true; prevArc[v] = a; q.push(v); }
      }
    }
    if (!found && !seen[s.B]) break;
    // cuello de botella a lo largo del camino aumentante
    let push = INF;
    for (let v = s.B; v !== s.A; ){ const a = prevArc[v]; push = Math.min(push, cap[a]); v = to[a ^ 1]; }
    for (let v = s.B; v !== s.A; ){ const a = prevArc[v]; cap[a] -= push; cap[a ^ 1] += push; v = to[a ^ 1]; }
    flow += push;
    if (flow >= INF) return INF;               // Short ya tiene cadena incortable
  }
  return flow;
}

export const game = {
  meta: {
    nombre: 'Juego de Shannon',
    slug: 'shannon',
    subtitulo: 'Conectar o cortar — el juego de conmutación de Claude Shannon',
    players: [
      { nombre: 'Short', corto: 'Short', color: 'var(--azul)', desc: '— une A y B' },
      { nombre: 'Cut',   corto: 'Cut',   color: 'var(--rojo)', desc: '— corta el grafo' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      '<b class="az">Short</b> <b>reclama</b> una arista libre cada turno (se vuelve azul); ' +
      '<b class="ro">Cut</b> <b>borra</b> una arista libre (se vuelve roja punteada). ' +
      '<b class="az">Short</b> gana si sus aristas azules <b>conectan A con B</b>; ' +
      '<b class="ro">Cut</b> gana si deja <b>imposible</b> cualquier ruta A-B.',
    help:
      '<p>Sobre un grafo con dos vértices marcados <b>A</b> y <b>B</b>, dos jugadores se turnan. ' +
      '<b style="color:var(--azul)">Short</b> (el «cortocircuito») <b>reclama</b> una arista libre, intentando enhebrar un camino azul de A a B. ' +
      '<b style="color:var(--rojo)">Cut</b> <b>borra</b> una arista libre, intentando que ningún camino sobreviva. ' +
      'Short gana en cuanto sus aristas reclamadas tocan A y B por una cadena continua; Cut gana si consigue separar A de B del todo.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Lo inventó <b>Claude Shannon</b> (el padre de la teoría de la información) y lo analizó <b>Alfred Lehman</b> en 1964. ' +
      'Tiene una solución <i>exacta</i>: <b>Short gana</b> (incluso moviendo segundo) si y solo si el grafo contiene <b>dos árboles generadores aristas-disjuntos</b> que unan A y B. ' +
      'En los tableros de aquí Short tiene estrategia ganadora: si Cut borra una arista de un par, Short reclama la otra. ' +
      'La <b>💡 Pista</b> te sugiere la jugada que la máquina cree mejor.</p>',
    footer: 'Juego de conmutación de <b>Claude Shannon</b>, resuelto por Alfred Lehman (1964) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    const g = c.graph;
    return {
      graph: c.key,
      nodes: g.nodes.length,
      edges: g.edges.map(e => ({ u: e.u, v: e.v, st: ST_FREE })),
      A: g.A, B: g.B,
      turn: 0,
    };
  },

  current(s){ return s.turn; },

  // Jugadas = índices de aristas libres (st == -1). Solo si el juego no terminó.
  legalMoves(s){
    if (this.isTerminal(s)) return [];
    const m = [];
    for (let i = 0; i < s.edges.length; i++) if (s.edges[i].st === ST_FREE) m.push({ e: i });
    return m;
  },

  // PURO. Short (turn 0) reclama -> st=0; Cut (turn 1) borra -> st=1. Turno alterna.
  apply(s, m){
    const edges = s.edges.map(e => ({ u: e.u, v: e.v, st: e.st }));
    edges[m.e].st = s.turn === 0 ? ST_SHORT : ST_CUT;
    return { graph: s.graph, nodes: s.nodes, edges, A: s.A, B: s.B, turn: s.turn ^ 1 };
  },

  // Terminal si: Short ya conectó (gana Short), o A-B ya es imposible aun usando
  // libres+reclamadas (gana Cut), o no quedan aristas libres.
  isTerminal(s){
    if (connected(s, st => st === ST_SHORT)) return true;                 // Short conectó
    if (!connected(s, st => st === ST_SHORT || st === ST_FREE)) return true; // Cut aisló A de B
    for (let i = 0; i < s.edges.length; i++) if (s.edges[i].st === ST_FREE) return false;
    return true;  // sin aristas libres (de hecho ya cubierto arriba, por seguridad)
  },

  // 0 = Short (camino A-B por aristas reclamadas). 1 = Cut (no hay camino A-B ni
  // siquiera usando libres+reclamadas). null si no es terminal.
  winner(s){
    if (connected(s, st => st === ST_SHORT)) return 0;
    if (!connected(s, st => st === ST_SHORT || st === ST_FREE)) return 1;
    return null;
  },

  // EVALUACIÓN = DISTANCIA DE CONEXIÓN, desde la óptica de `player`.
  //  · shortDistance(s) = aristas libres que Short aún debe reclamar para unir A-B
  //    (coste-0 las reclamadas, coste-1 las libres). MENOR ⇒ mejor para Short.
  //  · cutDistance(s)  = aristas libres que Cut aún debe borrar para aislar A-B
  //    (corte mínimo con las reclamadas incortables). MENOR ⇒ mejor para Cut.
  // La heurística mezcla ambas distancias: el MARGEN (cutDistance − shortDistance)
  // manda y la propia distancia desempata, de modo que Short tira a CONECTAR y Cut
  // a CORTAR. Es una distancia de conexión real, no movilidad.
  //
  // Magnitud ACOTADA muy por dentro de (−WIN, +WIN): así una posición todavía no
  // resuelta (pérdida/victoria más allá del horizonte de búsqueda) puntúa siempre
  // MEJOR que alcanzar el terminal contrario dentro del horizonte. Eso empuja a la
  // IA a BLOQUEAR la amenaza inmediata (retrasar la derrota) y a COMPLETAR su
  // conexión cuanto antes (el terminal propio ±WIN supera a cualquier no-terminal).
  evaluate(s, player){
    // resoluciones definitivas
    if (connected(s, st => st === ST_SHORT)){
      return player === 0 ? 1e6 : -1e6;       // Short ya conectó: gana Short
    }
    if (!connected(s, st => st === ST_SHORT || st === ST_FREE)){
      return player === 1 ? 1e6 : -1e6;       // imposible conectar: gana Cut
    }
    const d = shortDistance(s);               // finito aquí (hay ruta libre+reclamada): >= 1
    let c = cutDistance(s);                    // finito aquí (>=1; ∞ si Short ya es incortable)
    if (c > 1e8) c = 1000;                     // cadena incortable: tope alto pero acotado
    // Base orientada a Short, acotada en ~[-1e4, 1e4]: el margen (c-d) domina,
    // la distancia d desempata (menor d, mejor para Short).
    const base = (c - d) * 500 + (40 - d);
    return player === 0 ? base : -base;
  },

  key(s){
    let str = s.graph + '|';
    for (let i = 0; i < s.edges.length; i++) str += s.edges[i].st === ST_FREE ? '.' : s.edges[i].st;
    return str + '|' + s.turn;
  },

  // Tableros pensados para que la IA busque por profundidad (no exacto global).
  exactOK(s){ return false; },

  viewBox(s){
    const g = cfg(s.graph).graph;
    let maxX = 0, maxY = 0;
    for (const n of g.nodes){ if (n.x > maxX) maxX = n.x; if (n.y > maxY) maxY = n.y; }
    return '0 0 ' + (maxX + 40) + ' ' + (maxY + 40);
  },

  render(svg, s, ctx){
    const g = cfg(s.graph).graph;
    const P = g.nodes;
    const NR = 16;  // radio de nodo

    // --- aristas ---
    for (let i = 0; i < s.edges.length; i++){
      const e = s.edges[i];
      const a = P[e.u], b = P[e.v];
      let cls = 'edge free';
      if (e.st === ST_SHORT) cls = 'edge short';
      else if (e.st === ST_CUT) cls = 'edge cut';
      el('line', { class: cls, x1: a.x, y1: a.y, x2: b.x, y2: b.y }, svg);
    }

    // --- fantasmas: aristas libres clicables del jugador en turno ---
    if (ctx.interactive){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const e = s.edges[m.e];
        const a = P[e.u], b = P[e.v];
        if (ctx.hint && ctx.hint.e === m.e)
          el('line', { class: 'ehalo', x1: a.x, y1: a.y, x2: b.x, y2: b.y }, svg);
        const gh = el('line', { class: 'eghost g' + cur, x1: a.x, y1: a.y, x2: b.x, y2: b.y }, svg);
        gh.addEventListener('click', () => ctx.onMove({ e: m.e }));
      }
    }

    // --- nodos ---
    for (let i = 0; i < P.length; i++){
      const isAB = (i === s.A || i === s.B);
      el('circle', { class: 'node' + (isAB ? ' term' : ''), cx: P[i].x, cy: P[i].y, r: isAB ? NR + 3 : NR }, svg);
      if (i === s.A) el('text', { class: 'nlabel', x: P[i].x, y: P[i].y + 5, 'text-anchor': 'middle' }, svg).textContent = 'A';
      else if (i === s.B) el('text', { class: 'nlabel', x: P[i].x, y: P[i].y + 5, 'text-anchor': 'middle' }, svg).textContent = 'B';
    }
  },
};
