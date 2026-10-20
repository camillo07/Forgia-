/* =========================================================
   GESTI E ANIMAZIONI
   - tieni premuto + trascina: schede e cartelle (Allena), esercizi (allenamento e scheda)
   - scorri dal bordo sinistro per tornare indietro
   - scorri a sinistra una serie per eliminarla
   - trascina giù l'intestazione di allenamento/corsa per ridurla
   - uscita animata di schermate e tendine
   ========================================================= */
function motionOK() { try { return !navigator.webdriver && !matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return true; } }
function layerGhost(el) {
  el.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  el.setAttribute('aria-hidden', 'true'); el.style.pointerEvents = 'none';
  const t = el.dataset.t, modal = el.classList.contains('modal');
  el.classList.remove('still');
  el.classList.add(modal ? 'ghost-sheet' : (t === 'workout' || t === 'run') ? 'ghost-down' : 'ghost-out');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 260);
}
/* little entrance effects for things that just changed */
function flash(sel, cls = 'just') { requestAnimationFrame(() => { const el = typeof sel === 'string' ? document.querySelector(sel) : sel; if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 600); }); }

/* ---------- long press → drag (routines and folders) ---------- */
const LP = { t: null, el: null, kind: null, on: false, ghost: null, x0: 0, y0: 0, x: 0, y: 0, pid: null, target: null, eat: false, raf: 0 };
const LP_MS = 420;
function lpClear() {
  clearTimeout(LP.t); LP.t = null;
  if (LP.el) LP.el.classList.remove('lp-press', 'lp-src');
  document.querySelectorAll('.drop-in, .drop-before, .drop-after').forEach(n => n.classList.remove('drop-in', 'drop-before', 'drop-after'));
  document.querySelectorAll('.lp-zone').forEach(n => n.remove());
  if (LP.ghost) LP.ghost.remove();
  cancelAnimationFrame(LP.raf);
  document.body.classList.remove('lp-dragging');
  Object.assign(LP, { el: null, kind: null, on: false, ghost: null, target: null });
}
document.addEventListener('pointerdown', ev => {
  LP.eat = false;
  if (ev.button > 0 || LP.on || DRAG) return;
  if (ev.target.closest('input, textarea, select, .switch, [data-drag], [data-hold]')) return;
  const rt = !UI.layers.length && ev.target.closest('.rt[data-rid]');
  const fh = !UI.layers.length && !rt && ev.target.closest('.fold-h');
  const xh = !rt && !fh && ev.target.closest('[data-lp]');
  const el = rt || (fh && fh.closest('.folder[data-fid]')) || (xh && xh.closest('[data-drag-item]'));
  if (!el) return;
  lpClear();
  Object.assign(LP, { el, kind: rt ? 'r' : fh ? 'f' : 'x', xk: xh ? xh.dataset.lp : null, x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, pid: ev.pointerId });
  el.classList.add('lp-press');
  LP.t = setTimeout(lpStart, LP_MS);
});
function lpStart() {
  LP.t = null; const el = LP.el; if (!el || !document.contains(el)) { lpClear(); return; }
  el.classList.remove('lp-press'); LP.eat = true; haptic(20);
  if (LP.kind === 'x') { const k = LP.xk, pid = LP.pid, y = LP.y; LP.el = null; lpClear(); LP.eat = true; dragBegin(el, k, pid, y); return; }
  LP.on = true; document.body.classList.add('lp-dragging');
  const r = el.getBoundingClientRect();
  let g;
  if (LP.kind === 'f') { g = el.cloneNode(false); g.appendChild(el.querySelector('.fold-h').cloneNode(true)); }
  else g = el.cloneNode(true);
  g.classList.add('lp-ghost'); g.classList.remove('lp-press');
  g.style.cssText += `;position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;margin:0;z-index:70;pointer-events:none`;
  document.body.appendChild(g); LP.ghost = g;
  el.classList.add('lp-src');
  if (LP.kind === 'r') {
    const ro = S.routines.find(x => x.id === el.dataset.rid);
    const list = document.querySelector('.rt-list');
    if (ro && ro.fid && list) { const z = document.createElement('div'); z.className = 'lp-zone'; z.innerHTML = `${icon('up', 16)} Rilascia qui per togliere dalla cartella`; list.prepend(z); }
  }
  try { el.setPointerCapture(LP.pid); } catch (e) { }
  lpFrame();
}
function lpFrame() {
  if (!LP.on) return;
  const y = LP.y, H = innerHeight, top = 80, bot = H - 140, sy = scrollY;
  if (y < top && y < LP.y0 - 30) window.scrollBy(0, -Math.ceil((top - y) / 5));
  else if (y > bot && y > LP.y0 + 30) window.scrollBy(0, Math.ceil((y - bot) / 5));
  if (scrollY !== sy) lpTarget();
  LP.raf = requestAnimationFrame(lpFrame);
}
function lpTarget() {
  document.querySelectorAll('.drop-in, .drop-before, .drop-after').forEach(n => n.classList.remove('drop-in', 'drop-before', 'drop-after'));
  const under = document.elementFromPoint(LP.x, LP.y); LP.target = null; if (!under) return;
  if (LP.kind === 'r') {
    const z = under.closest('.lp-zone'); if (z) { z.classList.add('drop-in'); LP.target = { zone: true }; return; }
    const card = under.closest('.rt[data-rid]');
    if (card && card !== LP.el) { const b = card.getBoundingClientRect(), after = LP.y > b.top + b.height / 2; card.classList.add(after ? 'drop-after' : 'drop-before'); LP.target = { rid: card.dataset.rid, after }; return; }
    const fold = under.closest('.folder[data-fid]');
    if (fold && (under.closest('.fold-h') || !fold.classList.contains('open') || under.closest('.fold-body'))) { fold.classList.add('drop-in'); LP.target = { fid: fold.dataset.fid }; }
  } else {
    const fold = under.closest('.folder[data-fid]');
    if (fold && fold !== LP.el) { const b = fold.querySelector('.fold-h').getBoundingClientRect(), after = LP.y > b.top + b.height / 2; fold.classList.add(after ? 'drop-after' : 'drop-before'); LP.target = { fid: fold.dataset.fid, after }; }
  }
}
document.addEventListener('pointermove', ev => {
  if (LP.t && ev.pointerId === LP.pid) { if (Math.hypot(ev.clientX - LP.x0, ev.clientY - LP.y0) > 9) lpClear(); else { LP.x = ev.clientX; LP.y = ev.clientY; } return; }
  if (!LP.on || ev.pointerId !== LP.pid) return;
  ev.preventDefault();
  LP.x = ev.clientX; LP.y = ev.clientY;
  LP.ghost.style.transform = `translate(${LP.x - LP.x0}px, ${LP.y - LP.y0}px) scale(1.03) rotate(-1deg)`;
  lpTarget();
}, { passive: false });
function lpDrop(ev) {
  if (LP.t) { lpClear(); return; }
  if (!LP.on || (ev && ev.pointerId !== LP.pid)) return;
  const kind = LP.kind, id = kind === 'r' ? LP.el.dataset.rid : LP.el.dataset.fid, t = LP.target;
  lpClear();
  if (!t) return;
  let moved = null;
  if (kind === 'r') {
    const r = S.routines.find(x => x.id === id); if (!r) return;
    const arr = S.routines;
    if (t.zone) { delete r.fid; arr.splice(arr.indexOf(r), 1); const lastLoose = arr.reduce((k, x, i) => folderOf(x) ? k : i, -1); arr.splice(lastLoose + 1, 0, r); toast('Scheda tolta dalla cartella'); }
    else if (t.fid) { const f = folderById(t.fid); if (!f) return; if (r.fid !== f.id) toast(`Spostata in “${esc(f.name)}”`); r.fid = f.id; arr.splice(arr.indexOf(r), 1); arr.push(r); UI.fopen = UI.fopen || {}; UI.fopen[f.id] = true; }
    else if (t.rid) { const tr = arr.find(x => x.id === t.rid); if (!tr || tr === r) return; const from = r.fid; arr.splice(arr.indexOf(r), 1); arr.splice(arr.indexOf(tr) + (t.after ? 1 : 0), 0, r); if (tr.fid && folderOf(tr)) r.fid = tr.fid; else delete r.fid; if (from !== r.fid) toast(r.fid ? `Spostata in “${esc(folderOf(r).name)}”` : 'Scheda tolta dalla cartella'); }
    moved = `.rt[data-rid="${id}"]`;
  } else {
    const fs = folders(), f = fs.find(x => x.id === id), tf = fs.find(x => x.id === t.fid); if (!f || !tf || f === tf) return;
    fs.splice(fs.indexOf(f), 1); fs.splice(fs.indexOf(tf) + (t.after ? 1 : 0), 0, f);
    moved = `.folder[data-fid="${id}"]`;
  }
  haptic(12); save(); render(); flash(moved, 'landed');
}
document.addEventListener('pointerup', lpDrop);
document.addEventListener('pointercancel', ev => { if (LP.t || LP.on) lpClear(); });
document.addEventListener('contextmenu', ev => { if (LP.t || LP.on || LP.eat) ev.preventDefault(); });
document.addEventListener('click', ev => { if (LP.eat) { LP.eat = false; ev.stopPropagation(); ev.preventDefault(); } }, true);

