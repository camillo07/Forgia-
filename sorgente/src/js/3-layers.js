/* =========================================================
   LAYERS (full-screen views and bottom sheets)
   ========================================================= */
function pushLayer(l) { UI.layers.push(l); renderLayers(); }
function popLayer() { UI.layers.pop(); renderLayers(); }
function topLayer() { return UI.layers[UI.layers.length - 1]; }
function closeLayersOfType(t) { UI.layers = UI.layers.filter(l => l.type !== t); }

let LID = 0;
function renderLayers() {
  const host = $('#layers');
  // remember scroll positions
  host.querySelectorAll('[data-scroll-key]').forEach(el => { UI.scroll[el.dataset.scrollKey] = el.scrollTop; });
  const prevTop = host.lastElementChild;
  UI.layers.forEach(l => { if (!l._lid) l._lid = ++LID; });
  const ghost = prevTop && prevTop.dataset.lid && !UI.layers.some(l => String(l._lid) === prevTop.dataset.lid) && !UI.noGhost && motionOK() ? prevTop : null;
  UI.noGhost = false;
  host.innerHTML = UI.layers.map((l, i) => {
    const html = LAYER_RENDER[l.type](l, i);
    const still = l.shown ? ' still' : '';
    l.shown = true;
    return html.replace('class="layer', `data-lid="${l._lid}" data-t="${l.type}" class="layer` + still);
  }).join('');
  if (ghost) layerGhost(ghost);
  host.querySelectorAll('[data-scroll-key]').forEach(el => { const v = UI.scroll[el.dataset.scrollKey]; if (v) el.scrollTop = v; });
  document.body.style.overflow = UI.layers.length ? 'hidden' : '';
  updateRestBar();
  if (typeof mapsAfterRender === 'function') mapsAfterRender();
  if (typeof anatAfterRender === 'function') anatAfterRender();
  if (typeof exfAfterRender === 'function') exfAfterRender();
  if (typeof chatAfterRender === 'function') chatAfterRender();
}

const LAYER_RENDER = {
  workout: layerWorkout,
  picker: layerPicker,
  exercise: layerExercise,
  routine: layerRoutine,
  history: layerHistory,
  summary: layerSummary,
  sheet: layerSheet,
  confirm: layerConfirm,
  newEx: layerNewEx,
  tags: layerTags,
};

function head(title, left = 'back', right = '') {
  return `<div class="layer-head"><button class="icon-btn" data-a="${left === 'down' ? 'minimize' : 'pop'}" aria-label="${left === 'down' ? 'Riduci' : 'Indietro'}">${icon(left === 'down' ? 'down' : left === 'x' ? 'x' : 'back')}</button><h2>${title}</h2>${right}</div>`;
}

/* ---------- active workout ---------- */
function startWorkout(fromRoutine, fromWorkout, opts = {}) {
  const now = Date.now();
  const w = { id: uid(), name: 'Allenamento libero', rid: null, start: now, ex: [], note: '', restEnd: 0, restTotal: 0 };
  if (fromRoutine) {
    w.name = fromRoutine.name; w.rid = fromRoutine.id;
    const dl = deloadOn();
    w.ex = fromRoutine.ex.map(e => {
      let plan = planOf(e); const w0 = plan.find(p => p.t !== 'w') || plan[0];
      plan = plan.map((p, i) => ({ ...p, pi: i }));
      if (dl) { const warm = plan.filter(p => p.t === 'w'), work = plan.filter(p => p.t !== 'w'); plan = [...warm, ...work.slice(0, Math.max(1, Math.ceil(work.length * 0.6)))]; }
      if (opts.light) { const warm = plan.filter(p => p.t === 'w'), work = plan.filter(p => p.t !== 'w'); if (work.length > 1) plan = [...warm, ...work.slice(0, work.length - 1)]; }
      const aex = { src: fromRoutine.ex.indexOf(e), id: e.id, mt: exType(e.id), tags: e.tags ? [...e.tags] : [], rmin: w0.a, rmax: w0.b ?? w0.a, rir: e.rir, rest: e.rest, ss: !!e.ss, note: '', pnote: e.note || undefined, prog: e.prog || undefined, sets: plan.map(p => ({ t: p.t || 'n', kg: p.kg ?? null, r: null, rir: null, ta: p.a ?? null, tb: p.b ?? null, bpct: p.pct ?? undefined, rm: p.rm ?? undefined, pi: p.pi, done: false })) };
      if (e.warm) addWarmup(aex, w.id, true);
      return aex;
    });
  } else if (fromWorkout) {
    w.name = fromWorkout.name; w.rid = fromWorkout.rid;
    w.ex = fromWorkout.ex.map(e => ({ id: e.id, mt: e.mt || exType(e.id), tags: e.tags ? [...e.tags] : [], rmin: 8, rmax: 12, rir: 2, rest: S.profile.restDefault, ss: false, note: '', sets: e.sets.map(s => ({ t: s.t, kg: null, r: null, rir: null, done: false })) }));
  }
  if (opts.light) w.light = true;
  S.active = w; save();
  closeLayersOfType('workout');
  pushLayer({ type: 'workout' });
  requestWake();
}
function guardStart(fn) {
  if (!S.active) return fn();
  pushLayer({
    type: 'sheet', title: 'Hai un allenamento in corso', items: [
      { label: 'Riprendi quello in corso', ic: 'play', fn: () => openWorkout() },
      { label: 'Scartalo e inizia il nuovo', ic: 'trash', danger: true, fn: () => { S.active = null; save(); fn(); } },
    ]
  });
}
function openWorkout() { closeLayersOfType('workout'); pushLayer({ type: 'workout' }); requestWake(); }

function ssGroups(list) {
  // returns array of letters (or '') per exercise index for superset chains
  const out = list.map(() => ''); let letter = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].ss && i + 1 < list.length && !out[i]) {
      const L = String.fromCharCode(65 + letter++);
      let j = i; out[j] = L;
      while (list[j].ss && j + 1 < list.length) { j++; out[j] = L; }
    }
  }
  return out;
}

