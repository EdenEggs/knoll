/* dashboard/master.js — THE MASTER'S DESK (2026-09-27): on the dashboard, for the site's master and nobody else
   (api/wall.js: THE MASTER — the admin, who stands as every page's maker), the pages of the site — TOEM 2 first —
   each with whose it is and the way to HAND IT ON: a code, asked of the door (op handoff), which the master sends to
   whoever is to have the page and they type into their yard's settings (A PAGE HANDED TO YOU). On the profile
   dashboard the desk has every page; on a page's own dashboard (?space=<slug>), that page alone.

   THE CODE IS SHOWN ONCE. The door keeps its sha256 and cannot say it again, so a code lives on this page only until
   it is left — after that the desk says one is out and when it ends, and a new one (which ends the old) is a press.
   Plain DOM, built into the #master-desk slot the dashboard's template leaves, in manage.css's hand; every name is
   set as text, and an address is built from a slug that must look like one.

   ponytail: the desk is one read of every page, drawn whole — a search box when the site has hundreds. */
(function () {
  'use strict';
  const SLUG = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
  const ONE = String(new URLSearchParams(location.search).get('space') || '').toLowerCase();
  const API = '/api/wall';

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const line = (cls, ...nodes) => { const d = el('div', cls); d.append(...nodes); return d; };
  const btn = (cls, words, on) => { const b = el('button', cls, words); b.type = 'button'; b.addEventListener('click', on); return b; };
  const link = (cls, words, href) => { const a = el('a', cls, words); a.href = href; return a; };
  const get = url => fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ ok: false, error: 'the door did not answer' }));
  const post = body => fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json()).catch(() => ({ ok: false, error: 'the door did not answer' }));
  const say = (p, words, bad) => { p.textContent = words || ''; p.hidden = !words; p.classList.toggle('is-bad', !!bad); };
  const ends = t => { const h = (t - Date.now()) / 36e5; return h <= 0 ? 'NOW' : h < 1 ? 'WITHIN THE HOUR' : h < 48 ? 'IN ' + Math.round(h) + (Math.round(h) === 1 ? ' HOUR' : ' HOURS') : 'IN ' + Math.round(h / 24) + ' DAYS'; };

  let desk = null, rows = null, note = null;
  const shown = {};                              // slug → the code just made here, while this page is open

  const whose = p => (!p.by ? 'NOBODY\'S YET — YOURS TO KEEP' : p.by === desk.me ? 'YOURS' : String(p.tag || 'a gnome').toUpperCase() + '\'S') + (p.given ? ' · HANDED ON' : '');
  async function make(p) {
    if (p.by && p.by !== desk.me && !confirm(p.title + ' is ' + (p.tag || 'somebody') + '\'s. Whoever claims the code takes it from them. Make the code?')) return;
    if (p.code && !confirm('A code is out for ' + p.title + ' already. A new one ends it. Make a new one?')) return;
    say(note, 'Asking for a code…');
    const out = await post({ op: 'handoff', page: p.slug });
    if (!out.ok) { say(note, 'No code: ' + (out.error || 'the door said no') + '.', true); return; }
    shown[p.slug] = out.code; p.code = { at: Date.now(), expires: out.expires };
    say(note, 'A code for ' + p.title + ' — copy it now; it is not shown again.');
    draw();
  }
  async function takeBack(p) {
    if (!confirm('Take the code for ' + p.title + ' back? It will open nothing.')) return;
    const out = await post({ op: 'handoff', page: p.slug, revoke: true });
    if (!out.ok) { say(note, 'Not taken back: ' + (out.error || 'the door said no') + '.', true); return; }
    delete shown[p.slug]; p.code = null;
    say(note, 'Taken back — that code opens nothing now.');
    draw();
  }
  function row(p) {
    const r = el('div', 'cm-row'), top = el('div', 'cm-row-l'), ok = SLUG.test(p.slug);
    const name = el('b', 'md-name', p.title);
    top.append(name, ok ? link('cm-chip', '/' + p.slug, '/' + p.slug) : el('code', 'cm-chip', '/' + p.slug), el('span', 'cm-hint', whose(p)));
    const acts = el('span', 'md-acts');
    if (ok) acts.append(link('cm-hit', 'dashboard', '/dashboard/?space=' + p.slug), link('cm-hit', 'settings', '/settings/?space=' + p.slug));
    top.append(acts);
    r.append(top);
    const code = shown[p.slug];
    if (code) {
      const box = el('div', 'md-code'), word = el('code', 'md-word', code);
      const copy = btn('cm-btn is-main', 'copy', () => {
        const done = () => { copy.textContent = 'copied ✓'; setTimeout(() => { copy.textContent = 'copy'; }, 1600); };
        if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, () => { copy.textContent = 'select it and copy'; }); else copy.textContent = 'select it and copy';
      });
      box.append(word, copy);
      r.append(box, el('span', 'cm-hint', 'Send it to whoever is to have ' + p.title + '. They open their yard, press the gear, and type it under A PAGE HANDED TO YOU. It opens this page once, and ends ' + ends(p.code.expires).toLowerCase() + '.'));
    }
    const foot = el('div', 'cm-row-l');
    if (p.code) foot.append(el('span', 'cm-chip', 'A CODE IS OUT · ENDS ' + ends(p.code.expires)), btn('cm-btn', 'a new code', () => make(p)), btn('cm-btn', 'take it back', () => takeBack(p)));
    else foot.append(btn('cm-btn is-main', 'make a code to hand it on', () => make(p)));
    r.append(foot);
    return r;
  }
  function draw() {
    rows.replaceChildren();
    const pages = desk.pages.filter(p => !ONE || p.slug === ONE);
    if (!pages.length) rows.append(el('span', 'cm-hint', 'no such page on the desk'));
    pages.forEach(p => rows.append(row(p)));
  }

  // the slot React rendered (#dc-root) — the raw template inside <x-dc> keeps a hidden copy with the same id, which is not it (manage.js)
  const slot = () => new Promise(ok => { let n = 0; const t = setInterval(() => { const s = document.querySelector('#dc-root #master-desk'); if (s || ++n > 200) { clearInterval(t); ok(s); } }, 100); });
  async function boot() {
    // the gate says who is signed in (account.js), and whether they are the master: the desk is asked for on that account alone
    const who = window.KnollAccount && KnollAccount.me ? await KnollAccount.me.catch(() => null) : undefined;
    if (who !== undefined && !(who && who.master)) return;
    const [s, d] = await Promise.all([slot(), get(API + '?desk=1')]);
    if (!s || !d.ok || !Array.isArray(d.pages)) return;   // not the master: the door said so, and there is nothing to draw
    desk = d;
    const c = el('div', 'cm-card is-wide'); c.style.setProperty('--rot', '0.3deg'); c.style.setProperty('--pip', '#17120b'); c.dataset.card = 'desk';
    rows = el('div', 'cm-rows'); note = el('p', 'cm-note'); note.hidden = true; note.setAttribute('role', 'status');
    c.append(el('i', 'cm-pip'), el('h2', null, 'The Master\'s Desk'),
             el('div', 'cm-sub', (ONE ? 'THIS PAGE' : 'EVERY PAGE') + ' · WHOSE IT IS · A CODE TO HAND IT ON'),
             rows, line('cm-actions', link('cm-btn', '+ make a new page', '/yard/new/'), el('span', 'cm-hint', 'a page you make is yours until its code is claimed; a code lasts ' + d.days + ' days and opens once')), note);
    s.classList.add('cm');
    s.append(c);
    draw();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.MasterDesk = { get desk() { return desk; } };   // for the probes — the pages and whose they are; a code is only ever on the page it was made on
})();
