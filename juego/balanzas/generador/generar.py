"""Regenera «Balanzas imposibles»: dibuja las láminas, comprueba cada acertijo y monta la página.

Uso (desde cualquier carpeta):
    python3 juego/balanzas/generador/generar.py

Requiere sympy (pip install sympy). Para cada lámina:
  1. Dibuja el SVG en generador/svg/.
  2. Saca las ecuaciones del mismo código que dibuja (cada viga registra sus cargas)
     y comprueba que la solución es única, positiva y que coincide con la respuesta de datos.py.
  3. Comprueba que no sobra ninguna ecuación: si se quita cualquiera, deja de haber solución única.
Si todo cuadra, escribe juego/balanzas/index.html (la colección) y una página por lámina
(juego/balanzas/<id>/index.html), más tarjetas.json para regenerar las imágenes con tarjetas.cjs.
Si algo falla, no toca ninguna página.
"""
import importlib
import json
import os
import sys

import sympy as sp

AQUI = os.path.dirname(os.path.abspath(__file__))
os.chdir(AQUI)
sys.path.insert(0, AQUI)

from datos import PUZLES  # noqa: E402
import build_page  # noqa: E402

MODULOS = {
    "taller": "p2_taller", "nieve": "p3_nieve", "circo": "p4_circo", "selva": "p5_selva",
    "golosinas": "p6_golosinas", "laboratorio": "p7_laboratorio", "castillo": "p8_castillo",
    "mar": "p9_mar", "jardin": "p10_jardin",
}
UNIDADES = {"tuerca", "regalo", "bolo", "coco", "caramelo", "iman", "corona", "estrella", "zanahoria"}


def resolver(ecuaciones, simbolos, unidad):
    sol = sp.solve([sp.Eq(e, 0) for e in ecuaciones] + [sp.Eq(unidad, 1)], simbolos, dict=True)
    if len(sol) != 1 or len(sol[0]) != len(simbolos):
        return None
    if not all(v.is_number and v > 0 for v in sol[0].values()):
        return None
    return sol[0]


def comprobar(P):
    m = importlib.import_module(MODULOS[P["id"]])
    sc, _ = m.build()
    with open(P["svg"], "w", encoding="utf-8") as fh:
        fh.write(sc.svg(P["pregunta"]))
    ecs = sc.equations()
    simbolos = sorted({s for e in ecs for s in e.free_symbols}, key=str)
    unidad = next(s for s in simbolos if str(s) in UNIDADES)
    sol = resolver(ecs, simbolos, unidad)
    if sol is None:
        return "no tiene solución única positiva"
    x = next(v for k, v in sol.items() if str(k) == "x")
    if x != P["respuesta"]:
        return f"la respuesta es {x}, pero datos.py dice {P['respuesta']}"
    # ninguna ecuación sobra (salvo la de la viga de la caja, que solo fija x)
    for j in range(len(ecs)):
        if resolver(ecs[:j] + ecs[j + 1:], simbolos, unidad) is not None:
            return f"la ecuación {j + 1} sobra: el acertijo se resuelve sin ella"
    return None


def main():
    os.makedirs("svg", exist_ok=True)
    errores = []
    for P in PUZLES:
        if P["id"] == "puerto":
            import p1_puerto
            import p1_ecuaciones
            with open(P["svg"], "w", encoding="utf-8") as fh:
                fh.write(p1_puerto.build())
            x = p1_ecuaciones.resolver()
            fallo = None if x == P["respuesta"] else f"la respuesta es {x}, pero datos.py dice {P['respuesta']}"
        else:
            fallo = comprobar(P)
        print(f"{P['num']:>2}. {P['titulo']:<26} {'OK' if not fallo else 'ERROR: ' + fallo}")
        if fallo:
            errores.append(P["titulo"])
    if errores:
        print("\nNo se ha regenerado la página: revisa", ", ".join(errores))
        sys.exit(1)
    build_page.build(os.path.join("..", "index.html"), web=True)
    # una página por lámina, para compartirlas por separado
    for P in PUZLES:
        carpeta = os.path.join("..", P["id"])
        os.makedirs(carpeta, exist_ok=True)
        build_page.build_single(P, os.path.join(carpeta, "index.html"))
    print("páginas individuales:", ", ".join(P["id"] for P in PUZLES))
    # lista para tarjetas.cjs (imágenes al compartir)
    base = "spyder-cripto.github.io/problema-del-dia/juego/balanzas/"
    tarjetas = [dict(svg="svg/04-circo.svg", titulo="Balanzas imposibles", kicker="El problema del día",
                     texto="10 acertijos de equilibrio con poleas, rampas, tornos y globos. Una sola respuesta.",
                     pregunta="¿Cuántos bolos debe haber en el baúl?", url=base,
                     preview="../preview.jpg", estado="../../../estado_balanzas.png")]
    for P in PUZLES:
        tarjetas.append(dict(svg=P["svg"], titulo=P["titulo"], kicker="Acertijo de balanzas",
                             texto=P["pregunta"], pregunta=P["pregunta"], url=base + P["id"] + "/",
                             preview=f"../{P['id']}/preview.jpg", estado=f"../{P['id']}/estado.png"))
    with open("tarjetas.json", "w", encoding="utf-8") as fh:
        json.dump(tarjetas, fh, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