/* ---------- edge swipe → back ---------- */
const NO_SWIPE = new Set(['anatomy', 'routine', 'foodEdit', 'recipe', 'nutri', 'bodyLog', 'wizard', 'import', 'impReview', 'runEdit', 'pwReset']);
let EB = null;
document.addEventListener('touchstart', ev => {
  EB = null; if (!UI.layers.length || ev.touches.length > 1) return;
  const t = ev.touches[0]; if (t.clientX > 26) return;
  const top = topLayer(), el = $('#layers').lastElementChild;
  if (!top || NO_SWIPE.has(top.type) || !el || el.classList.contains('modal')) return;
  EB = { el, top, x0: t.clientX, y0: t.clientY, dx: 0, t0: Date.now(), on: false };
}, { passive: true });
document.addEventListener('touchmove', ev => {
  if (!EB) return; const t = ev.touches[0], dx = t.clientX - EB.x0, dy = t.clientY - EB.y0;
  if (!EB.on) { if (Math.abs(dy) > 12 && Math.abs(dy) > dx) { EB = null; return; } if (dx > 8) { EB.on = true; EB.el.style.transition = 'none'; EB.el.classList.add('swiping'); } else return; }
  EB.dx = Math.max(0, dx); EB.el.style.transform = `translateX(${EB.dx}px)`;
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!EB) return; const e = EB; EB = null; if (!e.on) return;
  const v = e.dx / Math.max(1, Date.now() - e.t0);
  if (e.dx > innerWidth * 0.35 || (v > 0.45 && e.dx > 40)) {
    e.el.style.transition = 'transform .2s cubic-bezier(.3,.7,.4,1)'; e.el.style.transform = 'translateX(100%)';
    setTimeout(() => { if (topLayer() !== e.top) return; UI.noGhost = true; if (e.top.type === 'workout' || e.top.type === 'run') A.minimize(); else { popLayer(); if (!UI.layers.length) render(); } }, 190);
  } else { e.el.style.transition = 'transform .22s ease'; e.el.style.transform = ''; setTimeout(() => e.el.classList.remove('swiping'), 230); }
});

