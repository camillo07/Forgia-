/* =========================================================
   ALLENAMENTO IN CORSO: consigli in tempo reale, esercizi richiudibili,
   aggiornamento della scheda a fine seduta, trascinamento, tendine a scorrimento,
   recupero sulla schermata di blocco (Media Session)
   ========================================================= */
Object.assign(IC, { grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>' });

/* ---------- live advice after each set ---------- */
function liveAdvice(e) {
  const mt = mtOf(e); if (mt !== 'wr' && mt !== 'bw') return null;
  const work = e.sets.filter(isWork), done = work.filter(s => s.done);
  if (!done.length || done.length === work.length) return null;
  const last = done[done.length - 1], next = work.find(s => !s.done);
  if (last.r == null) return null;
  const tA = last.ta ?? e.rmin, tB = last.tb ?? last.ta ?? e.rmax;
  if (tA == null) return null;
  const x = ex(e.id), inc = increment(x) || (mt === 'bw' ? 0 : 2.5), kg = last.kg ?? 0;
  const nA = next.ta ?? tA, nB = next.tb ?? next.ta ?? tB;
  if (next.t === 'bo' || next.bpct || next.rm) return null;   // the plan already decides the next load
  if (last.r >= tB + 2 && nB <= tB + 1) return inc ? { kg: +(kg + inc).toFixed(2), kind: 'up', text: `${last.r} reps: troppo facile. Prossima serie <b>${fmtKg(kg + inc)} kg</b>.` } : { kind: 'up', text: `${last.r} reps: troppo facile. Rallenta l'eccentrica o aggiungi zavorra.` };
  if (last.r < tA && nA >= tA - 1) {
    const down = roundKg(kg * (tA - last.r >= 3 ? 0.9 : 0.95), e.id);
    return mt === 'wr' && down < kg ? { kg: down, kind: 'down', text: `${last.r} reps, sotto le ${tA}: prossima serie <b>${fmtKg(down)} kg</b> per restare nel range.` } : { kind: 'down', text: `${last.r} reps, sotto le ${tA}: recupera un po' di più prima della prossima.` };
  }
  return { kg, kind: 'hold', text: `${last.r} reps a ${fmtKg(kg)} kg: nel range. <b>Tieni ${fmtKg(kg)} kg</b>.` };
}

/* ---------- end of workout: update the routine? ---------- */
/* rows kept but not done stay in the routine; only removed rows/exercises are removed */
function routineAfter(w, withReps) {
  const r = w.rid && S.routines.find(x => x.id === w.rid); if (!r) return null;
  const ex2 = w.ex.map(e => {
    const base = e.src != null && r.ex[e.src] ? JSON.parse(JSON.stringify(r.ex[e.src])) : { id: e.id, rest: e.rest || S.profile.restDefault };
    const bplan = e.src != null && r.ex[e.src] ? planOf(r.ex[e.src]) : [];
    const plan = e.sets.map(s => {
      const p0 = s.pi != null && bplan[s.pi] ? { ...bplan[s.pi] } : { t: s.t, a: s.ta ?? s.r ?? 10, b: s.tb ?? null };
      p0.t = s.t;
      if (withReps && s.done && s.r != null && isWork(s) && p0.a != null && (s.r < p0.a || s.r > (p0.b ?? p0.a))) { p0.a = s.r; p0.b = null; }
      return p0;
    });
    const o = { ...base, id: e.id, plan, ss: !!e.ss, tags: e.tags && e.tags.length ? [...e.tags] : undefined, rest: e.rest || base.rest };
    const w0 = plan.find(p => p.t !== 'w') || plan[0] || {}; o.sets = plan.filter(p => p.t !== 'w').length || plan.length; o.rmin = w0.a ?? 8; o.rmax = w0.b ?? w0.a ?? 12;
    return o;
  });
  return { r, ex: ex2 };
}
function routineDiff(w) {
  const after = routineAfter(w, false); if (!after) return null;
  const { r, ex: ex2 } = after, lines = [];
  const used = new Set(w.ex.map(e => e.src).filter(v => v != null));
  r.ex.forEach((e, i) => { if (!used.has(i)) lines.push(`− ${ex(e.id).n}`); });
  w.ex.forEach((e, k) => {
    if (e.src == null) { lines.push(`+ ${ex(e.id).n} (${planSummary(ex2[k].plan)})`); return; }
    const o = r.ex[e.src];
    if (o.id !== e.id) lines.push(`${ex(o.id).n} → ${ex(e.id).n}`);
    const a = planOf(o), b = ex2[k].plan;
    if (a.length !== b.length || a.some((p, i) => (p.t || 'n') !== (b[i].t || 'n'))) lines.push(`${ex(e.id).n}: ${planSummary(a)} → ${planSummary(b)}`);
  });
  const order = w.ex.map(e => e.src).filter(v => v != null);
  if (order.some((v, i) => i && v < order[i - 1])) lines.push('Ordine degli esercizi cambiato');
  const repsDiff = w.ex.some(e => e.sets.some(s => s.done && isWork(s) && s.r != null && s.ta != null && (s.r < s.ta || s.r > (s.tb ?? s.ta))));
  return lines.length || repsDiff ? { lines, repsDiff } : null;
}
function applyRoutineUpdate(w, withReps) {
  const after = routineAfter(w, withReps); if (!after) return;
  after.r.ex = after.ex; save();
  toast(`Scheda “${esc(after.r.name)}” aggiornata`);
}

/* ---------- drag to reorder (exercise cards, routine editor) ---------- */
let DRAG = null;
function dragBegin(item, kind, pid, y, capEl) {
  const list = item.parentElement, items = [...list.querySelectorAll(':scope > [data-drag-item]')];
  const rect = item.getBoundingClientRect();
  // geometria misurata una volta sola: offsetTop/offsetHeight non cambiano con le transform,
  // quindi le animazioni in corso non falsano i calcoli (era il tremolio durante il trascinamento)
  const geo = items.map(it => ({ off: it.offsetTop, h: it.offsetHeight }));
  const sc = list.closest('.layer-body');
  DRAG = {
    kind, item, list, items, geo, sc, from: items.indexOf(item), y0: y, h: rect.height,
    to: items.indexOf(item), pid, k: item.offsetTop - rect.top, sc0: sc ? sc.scrollTop : scrollY
  };
  item.classList.add('dragging'); haptic(15);
  try { (capEl || item).setPointerCapture(pid); } catch (e) { }
}
document.addEventListener('pointerdown', ev => {
  const h = ev.target.closest('[data-drag]'); if (!h) return;
  const item = h.closest('[data-drag-item]'); if (!item) return;
  ev.preventDefault();
  dragBegin(item, h.dataset.drag, ev.pointerId, ev.clientY, h);
});
document.addEventListener('pointermove', ev => {
  if (!DRAG || ev.pointerId !== DRAG.pid) return;
  ev.preventDefault();
  const sh = (DRAG.sc ? DRAG.sc.scrollTop : scrollY) - DRAG.sc0;
  const dy = ev.clientY - DRAG.y0 + sh; DRAG.item.style.transform = `translateY(${dy}px)`;
  const py = ev.clientY + DRAG.k + sh; let to = DRAG.from;
  DRAG.geo.forEach((g, i) => { if (i === DRAG.from) return; const m = g.off + Math.min(g.h / 2, 60); if (i > DRAG.from && py > m) to = Math.max(to, i); if (i < DRAG.from && py < m + (g.h > 120 ? g.h - 120 : 0)) to = Math.min(to, i); });
  DRAG.to = to;
  DRAG.items.forEach((it, i) => { if (it === DRAG.item) return; let s = 0; if (DRAG.from < to && i > DRAG.from && i <= to) s = -DRAG.h - 10; if (DRAG.from > to && i < DRAG.from && i >= to) s = DRAG.h + 10; it.style.transform = s ? `translateY(${s}px)` : ''; });
  // autoscroll
  if (DRAG.sc) { const r = DRAG.sc.getBoundingClientRect(); if (ev.clientY < r.top + 60) DRAG.sc.scrollTop -= 12; else if (ev.clientY > r.bottom - 60) DRAG.sc.scrollTop += 12; }
}, { passive: false });
function dragEnd(ev) {
  if (!DRAG || (ev && ev.pointerId !== DRAG.pid)) return;
  const { kind, from, to, items } = DRAG; items.forEach(it => { it.style.transform = ''; it.classList.remove('dragging'); }); DRAG = null;
  if (from === to) return;
  if (kind === 'wo' && S.active) { const a = S.active.ex; a.splice(to, 0, a.splice(from, 1)[0]); a.forEach((e, i) => { if (i === a.length - 1) e.ss = false; }); save(); renderLayers(); }
  if (kind === 'rt') { const l = topLayer(); if (l && l.draft) { const a = l.draft.ex; a.splice(to, 0, a.splice(from, 1)[0]); if (a.length) a[a.length - 1].ss = false; renderLayers(); } }
  haptic(10);
}
document.addEventListener('pointerup', dragEnd);
document.addEventListener('pointercancel', dragEnd);

/* ---------- bottom sheets: swipe down to close ---------- */
let SW = null;
document.addEventListener('touchstart', ev => {
  const sh = ev.target.closest('.sheet'); if (!sh || (sh.scrollTop > 0 && !ev.target.closest('.grab, .sheet > h3'))) return;
  if (ev.target.closest('input, textarea, select, .chips')) return;
  SW = { sh, y0: ev.touches[0].clientY, dy: 0 };
}, { passive: true });
document.addEventListener('touchmove', ev => {
  if (!SW) return;
  const dy = ev.touches[0].clientY - SW.y0;
  if (dy < 0 && !SW.dy) { SW = null; return; }
  SW.dy = Math.max(0, dy); SW.sh.style.transition = 'none'; SW.sh.style.transform = `translateY(${SW.dy}px)`;
  const bd = SW.sh.parentElement; if (bd && bd.classList.contains('modal')) bd.style.backgroundColor = `rgba(5,7,10,${(0.62 * Math.max(0, 1 - SW.dy / 400)).toFixed(3)})`;
}, { passive: true });
document.addEventListener('touchend', () => {
  if (!SW) return;
  const { sh, dy } = SW; SW = null;
  if (dy > 90) { sh.style.transition = 'transform .15s ease'; sh.style.transform = 'translateY(100%)'; setTimeout(() => { if (topLayer()?.type === 'sheet' || topLayer()?.type === 'confirm' || topLayer()?.type === 'tags' || topLayer()?.type === 'amount') { popLayer(); if (!UI.layers.length) render(); } }, 140); }
  else { sh.style.transition = 'transform .25s cubic-bezier(.2,.9,.3,1.2)'; sh.style.transform = ''; if (sh.parentElement) sh.parentElement.style.backgroundColor = ''; }
});

/* ---------- rest timer on the lock screen ----------
   An audio track as long as the rest (silence + beep at the end) keeps playing with the phone locked;
   the Media Session shows it like a song: exercise, next set, remaining time. */
const RA = { audio: null, url: null, until: 0 };
function restWav(sec, beepOn) {
  const sr = 4000, n = Math.max(1, Math.round(sec * sr)), buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  const d = new Uint8Array(buf, 44); d.fill(128);
  if (beepOn) { const beeps = [[-1.0, 784], [-0.7, 784], [-0.4, 1046]]; for (const [t0, f] of beeps) { const s0 = Math.max(0, n + Math.round(t0 * sr)); for (let i = 0; i < Math.round(0.18 * sr) && s0 + i < n; i++) { const env = Math.min(1, i / 40, (0.18 * sr - i) / 80); d[s0 + i] = 128 + Math.round(90 * env * Math.sin(2 * Math.PI * f * i / sr)); } } }
  return new Blob([buf], { type: 'audio/wav' });
}
function restAudioStop() { RA.until = 0; try { if (RA.audio) { RA.audio.pause(); RA.audio.src = ''; } if (RA.url) URL.revokeObjectURL(RA.url); } catch (e) { } RA.audio = null; RA.url = null; audioIdle(); try { if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; } } catch (e) { } }
function restAudioStart() {
  const a = S.active;
  restAudioStop();
  if (!a || !a.restEnd || S.profile.lockTimer !== true) return;
  const left = (a.restEnd - Date.now()) / 1000; if (left < 3) return;
  try {
    RA.url = URL.createObjectURL(restWav(left, S.profile.sound !== false)); RA.until = a.restEnd;
    audioMode('playback'); RA.audio = new Audio(RA.url); RA.audio.setAttribute('playsinline', ''); RA.audio.volume = 1;
    RA.audio.addEventListener('ended', () => { const u = RA.until; restAudioStop(); RA.until = u; setTimeout(() => { if (RA.until === u) RA.until = 0; }, 4000); });
    const p = RA.audio.play(); if (p && p.catch) p.catch(() => { });
    if ('mediaSession' in navigator) {
      const cur = a.ex.find(e => e.sets.some(s => !s.done)) || a.ex[a.ex.length - 1], ns = cur && cur.sets.find(s => !s.done);
      const nkg = ns ? (ns.kg ?? planKg(cur, ns) ?? liveAdvice(cur)?.kg ?? null) : null;
      const nextTxt = ns ? `Prossima: ${nkg != null ? fmtKg(nkg) + ' kg × ' : ''}${ns.ta != null ? repTxt(ns.ta, ns.tb) : ns.r ?? ''}`.replace(/ × $/, '') : 'Ultima serie fatta';
      navigator.mediaSession.metadata = new MediaMetadata({ title: `Recupero ${fmtClock(left * 1000)}`, artist: cur ? `${ex(cur.id).n} · ${nextTxt}` : 'Forgia', album: a.name || 'Allenamento', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }, { src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] });
      navigator.mediaSession.playbackState = 'playing';
      const set = (k, f) => { try { navigator.mediaSession.setActionHandler(k, f); } catch (e) { } };
      set('nexttrack', () => A.restSkip());
      set('seekforward', () => A.restAdj({ dataset: { d: 15 } }));
      set('seekbackward', () => A.restAdj({ dataset: { d: -15 } }));
      set('pause', () => A.restSkip());
      set('play', () => { });
      try { navigator.mediaSession.setPositionState({ duration: left, playbackRate: 1, position: 0 }); } catch (e) { }
    }
  } catch (e) { }
}

