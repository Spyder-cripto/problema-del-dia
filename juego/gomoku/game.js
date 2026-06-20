// gomoku/game.js — Juego: Gomoku (cinco en raya, estilo libre).
// Por turnos se coloca una piedra en una intersección vacía. GANA quien alinea
// CINCO (o más) piedras seguidas en horizontal, vertical o diagonal. Si se llena
// el tablero sin cinco, es tablas (se resuelve por el último que movió; raro).
//
// Encaje con el motor: alternancia estricta y «gana el último que movió» → la
// negamax del motor es correcta. El reto es la RAMIFICACIÓN: en un n×n hay n²
// casillas. Para que la IA pueda buscar en profundidad, legalMoves se restringe a
// las casillas VECINAS (distancia ≤1) de alguna piedra ya puesta —en Gomoku jugar
// aislado nunca es bueno— y se ORDENAN por amenaza para que la poda alfa-beta corte.
import { el } from '../_engine/svg.js';

const PAD = 22, CELL = 30;
const X = (c) => PAD + c * CELL;
const Y = (r) => PAD + r * CELL;
const NEED = 5;                                       // piedras en raya para ganar

const CONFIGS = [
  { key: '9', label: '9×9', n: 9 },
  { key: '13', label: '13×13', n: 13 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

const other = (p) => p ^ 1;
const idx = (s, r, c) => r * s.n + c;
const inB = (s, r, c) => r >= 0 && r < s.n && c >= 0 && c < s.n;
const DIRS = [[0,1],[1,0],[1,1],[1,-1]];             // horizontal, vertical, 2 diagonales

// ¿La piedra recién puesta en [r,c] completa una raya de NEED del color que la ocupa?
function fiveThrough(s, r, c){
  const v = s.cells[idx(s, r, c)];
  if (v === -1) return false;
  for (const [dr, dc] of DIRS){
    let cnt = 1;
    for (let k = 1; k < NEED; k++){ const rr = r + dr*k, cc = c + dc*k; if (inB(s, rr, cc) && s.cells[idx(s, rr, cc)] === v) cnt++; else break; }
    for (let k = 1; k < NEED; k++){ const rr = r - dr*k, cc = c - dc*k; if (inB(s, rr, cc) && s.cells[idx(s, rr, cc)] === v) cnt++; else break; }
    if (cnt >= NEED) return true;
  }
  return false;
}

// Casillas candidatas: vacías a distancia ≤1 de alguna piedra; tablero vacío → centro.
function candidates(s){
  let any = false;
  const mark = new Uint8Array(s.n * s.n);
  for (let r = 0; r < s.n; r++) for (let c = 0; c < s.n; c++){
    if (s.cells[idx(s, r, c)] === -1) continue;
    any = true;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++){
      const rr = r + dr, cc = c + dc;
      if (inB(s, rr, cc) && s.cells[idx(s, rr, cc)] === -1) mark[idx(s, rr, cc)] = 1;
    }
  }
  if (!any){ const m = (s.n - 1) >> 1; return [{ r: m, c: m }]; }
  const out = [];
  for (let r = 0; r < s.n; r++) for (let c = 0; c < s.n; c++) if (mark[idx(s, r, c)]) out.push({ r, c });
  return out;
}

// Valor de las «ventanas de 5» para el jugador p (cuántas piedras de p sin rival dentro).
const WIN_W = [0, 1, 12, 120, 1200, 100000];
function lineScore(s, p){
  let score = 0;
  const n = s.n;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){
    for (const [dr, dc] of DIRS){
      const er = r + dr*(NEED-1), ec = c + dc*(NEED-1);
      if (!inB(s, er, ec)) continue;
      let mine = 0, opp = 0;
      for (let k = 0; k < NEED; k++){ const v = s.cells[idx(s, r + dr*k, c + dc*k)]; if (v === p) mine++; else if (v !== -1) opp++; }
      if (opp === 0 && mine > 0) score += WIN_W[mine];
    }
  }
  return score;
}

