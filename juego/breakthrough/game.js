// breakthrough/game.js — Juego: Breakthrough (Dan Troyka, 2000).
// Juego partisano de CARRERA: cada bando avanza sus peones hacia la fila del rival.
// Azul (jugador 0) ocupa las dos filas de ARRIBA (r=0,1) y avanza hacia ABAJO (r creciente).
// Rojo (jugador 1) ocupa las dos filas de ABAJO y avanza hacia ARRIBA (r decreciente).
// Un peón avanza 1 casilla en RECTO si está vacía, o 1 en DIAGONAL hacia delante si está
// vacía o tiene un peón RIVAL (la captura solo es diagonal; el recto NUNCA captura).
// GANA quien lleva un peón a la fila final del rival; también gana si deja al rival sin
// jugadas o sin peones. OJO: el ganador NO es siempre el último que movió: manda la META.
// Estado { rows, cols, cells:[-1|0|1...], turn }.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 46;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '5x5', label: '5×5', rows: 5, cols: 5 },
  { key: '6x6', label: '6×6', rows: 6, cols: 6 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

const idx = (s, r, c) => r * s.cols + c;
const other = (p) => p ^ 1;

// Dirección de avance de cada bando: Azul(0) baja (+1), Rojo(1) sube (-1).
const dir = (p) => (p === 0 ? 1 : -1);
// Fila-meta de cada bando (a la que debe llegar para ganar).
const goalRow = (s, p) => (p === 0 ? s.rows - 1 : 0);

function inBounds(s, r, c){ return r >= 0 && r < s.rows && c >= 0 && c < s.cols; }

// ¿Hay un peón del bando `p` en su fila-meta?
function reachedGoal(s, p){
  const gr = goalRow(s, p);
  for (let c = 0; c < s.cols; c++) if (s.cells[idx(s, gr, c)] === p) return true;
  return false;
}

// Cuenta los peones de un bando.
function countPawns(s, p){
  let n = 0;
  for (let i = 0; i < s.cells.length; i++) if (s.cells[i] === p) n++;
  return n;
}

// Jugadas legales del bando `p` (sin mirar de quién es el turno).
function movesFor(s, p){
  const moves = [];
  const d = dir(p);
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
    if (s.cells[idx(s, r, c)] !== p) continue;
    const r2 = r + d;
    if (r2 < 0 || r2 >= s.rows) continue;
    // recto: solo si la casilla de delante está vacía (no captura).
    if (s.cells[idx(s, r2, c)] === -1) moves.push({ from: [r, c], to: [r2, c] });
    // diagonales: vacías o con peón rival.
    for (const dc of [-1, 1]){
      const c2 = c + dc;
      if (!inBounds(s, r2, c2)) continue;
      const t = s.cells[idx(s, r2, c2)];
      if (t === -1 || t === other(p)) moves.push({ from: [r, c], to: [r2, c2] });
    }
  }
  return moves;
}

