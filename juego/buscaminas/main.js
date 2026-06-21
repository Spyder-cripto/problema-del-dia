// buscaminas/main.js — UI del Buscaminas (solitario, sin el motor _engine/). Construye la página,
// la cuadrícula y maneja clics (revelar / bandera), timer, contador y reinicio. La lógica y el
// generador «sin adivinar» están en logic.js.
import { createGame, DIFFS } from './logic.js';

const root = document.getElementById('app');
const NUMCOL = [null, 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'];

let diff = 'facil', game = null, cells = [], timer = null, secs = 0, flagMode = false;
let elGrid, elMines, elTime, elFace, elFlagBtn;

const h = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

function startTimer(){ if (timer) return; timer = setInterval(() => { secs++; if (elTime) elTime.textContent = String(secs).padStart(3, '0'); }, 1000); }
function stopTimer(){ if (timer){ clearInterval(timer); timer = null; } }

function newGame(){
  const d = DIFFS[diff];
  game = createGame(d.W, d.H, d.M);
  secs = 0; stopTimer();
  buildGrid();
  updateInfo();
}

function buildGrid(){
  elGrid.style.gridTemplateColumns = `repeat(${game.W}, var(--ms))`;
  elGrid.innerHTML = ''; cells = new Array(game.N);
  for (let i = 0; i < game.N; i++){
    const c = h('button', 'ms-cell ms-hidden');
    c.addEventListener('click', () => onCell(i));
    c.addEventListener('contextmenu', (e) => { e.preventDefault(); onFlag(i); });
    elGrid.appendChild(c); cells[i] = c;
  }
  paint();
}

function onCell(i){
  if (game.status === 'won' || game.status === 'lost') return;
  if (flagMode){ onFlag(i); return; }
  game.reveal(i, Math.random);
  if (game.status === 'playing') startTimer();
  if (game.status === 'won' || game.status === 'lost') stopTimer();
  paint(); updateInfo();
}
function onFlag(i){
  if (game.status === 'won' || game.status === 'lost') return;
  game.toggleFlag(i);
  paint(); updateInfo();
}

function paint(){
  const lost = game.status === 'lost', won = game.status === 'won', mines = game.mines;
  for (let i = 0; i < game.N; i++){
    const c = cells[i], st = game.cell(i);
    c.className = 'ms-cell';
    c.textContent = '';
    if (st === 1){                                   // revelada
      const n = game.num(i);
      if (n < 0){ c.classList.add('ms-open', 'ms-mine', i === game.lostAt ? 'ms-boom' : 'ms-x'); c.textContent = '💣'; }
      else { c.classList.add('ms-open'); if (n > 0){ c.classList.add('ms-' + NUMCOL[n]); c.textContent = n; } }
    } else if (st === 2){                            // bandera
      c.classList.add('ms-hidden', 'ms-flag');
      if (lost && mines && !mines.has(i)){ c.classList.remove('ms-flag'); c.classList.add('ms-wrong'); c.textContent = '❌'; }
      else c.textContent = '🚩';
    } else {                                         // oculta
      c.classList.add('ms-hidden');
      if ((lost || won) && mines && mines.has(i)){ c.textContent = won ? '🚩' : '💣'; if (won) c.classList.add('ms-flag'); else c.classList.add('ms-mine-rev'); }
    }
  }
}

function updateInfo(){
  if (elMines) elMines.textContent = String(game.minesLeft()).padStart(3, '0');
  if (elTime) elTime.textContent = String(secs).padStart(3, '0');
  if (elFace) elFace.textContent = game.status === 'won' ? '😎' : game.status === 'lost' ? '😵' : '🙂';
}

function build(){
  root.innerHTML = '';
  const wrap = h('div', 'wrap');

  const header = h('header');
  header.appendChild(h('h1', null, 'Buscaminas'));
  header.appendChild(h('p', 'sub', 'Despeja el campo con pura lógica — sin adivinar, sin trampas del azar'));
  const back = h('a', 'back', '← El problema del día'); back.href = '../../'; header.appendChild(back);
  wrap.appendChild(header);

  const card = h('div', 'card');

  // controles: dificultad + (móvil) modo bandera
  const c1 = h('div', 'controls');
  const g1 = h('div', 'grp');
  g1.appendChild(h('label', 'lab', 'Nivel'));
  const sel = document.createElement('select');
  for (const k of Object.keys(DIFFS)){ const o = document.createElement('option'); o.value = k; const d = DIFFS[k]; o.textContent = `${d.label} (${d.W}×${d.H}, ${d.M})`; sel.appendChild(o); }
  sel.value = diff;
  sel.addEventListener('change', () => { diff = sel.value; newGame(); });
  g1.appendChild(sel);
  const g2 = h('div', 'grp');
  elFlagBtn = document.createElement('button');
  const syncFlagBtn = () => { elFlagBtn.textContent = flagMode ? '🚩 Modo bandera' : '⛏️ Modo revelar'; elFlagBtn.classList.toggle('primary', flagMode); };
  elFlagBtn.addEventListener('click', () => { flagMode = !flagMode; syncFlagBtn(); });
  syncFlagBtn();
  g2.appendChild(elFlagBtn);
  c1.appendChild(g1); c1.appendChild(g2); card.appendChild(c1);

  // marcador: minas restantes · cara/reinicio · tiempo
  const score = h('div', 'ms-score');
  elMines = h('span', 'ms-counter', '000');
  elFace = h('button', 'ms-face', '🙂'); elFace.title = 'Nueva partida';
  elFace.addEventListener('click', () => newGame());
  elTime = h('span', 'ms-counter', '000');
  score.appendChild(elMines); score.appendChild(elFace); score.appendChild(elTime);
  card.appendChild(score);

  // cuadrícula (en contenedor con scroll para experto/móvil)
  const gridWrap = h('div', 'ms-gridwrap');
  elGrid = h('div', 'ms-grid');
  gridWrap.appendChild(elGrid); card.appendChild(gridWrap);

  const legend = h('div', 'legend');
  legend.innerHTML = 'Clic <b>izquierdo</b> para descubrir, clic <b>derecho</b> (o «Modo bandera») para marcar una mina. ' +
    'El número dice cuántas minas tocan esa casilla. <b>El primer clic siempre es seguro</b> y el tablero ' +
    '<b>se puede resolver sin adivinar</b>: si dudas, es que falta una deducción, no suerte.';
  card.appendChild(legend);
  wrap.appendChild(card);

  const help = h('div', 'card');
  help.appendChild(h('h2', null, 'Cómo se juega'));
  const hd = document.createElement('div');
  hd.innerHTML =
    '<p>Bajo el tablero hay minas escondidas. Descubre todas las casillas <b>sin mina</b> y ganas; ' +
    'si descubres una mina, pierdes. Cada número indica cuántas de las <b>ocho casillas vecinas</b> ' +
    'tienen mina; con eso se deduce dónde están.</p>' +
    '<p>Marca las minas con <b>bandera</b> (clic derecho o «Modo bandera» en móvil). Si haces clic en un ' +
    'número que ya tiene todas sus minas marcadas, se <b>despejan de golpe</b> las vecinas restantes (acorde).</p>' +
    '<p style="font-size:.95rem;color:var(--muted)">Este Buscaminas es <b>justo</b>: el generador garantiza que ' +
    'cada tablero se resuelve con <b>lógica pura</b> (recuento y subconjuntos), nunca por azar. No hay 50/50 ' +
    'injustos: si no ves la jugada, sigue mirando — siempre la hay.</p>';
  help.appendChild(hd); wrap.appendChild(help);

  const foot = h('footer'); foot.innerHTML = 'Buscaminas «sin adivinar» · <a href="../../">El problema del día</a>'; wrap.appendChild(foot);
  root.appendChild(wrap);
}

build();
newGame();
