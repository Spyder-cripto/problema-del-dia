// amazons/game.js — El Juego de las Amazonas (Walter Zamkauskas, 1988).
// En tu turno mueves UNA amazona como la dama del ajedrez (líneas/diagonales, sin saltar) y
// luego disparas una FLECHA desde su nueva casilla, también como la dama, a una casilla vacía:
// esa casilla queda QUEMADA para siempre. Pierde quien no puede mover. Es un juego de TERRITORIO:
// ganas encerrando al rival. La IA usa MCTS (búsqueda Monte Carlo) — ver _engine/ai.js, driver
// 'mcts'. NO se toca _engine/: lo específico del juego (incl. game.rollout rápido) vive aquí.
//
// Estado { n, cells:[-1 vacía | 0 azul | 1 rojo | 2 flecha], turn }.  idx = r*n + c.
import { el, clear } from '../_engine/svg.js';

const other = (p) => p ^ 1;
const DIRS = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

const CONFIGS = [
  { key: 's6',  label: '6×6 (normal)',  n: 6,  pp: 2 },
  { key: 's8',  label: '8×8 (grande)',  n: 8,  pp: 4 },
  { key: 's10', label: '10×10 (clásico)', n: 10, pp: 4 },
];
function cfg(key){ return CONFIGS.find(c => c.key === key) || CONFIGS[0]; }

// casillas alcanzables como dama desde `from` (desliza mientras la casilla esté vacía).
function reach(cells, n, from, out){
  out.length = 0;
  const r0 = (from / n) | 0, c0 = from % n;
  for (let d = 0; d < 8; d++){
    const dr = DIRS[d][0], dc = DIRS[d][1];
    let r = r0 + dr, c = c0 + dc;
    while (r >= 0 && r < n && c >= 0 && c < n){
      const i = r * n + c;
      if (cells[i] !== -1) break;
      out.push(i); r += dr; c += dc;
    }
  }
  return out;
}

const CELL = 44;   // px por casilla

