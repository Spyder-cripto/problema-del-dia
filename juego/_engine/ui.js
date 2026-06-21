// _engine/ui.js — cromo de página compartido: monta cabecera, controles, tablero SVG,
// leyenda, ayuda y pie a partir de un objeto `game`. Conecta controlador + IA + render.
import { createController, other } from './core.js';
import { chooseMove, solve, deepScore, aiMove } from './ai.js';

const DIFFS = {
  facil:   { label: 'Fácil',   depth: 2, randomness: 0.40, timeMs: 700 },
  media:   { label: 'Media',   depth: 4, randomness: 0.10, timeMs: 1500 },
  dificil: { label: 'Difícil', depth: 8, randomness: 0,    timeMs: 2500 },
};

export function mount(root, game){
  const players  = game.meta.players;
  const aiPlayer = (game.meta.aiPlayer != null) ? game.meta.aiPlayer : 1;
  const params   = new URLSearchParams(location.search);
  const ctrl     = createController(game, params.get('pos'));

  let mode = '2p', diff = 'media', hint = null, thinking = false;

  const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const button = (txt) => { const b = document.createElement('button'); b.textContent = txt; return b; };
  const sel = (opts, val) => { const s = document.createElement('select'); opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; s.appendChild(o); }); if (val != null) s.value = val; return s; };

  // ---------- construir DOM ----------
  root.innerHTML = '';
  const wrap = h('div', 'wrap');

  const header = h('header');
  header.appendChild(h('h1', null, game.meta.nombre));
  if (game.meta.subtitulo) header.appendChild(h('p', 'sub', game.meta.subtitulo));
  const back = { href: '../', label: '← Volver a los juegos' };
  const aback = h('a', 'back', back.label); aback.href = back.href; header.appendChild(aback);
  wrap.appendChild(header);

  const card = h('div', 'card');
  const c1 = h('div', 'controls');
  const g1 = h('div', 'grp');
  let selPos = null;
  if (game.configs && game.configs.length > 1){
    g1.appendChild(h('label', 'lab', 'Tablero'));
    selPos = sel(game.configs.map(c => [c.key, c.label]), ctrl.config);
    g1.appendChild(selPos);
  }
  const g2 = h('div', 'grp');
  g2.appendChild(h('label', 'lab', 'Modo'));
  const selMode = sel([['2p', '2 jugadores'], ['ai', 'Contra la máquina']], '2p');
  const selDiff = sel(Object.keys(DIFFS).map(k => [k, DIFFS[k].label]), 'media');
  selDiff.style.display = 'none';
  g2.appendChild(selMode); g2.appendChild(selDiff);
  c1.appendChild(g1); c1.appendChild(g2); card.appendChild(c1);

  const c2 = h('div', 'controls');
  const g3 = h('div', 'grp');
  const bHint = button('💡 Pista'), bWho = button('⚖️ ¿Quién gana?');
  g3.appendChild(bHint); g3.appendChild(bWho);
  const g4 = h('div', 'grp');
  const bUndo = button('↶ Deshacer'), bReset = button('⟳ Reiniciar'), bShare = button('🔗');
  bShare.title = 'Copia un enlace a este tablero';
  g4.appendChild(bUndo); g4.appendChild(bReset); g4.appendChild(bShare);
  c2.appendChild(g3); c2.appendChild(g4); card.appendChild(c2);

  const status = h('div', 'status'); status.id = 'status'; card.appendChild(status);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'board'; card.appendChild(svg);
  const legend = h('div', 'legend'); legend.innerHTML = game.meta.legend || ''; card.appendChild(legend);
  wrap.appendChild(card);

  if (game.meta.help){ const hc = h('div', 'card'); hc.appendChild(h('h2', null, 'Cómo se juega')); const d = document.createElement('div'); d.innerHTML = game.meta.help; hc.appendChild(d); wrap.appendChild(hc); }
  const foot = h('footer'); foot.innerHTML = game.meta.footer || 'Hecho con cariño · <a href="../../">El problema del día</a>'; wrap.appendChild(foot);
  root.appendChild(wrap);

  // ---------- lógica ----------
  function statusText(){
    if (thinking) return 'La máquina piensa…';
    if (ctrl.terminal()){ const w = ctrl.winner(); return 'Gana <b style="color:' + players[w].color + '">' + players[w].nombre + '</b> 🏆'; }
    const cur = ctrl.current();
    let tag = '';
    if (mode === 'ai') tag = (cur === aiPlayer) ? ' <span class="lab">(máquina)</span>' : ' <span class="lab">(tú)</span>';
    return 'Turno de <b style="color:' + players[cur].color + '">' + players[cur].nombre + '</b>' + (players[cur].desc ? ' ' + players[cur].desc : '') + tag;
  }

  function render(){
    const s = ctrl.state;
    svg.setAttribute('viewBox', game.viewBox(s));
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const terminal = ctrl.terminal(), cur = ctrl.current();
    const humanTurn = !terminal && !thinking && (mode === '2p' || cur !== aiPlayer);
    game.render(svg, s, { svg, state: s, interactive: humanTurn, hint, onMove: (m) => { if (humanTurn) doMove(m); } });
    status.innerHTML = statusText();
    bUndo.disabled = !ctrl.canUndo();
    bHint.disabled = terminal || !humanTurn;
  }

  function doMove(m){ hint = null; ctrl.move(m); render(); maybeAI(); }
  function maybeAI(){
    if (mode !== 'ai' || ctrl.terminal() || ctrl.current() !== aiPlayer) return;
    thinking = true; render();
    setTimeout(() => {
      const m = aiMove(game, ctrl.state, DIFFS[diff]);   // despacho por driver (negamax / custom)
      thinking = false;
      if (m) ctrl.move(m);
      render(); maybeAI();
    }, 240);
  }

  if (selPos) selPos.addEventListener('change', () => { ctrl.reset(selPos.value); hint = null; thinking = false; render(); maybeAI(); });
  selMode.addEventListener('change', () => { mode = selMode.value; selDiff.style.display = mode === 'ai' ? '' : 'none'; ctrl.reset(); hint = null; thinking = false; render(); maybeAI(); });
  selDiff.addEventListener('change', () => { diff = selDiff.value; });
  bUndo.addEventListener('click', () => {
    if (thinking) return;
    ctrl.undo();
    if (mode === 'ai' && !ctrl.terminal() && ctrl.current() === aiPlayer && ctrl.canUndo()) ctrl.undo();
    hint = null; render();
  });
  bReset.addEventListener('click', () => { ctrl.reset(); hint = null; thinking = false; render(); maybeAI(); });
  bShare.addEventListener('click', () => { const u = new URL(location.href); u.searchParams.set('pos', ctrl.config); if (navigator.clipboard) navigator.clipboard.writeText(u.toString()); status.innerHTML = 'Enlace copiado 🔗'; });
  bWho.addEventListener('click', whoWins);
  bHint.addEventListener('click', showHint);

  function showHint(){
    const s = ctrl.state;
    if (ctrl.terminal()) return;
    if (game.hintMove){                                 // el juego aporta su propia pista (driver custom)
      hint = game.hintMove(s); render();
      status.innerHTML = hint != null ? 'Pista: la jugada que la máquina sugiere.' : 'No hay pista disponible.';
      return;
    }
    if (game.exactOK && game.exactOK(s)){
      let mv = null;
      const moves = game.legalMoves(s);
      for (let i = 0; i < moves.length; i++){ const r = solve(game, game.apply(s, moves[i])); if (!r.capped && r.winnerIsCurrent === false){ mv = moves[i]; break; } }
      hint = mv; render();
      status.innerHTML = mv ? 'Pista: <b>esta jugada gana</b> con juego perfecto.' : 'Pista: vas <b>perdiendo</b> con juego perfecto — aguanta lo que puedas.';
      return;
    }
    hint = chooseMove(game, s, { depth: 8, randomness: 0, timeMs: 2500 }); render();
    status.innerHTML = 'Pista: la jugada que la máquina cree mejor.';
  }
  function whoWins(){
    const s = ctrl.state;
    if (game.analysis){                                 // el juego aporta su propio análisis (driver custom)
      status.innerHTML = 'Calculando…';
      setTimeout(() => { status.innerHTML = game.analysis(s, players); }, 30);  // deja pintar el aviso antes de un cálculo largo
      return;
    }
    if (game.exactOK && game.exactOK(s)){
      const r = solve(game, s);
      if (!r.capped){ const w = r.winnerIsCurrent ? ctrl.current() : other(ctrl.current()); status.innerHTML = 'Con juego perfecto gana <b style="color:' + players[w].color + '">' + players[w].nombre + '</b>.'; return; }
    }
    const sc = deepScore(game, s, 4, 1500), cur = ctrl.current();
    const lead = sc > 0 ? cur : other(cur);
    status.innerHTML = '(Tablero grande para resolverlo exacto.) La máquina cree que va mejor <b style="color:' + players[lead].color + '">' + players[lead].nombre + '</b>.';
  }

  render(); maybeAI();
}
