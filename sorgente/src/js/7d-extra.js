/* =========================================================
   CALORIE BRUCIATE · ALLENAMENTI PASSATI E MODIFICA · CALENDARIO · RIEPILOGO SETTIMANALE
   Le calorie si mostrano soltanto: l'obiettivo della dieta include già il livello di attività.
   ========================================================= */

/* ---------- energy model ---------- */
function bodyP() { const n = S.nutri || {}; return { kg: bodyWeight() || n.weight || 75, age: n.age || 25, sex: n.sex || 'm', h: n.height || S.profile.height || 175, known: !!(bodyWeight() || n.weight) }; }
function rmrMin(p) { return Math.max(0.7, (10 * p.kg + 6.25 * p.h - 5 * p.age + (p.sex === 'f' ? -161 : 5)) / 1440); }
/* Keytel et al. 2005: kcal from average heart rate, weight, age, sex */
function keytel(hr, min, p) {
  if (!hr || hr < 80 || hr > 220) return null;
  const k = p.sex === 'f' ? (-20.4022 + 0.4472 * hr - 0.1263 * p.kg + 0.074 * p.age) : (-55.0969 + 0.6309 * hr + 0.1988 * p.kg + 0.2017 * p.age);
  return Math.max(0, k / 4.184 * min);
}
/* MET while the set is running, by exercise type (Compendium of Physical Activities as a base) */
function exWorkMet(x, mt) {
  if (x.c === 'stretching') return 2.3;
  if (x.c === 'cardio' || x.c === 'plyometrics') return 8;
  if (mt === 'time') return 3.8;
  const big = (x.p || []).some(m => ['quadriceps', 'hamstrings', 'glutes', 'lower back'].includes(m));
  const comp = x.k === 'compound' || ['olympic weightlifting', 'powerlifting', 'strongman'].includes(x.c);
  return comp && big ? 9 : comp ? 6.5 : big ? 5.5 : 4.5;
}
function runVO2(kmh, grade, walk) { const v = kmh * 1000 / 60; return walk ? 3.5 + 0.1 * v + 1.8 * v * grade : 3.5 + 0.2 * v + 0.9 * v * grade; }
function kcalWorkout(w) {
  if (!w || !w.ex) return null;
  const p = bodyP(); let work = 0, workMin = 0, n = 0, cardioMin = 0, cardio = 0;
  for (const e of w.ex) {
    const x = ex(e.id), mt = mtOf(e);
    for (const s of e.sets || []) {
      if (s.done === false) continue;
      if (mt === 'dist') { const m = s.min || (s.km ? s.km * 6 : 0); if (!m) continue; const kmh = s.km && s.min ? s.km / (s.min / 60) : 9; cardio += runVO2(kmh, 0, kmh < 7) * p.kg / 1000 * 5 * m; cardioMin += m; continue; }
      const sec = mt === 'time' ? (s.sec || 30) : clamp((s.r || 8) * 3.6 + 8, 15, 120);
      let met = exWorkMet(x, mt);
      if (!isWork(s)) met *= 0.6;
      if (s.rir != null) met *= s.rir <= 1 ? 1.1 : s.rir >= 3 ? 0.92 : 1;
      if (mt === 'wr' && s.kg) met *= clamp(0.85 + 0.3 * s.kg / p.kg, 0.85, 1.25);
      work += met * p.kg / 60 * (sec / 60); workMin += sec / 60; n++;
    }
  }
  if (!n && !cardioMin) return null;
  const dur = w.end && w.end > w.start ? (w.end - w.start) / 60000 : workMin + n * 2 + cardioMin;
  const restMin = clamp(dur - workMin - cardioMin, 0, n * 4);
  const density = workMin / Math.max(1, workMin + restMin);
  const restMet = clamp(1.6 + 2 * density, 1.6, 2.6);
  let gross = work + cardio + restMin * restMet * p.kg / 60;
  const tot = workMin + restMin + cardioMin;
  let src = 'stima';
  const kt = keytel(w.hr, tot, p); if (kt) { gross = 0.75 * gross + 0.25 * kt; src = 'battito'; }   // HR overstates effort with weights: weighted less
  let net = gross - rmrMin(p) * tot; net += Math.max(0, net) * 0.07;   // small afterburn (EPOC)
  net = Math.max(0, net);
  const err = kt ? 0.15 : 0.2;
  return { gross: Math.round(gross), net: Math.round(net), lo: Math.round(net * (1 - err)), hi: Math.round(net * (1 + err)), min: Math.round(tot), workMin: Math.round(workMin), met: tot ? gross / (p.kg * tot / 60) : 0, src, known: p.known };
}
function kcalRun(r) {
  if (!r || !(r.km > 0) || !(r.sec > 0)) return null;
  const p = bodyP(), min = r.sec / 60, kmh = r.km / (min / 60);
  const grade = r.elev ? clamp(r.elev / (r.km * 1000), 0, 0.15) : 0;
  const walk = r.type === 'walk' || kmh < 7.2;
  let vo2 = runVO2(kmh, grade, walk);
  if (!walk && !r.indoor) vo2 *= 1.03;                     // air resistance outdoors
  let gross = vo2 * p.kg / 1000 * 5 * min, src = 'stima';
  const kt = keytel(r.hr, min, p); if (kt) { gross = 0.6 * gross + 0.4 * kt; src = 'battito'; }
  const net = Math.max(0, gross - rmrMin(p) * min), err = kt ? 0.1 : r.src === 'gps' || r.src === 'gpx' ? 0.12 : 0.15;
  return { gross: Math.round(gross), net: Math.round(net), lo: Math.round(net * (1 - err)), hi: Math.round(net * (1 + err)), min: Math.round(min), src, known: p.known, walk };
}
function kcalLine(k, what = 'allenamento') {
  if (!k) return '';
  return `<div class="kcal-line"><span class="kc-ic">${icon('flame', 20)}</span><div class="grow"><b>~${k.net} kcal attive</b> <span class="muted">(${k.lo}–${k.hi})</span><div class="small muted">Totali con il metabolismo a riposo: ~${k.gross} kcal · ${k.src === 'battito' ? 'calcolate anche dal battito medio' : 'stima da ' + (what === 'corsa' ? 'velocità, dislivello e peso' : 'esercizi, serie, carichi, tempo e peso')}${k.known ? '' : ' · inserisci il tuo peso per una stima migliore'}</div></div></div>`;
}
function dayKcal(t0) {
  const ws = S.workouts.filter(w => w.start >= t0 && w.start < t0 + DAY), rs = runs().filter(r => r.start >= t0 && r.start < t0 + DAY);
  return ws.reduce((a, w) => a + (kcalWorkout(w)?.net || 0), 0) + rs.reduce((a, r) => a + (kcalRun(r)?.net || 0), 0);
}

