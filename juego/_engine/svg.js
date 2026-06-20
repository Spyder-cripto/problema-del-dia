// _engine/svg.js — helpers mínimos para construir SVG por DOM (cero dependencias).
export const NS = 'http://www.w3.org/2000/svg';

// Crea un elemento SVG con atributos y lo cuelga (opcional) de un padre.
export function el(tag, attrs, parent){
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs){ const v = attrs[k]; if (v != null) e.setAttribute(k, v); }
  if (parent) parent.appendChild(e);
  return e;
}

// Vacía un nodo (más rápido que innerHTML='' para SVG).
export function clear(node){ while (node.firstChild) node.removeChild(node.firstChild); }
