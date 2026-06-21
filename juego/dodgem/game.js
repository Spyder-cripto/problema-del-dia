// dodgem/game.js — Juego: Dodgem (Colin Vout / Berlekamp-Conway-Guy, «Winning Ways»).
// Tablero n×n. Azul (jugador 0) sale por la DERECHA: empieza en la columna izquierda
// (filas 0..n−2) y avanza a la derecha. Rojo (jugador 1) sale por ARRIBA: empieza en la
// fila de abajo (cols 1..n−1) y avanza hacia arriba. La esquina inferior-izquierda queda
// libre. Cada coche mueve UNA casilla: hacia delante (a su salida) o a un lado, NUNCA
// hacia atrás, y solo a una casilla vacía. Si el avance se sale por su borde de salida,
// el coche ABANDONA el tablero.
//   GANA quien saca TODOS sus coches, o quien deja al rival sin jugada (bloqueado pierde).
//
// Encaje con el motor: el movimiento lateral permite ciclos infinitos, así que el estado
// lleva un CONTADOR y un TOPE de jugadas para garantizar terminación. CLAVE (corregido tras
// auditoría): el motor asume en TODO terminal que «pierde quien mueve» (negamax = -(WIN-ply),
// es decir gana el último que movió), así que el terminal-por-tope DEBE resolverse igual →
// winner = other(turn). Si en su lugar se desempatara por material/distancia, podría declarar
// ganador al jugador en turno y la IA malvaloraría el final (llegaba a tirar partidas ganadas
// al acercarse al tope, que en Dodgem se alcanza ~15% en IA-vs-IA por baraje lateral).
// Un final por tope es de hecho unas tablas; resolverlo como «último que movió» lo hace
// coherente con la negamax. (Tablas reales = futura tarea de motor.)
import { el } from '../_engine/svg.js';

const PAD = 24, CELL = 46;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '3', label: '3×3 (clásico)', n: 3 },
  { key: '4', label: '4×4', n: 4 },
  { key: '5', label: '5×5', n: 5 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

const other = (p) => p ^ 1;
const idx = (s, r, c) => r * s.cols + c;
const inB = (s, r, c) => r >= 0 && r < s.rows && c >= 0 && c < s.cols;
const carsOf = (s, p) => { const out = []; for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) if (s.cells[idx(s, r, c)] === p) out.push([r, c]); return out; };
const empty = (s, r, c) => s.cells[idx(s, r, c)] === -1;

// Jugadas de un coche del bando `p` en [r,c]. Azul→derecha, Rojo→arriba. Lados sí, atrás no.
function carMoves(s, p, r, c){
  const out = [];
  if (p === 0){                                   // Azul: delante=derecha, lados=arriba/abajo
    if (c + 1 === s.cols) out.push({ from: [r, c], exit: true });
    else if (empty(s, r, c + 1)) out.push({ from: [r, c], to: [r, c + 1] });
    if (r - 1 >= 0 && empty(s, r - 1, c)) out.push({ from: [r, c], to: [r - 1, c] });
    if (r + 1 < s.rows && empty(s, r + 1, c)) out.push({ from: [r, c], to: [r + 1, c] });
  } else {                                         // Rojo: delante=arriba, lados=izq/der
    if (r - 1 < 0) out.push({ from: [r, c], exit: true });
    else if (empty(s, r - 1, c)) out.push({ from: [r, c], to: [r - 1, c] });
    if (c - 1 >= 0 && empty(s, r, c - 1)) out.push({ from: [r, c], to: [r, c - 1] });
    if (c + 1 < s.cols && empty(s, r, c + 1)) out.push({ from: [r, c], to: [r, c + 1] });
  }
  return out;
}
function movesFor(s, p){
  const out = [];
  for (const [r, c] of carsOf(s, p)) for (const m of carMoves(s, p, r, c)) out.push(m);
  return out;
}

// Distancia total que les falta a los coches del bando p para salir (coches fuera = 0).
function remaining(s, p){
  let d = 0;
  for (const [r, c] of carsOf(s, p)) d += (p === 0 ? s.cols - c : r + 1);
  return d;
}

