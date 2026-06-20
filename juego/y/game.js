// y/game.js — El juego de Y (Claude Shannon / Craige Schensted & Charles Titus).
// Juego de CONEXIÓN sobre un tablero triangular de celdas hexagonales. Ambos
// jugadores comparten el mismo objetivo: formar una cadena de piedras propias
// que toque los TRES lados del triángulo. Es una generalización de Hex y, por
// el «teorema de Y», NUNCA termina en empate: con el tablero lleno hay siempre
// exactamente un ganador.
//
// Estado (inmutable, JSON-serializable):
//   { n, cells:[ -1 | 0 | 1 ... ], turn }
//   cells es la fila aplanada; la fila r (0..n-1) tiene r+1 celdas (c = 0..r).
//   índice de (r,c) = r*(r+1)/2 + c.   -1 = vacía, 0/1 = piedra del jugador.
//
// Victoria por CONECTIVIDAD (BFS/union-find sobre componentes).
// evaluate() = DISTANCIA DE CONEXIÓN vía BFS 0-1: las piedras propias cuestan 0,
// las vacías 1, las del rival son muros. Es la heurística que hace que la IA
// genérica (negamax + alfa-beta del motor) intente CONECTAR, no moverse al azar.
import { el } from '../_engine/svg.js';

const INF = 1e9;
// Bono de posición ganada/perdida en evaluate(): grande, pero MENOR que el
// WIN=1e6 que el motor (ai.js) da a un estado terminal real, de modo que un
// remate auténtico (jugada que conecta y termina) siempre gana a una conexión
// meramente estimada en una hoja de la búsqueda.
const WINBONUS = 1e5;

