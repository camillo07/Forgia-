/* =========================================================
   ACTIONS & EVENTS
   ========================================================= */
function toast(msg, cls = '') {
  if (cls === 'pr') document.querySelectorAll('.toast.pr').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast ' + cls; el.innerHTML = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => el.remove(), cls === 'pr' ? 3200 : /data-a="undo"/.test(msg) ? 4500 : 2200);
}
function haptic(ms = 20) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { } }

/* ---------- audio & wake lock ---------- */
let AC = null;
/* iOS audio session: 'ambient' mixes with the user's music (Spotify, Apple Music) instead of stopping it.
   Only the lock-screen tracks (rest timer, run intervals) switch to 'playback', because they must keep playing with the phone locked. */
function audioMode(m) { try { if (navigator.audioSession && navigator.audioSession.type !== m) navigator.audioSession.type = m; } catch (e) { } }
function audioIdle() { if (!(typeof RA !== 'undefined' && RA.audio) && !(typeof RUN !== 'undefined' && RUN.audio)) audioMode('ambient'); }
function unlockAudio() { audioIdle(); try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); } catch (e) { } }
/* rest-timer sounds (Profilo → Timer di recupero): type, volume, preview */
const TIMER_SOUNDS = {
  bip: { n: 'Bip', notes: [[0, 784, .18, 'sine'], [.22, 784, .18, 'sine'], [.44, 1046, .26, 'sine']] },
  campanella: { n: 'Campanella', notes: [[0, 1318, 1.1, 'sine', [2.76, .25]], [.32, 1760, 1.3, 'sine', [2.76, .25]]] },
  gong: { n: 'Gong', notes: [[0, 196, 1.8, 'triangle', [1.5, .5]], [0, 392, 1.2, 'sine']] },
  dolce: { n: 'Dolce', notes: [[0, 660, .35, 'sine'], [.28, 880, .5, 'sine']] },
  fischio: { n: 'Fischietto', notes: [[0, 2093, .12, 'square'], [.16, 2093, .12, 'square'], [.32, 2093, .3, 'square']] },
};
const TIMER_VOL = { low: .18, mid: .4, high: .8 };
function playSound(kind, volKey) {
  if (!AC) unlockAudio(); if (!AC) return;
  const def = TIMER_SOUNDS[kind] || TIMER_SOUNDS.bip, vol = TIMER_VOL[volKey || S.profile.soundVol || 'mid'] || .4;
  try {
    for (const [t, f, d, type, harm] of def.notes) {
      const parts = [[f, 1]]; if (harm) parts.push([f * harm[0], harm[1]]);
      for (const [fr, amp] of parts) {
        const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + t, peak = Math.max(0.0002, vol * amp * (type === 'square' ? .35 : 1));
        o.type = type; o.frequency.value = fr;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + .015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + d + .05);
      }
    }
  } catch (e) { }
}
function beep() { if (!S.profile.sound || !AC) return; playSound(S.profile.soundKind || 'bip'); }
function tickSound() { if (!S.profile.sound || !AC) return; playSound('dolce', 'low'); }
document.addEventListener('pointerdown', () => { if (AC && AC.state === 'suspended') { try { AC.resume(); } catch (e) { } } }, { passive: true });
let wakeLock = null;
async function requestWake() { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { } }
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (e) { } wakeLock = null; }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.active) requestWake(); });

/* ---------- rest timer ---------- */
function startRest(sec) {
  if (!S.active) return;
  S.active.restEnd = Date.now() + sec * 1000; S.active.restTotal = sec; S.active.restBeeped = false; S.active.restWarned = sec <= 15; save();
  updateRestBar(); restAudioStart();
}
function updateRestBar() {
  const bar = $('#restbar');
  const a = S.active;
  const left = a && a.restEnd ? a.restEnd - Date.now() : 0;
  if (!a || left <= 0) {
    if (a && a.restEnd && !a.restBeeped) { a.restBeeped = true; a.restEnd = 0; save(); if (!(RA.until && Math.abs(RA.until - Date.now()) < 3000)) beep(); haptic([200, 100, 200]); toast(icon('timer', 18) + ' Recupero finito: vai con la prossima serie'); }
    bar.hidden = true; document.body.classList.remove('resting'); return;
  }
  if (S.profile.restWarn && !a.restWarned && left <= 10500) { a.restWarned = true; tickSound(); }
  const onTabs = !UI.layers.length;
  const top = topLayer();
  if (!onTabs && top.type !== 'workout') { bar.hidden = true; document.body.classList.remove('resting'); return; }
  document.body.classList.add('resting');
  bar.style.bottom = onTabs ? `calc(var(--tab-h) + env(safe-area-inset-bottom, 0px) + 18px)` : '';
  if (bar.hidden || !bar.firstChild) {
    bar.innerHTML = `<span class="flame">${icon('timer', 24)}</span><span class="t" id="rest-t"></span><span class="grow"></span><button class="btn" data-a="restAdj" data-d="-15">−15</button><button class="btn" data-a="restAdj" data-d="15">+15</button><button class="btn primary" data-a="restSkip">Salta</button><i class="prog" id="rest-p"></i>`;
    bar.hidden = false;
  }
  $('#rest-t').textContent = fmtClock(left + 999);
  $('#rest-p').style.width = (100 * (1 - left / (a.restTotal * 1000))).toFixed(1) + '%';
}
setInterval(() => {
  if (!S.active) return;
  const c = $('#wo-clock'); if (c) c.textContent = fmtClock(Date.now() - S.active.start);
  updateRestBar();
}, 250);