export const game = {
  meta: {
    nombre: 'Dodgem',
    slug: 'dodgem',
    subtitulo: 'Cruza el tablero — los cochecitos de Conway',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '▶ sale por la derecha' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '▲ sale por arriba' },
    ],
    aiPlayer: 1,
    legend:
      '<b class="az">Azul</b> empieza a la izquierda y corre a la <b>derecha</b>; ' +
      '<b class="ro">Rojo</b> empieza abajo y corre hacia <b>arriba</b>. ' +
      'Cada coche avanza una casilla hacia su salida o a un lado, <b>nunca hacia atrás</b>. ' +
      '<b>Gana quien saca todos sus coches</b> (o deja al rival sin jugada).',
    help:
      '<p>Tienes <b>n−1 coches</b>. En tu turno mueves uno <b>una casilla</b>: hacia tu salida ' +
      '(Azul a la derecha, Rojo hacia arriba) o a un lado, siempre a una casilla vacía y <b>jamás hacia atrás</b>. ' +
      'Cuando un coche avanza más allá de su borde de salida, <b>abandona el tablero</b>.</p>' +
      '<p><b>Ganas si sacas todos tus coches</b> del tablero, o si dejas a tu rival <b>sin ninguna jugada legal</b>. ' +
      'El truco es doble: correr hacia tu salida y, de paso, <b>atravesarte</b> en el camino del contrario.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Dodgem lo inventó Colin Vout y aparece en <i>Winning Ways</i> de Berlekamp, Conway y Guy. ' +
      'El 3×3 es el clásico. Como los coches pueden moverse de lado sin avanzar, si la partida se eterniza ' +
      'se decide por <b>quién va más adelantado</b>. «💡 Pista» te sugiere la jugada que la máquina cree mejor.</p>',
    footer: 'Dodgem, de Colin Vout, en «Winning Ways» (Berlekamp, Conway &amp; Guy) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const n = cfg(key).n;
    const cells = new Array(n * n).fill(-1);
    for (let r = 0; r < n - 1; r++) cells[r * n + 0] = 0;       // Azul: columna izda, filas 0..n−2
    for (let c = 1; c < n; c++) cells[(n - 1) * n + c] = 1;     // Rojo: fila de abajo, cols 1..n−1
    return { rows: n, cols: n, cells, exited: [0, 0], turn: 0, moves: 0, cap: n * n * 12 };
  },

  current(s){ return s.turn; },

  legalMoves(s){ return this.isTerminal(s) ? [] : movesFor(s, s.turn); },

  apply(s, m){
    const cells = s.cells.slice();
    const exited = s.exited.slice();
    cells[idx(s, m.from[0], m.from[1])] = -1;
    if (m.exit) exited[s.turn]++;
    else cells[idx(s, m.to[0], m.to[1])] = s.turn;
    return { rows: s.rows, cols: s.cols, cells, exited, turn: other(s.turn), moves: s.moves + 1, cap: s.cap };
  },

  isTerminal(s){
    const goal = s.rows - 1;                                    // n−1 coches por bando
    if (s.exited[0] >= goal || s.exited[1] >= goal) return true; // alguien sacó todos
    if (s.moves >= s.cap) return true;                          // tope anticiclos
    return movesFor(s, s.turn).length === 0;                    // bloqueado
  },

  winner(s){
    const goal = s.rows - 1;
    if (s.exited[0] >= goal) return 0;
    if (s.exited[1] >= goal) return 1;
    if (s.moves >= s.cap) return other(s.turn);                // tope = tablas → último que movió (coherente con la negamax)
    if (movesFor(s, s.turn).length === 0) return other(s.turn); // bloqueado pierde
    return null;
  },

  // Heurística desde la óptica de `player`: avance (menos distancia restante), coches
  // fuera y movilidad; restando lo mismo del rival.
  evaluate(s, player){
    const opp = other(player);
    const score = (p) => s.exited[p] * 100 - remaining(s, p) * 5 + movesFor(s, p).length;
    return score(player) - score(opp);
  },

  key(s){ return s.cells.join(',') + '|' + s.exited.join('') + '|' + s.turn + '|' + s.moves; },

  exactOK(s){ return false; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    const cur = s.turn;
    const moves = ctx.interactive ? this.legalMoves(s) : [];

    // Selección de coche (clic en coche propio → resalta sus destinos). Persiste en el svg.
    const selKey = '_ddSel';
    let sel = svg[selKey] || null;
    if (sel && !moves.some(m => m.from[0] === sel[0] && m.from[1] === sel[1])) sel = null;
    svg[selKey] = sel;

    // 1) casillas + flechas tenues de salida en los márgenes.
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++)
      el('rect', { class: 'cell', x: cellX(c) + 1.5, y: cellY(r) + 1.5, width: CELL - 3, height: CELL - 3, rx: 5 }, svg);
    for (let r = 0; r < s.rows - 0; r++){ // flecha de salida de Azul (derecha) por fila
      const t = el('text', { class: 'exitmark az', x: cellX(s.cols) + PAD * 0.45, y: cellY(r) + CELL / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 14 }, svg); t.textContent = '▶';
    }
    for (let c = 0; c < s.cols; c++){ // flecha de salida de Rojo (arriba) por columna
      const t = el('text', { class: 'exitmark ro', x: cellX(c) + CELL / 2, y: PAD * 0.5, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 14 }, svg); t.textContent = '▲';
    }

    // 2) coches con su flecha de dirección.
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      const v = s.cells[idx(s, r, c)];
      if (v === -1) continue;
      const isSel = sel && sel[0] === r && sel[1] === c;
      if (isSel) el('circle', { class: 'selring', cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.40 }, svg);
      el('circle', { class: 'piece' + v, cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.31 }, svg);
      const t = el('text', { class: 'cararrow', x: cellX(c) + CELL / 2, y: cellY(r) + CELL / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': 16, 'pointer-events': 'none' }, svg);
      t.textContent = v === 0 ? '▶' : '▲';
    }

    if (!ctx.interactive) return;

    // 3) pista: resalta origen y destino (o salida) sugeridos.
    if (ctx.hint){
      const [hr, hc] = ctx.hint.from;
      el('rect', { class: 'halo', x: cellX(hc) + 4, y: cellY(hr) + 4, width: CELL - 8, height: CELL - 8, rx: 7 }, svg);
      if (ctx.hint.to){ const [tr, tc] = ctx.hint.to; el('rect', { class: 'halo', x: cellX(tc) + 4, y: cellY(tr) + 4, width: CELL - 8, height: CELL - 8, rx: 7 }, svg); }
    }

    // 4) destinos del coche seleccionado (incluida la SALIDA como flecha en el margen).
    if (sel){
      const dests = moves.filter(m => m.from[0] === sel[0] && m.from[1] === sel[1]);
      for (const m of dests){
        if (m.exit){
          const r = sel[0], c = sel[1];
          let x, y;
          if (cur === 0){ x = cellX(s.cols) + PAD * 0.45; y = cellY(r) + CELL / 2; }
          else { x = cellX(c) + CELL / 2; y = PAD * 0.5; }
          const g = el('circle', { class: 'ghost exitghost g' + cur, cx: x, cy: y, r: 12 }, svg);
          g.addEventListener('click', () => { svg[selKey] = null; ctx.onMove(m); });
        } else {
          const [tr, tc] = m.to;
          const g = el('circle', { class: 'ghost g' + cur, cx: cellX(tc) + CELL / 2, cy: cellY(tr) + CELL / 2, r: CELL * 0.31 }, svg);
          g.addEventListener('click', () => { svg[selKey] = null; ctx.onMove(m); });
        }
      }
    }

    // 5) coches propios movibles: clic para seleccionar.
    const movable = {};
    for (const m of moves) movable[m.from[0] + ',' + m.from[1]] = true;
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      if (!movable[r + ',' + c]) continue;
      const isSel = sel && sel[0] === r && sel[1] === c;
      const hit = el('circle', { class: 'pickable', cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.36 }, svg);
      hit.addEventListener('click', () => { svg[selKey] = isSel ? null : [r, c]; rerender(); });
    }

    function rerender(){ while (svg.firstChild) svg.removeChild(svg.firstChild); game.render(svg, s, ctx); }
  },
};
