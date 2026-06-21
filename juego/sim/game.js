// sim/game.js — Sim (Gustavus Simmons, 1969). Juego de Ramsey sobre el grafo completo K6.
// Por turnos, cada jugador colorea una arista vacía con SU color. Es MISÈRE: quien forme un
// TRIÁNGULO de su propio color PIERDE. Por el teorema de Ramsey R(3,3)=6, en K6 a dos colores
// SIEMPRE aparece un triángulo monocromo → no hay empate. Con juego perfecto gana el 2º jugador.
//
// Convención del motor (igual que TacTix/Resta): el negamax y el solver exacto usan la regla
// NORMAL «quien no puede mover, pierde». Para jugar MISÈRE sin tocar _engine/, modelamos el
// final un paso antes: `legalMoves` ofrece SOLO las aristas SEGURAS (las que NO cierran tu
// triángulo). Cuando no quedan seguras, el jugador en turno está obligado a perder → posición
// terminal sin jugadas → `winner = other(turn)`. Así legalMoves/isTerminal/winner/negamax/solver
// quedan alineados con misère, y el solver reproduce el teorema clásico (gana el 2º).
import { el } from '../_engine/svg.js';

const other = (p) => p ^ 1;

// K6: 15 aristas. eid[u][v] = índice de arista (u,v). E[e] = [u,v].
const E = [], eid = Array.from({ length: 6 }, () => new Array(6).fill(-1));
for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++){ eid[i][j] = eid[j][i] = E.length; E.push([i, j]); }

// ¿colorear la arista e con el color p cierra un triángulo monocromo de p?
// (existe un vértice w unido a ambos extremos de e por aristas ya de color p).
function closesTriangle(cells, e, p){
  const u = E[e][0], v = E[e][1];
  for (let w = 0; w < 6; w++){
    if (w === u || w === v) continue;
    if (cells[eid[u][w]] === p && cells[eid[v][w]] === p) return true;
  }
  return false;
}

// --- geometría del dibujo: 6 vértices en hexágono ---
const RV = 112, PAD = 26, CXY = RV + PAD;          // radio de vértices + margen
const VERT = [];
for (let k = 0; k < 6; k++){ const a = Math.PI / 180 * (k * 60 - 90); VERT.push([CXY + RV * Math.cos(a), CXY + RV * Math.sin(a)]); }
const SIDE = 2 * CXY;