/* ---------- export / import ---------- */
async function exportData() {
  const data = serialize({ app: 'forgia', exportedAt: new Date().toISOString(), state: { ...S, ai: { ...S.ai, key: '', chat: [] } } }, 1);
  const name = 'forgia-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  try {
    if (window.claude && window.claude.use) {
      const dl = await window.claude.use('downloads');
      if (dl) { await dl.save({ filename: name, data }); toast('Backup salvato'); return; }
    }
  } catch (e) { if (e && e.code === 'declined') return; }
  try {
    const file = new File([data], name, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Backup Forgia' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try {
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Backup scaricato');
  } catch (e) {
    try { await navigator.clipboard.writeText(data); toast('Backup copiato negli appunti'); } catch (e2) { toast('Esportazione non riuscita su questo dispositivo'); }
  }
}
function importData(file) {
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result); const st = d.state || d;
      if (!Array.isArray(st.workouts) || !Array.isArray(st.routines)) throw new Error('formato');
      pushLayer({
        type: 'confirm', title: 'Importare il backup?', text: `Contiene ${st.workouts.length} allenamenti e ${st.routines.length} schede. I dati attuali verranno sostituiti.`, ok: 'Importa', danger: true,
        fn: () => { S = Object.assign(defaultState(), st); S.profile = Object.assign(defaultState().profile, st.profile || {}); save(); CACHE.k = null; render(); toast('Backup importato'); }
      });
    } catch (e) { toast('File non valido: scegli un backup esportato da Forgia'); }
  };
  fr.readAsText(file);
}