/* ---------- pull the workout / run header down → minimize ---------- */
let PD = null;
document.addEventListener('touchstart', ev => {
  PD = null; const h = ev.target.closest('.layer-head'); if (!h || ev.target.closest('button')) return;
  const el = h.closest('.layer'); if (!el || !['workout', 'run'].includes(el.dataset.t) || el !== $('#layers').lastElementChild) return;
  PD = { el, y0: ev.touches[0].clientY, dy: 0, on: false };
}, { passive: true });
document.addEventListener('touchmove', ev => {
  if (!PD) return; const dy = ev.touches[0].clientY - PD.y0;
  if (!PD.on) { if (dy > 8) { PD.on = true; PD.el.style.transition = 'none'; } else if (dy < -4) { PD = null; return; } else return; }
  PD.dy = Math.max(0, dy); PD.el.style.transform = `translateY(${PD.dy}px)`; PD.el.style.borderRadius = Math.min(22, PD.dy / 4) + 'px';
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!PD) return; const p = PD; PD = null; if (!p.on) return;
  if (p.dy > 110) { p.el.style.transition = 'transform .2s ease-in'; p.el.style.transform = 'translateY(100%)'; setTimeout(() => { UI.noGhost = true; A.minimize(); }, 180); }
  else { p.el.style.transition = 'transform .22s ease, border-radius .22s'; p.el.style.transform = ''; p.el.style.borderRadius = ''; }
});

