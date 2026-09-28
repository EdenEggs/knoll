/* The two stickers, cut out of the sheet they came on: the lavender ground and its dots made clear, the edge kept soft
   (a pixel on the rim is the rim's colour at the share it covers, not a lavender fringe), the founding gnome's "NO. 0001"
   painted out of its plate (the page writes each gnome's own number there), cropped, and saved as WebP at 480 wide.
     node lab2/perf/sticker-cut.js [folder the two .png are in]     → logo/founding-gnome.webp, logo/i-was-here-toem2.webp
   (the folder is Downloads/assets unless another is named; a .png proof of each is left in the system's temp folder) */
'use strict';
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/bobb9/Desktop/node_modules/playwright');
const DIR = process.argv[2] || path.join(require('os').homedir(), 'Downloads', 'assets'), OUT = path.join(__dirname, '..', '..', 'logo'), PROOF = require('os').tmpdir();
const JOBS = [
  { from: 'founding-gnome-sticker.png', to: 'founding-gnome', plate: true },
  { from: 'i-was-here-toem2-sticker.png', to: 'i-was-here-toem2' }
];
const WIDE = 480, MARGIN = 6;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  for (const job of JOBS) {
    const src = 'data:image/png;base64,' + fs.readFileSync(path.join(DIR, job.from)).toString('base64');
    const out = await page.evaluate(async ({ src, plate, WIDE, MARGIN }) => {
      const img = new Image(); img.src = src; await img.decode();
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      const im = x.getImageData(0, 0, W, H), d = im.data;
      const B = [239, 231, 237], INK = [23, 18, 11];
      const RIMS = [[255, 255, 255], [66, 61, 56], [23, 18, 11]];       // what the sticker's edge is made of: its white cut line, its shadow, its ink
      const far = i => Math.max(Math.abs(d[i] - B[0]), Math.abs(d[i + 1] - B[1]), Math.abs(d[i + 2] - B[2]));
      // 1 · the founding gnome's plate: the letters painted out, column by column, between the banner's rule and the plate's own foot
      if (plate) {
        const dark = i => d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 60;
        for (let px = 433; px <= 660; px++) {
          let foot = -1;
          for (let y = 775; y >= 730; y--) if (dark((y * W + px) * 4)) { foot = y; break; }
          for (let y = 709; y <= foot; y++) { const i = (y * W + px) * 4; d[i] = INK[0]; d[i + 1] = INK[1]; d[i + 2] = INK[2]; }
        }
      }
      // 2 · the ground: everything the sheet's colour (its dots are 12 off it, its white 16) that the edge of the picture can reach
      const ground = new Uint8Array(W * H), stack = [];
      const push = (px, py) => { const n = py * W + px; if (!ground[n] && far(n * 4) <= 14) { ground[n] = 1; stack.push(n); } };
      for (let px = 0; px < W; px++) { push(px, 0); push(px, H - 1); }
      for (let py = 0; py < H; py++) { push(0, py); push(W - 1, py); }
      while (stack.length) { const n = stack.pop(), px = n % W, py = (n / W) | 0; if (px) push(px - 1, py); if (px < W - 1) push(px + 1, py); if (py) push(px, py - 1); if (py < H - 1) push(px, py + 1); }
      // 3 · the rim: within two pixels of where ground meets sticker, a pixel is its rim's colour at the share of it that is rim
      const near = new Uint8Array(W * H);
      for (let py = 1; py < H - 1; py++) for (let px = 1; px < W - 1; px++) {
        const n = py * W + px;
        if (ground[n]) continue;
        if (ground[n - 1] || ground[n + 1] || ground[n - W] || ground[n + W]) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const qx = px + dx, qy = py + dy; if (qx >= 0 && qy >= 0 && qx < W && qy < H) near[qy * W + qx] = 1; }
      }
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let n = 0; n < W * H; n++) {
        const i = n * 4;
        if (near[n]) {
          const P = [d[i] - B[0], d[i + 1] - B[1], d[i + 2] - B[2]];
          let best = null;
          for (const F of RIMS) {
            const V = [F[0] - B[0], F[1] - B[1], F[2] - B[2]], vv = V[0] * V[0] + V[1] * V[1] + V[2] * V[2];
            const a = Math.max(0, Math.min(1, (P[0] * V[0] + P[1] * V[1] + P[2] * V[2]) / vv));
            const r = Math.hypot(P[0] - a * V[0], P[1] - a * V[1], P[2] - a * V[2]);
            if (!best || r < best.r) best = { a, r, F };
          }
          // a dot of the sheet's own pattern beside the rim reads as a whisper of shadow: under a tenth, and on the ground, it is ground
          const a = ground[n] && best.a < 0.12 ? 0 : best.r < 14 ? best.a : ground[n] ? 0 : 1;
          if (a < 1 && best.r < 14) { d[i] = best.F[0]; d[i + 1] = best.F[1]; d[i + 2] = best.F[2]; }
          d[i + 3] = Math.round(a * 255);
        } else if (ground[n]) d[i + 3] = 0;
        if (d[i + 3] > 8) { const px = n % W, py = (n / W) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
      }
      x.putImageData(im, 0, 0);
      // 4 · cropped to the sticker and a little air, and drawn at the width the pages ask for
      x0 = Math.max(0, x0 - MARGIN); y0 = Math.max(0, y0 - MARGIN); x1 = Math.min(W - 1, x1 + MARGIN); y1 = Math.min(H - 1, y1 + MARGIN);
      const cw = x1 - x0 + 1, ch = y1 - y0 + 1, k = WIDE / cw, o = document.createElement('canvas');
      o.width = WIDE; o.height = Math.round(ch * k);
      const ox = o.getContext('2d'); ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high';
      // halved on the way down while it is more than twice too big, so the rim is averaged and not skipped
      let from = c, fx = x0, fy = y0, fw = cw, fh = ch;
      while (fw / 2 >= WIDE) {
        const h = document.createElement('canvas'); h.width = Math.round(fw / 2); h.height = Math.round(fh / 2);
        const hx = h.getContext('2d'); hx.imageSmoothingQuality = 'high'; hx.drawImage(from, fx, fy, fw, fh, 0, 0, h.width, h.height);
        from = h; fx = 0; fy = 0; fw = h.width; fh = h.height;
      }
      ox.drawImage(from, fx, fy, fw, fh, 0, 0, o.width, o.height);
      return { box: [x0, y0, x1, y1], crop: [cw, ch], size: [o.width, o.height], k, webp: o.toDataURL('image/webp', 0.92), png: o.toDataURL('image/png') };
    }, { src, plate: !!job.plate, WIDE, MARGIN });
    const bytes = s => Buffer.from(s.split(',')[1], 'base64');
    fs.writeFileSync(path.join(OUT, job.to + '.webp'), bytes(out.webp));
    fs.writeFileSync(path.join(PROOF, job.to + '.png'), bytes(out.png));
    console.log(job.to, JSON.stringify({ box: out.box, crop: out.crop, size: out.size, k: +out.k.toFixed(5), webp: bytes(out.webp).length, png: bytes(out.png).length }));
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
