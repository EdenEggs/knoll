/* ── account.js — THE ACCOUNT CORNER ────────────────────────────────────────
   The right-hand end of the house bar, on every page of the site: a search
   like the yard's, and then either LOG IN and SIGN UP or — signed in — your
   gnome, whose eyes follow the pointer and who takes you to your yard (or,
   once you have given the yard's K one, your picture: YOUR PICTURE). One
   file, so it is one corner everywhere; a page takes it with one tag.

   WHO IS SIGNED IN is known twice. At once, from the knoll_in cookie
   (api/wall.js: THE SITE'S SESSION IS A COOKIE), which says an id and
   nothing more — so a signed-out page draws its two buttons with no request
   at all, and a signed-in one draws its gnome before anything comes back.
   Then from the door (/api/auth), which says who that is, or that the
   session has lapsed (and takes the cookies away). KnollAccount.me is that
   second answer, a promise, for a page that wants it — the yard's tour.

   WHERE IT GOES: the last thing in the page's .lab-head or .knoll-head,
   pushed right by margin-left:auto — found after React has drawn it, on the
   pages that are Design Canvas documents (never the copy inside <x-dc>,
   which React throws away), and put back if React ever draws the bar again.
   On a bench's workbench (html.lab-local, and a tag that says data-bench)
   it stays away: that header is the bench's own controls. ?visitor on
   localhost shows a bench the way the site does, corner and all.

   THE SEARCH is the yard's — its lens, its box, its type — laid over the bar
   rather than in its row, so opening it never moves a thing. It finds the
   site's places by name; gnomes and marks want an index there is not yet.

   ponytail: the places are a list in this file; a new page is a line here. */