/* ---------- past workouts & editing a saved one ---------- */
function pastDefault() { const d = new Date(Date.now() - DAY); d.setHours(18, 0, 0, 0); return d.getTime(); }
function startPast(rid, start) {
  if (S.active) { toast(S.active.past ? 'Finisci prima l\'allenamento passato aperto' : 'Hai un allenamento in corso: finiscilo prima'); return openWorkout(); }
  const r = rid ? S.routines.find(x => x.id === rid) : null;
  startWorkout(r || undefined);
  const a = S.active; a.past = true; a.start = start; a.dur = r ? estMinutes(r) : 60; a.restEnd = 0;
  if (!r) a.name = 'Allenamento';
  releaseWake(); save(); renderLayers();
}
function editWorkout(w) {
  if (S.active) { toast('Chiudi prima l\'allenamento aperto'); return; }
  const c = JSON.parse(JSON.stringify(w));
  S.active = { id: w.id, editId: w.id, past: true, name: c.name, rid: c.rid, start: c.start, dur: Math.max(1, Math.round(((c.end || c.start) - c.start) / 60000)), hr: c.hr, note: c.note || '', restEnd: 0, restTotal: 0,
    ex: c.ex.map(e => ({ id: e.id, mt: e.mt || exType(e.id), tags: e.tags || [], note: e.note || '', rest: S.profile.restDefault, ss: false, sets: e.sets.map(s => ({ ...s, done: true })) })) };
  save(); UI.layers = []; pushLayer({ type: 'workout' });
}
function pastWhenCard(w) {
  const d = new Date(w.start);
  return `<div class="card tight past-card"><div class="row"><span style="color:var(--steel)">${icon('calendar', 18)}</span><b class="grow">${w.editId ? 'Modifica allenamento' : 'Allenamento passato'}</b></div>
    <div class="past-grid"><label>Giorno<input type="date" class="input" data-in="woDate" value="${dkey(w.start)}" max="${dkey(Date.now())}"></label><label>Ora<input type="time" class="input" data-in="woTime" value="${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}"></label>
    <label>Durata (min)<input class="input" inputmode="numeric" data-in="woDur" data-max="600" value="${w.dur || ''}"></label><label>FC media<input class="input" inputmode="numeric" data-in="woHr" data-max="220" value="${w.hr || ''}" placeholder="opz."></label></div>
    <div class="small faint">Scrivi kg e ripetizioni: le serie compilate si salvano anche senza spunta, e la spunta copia i valori suggeriti. Il battito medio (dall'Apple Watch) rende più precisa la stima delle calorie.</div></div>`;
}