function layerWorkout() {
  const w = S.active;
  if (!w) return '';
  const done = w.ex.reduce((a, e) => a + e.sets.filter(s => s.done && isWork(s)).length, 0);
  const vol = w.ex.reduce((a, e) => a + e.sets.filter(s => s.done && isWork(s)).reduce((b, s) => b + (s.kg || 0) * (s.r || 0), 0), 0);
  const groups = ssGroups(w.ex);
  const cards = w.ex.map((e, ei) => exerciseCard(e, ei, groups[ei])).join('');
  return `<div class="layer" role="dialog" aria-label="Allenamento in corso">
    <div class="layer-head"><button class="icon-btn" data-a="minimize" aria-label="Riduci">${icon('down')}</button>
      <div class="grow" style="min-width:0"><input class="input" maxlength="40" data-in="woName" value="${esc(w.name)}" aria-label="Nome allenamento" style="min-height:34px;padding:2px 8px;background:transparent;font-family:var(--font-display);font-weight:700;font-size:21px;text-transform:uppercase;letter-spacing:.03em">${w.past ? `<div class="wo-timer" style="padding-left:8px;color:var(--steel)">${w.editId ? 'Modifica' : 'Passato'} · ${fmtDate(w.start)}</div>` : `<div class="wo-timer" id="wo-clock" style="padding-left:8px">${fmtClock(Date.now() - w.start)}</div>`}</div>
      <button class="btn primary sm" data-a="finishWorkout">${w.past ? 'Salva' : 'Fine'}</button></div>
    <div class="layer-body" data-scroll-key="workout"><div class="layer-inner">
      ${w.past ? pastWhenCard(w) : ''}
      ${typeof lightOfferHTML === 'function' ? lightOfferHTML(w) : ''}
      ${w.light ? `<div class="card tight light-card">${icon('heart', 18)}<div class="grow small"><b>Versione leggera</b> · recupero basso: una serie in meno per esercizio e 1 ripetizione di margine in più del solito. La scheda non cambia.</div></div>` : ''}
      <div class="wo-stats"><div><b id="wo-sets">${done}</b><span>Serie fatte</span></div><div><b>${fmtTon(vol)}</b><span>Volume</span></div><div><b>${w.ex.length}</b><span>Esercizi</span></div></div>
      ${cards || `<div class="empty card">${icon('dumbbell', 34)}<b>Nessun esercizio</b><span class="small">Aggiungi il primo esercizio per iniziare.</span></div>`}
      <button class="btn block" data-a="pickForWorkout">${icon('plus', 18)} Aggiungi esercizio</button>
      <button class="btn ghost block" data-a="cancelWorkout" style="color:var(--bad)">${w.editId ? 'Annulla le modifiche' : 'Annulla allenamento'}</button>
    </div></div></div>`;
}

