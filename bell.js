/* ── bell.js — THE BELL, OPENED (2026-09-27) ────────────────────────────────
   The yard's bell used to let down a card two hundred and eighty pixels wide.
   Pressed now it lays a sheet over the page with everything that concerns
   the gnome who is signed in, sorted by what it is about:

     FRIENDS       who asks to be one (yes or no, here), who said yes, and the
                   spaces you were made a keeper of
     YOUR PAGE     changes somebody proposes to your yard or your name (and
                   the way to the screen that reviews them), the notes left
                   at your fence, and the likes it has had since you looked
     YOUR SPACES   the spaces you keep: an edit waiting for a look, a motion
                   on the ballot, a thread begun, a photo hung
     YOUR EDITS    what became of what YOU sent: an edit put up or turned
                   back, a motion carried or fallen, a change you proposed to
                   somebody's page taken or left, a reply to your thread, a
                   heart on your photo

   WHERE IT COMES FROM. The notes are the friends' door's (api/friends.js:
   GET — every other door rings into the same list, api/wall.js: tell). The
   asks are read from `asks`, not from their notes: the bell keeps fifty, and
   an ask must outlast the note that carried it. The fence — its notes and
   its likes — is the Apps Script's (yard/tools.js), where nobody has an
   account: the page hands it over as it read it, and what is NEW there is
   told by `noted` and `hearts`, which the door keeps for exactly that.

   NOTHING SOMEBODY ELSE WROTE IS EVER MARKUP. A name, a space's title, a
   thread's, a note at the fence: each is set as text (textContent), and an
   address is built here from a slug or an id that must look like one.

     KnollBell.open({ fr, fence, act, again, back })   the sheet, over the page
         fr     what GET /api/friends answered (asked for here if not given)
         fence  { likes, notes: [{t, name, text}] } or nothing
         act    body => Promise   a post to /api/friends (yes, no, seen)
         again  () => Promise<fr> the list, read again after a post
         back   the element the focus goes back to
     KnollBell.close()
     KnollBell.unseen(fr, fence)   how many are new: the bell's number
     KnollBell.read(fr, fence)     the lines, newest first (what the sheet draws) */
