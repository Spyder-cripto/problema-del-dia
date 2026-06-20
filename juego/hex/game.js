// hex/game.js — Juego de conexión: Hex (Piet Hein, 1942 / John Nash, 1948).
// Tablero ROMBO de n×n celdas hexagonales.
//   Azul (jugador 0) conecta los lados SUPERIOR e INFERIOR (filas 0 y n-1).
//   Rojo (jugador 1) conecta los lados IZQUIERDO y DERECHO (columnas 0 y n-1).
// Por turnos colocas una piedra de tu color en una celda vacía; gana quien une
// sus dos lados con una cadena de piedras propias. En Hex NUNCA hay empate.
//
// Estado { n, cells:[-1|0|1...], turn }   (-1 = vacía; índice = r*n + c).
//
// VICTORIA por CONECTIVIDAD (BFS con nodos virtuales por lado).
// La IA del motor usa evaluate(), implementado como DISTANCIA DE CONEXIÓN
// (BFS 0-1): el nº mínimo de casillas vacías que el jugador necesita para
// completar su cadena (piedra propia = 0, vacía = 1, rival = bloqueada).
import { el } from '../_engine/svg.js';

// --- geometría del rombo de hexágonos (apuntando hacia arriba) ---
const PAD = 30, CW = 34, RH = 34 * 0.86;   // CW: ancho de celda; RH: alto de fila (solape)
const cellCX = (r, c) => PAD + c * CW + r * CW * 0.5 + CW * 0.5;
const cellCY = (r)    => PAD + r * RH + CW * 0.5;

const CONFIGS = [
  { key: '7x7',   label: '7×7',   n: 7  },
  { key: '9x9',   label: '9×9',   n: 9  },
  { key: '11x11', label: '11×11', n: 11 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

const idx = (n, r, c) => r * n + c;

// Vecinos hex de (r,c): (r-1,c),(r+1,c),(r,c-1),(r,c+1),(r-1,c+1),(r+1,c-1).
const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, 1], [1, -1]];
function neighbors(n, r, c){
  const out = [];
  for (let i = 0; i < DIRS.length; i++){
    const rr = r + DIRS[i][0], cc = c + DIRS[i][1];
    if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push([rr, cc]);
  }
  return out;
}

// ¿Ha conectado el jugador `p` sus dos lados? BFS por piedras de `p`.
// p=0 (Azul): de fila 0 a fila n-1.  p=1 (Rojo): de col 0 a col n-1.
function connected(s, p){
  const n = s.n, cells = s.cells;
  const seen = new Array(n * n).fill(false);
  const stack = [];
  // Siembra: piedras de `p` en el lado de "inicio".
  for (let i = 0; i < n; i++){
    let r, c;
    if (p === 0){ r = 0; c = i; }   // fila superior
    else        { r = i; c = 0; }   // columna izquierda
    const k = idx(n, r, c);
    if (cells[k] === p && !seen[k]){ seen[k] = true; stack.push([r, c]); }
  }
  while (stack.length){
    const [r, c] = stack.pop();
    if (p === 0 && r === n - 1) return true;   // alcanzó fila inferior
    if (p === 1 && c === n - 1) return true;   // alcanzó columna derecha
    const ns = neighbors(n, r, c);
    for (let i = 0; i < ns.length; i++){
      const rr = ns[i][0], cc = ns[i][1], k = idx(n, rr, cc);
      if (!seen[k] && cells[k] === p){ seen[k] = true; stack.push([rr, cc]); }
    }
  }
  return false;
}

