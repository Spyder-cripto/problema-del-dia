// resta/game.js — Juego #N: «El 21» (juego de resta imparcial).
// De un montón de fichas, por turnos cada jugador retira un número del conjunto permitido.
// Modo NORMAL: gana quien toma la última ficha. Modo MISÈRE: pierde quien toma la última.
// Es un juego IMPARCIAL (ambos tienen las mismas jugadas) y resuelto: las posiciones
// perdedoras son periódicas. Estado { rem, turn, set:[...], misere:bool }.
//
// Nota de convención (igual que tactix): el motor compartido (negamax y solver exacto)
// usa la regla NORMAL "quien no puede mover, pierde". Para que esa maquinaria juegue
// MISÈRE correctamente SIN tocar _engine/, modelamos el final un paso antes: en misère,
// una posición con UNA SOLA ficha es TERMINAL y SIN jugadas, de modo que el jugador en
// turno —obligado a retirar esa última ficha— es justo el que pierde. Así legalMoves,
// isTerminal, winner, negamax y el solver exacto quedan TODOS alineados con misère, y la
// experiencia visible es la misma: a quien le toca con 1 ficha está forzado a tomarla y
// pierde. En modo NORMAL el terminal es rem===0 (tomar la última gana), tal cual.
import { el } from '../_engine/svg.js';

const PAD = 16, R = 15, GAP = 9, ROWGAP = 12, MAXCOL = 10;
const STEP = 2 * R + GAP;            // distancia horizontal entre centros
const ROWH = 2 * R + ROWGAP;         // distancia vertical entre filas
const FW = PAD * 2 + MAXCOL * STEP - GAP;  // ancho fijo (10 por fila)

const CONFIGS = [
  { key: '21',   label: 'El 21 (1-3, gana el último)', rem: 21,  set: [1, 2, 3],                     misere: false },
  { key: '21m',  label: 'El 21 misère (pierde el último)', rem: 21,  set: [1, 2, 3],                  misere: true  },
  { key: '100',  label: 'El 100 (quita 1-10)',          rem: 100, set: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], misere: false },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
function maxStep(set){ let m = 0; for (let i = 0; i < set.length; i++) if (set[i] > m) m = set[i]; return m; }

// ¿Es {1,2,...,m} (conjunto contiguo desde 1)? Permite usar la teoría cerrada.
function isContiguous(set){
  const m = maxStep(set);
  if (set.length !== m) return false;
  for (let k = 1; k <= m; k++) if (!set.includes(k)) return false;
  return true;
}

