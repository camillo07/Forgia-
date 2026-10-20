/* =========================================================
   VIEWS (tabs)
   ========================================================= */
const UI = { tab: 'home', layers: [], scroll: {} };
const TABS = [
  { k: 'home', n: 'Oggi', ic: 'home' },
  { k: 'train', n: 'Allena', ic: 'dumbbell' },
  { k: 'diet', n: 'Dieta', ic: 'food' },
  { k: 'progress', n: 'Progressi', ic: 'chart' },
  { k: 'me', n: 'Profilo', ic: 'user' },
];

function render() {
  $('#tabbar').innerHTML = TABS.map(t => `<button data-a="tab" data-k="${t.k}" class="${UI.tab === t.k ? 'on' : ''}" aria-label="${t.n}">${icon(t.ic, 23)}<span>${t.n}</span></button>`).join('');
  const v = { home: viewHome, train: viewTrain, diet: viewDiet, progress: viewProgress, me: viewMe }[UI.tab];
  if (gateNeeded()) { $('#main').innerHTML = viewGate(); $('#tabbar').hidden = true; UI.layers = UI.layers.filter(l => l.type === 'pwReset'); renderLayers(); return; }
  $('#main').innerHTML = S.profile.onboarded ? v() : viewOnboard();
  $('#tabbar').hidden = !S.profile.onboarded;
  renderLayers();
}

function hexBadge(n, size = 52) {
  return `<span class="hex" style="width:${size}px;height:${size * 1.12}px"><svg viewBox="0 0 52 58" width="${size}" height="${size * 1.12}"><defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b2c"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs><path d="M26 2 49 15v28L26 56 3 43V15z" fill="url(#hg)"/><path d="M26 7 45 18v22L26 51 7 40V18z" fill="none" stroke="rgba(26,13,5,.25)" stroke-width="1.5"/></svg><b style="font-size:${size * 0.46}px">${n}</b></span>`;
}

/* ---------- onboarding ---------- */
function viewOnboard() {
  return `
  <div class="stack" style="gap:22px;padding-top:12px">
    <div class="row">${hexBadge('F', 60)}<div><div class="eyebrow">Benvenuto in</div><div class="page-head"><h1 style="font-size:46px">Forgia</h1></div></div></div>
    <p class="muted" style="margin:0;max-width:52ch">Allenamenti, dieta e corpo in un'unica app. Ogni serie che registri diventa record, statistiche e consigli. Iniziamo dalle basi.</p>
    <div class="card">
      <div class="seg" data-nt style="margin-bottom:4px">${LANGS.map(([k, n]) => `<button class="${lang() === k ? 'on' : ''}" data-a="setLang" data-v="${k}">${n}</button>`).join('')}</div>
      <div class="field"><label for="ob-name">Come ti chiami?</label><input id="ob-name" class="input" data-in="profile" data-f="name" value="${esc(S.profile.name)}" placeholder="Nome" autocomplete="given-name"></div>
      <div class="row"><div class="grow"><div class="lbl">Allenamenti a settimana</div><div class="small faint">Il tuo obiettivo per la streak settimanale</div></div>
        <div class="stepper"><button data-a="goal" data-d="-1" aria-label="Meno">−</button><span id="goalv">${S.profile.weeklyGoal}</span><button data-a="goal" data-d="1" aria-label="Più">+</button></div></div>
    </div>
    <div class="stack">
      <div class="section-title">Scegli un programma <span class="link muted" style="color:var(--muted)">facoltativo</span></div>
      ${PROGRAMS.map(p => `<label class="prog-card" style="cursor:pointer"><div class="row"><h4 class="grow">${p.name}</h4><input type="radio" name="ob-prog" value="${p.id}" style="width:22px;height:22px;accent-color:#ff6b2c"></div><div class="row wrap"><span class="chip warm">${p.freq}</span><span class="chip">${p.level}</span></div><p>${p.desc}</p></label>`).join('')}
      <label class="prog-card" style="cursor:pointer"><div class="row"><h4 class="grow">Creo io le mie schede</h4><input type="radio" name="ob-prog" value="" checked style="width:22px;height:22px;accent-color:#ff6b2c"></div></label>
    </div>
    <label class="row card tight" style="flex-direction:row;cursor:pointer"><input type="checkbox" id="ob-demo" style="width:22px;height:22px;accent-color:#ff6b2c"><div class="grow"><b>Aggiungi 6 settimane di dati di esempio</b><div class="small muted">Per vedere subito grafici e record. Li cancelli quando vuoi dal Profilo.</div></div></label>
    <button class="btn primary block" data-a="finishOnboard">Inizia ad allenarti</button>
  </div>`;
}