// Distancia de conexión 0-1 (BFS con deque) para el jugador `p`.
// Coste por celda destino: piedra propia = 0, vacía = 1, rival = ∞ (bloqueada).
// Devuelve el nº mínimo de celdas vacías a rellenar para unir ambos lados;
// Infinity si es imposible.
function connDist(s, p){
  const n = s.n, cells = s.cells, opp = p ^ 1;
  const INF = Infinity;
  const dist = new Array(n * n).fill(INF);
  // deque sencillo con dos pilas (suficiente para 0-1 BFS por niveles).
  let cur = [], nxt = [];

  // Coste de "entrar" en (r,c): si es del rival, no se puede.
  const cost = (k) => cells[k] === opp ? INF : (cells[k] === p ? 0 : 1);

  // Siembra el lado de inicio: el coste de cada celda inicial es su propio coste.
  for (let i = 0; i < n; i++){
    let r, c;
    if (p === 0){ r = 0; c = i; } else { r = i; c = 0; }
    const k = idx(n, r, c), w = cost(k);
    if (w === INF) continue;
    if (w < dist[k]){ dist[k] = w; (w === 0 ? cur : nxt).push([r, c]); }
  }

  let best = INF;
  // 0-1 BFS: procesamos la "capa 0" (cur) primero; las aristas de peso 1 van a `nxt`.
  // Iteramos por capas crecientes de distancia.
  let layer = 0;
  while (cur.length || nxt.length){
    while (cur.length){
      const [r, c] = cur.pop();
      const k = idx(n, r, c);
      if (dist[k] !== layer) continue;               // entrada obsoleta
      // ¿hemos llegado al lado opuesto?
      if (p === 0 && r === n - 1) best = Math.min(best, dist[k]);
      if (p === 1 && c === n - 1) best = Math.min(best, dist[k]);
      const ns = neighbors(n, r, c);
      for (let i = 0; i < ns.length; i++){
        const rr = ns[i][0], cc = ns[i][1], kk = idx(n, rr, cc);
        const wc = cost(kk);
        if (wc === INF) continue;
        const nd = dist[k] + wc;
        if (nd < dist[kk]){ dist[kk] = nd; (wc === 0 ? cur : nxt).push([rr, cc]); }
      }
    }
    // pasar a la siguiente capa
    cur = nxt; nxt = []; layer++;
  }
  return best;
}