export const game = {
  meta: {
    nombre: 'El 21',
    slug: 'resta',
    subtitulo: 'Juego de resta — quita fichas y deja la última (o no) al rival',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'mueve primero' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'mueve después' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Por turnos, cada jugador retira de <b>1 a un máximo</b> de fichas del montón. ' +
      'En el modo normal <b class="az">gana</b> quien toma la <b>última</b>; en el modo <i>misère</i> ' +
      'quien toma la última <b class="ro">pierde</b>. Pulsa la ficha hasta la que quieras retirar (desde el borde).',
    help:
      '<p>Hay un montón de fichas. En tu turno retiras un número permitido de fichas ' +
      '(por ejemplo, de 1 a 3). Se alterna el turno hasta vaciar el montón. ' +
      'En el modo <b>normal</b>, quien coge la última gana; en el modo <b>misère</b>, quien coge la última pierde.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Es un <b>juego imparcial resuelto</b>: existen ' +
      '<i>posiciones perdedoras</i> periódicas. Con la resta 1-3 y juego normal, pierdes si te dejan un múltiplo de 4 ' +
      '(4, 8, 12, 16, 20…): hagas lo que hagas, el rival puede devolverte al siguiente múltiplo. ' +
      'La estrategia ganadora es <b>completar siempre 4</b> con la jugada del rival. ' +
      '“⚖️ ¿Quién gana?” y “💡 Pista” usan la teoría exacta del juego.</p>',
    footer: 'El juego de resta «El 21» / Nim de un montón · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { rem: c.rem, turn: 0, set: c.set.slice(), misere: c.misere };
  },

  current(s){ return s.turn; },

  legalMoves(s){
    // Misère: con UNA sola ficha el jugador está obligado a retirarla y pierde; lo tratamos
    // como terminal y sin jugadas (alinea negamax/solver con misère, ver nota de cabecera).
    if (s.misere && s.rem <= 1) return [];
    const moves = [];
    for (let i = 0; i < s.set.length; i++){
      const k = s.set[i];
      if (k > s.rem) continue;
      // Misère: nunca se vacía el montón voluntariamente; toda jugada debe dejar >= 1 ficha.
      if (s.misere && s.rem - k < 1) continue;
      moves.push({ k });
    }
    return moves;
  },

  apply(s, m){
    return { rem: s.rem - m.k, turn: s.turn ^ 1, set: s.set, misere: s.misere };
  },

  // NORMAL: terminal al vaciar (rem===0). MISÈRE: terminal con una ficha (el de turno la
  // toma forzado y pierde); así el motor NORMAL juega misère correctamente.
  isTerminal(s){ return s.misere ? s.rem <= 1 : s.rem === 0; },

  // En ambos modos, el jugador en turno en la posición terminal es el PERDEDOR:
  //  NORMAL  -> no le quedan fichas (el anterior tomó la última y ganó).
  //  MISÈRE  -> está obligado a tomar la última ficha y pierde.
  // Por tanto gana siempre el rival: other(turn).
  winner(s){
    if (!this.isTerminal(s)) return null;
    return s.turn ^ 1;
  },

  // Heurística desde la óptica de `player`. Mayor = mejor para `player`.
  // Devuelve +1 si `player` está en posición GANADORA con juego perfecto, -1 si perdedora, 0 si no se sabe.
  evaluate(s, player){
    const moverWins = currentWins(s);          // ¿gana quien mueve en s?
    const mover = s.turn;
    // valor para el que mueve: +1 si gana, -1 si pierde
    const valForMover = moverWins ? 1 : -1;
    return player === mover ? valForMover : -valForMover;
  },

  key(s){ return s.rem + ',' + s.turn + ',' + (s.misere ? 1 : 0); },

  // El solver exacto del motor asume convención NORMAL (sin jugadas = pierde quien mueve).
  // Como hemos alineado el terminal de misère con esa convención (ver nota de cabecera),
  // el solver es CORRECTO en ambos modos. rem es pequeño en todas las configs -> exacto.
  exactOK(s){ return true; },

  viewBox(s){
    const rows = Math.max(1, Math.ceil(s.rem / MAXCOL));
    return '0 0 ' + FW + ' ' + (PAD * 2 + rows * ROWH - ROWGAP);
  },

  render(svg, s, ctx){
    const cur = s.turn;
    // posición (x,y) del centro de la ficha i (0 = primera del montón). Se rellena por filas.
    const cx = (i) => PAD + R + (i % MAXCOL) * STEP;
    const cy = (i) => PAD + R + ((i / MAXCOL) | 0) * ROWH;

    // Conjunto de "cuántas fichas se pueden retirar" según las jugadas LEGALES reales
    // (en misère no se ofrece vaciar el montón: la última ficha no es clicable directamente).
    const legalK = new Set(this.legalMoves(s).map(m => m.k));

    for (let i = 0; i < s.rem; i++){
      // pulsar la ficha i retira desde i hasta el final del montón => k = rem - i fichas.
      const k = s.rem - i;
      const ghostable = ctx.interactive && legalK.has(k);
      const isHint = ghostable && ctx.hint && ctx.hint.k === k;
      if (isHint)
        el('circle', { class: 'halo', cx: cx(i), cy: cy(i), r: R + 4 }, svg);
      if (ghostable){
        const g = el('circle', { class: 'ghost g' + cur, cx: cx(i), cy: cy(i), r: R }, svg);
        g.addEventListener('click', () => ctx.onMove({ k }));
      } else {
        el('circle', { class: 'cell', cx: cx(i), cy: cy(i), r: R }, svg);
      }
    }
  },
};

// --- Teoría del juego de resta (cálculo de quién gana, memoizable trivialmente) ---
// Devuelve true si gana el jugador que mueve en `s`, con juego perfecto.
function currentWins(s){
  const top = maxStep(s.set);
  // Caso resuelto en forma cerrada: conjunto {1..m}.
  if (isContiguous(s.set)){
    const m = top;
    if (!s.misere){
      // NORMAL: posición perdedora (mover pierde) si rem % (m+1) === 0.
      return s.rem % (m + 1) !== 0;
    }
    // MISÈRE: posición perdedora (mover pierde) si rem % (m+1) === 1.
    return s.rem % (m + 1) !== 1;
  }
  // Conjunto arbitrario: resolución exacta por DP ascendente (rem es pequeño aquí).
  return dpWins(s.rem, s.set, s.misere);
}

// DP genérica: lose[r] = el que mueve con r fichas PIERDE.
function dpWins(rem, set, misere){
  const lose = new Array(rem + 1).fill(false);
  // r = 0: no quedan fichas. El jugador a mover no movió; el anterior tomó la última.
  //   NORMAL: el anterior gana -> el que mueve (en r=0) pierde -> lose[0] = true.
  //   MISÈRE: el anterior pierde -> el que mueve (en r=0) gana -> lose[0] = false.
  lose[0] = !misere;
  for (let r = 1; r <= rem; r++){
    let win = false;
    for (let i = 0; i < set.length; i++){
      const k = set[i];
      if (k <= r && lose[r - k]){ win = true; break; }  // puedo dejar al rival en posición perdedora
    }
    lose[r] = !win;
  }
  return !lose[rem];
}