/* ---------- HOME ---------- */
function nextRoutine() {
  if (!S.routines.length) return null;
  const last = [...S.workouts].sort((a, b) => b.start - a.start).find(w => w.rid && S.routines.some(r => r.id === w.rid));
  if (!last) return S.routines[0];
  const i = S.routines.findIndex(r => r.id === last.rid);
  return S.routines[(i + 1) % S.routines.length];
}
function muscleCard(weekStart = startOfWeek(Date.now()), label = 'questa settimana') {
  const ms = weekMuscleSets(weekStart);
  const maxV = Math.max(22, ...ms.map(m => m.v));
  const mb = ms.map(m => {
    const pct = m.v / maxV * 100, cls = m.v >= 10 && m.v <= 20 ? 'in' : m.v > 20 ? 'over' : '';
    return `<div class="mbar"><span class="n">${m.n}</span><span class="track"><span class="zone" style="left:${10 / maxV * 100}%;width:${10 / maxV * 100}%"></span><span class="fill ${cls}" style="width:${pct}%"></span></span><span class="v">${fmtN(m.v)}</span></div>`;
  }).join('');
  return `<div class="card">
    <div class="section-title">Serie per muscolo <span class="small muted" style="font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:500">${label}</span></div>
    <div class="chips" style="margin:0;padding:0"><button class="chip ${!UI.msPrev ? 'on' : ''}" data-a="msWeek" data-v="0">Questa settimana</button><button class="chip ${UI.msPrev ? 'on' : ''}" data-a="msWeek" data-v="1">Settimana scorsa</button></div>
    ${muscleMapHTML(weekStart)}
    <div class="mbars">${mb}</div>
    <div class="small faint">Zona tratteggiata: 10–20 serie a settimana, range indicativo per l'ipertrofia. Le serie sui muscoli secondari contano 0,5.</div>
  </div>`;
}
function ringSVG(pct, size = 64, sw = 7, col = 'url(#hring)') {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, p = clamp(pct, 0, 1);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><linearGradient id="hring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b2c"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${sw}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
function viewHome() {
  const name = S.profile.name || 'atleta';
  const h = new Date().getHours();
  const greet = h < 5 ? 'Buonanotte' : h < 12 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const wk = startOfWeek(Date.now()), goal = S.profile.weeklyGoal, today = startOfDay(Date.now());
  const wkW = S.workouts.filter(w => w.start >= wk), lastW = S.workouts.filter(w => w.start >= wk - 7 * DAY && w.start < Date.now() - 7 * DAY);
  const vol = wkW.reduce((a, w) => a + wVolume(w), 0), volL = lastW.reduce((a, w) => a + wVolume(w), 0);
  const sets = wkW.reduce((a, w) => a + w.ex.reduce((b, e) => b + e.sets.filter(isWork).length, 0), 0);
  const km = runWeekKm(wk), streak = streakWeeks(), kcalW = [...Array(7)].reduce((a, _, i) => a + dayKcal(wk + i * DAY), 0);
  const days = [...Array(7)].map((_, i) => {
    const t = wk + i * DAY; const did = S.workouts.some(w => startOfDay(w.start) === t), ran = !did && (S.runs || []).some(r => startOfDay(r.start) === t && r.type !== 'walk');
    return `<div class="d"><span>${[...(WLETTER_L[lang()] || WLETTER_L.it)][i]}</span><span class="dot ${did || ran ? 'on' : ''} ${ran ? 'run' : ''} ${t === today ? 'today' : ''}">${did ? icon('check', 16, 3) : ran ? icon('runner', 16, 2.4) : t === today ? '' : ''}</span></div>`;
  }).join('');
  const nr = (UI.homeRid && S.routines.find(r => r.id === UI.homeRid)) || nextRoutine();
  let hero;
  if (S.runActive) {
    const ra = S.runActive;
    hero = `<div class="card hero hx"><div class="eyebrow">Corsa in corso</div><h2 class="hx-n">${kmTxt(ra.m)} km</h2><div class="muted small">${fmtClock(Math.max(0, runMoving(ra)) * 1000)} di corsa</div><button class="btn primary block lg" data-a="runOpen">${icon('play', 18)} Riprendi</button></div>`;
  } else if (S.active) {
    const a = S.active, dn = a.ex.reduce((x, e) => x + e.sets.filter(s => s.done).length, 0), tot = a.ex.reduce((x, e) => x + e.sets.length, 0);
    hero = `<div class="card hero hx"><div class="eyebrow">${a.past ? (a.editId ? 'Modifica da salvare' : 'Allenamento passato da salvare') : 'Allenamento in corso'}</div><h2 class="hx-n">${esc(a.name)}</h2>
      <div class="row"><div class="grow"><div class="xpbar" style="height:8px"><i style="width:${tot ? dn / tot * 100 : 0}%"></i></div></div><span class="small muted tnum">${dn}/${tot} serie · ${a.past ? fmtDate(a.start) : fmtClock(Date.now() - a.start)}</span></div>
      <button class="btn primary block lg" data-a="openWorkout">${icon('play', 18)} Riprendi</button></div>`;
  } else if (nr) {
    hero = `<div class="card hero hx">
      <div class="row"><div class="eyebrow grow">Allenamento di oggi</div>${S.routines.length > 1 ? `<button class="link" data-a="homePick">${icon('swap', 14)} Cambia</button>` : ''}</div>
      <h2 class="hx-n">${esc(nr.name)}</h2>
      <div class="hx-stats"><div><b>${nr.ex.length}</b><span>esercizi</span></div><div><b>${nr.ex.reduce((a, e) => a + planOf(e).filter(p => p.t !== 'w').length, 0)}</b><span>serie</span></div><div><b>~${estMinutes(nr)}</b><span>minuti</span></div></div>
      <button class="btn primary block lg" data-a="startRoutine" data-id="${nr.id}">${icon('play', 20)} Inizia allenamento</button></div>`;
  } else {
    hero = `<div class="card hero hx"><div class="eyebrow">Pronto?</div><h2 class="hx-n">Il primo allenamento</h2><p class="muted small" style="margin:0">Crea una scheda guidata o parti con un allenamento libero: aggiungi gli esercizi mentre ti alleni.</p><button class="btn primary block lg" data-a="wizardOpen">${icon('sparkle', 18)} Crea la tua scheda</button></div>`;
  }
  const qa = [
    ['startEmpty', 'dumbbell', 'Libero', ''], ['homeRun', 'runner', 'Corsa', ''], ['bodyLog', 'scale', 'Peso', ''],
    S.nutri ? ['foodAdd', 'food', 'Pasto', `data-m="${mealByTime()}"`] : ['tab', 'food', 'Dieta', 'data-k="diet"'],
  ];
  const ms = weekMuscleSets(wk).filter(m => m.v > 0).sort((a, b) => b.v - a.v);
  const mmax = Math.max(12, ...ms.map(m => m.v));
  const lastWo = [...S.workouts].sort((a, b) => b.start - a.start)[0];
  const d = derive();
  const recent = workoutsSorted().reverse().slice(0, 12).flatMap(w => (d.prByW[w.id] || []).filter(p => ['e1rm', 'reps', 'sec', 'km'].includes(p.type)).map(p => ({ ...p, t: w.start }))).slice(0, 6);
  const sec = {
    coach: () => todayCoachCard(),
    workout: () => hero,
    quick: () => `<div class="qa">${qa.map(([a, ic, n, extra]) => `<button data-a="${a}" ${extra}><span>${icon(ic, 22)}</span>${n}</button>`).join('')}</div>`,
    week: () => `<div class="card wk-card">
    <div class="row" style="gap:14px"><div class="wk-ring">${ringSVG(goal ? wkW.length / goal : 0)}<b>${wkW.length}<small>/${goal}</small></b></div>
      <div class="grow"><b style="font-size:17px">La tua settimana</b><div class="small muted">${wkW.length >= goal ? 'Obiettivo raggiunto, grande!' : `Ancora ${goal - wkW.length} ${goal - wkW.length === 1 ? 'allenamento' : 'allenamenti'} per l'obiettivo`}</div></div><button class="icon-btn" data-a="tab" data-k="progress" aria-label="Progressi">${icon('chev', 18)}</button></div>
    <div class="week">${days}</div>
    <div class="wk-stats"><div><b>${fmtTon(vol)}</b><span>volume${volL && vol ? ` <em class="${vol >= volL ? 'up' : 'dn'}">${vol >= volL ? '▲' : '▼'} ${Math.abs(Math.round((vol - volL) / volL * 100))}%</em>` : ''}</span></div><div><b>${sets}</b><span>serie</span></div><div><b>${fmtN(km, 1)}</b><span>km corsa</span></div><div><b>${fmtN(kcalW, 0)}</b><span>kcal attive</span></div></div>
  </div>${[1, 2].includes(new Date().getDay()) && weekStats(wk - 7 * DAY).n + weekStats(wk - 7 * DAY).runs ? recapCard(1, true) : ''}`,
    diet: () => dietHomeCard(),
    body: () => bodyHomeCard(),
    readiness: () => readinessCard(),
    load: () => loadCard(),
    muscles: () => ms.length ? `<button class="card tight mus-card" data-a="tab" data-k="progress" style="text-align:left"><div class="row"><b class="grow">Muscoli allenati</b><span class="small muted">serie questa settimana</span>${icon('chev', 16)}</div>
    <div class="mus">${ms.slice(0, 6).map(m => `<div><span>${m.n}</span><i><u style="width:${m.v / mmax * 100}%" class="${m.v >= 10 ? 'ok' : ''}"></u></i><b class="tnum">${fmtN(m.v)}</b></div>`).join('')}</div></button>` : '',
    last: () => lastWo ? `<button class="card tight last-wo" data-a="openHist" data-id="${lastWo.id}" style="text-align:left"><div class="row"><div class="grow"><div class="small muted">Ultimo allenamento · ${relDay(lastWo.start).toLowerCase()}</div><b style="font-size:17px">${esc(lastWo.name)}</b></div>${prCount(lastWo) ? `<span class="chip gold">${icon('trophy', 14)} ${prCount(lastWo)}</span>` : ''}${icon('chev', 18)}</div>
    <div class="lw-stats"><span>${icon('timer', 14)} ${fmtDur((lastWo.end || lastWo.start) - lastWo.start)}</span><span>${icon('dumbbell', 14)} ${fmtTon(wVolume(lastWo))}</span><span>${icon('layers', 14)} ${lastWo.ex.reduce((a, e) => a + e.sets.filter(isWork).length, 0)} serie</span></div></button>` : '',
    records: () => recent.length ? `<div class="stack"><div class="section-title">Ultimi record <button class="link" data-a="tab" data-k="progress">Tutti</button></div><div class="pr-scroll">${recent.map(p => { const x = ex(p.exId); return `<button data-a="openEx" data-id="${esc(p.exId)}">${thumbHTML(x)}<span class="pr-flag">${icon('trophy', 16)}</span><b>${esc(x.n)}</b><small>${prText(p)}</small><em>${relDay(p.t)}</em></button>`; }).join('')}</div></div>` : '',
  };
  const busy = S.active || S.runActive;
  return `
  <div class="home-head"><div class="grow"><div class="eyebrow">${fmtDateLong(Date.now())}</div><h1>${greet},<br><span>${esc(name)}</span></h1></div>
    <button class="streak ${streak ? 'on' : ''}" data-a="tab" data-k="me" aria-label="Settimane di fila">${icon('flame', 22)}<b>${streak}</b><small>${streak === 1 ? 'settimana' : 'settimane'}</small></button></div>
  ${busy ? hero : ''}
  ${homeLayout().filter(c => c.on && !(busy && c.k === 'workout')).map(c => sec[c.k]()).join('')}
  <button class="link home-edit" data-a="homeEdit">${icon('edit', 14)} Personalizza Oggi</button>
  `;
}
function estMinutes(r) { return Math.round(r.ex.reduce((a, e) => a + e.sets * (45 + (e.rest || 120)), 0) / 60); }

/* ---------- TRAIN ---------- */
function viewTrain() {
  if (UI.trainSeg === 'run') return viewRun();
  const card = r => `
    <div class="rt" data-rid="${r.id}">
      <div class="row"><h4 class="grow">${esc(r.name)}</h4><button class="icon-btn" data-a="routineMenu" data-id="${r.id}" aria-label="Opzioni scheda">${icon('more')}</button></div>
      <div class="ex">${r.ex.map(e => esc(ex(e.id).n)).join(' · ') || 'Nessun esercizio'}</div>
      <div class="row"><span class="small muted grow">${r.ex.length} esercizi · ${r.ex.reduce((a, e) => a + planOf(e).length, 0)} serie · ~${estMinutes(r)} min</span><button class="btn primary sm" data-a="startRoutine" data-id="${r.id}">${icon('play', 14)} Avvia</button></div>
    </div>`;
  const rts = routinesHTML(card);
  return `
  <div class="page-head"><h1>Allenamento</h1></div>
  ${trainSegHTML()}
  ${S.active ? `<button class="card hero" data-a="openWorkout" style="text-align:left"><div class="row"><div class="grow"><div class="eyebrow" style="color:var(--gold)">In corso</div><b style="font-size:17px">${esc(S.active.name)}</b></div>${icon('chev')}</div></button>` : ''}
  <div class="row"><button class="btn primary grow" data-a="startEmpty">${icon('play', 18)} Allenamento libero</button><button class="btn" data-a="newRoutine">${icon('plus', 18)} Scheda</button></div>
  <button class="link" data-a="pastOpen" style="align-self:flex-start;display:inline-flex;gap:6px;align-items:center;color:var(--gold);font-weight:600">${icon('calendar', 16)} Registra un allenamento passato</button>
  ${deloadCard()}
  <button class="li card tight" data-a="wizardOpen" style="flex-direction:row;text-align:left"><span style="color:var(--gold)">${icon('sparkle')}</span><div class="grow"><div class="t">Crea scheda guidata</div><div class="s">Obiettivo, metodi, muscoli carenti, preferenze e fastidi</div></div>${icon('chev')}</button>
  <div class="stack"><div class="section-title">Le mie schede <span class="row" style="gap:14px"><button class="link" data-a="importOpen">${icon('download', 14)} Importa</button><button class="link" data-a="folderNew">${icon('plus', 14)} Cartella</button></span></div>
    ${rts || `<div class="empty card">${icon('layers', 34)}<b>Nessuna scheda</b><span class="small">Creane una o aggiungi un programma qui sotto.</span></div>`}
  </div>
  ${recentWorkoutsCard()}
  <hr class="sep">
  <button class="li card tight" data-a="openLibrary" style="flex-direction:row">${icon('search')}<div class="grow"><div class="t">Libreria esercizi</div><div class="s">${EXMAP.size + S.customEx.length} esercizi con immagini e istruzioni</div></div>${icon('chev')}</button>
  <hr class="sep">
  <div class="stack"><button class="section-title" data-a="progToggle" style="width:100%;text-align:left">Programmi pronti <span class="row small muted" style="font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:500;gap:4px">${PROGRAMS.length} programmi ${icon(UI.progOpen ? 'up' : 'down', 18)}</span></button>
    ${!UI.progOpen ? '' : PROGRAMS.map(p => `<div class="prog-card"><div class="row"><h4 class="grow">${p.name}</h4></div><div class="row wrap"><span class="chip warm">${p.freq}</span><span class="chip">${p.level}</span><span class="chip">${p.routines.length} schede</span></div><p>${p.desc}</p><button class="btn sm" data-a="addProgram" data-id="${p.id}">${icon('plus', 16)} Aggiungi alle mie schede</button></div>`).join('')}
  </div>
  <hr class="sep">
  ${viewMethods()}`;
}

/* ---------- PROGRESS ---------- */
function viewProgress() {
  const d = derive();
  const st = globalStats();
  // heatmap 18 weeks
  const weeks = 18, wk0 = startOfWeek(Date.now()) - (weeks - 1) * 7 * DAY, today = startOfDay(Date.now());
  const volByDay = new Map();
  for (const w of S.workouts) { const k = startOfDay(w.start); volByDay.set(k, (volByDay.get(k) || 0) + wVolume(w) + 1); }
  const vols = [...volByDay.values()].sort((a, b) => a - b);
  const q = p => vols[Math.floor(p * (vols.length - 1))] || 0;
  let cells = '';
  for (let i = 0; i < weeks * 7; i++) {
    const t = wk0 + i * DAY;
    // column-major: grid-auto-flow column with 7 rows
    const v = volByDay.get(t) || 0;
    const lv = t > today ? 'fut' : !v ? '' : v <= q(.25) ? 'l1' : v <= q(.5) ? 'l2' : v <= q(.85) ? 'l3' : 'l4';
    cells += `<i class="${lv}" title="${fmtDate(t)}"></i>`;
  }
  // weekly volume last 10 weeks
  const wv = [];
  for (let i = 9; i >= 0; i--) {
    const s = startOfWeek(Date.now()) - i * 7 * DAY;
    wv.push({ t: s, v: S.workouts.filter(w => w.start >= s && w.start < s + 7 * DAY).reduce((a, w) => a + wVolume(w), 0) });
  }
  const recsAll = Object.entries(d.best).sort((a, b) => b[1].last - a[1].last), recs = UI.moreRec ? recsAll : recsAll.slice(0, 8);
  const histAll = [...S.workouts].sort((a, b) => b.start - a.start), hist = UI.moreHist ? histAll : histAll.slice(0, 8);
  return `
  <div class="page-head"><h1>Progressi</h1></div>
  ${progSegHTML()}
  ${UI.progSeg === 'body' ? viewBody() : `${recapCard()}
  ${loadCard()}
  ${calendarCard()}
  ${corrCard()}
  <div class="tiles">
    <div class="tile"><div class="v">${st.n}</div><div class="k">Allenamenti</div></div>
    <div class="tile"><div class="v">${fmtN(st.vol / 1000, 1)}<small>t</small></div><div class="k">Volume totale</div></div>
    <div class="tile"><div class="v">${st.prs}</div><div class="k">Record</div></div>
  </div>
  ${muscleCard(UI.msPrev ? startOfWeek(Date.now()) - 7 * DAY : startOfWeek(Date.now()), UI.msPrev ? 'settimana scorsa' : 'questa settimana')}
  <div class="card"><div class="section-title">Costanza <span class="small muted" style="font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:500">ultime 18 settimane</span></div><div style="overflow-x:auto"><div class="heat">${cells}</div></div></div>
  <div class="card"><div class="section-title">Volume settimanale</div>${barChart(wv.map(x => ({ l: fmtDate(x.t), v: x.v / 1000 })), 't')}</div>
  ${frequentTraining()}
  <div class="stack"><div class="section-title">Record per esercizio</div>
    ${recs.length ? `<div class="list">${recs.map(([id, b]) => { const x = ex(id); return `<button class="li" data-a="openEx" data-id="${esc(id)}">${thumbHTML(x)}<div class="grow"><div class="t">${esc(x.n)}</div><div class="s">${b.kg && b.mt !== 'time' ? 'Max ' + fmtKg(b.kg) + ' kg · ' : ''}${b.sessions} sedute</div></div><div class="meta">${b.mt === 'time' ? `<b style="color:var(--fg);font-size:15px">${fmtN(b.sec, 0)} s</b><br>tempo max` : b.mt === 'dist' ? `<b style="color:var(--fg);font-size:15px">${fmtN(b.km, 1)} km</b><br>distanza max` : b.kg ? `<b style="color:var(--fg);font-size:15px">${fmtKg(b.e1rm)}</b><br>1RM st.` : `<b style="color:var(--fg);font-size:15px">${b.reps}</b><br>reps max`}</div></button>`; }).join('')}</div>${recsAll.length > recs.length ? `<button class="btn ghost" data-a="more" data-k="moreRec">Mostra tutti (${recsAll.length})</button>` : ''}` : `<div class="card tight muted small">Completa un allenamento per vedere i tuoi record.</div>`}
  </div>
  <div class="stack"><div class="section-title">Cronologia</div>
    ${hist.length ? `<div class="list">${hist.map(w => { const pc = prCount(w); return `<button class="li" data-a="openHist" data-id="${w.id}"><div class="grow"><div class="t">${esc(w.name)} ${w.demo ? '<span class="demo-tag">esempio</span>' : ''}</div><div class="s">${relDay(w.start)} · ${fmtDur(w.end - w.start)} · ${fmtTon(wVolume(w))}</div></div>${pc ? `<span class="chip gold">${icon('trophy', 14)} ${pc}</span>` : ''}${icon('chev', 18)}</button>`; }).join('')}</div>${histAll.length > hist.length ? `<button class="btn ghost" data-a="more" data-k="moreHist">Mostra tutti (${histAll.length})</button>` : ''}` : `<div class="card tight muted small">Nessun allenamento ancora.</div>`}
  </div>`}`;
}
function progSegHTML() { return `<div class="seg"><button class="${UI.progSeg !== 'body' ? 'on' : ''}" data-a="progSeg" data-v="train">Allenamento</button><button class="${UI.progSeg === 'body' ? 'on' : ''}" data-a="progSeg" data-v="body">Corpo</button></div>`; }

/* ---------- PROFILE ---------- */
function viewMe() {
  const bs = badgeState();
  const got = bs.filter(b => b.got).length;
  const hasDemo = S.workouts.some(w => w.demo) || Object.values(S.diary).some(d => (d.e || []).some(e => e.demo)) || Object.values(S.body || {}).some(d => d.demo) || (S.runs || []).some(r => r.demo);
  return `
  <div class="page-head"><h1>Profilo</h1></div>
  <div class="card hero"><div class="row"><div class="grow"><div class="rank" style="font-size:28px">${esc(S.profile.name || 'Atleta')}</div><div class="small muted">In Forgia da ${S.workouts.length ? fmtDate(Math.min(...S.workouts.map(w => w.start))) : 'oggi'}</div></div><span class="pr-flag">${icon('trophy', 30)}</span></div>
    <div class="tiles"><div class="tile" style="background:var(--surface-2)"><div class="v">${S.workouts.length}</div><div class="k">Allenamenti</div></div><div class="tile" style="background:var(--surface-2)"><div class="v">${globalStats().prs}</div><div class="k">Record</div></div><div class="tile" style="background:var(--surface-2)"><div class="v">${got}<small>/${bs.length}</small></div><div class="k">Traguardi</div></div></div></div>
  ${syncConfigured() || !window.FORGIA_PWA ? `<div class="stack"><div class="section-title">Account</div>${accountCard()}</div>` : ''}
  <div class="stack"><div class="section-title">Traguardi <span class="small muted" style="font-family:var(--font-body);text-transform:none;letter-spacing:0">${got}/${bs.length}</span></div>
    <div class="badges">${bs.map(b => `<div class="badge ${b.got ? 'got' : ''}"><span class="ic">${icon(b.ic, 22)}</span><span class="n">${b.n}</span><span class="p">${b.got ? b.d : fmtN(Math.min(b.val, b.goal), 0) + ' / ' + b.goal}</span></div>`).join('')}</div>
  </div>
  <div class="stack"><div class="section-title">Impostazioni</div>
    <div class="card">
      <div class="field"><label for="pf-name">Nome</label><input id="pf-name" class="input" data-in="profile" data-f="name" maxlength="30" value="${esc(S.profile.name)}"></div>
      <div class="stack" style="gap:8px"><div><div class="lbl">Lingua dell'app</div><div class="small faint">Testi, date, voce della corsa e risposte dell'AI</div></div><div class="seg" data-nt>${LANGS.map(([k, n]) => `<button class="${lang() === k ? 'on' : ''}" data-a="setLang" data-v="${k}">${n}</button>`).join('')}</div></div>
      <div class="stack" style="gap:8px"><div><div class="lbl">Nomi degli esercizi</div><div class="small faint">La ricerca funziona in tutte le lingue</div></div><div class="seg" data-nt>${[['en', 'English'], ['it', 'Italiano'], ['es', 'Español']].map(([k, n]) => `<button class="${(S.profile.exLang || 'en') === k ? 'on' : ''}" data-a="exLang" data-v="${k}">${n}</button>`).join('')}</div></div>
      <div class="row"><div class="grow"><div class="lbl">Obiettivo settimanale</div><div class="small faint">Quanti allenamenti vuoi fare a settimana</div></div><div class="stepper"><button data-a="goal" data-d="-1" aria-label="Meno">−</button><span id="goalv">${S.profile.weeklyGoal}</span><button data-a="goal" data-d="1" aria-label="Più">+</button></div></div>
      <div class="row"><div class="grow"><div class="lbl">Recupero predefinito</div><div class="small faint">Per gli allenamenti liberi</div></div><select id="pf-rest" class="input" style="width:auto" data-in="profile" data-f="restDefault">${[60, 90, 120, 150, 180, 240, 300].map(s => `<option value="${s}" ${S.profile.restDefault == s ? 'selected' : ''}>${fmtClock(s * 1000)}</option>`).join('')}</select></div>
      <div class="sub-h">Timer di recupero</div>
      <div class="row"><div class="grow"><div class="lbl">Suono fine recupero</div><div class="small faint">Suona sopra la tua musica senza fermarla, con l'app aperta. Non suona se l'iPhone è in silenzioso</div></div><button class="switch ${S.profile.sound ? 'on' : ''}" data-a="toggleSound" aria-label="Suono"></button></div>
      ${S.profile.sound ? `<div class="row"><span class="lbl grow">Suono</span><select class="input" style="width:auto" data-in="soundKind" aria-label="Suono">${Object.entries(TIMER_SOUNDS).map(([k, v]) => `<option value="${k}" ${(S.profile.soundKind || 'bip') === k ? 'selected' : ''}>${v.n}</option>`).join('')}</select><button class="btn sm" data-a="soundTest">${icon('play', 14)} Prova</button></div>
      <div class="row"><span class="lbl grow">Volume</span><div class="seg" style="width:200px">${[['low', 'Basso'], ['mid', 'Medio'], ['high', 'Alto']].map(([k, n]) => `<button class="${(S.profile.soundVol || 'mid') === k ? 'on' : ''}" data-a="soundVol" data-v="${k}">${n}</button>`).join('')}</div></div>
      <div class="row"><div class="grow"><div class="lbl">Avviso a 10 secondi</div><div class="small faint">Un suono leggero quando mancano 10 secondi</div></div><button class="switch ${S.profile.restWarn ? 'on' : ''}" data-a="toggleRestWarn" aria-label="Avviso a 10 secondi"></button></div>` : ''}
      <div class="row"><div class="grow"><div class="lbl">Recupero sulla schermata di blocco</div><div class="small faint">Il timer resta visibile e suona anche col telefono bloccato. Attenzione: l'iPhone lo tratta come un brano, quindi <b>ferma Spotify o Apple Music</b></div></div><button class="switch ${S.profile.lockTimer === true ? 'on' : ''}" data-a="toggleLockTimer" aria-label="Recupero sulla schermata di blocco"></button></div>
      <div class="row"><div class="grow"><div class="lbl">Obiettivo passi</div><div class="small faint">Al giorno</div></div><select class="input" style="width:auto" data-in="stepsGoal" aria-label="Obiettivo passi">${[5000, 6000, 7000, 8000, 10000, 12000, 15000].map(v => `<option value="${v}" ${stepsGoal() === v ? 'selected' : ''}>${fmtN(v, 0)}</option>`).join('')}</select></div>
      <div class="row"><div class="grow"><div class="lbl">Il giorno del diario finisce alle</div><div class="small faint">Uno spuntino all'una di notte conta per la sera prima</div></div><select class="input" style="width:auto" data-in="dayEnd" aria-label="Fine giornata">${[0, 1, 2, 3, 4, 5].map(h => `<option value="${h}" ${(S.profile.dayEnd || 0) === h ? 'selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select></div>
    </div>
  </div>
  <div class="stack"><div class="section-title">Coach AI</div>
    <div class="card">
      ${SAMPLE ? `<div class="small" style="color:var(--good)">${icon('check', 14)} In questa anteprima su Claude l'AI usa il tuo account Claude: non serve la chiave.</div>` : ''}
      <div class="small muted">Serve per la chat con il coach, per stimare piatti fuori casa e cibi non presenti, e per le analisi della giornata e degli obiettivi. I consigli base del coach funzionano anche senza.</div>
      <button class="btn block" data-a="chatOpen">${icon('sparkle', 16)} Apri la chat con il coach</button>
      <div class="field"><label for="ai-key">Chiave API Anthropic</label><input id="ai-key" class="input" type="password" autocomplete="off" data-in="aiKey" value="${esc(S.ai?.key || '')}" placeholder="sk-ant-..."></div>
      <div class="field"><label for="ai-model">Modello</label><select id="ai-model" class="input" data-in="aiModel">${AI_MODELS.map(m => `<option value="${m.k}" ${S.ai?.model === m.k ? 'selected' : ''}>${m.l}</option>`).join('')}</select></div>
      <div class="row"><button class="btn sm" data-a="aiTest">Prova la connessione</button><span id="ai-test" class="small"></span></div>
      <div class="small faint">La chiave si crea su console.anthropic.com (API keys) e si paga a consumo: con Haiku un'analisi costa meno di 1 centesimo. Resta salvata solo su questo telefono e non finisce nei backup.</div>
    </div>
  </div>
  <div class="stack"><div class="section-title">Collegamenti</div>
    <div class="list"><button class="li" data-a="healthSetup">${icon('watch')}<div class="grow"><div class="t">Apple Salute</div><div class="s">${hasHealth() ? 'Ultimi dati ' + relDay(kdate(lastHealthKey())).toLowerCase() + (S.health[lastHealthKey()].at ? ' alle ' + esc(S.health[lastHealthKey()].at) : '') : 'HRV, sonno, passi, calorie dall\'Apple Watch'}</div></div>${icon('chev', 18)}</button></div>
  </div>
  <div class="stack"><div class="section-title">Dati</div>
    <div class="list">
      <button class="li" data-a="exportData">${icon('download')}<div class="grow"><div class="t">Esporta backup</div><div class="s">File JSON con tutti i tuoi dati</div></div></button>
      <label class="li" style="cursor:pointer">${icon('upload')}<div class="grow"><div class="t">Importa backup</div><div class="s">Sostituisce i dati attuali</div></div><input type="file" id="importFile" accept=".json,application/json" hidden></label>
      ${hasDemo ? `<button class="li" data-a="removeDemo">${icon('trash')}<div class="grow"><div class="t">Rimuovi dati di esempio</div><div class="s">Tiene solo i tuoi dati reali</div></div></button>` : `<button class="li" data-a="addDemo">${icon('sparkle')}<div class="grow"><div class="t">Carica dati di esempio</div><div class="s">6 settimane di allenamenti e corse, 2 di diario e il peso</div></div></button>`}
    </div>
    <div class="small faint">${SYNC.user ? 'I dati sono salvati su questo dispositivo e sincronizzati con il tuo account.' : 'I dati sono salvati solo su questo dispositivo. Accedi con un account per salvarli online, oppure fai un backup ogni tanto.'}</div>
  </div>
  <div class="stack"><div class="section-title" style="color:var(--bad)">Zona pericolosa</div>
    <div class="card" style="border:1px solid rgba(255,92,108,.3)">
      <div><b>Elimina tutti i dati</b><div class="small muted">Cancella allenamenti, schede, diario, cibi creati, obiettivi e impostazioni da questo dispositivo. Non si può annullare.</div></div>
      <button class="btn danger block" data-a="resetAll">${icon('trash', 18)} Elimina tutti i dati</button>
    </div>
    <div class="small faint">Fonti: esercizi free-exercise-db (pubblico dominio) · alimenti CIQUAL 2017 (ANSES) e Open Food Facts (ODbL).</div>
  </div>`;
}

/* ---------- charts ---------- */
function barChart(data, unit) {
  const W = 320, H = 150, pl = 30, pb = 22, pt = 10;
  const max = Math.max(1, ...data.map(d => d.v));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const bw = (W - pl) / data.length;
  let g = '';
  for (let v = 0; v <= top + 1e-9; v += step) {
    const y = pt + (H - pt - pb) * (1 - v / top);
    g += `<line x1="${pl}" x2="${W}" y1="${y}" y2="${y}" stroke="#2c3440" stroke-width="1"/><text x="${pl - 6}" y="${y + 3}" text-anchor="end">${fmtN(v, 1)}</text>`;
  }
  const bars = data.map((d, i) => {
    const h = (H - pt - pb) * (d.v / top), x = pl + i * bw + bw * 0.18, y = H - pb - h, last = i === data.length - 1;
    return `<rect x="${x}" y="${y}" width="${bw * 0.64}" height="${Math.max(0, h)}" rx="3" fill="${last ? 'url(#heatg)' : '#3a4350'}"/>` +
      (i % 2 === (data.length - 1) % 2 ? `<text x="${x + bw * 0.32}" y="${H - 6}" text-anchor="middle">${d.l}</text>` : '');
  }).join('');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafico a barre (${unit})"><defs><linearGradient id="heatg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff6b2c"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs>${g}${bars}</svg>`;
}
function niceStep(max) {
  const raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
function lineChart(pts, unit) {
  if (pts.length < 2) return `<div class="small muted">Servono almeno due sedute per il grafico.</div>`;
  const W = 320, H = 160, pl = 34, pr = 10, pt = 12, pb = 22;
  const ys = pts.map(p => p.y), mn = Math.min(...ys), mx = Math.max(...ys);
  const pad = Math.max(1, (mx - mn) * 0.15);
  const step = niceStep((mx - mn + 2 * pad) || 4);
  const lo = Math.floor((mn - pad) / step) * step, hi = Math.ceil((mx + pad) / step) * step;
  const t0 = pts[0].x, t1 = pts[pts.length - 1].x;
  const X = t => pl + (W - pl - pr) * ((t - t0) / ((t1 - t0) || 1));
  const Y = v => pt + (H - pt - pb) * (1 - (v - lo) / ((hi - lo) || 1));
  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2c3440"/><text x="${pl - 6}" y="${Y(v) + 3}" text-anchor="end">${fmtN(v, 0)}</text>`;
  const line = pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
  const area = line + ` L${X(t1)} ${H - pb} L${X(t0)} ${H - pb} Z`;
  const last = pts[pts.length - 1];
  const lab = `<text x="${pl}" y="${H - 6}">${fmtDate(t0)}</text><text x="${W - pr}" y="${H - 6}" text-anchor="end">${fmtDate(t1)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento (${unit})"><defs><linearGradient id="areag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6b2c" stop-opacity=".35"/><stop offset="1" stop-color="#ff6b2c" stop-opacity="0"/></linearGradient></defs>${g}<path d="${area}" fill="url(#areag)"/><path d="${line}" fill="none" stroke="#ff8a3d" stroke-width="2.2" stroke-linejoin="round"/>${pts.map(p => `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="2.2" fill="#ff8a3d"/>`).join('')}<circle cx="${X(last.x)}" cy="${Y(last.y)}" r="5" fill="#ffb547" stroke="#11151b" stroke-width="2"/>${lab}</svg>`;
}

function frequentTraining() {
  if (!S.workouts.length) return '';
  const byName = new Map(), byEx = new Map();
  for (const w of S.workouts) {
    byName.set(w.name, (byName.get(w.name) || 0) + 1);
    for (const e of w.ex) { const o = byEx.get(e.id) || { s: 0, sets: 0, vol: 0 }; o.s++; o.sets += e.sets.filter(isWork).length; o.vol += workSets(e).reduce((a, x) => a + x.kg * x.r, 0); byEx.set(e.id, o); }
  }
  const tw = [...byName.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const te = [...byEx.entries()].sort((a, b) => b[1].sets - a[1].sets).slice(0, 5);
  const maxS = te[0]?.[1].sets || 1;
  return `<div class="card"><div class="section-title">I più frequenti</div>
    <div class="row wrap">${tw.map(([n, c]) => `<span class="chip warm">${esc(n)} · ${c}×</span>`).join('')}</div>
    <div class="stack" style="gap:8px">${te.map(([id, o], k) => `<button class="row" data-a="openEx" data-id="${esc(id)}" style="text-align:left"><span class="rank-n">${k + 1}</span><div class="grow" style="min-width:0"><div class="row"><b class="grow" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px">${esc(ex(id).n)}</b><span class="small muted tnum">${o.sets} serie · ${o.s} sedute</span></div><div class="xpbar" style="height:6px;margin-top:5px"><i style="width:${o.sets / maxS * 100}%"></i></div></div></button>`).join('')}</div></div>`;
}

function prText(p) { return p.type === 'reps' ? 'Record ripetizioni: ' + p.value : p.type === 'sec' ? 'Tempo record: ' + p.value + ' s' : p.type === 'km' ? 'Distanza record: ' + fmtN(p.value, 2) + ' km' : p.type === 'kg' ? 'Peso massimo: ' + fmtKg(p.value) + ' kg' : '1RM stimato ' + fmtKg(p.value) + ' kg'; }
