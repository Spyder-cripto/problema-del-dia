"""Construye balanzas-imposibles.html a partir de datos.py y los SVG."""
import json, html, re
from datos import PUZLES

CSS = r"""
/* Layout: una columna; selector de acertijos arriba, la lámina manda y el resto la sirve. */
:root {
  --bg: #eaf1f5; --card: #fbfdfe; --ink: #13233a; --muted: #566a80; --line: #c9d7e2;
  --sea: #0d6f8c; --sea-soft: #d6ecf3; --rope: #8a5a2b; --rope-soft: #f3e6d6;
  --good: #2c7a4b; --good-soft: #dcefe3; --bad: #b03d2c; --bad-soft: #f6e0dc;
  --display: "Baloo 2", "Trebuchet MS", system-ui, sans-serif;
  --body: "Nunito Sans", system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0c1622; --card: #132132; --ink: #e5edf5; --muted: #98aabd; --line: #284058;
    --sea: #5cc4dc; --sea-soft: #133848; --rope: #e2ac72; --rope-soft: #33261a;
    --good: #7fd19f; --good-soft: #17352a; --bad: #f08f7d; --bad-soft: #3d1f1a; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0c1622; --card: #132132; --ink: #e5edf5; --muted: #98aabd; --line: #284058;
  --sea: #5cc4dc; --sea-soft: #133848; --rope: #e2ac72; --rope-soft: #33261a;
  --good: #7fd19f; --good-soft: #17352a; --bad: #f08f7d; --bad-soft: #3d1f1a; color-scheme: dark;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { background: var(--bg); color: var(--ink); font-family: var(--body); font-size: 1.0625rem; line-height: 1.6; }
.wrap {
  max-width: 980px; margin: 0 auto; padding-block: 28px 56px;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  display: grid; gap: 22px;
}
.wrap > *, .ayuda > *, .p-sol > *, ol.pasos > li, .puzle > * { min-width: 0; }
.cabecera { display: grid; gap: 6px; }
.serie { margin: 0; font-size: .78rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--sea); }
h1 { margin: 0; font-family: var(--display); font-weight: 800; font-size: clamp(2.1rem, 6vw, 3.3rem); line-height: 1; text-wrap: balance; }
.intro { margin: 0; color: var(--muted); max-width: 62ch; }
nav.selector { display: flex; flex-wrap: wrap; gap: 8px; }
nav.selector a {
  display: inline-flex; align-items: center; gap: 8px; text-decoration: none;
  padding: 6px 14px 6px 6px; border-radius: 999px; border: 2px solid var(--line);
  background: var(--card); color: var(--ink); font-weight: 700; font-size: .95rem;
}
nav.selector a .n {
  display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  background: var(--sea-soft); color: var(--sea); font-family: var(--display); font-weight: 800;
}
nav.selector a[aria-current="page"] { border-color: var(--ink); background: var(--ink); color: var(--card); }
nav.selector a[aria-current="page"] .n { background: var(--card); color: var(--ink); }
nav.selector a.resuelto .n { background: var(--good); color: var(--card); }
nav.selector a:focus-visible, .btn:focus-visible, input:focus-visible { outline: 3px solid var(--sea); outline-offset: 2px; }
.puzle { display: grid; gap: 20px; }
.puzle header { display: grid; gap: 4px; }
.eyebrow { margin: 0; font-size: .78rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.eyebrow .dots { letter-spacing: .2em; color: var(--bad); }
.titulo { margin: 0; font-family: var(--display); font-weight: 800; font-size: clamp(1.8rem, 5vw, 2.6rem); line-height: 1.05; text-wrap: balance; }
.q { margin: 4px 0 0; font-family: var(--display); font-weight: 700; font-size: clamp(1.25rem, 3.4vw, 1.7rem); line-height: 1.25; text-wrap: balance; }
figure { margin: 0; display: grid; gap: 8px; }
.lamina { border: 3px solid var(--ink); border-radius: 10px; overflow-x: auto; overflow-y: hidden; background: #dfeff6; -webkit-overflow-scrolling: touch; }
.lamina svg { display: block; width: 100%; height: auto; }
.lamina.ampliada svg { width: 1250px; max-width: none; }
figcaption { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; font-size: .9rem; color: var(--muted); }
.btn { font: inherit; font-weight: 700; font-size: .95rem; border-radius: 999px; padding: 8px 16px; cursor: pointer; border: 2px solid var(--ink); background: var(--card); color: var(--ink); }
.btn:hover { background: var(--sea-soft); }
.btn.sm { padding: 5px 12px; font-size: .85rem; }
.reglas { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 16px 20px; }
h3.sec { margin: 0 0 6px; font-family: var(--display); font-weight: 700; font-size: 1.3rem; }
.reglas ul { margin: 0; padding-left: 1.1em; display: grid; gap: 2px; max-width: 70ch; }
.reglas li.propia { color: var(--sea); font-weight: 600; }
.comprobar { display: grid; gap: 10px; }
.comprobar form { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.comprobar label { font-weight: 700; }
.comprobar input { font: inherit; font-family: var(--mono); font-weight: 700; font-size: 1.1rem; width: 6.5em; padding: 7px 12px; border: 2px solid var(--ink); border-radius: 8px; background: var(--card); color: var(--ink); }
.veredicto { margin: 0; padding: 10px 14px; border-radius: 8px; max-width: 70ch; }
.veredicto.ok { background: var(--good-soft); color: var(--good); font-weight: 700; }
.veredicto.no { background: var(--bad-soft); color: var(--ink); }
.ayuda { display: grid; gap: 12px; }
.botones { display: flex; flex-wrap: wrap; gap: 10px; }
.btn.pista { border-color: var(--sea); color: var(--sea); }
.btn.sol { border-color: var(--rope); color: var(--rope); }
.btn[aria-expanded="true"] { background: var(--ink); color: var(--card); border-color: var(--ink); }
.panel { border-radius: 10px; padding: 14px 18px; max-width: 76ch; }
.panel p { margin: 0; }
.panel.p-pista { background: var(--sea-soft); border-left: 4px solid var(--sea); }
.panel.p-sol { background: var(--card); border: 2px solid var(--rope); display: grid; gap: 14px; }
.pesos { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; padding: 0; list-style: none; }
.pesos li { background: var(--rope-soft); border-radius: 999px; padding: 3px 12px; font-size: .92rem; }
.pesos b { font-family: var(--mono); font-variant-numeric: tabular-nums; }
ol.pasos { margin: 0; padding-left: 1.3em; display: grid; gap: 12px; }
ol.pasos li::marker { font-family: var(--display); font-weight: 800; color: var(--rope); }
ol.pasos h4 { margin: 0; font-size: 1rem; font-weight: 700; }
ol.pasos p { margin: 2px 0 0; }
.eq { display: block; margin: 6px 0 0; padding: 6px 10px; border-radius: 6px; background: var(--bg); font-family: var(--mono); font-size: .88rem; font-variant-numeric: tabular-nums; overflow-x: auto; white-space: nowrap; }
.final { font-family: var(--display); font-weight: 800; font-size: 1.35rem; color: var(--rope); }
.trampas { color: var(--muted); font-size: .95rem; }
@media (prefers-reduced-motion: no-preference) {
  .panel:not([hidden]) { animation: abre .18s ease-out; }
  @keyframes abre { from { transform: translateY(-4px); } to { transform: none; } }
}
"""