const RIR_TAGS = ['RIR 0 (cedimento)', 'RIR 1', 'RIR 2', 'RIR 3'];
const TECH_TAGS = [...RIR_TAGS, 'Eccentrica 3 s', 'Eccentrica 4–5 s', 'Fermo 1–2 s', 'Esplosivo in salita', 'Parziali in allungamento', 'ROM completo', 'Unilaterale', 'Presa larga', 'Presa stretta', 'Con cintura', 'Con fasce'];
function tagChips(e, ei, editable) {
  const tags = e.tags || [];
  if (!tags.length && !editable) return '';
  return `<div class="tags">${tags.map(t => `<span class="chip steel tag">${esc(t)}</span>`).join('')}${editable ? `<button class="chip tag" data-a="${editable}" data-ei="${ei}">${icon(tags.length ? 'edit' : 'plus', 12)} ${tags.length ? '' : 'Esecuzione'}</button>` : ''}</div>`;
}
function setInput(f, e, s, ei, si, ph, last) {
  const cfg = { kg: ['decimal', 1000, 'Chili'], r: ['numeric', 300, 'Ripetizioni'], rir: ['numeric', 10, 'RIR'], sec: ['numeric', 3600, 'Secondi'], km: ['decimal', 300, 'Chilometri'], min: ['decimal', 600, 'Minuti'] }[f];
  const val = s[f] == null ? '' : (cfg[0] === 'decimal' ? fmtKg(s[f]) : s[f]);
  return `<input inputmode="${cfg[0]}" enterkeyhint="${last ? 'done' : 'next'}" data-in="set" data-ei="${ei}" data-si="${si}" data-f="${f}" data-max="${cfg[1]}" value="${val}" placeholder="${ph ?? ''}" aria-label="${cfg[2]}">`;
}
function exerciseCard(e, ei, ss) {
  const x = ex(e.id), mt = mtOf(e);
  const last = lastSession(e.id, S.active.id);
  const prev = last ? last.e.sets : [];
  const sg0 = deloadAdj(suggestion(e, S.active.id), e), live = liveAdvice(e), sg = live || sg0;
  const anyDone = e.sets.some(s => s.done);
  let wi = 0, wu = 0;
  const prevWork = prev.filter(isWork), prevWarm = prev.filter(s => !isWork(s));
  const ro = rirOn(e) && mt !== 'dist';
  const fields = (mt === 'time' ? ['kg', 'sec'] : mt === 'dist' ? ['km', 'min'] : ['kg', 'r']).concat(ro ? ['rir'] : []);
  const cols = MT[mt].cols.slice(0, 2).concat(ro ? ['RIR'] : []);
  const rows = e.sets.map((s, si) => {
    const work = isWork(s);
    const label = s.t === 'n' ? wi + 1 : SET_TYPES[s.t].s;
    const p = work ? prevWork[wi++] : prevWarm[wu++];
    const ph = {
      kg: planKg(e, s) != null ? fmtKg(planKg(e, s)) : work && !s.done && live && live.kg != null ? fmtKg(live.kg) : work && sg0 && sg0.kg != null && sg0.kind !== 'new' ? fmtKg(sg0.kg) : p && p.kg != null ? fmtKg(p.kg) : (mt === 'wr' ? 'kg' : mt === 'bw' ? '0' : ''),
      r: s.ta != null ? repTxt(s.ta, s.tb) : work && sg0 && sg0.r ? sg0.r : p ? p.r : (e.rmax || ''),
      rir: work ? rirTarget(e) : '',
      sec: work && sg && sg.sec ? sg.sec : p ? p.sec : '',
      km: p && p.km ? fmtN(p.km, 2) : '', min: p && p.min ? fmtN(p.min, 1) : '',
    };
    return `<div class="set-row c${fields.length} ${s.done ? 'done' : ''}">
      <button class="ty ${s.t}" data-a="setMenu" data-ei="${ei}" data-si="${si}" aria-label="Tipo serie">${label}</button>
      <span class="prev">${p ? fmtSet(p, mt) : '–'}${s.pr ? ` <span class="pr-flag">${icon('trophy', 12)}</span>` : ''}</span>
      ${fields.map((f, k) => setInput(f, e, s, ei, si, ph[f], k === fields.length - 1)).join('')}
      <button class="chk" data-a="toggleSet" data-ei="${ei}" data-si="${si}" aria-label="Serie completata">${icon('check', 20, 3)}</button>
    </div>`;
  }).join('');
  const showNote = e.noteOpen || e.note || S.exNotes[e.id];
  const tg = e.sets.filter(s => s.ta != null), tt = [...new Set(tg.map(s => repTxt(s.ta, s.tb)))];
  const sub = mt === 'wr' || mt === 'bw' ? (tg.length ? (tt.length === 1 ? tt[0] + ' reps · ' : 'reps per serie · ') : e.rmin ? `${repTxt(e.rmin, e.rmax)} reps · ` : '') : MT[mt].l + ' · ';
  const nDone = e.sets.filter(s => s.done).length, allDone = nDone === e.sets.length && nDone > 0;
  const headHTML = `<div class="exc-head" data-lp="wo"><button class="icon-btn drag-h" data-drag="wo" aria-label="Trascina per spostare">${icon('grip', 18)}</button>${thumbHTML(x)}<button class="name grow" data-a="openEx" data-id="${esc(e.id)}">${esc(x.n)}<div class="small muted" style="font-weight:500">${e.col ? `${nDone}/${e.sets.length} serie${allDone ? ' ✓' : ''}` : `${sub}rec. ${fmtClock((e.rest || S.profile.restDefault) * 1000)}`}</div></button><button class="icon-btn" data-a="exCollapse" data-ei="${ei}" aria-label="${e.col ? 'Apri' : 'Chiudi'}">${icon(e.col ? 'down' : 'up', 18)}</button><button class="icon-btn" data-a="exMenu" data-ei="${ei}" aria-label="Opzioni esercizio">${icon('more')}</button></div>`;
  if (e.col) return `<div class="exc collapsed ${ss ? 'ss' : ''} ${allDone ? 'alldone' : ''}" data-drag-item>${ss ? `<div class="ss-tag">Superserie ${ss}</div>` : ''}${headHTML}${typeof vsLastHTML === 'function' ? vsLastHTML(e) : ''}${nDone ? `<div class="small muted tnum" style="padding-left:4px">${e.sets.filter(s => s.done).map(s => fmtSet(s, mt)).join(' · ')}</div>` : ''}</div>`;
  return `<div class="exc ${ss ? 'ss' : ''}" data-drag-item>
    ${ss ? `<div class="ss-tag">Superserie ${ss}</div>` : ''}
    ${headHTML}
    ${typeof vsLastHTML === 'function' ? vsLastHTML(e) : ''}
    ${tagChips(e, ei, 'woTags')}
    ${e.pnote ? `<button class="pnote small ${e.pnoteOpen ? 'open' : ''}" data-a="pnoteToggle" data-ei="${ei}">${icon('layers', 14)} ${esc(e.pnote)}</button>` : ''}
    ${S.exNotes[e.id] ? `<div class="small" style="color:var(--steel)">${icon('info', 14)} ${esc(S.exNotes[e.id])}</div>` : ''}
    ${showNote ? `<input class="note-in" data-in="exNote" data-ei="${ei}" maxlength="120" value="${esc(e.note)}" placeholder="Nota per questa seduta…">` : ''}
    ${live || (sg && !anyDone) ? `<div class="sugg ${live ? 'live' : ''}">${icon(sg.kind === 'up' ? 'up' : sg.kind === 'down' ? 'down' : 'target', 18)}<div class="grow">${sg.text}</div>${sg.kg != null && sg.kind !== 'new' && mt !== 'time' ? `<button class="btn sm" data-a="${live ? 'applyLive' : 'applySugg'}" data-ei="${ei}">Applica</button>` : ''}</div>` : ''}
    <div class="sets"><div class="set-hd c${fields.length}"><span>Serie</span><span>Prec.</span>${cols.map(c => `<span>${c}</span>`).join('')}<span></span></div>${rows}</div>
    <div class="exc-foot"><button class="btn" data-a="addSet" data-ei="${ei}">${icon('plus', 16)} Serie</button><button class="btn ghost sm" data-a="suggestSimilar" data-ei="${ei}">${icon('sparkle', 15)} Consiglia simile</button></div>
  </div>`;
}

