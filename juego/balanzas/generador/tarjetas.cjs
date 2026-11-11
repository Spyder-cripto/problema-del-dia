// Genera las imágenes para compartir (Playwright):
//   preview.jpg 1200×630 (tarjeta del enlace) y estado.png 1080×1080 (estado de WhatsApp)
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
  const es = await b.newPage({ viewport: { width: 1080, height: 1080 } });
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
    await es.setContent(`<html><head><style>${base}
      .c{width:1080px;height:1080px;background:#0d6f8c;color:#fff;position:relative;overflow:hidden;text-align:center}
      .c::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-35deg,rgba(255,255,255,.05) 0 30px,transparent 30px 60px)}
      .k{position:relative;padding-top:70px;font-weight:700;letter-spacing:.14em;font-size:26px;color:#ffd166;text-transform:uppercase}
      h1{position:relative;font-weight:900;font-size:${largo ? 76 : 92}px;line-height:1;margin:14px 0 0}
      .img{position:relative;margin:46px auto 0;width:980px;border:6px solid #fff;border-radius:18px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.35)}
      .img svg{display:block;width:100%;height:auto}
      .q{position:relative;font-size:38px;font-weight:800;margin:40px 50px 0}
      .u{position:relative;font-size:23px;color:#bfe6f0;margin-top:22px;font-weight:600}
    </style></head><body><div class="c"><div class="k">${esc(t.kicker)}</div><h1>${esc(t.titulo)}</h1>
    <div class="img">${svg}</div><div class="q">${esc(t.pregunta)}</div><div class="u">${esc(t.url)}</div></div></body></html>`);
    await es.screenshot({ path: path.join(dir, t.estado) });
    console.log('ok', t.preview, t.estado);
  }
  await b.close();
})();