JS = r"""
(function () {
  var DATA = __DATA__;
  var ids = DATA.map(function (p) { return p.id; });
  var KEY = 'balanzas-resueltos';
  function leer() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function guardar(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  function marcar() {
    var r = leer();
    document.querySelectorAll('nav.selector a').forEach(function (a) {
      a.classList.toggle('resuelto', r.indexOf(a.dataset.id) >= 0);
    });
  }
  function mostrar() {
    var h = (location.hash || '').replace('#', '');
    var id = ids.indexOf(h) >= 0 ? h : ids[0];
    document.querySelectorAll('section.puzle').forEach(function (s) { s.hidden = s.id !== id; });
    document.querySelectorAll('nav.selector a').forEach(function (a) {
      if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', function () { mostrar(); window.scrollTo(0, 0); });
  mostrar(); marcar();

  document.querySelectorAll('[data-zoom]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lam = document.getElementById(btn.dataset.zoom);
      var on = lam.classList.toggle('ampliada');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? 'Ajustar a la pantalla' : 'Ampliar dibujo';
    });
  });
  document.querySelectorAll('[data-panel]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var panel = document.getElementById(btn.dataset.panel);
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = (open ? 'Ocultar ' : 'Ver ') + btn.dataset.label;
    });
  });
  DATA.forEach(function (p) {
    var form = document.getElementById('form-' + p.id);
    var out = document.getElementById('ver-' + p.id);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = parseInt(document.getElementById('resp-' + p.id).value, 10);
      if (isNaN(v)) return;
      var ok = v === p.r;
      var msg = ok ? '¡Correcto! Son ' + p.r + '.' : (p.t[v] || ('No es ' + v + '. Prueba con las pistas.'));
      out.className = 'veredicto ' + (ok ? 'ok' : 'no');
      out.textContent = msg;
      out.hidden = false;
      if (ok) { var r = leer(); if (r.indexOf(p.id) < 0) { r.push(p.id); guardar(r); } marcar(); }
    });
  });
})();
"""