export const game = {
  meta: {
    nombre: 'Breakthrough',
    slug: 'breakthrough',
    subtitulo: 'Rompe la línea — la carrera de peones de Dan Troyka',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '↓ avanza hacia abajo' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '↑ avanza hacia arriba' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      '<b class="az">Azul</b> sale de las dos filas de <b>arriba</b> y corre hacia <b>abajo</b>; ' +
      '<b class="ro">Rojo</b> de las dos de <b>abajo</b> y corre hacia <b>arriba</b>. ' +
      'Un peón avanza una casilla: <b>recto</b> si está vacía, o <b>en diagonal</b> (única forma de capturar al rival). ' +
      '<b>Gana quien lleva un peón a la fila del fondo enemiga.</b>',
    help:
      '<p>Cada bando tiene dos filas de peones en su lado. En tu turno mueves un peón <b>una casilla hacia delante</b>: ' +
      'de frente si la casilla está libre, o en <b>diagonal</b> si está libre o si hay un peón rival al que comer. ' +
      'Cuidado: <b>solo se captura en diagonal</b>; de frente nunca se come ni se empuja. ' +
      '<b>Gana el primero que cuela un peón en la fila del fondo del rival</b> (también ganas si dejas al otro sin peones o sin jugadas).</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Breakthrough es un <b>juego partisano</b> de <i>carrera</i>: no se trata de ' +
      'capturar por capturar, sino de abrir un hueco por donde pasar antes que el contrario. El tablero es grande para resolverlo ' +
      'de forma exacta, así que la máquina busca a varias jugadas de profundidad y «💡 Pista» te sugiere su mejor avance.</p>',
    footer: 'Breakthrough, de Dan Troyka (2000), premio de diseño de juegos de tablero · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    const cells = new Array(c.rows * c.cols).fill(-1);
    const cols = c.cols;
    // Azul (0) en las dos filas de arriba; Rojo (1) en las dos de abajo.
    for (let col = 0; col < cols; col++){
      cells[0 * cols + col] = 0;
      cells[1 * cols + col] = 0;
      cells[(c.rows - 1) * cols + col] = 1;
      cells[(c.rows - 2) * cols + col] = 1;
    }
    return { rows: c.rows, cols: c.cols, cells, turn: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    // Si ya hay un peón en una fila-meta, la partida terminó: no hay jugadas.
    if (reachedGoal(s, 0) || reachedGoal(s, 1)) return [];
    return movesFor(s, s.turn);
  },

  apply(s, m){
    const cells = s.cells.slice();
    const [fr, fc] = m.from, [tr, tc] = m.to;
    cells[idx(s, tr, tc)] = s.turn;   // capta al rival si lo hubiera
    cells[idx(s, fr, fc)] = -1;
    return { rows: s.rows, cols: s.cols, cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){
    if (reachedGoal(s, 0) || reachedGoal(s, 1)) return true;          // META alcanzada
    if (countPawns(s, 0) === 0 || countPawns(s, 1) === 0) return true; // bando aniquilado
    return movesFor(s, s.turn).length === 0;                          // sin jugadas
  },

  // La META manda: si Azul llegó a su fila-meta gana Azul; si Rojo a la suya gana Rojo.
  // Si no hay meta, gana el rival del jugador en turno (este no puede mover / quedó sin peones).
  winner(s){
    if (reachedGoal(s, 0)) return 0;
    if (reachedGoal(s, 1)) return 1;
    if (countPawns(s, 0) === 0) return 1;
    if (countPawns(s, 1) === 0) return 0;
    if (movesFor(s, s.turn).length === 0) return s.turn ^ 1;
    return null;
  },

  // Heurística desde la óptica de `player`: lo cerca que está su peón más adelantado
  // de la meta menos lo mismo para el rival, más una ventaja por material.
  evaluate(s, player){
    const opp = other(player);
    // Si ya hay meta o aniquilación, devuelve un valor extremo coherente.
    if (this.isTerminal(s)){
      const w = this.winner(s);
      if (w === player) return 1e6;
      if (w === opp) return -1e6;
    }
    const adv = (p) => {
      // distancia recorrida del peón más adelantado del bando p (0..rows-1).
      let best = -1;
      for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
        if (s.cells[idx(s, r, c)] !== p) continue;
        const prog = (p === 0) ? r : (s.rows - 1 - r);   // casillas avanzadas hacia la meta
        if (prog > best) best = prog;
      }
      return best;
    };
    const myAdv = adv(player), opAdv = adv(opp);
    const myMat = countPawns(s, player), opMat = countPawns(s, opp);
    // El avance pesa más que el material: es una carrera.
    return (myAdv - opAdv) * 10 + (myMat - opMat) * 3;
  },

  key(s){ return s.cells.join(',') + s.turn; },

  // Tablero grande: la IA busca por profundidad, no se resuelve exacto.
  exactOK(s){ return false; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    const cur = s.turn;
    const moves = ctx.interactive ? this.legalMoves(s) : [];

    // Estado de selección de pieza (clic en peón propio -> resalta destinos).
    // Se guarda en el propio nodo svg para sobrevivir entre renders del mismo turno.
    const selKey = '_btSel';
    let sel = svg[selKey] || null;
    // Si la selección ya no corresponde a un peón propio movible, descártala.
    if (sel){
      const ok = moves.some(m => m.from[0] === sel[0] && m.from[1] === sel[1]);
      if (!ok) sel = null;
    }
    svg[selKey] = sel;

    // 1) casillas, marcando las filas-meta de cada bando.
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      let cls = 'cell';
      if (r === goalRow(s, 0)) cls += ' goal0';   // fila a la que llega Azul (abajo)
      if (r === goalRow(s, 1)) cls += ' goal1';   // fila a la que llega Rojo (arriba)
      el('rect', { class: cls, x: cellX(c) + 1.5, y: cellY(r) + 1.5, width: CELL - 3, height: CELL - 3, rx: 5 }, svg);
    }

    // 2) peones.
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      const v = s.cells[idx(s, r, c)];
      if (v === -1) continue;
      const isSel = sel && sel[0] === r && sel[1] === c;
      if (isSel)
        el('circle', { class: 'selring', cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.40 }, svg);
      el('circle', { class: 'piece' + v, cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.30 }, svg);
    }

    if (!ctx.interactive) return;

    // 3) fantasmas-pista (sugerencia de la máquina): resalta origen y destino.
    if (ctx.hint){
      const [hr, hc] = ctx.hint.from, [tr, tc] = ctx.hint.to;
      el('rect', { class: 'halo', x: cellX(hc) + 4, y: cellY(hr) + 4, width: CELL - 8, height: CELL - 8, rx: 7 }, svg);
      el('rect', { class: 'halo', x: cellX(tc) + 4, y: cellY(tr) + 4, width: CELL - 8, height: CELL - 8, rx: 7 }, svg);
    }

    // 4) si hay un peón seleccionado, pinta sus destinos legales como fantasmas clicables.
    if (sel){
      const dests = moves.filter(m => m.from[0] === sel[0] && m.from[1] === sel[1]);
      for (const m of dests){
        const [tr, tc] = m.to;
        const captures = s.cells[idx(s, tr, tc)] === other(cur);
        const g = el('circle', {
          class: 'ghost g' + cur + (captures ? ' capture' : ''),
          cx: cellX(tc) + CELL / 2, cy: cellY(tr) + CELL / 2, r: CELL * 0.30,
        }, svg);
        g.addEventListener('click', () => { svg[selKey] = null; ctx.onMove(m); });
      }
    }

    // 5) peones propios movibles: clic para seleccionar (o cambiar selección).
    //    Se pintan como zonas clicables transparentes sobre cada peón con jugada.
    const movable = {};
    for (const m of moves) movable[m.from[0] + ',' + m.from[1]] = true;
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      if (!movable[r + ',' + c]) continue;
      const isSel = sel && sel[0] === r && sel[1] === c;
      const hit = el('circle', {
        class: 'pickable' + (isSel ? ' picked' : ''),
        cx: cellX(c) + CELL / 2, cy: cellY(r) + CELL / 2, r: CELL * 0.34,
      }, svg);
      hit.addEventListener('click', () => {
        svg[selKey] = (isSel ? null : [r, c]);
        // Re-render llamando a onMove no procede; forzamos repintado disparando un render
        // a través del propio motor: como no hay API de re-render, re-dibujamos aquí.
        rerender();
      });
    }

    // Re-dibuja el tablero en sitio (sin tocar el estado del juego), para reflejar la
    // selección. Reaprovecha este mismo render con el ctx actual.
    function rerender(){
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      game.render(svg, s, ctx);
    }
  },
};