export const game = {
  meta: {
    nombre: 'Sim',
    slug: 'sim',
    subtitulo: 'No cierres tu triángulo — el juego de Ramsey sobre seis puntos',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Por turnos coloreáis una <b>línea</b> entre dos puntos con vuestro color. ' +
      'Es <i>al revés</i>: <b>pierde</b> quien forme un <b>triángulo</b> de su propio color. ' +
      'Las líneas que te harían perder salen <b>punteadas</b> y no se pueden jugar.',
    help:
      '<p>Hay <b>seis puntos</b> y todas las líneas posibles entre ellos (quince). En tu turno pintas ' +
      'una línea libre de tu color. <b>Pierde quien primero cierra un triángulo de su propio color</b> ' +
      '(tres de sus líneas formando un triángulo entre tres puntos).</p>' +
      '<p>Por el <b>teorema de Ramsey</b> (R(3,3)=6), con seis puntos y dos colores es imposible ' +
      'pintarlas todas sin que aparezca un triángulo monocromo: <b>nunca hay empate</b>, alguien cae. ' +
      'Con juego perfecto <b>gana el segundo</b> en mover, así que el primero ha de hilar muy fino.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">El tablero es pequeño, así que la máquina lo tiene ' +
      '<b>resuelto</b>: juega perfecto y «⚖️ ¿Quién gana?» / «💡 Pista» son <b>exactos</b>, no estimaciones. ' +
      'Las líneas que cerrarían tu triángulo se muestran punteadas (te harían perder) y no son jugables.</p>',
    footer: 'Sim, de Gustavus Simmons (1969) · un juego de Ramsey · <a href="../../">El problema del día</a>',
  },

  configs: [{ key: 'k6', label: 'K6 (seis puntos)' }],

  initial(){ return { cells: new Array(15).fill(-1), turn: 0 }; },

  current(s){ return s.turn; },

  // jugadas SEGURAS: aristas vacías que NO cierran tu triángulo (modelado misère, ver cabecera).
  legalMoves(s){
    const out = [];
    for (let e = 0; e < 15; e++) if (s.cells[e] === -1 && !closesTriangle(s.cells, e, s.turn)) out.push({ e });
    return out;
  },

  apply(s, m){ const cells = s.cells.slice(); cells[m.e] = s.turn; return { cells, turn: other(s.turn) }; },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  // sin jugadas seguras → el de turno está obligado a cerrar su triángulo y pierde → gana el rival.
  winner(s){ return this.isTerminal(s) ? other(s.turn) : null; },

  // Evaluación EXACTA vía el solver memoizado (juego resuelto): +1 si `player` gana con juego
  // perfecto, -1 si pierde. Así la negamax del motor juega PERFECTO ya en profundidad 1.
  evaluate(s, player){
    const moverWins = simWins(s), mover = s.turn;
    const v = moverWins ? 1 : -1;
    return player === mover ? v : -v;
  },

  key(s){ return s.cells.join('') + s.turn; },

  // Árbol diminuto → resoluble exacto: «¿Quién gana?» y «Pista» dan veredicto perfecto.
  exactOK(s){ return true; },

  viewBox(){ return '0 0 ' + SIDE + ' ' + SIDE; },

  render(svg, s, ctx){
    const turn = s.turn, interactive = ctx.interactive;

    // aristas
    for (let e = 0; e < 15; e++){
      const i = E[e][0], j = E[e][1];
      const x1 = VERT[i][0], y1 = VERT[i][1], x2 = VERT[j][0], y2 = VERT[j][1];
      const v = s.cells[e];
      if (v === 0 || v === 1){
        el('line', { class: 'edge e' + v, x1, y1, x2, y2 }, svg);
        continue;
      }
      // arista vacía
      if (interactive && closesTriangle(s.cells, e, turn)){
        // te haría perder: visible pero punteada en tu color, NO jugable, con aviso al pasar.
        const ln = el('line', { class: 'edge e-lose' + turn, x1, y1, x2, y2 }, svg);
        el('title', {}, ln).textContent = 'Cerraría tu triángulo: perderías';
        continue;
      }
      // arista segura (o vista no interactiva)
      el('line', { class: 'edge ' + (interactive ? 'e-safe' : 'e-empty'), x1, y1, x2, y2 }, svg);
      if (interactive){
        if (ctx.hint && ctx.hint.e === e) el('line', { class: 'edge e-hint', x1, y1, x2, y2 }, svg);
        const hit = el('line', { class: 'e-hit', x1, y1, x2, y2 }, svg);
        hit.addEventListener('click', () => ctx.onMove({ e }));
      }
    }

    // vértices (encima de las líneas)
    for (let k = 0; k < 6; k++) el('circle', { class: 'vertex', cx: VERT[k][0], cy: VERT[k][1], r: 9 }, svg);
  },
};

// --- Solver memoizado a nivel de módulo (juego resuelto): ¿gana quien mueve en s? ---
// Map global PERSISTENTE: se resuelve una vez en toda la vida de la página y se reutiliza
// entre partidas. La primera llamada desde una apertura resuelve su subárbol (~medio segundo).
const MEMO = new Map();
function simWins(s){
  const moves = game.legalMoves(s);
  if (!moves.length) return false;               // terminal: quien mueve pierde (misère)
  const k = game.key(s);
  const hit = MEMO.get(k); if (hit !== undefined) return hit;
  let res = false;
  for (let i = 0; i < moves.length; i++){ if (!simWins(game.apply(s, moves[i]))){ res = true; break; } }
  MEMO.set(k, res);
  return res;
}
