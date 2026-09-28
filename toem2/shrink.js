/* toem2/shrink.js — A PICTURE, AS THE ALBUM'S DOOR TAKES IT (2026-09-28): 1600 px a side at most and under
   300 KB (api/gallery.js: BYTES), as a JPEG — smaller and softer until it fits. One function for the two places
   a photo is put up from: a page's dashboard (dashboard/manage.js, where it was written) and the album on the
   bench (gallery.js). Shrink(file) answers a data: url, or throws for what is no picture or will not fit. */
window.Shrink = function (file) {
  const BYTES = 300 * 1024;
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const c = document.createElement('canvas'), x = c.getContext('2d');
      for (const side of [1600, 1200, 900, 640, 480]) {
        const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
        c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.86, 0.76, 0.66, 0.56]) { const out = c.toDataURL('image/jpeg', q); if (out.length * 0.75 <= BYTES) return ok(out); }
      }
      no(new Error('too big'));
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('not a picture')); };
    img.src = url;
  });
};
