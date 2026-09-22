/* ─── IMAGEBYTES ──────────────────────────────────────────────────────────
   A dependency-free reader for the three formats the intake accepts. Bytes
   in; `{ type, w, h }` out, or a throw that says which byte disagreed. It
   is the gate `api/intake.js` puts every uploaded file through, and it is
   deliberately small enough to read in one sitting: nothing here decodes a
   pixel.

   WHAT IT DOES

   `sniff(buf)` answers 'png', 'jpeg', 'webp' or null from the MAGIC BYTES
   and nothing else — never a file name, never a declared content-type. A
   publisher's `art/logo.png` that begins `PK\x03\x04` is a ZIP and is
   refused; the extension is a label anyone can write, the first eight bytes
   are the file.

   `dimensions(buf, type)` reads the size out of the container the format
   actually keeps it in:
     • PNG   — the IHDR chunk, which the spec (PNG 1.2 §4.1.1) requires to be
               the first chunk after the signature: width and height are two
               big-endian uint32s at bytes 16 and 20.
     • JPEG  — there is no header to read, so the segments are WALKED from
               the SOI until a start-of-frame is met (SOF0/1/2 and the rest
               of C0–CF except C4 DHT, C8 JPG and CC DAC, which share the
               range but are not frames). Height and width are the two
               uint16s after the frame's one-byte sample precision. Walking
               means a progressive JPEG (SOF2) answers as readily as a
               baseline one, and an APP1 with a 60 KB thumbnail in it is
               stepped over rather than searched.
     • WebP  — the RIFF chunks: 'VP8X' first when it is there (its 24-bit
               canvas width-1/height-1 is the size of the finished image,
               which is what an alpha or animated file must be measured by),
               else 'VP8 ' (the lossy keyframe: a 3-byte tag, the sync code
               9d 01 2a, then 14-bit width and height) or 'VP8L' (the
               lossless bit-stream: signature 0x2f, then 14 bits of width-1
               and 14 of height-1, little-endian).

   `read(buf)` is the two of them together plus `longEdge`, which is the one
   number the intake's per-image cap is written against.

   `stripMetadata(buf, type)` returns a Buffer with the metadata containers
   removed, and carries the list of what went on a NON-ENUMERABLE `dropped`
   (the trick `Theme.derive`'s `why` uses — CONTRACTS §2 — so that
   `Buffer.concat`, `fs.writeFileSync` and `JSON.stringify` never see it):
     • PNG  — only IHDR, PLTE, tRNS, IDAT and IEND survive (`PNG_KEEP`).
              tEXt, iTXt, zTXt, eXIf and tIME are what the plan names, and
              a keep-list rather than a drop-list means a chunk nobody
              thought of — a camera's private ancillary, a lump of XMP under
              a new name — does not slip through because it was not on a
              list. Every kept chunk is copied whole, its four length bytes
              and its four CRC bytes with it, so no CRC is recomputed and
              none can be got wrong; the CRC of every chunk is CHECKED on
              the way past (zlib.crc32, the same call press/tools/lib/png.js
              makes), and a file that fails is refused rather than stored.
     • JPEG — every APPn segment goes except the ones on `JPEG_APP_KEEP`,
              which holds one entry, APP0 with the identifier 'JFIF\0'; and
              every COM. The scan data after an SOS is copied byte for byte
              to the next real marker, so progressive files with several
              scans come through whole; bytes after the EOI — where a lens
              profile or a second XMP packet likes to hide — are dropped.
              Segments carry their own two-byte lengths and are copied
              whole, so again nothing is recomputed. The one segment worth
              arguing about is APP2 ICC_PROFILE, which a browser's own
              `toDataURL('image/jpeg')` writes and which this drops: for an
              sRGB profile that costs nothing, measured — Chrome decoded a
              320 × 200 JPEG before and after the strip and 0 of its 256,000
              samples moved (2026-09-07, the run in press/CHANGELOG.md) —
              but a Display-P3 photograph would shift, and the one-line fix
              is a second entry on `JPEG_APP_KEEP`.
     • WebP — the 'EXIF' and 'XMP ' chunks are dropped from the RIFF, the
              enclosing RIFF size is rewritten (it is the only length in the
              file that changes), and the VP8X flags byte has its EXIF bit
              (0x08) and XMP bit (0x04) cleared, because a container that
              advertises metadata it no longer holds is a file some decoders
              call corrupt.

   WHAT IT DOES NOT DO, and this is the important half

   IT NEVER RE-ENCODES PIXELS. Every byte of image data — IDAT, the JPEG
   scan, VP8 — is copied through untouched. That is what makes the strip
   safe (the picture out is the picture in, provably: the test decodes both
   in a canvas and compares) and it is also the limit: THIS FILE CANNOT
   RESIZE. The plan (§12 2) says intake should "cap size" by re-encoding
   every image with `sharp`; sharp is not installed on this machine and is
   not to be, so `api/intake.js` enforces the cap the only other way there
   is — it REJECTS an image whose long edge is over `MAX_LONG_EDGE`, with a
   message that says what to do. A Vercel deployment with sharp in the
   function's dependencies would resize instead of rejecting, and that is a
   deploy-time decision for the owner: the reject path needs no npm at all
   and never runs a decoder over a stranger's bytes, the resize path is
   kinder to a publisher with a 6000-px key art. `api/intake.js`'s header
   says where the one call would go.

   Three more things it does not do: it does not strip PNG colour chunks
   selectively — gAMA, sRGB, iCCP and cHRM are not on `PNG_KEEP`, so they go
   too, and a wide-gamut PNG will therefore be shown as sRGB (add the three
   names to `PNG_KEEP` if that ever matters more than the strip); it does
   not touch a WebP's ICCP chunk, which describes the pixels rather than the
   photographer; and it does not validate that a file decodes — a PNG whose
   IDAT is nonsense passes here and fails in a browser.

       const img = require('./lib/imagebytes');
       const { type, w, h } = img.read(buf);
       const clean = img.stripMetadata(buf, type);   // clean.dropped tells you what went
   ───────────────────────────────────────────────────────────────────────── */
