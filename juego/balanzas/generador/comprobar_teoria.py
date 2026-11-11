"""Comprueba que la teoría no usa ningún número que aparezca en los acertijos.

Recoge todos los números de los acertijos (dibujos, preguntas, reglas, pistas, soluciones,
pesos y respuestas) y busca cualquiera de ellos en la página de teoría (dibujos, textos y
descripciones). Uso: python3 juego/balanzas/generador/comprobar_teoria.py
"""
import glob
import html as H
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
os.chdir(AQUI)
sys.path.insert(0, AQUI)
from datos import PUZLES  # noqa: E402


def numeros(txt):
    txt = H.unescape(re.sub(r"<[^>]+>", " ", str(txt)))
    return {m.replace(".", ",") for m in re.findall(r"\d+(?:[.,]\d+)?", txt)}


usados = set()
for p in PUZLES:
    for k in ("pregunta", "reglas", "pistas", "final", "distractores", "respuesta"):
        usados |= numeros(p[k])
    for t, c in p["pasos"]:
        usados |= numeros(t) | numeros(c)
    for _, v in p["pesos"]:
        usados |= numeros(v)
    for k, v in p["trampas"].items():
        usados |= numeros(k) | numeros(v)
for f in glob.glob("svg/[0-9]*.svg"):
    for t in re.findall(r"<text[^>]*>([^<]*)</text>", open(f, encoding="utf-8").read()):
        usados |= numeros(t)
# también las cifras sueltas de los decimales (0,4 → 0 y 4)
usados |= {d for n in usados for d in re.findall(r"\d+", n)}

pagina = open(os.path.join("..", "teoria", "index.html"), encoding="utf-8").read()
cuerpo = pagina[pagina.index("<main"):pagina.index("<script>")]
textos_svg = " ".join(re.findall(r"<text[^>]*>([^<]*)</text>", cuerpo))
visible = re.sub(r"<svg.*?</svg>", " ", cuerpo, flags=re.S)
descripciones = " ".join(re.findall(r'aria-label="([^"]*)"', cuerpo))
teoria = numeros(textos_svg) | numeros(visible) | numeros(descripciones)
comunes = sorted(teoria & usados, key=lambda n: float(n.replace(",", ".")))
print("Números de los acertijos:", " ".join(sorted(usados, key=lambda n: float(n.replace(",", ".")))))
print("Números de la teoría:   ", " ".join(sorted(teoria, key=lambda n: float(n.replace(",", ".")))))
if comunes:
    print("COINCIDEN:", " ".join(comunes))
    sys.exit(1)
print("Ninguna coincidencia.")