/* ---------- click actions ---------- */
const A = {
  woTags(el) { const e = S.active.ex[+el.dataset.ei]; pushLayer({ type: 'tags', get: () => (e.tags = e.tags || []), done: () => save() }); },
  rtTags(el) { const e = topLayer().draft.ex[+el.dataset.ei]; pushLayer({ type: 'tags', get: () => (e.tags = e.tags || []), done: () => { } }); },
  tagToggle(el) {
    const l = topLayer(), list = l.get(), t = el.dataset.t, i = list.indexOf(t);
    if (i >= 0) list.splice(i, 1); else { if (/^RIR \d/.test(t)) for (let j = list.length - 1; j >= 0; j--) if (/^RIR \d/.test(list[j])) list.splice(j, 1); list.push(t); }
    l.done(); renderLayers();
  },
  more(el) { UI[el.dataset.k] = true; render(); },
  tab(el) { const same = UI.tab === el.dataset.k && !UI.layers.length; UI.tab = el.dataset.k; UI.layers = []; render(); window.scrollTo(0, 0); if (!same) flash('#main', 'tab-in'); },
  pop() { popLayer(); },
  closeAll() { UI.layers = []; render(); },
  backdrop(el, ev) { if (ev.target === el) popLayer(); },
  minimize() { closeLayersOfType('workout'); closeLayersOfType('run'); renderLayers(); render(); },
  goal(el) { S.profile.weeklyGoal = clamp(S.profile.weeklyGoal + +el.dataset.d, 1, 7); save(); const g = $('#goalv'); if (g) g.textContent = S.profile.weeklyGoal; },
  toggleSound() { S.profile.sound = !S.profile.sound; save(); render(); },
  soundKind(el) { S.profile.soundKind = el.value || el.dataset.v; save(); unlockAudio(); playSound(S.profile.soundKind); render(); },
  soundVol(el) { S.profile.soundVol = el.dataset.v; save(); unlockAudio(); playSound(S.profile.soundKind || 'bip'); render(); },
  soundTest() { unlockAudio(); playSound(S.profile.soundKind || 'bip'); },
  toggleRestWarn() { S.profile.restWarn = !S.profile.restWarn; save(); render(); if (S.profile.restWarn) { unlockAudio(); tickSound(); } },
  finishOnboard() {
    const p = document.querySelector('input[name="ob-prog"]:checked')?.value;
    if (p) { const prog = PROGRAMS.find(x => x.id === p); S.routines.push(...prog.routines.map(routineFromTemplate)); }
    if ($('#ob-demo')?.checked) { S.workouts.push(...makeDemo()); makeDietDemo(); makeBodyDemo(); makeRunDemo(); }
    S.profile.onboarded = true; save(); UI.tab = 'home'; render();
  },
  /* workouts */
  startEmpty() { guardStart(() => startWorkout()); },
  startRoutine(el) { const r = S.routines.find(r => r.id === el.dataset.id); if (r) guardStart(() => startWorkout(r)); },
  openWorkout() { openWorkout(); },
  finishWorkout() { finishWorkout(); },
  cancelWorkout() { if (S.active?.editId) return discardWorkout(); pushLayer({ type: 'confirm', title: 'Annullare l\'allenamento?', text: 'Le serie registrate in questa sessione andranno perse.', ok: 'Annulla allenamento', danger: true, fn: discardWorkout }); },
  toggleSet(el) {
    unlockAudio();
    const ei = +el.dataset.ei, si = +el.dataset.si, e = S.active.ex[ei], s = e.sets[si];
    if (s.done) { s.done = false; s.pr = false; save(); renderLayers(); return; }
    // fill from placeholders
    const row = el.closest('.set-row'), mt = mtOf(e), x = ex(e.id);
    for (const inp of row.querySelectorAll('input[data-f]')) { const f = inp.dataset.f; if (s[f] == null && f !== 'rir') { const v = num(inp.placeholder); if (v != null) s[f] = v; } }
    if (mt === 'bw' && s.kg == null) s.kg = 0;
    if (mt === 'wr' && s.kg == null && x.e === 'body only') s.kg = 0;
    if (!setDone(s, mt)) {
      toast(mt === 'time' ? 'Inserisci i secondi' : mt === 'dist' ? 'Inserisci km o minuti' : 'Inserisci kg e ripetizioni');
      const miss = [...row.querySelectorAll('input[data-f]')].find(i => i.dataset.f !== 'rir' && s[i.dataset.f] == null); if (miss) miss.focus(); return;
    }
    s.done = true;
    if (e.sets.every(o => o.done)) e.col = true;
    haptic(25);
    // PR check
    const b0 = derive().best[e.id];
    if (isWork(s) && (mt === 'time' || mt === 'dist') && b0 && b0.sessions) {
      const others = e.sets.filter((o, k) => k !== si && o.done && isWork(o));
      if (mt === 'time' && s.sec > b0.sec && s.sec > Math.max(0, ...others.map(o => o.sec || 0))) { e.sets.forEach(o => o.pr = false); s.pr = true; toast(`${icon('trophy', 18)} Nuovo record · ${esc(x.n)} · ${s.sec} s`, 'pr'); }
      if (mt === 'dist' && s.km > b0.km && s.km > Math.max(0, ...others.map(o => o.km || 0))) { e.sets.forEach(o => o.pr = false); s.pr = true; toast(`${icon('trophy', 18)} Nuovo record · ${esc(x.n)} · ${fmtN(s.km, 2)} km`, 'pr'); }
    } else if (isWork(s)) {
      const b = derive().best[e.id];
      const cur = e1rm(s.kg, s.r);
      const others = e.sets.filter((o, k) => k !== si && o.done && isWork(o));
      const sessBest = Math.max(0, ...others.map(o => e1rm(o.kg, o.r)));
      const sessReps = Math.max(0, ...others.filter(o => !o.kg).map(o => o.r));
      if (!s.kg && b && b.sessions && s.r > b.reps && s.r > sessReps) {
        e.sets.forEach(o => o.pr = false); s.pr = true;
        toast(`${icon('trophy', 18)} Nuovo record · ${esc(x.n)} · ${s.r} reps`, 'pr');
      } else if (s.kg && b && b.sessions && cur > b.e1rm + 0.01 && cur > sessBest) {
        e.sets.forEach(o => o.pr = false); s.pr = true;
        toast(`${icon('trophy', 18)} Nuovo record · ${esc(x.n)} · 1RM ${fmtKg(cur)} kg`, 'pr');
      }
    }
    // auto-fill next empty set kg with this value
    const nx = e.sets.slice(si + 1).find(o => !o.done && o.t === s.t && o.kg == null && !o.bpct && !o.rm);
    if (nx) { const lv = isWork(s) ? liveAdvice(e) : null; nx.kg = lv && lv.kg != null ? lv.kg : s.kg; }
    save();
    const linkedNext = e.ss && ei + 1 < S.active.ex.length;
    if (!linkedNext && !S.active.past) startRest(e.rest || S.profile.restDefault);
    renderLayers(); flash(`.chk[data-ei="${ei}"][data-si="${si}"]`, 'pop');
  },
  addSet(el) {
    const e = S.active.ex[+el.dataset.ei]; const last = e.sets[e.sets.length - 1];
    e.sets.push({ t: last && last.t !== 'w' ? last.t : 'n', kg: last ? last.kg : null, r: null, rir: null, sec: null, km: null, min: null, ta: last ? last.ta ?? null : null, tb: last ? last.tb ?? null : null, done: false }); save(); renderLayers();
  },
  setMenu(el) {
    const ei = +el.dataset.ei, si = +el.dataset.si, s = S.active.ex[ei].sets[si];
    pushLayer({
      type: 'sheet', title: 'Serie ' + (si + 1), items: [
        ...Object.entries(SET_TYPES).map(([k, v]) => ({ label: v.l, desc: v.d, on: s.t === k, fn: () => { s.t = k; save(); } })),
        { label: 'Elimina serie', ic: 'trash', danger: true, fn: () => { S.active.ex[ei].sets.splice(si, 1); save(); } },
      ]
    });
  },
  exMenu(el) {
    const ei = +el.dataset.ei, list = S.active.ex, e = list[ei];
    const restOpts = [45, 60, 90, 120, 150, 180, 240, 300];
    pushLayer({
      type: 'sheet', title: ex(e.id).n, items: [
        { label: 'Aggiungi nota', ic: 'edit', fn: () => { e.noteOpen = true; save(); } },
        ...(mtOf(e) === 'wr' ? [{ label: 'Riscaldamento automatico', desc: 'Serie di avvicinamento dal peso di lavoro', ic: 'flame', fn: () => { if (!addWarmup(e, S.active.id)) toast('Scrivi prima il peso di lavoro della 1ª serie'); save(); } }] : []),
        { label: 'Esecuzione / tempo', desc: (e.tags || []).join(', ') || 'Es. eccentrica 3 s, fermo, parziali', ic: 'timer', fn: () => setTimeout(() => A.woTags({ dataset: { ei } }), 0) },
        ...(mtOf(e) !== 'dist' ? [{ label: rirOn(e) ? 'Non registrare il RIR' : 'Registra RIR', desc: 'Colonna RIR per ogni serie (ripetizioni lasciate in riserva)', ic: 'target', fn: () => { S.exRir = S.exRir || {}; if (rirOn(e)) delete S.exRir[e.id]; else S.exRir[e.id] = true; save(); } }] : []),
        { label: 'Come lo registri', desc: MT[mtOf(e)].l, ic: 'layers', fn: () => setTimeout(() => pushLayer({ type: 'sheet', title: 'Come lo registri', items: Object.entries(MT).map(([k, v]) => ({ label: v.l, desc: v.d, on: mtOf(e) === k, fn: () => { e.mt = k; S.exType = S.exType || {}; S.exType[e.id] = k; save(); } })) }), 0) },
        { label: 'Tempo di recupero', desc: fmtClock((e.rest || S.profile.restDefault) * 1000), ic: 'timer', fn: () => setTimeout(() => pushLayer({ type: 'sheet', title: 'Recupero', items: restOpts.map(s => ({ label: fmtClock(s * 1000), on: (e.rest || S.profile.restDefault) === s, fn: () => { e.rest = s; save(); } })) }), 0) },
        ...(ei < list.length - 1 ? [{ label: e.ss ? 'Sciogli superserie' : 'Superserie con il successivo', ic: 'link', fn: () => { e.ss = !e.ss; save(); } }] : []),
        ...(ei > 0 ? [{ label: 'Sposta su', ic: 'up', fn: () => { list.splice(ei - 1, 0, list.splice(ei, 1)[0]); save(); } }] : []),
        ...(ei < list.length - 1 ? [{ label: 'Sposta giù', ic: 'down', fn: () => { list.splice(ei + 1, 0, list.splice(ei, 1)[0]); save(); } }] : []),
        { label: 'Consiglia simile', desc: 'Esercizi con gli stessi muscoli e lo stesso movimento', ic: 'sparkle', fn: () => setTimeout(() => pushLayer({ type: 'picker', mode: 'replace', target: 'workout', ei, ref: e.id, q: '', g: 'similar', eq: '', sel: [] }), 0) },
        { label: 'Sostituisci esercizio', ic: 'swap', fn: () => setTimeout(() => pushLayer({ type: 'picker', mode: 'replace', target: 'workout', ei, ref: e.id, q: '', g: '', eq: '', sel: [] }), 0) },
        { label: 'Rimuovi esercizio', ic: 'trash', danger: true, fn: () => { list.splice(ei, 1); if (ei > 0 && list[ei - 1] && ei - 1 === list.length - 1) list[ei - 1].ss = false; save(); } },
      ]
    });
  },
  applyLive(el) {
    const e = S.active.ex[+el.dataset.ei], lv = liveAdvice(e); if (!lv || lv.kg == null) return;
    e.sets.forEach(s => { if (!s.done && isWork(s) && !s.bpct && !s.rm) s.kg = lv.kg; }); save(); renderLayers(); toast(`Prossime serie: ${fmtKg(lv.kg)} kg`);
  },
  applySugg(el) {
    const e = S.active.ex[+el.dataset.ei], sg = suggestion(e, S.active.id);
    if (!sg || sg.kg == null) return;
    e.sets.forEach(s => { if (!s.done && isWork(s)) { s.kg = sg.kg; } }); save(); renderLayers(); toast(`Carico impostato: ${fmtKg(sg.kg)} kg`);
  },
  pickForWorkout() { pushLayer({ type: 'picker', mode: 'add', target: 'workout', q: '', g: S.workouts.length ? 'recent' : '', eq: '', sel: [] }); },
  /* picker */
  openLibrary() { pushLayer({ type: 'picker', mode: 'browse', q: '', g: '', eq: '', sel: [] }); },
  pickGroup(el) { const l = topLayer(); l.g = el.dataset.g; refreshPicker(true); },
  pickEx(el) {
    const l = topLayer(), id = el.dataset.id;
    if (l.mode === 'browse') return pushLayer({ type: 'exercise', id });
    if (l.mode === 'replace') {
      if (l.target === 'workout') {
        const e = S.active.ex[l.ei], old = JSON.parse(JSON.stringify(e));
        e.id = id; e.mt = exType(id); e.sets.forEach(s => { if (!s.done) { s.kg = null; s.r = null; } }); save();
        UI.undo = () => { if (S.active && S.active.ex[l.ei] === e) { Object.keys(e).forEach(k => delete e[k]); Object.assign(e, old); save(); renderLayers(); } };
        popLayer(); toast(`Sostituito con ${esc(ex(id).n)} <button class="link" data-a="undo">Annulla</button>`); return;
      }
      if (l.target === 'routine') {
        const rl = UI.layers.find(x => x.type === 'routine'), re = rl && rl.draft.ex[l.ei]; if (!re) { popLayer(); return; }
        const oldId = re.id; re.id = id;
        UI.undo = () => { if (rl.draft.ex[l.ei] === re) { re.id = oldId; renderLayers(); } };
        popLayer(); toast(`Sostituito con ${esc(ex(id).n)} <button class="link" data-a="undo">Annulla</button>`); return;
      }
      if (l.target === 'import') { const il = UI.layers.find(x => x.type === 'import'); if (il && il.res) { const e = il.res.days[l.di].ex[l.ei]; e.id = id; e.conf = 1; } }
      popLayer(); return;
    }
    const k = l.sel.indexOf(id); k >= 0 ? l.sel.splice(k, 1) : l.sel.push(id);
    refreshPicker(false);
  },
  pickDone() {
    const l = topLayer();
    if (l.target === 'workout' && S.active) {
      for (const id of l.sel) {
        const last = lastSession(id, S.active.id);
        const n = last ? Math.max(1, workSets(last.e).length) : 3;
        S.active.ex.push({ id, mt: exType(id), tags: [], rmin: 8, rmax: 12, rir: 2, rest: S.profile.restDefault, ss: false, note: '', sets: [...Array(n)].map(() => ({ t: 'n', kg: null, r: null, rir: null, done: false })) });
      }
      save();
    } else if (l.target === 'wizard') {
      const wl = UI.layers.find(x => x.type === 'wizard'); if (wl) { wl.a.avoid = [...new Set([...wl.a.avoid, ...l.sel])]; wl.res = null; }
    } else if (l.target === 'routine') {
      const rl = UI.layers.find(x => x.type === 'routine');
      for (const id of l.sel) { const x = ex(id); const iso = x.k === 'isolation'; rl.draft.ex.push({ id, sets: 3, rmin: iso ? 10 : 6, rmax: iso ? 10 : 6, rest: iso ? 75 : 150, ss: false, plan: [...Array(3)].map(() => ({ t: 'n', a: iso ? 10 : 6, b: null })) }); }
    }
    popLayer();
  },
  newEx() { const l = topLayer(); pushLayer({ type: 'newEx', name: l && l.type === 'picker' ? l.q : '' }); },
  saveNewEx() {
    const n = $('#nx-n').value.trim(); if (!n) { toast('Dai un nome all\'esercizio'); return; }
    const x = { id: 'c_' + uid(), n, p: [$('#nx-m').value], s: [], e: $('#nx-e').value, c: $('#nx-c').value, k: '', l: '', i: '', img: 0, a: '' };
    S.customEx.push(x); save(); popLayer();
    const l = topLayer();
    if (l && l.type === 'picker') { if (l.mode === 'add' || l.mode === 'routine') l.sel.push(x.id); l.q = ''; l.g = ''; renderLayers(); }
    toast('Esercizio creato');
  },
  deleteCustomEx(el) {
    const id = el.dataset.id;
    pushLayer({ type: 'confirm', title: 'Eliminare l\'esercizio?', text: 'Lo storico resta, ma l\'esercizio non sarà più nella libreria.', ok: 'Elimina', danger: true, fn: () => { S.customEx = S.customEx.filter(x => x.id !== id); save(); UI.layers.pop(); } });
  },
  openEx(el) { pushLayer({ type: 'exercise', id: el.dataset.id }); },
  /* routines */
  newRoutine() { pushLayer({ type: 'routine', isNew: true, draft: { id: uid(), name: '', note: '', ex: [] } }); },
  routineMenu(el) {
    const r = S.routines.find(r => r.id === el.dataset.id);
    pushLayer({
      type: 'sheet', title: r.name, items: [
        { label: 'Avvia', ic: 'play', fn: () => guardStart(() => startWorkout(r)) },
        { label: 'Modifica', ic: 'edit', fn: () => setTimeout(() => pushLayer({ type: 'routine', draft: JSON.parse(JSON.stringify(r)) }), 0) },
        { label: 'Duplica', ic: 'copy', fn: () => { const c = JSON.parse(JSON.stringify(r)); c.id = uid(); c.name += ' (copia)'; S.routines.splice(S.routines.indexOf(r) + 1, 0, c); save(); } },
        { label: 'Sposta in cartella', desc: folderOf(r) ? 'Ora in: ' + folderOf(r).name : 'Ora fuori dalle cartelle', ic: 'layers', fn: () => setTimeout(() => moveRoutineSheet(r), 0) },
        ...(S.routines.indexOf(r) > 0 ? [{ label: 'Sposta su', ic: 'up', fn: () => { const i = S.routines.indexOf(r); S.routines.splice(i - 1, 0, S.routines.splice(i, 1)[0]); save(); } }] : []),
        { label: 'Elimina', ic: 'trash', danger: true, fn: () => setTimeout(() => pushLayer({ type: 'confirm', title: 'Eliminare la scheda?', text: `“${r.name}” verrà eliminata. Lo storico degli allenamenti resta.`, ok: 'Elimina', danger: true, fn: () => { S.routines = S.routines.filter(x => x !== r); save(); } }), 0) },
      ]
    });
  },
  pickForRoutine() { pushLayer({ type: 'picker', mode: 'routine', target: 'routine', q: '', g: '', eq: '', sel: [] }); },
  rtMove(el) { const r = topLayer().draft, i = +el.dataset.ei, j = i + +el.dataset.d; if (j < 0 || j >= r.ex.length) return; r.ex.splice(j, 0, r.ex.splice(i, 1)[0]); renderLayers(); },
  rtRemove(el) { const r = topLayer().draft; r.ex.splice(+el.dataset.ei, 1); if (r.ex.length) r.ex[r.ex.length - 1].ss = false; renderLayers(); },
  rtSS(el) { const e = topLayer().draft.ex[+el.dataset.ei]; e.ss = !e.ss; renderLayers(); },
  rtSetPct(el) {
    const e = topLayer().draft.ex[+el.dataset.ei], si = +el.dataset.si, k = el.dataset.k, v = el.dataset.v === '' ? null : +el.dataset.v;
    if (k === 'pct') { for (let j = si; j < e.plan.length; j++) if (j === si || e.plan[j].t === 'bo') e.plan[j].pct = v ?? undefined; }
    else e.plan[si].rm = v ?? undefined;
    popLayer();
  },
  rtWarm(el) { const e = topLayer().draft.ex[+el.dataset.ei]; e.warm = !e.warm; renderLayers(); },
  rtAddSet(el) { const e = topLayer().draft.ex[+el.dataset.ei], last = e.plan[e.plan.length - 1]; if (e.plan.length >= 20) return; e.plan.push({ ...(last || { a: 8, b: 12 }), t: last && last.t !== 'w' ? last.t : 'n' }); renderLayers(); },
  rtDelSet(el) { const e = topLayer().draft.ex[+el.dataset.ei]; if (e.plan.length > 1) e.plan.splice(+el.dataset.si, 1); renderLayers(); },
  rtSetType(el) {
    const e = topLayer().draft.ex[+el.dataset.ei], si = +el.dataset.si, p = e.plan[si];
    /* back-off goes down to the normal sets below; other types change only this row */
    const chips = (k, vals, cur, lab) => `<div class="lbl" style="margin-top:4px">${lab}</div><div class="chips" style="margin:6px 0 10px;padding:0;flex-wrap:wrap">${vals.map(v => `<button class="chip ${cur === v ? 'on' : ''}" data-a="rtSetPct" data-k="${k}" data-v="${v ?? ''}" data-ei="${el.dataset.ei}" data-si="${si}">${v == null ? 'libero' : k === 'pct' ? v + '%' : v + '%'}</button>`).join('')}</div>`;
    const html = (p.t === 'bo' ? chips('pct', [null, -10, -15, -20, -25], p.pct ?? null, 'Peso del back-off rispetto al top set') : '') + (exType(e.id) === 'wr' ? chips('rm', [null, 60, 65, 70, 75, 80, 85, 90, 95], p.rm ?? null, '% del massimale (1RM)') : '');
    pushLayer({ type: 'sheet', title: 'Tipo di serie', html, items: Object.entries(SET_TYPES).map(([k, v]) => ({ label: v.l, desc: v.d, on: (p.t || 'n') === k, fn: () => { p.t = k; if (k === 'bo') for (let j = si + 1; j < e.plan.length; j++) if ((e.plan[j].t || 'n') === 'n') e.plan[j].t = 'bo'; } })) });
  },
  saveRoutine() {
    const l = topLayer(), r = l.draft;
    if (!r.name.trim()) r.name = 'Scheda ' + (S.routines.length + 1);
    if (!r.ex.length) { toast('Aggiungi almeno un esercizio'); return; }
    r.ex.forEach(e => {
      e.plan = planOf(e).map(p => { const a = p.a != null ? clamp(Math.round(p.a), 1, 100) : null; let b = p.b != null ? clamp(Math.round(p.b), 1, 100) : null; const x = { t: p.t || 'n', a, b }; if (a == null && b != null) { x.a = b; x.b = null; } if (b != null && a != null && b <= a) x.b = null; if (p.pct && p.t === 'bo') x.pct = p.pct; if (p.rm) x.rm = p.rm; return x; });
      const w = e.plan.filter(p => p.t !== 'w'), w0 = w[0] || e.plan[0];
      e.sets = w.length || e.plan.length; e.rmin = w0.a ?? 8; e.rmax = w0.b ?? w0.a ?? 12; delete e.rir; e.rest = +e.rest || 120;
    });
    const i = S.routines.findIndex(x => x.id === r.id);
    if (i >= 0) S.routines[i] = r; else S.routines.push(r);
    save(); popLayer(); render(); toast('Scheda salvata');
  },
  addProgram(el) {
    const p = PROGRAMS.find(x => x.id === el.dataset.id);
    const f = { id: uid(), name: p.name, img: null, c: FOLDER_COLORS[folders().length % FOLDER_COLORS.length] }; folders().push(f);
    S.routines.push(...p.routines.map(t => ({ ...routineFromTemplate(t), fid: f.id }))); UI.fopen = UI.fopen || {}; UI.fopen[f.id] = true;
    save(); render(); toast(`${p.routines.length} schede aggiunte nella cartella “${p.name}”`);
  },
  /* history */
  openHist(el) { pushLayer({ type: 'history', id: el.dataset.id }); },
  histMenu(el) {
    const w = S.workouts.find(x => x.id === el.dataset.id);
    pushLayer({ type: 'sheet', title: w.name, items: [{ label: 'Modifica', desc: 'Data, durata, esercizi, serie e pesi', ic: 'edit', fn: () => setTimeout(() => editWorkout(w), 0) }, { label: 'Elimina allenamento', ic: 'trash', danger: true, fn: () => setTimeout(() => pushLayer({ type: 'confirm', title: 'Eliminare l\'allenamento?', text: 'Record e statistiche verranno ricalcolati.', ok: 'Elimina', danger: true, fn: () => { S.workouts = S.workouts.filter(x => x !== w); save(); UI.layers = UI.layers.filter(l => l.type !== 'history'); render(); } }), 0) }] });
  },
  repeatWorkout(el) { const w = S.workouts.find(x => x.id === el.dataset.id); guardStart(() => startWorkout(null, w)); },
  saveAsRoutine(el) {
    const w = S.workouts.find(x => x.id === el.dataset.id);
    S.routines.push({ id: uid(), name: w.name, note: '', ex: w.ex.map(e => ({ id: e.id, sets: e.sets.filter(isWork).length || 3, rmin: 8, rmax: 12, rest: 120, ss: false, tags: e.tags ? [...e.tags] : undefined, plan: e.sets.map(s => ({ t: s.t || 'n', a: s.r || 8, b: null })) })) });
    save(); toast('Scheda creata in Allenamento');
  },
  /* sheets */
  sheetPick(el) { const l = topLayer(); const it = l.items[+el.dataset.k]; UI.layers.pop(); it.fn && it.fn(); renderLayers(); if (!UI.layers.length) render(); },
  confirmOk() { const l = topLayer(); UI.layers.pop(); l.fn && l.fn(); renderLayers(); render(); },
  /* rest */
  restAdj(el) { if (!S.active?.restEnd) return; S.active.restEnd += +el.dataset.d * 1000; S.active.restTotal = Math.max(5, S.active.restTotal + +el.dataset.d); save(); updateRestBar(); restAudioStart(); },
  restSkip() { if (S.active) { S.active.restEnd = 0; S.active.restBeeped = true; save(); updateRestBar(); } restAudioStop(); },
  /* data */
  exportData() { exportData(); },
  addDemo() { S.workouts.push(...makeDemo()); makeDietDemo(); makeBodyDemo(); makeRunDemo(); save(); render(); toast('Dati di esempio caricati'); },
  removeDemo() { S.workouts = S.workouts.filter(w => !w.demo); removeDietDemo(); removeBodyDemo(); removeRunDemo(); save(); render(); toast('Dati di esempio rimossi'); },
  resetAll() {
    pushLayer({ type: 'sheet', title: 'Eliminare tutti i dati?', html: `<p class="muted small" style="margin:0 0 10px">Verranno eliminati allenamenti, schede, diario alimentare, peso e misure, foto, cibi creati, obiettivi e impostazioni${SYNC.user ? ', <b>anche dall\'account online</b>' : ''}. Se vuoi tenerli, esporta prima un backup.</p><div class="field"><label for="del-confirm">Per confermare scrivi <b>ELIMINA</b></label><input id="del-confirm" class="input" autocomplete="off" autocapitalize="characters" maxlength="10"></div><div class="row" style="margin-top:12px"><button class="btn grow" data-a="exportData">${icon('download', 16)} Backup</button><button class="btn danger grow" data-a="resetConfirm">Elimina tutto</button></div>`, items: [] });
  },
  resetConfirm() {
    if (($('#del-confirm')?.value || '').trim().toUpperCase() !== 'ELIMINA') { toast('Scrivi ELIMINA per confermare'); return; }
    S = defaultState(); try { localStorage.removeItem(KEY); } catch (e) { } phTx('readwrite', st => st.clear()).catch(() => { }); PH.list = null; save(); applyLang(); UI.tab = 'home'; UI.layers = []; render(); toast('Tutti i dati sono stati eliminati');
  },
  exLang(el) { S.profile.exLang = el.dataset.v; save(); applyExLang(); render(); },
  setLang(el) { S.profile.lang = el.dataset.v; S.profile.langSet = true; save(); applyLang(); render(); renderLayers(); },
  pnoteToggle(el) { const e = S.active.ex[+el.dataset.ei]; e.pnoteOpen = !e.pnoteOpen; renderLayers(); },
  progToggle() { UI.progOpen = !UI.progOpen; render(); },
  msWeek(el) { UI.msPrev = el.dataset.v === '1'; render(); },
};

