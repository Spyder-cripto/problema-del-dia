// molino/game.js — Juego: Molino (Nine Men's Morris / Tres en línea grande).
// Tablero de 24 puntos (3 cuadrados concéntricos unidos por los puntos medios).
// Cada bando tiene 9 fichas. Tres fases:
//   1) COLOCAR: por turnos se pone una ficha en un punto vacío (hasta agotar las 9).
//   2) MOVER: se desliza una ficha a un punto adyacente vacío.
//   3) VOLAR: cuando te quedan solo 3 fichas, puedes saltar a CUALQUIER punto vacío.
// Formar un MOLINO (3 en línea) al colocar o mover te deja QUITAR una ficha rival
// (preferiblemente no de un molino; si todas están en molinos, vale cualquiera).
// PIERDE quien queda con menos de 3 fichas o sin jugada posible.
//
// Encaje con el motor: la captura es parte de la MISMA jugada → el turno siempre
// alterna; «pierde quien no puede / queda en 2» = gana el último que movió → la
// negamax del motor es correcta. La fase de mover puede ciclar, así que el estado
// lleva contador + tope. CLAVE (corregido tras auditoría): el terminal-por-tope se resuelve
// como «último que movió» (winner = other(turn)), igual que el resto de terminales; un
// desempate por nº de fichas podría nombrar ganador al jugador en turno y la IA malvaloraría
// el final (alucinaba mates forzados empujando al tope). exactOK = false.
import { el } from '../_engine/svg.js';

const PAD = 22, UNIT = 44;
const other = (p) => p ^ 1;

const POS = [
  [0,0],[3,0],[6,0], [1,1],[3,1],[5,1], [2,2],[3,2],[4,2],
  [0,3],[1,3],[2,3],[4,3],[5,3],[6,3], [2,4],[3,4],[4,4],
  [1,5],[3,5],[5,5], [0,6],[3,6],[6,6],
];
const ADJ = [
  [1,9],[0,2,4],[1,14], [4,10],[1,3,5,7],[4,13], [7,11],[4,6,8],[7,12],
  [0,10,21],[3,9,11,18],[6,10,15], [8,13,17],[5,12,14,20],[2,13,23],
  [11,16],[15,17,19],[12,16], [10,19],[16,18,20,22],[13,19], [9,22],[19,21,23],[14,22],
];
const MILLS = [
  [0,1,2],[3,4,5],[6,7,8],[9,10,11],[12,13,14],[15,16,17],[18,19,20],[21,22,23],
  [0,9,21],[3,10,18],[6,11,15],[1,4,7],[16,19,22],[8,12,17],[5,13,20],[2,14,23],
];
const MILLS_AT = Array.from({ length: 24 }, () => []);
for (const m of MILLS) for (const p of m) MILLS_AT[p].push(m);

const countMen = (board, p) => { let n = 0; for (let i = 0; i < 24; i++) if (board[i] === p) n++; return n; };
const inMill = (board, pt, p) => MILLS_AT[pt].some(m => board[m[0]] === p && board[m[1]] === p && board[m[2]] === p);
const formsMill = (board, pt, p) => MILLS_AT[pt].some(m => m.every(x => board[x] === p));
function removableList(board, opp){
  const all = [], free = [];
  for (let i = 0; i < 24; i++) if (board[i] === opp){ all.push(i); if (!inMill(board, i, opp)) free.push(i); }
  return free.length ? free : all;
}

// Jugadas del bando p. Cada jugada: {place|from,to} (+ {remove} si forma molino).
function movesFor(s, p){
  const out = [], opp = other(p);
  const emit = (base, board, dest) => {
    if (formsMill(board, dest, p)){
      const rem = removableList(board, opp);
      if (rem.length) for (const r of rem) out.push({ ...base, remove: r });
      else out.push({ ...base });
    } else out.push({ ...base });
  };
  if (s.hands[p] > 0){
    for (let e = 0; e < 24; e++) if (s.board[e] === -1){
      const board = s.board.slice(); board[e] = p;
      emit({ place: e }, board, e);
    }
  } else {
    const flying = countMen(s.board, p) === 3;
    for (let f = 0; f < 24; f++) if (s.board[f] === p){
      const dests = flying ? [...Array(24).keys()].filter(t => s.board[t] === -1) : ADJ[f].filter(t => s.board[t] === -1);
      for (const t of dests){
        const board = s.board.slice(); board[f] = -1; board[t] = p;
        emit({ from: f, to: t }, board, t);
      }
    }
  }
  return out;
}