'use strict';
const zlib = require('zlib');

/* The three formats, and their magic. PNG's eight bytes are the signature
   from PNG 1.2 §3.1 (the 0x89 makes a 7-bit channel corrupt it visibly, the
   CRLF/LF pair catches a text-mode transfer). A JPEG is FF D8 FF: SOI plus
   the FF that opens whatever segment comes next, which rules out a bare
   FF D8 in some other file's first two bytes. A WebP is a RIFF container
   with 'WEBP' as its form type — the four bytes at 0 and the four at 8, with
   the file's own length between them, which is why the check needs 12
   bytes and not 4. */
const MAGIC = Object.freeze({
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  jpeg: Buffer.from([0xff, 0xd8, 0xff])
});
const TYPES = Object.freeze(['png', 'jpeg', 'webp']);
/* The extension each type is stored under. JPEG's is 'jpg' because that is
   what a publisher's folder will already call it. */
const EXT = Object.freeze({ png: 'png', jpeg: 'jpg', webp: 'webp' });
const MIME = Object.freeze({ png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' });

/* The PNG chunks that survive a strip. Five, and the reasoning is in the
   header: a keep-list cannot be outflanked by a chunk name nobody has heard
   of. IHDR is the size and colour type, PLTE and tRNS are the palette and
   its transparency (a colour-type-3 PNG is blank without them), IDAT is the
   picture and IEND is the full stop. */
const PNG_KEEP = Object.freeze(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);

/* WebP's VP8X flags byte, bit for bit (WebP container spec, the
   `Rsv I L E X A R` diagram; libwebp spells the same numbers ICCP_FLAG
   0x20, ALPHA_FLAG 0x10, EXIF_FLAG 0x08, XMP_FLAG 0x04). Only the two
   metadata bits are ever cleared here. */
const VP8X_EXIF = 0x08;
const VP8X_XMP = 0x04;

/* A JPEG segment's length field is two bytes, so 65535 is the largest a
   segment can claim and there is nothing to guard; a PNG chunk's is four,
   and a claimed length past the end of the buffer is caught by the bounds
   check rather than by a size constant. Neither number appears below —
   this comment is here so the next reader does not go looking for them. */

function isPng(buf) { return buf.length >= 8 && buf.subarray(0, 8).equals(MAGIC.png); }
function isJpeg(buf) { return buf.length >= 3 && buf.subarray(0, 3).equals(MAGIC.jpeg); }
function isWebp(buf) {
  return buf.length >= 12 &&
    buf.toString('latin1', 0, 4) === 'RIFF' &&
    buf.toString('latin1', 8, 12) === 'WEBP';
}

function sniff(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (isPng(buf)) return 'png';
  if (isJpeg(buf)) return 'jpeg';
  if (isWebp(buf)) return 'webp';
  return null;
}

function fail(msg) { throw new Error('imagebytes: ' + msg); }

// ── PNG ───────────────────────────────────────────────────────────────────

/* Every chunk of a PNG, in order, with its CRC checked. The walk is shared
   by dimensions() and stripMetadata() so the two can never disagree about
   where a chunk begins. `cb(name, start, end, whole)` — `start`/`end` bound
   the payload, `whole` is length + name + payload + CRC, the slice a copy
   wants. Returning false from cb stops the walk. */
function eachPngChunk(buf, cb) {
  let pos = 8, first = true, sawEnd = false;
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const name = buf.toString('latin1', pos + 4, pos + 8);
    if (!/^[A-Za-z]{4}$/.test(name)) fail('png chunk name at byte ' + pos + ' is not four letters');
    const start = pos + 8, end = start + len;
    if (end + 4 > buf.length) fail('png is truncated inside chunk ' + name);
    if ((zlib.crc32(buf.subarray(pos + 4, end)) >>> 0) !== buf.readUInt32BE(end)) fail('png chunk ' + name + ' fails its CRC');
    if (first && name !== 'IHDR') fail('png does not start with IHDR (it starts with ' + name + ')');
    first = false;
    const go = cb(name, start, end, buf.subarray(pos, end + 4));
    pos = end + 4;
    if (name === 'IEND') { sawEnd = true; break; }
    if (go === false) return { pos, sawEnd };
  }
  return { pos, sawEnd };
}

function pngSize(buf) {
  if (buf.length < 24) fail('png is shorter than its own IHDR');
  let size = null;
  eachPngChunk(buf, (name, start) => {
    if (name !== 'IHDR') return false;
    size = { w: buf.readUInt32BE(start), h: buf.readUInt32BE(start + 4) };
    return false;
  });
  if (!size) fail('png has no IHDR');
  return size;
}

function stripPng(buf) {
  const out = [buf.subarray(0, 8)];
  const dropped = [];
  const walked = eachPngChunk(buf, (name, start, end, whole) => {
    if (PNG_KEEP.indexOf(name) >= 0) out.push(whole);
    else dropped.push({ name: name, bytes: whole.length });
  });
  if (!walked.sawEnd) fail('png has no IEND');
  if (walked.pos < buf.length) dropped.push({ name: 'after-IEND', bytes: buf.length - walked.pos });
  return { bytes: Buffer.concat(out), dropped: dropped };
}

// ── JPEG ──────────────────────────────────────────────────────────────────

/* The start-of-frame markers: C0–CF except C4 (DHT, the Huffman tables),
   C8 (JPG, reserved) and CC (DAC, arithmetic conditioning). Those three sit
   inside the range and are not frames, which is the one thing a naive
   "is it C0..CF" walk gets wrong. */
function isSof(m) { return m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc; }

/* The APPn segments that survive a strip, marker and payload identifier
   together — one entry, and it is the JFIF header, which is the segment a
   decoder may actually want (it carries the density units some tools read).
   An APP1 that started with 'JFIF\0' would not be kept by this: the marker
   has to match too, because an identifier alone is a string anyone can put
   at the front of an EXIF block. Add { marker: 0xe2, id: 'ICC_PROFILE\0' }
   here to keep colour profiles — see the header for what that is worth. */
const JPEG_APP_KEEP = Object.freeze([{ marker: 0xe0, id: 'JFIF\u0000' }]);
function keepsApp(buf, pos, m) {
  return JPEG_APP_KEEP.some(k => k.marker === m && buf.toString('latin1', pos + 4, pos + 4 + k.id.length) === k.id);
}
function markerName(m) {
  if (m >= 0xe0 && m <= 0xef) return 'APP' + (m - 0xe0);
  if (m === 0xfe) return 'COM';
  return 'FF' + m.toString(16).toUpperCase().padStart(2, '0');
}

/* Walk the segments from the SOI. `cb(marker, pos, end)` sees every one;
   `pos` is the FF, `end` is one past the segment (for a marker with no
   payload, pos + 2). Entropy-coded scan data after an SOS is handed to
   `scan(from, to)` — it cannot be walked as segments, only searched for the
   next real marker: an FF inside the scan is stuffed (FF 00) or a restart
   (FF D0–D7), and anything else is the next segment. */
function eachJpegSegment(buf, cb, scan) {
  if (!isJpeg(buf)) fail('not a jpeg');
  let pos = 2;
  while (pos + 1 < buf.length) {
    if (buf[pos] !== 0xff) fail('jpeg lost the marker at byte ' + pos);
    let at = pos;
    while (buf[at + 1] === 0xff) at++;              // FF fill bytes before a marker are legal
    const m = buf[at + 1];
    if (m === undefined) fail('jpeg ends on a marker');
    if (m === 0xd9) { cb(m, at, at + 2); return { pos: at + 2, sawEnd: true }; }
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { cb(m, at, at + 2); pos = at + 2; continue; }
    if (at + 4 > buf.length) fail('jpeg is truncated in the length of ' + markerName(m));
    const len = buf.readUInt16BE(at + 2);
    if (len < 2) fail('jpeg segment ' + markerName(m) + ' claims a length of ' + len);
    const end = at + 2 + len;
    if (end > buf.length) fail('jpeg segment ' + markerName(m) + ' runs past the end of the file');
    if (cb(m, at, end) === false) return { pos: end, sawEnd: false };
    pos = end;
    if (m === 0xda) {
      let q = pos;
      while (q + 1 < buf.length) {
        if (buf[q] === 0xff) {
          const n = buf[q + 1];
          if (n !== 0x00 && n !== 0xff && !(n >= 0xd0 && n <= 0xd7)) break;
        }
        q++;
      }
      if (q + 1 >= buf.length) fail('jpeg ends inside a scan, with no EOI');
      if (scan) scan(pos, q);
      pos = q;
    }
  }
  fail('jpeg ends without an EOI');
}

function jpegSize(buf) {
  let size = null;
  eachJpegSegment(buf, (m, pos) => {
    if (!isSof(m)) return;
    size = { h: buf.readUInt16BE(pos + 5), w: buf.readUInt16BE(pos + 7) };
    return false;
  });
  if (!size) fail('jpeg has no start-of-frame segment');
  return size;
}

function stripJpeg(buf) {
  const out = [];
  const dropped = [];
  const walked = eachJpegSegment(buf, (m, pos, end) => {
    const app = m >= 0xe0 && m <= 0xef;
    if ((app && !keepsApp(buf, pos, m)) || m === 0xfe) dropped.push({ name: markerName(m), bytes: end - pos });
    else out.push(buf.subarray(pos, end));
  }, (from, to) => out.push(buf.subarray(from, to)));
  if (walked.pos < buf.length) dropped.push({ name: 'after-EOI', bytes: buf.length - walked.pos });
  return { bytes: Buffer.concat([MAGIC.jpeg.subarray(0, 2)].concat(out)), dropped: dropped };
}

// ── WebP ──────────────────────────────────────────────────────────────────

/* The RIFF chunks after the twelve-byte header. Each is a four-character
   code, a little-endian uint32 payload size, the payload, and a pad byte
   when that size is odd — the pad is part of the container, not of the
   chunk, which is why `padded` and `end` are two different numbers here. */
function eachRiffChunk(buf, cb) {
  let pos = 12;
  while (pos + 8 <= buf.length) {
    const cc = buf.toString('latin1', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const end = pos + 8 + size;
    if (end > buf.length) fail('webp chunk ' + cc.trim() + ' runs past the end of the file');
    cb(cc, pos, end, size);
    pos = end + (size & 1);
  }
  return pos;
}

function webpSize(buf) {
  let x = null, first = null;
  eachRiffChunk(buf, (cc, pos, end, size) => {
    const p = pos + 8;
    if (cc === 'VP8X' && size >= 10 && !x) {
      x = { w: (buf[p + 4] | (buf[p + 5] << 8) | (buf[p + 6] << 16)) + 1,
            h: (buf[p + 7] | (buf[p + 8] << 8) | (buf[p + 9] << 16)) + 1 };
    } else if (cc === 'VP8 ' && !first && size >= 10) {
      if (!(buf[p + 3] === 0x9d && buf[p + 4] === 0x01 && buf[p + 5] === 0x2a)) fail('webp VP8 keyframe has no sync code');
      first = { w: buf.readUInt16LE(p + 6) & 0x3fff, h: buf.readUInt16LE(p + 8) & 0x3fff };
    } else if (cc === 'VP8L' && !first && size >= 5) {
      if (buf[p] !== 0x2f) fail('webp VP8L has no 0x2f signature');
      const bits = buf.readUInt32LE(p + 1);
      first = { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
    }
  });
  if (x) return x;
  if (first) return first;
  fail('webp holds no VP8X, VP8 or VP8L chunk');
}

function stripWebp(buf) {
  const kept = [];
  const dropped = [];
  let vp8x = -1;
  eachRiffChunk(buf, (cc, pos, end, size) => {
    if (cc === 'EXIF' || cc === 'XMP ') { dropped.push({ name: cc.trim(), bytes: 8 + size + (size & 1) }); return; }
    /* Copied, and re-padded if the source left its last pad byte off — the
       chunk after it would otherwise start one byte early. */
    let chunk = buf.subarray(pos, end);
    if (size & 1) chunk = Buffer.concat([chunk, Buffer.from([0])]);
    if (cc === 'VP8X' && vp8x < 0) vp8x = kept.length;   // the first one: the spec allows exactly one, and a second is a forgery
    kept.push(chunk);
  });
  if (dropped.length && vp8x >= 0) {
    const c = Buffer.from(kept[vp8x]);
    c[8] &= ~(VP8X_EXIF | VP8X_XMP);
    kept[vp8x] = c;
  }
  const body = Buffer.concat(kept);
  const head = Buffer.alloc(12);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(4 + body.length, 4);           // the RIFF size counts 'WEBP' and everything after it
  head.write('WEBP', 8, 'latin1');
  return { bytes: Buffer.concat([head, body]), dropped: dropped };
}

// ── the three doors ───────────────────────────────────────────────────────

function dimensions(buf, type) {
  type = type || sniff(buf);
  if (type === 'png') return pngSize(buf);
  if (type === 'jpeg') return jpegSize(buf);
  if (type === 'webp') return webpSize(buf);
  fail('not a PNG, JPEG or WebP (the first bytes are ' +
    (Buffer.isBuffer(buf) && buf.length ? [...buf.subarray(0, 4)].map(b => b.toString(16).padStart(2, '0')).join(' ') : 'none') + ')');
}

function read(buf) {
  if (!Buffer.isBuffer(buf)) fail('read() wants a Buffer');
  if (!buf.length) fail('the file is empty');
  const type = sniff(buf);
  if (!type) return dimensions(buf, null);          // throws with the bytes in the message
  const size = dimensions(buf, type);
  if (!(size.w > 0 && size.h > 0)) fail(type + ' declares a size of ' + size.w + '×' + size.h);
  return { type: type, w: size.w, h: size.h, bytes: buf.length, longEdge: Math.max(size.w, size.h) };
}

function stripMetadata(buf, type) {
  type = type || sniff(buf);
  let r;
  if (type === 'png') r = stripPng(buf);
  else if (type === 'jpeg') r = stripJpeg(buf);
  else if (type === 'webp') r = stripWebp(buf);
  else fail('stripMetadata does not know the type ' + type);
  Object.defineProperty(r.bytes, 'dropped', { value: r.dropped, enumerable: false });
  return r.bytes;
}

module.exports = { sniff, dimensions, read, stripMetadata, TYPES, EXT, MIME, MAGIC, PNG_KEEP, VP8X_EXIF, VP8X_XMP };