export const game = {
  meta: {
    nombre: 'Amazonas',
    slug: 'amazons',
    subtitulo: 'Mueve, dispara y encierra — el juego de territorio de Walter Zamkauskas',
    players: [
      { nombre: 'Azul', corto: 'Azul', color: 'var(--azul)', desc: '' },
      { nombre: 'Rojo', corto: 'Rojo', color: 'var(--rojo)', desc: '' },
    ],
    aiPlayer: 1,
    aiDriver: 'mcts',
    aiParams: { c: 1.414 },
    legend:
      'Mueve una <b>amazona</b> como la dama (líneas y diagonales, sin saltar) y luego dispara una ' +
      '<b>flecha</b> desde su destino, también como la dama, a una casilla vacía: queda <b>quemada</b>. ' +
      'Pierde quien no pueda mover. Pulsa tu amazona, su destino y luego la casilla de la flecha.',
    help:
      '<p>Cada jugada tiene <b>dos partes obligatorias</b>: primero mueves una de tus amazonas en línea ' +
      'recta (horizontal, vertical o diagonal) cualquier número de casillas sin saltar piezas ni flechas; ' +
      'después, desde su nueva casilla, esa misma amazona <b>dispara una flecha</b> en línea recta a una ' +
      'casilla vacía, que queda bloqueada el resto de la partida.</p>' +
      '<p>El tablero se va llenando de flechas y el espacio se encoge. <b>Pierde quien, en su turno, no ' +
      'pueda mover ninguna amazona.</b> No hay empate: siempre acaba encerrado alguien. La clave es el ' +
      '<b>territorio</b>: encierra zonas para ti y deja al rival sin aire.</p>' +
      '<p style="font-size:.95rem;color:var(--muted)">La máquina elige su jugada con <b>búsqueda Monte ' +
      'Carlo</b> (simula muchas partidas). En tableros más anchos (8×8, 10×10) dispone de menos análisis ' +
      'por jugada, así que juega más floja; en <b>6×6</b> da su mejor nivel —si buscas reto, quédate en 6×6.</p>',
    footer: 'Amazonas, de Walter Zamkauskas (1988) · <a href="../../">El problema del día</a>',
  },

  configs: CONFIGS,

  initial(key){
    const c = cfg(key), n = c.n, cells = new Array(n * n).fill(-1);
    for (let k = 0; k < c.pp; k++){
      const col = Math.floor((k + 0.5) * n / c.pp);
      cells[col] = 1;                 // Rojo arriba (fila 0)
      cells[(n - 1) * n + col] = 0;   // Azul abajo (fila n-1)
    }
    return { n, cells, turn: 0 };
  },

  current(s){ return s.turn; },

  isTerminal(s){
    const cells = s.cells, n = s.n, turn = s.turn;
    for (let i = 0; i < cells.length; i++){
      if (cells[i] !== turn) continue;
      const r0 = (i / n) | 0, c0 = i % n;
      for (let d = 0; d < 8; d++){
        const r = r0 + DIRS[d][0], c = c0 + DIRS[d][1];
        if (r >= 0 && r < n && c >= 0 && c < n && cells[r * n + c] === -1) return false;
      }
    }
    return true;   // el jugador en turno no puede mover ninguna amazona
  },

  // Juego normal: pierde quien no puede mover -> gana el último que movió = other(turn).
  winner(s){ return this.isTerminal(s) ? other(s.turn) : null; },

  // TODAS las jugadas legales {from,to,arrow} del jugador en turno (para el árbol del MCTS / negamax).
  legalMoves(s){
    const cells = s.cells, n = s.n, turn = s.turn, out = [], rc = [], rc2 = [];
    for (let i = 0; i < cells.length; i++){
      if (cells[i] !== turn) continue;
      reach(cells, n, i, rc);
      for (let t = 0; t < rc.length; t++){
        const to = rc[t];
        cells[i] = -1; cells[to] = turn;          // mover tentativamente
        reach(cells, n, to, rc2);
        cells[to] = -1; cells[i] = turn;          // deshacer
        for (let a = 0; a < rc2.length; a++) out.push({ from: i, to, arrow: rc2[a] });
      }
    }
    return out;
  },

  apply(s, m){
    const cells = s.cells.slice();
    cells[m.from] = -1; cells[m.to] = s.turn; cells[m.arrow] = 2;
    return { n: s.n, cells, turn: other(s.turn) };
  },

  // Heurística de MOVILIDAD (proxy de territorio): mis casillas alcanzables menos las del rival.
  // El motor solo la usa en hojas no terminales (y el driver 'mcts' la ignora en v1).
  evaluate(s, player){
    const cells = s.cells, n = s.n, rc = [];
    const mob = (p) => { let m = 0; for (let i = 0; i < cells.length; i++){ if (cells[i] !== p) continue; reach(cells, n, i, rc); m += rc.length; } return m; };
    return mob(player) - mob(other(player));
  },

  key(s){ return s.cells.join(',') + s.turn; },

  exactOK(s){ return false; },

  // Playout aleatorio RÁPIDO para el MCTS (hook game.rollout): muestrea una amazona con jugada,
  // un destino y una flecha, sin enumerar las ~miles de jugadas. Devuelve el ganador (0/1).
  // Verificado == reglas del contrato en _amazons_*.mjs (40/40 partidas terminan, winner=other(turn)).
  rollout(s, rng){
    const n = s.n, cells = s.cells.slice(), rc = [];
    let turn = s.turn;
    for (let guard = 0; guard < n * n + 5; guard++){
      const am = [];
      for (let i = 0; i < cells.length; i++) if (cells[i] === turn) am.push(i);
      for (let i = am.length - 1; i > 0; i--){ const j = (rng() * (i + 1)) | 0; const t = am[i]; am[i] = am[j]; am[j] = t; }
      let moved = false;
      for (let x = 0; x < am.length; x++){
        const from = am[x];
        reach(cells, n, from, rc);
        if (!rc.length) continue;
        const to = rc[(rng() * rc.length) | 0];
        cells[from] = -1; cells[to] = turn;
        reach(cells, n, to, rc);
        cells[rc[(rng() * rc.length) | 0]] = 2;
        moved = true; break;
      }
      if (!moved) return other(turn);   // turn no puede mover -> pierde
      turn = other(turn);
    }
    return other(turn);
  },

  viewBox(s){ return '0 0 ' + (s.n * CELL) + ' ' + (s.n * CELL); },

  // Render con selección en 3 fases (amazona -> destino -> flecha). `sel` es local a esta
  // invocación de render: persiste entre clics (los listeners llaman draw()), y se reinicia
  // cuando ui.js vuelve a renderizar un estado nuevo. El motor solo re-renderiza tras una jugada.
  render(svg, s, ctx){
    const n = s.n, cells = s.cells, R = CELL * 0.34;
    const sel = { from: null, to: null };
    const cx = (i) => (i % n) * CELL + CELL / 2, cy = (i) => ((i / n) | 0) * CELL + CELL / 2;

    const draw = () => {
      clear(svg);
      // vista tentativa: en fase 3, la amazona ya está en `to` y el origen vacío.
      const view = sel.to != null ? cells.slice() : cells;
      if (sel.to != null){ view[sel.from] = -1; view[sel.to] = s.turn; }

      // casillas (ajedrezado sutil) + contenido
      for (let i = 0; i < cells.length; i++){
        const r = (i / n) | 0, c = i % n;
        el('rect', { class: 'sq ' + ((r + c) % 2 ? 'sqB' : 'sqA'), x: c * CELL, y: r * CELL, width: CELL, height: CELL }, svg);
      }
      for (let i = 0; i < view.length; i++){
        if (view[i] === 2) el('rect', { class: 'burn', x: (i % n) * CELL + 5, y: ((i / n) | 0) * CELL + 5, width: CELL - 10, height: CELL - 10, rx: 4 }, svg);
        else if (view[i] === 0 || view[i] === 1) el('circle', { class: 'piece' + view[i], cx: cx(i), cy: cy(i), r: R }, svg);
      }

      if (!ctx.interactive) return;
      const turn = s.turn, rc = [];

      // resaltar la amazona en juego (origen o destino tentativo)
      if (sel.from != null) el('circle', { class: 'halo', cx: cx(sel.to != null ? sel.to : sel.from), cy: cy(sel.to != null ? sel.to : sel.from), r: R + 5 }, svg);
      if (ctx.hint && sel.from == null) el('circle', { class: 'halo', cx: cx(ctx.hint.from), cy: cy(ctx.hint.from), r: R + 5 }, svg);

      // amazonas propias seleccionables (fases 1 y 2: permite (re)elegir o cancelar)
      if (sel.to == null){
        for (let i = 0; i < cells.length; i++){
          if (cells[i] !== turn) continue;
          const o = el('circle', { class: 'pick', cx: cx(i), cy: cy(i), r: R + 2 }, svg);
          o.addEventListener('click', () => { sel.from = (sel.from === i ? null : i); sel.to = null; draw(); });
        }
      }

      // destinos de la amazona elegida (fase 2)
      if (sel.from != null && sel.to == null){
        reach(cells, n, sel.from, rc);
        for (const to of rc){
          const g = el('circle', { class: 'ghost g' + turn, cx: cx(to), cy: cy(to), r: R }, svg);
          g.addEventListener('click', () => { sel.to = to; draw(); });
        }
      }

      // casillas de flecha desde el destino tentativo (fase 3) -> completa la jugada
      if (sel.to != null){
        reach(view, n, sel.to, rc);
        for (const arrow of rc){
          const g = el('circle', { class: 'ghost garrow', cx: cx(arrow), cy: cy(arrow), r: R * 0.7 }, svg);
          g.addEventListener('click', () => { const m = { from: sel.from, to: sel.to, arrow }; sel.from = sel.to = null; ctx.onMove(m); });
        }
        // clic en la amazona tentativa: deshacer el destino
        const back = el('circle', { class: 'pick', cx: cx(sel.to), cy: cy(sel.to), r: R + 2 }, svg);
        back.addEventListener('click', () => { sel.to = null; draw(); });
      }
    };

    draw();
  },
};
