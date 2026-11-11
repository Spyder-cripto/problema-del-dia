// Genera las imágenes para compartir (Playwright):
//   preview.jpg 1200×630 (tarjeta del enlace) y estado.png 1080×1920 (estado de WhatsApp, vertical)
// para la colección y para cada lámina, a partir de tarjetas.json (lo escribe generar.py).
// Uso: node juego/balanzas/generador/tarjetas.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  const lista = JSON.parse(fs.readFileSync(path.join(dir, 'tarjetas.json'), 'utf8'));
  const base = `*{box-sizing:border-box}body{margin:0;font-family:'Inter Display','Inter',sans-serif}`;
  const b = await chromium.launch();
  const pv = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const es = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const t of lista) {
    const svg = fs.readFileSync(path.join(dir, t.svg), 'utf8').replace(/ width="1400" height="900"/, '');
    const largo = t.titulo.length > 18;
    await pv.setContent(`<html><head><style>${base}
      .c{width:1200px;height:630px;background:#0d6f8c;position:relative;overflow:hidden;color:#fff}
      .c::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-35deg,rgba(255,255,255,.05) 0 26px,transparent 26px 52px)}
      .t{position:absolute;left:64px;top:96px;width:470px}
      .k{font-weight:700;letter-spacing:.14em;font-size:20px;color:#ffd166;text-transform:uppercase}
      h1{font-weight:900;font-size:${largo ? 62 : 76}px;line-height:.95;margin:16px 0 22px;letter-spacing:-.01em}
      p{font-size:27px;line-height:1.3;margin:0;color:#d9f1f7}
      .u{position:absolute;left:64px;bottom:54px;font-size:19px;color:#bfe6f0;font-weight:600}
      .img{position:absolute;right:46px;top:84px;width:600px;border:6px solid #fff;border-radius:16px;overflow:hidden;transform:rotate(2.5deg);box-shadow:0 18px 40px rgba(0,0,0,.35);background:#fff}
      .img svg{display:block;width:100%;height:auto}
    </style></head><body><div class="c"><div class="t"><div class="k">${esc(t.kicker)}</div><h1>${esc(t.titulo)}</h1>
    <p>${esc(t.texto)}</p></div><div class="u">${esc(t.url)}</div><div class="img">${svg}</div></div></body></html>`);
    await pv.screenshot({ path: path.join(dir, t.preview), type: 'jpeg', quality: 84 });
    // Estado de WhatsApp: vertical 1080×1920. WhatsApp tapa la franja de arriba (nombre y hora)
    // y la de abajo (el texto o enlace del pie), así que el contenido va entre 300 y 1480 px.
    await es.setContent(`<html><head><style>${base}
      .c{width:1080px;height:1920px;background:#0d6f8c;color:#fff;position:relative;overflow:hidden;text-align:center}
      .c::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-35deg,rgba(255,255,255,.05) 0 30px,transparent 30px 60px)}
      .z{position:absolute;left:0;right:0;top:300px;height:1180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px}
      .k{font-weight:700;letter-spacing:.14em;font-size:30px;color:#ffd166;text-transform:uppercase}
      h1{font-weight:900;font-size:${largo ? 92 : 112}px;line-height:1;margin:-18px 40px 0}
      .img{width:1000px;border:7px solid #fff;border-radius:20px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.35)}
      .img svg{display:block;width:100%;height:auto}
      .q{font-size:54px;line-height:1.15;font-weight:800;margin:0 60px}
      .u{font-size:27px;color:#bfe6f0;font-weight:600;margin-top:-10px}
    </style></head><body><div class="c"><div class="z"><div class="k">${esc(t.kicker)}</div><h1>${esc(t.titulo)}</h1>
    <div class="img">${svg}</div><div class="q">${esc(t.pregunta)}</div><div class="u">${esc(t.url)}</div></div></div></body></html>`);
    await es.screenshot({ path: path.join(dir, t.estado) });
    console.log('ok', t.preview, t.estado);
  }
  await b.close();
})();
