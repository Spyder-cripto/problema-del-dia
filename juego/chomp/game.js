// chomp/game.js — Juego: Chomp (imparcial, de David Gale).
// Tableta de chocolate rows×cols; la casilla (0,0) está ENVENENADA. En tu turno
// eliges una casilla presente (r,c) y te comes ESA y todas las de arriba y a la
// derecha (todas (r2,c2) con r2>=r y c2>=c). PIERDE quien se ve obligado a comer
// el veneno (0,0). Juego imparcial: ambos tienen las mismas jugadas.
//
// Encaje con el motor (juego NORMAL: a quien le toca y no tiene jugada, pierde):
// tratamos «solo queda el veneno» como TERMINAL sin jugadas legales —el jugador
// en turno está obligado a comerse el veneno y pierde—. Así winner = other(turn),
// el solver exacto y la negamax del motor son todos coherentes.
import { el } from '../_engine/svg.js';

const PAD = 16, CELL = 46;
const cellX = (c) => PAD + c * CELL;
const cellY = (r) => PAD + r * CELL;

const CONFIGS = [
  { key: '4x3', label: '4×3', rows: 4, cols: 3 },
  { key: '5x4', label: '5×4', rows: 5, cols: 4 },
  { key: '6x5', label: '6×5', rows: 6, cols: 5 },
  { key: '3x3', label: '3×3', rows: 3, cols: 3 },
];

function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }
const idx = (s, r, c) => r * s.cols + c;

// ¿queda alguna casilla aparte del veneno (0,0)?
function hasNonPoison(s){
  for (let i = 1; i < s.cells.length; i++) if (s.cells[i]) return true;
  return false;
}

