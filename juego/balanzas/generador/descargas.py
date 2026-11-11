"""Prepara juego/balanzas/descargas/: imágenes de estado con nombre y PDF con los enlaces.

- Copia cada estado.png (y los de la teoría, la colección y «Próximamente…») con un nombre
  descriptivo: imagen_estado_whatsapp_NN_<titulo>.png, para que al descargarlos se ordenen solos.
- Crea balanzas_imposibles_enlaces.pdf (A4, enlaces pulsables, miniatura de cada lámina, sin soluciones).

Uso (después de generar.py, tarjetas.cjs y proximamente.cjs):
    python3 juego/balanzas/generador/descargas.py
Necesita node con Playwright para el PDF.
"""
import html
import os
import re
import shutil
import subprocess
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from datos import PUZLES  # noqa: E402

RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
BAL = os.path.join(RAIZ, "juego", "balanzas")
DEST = os.path.join(BAL, "descargas")
BASE = "https://spyder-cripto.github.io/problema-del-dia/juego/balanzas/"


def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")


def imagenes():
    for p in PUZLES:
        shutil.copy(os.path.join(BAL, p["id"], "estado.png"),
                    os.path.join(DEST, f"imagen_estado_whatsapp_{p['num']:02d}_{slug(p['titulo'])}.png"))
    shutil.copy(os.path.join(BAL, "teoria", "estado.png"), os.path.join(DEST, "imagen_estado_whatsapp_teoria_balanzas.png"))
    shutil.copy(os.path.join(RAIZ, "estado_balanzas.png"), os.path.join(DEST, "imagen_estado_whatsapp_coleccion_balanzas.png"))
    shutil.copy(os.path.join(RAIZ, "estado_balanzas_proximamente.png"), os.path.join(DEST, "imagen_estado_whatsapp_proximamente.png"))


def pdf():
    filas = []
    for p in PUZLES:
        url = f"{BASE}{p['id']}/"
        svg = os.path.join(AQUI, p["svg"])
        filas.append(f'''
  <div class="fila">
    <a class="mini" href="{url}"><img src="file://{svg}" alt=""></a>
    <div class="info">
      <div class="num">Lámina {p['num']}</div>
      <div class="tit">{html.escape(p['titulo'])}</div>
      <div class="q">{html.escape(p['pregunta'])}</div>
      <a class="url" href="{url}">{url}</a>
    </div>
  </div>''')
    doc = f'''<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Balanzas imposibles · enlaces</title><style>
@page {{ size: A4; margin: 16mm 14mm 16mm 14mm; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font-family: 'Inter', sans-serif; color: #13233a; font-size: 10.5pt; }}
.cab {{ border-bottom: 3px solid #0d6f8c; padding-bottom: 8px; margin-bottom: 10px; }}
.serie {{ font-size: 8.5pt; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #0d6f8c; }}
h1 {{ font-family: 'Inter Display', 'Inter', sans-serif; font-weight: 900; font-size: 24pt; margin: 2px 0 2px; }}
.sub {{ color: #566a80; margin: 0; }}
.fila {{ display: flex; gap: 12px; align-items: center; padding: 7px 0; border-bottom: 1px solid #c9d7e2; break-inside: avoid; }}
.mini {{ flex: 0 0 40mm; display: block; border: 2px solid #13233a; border-radius: 6px; overflow: hidden; line-height: 0; }}
.mini img {{ width: 100%; height: auto; }}
.info {{ min-width: 0; }}
.num {{ font-size: 8pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #b03d2c; }}
.tit {{ font-family: 'Inter Display', 'Inter', sans-serif; font-weight: 800; font-size: 13pt; margin: 1px 0; }}
.q {{ color: #33475e; margin-bottom: 3px; }}
.url {{ color: #0d6f8c; font-weight: 600; font-size: 9.5pt; text-decoration: none; word-break: break-all; }}
h2 {{ font-family: 'Inter Display', 'Inter', sans-serif; font-weight: 800; font-size: 14pt; margin: 14px 0 6px; break-after: avoid; }}
.otros {{ display: grid; gap: 6px; }}
.otro b {{ display: block; }}
.pie {{ margin-top: 14px; color: #566a80; font-size: 8.5pt; }}
</style></head><body>
<div class="cab">
  <div class="serie">El problema del día</div>
  <h1>Balanzas imposibles</h1>
  <p class="sub">Enlaces de las 10 láminas. Cada enlace abre solo esa lámina, con su comprobador, pistas y solución.</p>
</div>
{"".join(filas)}
<h2>Otros enlaces</h2>
<div class="otros">
  <div class="otro"><b>Colección completa (las 10 láminas con selector)</b><a class="url" href="{BASE}">{BASE}</a></div>
  <div class="otro"><b>Teoría: cómo se resuelven las balanzas</b><a class="url" href="{BASE}teoria/">{BASE}teoria/</a></div>
  <div class="otro"><b>El problema del día</b><a class="url" href="https://spyder-cripto.github.io/problema-del-dia/">https://spyder-cripto.github.io/problema-del-dia/</a></div>
</div>
<p class="pie">Los enlaces son pulsables. Las soluciones no van en este documento: están dentro de cada lámina, detrás del botón «Ver solución».</p>
</body></html>'''
    tmp = os.path.join(AQUI, "_enlaces.html")
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(doc)
    salida = os.path.join(DEST, "balanzas_imposibles_enlaces.pdf")
    js = ("const { chromium } = require('playwright');(async () => { const b = await chromium.launch(); const p = await b.newPage();"
          f"await p.goto('file://{tmp}'); await p.waitForTimeout(500);"
          f"await p.pdf({{ path: '{salida}', format: 'A4', printBackground: true, preferCSSPageSize: true }}); await b.close(); }})();")
    try:
        subprocess.run(["node", "-e", js], check=True)
    finally:
        os.remove(tmp)


if __name__ == "__main__":
    os.makedirs(DEST, exist_ok=True)
    imagenes()
    pdf()
    print("listo:", ", ".join(sorted(os.listdir(DEST))))