/* ---------- monthly calendar ---------- */
const MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
function calendarCard() {
  const off = UI.calM || 0, base = new Date(); base.setDate(1); base.setHours(0, 0, 0, 0); base.setMonth(base.getMonth() + off);
  const y = base.getFullYear(), m = base.getMonth(), first = (base.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(), today = startOfDay(Date.now());
  const gym = new Set(S.workouts.map(w => dkey(w.start))), run = new Set(runs().map(r => dkey(r.start)));
  let cells = '', nG = 0, nR = 0;
  for (let i = 0; i < first; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const t = new Date(y, m, d).getTime(), k = dkey(t), g = gym.has(k), r = run.has(k); if (g) nG++; if (r) nR++;
    cells += `<button class="cd ${g ? 'g' : ''} ${r ? 'r' : ''} ${t === today ? 'today' : ''} ${t > today ? 'fut' : ''}" data-a="calDay" data-k="${k}"><b>${d}</b><i>${g ? '<u class="dg"></u>' : ''}${r ? '<u class="dr"></u>' : ''}</i></button>`;
  }
  return `<div class="card cal"><div class="row"><button class="icon-btn" data-a="calNav" data-d="-1" aria-label="Mese prima">${icon('back', 18)}</button><b class="grow" style="text-align:center;font-size:16px">${MONTHS[m]} ${y}</b><button class="icon-btn" data-a="calNav" data-d="1" aria-label="Mese dopo" ${off >= 0 ? 'disabled style="opacity:.3"' : ''}>${icon('chev', 18)}</button></div>
    <div class="cal-g">${[...(WLETTER_L[lang()] || WLETTER_L.it)].map(x => `<span class="cal-h">${x}</span>`).join('')}${cells}</div>
    <div class="row small muted" style="gap:14px;white-space:nowrap"><span><u class="dg"></u> Palestra ${nG}</span><span><u class="dr"></u> Corsa ${nR}</span><span class="grow"></span><span class="faint">Tocca un giorno</span></div></div>`;
}

/* ---------- weekly recap ---------- */
function weekStats(ws, until) {
  const we = Math.min(ws + 7 * DAY, until || Infinity), W = S.workouts.filter(w => w.start >= ws && w.start < we), R = runs().filter(r => r.start >= ws && r.start < we);
  const d = derive(), prs = W.reduce((a, w) => a + new Set((d.prByW[w.id] || []).map(p => p.exId)).size, 0);
  const kw = W.map(kcalWorkout), kr = R.map(kcalRun);
  const days = new Set([...W.map(w => dkey(w.start)), ...R.map(r => dkey(r.start))]);
  return {
    n: W.length, runs: R.length, min: W.reduce((a, w) => a + ((w.end || w.start) - w.start) / 60000, 0) + R.reduce((a, r) => a + r.sec / 60, 0),
    vol: W.reduce((a, w) => a + wVolume(w), 0), sets: W.reduce((a, w) => a + wSetCount(w), 0), km: R.reduce((a, r) => a + r.km, 0),
    kcal: kw.reduce((a, k) => a + (k?.net || 0), 0) + kr.reduce((a, k) => a + (k?.net || 0), 0), prs, days: days.size,
    perDay: [...Array(7)].map((_, i) => dayKcal(ws + i * DAY)),
    mus: weekMuscleSets(ws).filter(m => m.v > 0).sort((a, b) => b.v - a.v).slice(0, 4),
  };
}
function dlt(a, b, unit = '', pct) {
  if (!b && !a) return '';
  if (!b) return `<em class="up">nuovo</em>`;
  const d = a - b; if (Math.abs(d) < 1e-9) return `<em>=</em>`;
  return `<em class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲' : '▼'} ${pct ? Math.abs(Math.round(d / b * 100)) + '%' : fmtN(Math.abs(d), unit === 'km' ? 1 : 0) + (unit ? ' ' + unit : '')}</em>`;
}
function recapCard(off = UI.recapOff || 0, compact) {
  const ws = startOfWeek(Date.now()) - off * 7 * DAY, a = weekStats(ws), b = weekStats(ws - 7 * DAY, off === 0 ? Date.now() - 7 * DAY : 0), we = ws + 6 * DAY;
  const goal = S.profile.weeklyGoal, mx = Math.max(150, ...a.perDay);
  const msg = a.n + a.runs === 0 ? 'Settimana di riposo.' : a.n >= goal ? `Obiettivo centrato: ${a.n} allenamenti su ${goal}.` : `${a.n} allenamenti su ${goal} di obiettivo.`;
  if (compact) return `<button class="card tight recap-mini" data-a="recapOpen" style="text-align:left"><div class="row"><span class="kc-ic">${icon('calendar', 20)}</span><div class="grow"><div class="small" style="color:var(--gold)">La tua settimana scorsa</div><b>${a.n} allenamenti${a.runs ? ` · ${fmtN(a.km, 1)} km` : ''} · ~${fmtN(a.kcal, 0)} kcal</b><div class="small muted">${a.prs ? a.prs + ' record · ' : ''}volume ${fmtTon(a.vol)} ${b.vol ? dlt(a.vol, b.vol, '', true) : ''}</div></div>${icon('chev', 18)}</div></button>`;
  return `<div class="card recap"><div class="row"><button class="icon-btn" data-a="recapNav" data-d="1" aria-label="Settimana prima">${icon('back', 18)}</button><div class="grow" style="text-align:center"><b style="font-size:16px">${off === 0 ? 'Questa settimana' : off === 1 ? 'Settimana scorsa' : 'Settimana'}</b><div class="small muted">${fmtDate(ws)} – ${fmtDate(we)}</div></div><button class="icon-btn" data-a="recapNav" data-d="-1" aria-label="Settimana dopo" ${off <= 0 ? 'disabled style="opacity:.3"' : ''}>${icon('chev', 18)}</button></div>
    <div class="small" style="text-align:center;color:var(--gold);font-weight:600">${msg}${a.prs ? ` ${a.prs} ${a.prs === 1 ? 'record' : 'record'} battuti.` : ''}</div>
    <div class="rc-grid">
      <div><b>${a.n}</b><span>allenamenti ${dlt(a.n, b.n)}</span></div>
      <div><b>${fmtTon(a.vol)}</b><span>volume ${dlt(a.vol, b.vol, '', true)}</span></div>
      <div><b>${a.sets}</b><span>serie ${dlt(a.sets, b.sets)}</span></div>
      <div><b>${fmtN(a.km, 1)}</b><span>km corsa ${dlt(a.km, b.km, 'km')}</span></div>
      <div><b>~${fmtN(a.kcal, 0)}</b><span>kcal attive ${dlt(a.kcal, b.kcal, '', true)}</span></div>
      <div><b>${fmtDur(a.min * 60000)}</b><span>${a.days} ${a.days === 1 ? 'giorno attivo' : 'giorni attivi'}</span></div>
    </div>
    <div class="lbl">Calorie attive da allenamento e corsa</div>
    <div class="kbars">${a.perDay.map((v, i) => `<div><i style="height:${v ? Math.max(4, v / mx * 100) : 0}%"></i><small>${v ? Math.round(v) : ''}</small><span>${wLetter(i)}</span></div>`).join('')}</div>
    ${a.mus.length ? `<div class="hx-mus">${a.mus.map(m => `<span>${m.n} ${fmtN(m.v)}</span>`).join('')}</div>` : ''}
    <button class="btn block" data-a="aiWeekOpen">${icon('sparkle', 16)} Analisi AI della settimana</button>
    ${off === 0 ? '<div class="small faint">Confronto con la settimana scorsa fino allo stesso giorno e ora.</div>' : ''}<div class="small faint">Le calorie sono una stima: servono a confrontare le settimane. L'obiettivo della dieta le include già (livello di attività), quindi non vanno rimangiate.</div></div>`;
}

/* ---------- actions ---------- */
Object.assign(A, {
  pastOpen(el) {
    const k = el?.dataset?.k, start = k ? kdate(k) + 18 * 3600e3 : pastDefault();
    UI.pastStart = Math.min(start, Date.now() - 3600e3);
    pushLayer({ type: 'sheet', title: 'Allenamento passato', items: [], html: `<div class="small muted" style="margin-bottom:10px">Scegli il giorno e cosa hai fatto: poi inserisci le serie come al solito.</div>
      <div class="past-grid" style="margin-bottom:12px"><label>Giorno<input type="date" class="input" id="pa-d" value="${dkey(UI.pastStart)}" max="${dkey(Date.now())}"></label><label>Ora<input type="time" class="input" id="pa-t" value="${hhmm(UI.pastStart)}"></label></div>
      <div class="list">${[{ id: '', name: 'Allenamento libero', ex: null }, ...S.routines].map(r => `<button class="li" data-a="pastGo" data-rid="${r.id}">${icon(r.ex ? 'layers' : 'plus', 20)}<div class="grow"><div class="t">${esc(r.name)}</div>${r.ex ? `<div class="s">${r.ex.length} esercizi</div>` : ''}</div>${icon('chev', 16)}</button>`).join('')}</div>` });
  },
  pastGo(el) {
    const d = $('#pa-d')?.value, t = $('#pa-t')?.value || '18:00'; let start = UI.pastStart;
    if (d) { const [y, mo, dd] = d.split('-').map(Number), [hh, mm] = t.split(':').map(Number); start = new Date(y, mo - 1, dd, hh || 0, mm || 0).getTime(); }
    if (start > Date.now()) { toast('Scegli un giorno passato'); return; }
    popLayer(); startPast(el.dataset.rid, start);
  },
  editHist(el) { const w = S.workouts.find(x => x.id === el.dataset.id); if (w) editWorkout(w); },
  calNav(el) { UI.calM = Math.min(0, (UI.calM || 0) + +el.dataset.d); render(); },
  calDay(el) {
    const k = el.dataset.k, t0 = kdate(k), future = t0 > Date.now();
    const ws = S.workouts.filter(w => dkey(w.start) === k), rs = runs().filter(r => dkey(r.start) === k), kc = dayKcal(t0);
    pushLayer({ type: 'sheet', title: fmtDateLong(t0), html: kc ? `<div class="small muted" style="margin-bottom:6px">${icon('flame', 14)} ~${Math.round(kc)} kcal attive da allenamento e corsa</div>` : (!ws.length && !rs.length ? `<div class="small muted" style="margin-bottom:6px">${future ? 'Giorno futuro.' : 'Nessun allenamento registrato.'}</div>` : ''), items: [
      ...ws.map(w => ({ label: w.name, desc: `${fmtDur((w.end || w.start) - w.start)} · ${wSetCount(w)} serie · ${fmtTon(wVolume(w))}`, ic: 'dumbbell', fn: () => setTimeout(() => pushLayer({ type: 'history', id: w.id }), 0) })),
      ...rs.map(r => ({ label: `${fmtN(r.km, 2)} km · ${runTitle(r)}`, desc: `${fmtClock(r.sec * 1000)} · ${paceTxt(runPace(r))}/km`, ic: 'runner', fn: () => setTimeout(() => pushLayer({ type: 'runView', id: r.id }), 0) })),
      ...(future ? [] : [
        { label: 'Aggiungi allenamento in palestra', ic: 'plus', fn: () => setTimeout(() => A.pastOpen({ dataset: { k } }), 0) },
        { label: 'Aggiungi corsa', ic: 'plus', fn: () => setTimeout(() => pushLayer({ type: 'runEdit', isNew: true, draft: { id: uid(), start: Math.min(t0 + 18 * 3600e3, Date.now() - 3600e3), sec: 0, km: 0, type: 'free', src: 'man' } }), 0) },
      ]),
    ] });
  },
  recapNav(el) { UI.recapOff = Math.max(0, (UI.recapOff || 0) + +el.dataset.d); render(); },
  recapOpen() { UI.recapOff = 1; UI.tab = 'progress'; UI.progSeg = 'train'; UI.layers = []; render(); window.scrollTo(0, 0); },
});
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.in; if (!k || !/^wo(Date|Time|Dur|Hr)$/.test(k) || !S.active?.past) return;
  const a = S.active;
  if (k === 'woDate' || k === 'woTime') {
    const d = $('[data-in="woDate"]')?.value, t = $('[data-in="woTime"]')?.value || '18:00';
    if (d) { const [y, mo, dd] = d.split('-').map(Number), [hh, mm] = t.split(':').map(Number); const s = new Date(y, mo - 1, dd, hh || 0, mm || 0).getTime(); if (s <= Date.now()) a.start = s; }
  }
  if (k === 'woDur') a.dur = Math.round(num(el.value) || 0) || null;
  if (k === 'woHr') { const v = num(el.value); a.hr = v ? Math.round(v) : undefined; }
  save();
});