/* tags editor (execution / tempo) */
function layerTags(l) {
  const list = l.get(), all = [...new Set([...TECH_TAGS, ...(S.customTags || []), ...list])];
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="dialog" aria-label="Esecuzione"><div class="grab"></div><h3>Esecuzione</h3>
    <p class="small muted" style="margin:0 0 10px">Come esegui questo esercizio oggi. Resta salvato nella seduta: così confronti i carichi a parità di esecuzione.</p>
    <div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${all.map(t => `<button class="chip ${list.includes(t) ? 'on' : ''}" data-a="tagToggle" data-t="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    <form class="row" data-form="tagNew" style="margin-top:12px"><input id="tag-new" class="input" maxlength="30" placeholder="Altro, es. Tempo 4-0-1-0"><button class="btn">Aggiungi</button></form>
    <button class="btn primary block" data-a="pop" style="margin-top:12px">Fatto</button>
  </div></div>`;
}

function finishWorkout(force, decided) {
  const w = S.active; if (!w) return;
  if (w.past) {
    for (const e of w.ex) for (const s of e.sets) if (!s.done && setDone(s, mtOf(e))) s.done = true;
    force = true; decided = true;
    if (!w.dur) { toast('Inserisci la durata'); return; }
  }
  const doneSets = w.ex.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const pending = w.ex.reduce((a, e) => a + e.sets.filter(s => !s.done).length, 0);
  if (!doneSets) {
    return pushLayer({ type: 'confirm', title: 'Nessuna serie completata', text: 'Segna almeno una serie con la spunta, oppure annulla l\'allenamento.', ok: 'Annulla allenamento', danger: true, fn: discardWorkout });
  }
  if (pending && !force) {
    return pushLayer({ type: 'confirm', title: 'Terminare l\'allenamento?', text: `${pending} ${pending === 1 ? 'serie non completata verrà scartata' : 'serie non completate verranno scartate'} dallo storico (nella scheda restano).`, ok: 'Termina', fn: () => setTimeout(() => finishWorkout(true), 0) });
  }
  if (!decided && w.rid && !w.light) {
    const df = routineDiff(w);
    if (df) {
      const rn = S.routines.find(r => r.id === w.rid)?.name || 'scheda';
      return pushLayer({
        type: 'sheet', title: 'Aggiornare la scheda?', html: `<p class="small muted" style="margin:0 0 8px">Oggi hai cambiato qualcosa rispetto a “${esc(rn)}”. I carichi si salvano comunque nello storico.</p>${df.lines.length ? `<div class="small" style="line-height:1.6;margin-bottom:6px">${df.lines.slice(0, 8).map(esc).join('<br>')}${df.lines.length > 8 ? '<br>…' : ''}</div>` : ''}<div class="small faint" style="margin-bottom:6px">Le serie che hai lasciato senza spunta restano nella scheda; si tolgono solo quelle che hai eliminato.</div>`,
        items: [
          ...(df.lines.length ? [{ label: 'Aggiorna serie ed esercizi', desc: 'Le ripetizioni obiettivo restano quelle della scheda', ic: 'check', fn: () => { applyRoutineUpdate(w, false); finishWorkout(true, true); } }] : []),
          ...(df.repsDiff ? [{ label: df.lines.length ? 'Aggiorna anche le ripetizioni' : 'Aggiorna le ripetizioni', desc: 'Le reps fatte fuori dal range diventano il nuovo obiettivo', ic: 'edit', fn: () => { applyRoutineUpdate(w, true); finishWorkout(true, true); } }] : []),
          { label: 'Mantieni la scheda com\'era', desc: 'Cambia solo per oggi', ic: 'x', fn: () => finishWorkout(true, true) },
        ]
      });
    }
  }
  restAudioStop();
  const before = levelInfo(), badgesBefore = new Set(badgeState().filter(b => b.got).map(b => b.id));
  const rec = {
    id: w.id, name: w.name || 'Allenamento', rid: w.rid, start: w.start, end: w.past ? w.start + w.dur * 60000 : Date.now(), note: w.note || '', hr: w.hr || undefined,
    ex: w.ex.map(e => ({ id: e.id, mt: mtOf(e), tags: e.tags && e.tags.length ? e.tags : undefined, note: e.note || '', sets: e.sets.filter(s => s.done).map(s => { const o = { t: s.t }; for (const f of ['kg', 'r', 'rir', 'sec', 'km', 'min']) if (s[f] != null) o[f] = s[f]; return o; }) })).filter(e => e.sets.length),
  };
  if (w.editId) { S.workouts = S.workouts.map(x => x.id === w.editId ? Object.assign(rec, x.demo ? { demo: true } : {}) : x); S.active = null; save(); CACHE.k = null; UI.layers = []; pushLayer({ type: 'history', id: rec.id }); render(); toast('Allenamento aggiornato'); return; }
  S.workouts.push(rec); S.active = null; save(); CACHE.k = null;
  const after = levelInfo();
  const newBadges = badgeState().filter(b => b.got && !badgesBefore.has(b.id));
  releaseWake();
  closeLayersOfType('workout');
  UI.layers = [];
  pushLayer({ type: 'summary', wid: rec.id, xp: after.xp - before.xp, before, after, newBadges });
  render();
}
function discardWorkout() { const ed = S.active?.editId; restAudioStop(); S.active = null; save(); releaseWake(); UI.layers = []; if (ed) pushLayer({ type: 'history', id: ed }); render(); toast(ed ? 'Modifiche annullate' : 'Allenamento annullato'); }

function layerSummary(l) {
  const w = S.workouts.find(x => x.id === l.wid); if (!w) return '';
  const d = derive(), prs = d.prByW[w.id] || [];
  return `<div class="layer"><div class="layer-body"><div class="layer-inner" style="padding-top:calc(28px + env(safe-area-inset-top, 0px))">
    <div class="celebrate"><span class="pr-flag">${icon(prs.length ? 'trophy' : 'check', 56, 1.6)}</span><div class="big">${prs.length ? (prs.length === 1 ? 'Nuovo record!' : prs.length + ' nuovi record!') : 'Completato'}</div><div class="muted">${esc(w.name)} · ${fmtDateLong(w.start)}</div></div>
    <div class="tiles"><div class="tile"><div class="v">${fmtDur(w.end - w.start)}</div><div class="k">Durata</div></div><div class="tile"><div class="v">${fmtTon(wVolume(w))}</div><div class="k">Volume</div></div><div class="tile"><div class="v">${wSetCount(w)}</div><div class="k">Serie</div></div></div>
    ${kcalLine(kcalWorkout(w))}
    ${prs.length ? `<div class="stack"><div class="section-title">Nuovi record</div><div class="list">${prs.map(p => `<div class="li"><span class="pr-flag">${icon('trophy', 20)}</span><div class="grow"><div class="t">${esc(ex(p.exId).n)}</div><div class="s">${prText(p)}</div></div></div>`).join('')}</div></div>` : ''}
    ${l.newBadges.length ? `<div class="stack"><div class="section-title">Traguardi sbloccati</div><div class="badges">${l.newBadges.map(b => `<div class="badge got"><span class="ic">${icon(b.ic, 22)}</span><span class="n">${b.n}</span><span class="p">${b.d}</span></div>`).join('')}</div></div>` : ''}
    <button class="btn primary block" data-a="closeAll">Fatto</button>
  </div></div></div>`;
}

/* ---------- exercise picker ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let SEARCH_IDX = null;
function searchText(x) {
  return norm([x.n, x.en || '', x.it || '', x.es || '', x.a, ...(x.p || []).map(m => MUSCLE_IT[m]), EQUIP_IT[x.e]].join(' '));
}
function recentExIds() {
  const seen = new Set(), out = [];
  for (const w of [...S.workouts].sort((a, b) => b.start - a.start)) for (const e of w.ex) if (!seen.has(e.id)) { seen.add(e.id); out.push(e.id); }
  return out;
}
function filterExercises(l) {
  const q = norm(l.q).split(/\s+/).filter(Boolean);
  let list = allExercises();
  if (l.g === 'fav') { const fv = favList('ex'); const set = new Map(fv.map((id, i) => [id, i])); list = list.filter(x => set.has(x.id)).sort((a, b) => set.get(a.id) - set.get(b.id)); }
  else if (l.g === 'recent') { const r = recentExIds(); const set = new Map(r.map((id, i) => [id, i])); list = list.filter(x => set.has(x.id)).sort((a, b) => set.get(a.id) - set.get(b.id)); }
  else if (l.g) {
    const g = GROUPS.find(g => g.k === l.g);
    list = list.filter(x => g.cat ? x.c === g.cat : (x.p || []).some(m => g.m.includes(m)));
  }
  if (l.eq) list = list.filter(x => x.e === l.eq);
  if (!l.g && !q.length) list = list.filter(x => x.c !== 'stretching');
  if (q.length) {
    list = list.filter(x => { const t = x._s || (x._s = searchText(x)); return q.every(w => t.includes(w)); });
    const qq = q.join(' ');
    list.sort((a, b) => score(b, qq) - score(a, qq) || a.n.localeCompare(b.n));
  } else if (l.g !== 'recent' && l.g !== 'fav') {
    list.sort((a, b) => (POP_RANK.has(b.id) - POP_RANK.has(a.id)) || ((POP_RANK.get(a.id) ?? 0) - (POP_RANK.get(b.id) ?? 0)) || a.n.localeCompare(b.n));
  }
  return list;
}
function score(x, q) { const n = norm(x.n); return (n.startsWith(q) ? 4 : 0) + (norm(x.a).includes(q) ? 3 : 0) + (POP_RANK.has(x.id) ? 2 : 0) + (x.id.startsWith('c_') ? 1 : 0); }

function pickerList(l) {
  if (l.g === 'similar' && l.ref) return similarRowsHTML(l);
  const list = filterExercises(l);
  const max = 160;
  if (l.g === 'fav' && !list.length) return `<div class="empty">${icon('star', 30)}<b>Nessun preferito</b><span class="small">Tocca la stella accanto a un esercizio per averlo sempre qui.</span></div>`;
  return list.slice(0, max).map(x => pickRowHTML(x, l)).join('') + (list.length > max ? `<div class="li small muted">Altri ${list.length - max} risultati: affina la ricerca.</div>` : '') + (!list.length ? `<div class="empty">${icon('search', 30)}<b>Nessun esercizio trovato</b><button class="btn sm" data-a="newEx">${icon('plus', 16)} Crea “${esc(l.q || 'nuovo esercizio')}”</button></div>` : '');
}
function layerPicker(l, i) {
  const multi = l.mode === 'add' || l.mode === 'routine';
  const hasRecent = S.workouts.length > 0;
  const title = l.mode === 'browse' ? 'Esercizi' : l.mode === 'replace' ? 'Sostituisci' : 'Aggiungi esercizi';
  return `<div class="layer">${head(title, 'back', `<button class="btn sm" data-a="newEx">${icon('plus', 16)} Crea</button>`)}
    <div style="padding:12px 16px 4px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--line)">
      ${l.mode === 'browse' && typeof layerAnatomy === 'function' ? `<button class="btn sm an-open" data-a="anatOpen">${icon('body', 18)} Esplora i muscoli sul corpo</button>` : ''}
      <div class="search">${icon('search', 18)}<input class="input" id="pk-q" data-in="pickerQ" value="${esc(l.q)}" placeholder="Cerca: panca, lat machine, squat…" autocomplete="off" type="search"></div>
      <div class="chips">${l.ref ? `<button class="chip gold ${l.g === 'similar' ? 'on' : ''}" data-a="pickGroup" data-g="similar">${icon('sparkle', 14)} Simili</button>` : ''}${favChip(l.g === 'fav', 'pickGroup', 'data-g="fav"')}<button class="chip ${!l.g ? 'on' : ''}" data-a="pickGroup" data-g="">Tutti</button>${hasRecent ? `<button class="chip ${l.g === 'recent' ? 'on' : ''}" data-a="pickGroup" data-g="recent">Recenti</button>` : ''}${GROUPS.map(g => `<button class="chip ${l.g === g.k ? 'on' : ''}" data-a="pickGroup" data-g="${g.k}">${g.n}</button>`).join('')}</div>
      <select class="input" id="pk-eq" data-in="pickerEq" style="min-height:40px;padding:6px 12px" aria-label="Attrezzo"><option value="">Tutti gli attrezzi</option>${Object.entries(EQUIP_IT).map(([k, v]) => `<option value="${k}" ${l.eq === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
    </div>
    <div class="layer-body" data-scroll-key="picker${i}"><div class="list" id="pk-list" style="border-radius:0">${pickerList(l)}</div></div>
    ${multi ? `<div class="layer-foot"><button class="btn primary block" data-a="pickDone" ${l.sel.length ? '' : 'disabled'}>Aggiungi ${l.sel.length ? '(' + l.sel.length + ')' : ''}</button></div>` : ''}
  </div>`;
}

/* ---------- create custom exercise ---------- */
function layerNewEx(l) {
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="dialog" aria-label="Nuovo esercizio"><div class="grab"></div><h3>Nuovo esercizio</h3>
    <div class="stack">
      <div class="field"><label for="nx-n">Nome</label><input id="nx-n" class="input" value="${esc(l.name || '')}" placeholder="Es. Panca inclinata Technogym"></div>
      <div class="field"><label for="nx-m">Muscolo principale</label><select id="nx-m" class="input">${Object.entries(MUSCLE_IT).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
      <div class="field"><label for="nx-e">Attrezzo</label><select id="nx-e" class="input">${Object.entries(EQUIP_IT).map(([k, v]) => `<option value="${k}" ${k === 'machine' ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label for="nx-c">Tipo</label><select id="nx-c" class="input"><option value="strength">Forza / ipertrofia</option><option value="cardio">Cardio</option></select></div>
      <button class="btn primary block" data-a="saveNewEx">Crea esercizio</button>
    </div></div></div>`;
}

/* ---------- exercise detail ---------- */
function layerExercise(l, i) {
  const x = ex(l.id);
  const d = derive();
  const b = d.best[x.id];
  const series = (d.series[x.id] || []).map(p => ({ x: p.t, y: p.e1rm }));
  const sessions = S.workouts.filter(w => w.ex.some(e => e.id === x.id)).sort((a, b) => b.start - a.start).slice(0, 6);
  const imgs = x.img ? `<span class="thumb lg ${x.img > 1 ? 'anim' : ''}">${esc(initials(x.n))}<img src="${exImg(x, 0)}" alt="${esc(x.n)}" onerror="this.remove()">${x.img > 1 ? `<img src="${exImg(x, 1)}" alt="" onerror="this.remove()">` : ''}</span>` : `<span class="thumb lg">${esc(initials(x.n))}</span>`;
  return `<div class="layer">${head(esc(x.n), 'back', favBtn('ex', x.id, 22))}
    <div class="layer-body" data-scroll-key="ex${i}"><div class="layer-inner">
      ${imgs}
      ${(() => { const pref = { it: x.it, es: x.es, en: x.en }[lang()]; const alt = pref && pref !== x.n ? pref : x.n !== x.en ? x.en : x.it; return alt && alt !== x.n ? `<div class="small muted" data-nt style="margin-top:-8px">${esc(alt)}</div>` : ''; })()}
      <div class="row wrap">${(x.p || []).map(m => `<span class="chip warm">${MUSCLE_IT[m]}</span>`).join('')}${(x.s || []).map(m => `<span class="chip">${MUSCLE_IT[m]}</span>`).join('')}<span class="chip steel">${EQUIP_IT[x.e] || 'Altro'}</span>${x.l ? `<span class="chip">${LEVEL_IT[x.l] || x.l}</span>` : ''}</div>
      ${typeof exFocusHTML === 'function' ? exFocusHTML(x, l) : ''}
      ${x.c !== 'stretching' ? `<button class="btn sm ghost" data-a="chatOpen" data-q="${esc(({ it: 'Come faccio a progredire su ', en: 'How do I progress on ', es: '¿Cómo progreso en ' }[lang()] || '') + x.n + '? ')}" style="align-self:flex-start">${icon('sparkle', 14)} Chiedi al coach su questo esercizio</button>` : ''}
      ${b && (b.mt === 'time' || b.mt === 'dist') ? `<div class="kv">${b.mt === 'time' ? `<div><b>${fmtN(b.sec, 0)} s</b><span>Tempo massimo</span></div>` : `<div><b>${fmtN(b.km, 2)} km</b><span>Distanza massima</span></div>`}<div><b>${b.sessions}</b><span>Sedute</span></div></div><div class="card"><div class="section-title">${b.mt === 'time' ? 'Tempo migliore' : 'Distanza'}</div>${lineChart((d.series[x.id] || []).map(p => ({ x: p.t, y: b.mt === 'time' ? p.sec : p.km })), b.mt === 'time' ? 's' : 'km')}</div>` : ''}
      ${b && b.mt !== 'time' && b.mt !== 'dist' && !b.kg ? `<div class="kv"><div><b>${b.reps}</b><span>Ripetizioni massime</span></div><div><b>${b.sessions}</b><span>Sedute</span></div></div><div class="card"><div class="section-title">Ripetizioni migliori</div>${lineChart((d.series[x.id] || []).map(p => ({ x: p.t, y: p.reps })), 'reps')}</div>` : ''}${b && b.mt !== 'time' && b.mt !== 'dist' && b.kg ? `<div class="kv"><div><b>${fmtKg(b.e1rm)}</b><span>1RM stimato (kg)</span></div><div><b>${fmtKg(b.kg)}</b><span>Peso massimo (kg)</span></div><div><b>${fmtN(b.vol, 0)}</b><span>Miglior serie (kg×reps)</span></div><div><b>${b.sessions}</b><span>Sedute</span></div></div>
      <div class="card"><div class="section-title">1RM stimato</div>${lineChart(series, 'kg')}<div class="small faint">Formula di Epley sulla serie migliore di ogni seduta (riscaldamento escluso).</div></div>` : ''}${!b ? `<div class="card tight small muted">Ancora nessuna seduta con questo esercizio. Dopo il primo allenamento qui vedi record e grafico.</div>` : ''}
      <div class="row"><div class="grow"><div class="lbl">Come lo registri</div><div class="small faint">${MT[exType(x.id)].d}</div></div><select class="input" style="width:auto" data-in="exMT" data-id="${esc(x.id)}" aria-label="Tipo di registrazione">${Object.entries(MT).map(([k, v]) => `<option value="${k}" ${exType(x.id) === k ? 'selected' : ''}>${v.l}</option>`).join('')}</select></div>
      ${exType(x.id) === 'wr' ? `<div class="field"><label for="ex-rm">Massimale (1RM) per le serie in %</label><div class="row"><input id="ex-rm" class="input" inputmode="decimal" data-in="exRM" data-id="${esc(x.id)}" data-max="1000" value="${S.rm?.[x.id] ? fmtKg(S.rm[x.id]) : ''}" placeholder="${b && b.e1rm ? 'stimato ' + fmtKg(b.e1rm) + ' kg' : 'kg'}"><span class="small faint" style="white-space:nowrap">kg</span></div><div class="small faint">Se lo lasci vuoto uso il 1RM stimato dai tuoi allenamenti.</div></div>` : ''}
      <div class="field"><label for="exnote">Nota fissa (setup, regolazioni macchina…)</label><input id="exnote" class="input" data-in="exFixedNote" data-id="${esc(x.id)}" value="${esc(S.exNotes[x.id] || '')}" placeholder="Es. sedile 4, presa larga"></div>
      ${sessions.length ? `<div class="stack"><div class="section-title">Ultime sedute</div><div class="list">${sessions.map(w => { const e = w.ex.find(e => e.id === x.id); return `<div class="li" style="align-items:flex-start"><div class="grow"><div class="t">${relDay(w.start)} <span class="small muted" style="font-weight:500">· ${esc(w.name)}</span></div><div class="s" style="white-space:normal;line-height:1.6">${e.sets.map(s => `${s.t !== 'n' ? `<b style="color:var(--gold)">${SET_TYPES[s.t].s}</b> ` : ''}${fmtSet(s, mtOf(e))}${s.rir != null ? ` @${s.rir}` : ''}`).join(' · ')}${e.tags ? ` <span class="faint">· ${e.tags.map(esc).join(', ')}</span>` : ''}</div></div></div>`; }).join('')}</div></div>` : ''}
      ${x.i ? `<div class="stack"><div class="section-title">Esecuzione <span class="small muted" style="font-family:var(--font-body);text-transform:none;letter-spacing:0">in inglese</span></div><ol class="instr">${x.i.split('\n').map(s => `<li>${esc(s)}</li>`).join('')}</ol></div>` : ''}
      ${(() => { const sim = x.c === 'stretching' ? [] : similarExercises(x.id, { n: 5 }); return sim.length ? `<div class="stack"><div class="section-title">Esercizi simili</div><div class="list">${sim.map(r => `<button class="li" data-a="openEx" data-id="${esc(r.x.id)}">${thumbHTML(r.x)}<div class="grow" style="min-width:0"><div class="t">${esc(r.x.n)}</div><div class="s">${simReason(r, x)}</div></div>${isFav('ex', r.x.id) ? `<span class="fav-mark">${icon('star', 15)}</span>` : ''}${icon('chev', 16)}</button>`).join('')}</div></div>` : ''; })()}
      ${x.id.startsWith('c_') ? `<button class="btn danger block" data-a="deleteCustomEx" data-id="${esc(x.id)}">${icon('trash', 18)} Elimina esercizio personalizzato</button>` : ''}
    </div></div></div>`;
}

/* ---------- routine editor ---------- */
function layerRoutine(l, i) {
  const r = l.draft;
  const groups = ssGroups(r.ex);
  const restOpts = [30, 45, 60, 75, 90, 120, 150, 180, 240, 300];
  return `<div class="layer">${head(l.isNew ? 'Nuova scheda' : 'Modifica scheda', 'x', `<button class="btn primary sm" data-a="saveRoutine">Salva</button>`)}
    <div class="layer-body" data-scroll-key="rt${i}"><div class="layer-inner">
      <div class="field"><label for="rt-name">Nome scheda</label><input id="rt-name" class="input" data-in="rtName" value="${esc(r.name)}" placeholder="Es. Push A"></div>
      ${r.note ? `<div class="field"><label>Note della scheda</label><textarea class="input" data-in="rtNote" rows="4" maxlength="1000" style="font-size:14px">${esc(r.note)}</textarea></div>` : ''}
      ${r.ex.map((e, ei) => {
    const x = ex(e.id);
    if (!Array.isArray(e.plan) || !e.plan.length) e.plan = planOf(e).map(p => ({ ...p }));
    const mt = exType(e.id), repsMode = mt === 'wr' || mt === 'bw';
    let wn = 0;
    const rows = e.plan.map((p, si) => { const lab = p.t === 'n' || !SET_TYPES[p.t] ? ++wn : (p.t === 'w' ? 'W' : (wn++, SET_TYPES[p.t].s));
      const badge = p.t === 'bo' && p.pct ? `${p.pct}%` : p.rm ? `${p.rm}%RM` : '';
      return `<div class="rt-set"><button class="ty ${p.t}" data-a="rtSetType" data-ei="${ei}" data-si="${si}" aria-label="Tipo serie">${lab}${badge ? `<small>${badge}</small>` : ''}</button>
        ${repsMode ? `<input class="input" inputmode="numeric" data-in="rtSet" data-ei="${ei}" data-si="${si}" data-f="a" data-max="100" value="${p.a ?? ''}" placeholder="reps" aria-label="Ripetizioni (min)"><span class="faint">–</span><input class="input" inputmode="numeric" data-in="rtSet" data-ei="${ei}" data-si="${si}" data-f="b" data-max="100" value="${p.b ?? ''}" placeholder="max" aria-label="Ripetizioni max (vuoto = secche)">` : `<span class="small muted" style="grid-column:span 3">${MT[mt].l}</span>`}
        <button class="icon-btn" data-a="rtDelSet" data-ei="${ei}" data-si="${si}" aria-label="Elimina serie" ${e.plan.length < 2 ? 'disabled style="opacity:.3"' : ''}>${icon('x', 16)}</button></div>`; }).join('');
    return `<div class="ed-ex ${groups[ei] ? 'ss' : ''}" data-drag-item>
          ${groups[ei] ? `<div class="ss-tag">Superserie ${groups[ei]}</div>` : ''}
          <div class="row" data-lp="rt"><button class="icon-btn drag-h" data-drag="rt" aria-label="Trascina per spostare">${icon('grip', 18)}</button><button class="row grow" data-a="openEx" data-id="${esc(e.id)}" style="text-align:left;min-width:0" aria-label="Vedi esecuzione e muscoli">${thumbHTML(x)}<div class="grow" style="min-width:0"><b style="display:block;line-height:1.25">${esc(x.n)}</b><span class="small muted">${(x.p || []).map(m => MUSCLE_IT[m]).join(', ')}</span><span class="small" style="display:block;color:var(--gold)">${icon('info', 12)} Esecuzione e muscoli</span></div></button>
            <button class="icon-btn" data-a="rtMove" data-ei="${ei}" data-d="-1" aria-label="Sposta su" ${ei === 0 ? 'disabled style="opacity:.3"' : ''}>${icon('up')}</button>
            <button class="icon-btn" data-a="rtMove" data-ei="${ei}" data-d="1" aria-label="Sposta giù" ${ei === r.ex.length - 1 ? 'disabled style="opacity:.3"' : ''}>${icon('down')}</button>
            <button class="icon-btn" data-a="rtRemove" data-ei="${ei}" aria-label="Rimuovi">${icon('x')}</button></div>
          <div class="rt-sets">${repsMode ? `<div class="rt-set hd"><span>Serie</span><span>Reps</span><span></span><span>Max</span><span></span></div>` : ''}${rows}
            <div class="row" style="gap:6px"><button class="btn sm ghost" data-a="rtAddSet" data-ei="${ei}">${icon('plus', 14)} Serie</button><button class="btn sm ghost" data-a="suggestSimilar" data-t="routine" data-ei="${ei}">${icon('sparkle', 14)} Consiglia simile</button></div></div>
          <input class="input" data-in="rtExNote" data-ei="${ei}" maxlength="400" value="${esc(e.note || '')}" placeholder="Nota della scheda (es. 80% del massimale, jump set)" style="min-height:38px;font-size:14px">
          <div class="row"><span class="lbl grow">Progressione</span><select class="input" style="width:auto;min-height:38px;padding:4px 10px" data-in="rtProg" data-ei="${ei}">${PROGS.map(([k, n]) => `<option value="${k}" ${(e.prog || 'double') === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="row"><div class="grow"><span class="lbl">Riscaldamento automatico</span><div class="small faint">Aggiunge le serie di avvicinamento in base al peso di lavoro</div></div><button class="switch ${e.warm ? 'on' : ''}" data-a="rtWarm" data-ei="${ei}" aria-label="Riscaldamento automatico"></button></div>
          <div class="row"><span class="lbl grow">Recupero</span><select class="input" style="width:auto;min-height:38px;padding:4px 10px" data-in="rtEx" data-ei="${ei}" data-f="rest">${restOpts.map(s => `<option value="${s}" ${e.rest == s ? 'selected' : ''}>${fmtClock(s * 1000)}</option>`).join('')}</select></div>
          <div class="row" style="align-items:flex-start"><span class="lbl" style="padding-top:6px">Esecuzione</span><div class="grow">${tagChips(e, ei, 'rtTags')}</div></div>
          ${ei < r.ex.length - 1 ? `<div class="row"><span class="lbl grow row" style="gap:6px">${icon('link', 16)} Superserie con il successivo</span><button class="switch ${e.ss ? 'on' : ''}" data-a="rtSS" data-ei="${ei}" aria-label="Superserie"></button></div>` : ''}
        </div>`;
  }).join('')}
      <button class="btn block" data-a="pickForRoutine">${icon('plus', 18)} Aggiungi esercizi</button>
      <div class="small faint">Ogni riga è una serie: scrivi un range (8 – 10) o solo le reps secche (8, max vuoto). Se cambi una riga si aggiornano anche quelle sotto, non quelle sopra. Tocca il numero della serie per cambiarne il tipo (riscaldamento, drop, cedimento…). Il RIR lo trovi in Esecuzione.</div>
    </div></div></div>`;
}

/* ---------- history detail ---------- */
function layerHistory(l, i) {
  const w = S.workouts.find(x => x.id === l.id); if (!w) return '';
  const d = derive(), prs = d.prByW[w.id] || [];
  return `<div class="layer">${head(esc(w.name), 'back', `<button class="icon-btn" data-a="histMenu" data-id="${w.id}" aria-label="Opzioni">${icon('more')}</button>`)}
    <div class="layer-body" data-scroll-key="h${i}"><div class="layer-inner">
      <div class="muted">${fmtDateLong(w.start)} · ${new Date(w.start).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })} ${w.demo ? '<span class="demo-tag">esempio</span>' : ''}</div>
      <div class="tiles"><div class="tile"><div class="v">${fmtDur(w.end - w.start)}</div><div class="k">Durata</div></div><div class="tile"><div class="v">${fmtTon(wVolume(w))}</div><div class="k">Volume</div></div><div class="tile"><div class="v">${wSetCount(w)}</div><div class="k">Serie</div></div></div>
      ${kcalLine(kcalWorkout(w))}${w.hr ? `<div class="small muted">${icon('heart', 14)} FC media ${w.hr} bpm</div>` : ''}
      ${w.ex.map(e => {
    const x = ex(e.id); const pr = prs.filter(p => p.exId === e.id);
    let wi = 0;
    return `<div class="card tight"><button class="row" data-a="openEx" data-id="${esc(e.id)}" style="text-align:left">${thumbHTML(x)}<b class="grow">${esc(x.n)}</b>${pr.length ? `<span class="chip gold">${icon('trophy', 14)} PR</span>` : ''}</button>
        ${tagChips(e, 0, '')}${e.note ? `<div class="small" style="color:var(--steel)">${esc(e.note)}</div>` : ''}
        <div class="stack" style="gap:4px">${e.sets.map(s => `<div class="row small tnum"><span style="width:26px;font-weight:700;color:${s.t === 'n' ? 'var(--muted)' : 'var(--gold)'}">${s.t === 'n' ? ++wi : SET_TYPES[s.t].s}</span><span class="grow"><b>${mtOf(e) === 'wr' ? fmtKg(s.kg) + ' kg × ' + s.r : fmtSet(s, mtOf(e))}</b>${s.rir != null ? ` <span class="muted">RIR ${s.rir}</span>` : ''}</span><span class="muted">${isWork(s) && mtOf(e) === 'wr' ? '1RM ' + fmtKg(e1rm(s.kg, s.r)) : ''}</span></div>`).join('')}</div></div>`;
  }).join('')}
      <button class="btn block" data-a="editHist" data-id="${w.id}">${icon('edit', 16)} Modifica data, serie e pesi</button>
      <div class="row"><button class="btn primary grow" data-a="repeatWorkout" data-id="${w.id}">${icon('play', 16)} Ripeti</button><button class="btn" data-a="saveAsRoutine" data-id="${w.id}">${icon('copy', 16)} Salva come scheda</button></div>
    </div></div></div>`;
}

/* ---------- generic sheet & confirm ---------- */
function layerSheet(l, i) {
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="dialog" aria-label="${esc(l.title || 'Opzioni')}"><div class="grab"></div>${l.title ? `<h3>${esc(l.title)}</h3>` : ''}${l.html || ''}
    ${(l.items || []).map((it, k) => `<button class="opt ${it.danger ? 'danger' : ''}" data-a="sheetPick" data-k="${k}">${it.ic ? icon(it.ic, 20) : ''}<span class="grow">${esc(it.label)}${it.desc ? `<div class="d">${esc(it.desc)}</div>` : ''}</span>${it.on ? icon('check', 18) : ''}</button>`).join('')}
  </div></div>`;
}
function layerConfirm(l) {
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="alertdialog" aria-label="${esc(l.title)}"><div class="grab"></div><h3>${esc(l.title)}</h3><p class="muted" style="margin:0 0 16px">${esc(l.text || '')}</p>
    <div class="row"><button class="btn grow" data-a="pop">Indietro</button><button class="btn ${l.danger ? 'danger' : 'primary'} grow" data-a="confirmOk">${esc(l.ok || 'Conferma')}</button></div></div></div>`;
}
