// buscaminas/logic.js — lógica PURA de Buscaminas (sin DOM): generador con garantía «sin
// adivinar» + solver de deducción (recuento + subconjuntos) + estado del juego. Solitario, no
// usa el motor _engine/ (es de otra naturaleza). Testeable con node.
//
// Garantía: tras el primer clic, el tablero se genera de modo que (1) el primer clic es SEGURO
// y en APERTURA (un 0), y (2) TODO el tablero es resoluble por pura lógica, sin tirar a suerte.

// vecinos (8) de cada celda, cacheados por dimensión.
export function neighborsOf(W, H){
  const NB = new Array(W * H);
  for (let i = 0; i < W * H; i++){
    const r = (i / W) | 0, c = i % W, out = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++){
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < H && nc >= 0 && nc < W) out.push(nr * W + nc);
    }
    NB[i] = out;
  }
  return NB;
}

// ¿el tablero se resuelve desde `first` con deducción de recuento + subconjuntos, sin adivinar?
export function solvable(W, H, mines, num, first, NB){
  const N = W * H, state = new Int8Array(N);   // 0=oculto, 1=revelado, 2=mina deducida
  const reveal = (start) => { const fl = [start]; while (fl.length){ const x = fl.pop(); if (state[x] !== 0) continue; state[x] = 1; if (num[x] === 0) for (const k of NB[x]) if (state[k] === 0) fl.push(k); } };
  reveal(first);
  let progress = true;
  while (progress){
    progress = false;
    // (1) recuento, hasta atascarse
    let p1 = true;
    while (p1){
      p1 = false;
      for (let i = 0; i < N; i++){
        if (state[i] !== 1) continue;
        let f = 0; const h = [];
        for (const j of NB[i]){ if (state[j] === 2) f++; else if (state[j] === 0) h.push(j); }
        if (!h.length) continue;
        const need = num[i] - f;
        if (need === 0){ for (const j of h) reveal(j); p1 = progress = true; }
        else if (need === h.length){ for (const j of h) state[j] = 2; p1 = progress = true; }
      }
    }
    // (2) subconjuntos: A.ocultos ⊂ B.ocultos -> minas en B\A = need_B - need_A
    const cons = [];
    for (let i = 0; i < N; i++){
      if (state[i] !== 1) continue;
      let f = 0; const h = [];
      for (const j of NB[i]){ if (state[j] === 2) f++; else if (state[j] === 0) h.push(j); }
      if (h.length) cons.push({ set: new Set(h), list: h, need: num[i] - f });
    }
    for (let a = 0; a < cons.length; a++) for (let b = 0; b < cons.length; b++){
      if (a === b) continue;
      const A = cons[a], B = cons[b];
      if (A.list.length >= B.list.length) continue;
      let sub = true; for (const x of A.list) if (!B.set.has(x)){ sub = false; break; }
      if (!sub) continue;
      const diff = B.list.filter(x => !A.set.has(x)), nd = B.need - A.need;
      if (nd === 0){ for (const x of diff) if (state[x] === 0){ reveal(x); progress = true; } }
      else if (nd === diff.length){ for (const x of diff) if (state[x] === 0){ state[x] = 2; progress = true; } }
    }
  }
  let rev = 0; for (let i = 0; i < N; i++) if (state[i] === 1) rev++;
  return rev === N - mines.size;
}

// Genera {mines,num} garantizando first seguro+apertura+resoluble. rng() -> [0,1).
export function generate(W, H, M, first, rng, NB){
  NB = NB || neighborsOf(W, H);
  const N = W * H, forbidden = new Set([first, ...NB[first]]);
  const base = []; for (let i = 0; i < N; i++) if (!forbidden.has(i)) base.push(i);
  for (let attempt = 1; attempt <= 200000; attempt++){
    for (let i = base.length - 1; i > 0; i--){ const j = (rng() * (i + 1)) | 0; const t = base[i]; base[i] = base[j]; base[j] = t; }
    const mines = new Set(base.slice(0, M));
    const num = new Int16Array(N);
    for (let i = 0; i < N; i++){ if (mines.has(i)){ num[i] = -1; continue; } let k = 0; for (const j of NB[i]) if (mines.has(j)) k++; num[i] = k; }
    if (solvable(W, H, mines, num, first, NB)) return { mines, num, attempts: attempt };
  }
  return null;   // la tasa medida es >0 en las 3 dificultades; null sería un error de configuración
}

// Controlador de partida (sin DOM). El tablero se genera en el PRIMER reveal (alrededor del clic).
export function createGame(W, H, M){
  const N = W * H, NB = neighborsOf(W, H);
  const state = new Int8Array(N);   // 0=oculto, 1=revelado, 2=bandera
  let mines = null, num = null, generated = false;
  let status = 'ready', revealed = 0, attempts = 0, lostAt = -1;

  function flood(i){
    const fl = [i];
    while (fl.length){ const x = fl.pop(); if (state[x] !== 0) continue; state[x] = 1; revealed++; if (num[x] === 0) for (const k of NB[x]) if (state[k] === 0) fl.push(k); }
  }
  function checkWin(){ if (revealed === N - M) status = 'won'; }

  return {
    W, H, M, N, NB,
    get status(){ return status; },
    get mines(){ return mines; },
    get lostAt(){ return lostAt; },
    get attempts(){ return attempts; },
    num(i){ return num ? num[i] : 0; },
    cell(i){ return state[i]; },                                   // 0 oculto, 1 revelado, 2 bandera
    flags(){ let f = 0; for (let i = 0; i < N; i++) if (state[i] === 2) f++; return f; },
    minesLeft(){ return M - this.flags(); },

    reveal(i, rng){
      if (status === 'won' || status === 'lost') return;
      if (state[i] === 2) return;                                  // bandera: protegida
      if (!generated){                                             // primer clic: genera alrededor
        const g = generate(W, H, M, i, rng || Math.random, NB);
        mines = g.mines; num = g.num; attempts = g.attempts; generated = true; status = 'playing';
      }
      if (state[i] === 1) return this.chord(i);                    // clic en número: acorde
      if (mines.has(i)){ state[i] = 1; status = 'lost'; lostAt = i; return; }
      flood(i); checkWin();
    },

    // "acorde": clic en un número con tantas banderas como su valor -> revela los ocultos restantes.
    chord(i){
      if (status !== 'playing' || state[i] !== 1 || num[i] <= 0) return;
      let f = 0; const hid = [];
      for (const k of NB[i]){ if (state[k] === 2) f++; else if (state[k] === 0) hid.push(k); }
      if (f !== num[i] || !hid.length) return;
      for (const k of hid) if (mines.has(k)){ state[k] = 1; status = 'lost'; lostAt = k; return; }
      for (const k of hid) flood(k); checkWin();
    },

    toggleFlag(i){
      if (status === 'won' || status === 'lost' || !generated) return;
      if (state[i] === 1) return;
      state[i] = state[i] === 2 ? 0 : 2;
    },
  };
}

export const DIFFS = {
  facil:  { label: 'Principiante', W: 9,  H: 9,  M: 10 },
  media:  { label: 'Intermedio',   W: 16, H: 16, M: 40 },
  dificil:{ label: 'Experto',      W: 30, H: 16, M: 99 },
};