export const game = {
  meta: {
    nombre: 'Hex',
    slug: 'hex',
    subtitulo: 'El juego de conexión de Piet Hein y John Nash',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '↕ une arriba y abajo' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '↔ une izquierda y derecha' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      '<b class="az">Azul</b> intenta unir los lados <b>superior e inferior</b>; ' +
      '<b class="ro">Rojo</b>, los lados <b>izquierdo y derecho</b>. ' +
      'Por turnos colocas una piedra en una celda vacía. ' +
      '<b>Gana quien une sus dos lados con una cadena propia.</b> En Hex nunca hay empate.',
    help:
      '<p>El tablero es un rombo de celdas hexagonales. Cada celda toca a seis vecinas. ' +
      '<b style="color:var(--azul)">Azul</b> quiere una cadena continua de piedras azules que vaya del borde ' +
      '<b>de arriba</b> al <b>de abajo</b>; <b style="color:var(--rojo)">Rojo</b> quiere unir el borde ' +
      '<b>izquierdo</b> con el <b>derecho</b>. Colocáis una piedra por turno en cualquier celda libre.</p>' +
      '<p>Un hecho precioso: <b>en Hex es imposible empatar</b>. Cuando el tablero se llena, uno de los dos ' +
      'colores ha conectado por fuerza sus lados (lo demostró John Nash con un argumento topológico). Por eso ' +
      'no hay tablas, solo ganador. El primer jugador tiene ventaja, así que en partidas serias se usa la ' +
      '<i>regla del intercambio</i> (swap).</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">«💡 Pista» y «⚖️ ¿Quién gana?» se apoyan en la búsqueda de la ' +
      'máquina: como el tablero es grande, son una estimación por profundidad, no un veredicto exacto.</p>',
    footer: 'Hex, inventado por Piet Hein (1942) y redescubierto por John Nash (1948) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { n: c.n, cells: new Array(c.n * c.n).fill(-1), turn: 0 };
  },

  current(s){ return s.turn; },

  // Celdas vacías. Si ya hay ganador, no hay jugadas (posición terminal).
  // Las jugadas se ORDENAN (las pegadas a piedras y las centrales, primero): el orden
  // no afecta al render —los fantasmas se posicionan por su índice— pero mejora mucho
  // la poda alfa-beta de la IA (examina antes las jugadas tácticamente relevantes).
  legalMoves(s){
    if (this.winner(s) !== null) return [];
    const n = s.n, cells = s.cells, cen = (n - 1) / 2, scored = [];
    for (let i = 0; i < cells.length; i++){
      if (cells[i] !== -1) continue;
      const r = (i / n) | 0, c = i % n;
      // adyacencia a CUALQUIER piedra (las 6 direcciones hex) + cercanía al centro.
      let adj = 0;
      const ns = neighbors(n, r, c);
      for (let k = 0; k < ns.length; k++) if (cells[idx(n, ns[k][0], ns[k][1])] !== -1) adj++;
      scored.push([i, adj * 100 - (Math.abs(r - cen) + Math.abs(c - cen))]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    const moves = new Array(scored.length);
    for (let i = 0; i < scored.length; i++) moves[i] = { i: scored[i][0] };
    return moves;
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[m.i] = s.turn;
    return { n: s.n, cells, turn: s.turn ^ 1 };
  },

  // Terminal si hay ganador, o si el tablero está lleno (en Hex esto implica ganador).
  isTerminal(s){
    if (this.winner(s) !== null) return true;
    for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === -1) return false;
    return true;
  },

  // 0 (Azul) o 1 (Rojo) si ha conectado sus lados; null si nadie aún.
  winner(s){
    if (connected(s, 0)) return 0;
    if (connected(s, 1)) return 1;
    return null;
  },

  // DISTANCIA DE CONEXIÓN: evaluate ≈ dist(rival) − dist(player).
  // Cuanto MENOR sea mi distancia (menos celdas me faltan para unir mis lados), mejor
  // para mí. Se usa un GRADIENTE FUERTE: estar a 1 sola casilla de ganar pesa muchísimo
  // más que estar a 2, y simétricamente para la amenaza del rival, de modo que la IA
  // prioriza completar su conexión y cortar la del adversario.
  evaluate(s, player){
    const w = this.winner(s);
    if (w === player) return 1e6;
    if (w === (player ^ 1)) return -1e6;
    const dMe  = connDist(s, player);
    const dOpp = connDist(s, player ^ 1);
    // Si por algún motivo una distancia fuese infinita (lado bloqueado), acótala.
    const cap = s.n * s.n + 1;
    const me  = isFinite(dMe)  ? dMe  : cap;
    const opp = isFinite(dOpp) ? dOpp : cap;
    // Término dominante: «lo cerca que estoy de ganar» menos «lo cerca que está el rival».
    // (cap − dist) crece al acortar la distancia; ×1000 lo hace mandar sobre desempates.
    // Sumamos (opp − me) como desempate fino entre posiciones de igual cercanía.
    return ((cap - me) - (cap - opp)) * 1000 + (opp - me);
  },

  key(s){ return s.cells.join('') + s.turn; },

  // Tableros grandes: la IA busca por profundidad, no exacto.
  exactOK(s){ return false; },

  viewBox(s){
    const n = s.n;
    const w = PAD * 2 + (n - 1) * CW + (n - 1) * CW * 0.5 + CW;
    const hgt = PAD * 2 + (n - 1) * RH + CW;
    return '0 0 ' + Math.ceil(w) + ' ' + Math.ceil(hgt);
  },

  render(svg, s, ctx){
    const n = s.n, R = CW * 0.5;
    // vértices de un hexágono "apuntando hacia arriba" centrado en (cx,cy).
    const hexPts = (cx, cy) => {
      const pts = [];
      for (let k = 0; k < 6; k++){
        const ang = Math.PI / 180 * (60 * k - 90);   // -90 => primer vértice arriba
        pts.push((cx + R * Math.cos(ang)).toFixed(2) + ',' + (cy + R * Math.sin(ang)).toFixed(2));
      }
      return pts.join(' ');
    };

    // Bordes de color por lado: trazamos rótulos/marcos finos en arriba/abajo (azul) e izq/der (rojo).
    // Marco superior e inferior (azul).
    for (let c = 0; c < n; c++){
      const top = hexPts(cellCX(0, c), cellCY(0));
      const bot = hexPts(cellCX(n - 1, c), cellCY(n - 1));
      el('polygon', { class: 'edge edge-az', points: top }, svg);
      el('polygon', { class: 'edge edge-az', points: bot }, svg);
    }
    // Marco izquierdo y derecho (rojo).
    for (let r = 0; r < n; r++){
      const lft = hexPts(cellCX(r, 0), cellCY(r));
      const rgt = hexPts(cellCX(r, n - 1), cellCY(r));
      el('polygon', { class: 'edge edge-ro', points: lft }, svg);
      el('polygon', { class: 'edge edge-ro', points: rgt }, svg);
    }

    // Celdas (hexágonos) + piedras.
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){
      const cx = cellCX(r, c), cy = cellCY(r), k = idx(n, r, c);
      el('polygon', { class: 'hexcell', points: hexPts(cx, cy) }, svg);
      const v = s.cells[k];
      if (v === 0 || v === 1)
        el('circle', { class: 'piece' + v, cx, cy, r: R * 0.62 }, svg);
    }

    // Jugadas legales (fantasmas) del jugador en turno.
    if (ctx.interactive){
      const cur = s.turn;
      const moves = this.legalMoves(s);
      for (const m of moves){
        const r = (m.i / n) | 0, c = m.i % n;
        const cx = cellCX(r, c), cy = cellCY(r);
        if (ctx.hint && ctx.hint.i === m.i)
          el('circle', { class: 'halo', cx, cy, r: R * 0.78 }, svg);
        const g = el('circle', { class: 'ghost g' + cur, cx, cy, r: R * 0.62 }, svg);
        g.addEventListener('click', () => ctx.onMove({ i: m.i }));
      }
    }
  },
};
