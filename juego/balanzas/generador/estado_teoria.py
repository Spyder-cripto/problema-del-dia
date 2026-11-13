"""Imagen de estado de WhatsApp con la teoría que necesita una lámina concreta (1080×1920).

Cada tarjeta lleva el dibujo del apartado de teoría (con sus números propios, distintos de los
acertijos) y la regla en letra grande. Todo queda entre los 300 y los 1480 px, fuera de las
franjas que tapa WhatsApp. Caben tres tarjetas.

Uso: python3 juego/balanzas/generador/estado_teoria.py [id ...]   (por defecto, las de CARTAS)
Escribe juego/balanzas/descargas/imagen_estado_whatsapp_teoria_NN_<título>.png. Necesita node con Playwright.
"""
import os
import re
import subprocess
import sys
import unicodedata

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import teoria as T  # noqa: E402
from datos import PUZLES  # noqa: E402

DEST = os.path.join(AQUI, "..", "descargas")

# Por lámina: (figura, título, regla) — como mucho tres tarjetas
CARTAS = {
    "taller": [
        (T.fig_torno, "Torno", "Peso × radio, igual a los dos lados: el eje pequeño y la rueda grande giran juntos."),
        (T.fig_polea_movil, "Polea móvil", "Cada tramo aguanta la mitad de lo que cuelga. Dos encadenadas: la cuarta parte."),
        (T.fig_acodada, "Palanca acodada", "Solo cuenta la distancia horizontal al eje: mídela con los azulejos."),
    ],
}

CSS = """
*{box-sizing:border-box}body{margin:0;font-family:'Inter Display','Inter','Noto Color Emoji',sans-serif}
.f{width:1080px;height:1920px;background:#0d6f8c;position:relative;overflow:hidden;color:#fff}
.f::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-35deg,rgba(255,255,255,.05) 0 30px,transparent 30px 60px)}
.z{position:absolute;left:40px;right:40px;top:300px;height:1180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
.k{font-weight:700;letter-spacing:.14em;font-size:30px;color:#ffd166;text-transform:uppercase}
h1{font-weight:900;font-size:76px;line-height:1;margin:-10px 0 2px;text-align:center}
.card{width:1000px;display:flex;align-items:center;gap:22px;background:#fff;color:#13233a;border-radius:22px;padding:16px 22px 16px 16px;box-shadow:0 14px 30px rgba(0,0,0,.3)}
.fig{flex:0 0 500px;line-height:0;border-radius:10px;overflow:hidden}
.fig svg{width:100%;height:auto;display:block}
.txt h2{margin:0 0 8px;font-weight:900;font-size:44px;line-height:1}
.txt p{margin:0;font-weight:600;font-size:29px;line-height:1.25;color:#33475e}
.u{font-size:46px;color:#ffd166;font-weight:800;margin-top:4px}
"""


def slug(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "_", t).strip("_")


def generar(pid):
    p = next(x for x in PUZLES if x["id"] == pid)
    cards = "".join(f'<div class="card"><div class="fig">{fig()}</div><div class="txt"><h2>{h}</h2><p>{r}</p></div></div>'
                    for fig, h, r in CARTAS[pid])
    html = (f'<html><head><style>{CSS}</style></head><body><div class="f"><div class="z">'
            f'<div class="k">Teoría para</div><h1>{p["titulo"]}</h1>{cards}'
            f'<div class="u">👇 Enlace a la teoría 👇</div></div></div></body></html>')
    tmp = os.path.join(AQUI, f"_estado_teoria_{pid}.html")
    with open(tmp, "w", encoding="utf-8") as fh:
        fh.write(html)
    salida = os.path.abspath(os.path.join(DEST, f"imagen_estado_whatsapp_teoria_{p['num']:02d}_{slug(p['titulo'])}.png"))
    js = ("const { chromium } = require('playwright');(async () => { const b = await chromium.launch();"
          "const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });"
          f"await p.goto('file://{tmp}'); await p.waitForTimeout(400);"
          "const r = await p.evaluate(() => { const c=[...document.querySelector('.z').children].map(e=>e.getBoundingClientRect());"
          " return [Math.min(...c.map(x=>x.top)), Math.max(...c.map(x=>x.bottom))]; });"
          "if (r[0] < 300 || r[1] > 1480) { console.error('se sale de la zona segura', r); process.exit(1); }"
          f"await p.screenshot({{ path: '{salida}' }}); await b.close(); }})();")
    try:
        subprocess.run(["node", "-e", js], check=True)
    finally:
        os.remove(tmp)
    return salida


if __name__ == "__main__":
    os.makedirs(DEST, exist_ok=True)
    for pid in (sys.argv[1:] or list(CARTAS)):
        print("ok", generar(pid))