function refreshPicker(full) {
  const l = topLayer();
  if (full) { renderLayers(); return; }
  const list = $('#pk-list'); if (list) list.innerHTML = pickerList(l);
  const btn = document.querySelector('[data-a="pickDone"]');
  if (btn) { btn.disabled = !l.sel.length; btn.textContent = 'Aggiungi' + (l.sel.length ? ' (' + l.sel.length + ')' : ''); }
}

document.addEventListener('click', ev => {
  const el = ev.target.closest('[data-a]');
  if (!el) return;
  const fn = A[el.dataset.a];
  if (!fn) return;
  if (el.dataset.a === 'backdrop' && ev.target !== el) return;
  ev.preventDefault();
  fn(el, ev);
});
document.addEventListener('touchend', unlockAudio, { once: true, passive: true });

/* ---------- input limits (runs first, in capture phase) ---------- */
document.addEventListener('input', ev => {
  const el = ev.target; if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
  const im = el.inputMode;
  if (im === 'numeric' || im === 'decimal') {
    const maxLen = +(el.dataset.maxlen || 6);
    let v = el.value.replace(im === 'numeric' ? /[^0-9]/g : /[^0-9.,]/g, '');
    const sep = v.search(/[.,]/); if (sep >= 0) v = v.slice(0, sep + 1) + v.slice(sep + 1).replace(/[.,]/g, '').slice(0, 2);
    if (v.length > maxLen) v = v.slice(0, maxLen);
    const mx = el.dataset.max != null ? +el.dataset.max : null;
    if (mx != null && num(v) > mx) v = String(mx);
    if (v !== el.value) el.value = v;
  } else if (el.type !== 'password' && !el.dataset.free && el.value.length > (el.maxLength > 0 ? el.maxLength : el.tagName === 'TEXTAREA' ? 400 : 80)) {
    el.value = el.value.slice(0, el.maxLength > 0 ? el.maxLength : el.tagName === 'TEXTAREA' ? 400 : 80);
  }
}, true);