COMUNES = ["Todo está en equilibrio. Los objetos iguales pesan lo mismo.",
           "Vigas, cuerdas, poleas y recipientes (cajas, cofres, cestas) no pesan. No hay rozamiento.",
           "Los puntos de cada viga están a la misma distancia unos de otros."]


def svg_inline(path, pid):
    s = open(path, encoding="utf-8").read()
    s = re.sub(r'(<svg[^>]*?) width="\d+" height="\d+"', r'\1', s, count=1)
    # ids únicos por acertijo
    ids = set(re.findall(r'id="([^"]+)"', s))
    for i in ids:
        s = s.replace(f'id="{i}"', f'id="{pid}-{i}"').replace(f'url(#{i})', f'url(#{pid}-{i})')
    return s


def seccion(p):
    pid = p["id"]
    reglas = "".join(f'<li class="propia">{html.escape(r)}</li>' for r in p.get("reglas", []))
    pasos = "".join(f"<li><h4>{html.escape(t)}</h4>{c}</li>" for t, c in p["pasos"])
    pesos = "".join(f"<li>{html.escape(a)} <b>{b}</b></li>" for a, b in p["pesos"])
    pistas_btn = "".join(
        f'<button class="btn pista" type="button" data-panel="{pid}-p{i+1}" data-label="pista {i+1}" aria-expanded="false" aria-controls="{pid}-p{i+1}">Ver pista {i+1}</button>'
        for i in range(len(p["pistas"])))
    pistas = "".join(f'<div class="panel p-pista" id="{pid}-p{i+1}" hidden><p>{html.escape(t)}</p></div>' for i, t in enumerate(p["pistas"]))
    return f"""
  <section class="puzle" id="{pid}" aria-labelledby="t-{pid}" hidden>
    <header>
      <p class="eyebrow">N.º {p['num']} · Muy difícil <span class="dots" aria-hidden="true">●●●●</span></p>
      <h2 class="titulo" id="t-{pid}">{html.escape(p['titulo'])}</h2>
      <p class="q">{html.escape(p['pregunta'])}</p>
    </header>
    <figure>
      <div class="lamina" id="lam-{pid}">{svg_inline(p['svg'], pid)}</div>
      <figcaption>
        <span>Toca «Ampliar» para verlo a tamaño grande en el móvil.</span>
        <button class="btn sm" type="button" data-zoom="lam-{pid}" aria-pressed="false">Ampliar dibujo</button>
      </figcaption>
    </figure>
    <div class="reglas">
      <h3 class="sec">Reglas</h3>
      <ul>{"".join(f"<li>{html.escape(r)}</li>" for r in COMUNES)}{reglas}</ul>
    </div>
    <div class="comprobar">
      <h3 class="sec">Tu respuesta</h3>
      <form id="form-{pid}" autocomplete="off">
        <label for="resp-{pid}">{html.escape(p['unidad'])}:</label>
        <input id="resp-{pid}" name="resp-{pid}" type="number" inputmode="numeric" min="0" step="1" required>
        <button class="btn" type="submit">Comprobar</button>
      </form>
      <p class="veredicto" id="ver-{pid}" role="status" hidden></p>
    </div>
    <div class="ayuda" aria-label="Pistas y solución">
      <div class="botones">{pistas_btn}
        <button class="btn sol" type="button" data-panel="{pid}-sol" data-label="solución" aria-expanded="false" aria-controls="{pid}-sol">Ver solución</button>
      </div>
      {pistas}
      <div class="panel p-sol" id="{pid}-sol" hidden>
        <ol class="pasos">{pasos}</ol>
        <p class="final">{html.escape(p['final'])}</p>
        <ul class="pesos" aria-label="Pesos">{pesos}</ul>
        <p class="trampas">No cuentan: {html.escape(p['distractores'])}.</p>
      </div>
    </div>
  </section>"""


URL = "https://spyder-cripto.github.io/problema-del-dia/juego/balanzas/"
DESC = ("Diez acertijos de balanzas de dificultad máxima: poleas, rampas, tornos, engranajes y globos. "
        "Cada lámina tiene una única respuesta, con pistas y solución paso a paso.")

def head_web(title, desc, url, og_title, img_alt):
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#0d6f8c">
<!-- Tarjeta al compartir el enlace (WhatsApp, Telegram, redes) -->
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:site_name" content="El problema del día">
<meta property="og:title" content="{html.escape(og_title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:image" content="{url}preview.jpg?v=1">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{html.escape(img_alt)}">
<meta property="og:locale" content="es_ES">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{html.escape(og_title)}">
<meta name="twitter:description" content="{html.escape(desc)}">
<meta name="twitter:image" content="{url}preview.jpg?v=1">
"""


HEAD_WEB = head_web("Balanzas imposibles · El problema del día", DESC, URL, "Balanzas imposibles · ¿Te atreves?",
                    "Lámina de balanzas: vigas con objetos colgados, poleas y una caja con interrogación")

FONTS = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&family=JetBrains+Mono:wght@500;700&display=swap">"""