/* ---------- last 7 days ---------- */
function recentWorkoutsCard() {
  const t = Date.now() - 7 * DAY, ws = S.workouts.filter(w => w.start >= t && !w.demo).sort((a, b) => b.start - a.start);
  if (!ws.length) return '';
  return `<div class="stack"><div class="section-title">Ultimi 7 giorni</div><div class="list">${ws.map(w => `<div class="li" style="align-items:center"><button class="grow" data-a="openHist" data-id="${w.id}" style="text-align:left;min-width:0"><div class="t">${esc(w.name)}</div><div class="s">${relDay(w.start)} · ${w.ex.length} esercizi · ${w.ex.reduce((a, e) => a + e.sets.filter(isWork).length, 0)} serie</div></button>
    <button class="chip warm" data-a="repeatWorkout" data-id="${w.id}">${icon('play', 12)} Ripeti</button><button class="chip" data-a="copyWorkout" data-id="${w.id}">${icon('copy', 12)} Copia</button></div>`).join('')}</div>
    <div class="small faint">Ripeti: rifai la stessa seduta. Copia: diventa una scheda nuova con le serie e le ripetizioni che hai fatto.</div></div>`;
}

Object.assign(A, {
  toggleLockTimer() { S.profile.lockTimer = S.profile.lockTimer !== true; save(); render(); if (S.profile.lockTimer) { toast('Timer sul blocco attivo: con la musica accesa la mette in pausa'); restAudioStart(); } else restAudioStop(); },
  exCollapse(el) { const ei = +el.dataset.ei, e = S.active.ex[ei]; e.col = !e.col; save(); renderLayers(); if (!e.col) flash(document.querySelector(`[data-a="exCollapse"][data-ei="${ei}"]`)?.closest('.exc'), 'open-anim'); },
  copyWorkout(el) {
    const w = S.workouts.find(x => x.id === el.dataset.id); if (!w) return;
    S.routines.push({ id: uid(), name: (w.name + ' (copia)').slice(0, 40), note: '', ex: w.ex.map(e => { const plan = e.sets.map(s => ({ t: s.t || 'n', a: s.r ?? s.sec ?? null, b: null })); const w0 = plan.find(p => p.t !== 'w') || plan[0] || {}; return { id: e.id, sets: plan.filter(p => p.t !== 'w').length || plan.length, rmin: w0.a ?? 8, rmax: w0.a ?? 12, rest: 120, ss: false, tags: e.tags ? [...e.tags] : undefined, plan }; }) });
    save(); render(); toast('Copiata come nuova scheda in “Le mie schede”');
  },
});