export const game = {
  meta: {
    nombre: 'Gomoku',
    slug: 'gomoku',
    subtitulo: 'Cinco en raya — alinea cinco piedras antes que el rival',
    players: [
      { nombre: 'Negras', corto: 'Negras', color: 'var(--ink)', desc: 'juegan primero' },
      { nombre: 'Blancas', corto: 'Blancas', color: 'var(--muted)', desc: 'responden' },
    ],
    aiPlayer: 1,
    legend:
      'Por turnos colocáis una piedra en una intersección. ' +
      '<b>Gana quien alinea CINCO seguidas</b> en horizontal, vertical o diagonal. ' +
      'Vigila las amenazas del rival: <b>un cuatro abierto ya no se puede parar</b>.',
    help:
      '<p>Se juega sobre las intersecciones de la rejilla. Por turnos, cada jugador coloca una piedra de su color ' +
      'en una intersección vacía. <b>El primero que consigue cinco piedras suyas en línea</b> —horizontal, vertical o diagonal— gana.</p>' +
      '<p>La clave es crear <b>varias amenazas a la vez</b>: si formas un «tres abierto» (tres seguidas con los dos extremos libres) ' +
      'obligas al rival a taparlo; si formas dos amenazas en un mismo movimiento, ya no podrá con las dos. ' +
      'Y al revés: <b>tapa a tiempo</b> los treses y cuatros del contrario.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Esta versión es de <b>estilo libre</b> (cinco o más, sin las restricciones del Renju). ' +
      'Para poder pensar a fondo, la máquina solo considera jugadas <b>junto a las piedras ya puestas</b> ' +
      '(jugar aislado en Gomoku nunca conviene). «💡 Pista» te sugiere su mejor jugada.</p>',
    footer: 'Gomoku (五目並べ), el cinco en raya clásico de Japón · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const n = cfg(key).n;
    return { n, cells: new Array(n * n).fill(-1), turn: 0, last: null, filled: 0 };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    if (s.last && fiveThrough(s, s.last[0], s.last[1])) return [];   // ya hay cinco → terminal
    if (s.filled >= s.n * s.n) return [];
    const cand = candidates(s);
    // Orden por amenaza (ofensiva del que mueve + defensa del rival) para podar mejor.
    const me = s.turn, op = other(me);
    for (const m of cand){
      const i = idx(s, m.r, m.c);
      s.cells[i] = me; const off = fiveThrough(s, m.r, m.c) ? 1e9 : localScore(s, m.r, m.c, me);
      s.cells[i] = op; const def = fiveThrough(s, m.r, m.c) ? 1e8 : localScore(s, m.r, m.c, op);
      s.cells[i] = -1;
      m._w = off + def;
    }
    cand.sort((a, b) => b._w - a._w);
    return cand.map(m => ({ r: m.r, c: m.c }));
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[idx(s, m.r, m.c)] = s.turn;
    return { n: s.n, cells, turn: other(s.turn), last: [m.r, m.c], filled: s.filled + 1 };
  },

  isTerminal(s){
    if (s.last && fiveThrough(s, s.last[0], s.last[1])) return true;
    if (s.filled >= s.n * s.n) return true;
    return candidates(s).length === 0;
  },

  // Gana el dueño del cinco (= el último que movió). Tablas (lleno sin cinco) → último que movió.
  winner(s){
    if (s.last && fiveThrough(s, s.last[0], s.last[1])) return s.cells[idx(s, s.last[0], s.last[1])];
    if (this.isTerminal(s)) return other(s.turn);   // tablero lleno o atascado sin cinco: desempate
    return null;
  },

  evaluate(s, player){
    return lineScore(s, player) - lineScore(s, other(player));
  },

  key(s){ return s.cells.join('') + s.turn; },

  exactOK(s){ return false; },

  viewBox(s){ return '0 0 ' + (PAD * 2 + (s.n - 1) * CELL) + ' ' + (PAD * 2 + (s.n - 1) * CELL); },

  render(svg, s, ctx){
    const n = s.n;
    // 1) líneas de la rejilla.
    for (let i = 0; i < n; i++){
      el('line', { class: 'gline', x1: X(0), y1: Y(i), x2: X(n - 1), y2: Y(i) }, svg);
      el('line', { class: 'gline', x1: X(i), y1: Y(0), x2: X(i), y2: Y(n - 1) }, svg);
    }
    // 2) piedras.
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++){
      const v = s.cells[idx(s, r, c)];
      if (v === -1) continue;
      const isLast = s.last && s.last[0] === r && s.last[1] === c;
      el('circle', { class: 'stone s' + v + (isLast ? ' last' : ''), cx: X(c), cy: Y(r), r: CELL * 0.42 }, svg);
    }
    if (!ctx.interactive) return;

    if (ctx.hint) el('circle', { class: 'hinthalo', cx: X(ctx.hint.c), cy: Y(ctx.hint.r), r: CELL * 0.5 }, svg);

    // 3) zonas-clic en las candidatas legales.
    for (const m of this.legalMoves(s)){
      const hit = el('circle', { class: 'ghit g' + s.turn, cx: X(m.c), cy: Y(m.r), r: CELL * 0.42 }, svg);
      hit.addEventListener('click', () => ctx.onMove({ r: m.r, c: m.c }));
    }
  },
};

// Puntuación local rápida de poner color p en [r,c]: suma de longitudes de raya por dirección.
function localScore(s, r, c, p){
  let sc = 0;
  for (const [dr, dc] of DIRS){
    let cnt = 1, open = 0;
    for (const sgn of [1, -1]){
      for (let k = 1; k < NEED; k++){
        const rr = r + dr*k*sgn, cc = c + dc*k*sgn;
        if (inB(s, rr, cc) && s.cells[idx(s, rr, cc)] === p) cnt++;
        else { if (inB(s, rr, cc) && s.cells[idx(s, rr, cc)] === -1) open++; break; }
      }
    }
    sc += cnt * cnt + open;
  }
  return sc;
}