const CONFIGS = [
  { key: '7', label: 'Lado 7', n: 7 },
  { key: '9', label: 'Lado 9', n: 9 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// --- geometría del triángulo ---------------------------------------------
const rowStart = (r) => (r * (r + 1)) / 2;        // primer índice de la fila r
const idx = (r, c) => rowStart(r) + c;            // índice aplanado de (r,c)
const total = (n) => (n * (n + 1)) / 2;           // nº de celdas del tablero

// (r,c) -> {r,c} a partir del índice aplanado.
function rc(i){
  let r = 0;
  while (rowStart(r + 1) <= i) r++;
  return { r, c: i - rowStart(r) };
}

// Vecinos de (r,c) dentro de un triángulo de lado n.
function neighbors(n, r, c){
  const out = [];
  const cand = [
    [r, c - 1], [r, c + 1],
    [r - 1, c - 1], [r - 1, c],
    [r + 1, c], [r + 1, c + 1],
  ];
  for (const [rr, cc] of cand){
    if (rr < 0 || rr >= n) continue;
    if (cc < 0 || cc > rr) continue;
    out.push(idx(rr, cc));
  }
  return out;
}

// ¿La celda (r,c) toca cada uno de los tres lados? Devuelve [base, izq, der].
function sidesOf(n, r, c){
  return [r === n - 1, c === 0, c === r];   // base = última fila; izq = c==0; der = c==r
}

// --- conectividad: ¿el jugador p toca los 3 lados con UNA sola componente? --
// Recorre componentes de piedras de p (BFS) y devuelve true si alguna toca los 3 lados.
function playerConnects(s, p){
  const n = s.n, cells = s.cells, N = cells.length;
  const seen = new Array(N).fill(false);
  for (let i = 0; i < N; i++){
    if (cells[i] !== p || seen[i]) continue;
    // BFS de la componente
    const stack = [i];
    seen[i] = true;
    let touch = [false, false, false];
    while (stack.length){
      const cur = stack.pop();
      const { r, c } = rc(cur);
      const t = sidesOf(n, r, c);
      if (t[0]) touch[0] = true;
      if (t[1]) touch[1] = true;
      if (t[2]) touch[2] = true;
      for (const nb of neighbors(n, r, c)){
        if (!seen[nb] && cells[nb] === p){ seen[nb] = true; stack.push(nb); }
      }
    }
    if (touch[0] && touch[1] && touch[2]) return true;
  }
  return false;
}

// --- distancia de conexión (BFS 0-1) -------------------------------------
// Para el jugador p, calcula la distancia 0-1 desde TODAS sus piedras a cada
// celda alcanzable (propias = coste 0, vacías = coste 1, rivales = muro). El
// «coste a un lado» = mínima distancia entre las celdas de ese lado. Sumando los
// tres lados obtenemos una estimación de cuántas casillas vacías le faltan a p
// para completar su conexión (admisible-ish; basta para guiar a la IA).
function distField(s, p){
  const n = s.n, cells = s.cells, N = cells.length;
  const opp = p ^ 1;
  const dist = new Array(N).fill(INF);
  // deque para 0-1 BFS (peso 0 al frente, peso 1 al fondo)
  const deque = [];
  let head = 0;
  let hasStone = false;
  for (let i = 0; i < N; i++){
    if (cells[i] === p){ dist[i] = 0; deque.push(i); hasStone = true; }
  }
  // Procesa como 0-1 BFS. Como los nodos semilla son todos coste 0, basta una
  // cola normal expandiendo: a vacía suma 1 (al fondo), a propia suma 0 (al frente).
  while (head < deque.length){
    const cur = deque[head++];
    const d = dist[cur];
    const { r, c } = rc(cur);
    for (const nb of neighbors(n, r, c)){
      if (cells[nb] === opp) continue;                 // muro
      const w = cells[nb] === p ? 0 : 1;               // propia 0, vacía 1
      const nd = d + w;
      if (nd < dist[nb]){
        dist[nb] = nd;
        if (w === 0) deque.splice(head, 0, nb);        // al frente (coste 0)
        else deque.push(nb);                           // al fondo (coste 1)
      }
    }
  }
  return { dist, hasStone };
}

// Suma de las tres distancias mínimas del jugador p a base / izquierda / derecha.
function connectionDistance(s, p){
  const n = s.n, cells = s.cells, N = cells.length;
  const { dist, hasStone } = distField(s, p);
  if (!hasStone) return 3 * n;     // sin piedras: estimación neutra y finita
  let dBase = INF, dIzq = INF, dDer = INF;
  for (let i = 0; i < N; i++){
    if (dist[i] >= INF) continue;
    const { r, c } = rc(i);
    if (r === n - 1 && dist[i] < dBase) dBase = dist[i];
    if (c === 0     && dist[i] < dIzq)  dIzq  = dist[i];
    if (c === r     && dist[i] < dDer)  dDer  = dist[i];
  }
  // Si algún lado es inalcanzable (el rival lo aisló), penaliza con un valor grande.
  const cap = (d) => (d >= INF ? 2 * n : d);
  return cap(dBase) + cap(dIzq) + cap(dDer);
}

// --- coordenadas de pintado (triángulo de hexágonos centrado) -------------
const PAD = 22, HX = 30;            // HX = «paso» horizontal entre centros
const HY = HX * 0.9;                // paso vertical entre filas
const RAD = HX * 0.56;              // radio del hexágono

function center(n, r, c){
  // Cada fila r se desplaza media celda a la izquierda por columna que le falta
  // respecto a la última, de modo que el triángulo quede centrado.
  const x = PAD + (HX * (n - 1)) / 2 + (c - r / 2) * HX;
  const y = PAD + r * HY;
  return { x, y };
}

// Puntos de un hexágono «pointy-top» de radio rad centrado en (cx,cy).
function hexPoints(cx, cy, rad){
  const pts = [];
  for (let k = 0; k < 6; k++){
    const a = Math.PI / 180 * (60 * k - 90);
    pts.push((cx + rad * Math.cos(a)).toFixed(2) + ',' + (cy + rad * Math.sin(a)).toFixed(2));
  }
  return pts.join(' ');
}

export const game = {
  meta: {
    nombre: 'Y',
    slug: 'y',
    subtitulo: 'El juego de conexión que nunca empata',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'conecta los 3 lados' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'conecta los 3 lados' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Tablero triangular de celdas hexagonales. Por turnos, <b class="az">Azul</b> y ' +
      '<b class="ro">Rojo</b> colocan una piedra propia en una celda vacía. ' +
      '<b>Gana quien una sus piedras en una sola cadena que toque los tres lados</b> del triángulo.',
    help:
      '<p>El juego de <b>Y</b> es un juego de <b>conexión</b>: los dos jugadores persiguen ' +
      'exactamente la <i>misma</i> meta —enlazar una cadena de piedras propias que toque el ' +
      '<b>lado izquierdo</b>, el <b>derecho</b> y la <b>base</b> a la vez. No se captura ni se mueve: ' +
      'solo se colocan piedras en celdas vacías, una por turno.</p>' +
      '<p>Como en Hex, <b>nunca hay empate</b>: cuando el tablero se llena, el «teorema de Y» garantiza ' +
      'que existe siempre exactamente una cadena ganadora. De hecho, Hex es solo un caso particular de Y ' +
      'jugado en una esquina del triángulo.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Y fue inventado hacia 1953 por <b>Claude Shannon</b> ' +
      'y redescubierto por <b>Craige Schensted</b> y <b>Charles Titus</b>. Usa <b>💡 Pista</b> para ver la ' +
      'jugada que más te acerca a unir los tres lados.</p>',
    footer: 'Y, de Shannon, Schensted &amp; Titus · una generalización de Hex · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { n: c.n, cells: new Array(total(c.n)).fill(-1), turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    // Si la partida ya está decidida, no hay jugadas.
    if (this.isTerminal(s)) return [];
    const moves = [];
    for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === -1) moves.push({ i });
    return moves;
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[m.i] = s.turn;
    return { n: s.n, cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){
    if (playerConnects(s, 0) || playerConnects(s, 1)) return true;
    for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === -1) return false;
    return true;   // tablero lleno (en Y siempre hay ganador)
  },

  winner(s){
    if (playerConnects(s, 0)) return 0;
    if (playerConnects(s, 1)) return 1;
    return null;   // todavía no decidido
  },

  // DISTANCIA DE CONEXIÓN: cuanto menor sea la distancia del jugador, mejor.
  // evaluate alto = bueno para `player`. El bono de posición ya ganada/perdida
  // (±WINBONUS) es GRANDE pero queda POR DEBAJO del WIN=1e6 que el motor asigna a
  // un estado terminal real, para que la IA prefiera SIEMPRE rematar de verdad
  // (jugada que termina la partida) antes que una conexión sólo «vista» en la hoja.
  evaluate(s, player){
    const opp = player ^ 1;
    if (playerConnects(s, player)) return WINBONUS;
    if (playerConnects(s, opp))    return -WINBONUS;
    const dMe  = connectionDistance(s, player);
    const dOpp = connectionDistance(s, opp);
    return dOpp - dMe;
  },

  key(s){ return s.cells.join('') + '|' + s.turn; },

  // Tableros demasiado grandes para resolver exacto: la IA busca por profundidad.
  exactOK(){ return false; },

  viewBox(s){
    const n = s.n;
    const w = PAD * 2 + HX * (n - 1) + HX;          // ancho útil + margen lateral
    const h = PAD * 2 + HY * (n - 1) + HX;          // alto útil + margen inferior
    return '0 0 ' + w.toFixed(1) + ' ' + h.toFixed(1);
  },

  render(svg, s, ctx){
    const n = s.n;

    // 1) Marcas de los tres lados (líneas de color que enmarcan el triángulo).
    //    Izquierda y derecha = aristas del triángulo; base = fila inferior.
    const top = center(n, 0, 0);
    const blo = center(n, n - 1, 0);
    const bro = center(n, n - 1, n - 1);
    const frame = (x1, y1, x2, y2, cls) =>
      el('line', { class: cls, x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2) }, svg);
    frame(top.x, top.y, blo.x, blo.y, 'side side-l');   // lado izquierdo
    frame(top.x, top.y, bro.x, bro.y, 'side side-r');   // lado derecho
    frame(blo.x, blo.y, bro.x, bro.y, 'side side-b');   // base

    // 2) Celdas (hexágonos) y piedras.
    for (let r = 0; r < n; r++){
      for (let c = 0; c <= r; c++){
        const { x, y } = center(n, r, c);
        el('polygon', { class: 'hex', points: hexPoints(x, y, RAD) }, svg);
        const v = s.cells[idx(r, c)];
        if (v === 0 || v === 1)
          el('circle', { class: 'piece' + v, cx: x.toFixed(2), cy: y.toFixed(2), r: (RAD * 0.62).toFixed(2) }, svg);
      }
    }

    // 3) Jugadas legales como fantasmas clicables del jugador en turno.
    if (ctx.interactive){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const { r, c } = rc(m.i);
        const { x, y } = center(n, r, c);
        if (ctx.hint && ctx.hint.i === m.i)
          el('circle', { class: 'halo', cx: x.toFixed(2), cy: y.toFixed(2), r: (RAD * 0.78).toFixed(2) }, svg);
        const g = el('circle', { class: 'ghost g' + cur, cx: x.toFixed(2), cy: y.toFixed(2), r: (RAD * 0.62).toFixed(2) }, svg);
        g.addEventListener('click', () => ctx.onMove({ i: m.i }));
      }
    }
  },
};
