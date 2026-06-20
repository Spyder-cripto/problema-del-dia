// _engine/core.js — núcleo lógico común a todos los juegos. SIN DOM, SIN IA.
//
// CONTRATO de un juego (objeto `game`):
//   meta        : { nombre, slug, subtitulo, players:[{nombre,color,corto,desc}], aiPlayer, legend, help, back, footer }
//   configs     : [ { key, label, ... } ]   // variantes/tableros seleccionables (>=1)
//   initial(cfg)            -> state         // estado INMUTABLE inicial para esa config
//   current(state)          -> 0 | 1         // jugador al que le toca (0 = primero)
//   legalMoves(state)       -> [move, ...]   // jugadas legales del jugador en turno
//   apply(state, move)      -> state'        // PURO: devuelve un estado NUEVO (no muta)
//   isTerminal(state)       -> bool
//   winner(state)           -> 0 | 1 | null  // ganador si terminal (juego normal: gana el último que movió)
//   evaluate(state, player) -> number        // heurística desde la óptica de `player` (para la IA)
//   render(svg, state, ctx) -> void          // dibuja; ctx = { interactive, hint, onMove }
//   key?(state)             -> string        // clave de transposición (para el solver exacto)
//   exactOK?(state)         -> bool          // ¿es seguro resolverlo exacto (tablero pequeño)?
//   viewBox(state)          -> "x y w h"

export function other(p){ return p === 0 ? 1 : 0; }

// Pequeña máquina de estados con historial (deshacer). No toca el DOM ni la IA.
export function createController(game, configKey){
  const has = (k) => !game.configs || game.configs.some(c => c.key === k);
  let config = (configKey != null && has(configKey)) ? configKey
             : (game.configs && game.configs[0] ? game.configs[0].key : null);
  let state = game.initial(config);
  const history = [];
  return {
    get state(){ return state; },
    get config(){ return config; },
    canUndo(){ return history.length > 0; },
    current(){ return game.current(state); },
    legal(){ return game.legalMoves(state); },
    terminal(){ return game.isTerminal(state); },
    winner(){ return game.winner(state); },
    move(m){ history.push(state); state = game.apply(state, m); return state; },
    undo(){ if (history.length) state = history.pop(); return state; },
    reset(cfg){ if (cfg != null && has(cfg)) config = cfg; state = game.initial(config); history.length = 0; return state; },
  };
}