(function () {
  'use strict';
  if (window.KnollAccount) return;
  const tag = document.currentScript;
  const LOCAL_PATH = /^\/(?![\/\\])[^\s\\]*$/;          // api/wall.js: localPath
  const id = (/(?:^|;\s*)knoll_in=([0-9a-f]{16})(?:;|$)/.exec(document.cookie) || [])[1] || null;
  const q = new URLSearchParams(location.search);
  const PAGE = (/^\/(login|signup|yard)\/?$/.exec(location.pathname) || [])[1] || '';
  const INK = '#17120b', CREAM = '#fdf7e3';

  // where a log-in from here comes back to: this page — or, on a gate page, wherever that gate was going
  const back = () => {
    if (PAGE === 'login' || PAGE === 'signup') { const n = q.get('next') || ''; return n.length <= 512 && LOCAL_PATH.test(n) ? n : '/yard/'; }
    return location.pathname + location.search + location.hash;
  };
  const gate = page => '/' + page + '/?next=' + encodeURIComponent(back());

  let told;
  const me = new Promise(r => { told = r; });
  // the door did not answer, or answered in trouble: the cookie is all there is, and no tour is owed on the strength of it
  const unsure = () => told({ id, name: '', toured: true, offline: true });
  if (!id) told(null);
  else fetch('/api/auth', { cache: 'no-store', credentials: 'same-origin' })
    .then(r => r.json())
    .then(v => (v && v.ok ? told(v.me || null) : unsure()))   // null only when the door says nobody is signed in
    .catch(unsure);

  /* YOUR PICTURE is the door's (api/auth.js: THE PICTURE), and this device
     keeps the last one it saw for the account signed in here, so a page
     draws it at once instead of a gnome that turns into it. Signed out, or
     the door saying there is none, and it is not kept. The yard sets it
     (yard/index.html: THE PICTURE) through setPic. */
  const PIC = 'knoll-account:pic', isPic = s => typeof s === 'string' && s.indexOf('data:image/jpeg;base64,') === 0;
  const picOf = () => { try { const c = JSON.parse(localStorage.getItem(PIC)); return c && c.id === id && isPic(c.src) ? c.src : ''; } catch (e) { return ''; } };
  const keepPic = src => { try { if (id && isPic(src)) localStorage.setItem(PIC, JSON.stringify({ id, src })); else localStorage.removeItem(PIC); } catch (e) {} };
  if (!id) keepPic('');
  me.then(who => { if (who === null || (who && who.avatar != null)) keepPic(who && who.avatar); });
  let showPic = () => {};                  // the corner's, once there is one (below)

  const api = window.KnollAccount = { id, me, gate, find: () => {}, pic: picOf, setPic: src => { keepPic(src); showPic(src); } };

  if (/[?&]embed\b/.test(location.search)) return;   // the dashboard's picture of the yard, the yard's pictures of a space

  /* ── the visit ─────────────────────────────────────────────────────────
     The yard's Spaces you've visited is where you have been (yard/index.html:
     THE HILLS ARE WHAT YOU SAVED), so a space you open, signed in, goes to the
     front of knoll-yard:visits — a path and a time, and the yard maps the
     path to a space by its own table. A picture of a space (?embed, the
     yard's own mounds) returned above and is no visit. The yard's owner check clears the list with the rest of
     knoll-yard: when somebody else signs in on this device.
     ponytail: one device's list, not the account's; a door op if it must follow you. */
  const SPACES = ['/toem2/'];
  if (id && SPACES.indexOf(location.pathname) >= 0) try {
    const k = 'knoll-yard:visits';
    let v = JSON.parse(localStorage.getItem(k));
    if (!Array.isArray(v)) v = [];
    v = [{ path: location.pathname, at: Date.now() }].concat(v.filter(x => x && x.path !== location.pathname)).slice(0, 12);
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}

  // the workbench's header is the bench's own controls: no corner there (a visit there still counts, above)
  if (tag && tag.hasAttribute('data-bench') && document.documentElement.classList.contains('lab-local')) return;

  // ── the corner ──────────────────────────────────────────────────────────
  const css = document.createElement('style');
  css.id = 'knoll-account-css';
  css.textContent = [
    '#knoll-account,#knoll-account *{box-sizing:border-box}',
    '#knoll-account{margin-left:auto;display:flex;align-items:center;gap:10px;flex:none;position:relative}',
    '#knoll-account [hidden],#knoll-account .ka-fold{display:none!important}',
    '#knoll-account .ka-btn{height:30px;margin:-2px 0;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;',
    '  background:' + CREAM + ';color:' + INK + ';border:2.5px solid ' + INK + ';border-radius:0;box-shadow:3px 3px 0 rgba(60,50,80,.22);',
    "  font:18px/1 'VT323',monospace;letter-spacing:1px;text-transform:uppercase;text-decoration:none;white-space:nowrap;cursor:pointer;",
    '  transform:rotate(-1deg);transition:transform .15s,box-shadow .15s}',
    '#knoll-account .ka-btn:hover{color:' + INK + ';transform:rotate(-1deg) translate(1px,1px);box-shadow:2px 2px 0 rgba(60,50,80,.22)}',
    '#knoll-account .ka-ink{background:' + INK + ';color:' + CREAM + ';transform:rotate(1deg)}',
    '#knoll-account .ka-ink:hover{background:#3a3342;color:' + CREAM + ';transform:rotate(1deg) translate(1px,1px)}',
    '#knoll-account .ka-lens{width:30px;padding:0}',
    '#knoll-account .ka-lens[aria-expanded="true"]{background:' + INK + '}',
    '#knoll-account .ka-lens[aria-expanded="true"] svg *{stroke:' + CREAM + '}',
    '#knoll-account .ka-btn:focus-visible,#knoll-account .ka-me:focus-visible,#knoll-account input:focus-visible,#knoll-account .ka-hits a:focus-visible{outline:2px solid #c93b82;outline-offset:3px}',
    '#knoll-account .ka-find{display:flex}',
    // beside the lens where there is room for it (place(), below), under the corner where there is not
    '#knoll-account .ka-box{position:absolute;top:50%;transform:translateY(-50%);width:min(250px,calc(100vw - 24px));margin:0;z-index:30}',
    '#knoll-account .ka-box.ka-under{top:calc(100% + 12px);transform:none}',
    '#knoll-account .ka-box input{display:block;width:100%;height:30px;margin:0;padding:0 10px;background:' + CREAM + ';color:' + INK + ';',
    '  border:2.5px solid ' + INK + ';border-radius:0;box-shadow:3px 3px 0 rgba(60,50,80,.22);outline:0;',
    "  font:17px/1 'VT323',monospace;letter-spacing:1.5px;text-transform:uppercase;-webkit-appearance:none;appearance:none}",
    '#knoll-account .ka-box input::placeholder{color:' + INK + ';opacity:.45}',
    '#knoll-account .ka-hits{position:absolute;top:calc(100% + 8px);left:0;right:0;margin:0;padding:4px 0;list-style:none;',
    '  background:' + CREAM + ';border:2.5px solid ' + INK + ';box-shadow:3px 3px 0 rgba(60,50,80,.22)}',
    '#knoll-account .ka-hits:empty{display:none}',
    "#knoll-account .ka-hits a{display:block;padding:6px 10px;color:" + INK + ";text-decoration:none;font:17px/1.1 'VT323',monospace;letter-spacing:1px;text-transform:uppercase}",
    '#knoll-account .ka-hits a:hover,#knoll-account .ka-hits a.is-first{background:#ffd23f;color:' + INK + '}',
    // the gnome's menu, on the yard: the search's list, hung under the corner's right end
    '#knoll-account .ka-menu{position:absolute;top:calc(100% + 12px);right:0;width:150px;margin:0;padding:4px 0;list-style:none;z-index:30;',
    '  background:' + CREAM + ';border:2.5px solid ' + INK + ';box-shadow:3px 3px 0 rgba(60,50,80,.22)}',
    "#knoll-account .ka-menu button{display:block;width:100%;padding:6px 10px;border:0;background:none;color:" + INK + ";text-align:left;cursor:pointer;font:17px/1.1 'VT323',monospace;letter-spacing:1px;text-transform:uppercase}",
    '#knoll-account .ka-menu button:hover,#knoll-account .ka-menu button:focus-visible{background:#ffd23f;outline:0}',
    '#knoll-account .ka-me[role="button"]{cursor:pointer}',
    "#knoll-account .ka-none{padding:6px 10px;font:15px/1.3 'VT323',monospace;letter-spacing:1px;color:#4a4054}",
    '#knoll-account .ka-me{display:block;height:42px;margin:-8px 2px -8px 4px;line-height:0;color:inherit;text-decoration:none}',
    '#knoll-account .ka-me[href]{cursor:pointer}',
    '#knoll-account .ka-me svg{display:block;overflow:visible;transition:transform .2s cubic-bezier(.3,1.5,.5,1)}',
    '#knoll-account .ka-me[href]:hover svg{transform:translateY(-2px) rotate(-4deg)}',
    // your picture, where it has one: the gnome's head gives it its place, in the buttons' frame
    '#knoll-account .ka-me.ka-has-pic svg{display:none}',
    '#knoll-account .ka-pic{display:block;width:30px;height:30px;margin:6px 0;object-fit:cover;background:' + CREAM + ';border:2.5px solid ' + INK + ';',
    '  box-shadow:3px 3px 0 rgba(60,50,80,.22);transition:transform .2s cubic-bezier(.3,1.5,.5,1)}',
    '#knoll-account .ka-me[href]:hover .ka-pic{transform:translateY(-2px) rotate(-4deg)}',
    '.lab-head.ka-open{overflow:visible}',            // lab.css clips the bar (for the workbench's long hint); an open search hangs below it
    '@media (max-width:560px){#knoll-account{gap:7px}#knoll-account .ka-btn{padding:0 8px;font-size:16px}#knoll-account .ka-lens{padding:0}}',
    '@media (prefers-reduced-motion:reduce){#knoll-account .ka-btn,#knoll-account .ka-me svg,#knoll-account .ka-pic{transition:none}}'
  ].join('\n');

  const corner = document.createElement('div');
  corner.id = 'knoll-account';
  corner.setAttribute('role', 'group');
  corner.setAttribute('aria-label', 'your account');
  // the yard's lens (yard/index.html: the search button), at the bar's size
  corner.innerHTML =
    '<div class="ka-find">' +
      '<form class="ka-box" role="search" hidden><input type="search" placeholder="search the hill" aria-label="search the hill" autocomplete="off" spellcheck="false" maxlength="60">' +
        '<ul class="ka-hits" aria-live="polite"></ul></form>' +
      '<button type="button" class="ka-btn ka-lens" aria-label="search" title="search" aria-expanded="false">' +
        '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><circle cx="10" cy="10" r="6.2" fill="none" stroke="' + INK + '" stroke-width="2.8"/>' +
        '<line x1="14.6" y1="14.6" x2="21" y2="21" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/></svg></button>' +
    '</div>' +
    '<a class="ka-btn ka-in" hidden>log in</a>' +
    '<a class="ka-btn ka-ink ka-up" hidden>sign up</a>' +
    // the yard's gnome (yard/index.html: the head of the gnome beside the K), head only
    '<a class="ka-me" hidden><svg viewBox="50 -2 120 208" width="24" height="42" aria-hidden="true" focusable="false"><g class="ka-head">' +
      '<ellipse cx="72" cy="116" rx="8" ry="11" fill="#f5b8c4" stroke="#17120b" stroke-width="4"/>' +
      '<ellipse cx="148" cy="116" rx="8" ry="11" fill="#f5b8c4" stroke="#17120b" stroke-width="4"/>' +
      '<circle cx="110" cy="112" r="40" fill="#f0cfae" stroke="#17120b" stroke-width="5"/>' +
      '<path d="M64,118 Q110,148 156,118 Q164,186 110,202 Q56,186 64,118 Z" fill="#f7f0df" stroke="#17120b" stroke-width="5" stroke-linejoin="round"/>' +
      '<path d="M83,95 Q92,87 100,93" fill="none" stroke="#17120b" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M120,93 Q128,87 137,95" fill="none" stroke="#17120b" stroke-width="4" stroke-linecap="round"/>' +
      '<circle cx="93" cy="114" r="9" fill="#fff" stroke="#17120b" stroke-width="4"/>' +
      '<circle cx="127" cy="114" r="9" fill="#fff" stroke="#17120b" stroke-width="4"/>' +
      '<g class="ka-eyes"><circle cx="93" cy="115" r="4" fill="#17120b"/><circle cx="127" cy="115" r="4" fill="#17120b"/></g>' +
      '<ellipse cx="110" cy="145" rx="7" ry="8" fill="#5b3324" stroke="#17120b" stroke-width="4"/>' +
      '<ellipse cx="91" cy="136" rx="11" ry="5.5" transform="rotate(-24 91 136)" fill="#fffaf0" stroke="#17120b" stroke-width="4"/>' +
      '<ellipse cx="129" cy="136" rx="11" ry="5.5" transform="rotate(24 129 136)" fill="#fffaf0" stroke="#17120b" stroke-width="4"/>' +
      '<circle cx="110" cy="126" r="13" fill="#e8a583" stroke="#17120b" stroke-width="5"/>' +
      '<circle cx="106" cy="122" r="3.5" fill="rgba(255,255,255,0.55)"/>' +
      '<path d="M110,10 L158,90 L62,90 Z" fill="#e8484a" stroke="#17120b" stroke-width="5" stroke-linejoin="round"/>' +
      '<rect x="96" y="50" width="14" height="14" transform="rotate(-12 103 57)" fill="#b83739" stroke="#17120b" stroke-width="3" stroke-dasharray="4 3"/>' +
      '<rect x="54" y="84" width="112" height="22" rx="11" fill="#b83739" stroke="#17120b" stroke-width="5"/>' +
      '<rect x="68" y="90" width="26" height="6" rx="3" fill="rgba(255,255,255,0.35)"/>' +
      '<circle cx="110" cy="12" r="10" fill="#fdf7e3" stroke="#17120b" stroke-width="5"/>' +
    '</g></svg><img class="ka-pic" alt="" hidden></a>' +
    '<ul class="ka-menu" hidden><li><button type="button" class="ka-out">log out</button></li><li class="ka-none" hidden>the door did not answer — try again</li></ul>';
  const $ = s => corner.querySelector(s);
  const lens = $('.ka-lens'), box = $('.ka-box'), input = $('input'), hits = $('.ka-hits');
  const inBtn = $('.ka-in'), upBtn = $('.ka-up'), gnome = $('.ka-me'), eyes = $('.ka-eyes'), head = $('.ka-head');
  const menu = $('.ka-menu'), outBtn = $('.ka-out'), outNote = menu.querySelector('.ka-none'), pic = $('.ka-pic');
  let bar = null;                        // the house bar the corner stands in (mount(), below)
  showPic = src => {
    const on = isPic(src);
    if (on) pic.src = src; else pic.removeAttribute('src');
    pic.hidden = !on; gnome.classList.toggle('ka-has-pic', on);
  };

  // ── signed in, or not ───────────────────────────────────────────────────
  function draw(who) {
    const on = !!who;
    inBtn.hidden = on || PAGE === 'login';
    upBtn.hidden = on || PAGE === 'signup';
    gnome.hidden = !on;
    if (on) {
      const name = who.tag || who.name || '';     // Mossy#3 (api/wall.js: THE NAMES)
      gnome.setAttribute('aria-label', name ? name + '’s yard' : 'your yard');
      gnome.title = name ? 'your yard — ' + name : 'your yard';
      showPic(who.avatar != null ? who.avatar : picOf());   // the door's word on it, or — before it has answered — this device's
      // the yard is the page you are on: not a link back to itself, but the menu with LOG OUT in it
      if (PAGE === 'yard') {
        gnome.removeAttribute('href'); gnome.setAttribute('aria-current', 'page');
        gnome.setAttribute('role', 'button'); gnome.tabIndex = 0;
        gnome.setAttribute('aria-haspopup', 'true'); gnome.setAttribute('aria-expanded', String(!menu.hidden));
        gnome.title = 'you — ' + (name || 'gnome');
      }
      else gnome.href = '/yard/';
    } else {
      inBtn.href = gate('login');
      upBtn.href = gate('signup');
    }
    signedIn = on;
    if (!box.hidden) list();
    fit();
  }
  /* ONE ROW MORE IS ONE ROW TOO MANY. On a phone the corner can wrap the bar
     onto a row of its own (TOEM 2's, beside its submit button; the hive's,
     beside its long name) — so there, and only there, LOG IN folds away and
     SIGN UP stays: the sign-up page says "Already a resident? Log in at the
     gate", and the search finds the gate too. It comes back the moment there
     is room, and stays folded only where folding actually saves the row. */
  function fit() {
    if (!bar || !corner.isConnected || (inBtn.hidden && !inBtn.classList.contains('ka-fold'))) return;
    inBtn.classList.remove('ka-fold');
    const prev = Array.from(bar.children).filter(el => el !== corner && el.offsetParent !== null).pop();
    const wrapped = () => !!prev && corner.getBoundingClientRect().top >= prev.getBoundingClientRect().bottom - 1;
    if (!wrapped()) return;
    inBtn.classList.add('ka-fold');
    if (wrapped()) inBtn.classList.remove('ka-fold');
  }
  let signedIn = !!id;
  draw(id ? { id, name: '' } : null);
  me.then(draw);

  // ── the eyes ────────────────────────────────────────────────────────────
  /* The yard's gnome watches your cursor (yard/index.html: head + eyes follow
     the cursor) and so does this one: pupils toward the pointer, the head a
     few degrees after them, one frame at a time, and nothing at all for a
     page asked to be still. Its box is measured once and again only after a
     scroll or a resize, not on every move. */
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  let still = false;
  try { still = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  let rect = null, raf = 0, mx = 0, my = 0;
  const forget = () => { rect = null; };
  window.addEventListener('scroll', forget, { passive: true, capture: true });
  window.addEventListener('resize', forget, { passive: true });
  window.addEventListener('mousemove', e => {
    if (still || gnome.hidden || !pic.hidden) return;   // a picture has no eyes to turn
    mx = e.clientX; my = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!rect) rect = gnome.getBoundingClientRect();
      if (!rect.height) { rect = null; return; }
      const k = rect.height / 208, dx = mx - (rect.left + 60 * k), dy = my - (rect.top + 116 * k);
      eyes.setAttribute('transform', 'translate(' + clamp(dx / 40, -4.5, 4.5).toFixed(2) + ' ' + clamp(dy / 50, -3.5, 3.5).toFixed(2) + ')');
      head.setAttribute('transform', 'rotate(' + clamp(Math.atan2(dx, 320) * 57.3, -10, 10).toFixed(1) + ' 110 140)');
    });
  }, { passive: true });

  // ── the search ──────────────────────────────────────────────────────────
  const PLACES = [                         // name, where, the other words it answers to, who it is for
    ['Knoll — the front page', '/', 'home hill lab front knoll'],
    ['TOEM 2', '/toem2/', 'toem wall plates levels game'],
    ['Your yard', '/yard/', 'profile plot mine settings gnome', 'in'],
    ['Your dashboard', '/dashboard/', 'numbers stats visits likes', 'in']
  ];
  function list() {
    const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
    const found = PLACES.filter(p => (!p[3] || (p[3] === 'in') === signedIn) &&
      words.every(w => (p[0] + ' ' + p[2]).toLowerCase().includes(w))).slice(0, 6);
    hits.textContent = '';
    found.forEach((p, i) => {
      const li = document.createElement('li'), a = document.createElement('a');
      a.href = p[1];
      a.textContent = p[0];
      if (i === 0 && words.length) a.className = 'is-first';
      li.appendChild(a); hits.appendChild(li);
    });
    if (!found.length) {
      const li = document.createElement('li');
      li.className = 'ka-none';
      li.textContent = 'nothing on the hill by that name — gnome and mark search is still to come';
      hits.appendChild(li);
    }
  }
  // the box's right edge 8px short of the lens — unless its left edge would then be off the screen
  // (a phone, or a bar with a lot in it), when it hangs under the corner, right-aligned to it
  function place() {
    const cr = corner.getBoundingClientRect(), lr = lens.getBoundingClientRect();
    const right = cr.right - lr.left + 8, under = cr.right - right - box.offsetWidth < 8;
    box.classList.toggle('ka-under', under);
    box.style.right = (under ? 0 : right) + 'px';
  }
  function open(on, text) {
    box.hidden = !on;
    lens.setAttribute('aria-expanded', String(on));
    if (bar) bar.classList.toggle('ka-open', on);
    if (on) { place(); if (text != null) input.value = text; list(); input.focus(); }
    else { input.value = ''; hits.textContent = ''; }
  }
  window.addEventListener('resize', () => { if (!box.hidden) place(); }, { passive: true });
  lens.addEventListener('click', () => open(box.hidden));
  input.addEventListener('input', list);
  input.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); open(false); lens.focus(); } });
  box.addEventListener('submit', e => {
    e.preventDefault();
    const first = hits.querySelector('a');
    if (first) location.assign(first.href);
  });
  document.addEventListener('pointerdown', e => { if (!box.hidden && !corner.contains(e.target)) open(false); }, true);
  api.find = text => open(true, String(text == null ? '' : text));

  // ── the gnome's menu (the yard only: everywhere else the gnome is a link) ─
  function menuOpen(on) {
    menu.hidden = !on; outNote.hidden = true;
    if (PAGE === 'yard') gnome.setAttribute('aria-expanded', String(on));
    if (bar) bar.classList.toggle('ka-open', on || !box.hidden);
    if (on) outBtn.focus();
  }
  gnome.addEventListener('click', e => { if (PAGE !== 'yard') return; e.preventDefault(); menuOpen(menu.hidden); });
  gnome.addEventListener('keydown', e => { if (PAGE === 'yard' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); menuOpen(menu.hidden); } });
  menu.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); menuOpen(false); gnome.focus(); } });
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !corner.contains(e.target)) menuOpen(false); }, true);
  // the same door and the same way out as the yard's settings drawer (yard/index.html: signOut)
  outBtn.addEventListener('click', () => {
    outBtn.disabled = true;
    fetch('/api/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'logout' }) })
      .then(r => r.json(), () => null).catch(() => null)
      .then(out => { if (out && out.ok) return location.assign('/login/'); outBtn.disabled = false; outNote.hidden = false; });
  });

  // ── into the bar ────────────────────────────────────────────────────────
  const live = () => Array.from(document.querySelectorAll('.lab-head, .knoll-head')).find(el => el.isConnected && !el.closest('x-dc')) || null;
  function mount() {
    if (corner.isConnected) return true;
    bar = live();
    if (!bar) return false;
    if (!css.isConnected) document.head.appendChild(css);
    bar.appendChild(corner);
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);   // VT323's width is the buttons' width
    return true;
  }
  window.addEventListener('resize', () => fit(), { passive: true });
  const watch = new MutationObserver(() => { if (mount()) { watch.disconnect(); keep(); } });
  // React may draw the bar again one day; if the corner goes with it, it comes back
  function keep() {
    const parent = bar && bar.parentNode;
    if (!parent) return;
    new MutationObserver((_, mo) => { if (!corner.isConnected) { mo.disconnect(); if (mount()) keep(); else watch.observe(document.documentElement, { childList: true, subtree: true }); } })
      .observe(parent, { childList: true });
  }
  if (mount()) keep();
  else watch.observe(document.documentElement, { childList: true, subtree: true });
})();