WEB_EXTRA_CSS = """
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; }
.wrap { padding-top: max(28px, env(safe-area-inset-top, 0px)); padding-bottom: max(56px, env(safe-area-inset-bottom, 0px)); }
.volver { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: .92rem; }
.volver a { color: var(--sea); font-weight: 700; text-decoration: none; }
.volver a:hover { text-decoration: underline; }
.pie { color: var(--muted); font-size: .88rem; border-top: 1px solid var(--line); padding-top: 14px; }
.pie a { color: var(--sea); }
"""


def build(out="balanzas-imposibles.html", web=False):
    nav = "".join(f'<a href="#{p["id"]}" data-id="{p["id"]}"><span class="n">{p["num"]}</span>{html.escape(p["titulo"])}</a>' for p in PUZLES)
    data = [dict(id=p["id"], r=p["respuesta"], t={str(k): v for k, v in p["trampas"].items()}) for p in PUZLES]
    fonts = """<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700&family=JetBrains+Mono:wght@500;700&display=swap">"""
    if web:
        head = HEAD_WEB + fonts + f"\n<style>{CSS}{WEB_EXTRA_CSS}</style>\n</head>\n<body>\n"
        volver = '  <nav class="volver" aria-label="Volver"><a href="../">← Juegos</a><a href="../../">El problema del día</a></nav>\n'
        pie = ('  <footer class="pie">Láminas originales dibujadas para El problema del día. '
               'Cada respuesta se ha comprobado resolviendo el sistema de ecuaciones de la lámina. '
               '· <a href="../">Más juegos</a></footer>\n')
        cierre = "</body>\n</html>\n"
    else:
        head = f"""<title>Balanzas imposibles</title>
<meta name="claude:viewport-fit-sides" content="cover">
{fonts}
<style>{CSS}</style>
"""
        volver = pie = cierre = ""
    page = f"""{head}<main class="wrap">
{volver}  <div class="cabecera">
    <p class="serie">Acertijos de equilibrio · {len(PUZLES)} láminas</p>
    <h1>Balanzas imposibles</h1>
    <p class="intro">Cada lámina está en equilibrio y tiene una única respuesta. Hay poleas, rampas, tornos y globos, y también objetos que no pintan nada.</p>
  </div>
  <nav class="selector" aria-label="Elige acertijo">{nav}</nav>
  {"".join(seccion(p) for p in PUZLES)}
{pie}</main>
<script>{JS.replace("__DATA__", json.dumps(data, ensure_ascii=False))}</script>
{cierre}"""
    open(out, "w", encoding="utf-8").write(page)
    print("página:", out, len(page))


def build_single(p, out):
    """Página web de una sola lámina, sin enlaces a las demás."""
    url = f"{URL}{p['id']}/"
    desc = f"{p['pregunta']} Un acertijo de balanzas de dificultad máxima, con pistas y solución paso a paso."
    data = [dict(id=p["id"], r=p["respuesta"], t={str(k): v for k, v in p["trampas"].items()})]
    sec = seccion(p).replace(" hidden>", ">", 1)
    sec = sec.replace('<h2 class="titulo"', '<h1 class="titulo"', 1).replace("</h2>", "</h1>", 1)
    sec = sec.replace(f"N.º {p['num']} · Muy difícil", "Acertijo de balanzas · Muy difícil", 1)
    head = head_web(f"{p['titulo']} · El problema del día", desc, url, f"{p['titulo']} · ¿Te atreves?",
                    f"Lámina de balanzas «{p['titulo']}»: {p['pregunta']}")
    page = (head + FONTS + f"\n<style>{CSS}{WEB_EXTRA_CSS}</style>\n</head>\n<body>\n<main class=\"wrap\">\n"
            '  <nav class="volver" aria-label="Volver"><a href="../../../">← El problema del día</a></nav>\n'
            + sec + "\n"
            '  <footer class="pie">Un acertijo de <a href="../../../">El problema del día</a>. '
            'La respuesta se ha comprobado resolviendo el sistema de ecuaciones de la lámina.</footer>\n'
            f"</main>\n<script>{JS.replace('__DATA__', json.dumps(data, ensure_ascii=False))}</script>\n</body>\n</html>\n")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(page)
    return out


if __name__ == "__main__":
    import sys
    if "--web" in sys.argv:
        build("../index.html", web=True)
    else:
        build()