(function () {
  'use strict';

  const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/, ID = /^[0-9a-f]{16}$/, PROP = /^p[a-z0-9]{12,40}$/;
  const CATS = [['all', 'All'], ['friends', 'Friends'], ['page', 'Your page'], ['spaces', 'Your spaces'], ['yours', 'Your edits']];
  const EDITS = '/dashboard/edits/';

  function ago(t) {
    t = +t || 0; if (!t) return '';
    const d = Date.now() - t, m = Math.round(d / 60000), h = Math.round(d / 3600000), day = Math.round(d / 86400000);
    if (m < 1) return 'JUST NOW'; if (m < 60) return m + ' MIN AGO'; if (h < 24) return h + (h === 1 ? ' HOUR AGO' : ' HOURS AGO');
    if (day === 1) return 'YESTERDAY'; if (day < 7) return day + ' DAYS AGO';
    if (day < 30) { const w = Math.round(day / 7); return w + (w === 1 ? ' WEEK AGO' : ' WEEKS AGO'); }
    const mo = Math.round(day / 30); return mo + (mo === 1 ? ' MONTH AGO' : ' MONTHS AGO');
  }
  const wallOf = slug => (slug === 'toem2' ? '/toem2/' : '/toem2/?page=' + slug);
  const andThen = (href, q) => href + (href.indexOf('?') < 0 ? '?' : '&') + q;
  const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

  /* One note, as a line: which heading it goes under, its words, where it leads, and what can
     be done about it here. `quote` is somebody's own words, drawn apart from ours. A kind this
     file has not heard of still gets a line — a door may ring before the page is taught. */
  function line(n) {
    const who = (n.from && n.from.tag) || 'a gnome', slug = SLUG.test(n.slug || '') ? n.slug : '', at = slug ? (n.title || slug) : '';
    const to = (href, word) => (href ? { href, word } : null), wall = slug && wallOf(slug);
    const theirs = n.from && ID.test(n.from.id || '') ? '/YardView/?u=' + n.from.id : '';
    switch (n.kind) {
      case 'friend':   return { cat: 'friends', text: who + ' said yes — you are friends now', go: to(theirs, 'see their yard') };
      case 'invite':
      case 'keeper':   return { cat: 'friends', text: who + ' made you a keeper of ' + (at || 'a space'), go: to(slug && '/' + slug, 'go there') };
      case 'proposal': return { cat: 'page', text: who + (n.what ? ' proposes a new name for you' : ' proposes changes to your page'), quote: n.what ? clip(n.what, 40) : '',
                                go: to(EDITS + (PROP.test(n.prop || '') ? '#' + n.prop : ''), 'review the edits') };
      case 'waiting':  return { cat: 'spaces', text: 'an edit from ' + who + ' is waiting for a look at ' + at, go: to(wall && andThen(wall, 'review=next'), 'look at it') };
      case 'ballot':   return { cat: 'spaces', text: 'a motion is on the ballot at ' + at, go: to(wall && andThen(wall, 'ballot=1'), 'open the ballot') };
      case 'thread':   return { cat: 'spaces', text: who + ' began a thread at ' + at, quote: clip(n.what, 80), go: to(wall, 'go there') };
      case 'photo':    return { cat: 'spaces', text: who + ' hung a photo at ' + at, quote: clip(n.what, 60), go: to(wall, 'go there') };
      case 'okd':      return { cat: 'yours', text: 'your edit went up at ' + at, go: to(wall, 'go there') };
      case 'rej':      return { cat: 'yours', text: 'your edit was turned back at ' + at, quote: clip(n.why, 140), go: to(wall, 'go there') };
      case 'passed':   return { cat: 'yours', text: 'your motion carried, ' + (+n.ayes || 0) + '–' + (+n.nays || 0) + ', at ' + at, go: to(wall, 'go there') };
      case 'failed':   return { cat: 'yours', text: 'your motion fell, ' + (+n.ayes || 0) + '–' + (+n.nays || 0) + ', at ' + at, go: to(wall, 'go there') };
      case 'taken':    return { cat: 'yours', text: who + ' took the change you proposed to their page', quote: clip(n.why, 140), go: to(theirs, 'see their yard') };
      case 'left':     return { cat: 'yours', text: who + ' left the change you proposed to their page', quote: clip(n.why, 140), go: to(theirs, 'see their yard') };
      case 'reply':    return { cat: 'yours', text: who + ' replied to your thread at ' + at, quote: clip(n.what, 80), go: to(wall, 'go there') };
      case 'heart':    return { cat: 'yours', text: who + ' gave your photo a heart at ' + at, quote: clip(n.what, 60), go: to(wall, 'go there') };
      default:         return { cat: 'yours', text: who + ' sent word', go: null };
    }
  }

  function read(fr, fence) {
    fr = fr || {};
    const noted = +fr.noted || 0, notes = Array.isArray(fr.notes) ? fr.notes : [], asks = Array.isArray(fr.asks) ? fr.asks : [], out = [];
    const asked = {};
    notes.forEach(n => { if (n && n.kind === 'ask' && n.from && !asked[n.from.id]) asked[n.from.id] = +n.at || 0; });
    asks.forEach(a => { if (a && ID.test(a.id || '')) out.push({ cat: 'friends', kind: 'ask', at: asked[a.id] || 0, ask: a.id, text: (a.tag || 'a gnome') + ' wants to be friends', waits: true,
                                                              go: { href: '/YardView/?u=' + a.id, word: 'see their yard' } }); });
    notes.forEach(n => { if (n && n.kind !== 'ask') out.push(Object.assign({ kind: n.kind, at: +n.at || 0 }, line(n))); });
    if (fence) {
      (Array.isArray(fence.notes) ? fence.notes : []).forEach(f => { if (f && f.text) out.push({ cat: 'page', kind: 'note', at: +f.t || 0, text: clip(f.name || 'a gnome', 24) + ' left a note at your fence', quote: clip(f.text, 140), go: null }); });
      const more = Math.max(0, (+fence.likes || 0) - (+fr.hearts || 0));
      if (more) out.push({ cat: 'page', kind: 'likes', at: 0, fresh: true, text: more + (more === 1 ? ' new like' : ' new likes') + ' on your yard', quote: '', sub: (+fence.likes || 0) + ' IN ALL', go: null });
    }
    out.forEach(x => { x.fresh = x.fresh || x.at > noted; });
    // what waits on you first, then what is new, then the rest — each newest first (the likes have no hour of their own: they lead what is new)
    const rank = x => (x.waits ? 2 : x.fresh ? 1 : 0), hour = x => (x.kind === 'likes' ? Infinity : x.at);
    return out.sort((a, b) => rank(b) - rank(a) || (hour(b) === hour(a) ? 0 : hour(b) > hour(a) ? 1 : -1));
  }
  // the bell's number: what the door counted, and what the fence has had since (the door cannot see the fence)
  function unseen(fr, fence) {
    fr = fr || {};
    const noted = +fr.noted || 0;
    return (+fr.unseen || 0) + (fence ? (Array.isArray(fence.notes) ? fence.notes : []).filter(f => f && +f.t > noted).length + Math.max(0, (+fence.likes || 0) - (+fr.hearts || 0)) : 0);
  }

  // ── the sheet ───────────────────────────────────────────────────────────
  const CSS = `
.kb-veil{position:fixed;inset:0;z-index:9500;display:flex;align-items:flex-start;justify-content:center;padding:64px 16px 24px;box-sizing:border-box;
  background:rgba(23,18,11,.5);overflow-y:auto;font-family:'VT323',ui-monospace,Menlo,Consolas,monospace;color:#17120b;-webkit-text-size-adjust:100%}
.kb-sheet{position:relative;width:min(720px,100%);box-sizing:border-box;background:#fdf7e3;border:4px solid #17120b;box-shadow:9px 10px 0 rgba(23,18,11,.35);padding:20px 24px 22px;transform:rotate(-.3deg)}
.kb-head{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;padding-right:52px}
.kb-title{margin:0;font-family:'Rye',Georgia,serif;font-weight:400;font-size:30px;line-height:1.1}
.kb-sub{font-size:16px;letter-spacing:2px;color:#4a4054}
.kb-x{position:absolute;top:14px;right:14px;width:40px;height:40px;padding:0;border:4px solid #17120b;background:#fdf7e3;color:#17120b;font:400 26px/1 'VT323',monospace;cursor:pointer;box-shadow:3px 4px 0 rgba(60,50,80,.25)}
.kb-x:hover{transform:translate(1px,1px);box-shadow:2px 3px 0 rgba(60,50,80,.25)}
.kb-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 4px}
.kb-tab{border:3px solid #17120b;background:#fdf7e3;color:#17120b;font:400 17px/1 'VT323',monospace;letter-spacing:1px;padding:5px 10px 4px;cursor:pointer;text-transform:uppercase}
.kb-tab[aria-pressed="true"]{background:#17120b;color:#fdf7e3}
.kb-tab b{font-weight:400;opacity:.7;margin-left:6px}
.kb-tab i{font-style:normal;margin-left:6px;padding:0 5px;background:#e8484a;color:#fdf7e3}
.kb-list{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column}
.kb-item{position:relative;padding:12px 0 12px 22px;border-top:2px dashed rgba(23,18,11,.25)}
.kb-item:first-child{border-top:0}
.kb-item::before{content:"";position:absolute;left:2px;top:19px;width:9px;height:9px;background:transparent;border:2px solid rgba(23,18,11,.35);transform:rotate(45deg);box-sizing:border-box}
.kb-new::before{background:#e8484a;border-color:#17120b}
.kb-text{font-size:20px;line-height:1.2;color:#17120b;overflow-wrap:anywhere}
.kb-new .kb-text{font-weight:400}
.kb-quote{margin:4px 0 0;padding:2px 0 2px 10px;border-left:3px solid #17120b;font-family:'Public Sans',system-ui,sans-serif;font-weight:600;font-size:14.5px;line-height:1.35;color:#3a3342;overflow-wrap:anywhere}
.kb-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-top:6px;font-size:15px;letter-spacing:1px;color:#4a4054}
.kb-tag{padding:0 5px;border:2px solid #4a4054;font-size:13px;letter-spacing:1px}
.kb-new .kb-tag-new{border-color:#17120b;background:#e8484a;color:#fdf7e3}
.kb-go{color:#b8302f;text-decoration:underline;text-underline-offset:3px;text-transform:uppercase}
.kb-go:hover{color:#17120b}
.kb-acts{display:flex;gap:8px;margin-top:8px}
.kb-btn{border:3px solid #17120b;background:#fdf7e3;color:#17120b;font:400 18px/1 'VT323',monospace;letter-spacing:1px;padding:4px 16px 3px;cursor:pointer;box-shadow:2px 3px 0 rgba(60,50,80,.25)}
.kb-btn:hover{transform:translate(1px,1px);box-shadow:1px 2px 0 rgba(60,50,80,.25)}
.kb-btn[disabled]{opacity:.5;cursor:progress}
.kb-yes{background:#17120b;color:#fdf7e3}
.kb-none{margin:18px 0 6px;font-size:18px;letter-spacing:1px;color:#4a4054;text-transform:uppercase}
.kb-say{margin-top:6px;font-size:15px;letter-spacing:1px;color:#b8302f;text-transform:uppercase}
.kb-more{display:flex;flex-wrap:wrap;gap:6px 18px;margin-top:16px;padding-top:12px;border-top:4px solid #17120b;font-size:17px;letter-spacing:1px;text-transform:uppercase}
.kb-x:focus-visible,.kb-tab:focus-visible,.kb-btn:focus-visible,.kb-go:focus-visible{outline:3px solid #5a8fd6;outline-offset:2px}
html.kb-open{overflow:hidden}
@media (max-width:560px){.kb-veil{padding:16px 8px}.kb-sheet{padding:16px 14px 18px;transform:none}.kb-title{font-size:25px}.kb-text{font-size:18px}}
@media (prefers-reduced-motion:reduce){.kb-x:hover,.kb-btn:hover{transform:none}}`;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const door = body => fetch('/api/friends', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ ok: false, error: 'the friends list did not answer — try again' }));
  const ask = () => fetch('/api/friends', { cache: 'no-store', credentials: 'same-origin' }).then(r => r.json()).then(v => (v && v.ok ? v : null)).catch(() => null);

  let up = null;                                 // the sheet that is open: { veil, back, … }
  function close() {
    if (!up) return;
    const was = up; up = null;
    document.removeEventListener('keydown', was.key, true);
    document.documentElement.classList.remove('kb-open');
    was.veil.remove();
    if (was.back && was.back.isConnected && was.back.focus) was.back.focus();
    if (was.shut) was.shut();
  }

  function open(o) {
    o = o || {};
    close();
    if (!document.getElementById('kb-style')) { const s = el('style'); s.id = 'kb-style'; s.textContent = CSS; document.head.appendChild(s); }
    const act = o.act || door, again = o.again || ask;
    const st = { fr: o.fr || null, fence: o.fence || null, cat: 'all', fresh: null, say: '', busy: false };
    const veil = el('div', 'kb-veil'), sheet = el('section', 'kb-sheet');
    sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'kb-title');
    const head = el('div', 'kb-head'), title = el('h2', 'kb-title', 'Notifications'), sub = el('div', 'kb-sub');
    title.id = 'kb-title';
    const x = el('button', 'kb-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'close notifications');
    head.append(title, sub);
    const tabs = el('div', 'kb-tabs'), list = el('ul', 'kb-list'), say = el('div', 'kb-say'), more = el('div', 'kb-more');
    tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'show');
    say.setAttribute('role', 'status');
    sheet.append(head, x, tabs, list, say, more);
    veil.appendChild(sheet);

    function draw() {
      const all = st.fr ? read(st.fr, st.fence) : [];
      // what was new when the sheet went up stays marked while it is up, though opening it is what reads it
      if (st.fresh === null && st.fr) st.fresh = new Set(all.filter(i => i.fresh).map(key));
      const isNew = i => (st.fresh ? st.fresh.has(key(i)) : false) || !!i.waits;
      const fresh = all.filter(i => st.fresh && st.fresh.has(key(i))).length, waits = all.filter(i => i.waits).length;
      sub.textContent = !st.fr ? 'ASKING THE DOOR…' : [fresh ? fresh + ' NEW' : '', waits ? waits + (waits === 1 ? ' WAITS ON YOU' : ' WAIT ON YOU') : ''].filter(Boolean).join(' · ') || (all.length ? 'NOTHING NEW' : '');
      tabs.textContent = '';
      CATS.forEach(([id, name]) => {
        const mine = all.filter(i => id === 'all' || i.cat === id), b = el('button', 'kb-tab', name);
        b.type = 'button'; b.dataset.cat = id; b.setAttribute('aria-pressed', String(st.cat === id));
        b.appendChild(el('b', '', String(mine.length)));
        const hot = mine.filter(isNew).length;
        if (hot) { const i = el('i', '', String(hot)); i.setAttribute('aria-label', hot + ' new'); b.appendChild(i); }
        b.addEventListener('click', () => { st.cat = id; draw(); sheet.querySelector('.kb-tab[data-cat="' + id + '"]').focus(); });
        tabs.appendChild(b);
      });
      list.textContent = '';
      const shown = all.filter(i => st.cat === 'all' || i.cat === st.cat);
      shown.forEach(i => {
        const li = el('li', 'kb-item' + (isNew(i) ? ' kb-new' : ''));
        li.dataset.kind = i.kind; li.dataset.cat = i.cat;
        li.appendChild(el('div', 'kb-text', i.text));
        if (i.quote) li.appendChild(el('div', 'kb-quote', i.quote));
        if (i.ask) {
          const acts = el('div', 'kb-acts'), yes = el('button', 'kb-btn kb-yes', 'yes'), no = el('button', 'kb-btn', 'no');
          [yes, no].forEach((b, k) => { b.type = 'button'; b.disabled = st.busy; b.setAttribute('aria-label', (k ? 'no to ' : 'yes to ') + i.text.replace(/ wants to be friends$/, ''));
            b.addEventListener('click', () => answer(i.ask, !k)); });
          acts.append(yes, no); li.appendChild(acts);
        }
        const foot = el('div', 'kb-foot');
        if (i.waits) foot.appendChild(el('span', 'kb-tag kb-tag-new', 'WAITS ON YOU')); else if (isNew(i)) foot.appendChild(el('span', 'kb-tag kb-tag-new', 'NEW'));
        const when = i.sub || ago(i.at); if (when) foot.appendChild(el('span', '', when));
        if (i.go) { const a = el('a', 'kb-go', i.go.word + ' →'); a.href = i.go.href; foot.appendChild(a); }
        if (foot.childNodes.length) li.appendChild(foot);
        list.appendChild(li);
      });
      const none = sheet.querySelector('.kb-none'); if (none) none.remove();
      if (st.fr && !shown.length) list.before(el('div', 'kb-none', st.cat === 'all' ? 'Nothing yet — friends, your page, your spaces and word of your edits land here.' : 'Nothing under this heading.'));
      say.textContent = st.say;
      more.textContent = '';
      const a = el('a', 'kb-go', 'edits to your page →'); a.href = EDITS; more.appendChild(a);
    }
    const key = i => [i.kind, i.at, i.ask || '', i.text].join('|');
    function answer(id, yes) {
      if (st.busy) return;
      st.busy = true; st.say = ''; draw();
      Promise.resolve(act({ op: 'answer', id, yes })).then(out => {
        if (out && out.ok === false) st.say = out.error || 'that did not go through — try again';
        return again();
      }).then(fr => { if (fr) st.fr = fr; }).catch(() => { st.say = 'that did not go through — try again'; })
        .then(() => { st.busy = false; if (up && up.veil === veil) { draw(); (sheet.querySelector('.kb-btn') || x).focus(); } });
    }

    const keydown = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = Array.from(sheet.querySelectorAll('button:not([disabled]),a[href]')), first = f[0], last = f[f.length - 1];
      if (!f.length) return;
      if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    x.addEventListener('click', close);
    veil.addEventListener('click', e => { if (e.target === veil) close(); });   // a press beside the sheet (click, not mousedown: the yard's band takes pointerdown on bare paper, and with it the mousedown)
    document.addEventListener('keydown', keydown, true);
    document.documentElement.classList.add('kb-open');
    document.body.appendChild(veil);
    up = { veil, back: o.back || document.activeElement, key: keydown, shut: o.shut };
    draw();
    x.focus();

    // the list, if the page did not bring one; and the door told what has been seen — the fence's likes with it
    const told = fr => Promise.resolve(act(Object.assign({ op: 'seen' }, st.fence ? { hearts: +st.fence.likes || 0 } : {}))).catch(() => {}).then(() => fr);
    (st.fr ? Promise.resolve(st.fr) : ask()).then(fr => {
      if (!up || up.veil !== veil) return;
      if (!fr) { sub.textContent = 'THE DOOR DID NOT ANSWER — SIGN IN, OR TRY AGAIN.'; return; }
      st.fr = fr; draw();
      if (unseen(fr, st.fence)) told(fr);
    });
  }

  window.KnollBell = { open, close, read, unseen, get isOpen() { return !!up; } };
})();