export const game = {
  meta: {
    nombre: 'Chomp',
    slug: 'chomp',
    subtitulo: 'La tableta envenenada — el juego del robo de estrategia',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: 'muerde primero' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: 'responde' },
    ],
    aiPlayer: 1,
    back: { href: '../../', label: '← El problema del día' },
    legend:
      'Muerde una casilla y te comes <b>esa y todo el bloque hacia arriba y a la derecha</b>. ' +
      'La esquina <b class="ro">☠ envenenada</b> abajo-izquierda es mortal: ' +
      '<b>pierde quien se ve obligado a comérsela.</b>',
    help:
      '<p>La tableta es una rejilla de chocolate y la esquina de abajo a la izquierda ' +
      '(<b style="color:var(--rojo)">☠</b>) está envenenada. Por turnos, cada jugador elige una casilla ' +
      'que quede y se come <b>esa y todas las que tiene encima y a su derecha</b>. ' +
      'Como siempre se muerde un bloque que llega hasta dos bordes, la tableta va quedando con forma de escalera.</p>' +
      '<p>El que se queda sin más remedio que morder la casilla envenenada <b>pierde</b>. ' +
      'Por eso casi nunca interesa comer mucho: cada bocado grande le deja al rival más tableta para maniobrar.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">Chomp esconde una joya: con un <b>argumento de robo de estrategia</b> se demuestra que ' +
      'el <b>primer jugador siempre gana</b>… ¡pero la prueba no dice cómo! En tableros pequeños, ' +
      '“⚖️ ¿Quién gana?” lo resuelve de forma exacta y “💡 Pista” te enseña una jugada ganadora.</p>',
    footer: 'Chomp, de David Gale (1974); el robo de estrategia se remonta a Fred Schuh · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key);
    return { rows: c.rows, cols: c.cols, cells: new Array(c.rows * c.cols).fill(1), turn: 0 };
  },

  current(s){ return s.turn; },

  // Cada casilla presente es una jugada legal SALVO el veneno (0,0): comérselo no es
  // una jugada que se elija, es la derrota. Cuando solo queda el veneno no hay jugada
  // legal -> el jugador en turno está obligado a comérselo y pierde (estado terminal).
  legalMoves(s){
    if (!hasNonPoison(s)) return [];
    const moves = [];
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      if (r === 0 && c === 0) continue;            // morder el veneno NO es jugada elegible
      if (s.cells[idx(s, r, c)]) moves.push({ r, c });
    }
    return moves;
  },

  // Come (r,c) y todo el bloque con r2>=r y c2>=c. PURO.
  apply(s, m){
    const cells = s.cells.slice();
    for (let r = m.r; r < s.rows; r++) for (let c = m.c; c < s.cols; c++)
      cells[idx(s, r, c)] = 0;
    return { rows: s.rows, cols: s.cols, cells, turn: s.turn ^ 1 };
  },

  isTerminal(s){ return this.legalMoves(s).length === 0; },

  // En terminal, el jugador en turno está obligado a comer el veneno -> pierde.
  // Gana el otro (el que acaba de mover).
  winner(s){ return this.isTerminal(s) ? (s.turn ^ 1) : null; },

  // Chomp no está resuelto en general. Heurística suave desde la óptica de `player`:
  // tener más bocados disponibles (más casillas no envenenadas) da más maniobra.
  evaluate(s, player){
    let live = 0;
    for (let i = 1; i < s.cells.length; i++) if (s.cells[i]) live++;
    // El signo no depende del turno: más opciones es mejor para quien mueve;
    // el motor invierte signos en negamax, así que devolvemos desde la óptica de player.
    return player === s.turn ? live : -live;
  },

  key(s){ return s.cells.join('') + s.turn; },

  // Solver exacto seguro con <=16 casillas presentes.
  exactOK(s){
    let live = 0; for (let i = 0; i < s.cells.length; i++) if (s.cells[i]) live++;
    return live <= 16;
  },

  viewBox(s){ return '0 0 ' + (PAD * 2 + s.cols * CELL) + ' ' + (PAD * 2 + s.rows * CELL); },

  render(svg, s, ctx){
    const INSET = 3, RAD = 6;

    // Dibuja una casilla de chocolate (presente).
    function tile(r, c, cls){
      return el('rect', {
        class: cls,
        x: cellX(c) + INSET, y: cellY(r) + INSET,
        width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD,
      }, svg);
    }

    // Casillas presentes (chocolate). El veneno (0,0) va aparte si sigue presente.
    for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++){
      if (!s.cells[idx(s, r, c)]) continue;
      if (r === 0 && c === 0) continue; // el veneno se pinta después, encima
      tile(r, c, 'cell');
    }

    // Casilla envenenada (0,0): color rojo + calavera.
    if (s.cells[idx(s, 0, 0)]){
      tile(0, 0, 'piece1');
      const t = el('text', {
        x: cellX(0) + CELL / 2, y: cellY(0) + CELL / 2,
        'text-anchor': 'middle', 'dominant-baseline': 'central',
        'font-size': 22, 'pointer-events': 'none', fill: '#fff',
      }, svg);
      t.textContent = '☠';
    }

    if (!ctx.interactive) return;

    const cur = s.turn;
    const moves = this.legalMoves(s);

    // Resaltar el bloque que se comería al pasar el ratón por una casilla.
    // Pintamos, por cada jugada legal, un rectángulo-fantasma que cubre TODO el
    // bloque (r..rows, c..cols restringido a las casillas presentes de ese bloque).
    for (const m of moves){
      // Halo en la jugada-pista (sobre su bloque completo presente).
      if (ctx.hint && ctx.hint.r === m.r && ctx.hint.c === m.c){
        for (let r = m.r; r < s.rows; r++) for (let c = m.c; c < s.cols; c++){
          if (!s.cells[idx(s, r, c)]) continue;
          el('rect', {
            class: 'halo',
            x: cellX(c) + INSET - 2, y: cellY(r) + INSET - 2,
            width: CELL - 2 * INSET + 4, height: CELL - 2 * INSET + 4, rx: RAD + 2,
          }, svg);
        }
      }

      // Un grupo por jugada: al pasar el ratón, TODO el grupo se ilumina (CSS :hover
      // sobre el <g>), de modo que se ve el bloque entero que se va a comer.
      const g = el('g', { class: 'chomp-move' }, svg);
      g.addEventListener('click', () => ctx.onMove({ r: m.r, c: m.c }));
      for (let r = m.r; r < s.rows; r++) for (let c = m.c; c < s.cols; c++){
        if (!s.cells[idx(s, r, c)]) continue;
        el('rect', {
          class: 'ghost g' + cur,
          x: cellX(c) + INSET, y: cellY(r) + INSET,
          width: CELL - 2 * INSET, height: CELL - 2 * INSET, rx: RAD,
        }, g);
      }
    }
  },
};