/* ---------- swipe a set row to the left → delete ---------- */
let SR = null;
document.addEventListener('touchstart', ev => {
  SR = null; if (ev.touches.length > 1) return;
  const row = ev.target.closest('.set-row, .rt-set:not(.hd)'); if (!row || ev.target.closest('[data-drag]')) return;
  const del = row.classList.contains('rt-set') ? row.querySelector('[data-a="rtDelSet"]') : row.querySelector('[data-a="toggleSet"]');
  if (!del || del.disabled) return;
  SR = { row, del, x0: ev.touches[0].clientX, y0: ev.touches[0].clientY, dx: 0, on: false, under: null, armed: false };
}, { passive: true });
document.addEventListener('touchmove', ev => {
  if (!SR) return; const t = ev.touches[0], dx = t.clientX - SR.x0, dy = t.clientY - SR.y0;
  if (!SR.on) {
    if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { SR = null; return; }
    if (dx < -14 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      SR.on = true; const r = SR.row, par = r.parentElement, card = r.closest('.exc, .ed-ex');
      if (getComputedStyle(par).position === 'static') par.style.position = 'relative';
      const u = document.createElement('div'); u.className = 'swipe-under'; u.innerHTML = `${icon('trash', 18)} Elimina`;
      u.style.top = r.offsetTop + 'px'; u.style.height = r.offsetHeight + 'px'; par.insertBefore(u, r); SR.under = u;
      r.classList.add('swiping'); r.style.background = card ? getComputedStyle(card).backgroundColor : 'var(--surface)'; r.style.transition = 'none';
      if (document.activeElement && r.contains(document.activeElement)) document.activeElement.blur();
    } else return;
  }
  SR.dx = Math.min(0, dx); SR.row.style.transform = `translateX(${SR.dx}px)`;
  const armed = SR.dx < -Math.min(120, SR.row.offsetWidth * 0.35);
  if (armed !== SR.armed) { SR.armed = armed; SR.under.classList.toggle('armed', armed); if (armed) haptic(10); }
}, { passive: true });
function srEnd() {
  if (!SR) return; const s = SR; SR = null; if (!s.on) return;
  const cleanup = () => { s.under && s.under.remove(); s.row.classList.remove('swiping'); s.row.style.transform = ''; s.row.style.background = ''; s.row.style.transition = ''; };
  if (!s.armed) { s.row.style.transition = 'transform .2s ease'; s.row.style.transform = ''; setTimeout(cleanup, 210); return; }
  s.row.style.transition = 'transform .18s ease-in'; s.row.style.transform = 'translateX(-110%)';
  setTimeout(() => {
    cleanup();
    if (s.del.dataset.a === 'rtDelSet') { A.rtDelSet(s.del); return; }
    const ei = +s.del.dataset.ei, si = +s.del.dataset.si, e = S.active?.ex[ei]; if (!e || !e.sets[si]) return;
    const removed = e.sets.splice(si, 1)[0]; save(); renderLayers();
    UI.undo = () => { const e2 = S.active?.ex[ei]; if (e2 === e) { e.sets.splice(si, 0, removed); save(); renderLayers(); } };
    toast(`Serie eliminata <button class="link" data-a="undo">Annulla</button>`);
  }, 170);
}
document.addEventListener('touchend', srEnd);
document.addEventListener('touchcancel', () => { if (SR && SR.on) { SR.armed = false; srEnd(); } else SR = null; });

/* registered last: while dragging (decided by the listeners above), the page must not scroll, the page must not scroll under the finger */
document.addEventListener('touchmove', ev => { if (LP.on || DRAG || (EB && EB.on) || (SR && SR.on) || (PD && PD.on)) ev.preventDefault(); }, { passive: false });

Object.assign(A, { undo(el) { const f = UI.undo; UI.undo = null; el.closest('.toast')?.remove(); if (f) f(); } });
