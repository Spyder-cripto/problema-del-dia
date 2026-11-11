const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [svgPath, outPath, scale] = process.argv.slice(2);
  const svg = fs.readFileSync(svgPath, 'utf8');
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: Number(scale || 1) });
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.locator('svg').screenshot({ path: outPath });
  await b.close();
})();
