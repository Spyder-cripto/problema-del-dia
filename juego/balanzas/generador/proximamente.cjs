// Imagen de estado de WhatsApp «Próximamente…» (1080×1920): las diez láminas amontonadas.
// Uso: node juego/balanzas/generador/proximamente.cjs   → escribe estado_balanzas_proximamente.png en la raíz.
// Todo el contenido queda entre los 300 y los 1480 px, fuera de las franjas que tapa WhatsApp.
const { chromium } = require('playwright');
const path = require('path');

const dir = __dirname;
const salida = path.join(dir, '..', '..', '..', 'estado_balanzas_proximamente.png');
// [lámina, desplazamiento x, desplazamiento y, giro en grados], de abajo arriba
const MONTON = [
  ['10-jardin', -59, 93, -12.4],
  ['09-mar', 55, 19, 12.6],
  ['01-puerto', -56, 29, -9.2],
  ['07-laboratorio', 31, -43, 16.5],
  ['06-golosinas', -74, 43, -8.1],
  ['05-selva', 84, 102, 7.5],
  ['08-castillo', -62, -75, -14.8],
  ['03-nieve', 57, -97, 7.2],
  ['02-taller', -40, -103, -9.3],
  ['04-circo', 0, 0, -3.0],
];

(async () => {
  const cartas = MONTON.map(([id, dx, dy, rot], i) =>
    `<div class="c" style="transform:translate(${dx}px,${dy}px) rotate(${rot}deg);z-index:${i}">` +
    `<img src="file://${path.join(dir, 'svg', id + '.svg')}"></div>`).join('');
  const html = `<html><head><style>
*{box-sizing:border-box}body{margin:0;font-family:'Inter Display','Inter',sans-serif}
.f{width:1080px;height:1920px;background:#0d6f8c;position:relative;overflow:hidden}
.f::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(-35deg,rgba(255,255,255,.05) 0 30px,transparent 30px 60px)}
.mont{position:absolute;left:50%;top:830px;width:0;height:0}
.c{position:absolute;left:-370px;top:-238px;width:740px;border:9px solid #fff;border-radius:16px;overflow:hidden;box-shadow:0 14px 34px rgba(0,0,0,.38);background:#fff}
.c img{display:block;width:100%;height:auto}
.t{position:absolute;left:0;right:0;top:1270px;text-align:center;color:#fff;font-weight:900;font-size:124px;letter-spacing:-.01em;text-shadow:0 6px 18px rgba(0,0,0,.25)}
.t span{color:#ffd166}
</style></head><body><div class="f"><div class="mont">${cartas}</div>
<div class="t">Próximamente<span>…</span></div></div></body></html>`;
  const fs = require('fs');
  const tmp = path.join(dir, '_proximamente.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto('file://' + tmp);
  await p.waitForTimeout(500);
  await p.screenshot({ path: salida });
  await b.close();
  fs.unlinkSync(tmp);
  console.log('ok', salida);
})();