/* ---------- input bindings ---------- */
let pickerTimer = null;
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.in;
  if (!k) return;
  if (k === 'profile') { const f = el.dataset.f; S.profile[f] = f === 'restDefault' ? +el.value : el.value; save(); return; }
  if (k === 'set') {
    const s = S.active.ex[+el.dataset.ei].sets[+el.dataset.si];
    const v = num(el.value);
    s[el.dataset.f] = ['kg', 'km', 'min'].includes(el.dataset.f) ? v : v == null ? null : Math.round(v);
    save(); return;
  }
  if (k === 'woName') { S.active.name = el.value; save(); return; }
  if (k === 'exNote') { S.active.ex[+el.dataset.ei].note = el.value; save(); return; }
  if (k === 'exFixedNote') { const v = el.value.trim(); if (v) S.exNotes[el.dataset.id] = v; else delete S.exNotes[el.dataset.id]; save(); return; }
  if (k === 'soundKind') { A.soundKind(el); return; }
  if (k === 'pickerQ') { const l = topLayer(); l.q = el.value; clearTimeout(pickerTimer); pickerTimer = setTimeout(() => refreshPicker(false), 90); return; }
  if (k === 'pickerEq') { topLayer().eq = el.value; refreshPicker(false); return; }
  if (k === 'rtName') { topLayer().draft.name = el.value; return; }
  if (k === 'rtNote') { topLayer().draft.note = el.value; return; }
  if (k === 'exRM') { const v = num(el.value); S.rm = S.rm || {}; if (v && v > 0) S.rm[el.dataset.id] = v; else delete S.rm[el.dataset.id]; save(); return; }
  if (k === 'rtExNote') { const e = topLayer().draft.ex[+el.dataset.ei]; e.note = el.value.trim() || undefined; return; }
  if (k === 'rtSet') {
    /* cascade: the edited row and every row below take the value, rows above stay */
    const e = topLayer().draft.ex[+el.dataset.ei], si = +el.dataset.si, f = el.dataset.f, v = num(el.value);
    const val = v == null ? null : Math.round(v);
    for (let j = si; j < e.plan.length; j++) {
      e.plan[j][f] = val;
      if (j > si) { const inp = document.querySelector(`input[data-in="rtSet"][data-ei="${el.dataset.ei}"][data-si="${j}"][data-f="${f}"]`); if (inp) inp.value = val ?? ''; }
    }
    return;
  }
  if (k === 'rtEx') { const e = topLayer().draft.ex[+el.dataset.ei]; e[el.dataset.f] = el.dataset.f === 'rest' ? +el.value : el.value; return; }
});
document.addEventListener('submit', ev => {
  if (ev.target.dataset.form !== 'tagNew') return;
  ev.preventDefault();
  const v = ($('#tag-new').value || '').trim().slice(0, 30); if (!v) return;
  S.customTags = [...new Set([...(S.customTags || []), v])];
  const l = topLayer(); const list = l.get(); if (!list.includes(v)) list.push(v); l.done(); save(); renderLayers();
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.in === 'exMT') { S.exType = S.exType || {}; S.exType[el.dataset.id] = el.value; if (S.active) S.active.ex.forEach(e => { if (e.id === el.dataset.id && !e.sets.some(s => s.done)) e.mt = el.value; }); save(); CACHE.k = null; renderLayers(); }
  if (el.id === 'importFile' && el.files[0]) { importData(el.files[0]); el.value = ''; }
  if (el.dataset.in === 'pickerEq') { topLayer().eq = el.value; refreshPicker(false); }
  if (el.dataset.in === 'rtEx' && el.tagName === 'SELECT') { const e = topLayer().draft.ex[+el.dataset.ei]; e.rest = +el.value; }
  if (el.dataset.in === 'rtProg') { const e = topLayer().draft.ex[+el.dataset.ei]; if (el.value === 'double') delete e.prog; else e.prog = el.value; }
  if (el.dataset.in === 'profile' && el.tagName === 'SELECT') { S.profile.restDefault = +el.value; save(); }
});
/* Enter on kg → reps → RIR → tick */
document.addEventListener('keydown', ev => {
  if (ev.key !== 'Enter') return;
  const el = ev.target; if (el.dataset?.in !== 'set') return;
  ev.preventDefault();
  const row = el.closest('.set-row'); const ins = [...row.querySelectorAll('input')]; const i = ins.indexOf(el);
  if (i < ins.length - 1) ins[i + 1].focus(); else { el.blur(); row.querySelector('.chk').click(); }
});

