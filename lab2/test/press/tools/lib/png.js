/* ─── PNG, READ ───────────────────────────────────────────────────────────
   A minimal PNG decoder for Node, no dependencies: a file's bytes in,
   { width, height, data } out, `data` a Uint8ClampedArray of RGBA — the
   very shape a canvas's getImageData gives, so Palette.quantize reads a
   fixture on disk exactly as the Press Table reads a dropped picture in
   the browser. It exists so the theme tests (tools/test-theme.js) run
   without a browser: the fixtures are PNGs that tools/make-fixtures.js
   wrote with its own sixty-line writer, and this is that writer run
   backwards — the same five filters, the same colour types.

   WHAT IT DOES: 8-bit samples only; colour types 0 (grey), 2 (RGB), 4
   (grey + alpha) and 6 (RGBA); interlace 0; every IDAT concatenated and
   inflated with zlib.inflateSync; the five filter types (None, Sub, Up,
   Average, Paeth — PNG 1.2 §6, the Paeth predictor as the spec writes it)
   undone row by row. Grey is spread to R = G = B; a missing alpha is 255.
   Every chunk's CRC is checked against zlib.crc32 (Node ≥ 22.2 has it;
   the writer used it too), so a truncated or altered fixture fails here
   and not three tools later as a wrong palette. Beside the three fields a
   canvas would give, the result carries `filters`: how many rows wore
   each of the five filter types, so a test can say which of them a real
   fixture exercised rather than trust that the writer's adaptive choice
   reached all five (tools/test-theme.js prints the counts and forces
   each filter on its own).

   WHAT IT DOES NOT DO, on purpose: 16-bit samples, palette images (colour
   type 3 and PLTE), tRNS transparency, interlace 1 (Adam7), gamma or
   colour chunks (gAMA, iCCP, sRGB — a canvas ignores them too), and any
   ancillary chunk at all — they are skipped. A PNG asking for any of the
   first four throws with a message that says which; none of the fixtures
   do (make-fixtures.js writes only types 2 and 6), and a real press kit
   that does is a job for the browser, which the Press Table is. */
'use strict';
const zlib = require('zlib');

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };   // colour type → samples per pixel

function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decode(buf) {
  if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
  for (let i = 0; i < 8; i++) if (buf[i] !== SIGNATURE[i]) throw new Error('png: not a PNG (bad signature)');
  let pos = 8, width = 0, height = 0, depth = 0, type = -1, interlace = 0, seenIHDR = false;
  const idat = [];
  while (pos + 8 <= buf.length) {
    const len = buf.readUInt32BE(pos), name = buf.toString('latin1', pos + 4, pos + 8);
    const start = pos + 8, end = start + len;
    if (end + 4 > buf.length) throw new Error('png: truncated at chunk ' + name);
    const crc = buf.readUInt32BE(end);
    if ((zlib.crc32(buf.subarray(pos + 4, end)) >>> 0) !== crc) throw new Error('png: bad CRC on chunk ' + name);
    if (name === 'IHDR') {
      width = buf.readUInt32BE(start); height = buf.readUInt32BE(start + 4);
      depth = buf[start + 8]; type = buf[start + 9]; interlace = buf[start + 12];
      if (buf[start + 10] !== 0 || buf[start + 11] !== 0) throw new Error('png: unknown compression/filter method');
      seenIHDR = true;
    } else if (name === 'IDAT') idat.push(buf.subarray(start, end));
    else if (name === 'IEND') break;
    else if (name === 'PLTE') throw new Error('png: palette images (PLTE) are not decoded here');
    else if (name === 'tRNS') throw new Error('png: tRNS transparency is not decoded here');
    pos = end + 4;
  }
  if (!seenIHDR) throw new Error('png: no IHDR');
  if (depth !== 8) throw new Error('png: only 8-bit samples are decoded here (this file is ' + depth + '-bit)');
  if (!(type in CHANNELS)) throw new Error('png: colour type ' + type + ' is not decoded here (0, 2, 4, 6 only)');
  if (interlace !== 0) throw new Error('png: interlaced (Adam7) images are not decoded here');
  if (!idat.length) throw new Error('png: no IDAT');

  const bpp = CHANNELS[type], stride = width * bpp;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * height) throw new Error('png: image data is short (' + raw.length + ' of ' + (stride + 1) * height + ' bytes)');
  const cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  const data = new Uint8ClampedArray(width * height * 4);
  const filters = [0, 0, 0, 0, 0];
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = y * (stride + 1) + 1;
    if (f < 5) filters[f]++;
    for (let i = 0; i < stride; i++) {
      const x = raw[row + i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let p;
      if (f === 0) p = 0;
      else if (f === 1) p = a;
      else if (f === 2) p = b;
      else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) p = paeth(a, b, c);
      else throw new Error('png: unknown filter type ' + f + ' on row ' + y);
      cur[i] = (x + p) & 255;
    }
    for (let px = 0; px < width; px++) {
      const o = (y * width + px) * 4, s = px * bpp;
      if (type === 0) { data[o] = data[o + 1] = data[o + 2] = cur[s]; data[o + 3] = 255; }
      else if (type === 2) { data[o] = cur[s]; data[o + 1] = cur[s + 1]; data[o + 2] = cur[s + 2]; data[o + 3] = 255; }
      else if (type === 4) { data[o] = data[o + 1] = data[o + 2] = cur[s]; data[o + 3] = cur[s + 1]; }
      else { data[o] = cur[s]; data[o + 1] = cur[s + 1]; data[o + 2] = cur[s + 2]; data[o + 3] = cur[s + 3]; }
    }
    cur.copy(prev);
  }
  return { width, height, data, filters };
}

module.exports = { decode };