export const game = {
  meta: {
    nombre: 'Molino',
    slug: 'molino',
    subtitulo: 'Nine Men’s Morris — forma líneas de tres y captura',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '' },
    ],
    aiPlayer: 1,
    legend:
      'Coloca tus 9 fichas; luego deslízalas a un punto vecino. ' +
      'Formar un <b>molino</b> (3 en línea) te deja <b>quitar una ficha rival</b>. ' +
      'Con 3 fichas puedes <b>volar</b> a cualquier punto. <b>Pierde quien baja de 3 fichas o no puede mover.</b>',
    help:
      '<p>El juego tiene tres fases. Primero, <b>colocáis</b> por turnos vuestras nueve fichas en los puntos vacíos. ' +
      'Después se entra en la fase de <b>mover</b>: en tu turno deslizas una ficha a un punto <b>adyacente</b> libre. ' +
      'Y cuando a alguien le quedan <b>solo tres fichas</b>, esas fichas pueden <b>volar</b> a cualquier punto vacío.</p>' +
      '<p>Siempre que con tu jugada cierres un <b>molino</b> (tres fichas tuyas en una de las líneas marcadas) ' +
      '<b>capturas una ficha rival</b>: elige una que no esté en un molino (si todas lo están, vale cualquiera). ' +
      'Abrir y cerrar un molino una y otra vez es una táctica letal.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Se <b>pierde</b> al quedarse con menos de tres fichas o sin ninguna jugada legal. ' +
      'La máquina valora material, molinos y movilidad y busca a varias jugadas. «💡 Pista» te sugiere su mejor jugada.</p>',
    footer: 'Molino (Nine Men’s Morris), un juego de tablero de hace más de 3.000 años · <a href="../../">El problema del día</a>',
  },

  configs: [{ key: 'std', label: '9 fichas' }],

  initial(){ return { board: new Array(24).fill(-1), hands: [9, 9], turn: 0, moves: 0, cap: 200 }; },

  current(s){ return s.turn; },

  legalMoves(s){ return this.isTerminal(s) ? [] : movesFor(s, s.turn); },

  apply(s, m){
    const board = s.board.slice(), hands = s.hands.slice();
    if (m.place != null){ board[m.place] = s.turn; hands[s.turn]--; }
    else { board[m.from] = -1; board[m.to] = s.turn; }
    if (m.remove != null) board[m.remove] = -1;
    return { board, hands, turn: other(s.turn), moves: s.moves + 1, cap: s.cap };
  },

  isTerminal(s){
    if (s.moves >= s.cap) return true;
    const p = s.turn;
    if (s.hands[p] === 0 && countMen(s.board, p) < 3) return true;   // reducido a 2
    return movesFor(s, p).length === 0;                              // sin jugada
  },

  winner(s){
    const p = s.turn;
    if (s.hands[p] === 0 && countMen(s.board, p) < 3) return other(p);
    if (movesFor(s, p).length === 0) return other(p);
    if (s.moves >= s.cap) return other(p);   // tope = tablas → último que movió (coherente con la negamax)
    return null;
  },

  evaluate(s, player){
    const opp = other(player);
    const f = (p) => {
      let men = 0, mills = 0, twos = 0;
      for (let i = 0; i < 24; i++) if (s.board[i] === p) men++;
      for (const ml of MILLS){
        const mine = (s.board[ml[0]] === p) + (s.board[ml[1]] === p) + (s.board[ml[2]] === p);
        const enemy = (s.board[ml[0]] === opp) + (s.board[ml[1]] === opp) + (s.board[ml[2]] === opp);
        if (mine === 3) mills++;
        else if (mine === 2 && enemy === 0) twos++;     // amenaza de molino
      }
      let mob = 0;
      if (s.hands[p] === 0 && men > 3) for (let i = 0; i < 24; i++) if (s.board[i] === p) mob += ADJ[i].filter(t => s.board[t] === -1).length;
      return men * 100 + mills * 7 + twos * 3 + mob;
    };
    return f(player) - f(opp);
  },

  key(s){ return s.board.join('') + '|' + s.hands.join('') + '|' + s.turn; },

  exactOK(){ return false; },

  viewBox(){ return '0 0 ' + (UNIT * 6 + PAD * 2) + ' ' + (UNIT * 6 + PAD * 2); },

  render(svg, s, ctx){
    const cur = s.turn, opp = other(cur);
    const px = (i) => PAD + POS[i][0] * UNIT, py = (i) => PAD + POS[i][1] * UNIT;

    // 1) aristas del tablero (cada adyacencia una vez).
    for (let i = 0; i < 24; i++) for (const j of ADJ[i]) if (j > i)
      el('line', { class: 'mline', x1: px(i), y1: py(i), x2: px(j), y2: py(j) }, svg);

    // 2) puntos vacíos + fichas.
    for (let i = 0; i < 24; i++){
      if (s.board[i] === -1) el('circle', { class: 'spot', cx: px(i), cy: py(i), r: 5 }, svg);
      else el('circle', { class: 'piece' + s.board[i], cx: px(i), cy: py(i), r: UNIT * 0.20 }, svg);
    }

    if (!ctx.interactive) return;

    // estado efímero: ficha origen seleccionada (fase mover) y captura pendiente.
    let from = svg._mmFrom != null ? svg._mmFrom : null;
    let pending = svg._mmPending || null;
    const moves = this.legalMoves(s);
    const baseMatches = (m, b) => (b.place != null ? m.place === b.place : (m.from === b.from && m.to === b.to));
    if (pending && !moves.some(m => baseMatches(m, pending.base) && m.remove != null)) pending = null;
    if (from != null && !moves.some(m => m.from === from)) from = null;
    svg._mmFrom = from; svg._mmPending = pending;

    if (ctx.hint){
      const t = ctx.hint;
      const at = t.place != null ? t.place : t.to;
      el('circle', { class: 'mhalo', cx: px(at), cy: py(at), r: UNIT * 0.28 }, svg);
      if (t.from != null) el('circle', { class: 'mhalo', cx: px(t.from), cy: py(t.from), r: UNIT * 0.28 }, svg);
      if (t.remove != null) el('circle', { class: 'mhalo rem', cx: px(t.remove), cy: py(t.remove), r: UNIT * 0.28 }, svg);
    }

    const rerender = () => { while (svg.firstChild) svg.removeChild(svg.firstChild); game.render(svg, s, ctx); };

    // FASE DE CAPTURA: elegir qué ficha rival quitar.
    if (pending){
      for (const pt of pending.removals){
        const g = el('circle', { class: 'removehit', cx: px(pt), cy: py(pt), r: UNIT * 0.27 }, svg);
        g.addEventListener('click', () => { svg._mmPending = null; svg._mmFrom = null; ctx.onMove({ ...pending.base, remove: pt }); });
      }
      return;
    }

    const placing = s.hands[cur] > 0;
    if (placing){
      for (let e = 0; e < 24; e++){
        const ms = moves.filter(m => m.place === e);
        if (!ms.length) continue;
        const g = el('circle', { class: 'ghost g' + cur, cx: px(e), cy: py(e), r: UNIT * 0.18 }, svg);
        g.addEventListener('click', () => {
          const rem = ms.filter(m => m.remove != null).map(m => m.remove);
          if (rem.length){ svg._mmPending = { base: { place: e }, removals: rem }; rerender(); }
          else ctx.onMove({ place: e });
        });
      }
    } else {
      // destinos de la ficha seleccionada.
      if (from != null){
        const tos = [...new Set(moves.filter(m => m.from === from).map(m => m.to))];
        for (const t of tos){
          const g = el('circle', { class: 'ghost g' + cur, cx: px(t), cy: py(t), r: UNIT * 0.18 }, svg);
          g.addEventListener('click', () => {
            const rem = moves.filter(m => m.from === from && m.to === t && m.remove != null).map(m => m.remove);
            if (rem.length){ svg._mmPending = { base: { from, to: t }, removals: rem }; rerender(); }
            else { svg._mmFrom = null; ctx.onMove({ from, to: t }); }
          });
        }
      }
      // fichas propias seleccionables.
      const fromable = [...new Set(moves.map(m => m.from))];
      for (const f of fromable){
        const isSel = from === f;
        if (isSel) el('circle', { class: 'selring', cx: px(f), cy: py(f), r: UNIT * 0.28 }, svg);
        const hit = el('circle', { class: 'pickable', cx: px(f), cy: py(f), r: UNIT * 0.27 }, svg);
        hit.addEventListener('click', () => { svg._mmFrom = isSel ? null : f; rerender(); });
      }
    }
  },
};
