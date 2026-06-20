// contract_test.mjs — verificador de contrato GENÉRICO para cualquier juego del motor.
//   uso:  node juego/_engine/contract_test.mjs <slug>
// Comprueba invariantes que TODO juego debe cumplir (sin navegador): pureza de apply,
// jugadas legales, terminal/ganador coherentes, IA siempre legal, y que render() no lance
// con un DOM simulado. NO juzga la calidad de la IA, solo la corrección del contrato.

const slug = process.argv[2];
if (!slug){ console.error('uso: node contract_test.mjs <slug>'); process.exit(2); }

// --- DOM simulado mínimo para poder llamar a render() ---
function fakeNode(tag){
  return { tag, _a:{}, children:[], style:{},
    setAttribute(k,v){ this._a[k]=v; }, getAttribute(k){ return this._a[k]; },
    appendChild(c){ this.children.push(c); return c; }, addEventListener(){},
    get firstChild(){ return this.children[0]||null; },
    removeChild(c){ const i=this.children.indexOf(c); if(i>=0) this.children.splice(i,1); } };
}
globalThis.document = { createElementNS(_ns, tag){ return fakeNode(tag); } };

const juegoDir = new URL('../', import.meta.url);           // .../juego/
const { game }            = await import(new URL(slug + '/game.js', juegoDir).href);
const { chooseMove, solve } = await import(new URL('_engine/ai.js', juegoDir).href);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

ok(game && game.meta && game.meta.nombre, 'tiene meta.nombre');
ok(Array.isArray(game.configs) && game.configs.length >= 1, 'tiene >=1 config');
ok(Array.isArray(game.meta.players) && game.meta.players.length === 2, 'tiene 2 jugadores definidos');

for (const cf of (game.configs || [])){
  const tag = '[' + cf.key + '] ';
  let s = game.initial(cf.key);
  ok(s != null, tag + 'initial() devuelve estado');

  // serializable (necesario para key/inmutabilidad)
  let snap;
  try { snap = JSON.stringify(s); ok(true, tag + 'estado serializable'); }
  catch { ok(false, tag + 'estado NO serializable (usa arrays/objetos planos)'); continue; }

  ok([0,1].includes(game.current(s)), tag + 'current() es 0 o 1');
  ok(game.winner(s) === null || game.isTerminal(s), tag + 'winner()=null si no es terminal');

  const moves = game.legalMoves(s);
  ok(Array.isArray(moves), tag + 'legalMoves() es array');
  ok(JSON.stringify(s) === snap, tag + 'legalMoves() no muta el estado');

  ok(typeof game.viewBox(s) === 'string' && game.viewBox(s).indexOf('0 0') === 0, tag + 'viewBox() válido');

  // render no lanza con DOM simulado
  try { game.render(fakeNode('svg'), s, { interactive:true, hint:null, onMove(){}, svg:fakeNode('svg'), state:s }); ok(true, tag + 'render() no lanza'); }
  catch(e){ ok(false, tag + 'render() LANZA: ' + e.message); }

  // pureza de apply
  if (moves.length){
    const before = JSON.stringify(s);
    const s2 = game.apply(s, moves[0]);
    ok(JSON.stringify(s) === before, tag + 'apply() no muta el estado original');
    ok(s2 !== s, tag + 'apply() devuelve un estado NUEVO');
  }

  // key determinista
  if (game.key) ok(game.key(s) === game.key(game.initial(cf.key)), tag + 'key() determinista');

  // 30 partidas aleatorias hasta terminal
  let played = 0, badWinner = 0, notEmpty = 0;
  for (let t = 0; t < 30; t++){
    let st = game.initial(cf.key), guard = 0;
    while (!game.isTerminal(st) && guard++ < 2000){
      const ms = game.legalMoves(st);
      if (!ms.length) break;
      st = game.apply(st, ms[(Math.random()*ms.length)|0]);
    }
    played++;
    if (!game.isTerminal(st)) notEmpty++;
    if (game.legalMoves(st).length !== 0) notEmpty++;
    const w = game.winner(st);
    if (w !== 0 && w !== 1) badWinner++;
  }
  ok(notEmpty === 0, tag + 'todas las partidas llegan a terminal sin jugadas');
  ok(badWinner === 0, tag + 'ganador siempre 0 o 1 en terminal');

  // IA siempre legal
  let aiBad = 0, st = game.initial(cf.key);
  for (let k = 0; k < 8 && !game.isTerminal(st); k++){
    const m = chooseMove(game, st, { depth: 2, randomness: 0 });
    if (!game.legalMoves(st).some(x => JSON.stringify(x) === JSON.stringify(m))) aiBad++;
    else st = game.apply(st, m);
  }
  ok(aiBad === 0, tag + 'IA siempre juega legal');

  // solver exacto coherente donde aplique
  if (game.exactOK && game.exactOK(game.initial(cf.key))){
    const r = solve(game, game.initial(cf.key));
    ok(typeof r.winnerIsCurrent === 'boolean', tag + 'solve() devuelve veredicto');
  }
}

console.log(slug + ': ' + pass + ' OK, ' + fail + ' fallos');
process.exit(fail ? 1 : 0);
