// solver.mjs — ORÁCULO BFS para los dos acertijos de cruce de río (port fiel de mc_solver.py y
// mc_island_solver.py). Da el óptimo y, desde CUALQUIER estado legal, la distancia mínima a meta
// (para "pista = siguiente movimiento óptimo"). Cero dependencias; corre en node y en el navegador.

// ---------- Variante REMEROS (acertijo 1: solo algunos saben remar; regla también en la barca) ----------
// Estado [mnL, mrL, cnL, crL, side]: misioneros/caníbales NO-remeros y remeros en la orilla IZQ + lado barca.
export function safeBank(m, c){ return m === 0 || c <= m; }

export function solveRowers(M, C, MR, CR, b){
  const Mn = M - MR, Cn = C - CR;
  const start = [Mn, MR, Cn, CR, 0];
  const goalKey = '0,0,0,0,1';
  const banks = (s) => { const mL = s[0] + s[1], cL = s[2] + s[3]; return [mL, cL, M - mL, C - cL]; };
  const q = [start]; const prev = new Map(); prev.set(start.join(','), [null, null]);
  let head = 0;
  while (head < q.length){
    const s = q[head++]; const sk = s.join(',');
    if (sk === goalKey){
      const path = []; let cur = sk;
      while (prev.get(cur)[0] !== null){ const [p, mv] = prev.get(cur); path.push(mv); cur = p; }
      path.reverse(); return { n: path.length, path };
    }
    const [mnL, mrL, cnL, crL, side] = s;
    const [mL, cL, mR, cR] = banks(s);
    let availMn, availMr, availCn, availCr;
    if (side === 0){ availMn = mnL; availMr = mrL; availCn = cnL; availCr = crL; }
    else { const mrR = MR - mrL, crR = CR - crL; availMn = mR - mrR; availMr = mrR; availCn = cR - crR; availCr = crR; }
    for (let amn = 0; amn <= availMn; amn++)
    for (let amr = 0; amr <= availMr; amr++)
    for (let acn = 0; acn <= availCn; acn++)
    for (let acr = 0; acr <= availCr; acr++){
      const tot = amn + amr + acn + acr;
      if (tot < 1 || tot > b) continue;
      if (amr + acr < 1) continue;                 // al menos un remero
      if (!safeBank(amn + amr, acn + acr)) continue; // barca segura
      const ns = side === 0
        ? [mnL - amn, mrL - amr, cnL - acn, crL - acr, 1]
        : [mnL + amn, mrL + amr, cnL + acn, crL + acr, 0];
      const [nmL, ncL, nmR, ncR] = banks(ns);
      if (!safeBank(nmL, ncL) || !safeBank(nmR, ncR)) continue;
      const nk = ns.join(',');
      if (!prev.has(nk)){ prev.set(nk, [sk, [amn, amr, acn, acr, side]]); q.push(ns); }
    }
  }
  return null;
}

// verificador independiente del camino de remeros
export function verifyRowers(M, C, MR, CR, b, path){
  let mnL = M - MR, mrL = MR, cnL = C - CR, crL = CR, side = 0;
  for (const [amn, amr, acn, acr, mvSide] of path){
    if (mvSide !== side) return false;
    const tot = amn + amr + acn + acr;
    if (tot < 1 || tot > b) return false;
    if (amr + acr < 1) return false;
    if (!safeBank(amn + amr, acn + acr)) return false;
    if (side === 0){
      mnL -= amn; mrL -= amr; cnL -= acn; crL -= acr; side = 1;
    } else {
      mnL += amn; mrL += amr; cnL += acn; crL += acr; side = 0;
    }
    if (mnL < 0 || mrL < 0 || cnL < 0 || crL < 0) return false;
    const mL = mnL + mrL, cL = cnL + crL;
    if (!safeBank(mL, cL) || !safeBank(M - mL, C - cL)) return false;
  }
  return mnL === 0 && mrL === 0 && cnL === 0 && crL === 0 && side === 1;
}

// ---------- Variante ISLOTE (acertijo 2: relevo en el islote; regla en las 3 ubicaciones) ----------
// Estado [mL, cL, mI, cI, boat]; los de la derecha se deducen de los totales.
export function solveIsland(M, C, b){
  const start = [M, C, 0, 0, 0];
  const goalKey = '0,0,0,0,2';
  const peopleAt = (s, loc) => {
    if (loc === 0) return [s[0], s[1]];
    if (loc === 1) return [s[2], s[3]];
    return [M - s[0] - s[2], C - s[1] - s[3]];
  };
  const allSafe = (s) => { for (const loc of [0, 1, 2]){ const [m, c] = peopleAt(s, loc); if (!safeBank(m, c)) return false; } return true; };
  const q = [start]; const prev = new Map(); prev.set(start.join(','), [null, null]);
  let head = 0;
  while (head < q.length){
    const s = q[head++]; const sk = s.join(',');
    if (sk === goalKey){
      const path = []; let cur = sk;
      while (prev.get(cur)[0] !== null){ const [p, mv] = prev.get(cur); path.push(mv); cur = p; }
      path.reverse(); return { n: path.length, path };
    }
    const [mL, cL, mI, cI, boat] = s;
    const [mHere, cHere] = peopleAt(s, boat);
    for (const dest of [boat - 1, boat + 1]){
      if (dest < 0 || dest > 2) continue;
      for (let am = 0; am <= mHere; am++)
      for (let ac = 0; ac <= cHere; ac++){
        const tot = am + ac;
        if (tot < 1 || tot > b) continue;
        if (!safeBank(am, ac)) continue;            // barca segura
        const d = [mL, cL, mI, cI];
        const add = (loc, dm, dc) => { if (loc === 0){ d[0] += dm; d[1] += dc; } else if (loc === 1){ d[2] += dm; d[3] += dc; } };
        add(boat, -am, -ac); add(dest, am, ac);
        const ns = [d[0], d[1], d[2], d[3], dest];
        if (!allSafe(ns)) continue;
        const nk = ns.join(',');
        if (!prev.has(nk)){ prev.set(nk, [sk, [am, ac, boat, dest]]); q.push(ns); }
      }
    }
  }
  return null;
}

export function verifyIsland(M, C, b, path){
  let mL = M, cL = C, mI = 0, cI = 0, boat = 0;
  const safeAll = () => { const mR = M - mL - mI, cR = C - cL - cI; return safeBank(mL, cL) && safeBank(mI, cI) && safeBank(mR, cR); };
  for (const [am, ac, o, dst] of path){
    if (o !== boat) return false;
    if (am + ac < 1 || am + ac > b) return false;
    if (!safeBank(am, ac)) return false;
    if (o === 0){ mL -= am; cL -= ac; } else if (o === 1){ mI -= am; cI -= ac; } // o===2: deducido
    if (dst === 0){ mL += am; cL += ac; } else if (dst === 1){ mI += am; cI += ac; }
    boat = dst;
    if (mL < 0 || cL < 0 || mI < 0 || cI < 0) return false;
    if (!safeAll()) return false;
  }
  return mL === 0 && cL === 0 && mI === 0 && cI === 0 && boat === 2;
}

// (Verificación en verify.mjs — este módulo queda puro para importar en el navegador.)
