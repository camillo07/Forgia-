/* =========================================================
   COACH: poche indicazioni concrete per oggi · carico settimanale unico (palestra + corsa)
   · "rispetto all'ultima volta" · progressione sul RIR · versione leggera · Home personalizzabile
   ========================================================= */

/* ---------- progression driven by RIR ---------- */
function rirSuggestion(aex, wid) {
  const last = lastSession(aex.id, wid); if (!last) return null;
  const ws = workSets(last.e); if (!ws.length) return null;
  const top = Math.max(...ws.map(s => s.kg || 0)), atTop = ws.filter(s => (s.kg || 0) === top), rirs = atTop.map(s => s.rir).filter(v => v != null);
  if (!rirs.length) return { kind: 'hold', kg: top, text: `<b>${fmtKg(top)} kg</b>. Per la progressione sul RIR segna quante ripetizioni ti restavano in ogni serie (colonna RIR).` };
  const avg = rirs.reduce((a, b) => a + b, 0) / rirs.length, T = rirTarget(aex), inc = increment(ex(aex.id)) || 2.5;
  if (avg >= T + 1.5) { const kg = +(top + inc * (avg >= T + 3 ? 2 : 1)).toFixed(2); return { kind: 'up', kg, text: `Ultima volta RIR ${fmtN(avg, 1)}, più facile del previsto (${T}): <b>passa a ${fmtKg(kg)} kg</b>.` }; }
  if (avg <= T - 1) { const kg = roundKg(top * 0.95, aex.id); return { kind: 'down', kg, text: `Ultima volta RIR ${fmtN(avg, 1)}, troppo vicino al cedimento: <b>${fmtKg(kg)} kg</b> e torna a RIR ${T}.` }; }
  return { kind: 'hold', kg: top, text: `RIR ${fmtN(avg, 1)} come previsto: <b>resta a ${fmtKg(top)} kg</b> e prova a fare 1 ripetizione in più allo stesso RIR.` };
}

/* ---------- today vs last time ---------- */
function vsLastHTML(e) {
  if (!S.active) return '';
  const mt = mtOf(e), done = e.sets.filter(s => s.done && isWork(s) && setDone(s, mt)); if (!done.length) return '';
  const last = lastSession(e.id, S.active.id); if (!last) return '';
  const lw = workSets(last.e); if (!lw.length) return '';
  let a, b, sa, sb;
  if (mt === 'time') { sa = done.reduce((m, s) => (s.sec || 0) > (m.sec || 0) ? s : m, done[0]); sb = lw.reduce((m, s) => (s.sec || 0) > (m.sec || 0) ? s : m, lw[0]); a = sa.sec || 0; b = sb.sec || 0; }
  else if (mt === 'dist') { sa = done.reduce((m, s) => (s.km || 0) > (m.km || 0) ? s : m, done[0]); sb = lw.reduce((m, s) => (s.km || 0) > (m.km || 0) ? s : m, lw[0]); a = sa.km || 0; b = sb.km || 0; }
  else {
    const score = s => s.kg ? e1rm(s.kg, s.r) : s.r;
    sa = done.reduce((m, s) => score(s) > score(m) ? s : m, done[0]); sb = lw.reduce((m, s) => score(s) > score(m) ? s : m, lw[0]); a = score(sa); b = score(sb);
  }
  if (!b) return '';
  const d = (a - b) / b, cls = Math.abs(d) < 0.01 ? 'eq' : d > 0 ? 'up' : 'dn';
  return `<div class="vs-last ${cls}"><span>Oggi <b>${fmtSet(sa, mt)}</b> · ultima volta ${fmtSet(sb, mt)}</span><em>${cls === 'eq' ? '= uguale' : (d > 0 ? '▲ +' : '▼ −') + fmtN(Math.abs(d * 100), 1) + '%'}</em></div>`;
}

/* ---------- weekly load (session RPE × minutes) for gym and running ---------- */
const RUN_RPE = { easy: 4, long: 5, tempo: 7, int: 8, race: 9, walk: 2, free: 5 };
function wLoad(w) {
  const min = clamp(((w.end || w.start) - w.start) / 60000, 10, 180);
  const rirs = w.ex.flatMap(e => (e.sets || []).filter(isWork).map(s => s.rir)).filter(v => v != null);
  const rpe = rirs.length ? clamp(10 - rirs.reduce((a, b) => a + b, 0) / rirs.length, 5, 10) : 7.5;
  return min * rpe * 0.9;
}
function rLoad(r) { return r.sec / 60 * (r.rpe || RUN_RPE[r.type] || 5); }
function loadBetween(t0, t1) {
  let g = 0, r = 0;
  for (const w of S.workouts) if (w.start >= t0 && w.start < t1) g += wLoad(w);
  for (const x of runs()) if (x.start >= t0 && x.start < t1) r += rLoad(x);
  return { g, r, t: g + r };
}
function loadRatio() {
  const now = Date.now(), first = Math.min(...S.workouts.map(w => w.start), ...runs().map(r => r.start), now);
  if (now - first < 21 * DAY) return null;
  const acute = loadBetween(now - 7 * DAY, now).t, chronic = loadBetween(now - 28 * DAY, now).t / 4;
  if (chronic < 150) return null;
  return { acute, chronic, ratio: acute / chronic };
}
function loadZone(x) { return x == null ? null : x < 0.8 ? ['Sotto il solito', 'steel'] : x <= 1.3 ? ['Nella norma', 'good'] : x <= 1.5 ? ['In aumento', 'gold'] : ['Troppo in fretta', 'bad']; }
function loadCard() {
  const ws = startOfWeek(Date.now()), weeks = [];
  for (let i = 7; i >= 0; i--) { const s = ws - i * 7 * DAY; weeks.push({ s, ...loadBetween(s, s + 7 * DAY) }); }
  if (!weeks.some(w => w.t)) return '';
  const mx = Math.max(...weeks.map(w => w.t), 1), lr = loadRatio(), z = loadZone(lr?.ratio);
  return `<div class="card"><div class="section-title">Carico settimanale</div>
    ${lr ? `<div class="row"><div class="grow"><div class="small muted">Ultimi 7 giorni rispetto alla media di 4 settimane</div><b style="font-size:22px;color:var(--${z[1]})">${z[0]}</b></div><b class="tnum" style="font-size:26px;font-family:var(--font-display)">${fmtN(lr.ratio, 2)}×</b></div>` : '<div class="small muted">Servono 3 settimane di dati per confrontare il carico con il tuo solito.</div>'}
    <div class="ld-bars">${weeks.map((w, i) => `<div title="${fmtDate(w.s)}"><i class="r" style="height:${w.r / mx * 100}%"></i><i class="g" style="height:${w.g / mx * 100}%"></i><span>${i === weeks.length - 1 ? 'ora' : fmtDate(w.s).split(' ')[0]}</span></div>`).join('')}</div>
    <div class="row small muted" style="gap:14px"><span><u class="dg"></u> Palestra</span><span><u class="dr"></u> Corsa</span></div>
    <div class="small faint">Carico = minuti × fatica (RIR in palestra, tipo di corsa o fatica percepita). Tra 0,8 e 1,3 volte il solito sei nella zona sicura. Sopra 1,5 il rischio di stancarti troppo o farti male sale: in quel caso non aggiungere serie o chilometri.</div></div>`;
}

/* ---------- today's coach ---------- */
function plannedRoutine() { return (UI.homeRid && S.routines.find(r => r.id === UI.homeRid)) || nextRoutine(); }
function aexPreview(e) { const plan = planOf(e), w0 = plan.find(p => p.t !== 'w') || plan[0] || {}; return { id: e.id, mt: exType(e.id), rmin: w0.a, rmax: w0.b ?? w0.a, rir: e.rir, tags: e.tags || [], prog: e.prog, sets: plan.map(p => ({ t: p.t || 'n', ta: p.a ?? null, tb: p.b ?? null, rm: p.rm, bpct: p.pct })) }; }
function proteinIdea(g) { return g >= 60 ? '300 g di yogurt greco + 1 misurino di whey + 150 g di pollo' : g >= 35 ? '150 g di pollo o tacchino, oppure yogurt greco + whey' : '1 misurino di whey o 250 g di albume'; }
function coachItems() {
  const items = [], k = todayKey(), t0 = kdate(k), hr = new Date().getHours(), add = (p, c, ic, t, d, btn) => items.push({ p, c, ic, t, d, btn });
  const nr = plannedRoutine(), trained = S.workouts.filter(w => w.start >= t0 && w.start < t0 + DAY), ranToday = runs().some(r => r.start >= t0 && r.start < t0 + DAY);
  /* recovery & sleep */
  let red = false;
  if (healthRecent()) {
    const s = scoresToday(), z = zone(s.rec.score), sl = dayVal(k, 'sleep');
    if (z === 'r') { red = true; add(95, 'r', 'heart', `Recupero basso (${s.rec.score})`, 'Oggi versione leggera: una serie in meno per esercizio e 1 ripetizione di margine in più. Stasera punta a 8 ore di sonno.', nr && !trained.length && !S.active ? { a: 'startLight', id: nr.id, l: 'Versione leggera' } : null); }
    else if (z === 'g') add(48, 'g', 'bolt', `Recupero alto (${s.rec.score})`, 'Giornata buona per spingere: prova un record sul primo esercizio.');
    else if (z === 'y') add(30, 'y', 'heart', `Recupero nella media (${s.rec.score})`, 'Segui la scheda e lascia 2 ripetizioni di margine.');
    if (sl != null && sl < 6.5) add(72, 'y', 'moon', `Hai dormito ${fmtN(sl, 1)} h`, 'Con poco sonno la forza cala: non cercare record oggi e stasera vai a letto prima.');
  }
  /* training */
  if (trained.length) {
    const w = trained[trained.length - 1], pc = prCount(w);
    add(28, 'g', 'check', 'Allenamento fatto', `${esc(w.name)}: ${wSetCount(w)} serie${pc ? ` e ${pc} ${pc === 1 ? 'record' : 'record'}` : ''}. Ora proteine e recupero.`);
  } else if (!S.active && nr && dayType(k) === 'train') {
    const first = nr.ex.find(e => ['wr', 'bw'].includes(exType(e.id)));
    const sg = first ? deloadAdj(suggestion(aexPreview(first)), aexPreview(first)) : null;
    add(red ? 20 : 60, 'o', 'dumbbell', `Oggi: ${esc(nr.name)}`, first && sg ? `${esc(ex(first.id).n)} — ${sg.text}` : `${nr.ex.length} esercizi, circa ${estMinutes(nr)} minuti.`, red ? null : { a: 'startRoutine', id: nr.id, l: 'Inizia' });
  } else if (!S.active && !ranToday && dayType(k) === 'rest') add(18, 'b', 'moon', 'Giorno di riposo', 'Cammina, mangia le tue proteine e dormi bene: i muscoli crescono oggi.');
  /* load */
  const lr = loadRatio();
  if (lr && lr.ratio > 1.5) add(80, 'r', 'bolt', 'Carico in forte aumento', `Ultimi 7 giorni: ${fmtN((lr.ratio - 1) * 100, 0)}% sopra la tua media. Oggi non aggiungere serie o chilometri e tieni 2 ripetizioni di margine.`);
  else if (lr && lr.ratio > 1.3) add(42, 'y', 'bolt', 'Carico in aumento', `${fmtN((lr.ratio - 1) * 100, 0)}% sopra la tua media di 4 settimane: va bene, ma non salire ancora questa settimana.`);
  /* nutrition */
  if (S.nutri) {
    const tg = targetsFor(k), logged = dayEntries(k).length, tot = dayTotals(k).tot;
    if (hr >= 12 && !logged) add(55, 'y', 'food', 'Diario vuoto', 'Registra i pasti di oggi: senza diario non posso controllare calorie e proteine.', { a: 'foodAdd', m: mealByTime(), l: 'Aggiungi' });
    else if (logged && tg) {
      const frac = clamp((hr - 7) / 14, 0, 1), miss = Math.round(tg.p - tot.p);
      if (hr >= 14 && tot.p < tg.p * frac - 25 && miss > 15) add(66, 'y', 'target', `Proteine: mancano ${miss} g`, `Sei a ${fmtN(tot.p, 0)} su ${tg.p} g. Per esempio: ${proteinIdea(miss)}.`, { a: 'foodAdd', m: mealByTime(), l: 'Aggiungi' });
      if (hr >= 20 && tot.kcal > tg.kcal + 200) add(46, 'y', 'flame', `Sopra di ${fmtN(tot.kcal - tg.kcal, 0)} kcal`, 'Nessun dramma: conta la media della settimana. Domani resta sul target, senza compensare.');
    }
  }
  /* weight */
  const wn = weightNow(), wToday = dayVal(k, 'w');
  if (hr < 12 && wToday == null && (wn || S.nutri)) add(57, 'b', 'scale', 'Pesati', 'Al mattino, a digiuno, dopo il bagno: serve alla media dei 7 giorni.', { a: 'bodyLog', l: 'Registra' });
  if (wn && wn.rate != null && Date.now() - wn.t < 4 * DAY) {
    const cutting = S.nutri && ((!S.nutri.manual && S.nutri.rate < 0) || (S.nutri.manual && S.profile.goalW && S.profile.goalW < wn.trend - 0.5) || (!S.nutri.manual && S.profile.goalW && S.profile.goalW < wn.trend - 0.5));
    if (cutting && wn.rate > -0.1) add(62, 'y', 'scale', 'Peso fermo', `Media 7 giorni: ${sgn(wn.rate, 2)} kg a settimana. Se resta così un'altra settimana: −150 kcal oppure +2.000 passi al giorno.`);
    else if (cutting && wn.rate < -0.8) add(62, 'y', 'scale', 'Stai scendendo veloce', `${sgn(wn.rate, 2)} kg a settimana: aggiungi circa 150 kcal per non perdere muscolo.`);
    else if (cutting) add(22, 'g', 'scale', 'Peso in linea', `${sgn(wn.rate, 2)} kg a settimana sulla media dei 7 giorni: continua così.`);
  }
  /* steps */
  const st = dayVal(k, 'steps'), sgoal = stepsGoal();
  if (hr >= 17 && st != null && st < sgoal * 0.7) add(34, 'b', 'steps', `Passi: ${fmtN(st, 0)} su ${fmtN(sgoal, 0)}`, `Mancano ${fmtN(sgoal - st, 0)} passi, circa ${Math.round((sgoal - st) / 110)} minuti di camminata.`);
  items.sort((a, b) => b.p - a.p);
  return items;
}
function todayCoachCard() {
  const it = coachItems();
  if (!it.length) return `<div class="card tight coach"><div class="row"><span class="kc-ic">${icon('sparkle', 18)}</span><b class="grow">Coach di oggi</b><button class="link" data-a="chatOpen">${icon('sparkle', 13)} Chiedi</button></div><div class="small muted">Tutto in ordine. Registra allenamenti, pasti e peso: più dati hai, più consigli precisi ricevi.</div></div>`;
  const list = UI.coachAll ? it : it.slice(0, 3);
  return `<div class="card tight coach"><div class="row"><span class="kc-ic">${icon('sparkle', 18)}</span><b class="grow">Coach di oggi</b><button class="link" data-a="chatOpen">${icon('sparkle', 13)} Chiedi</button><button class="link" data-a="aiWeekOpen">Settimana</button>${it.length > 3 ? `<button class="link" data-a="coachAll">${UI.coachAll ? 'Meno' : `Altri ${it.length - 3}`}</button>` : ''}</div>
    ${list.map(x => `<div class="ci c-${x.c}"><span class="ci-ic">${icon(x.ic, 18)}</span><div class="grow"><b>${x.t}</b><div class="small muted">${x.d}</div>${x.btn ? `<button class="btn sm ${x.c === 'r' ? 'primary' : ''}" data-a="${x.btn.a}" ${x.btn.id ? `data-id="${x.btn.id}"` : ''} ${x.btn.m ? `data-m="${x.btn.m}"` : ''}>${x.btn.l}</button>` : ''}</div></div>`).join('')}</div>`;
}

/* ---------- customizable Home ---------- */
const HOME_CARDS = [
  { k: 'coach', n: 'Coach di oggi', d: 'Le 3 cose più importanti di oggi', on: true },
  { k: 'workout', n: 'Allenamento di oggi', d: 'La scheda di oggi e il tasto per iniziare', on: true },
  { k: 'quick', n: 'Azioni rapide', d: 'Libero, corsa, peso, pasto', on: true },
  { k: 'week', n: 'La tua settimana', d: 'Allenamenti, volume, km, calorie', on: true },
  { k: 'readiness', n: 'Prontezza', d: 'Recupero, sforzo e sonno (Apple Salute)', on: true },
  { k: 'diet', n: 'Dieta di oggi', d: 'Calorie e macro', on: true },
  { k: 'body', n: 'Peso e acqua', d: 'Peso di oggi e media', on: true },
  { k: 'load', n: 'Carico settimanale', d: 'Palestra + corsa rispetto al solito', on: false },
  { k: 'muscles', n: 'Muscoli allenati', d: 'Serie per muscolo della settimana', on: false },
  { k: 'last', n: 'Ultimo allenamento', d: '', on: false },
  { k: 'records', n: 'Ultimi record', d: '', on: false },
];
function homeLayout() {
  const saved = S.profile.home || [], out = [];
  for (const s of saved) { const c = HOME_CARDS.find(x => x.k === s.k); if (c) out.push({ ...c, on: !!s.on }); }
  for (const c of HOME_CARDS) if (!out.some(x => x.k === c.k)) out.push({ ...c });
  return out;
}
function homeEditHTML() {
  const L = homeLayout();
  return `<div class="small muted" style="margin-bottom:8px">Scegli cosa vedere in Oggi e in che ordine. Il riepilogo della settimana scorsa compare da solo il lunedì e il martedì.</div>
    <div class="home-ed">${L.map((c, i) => `<div class="row"><div class="grow"><b>${c.n}</b>${c.d ? `<div class="small faint">${c.d}</div>` : ''}</div>
      <button class="icon-btn" data-a="homeMove" data-i="${i}" data-d="-1" ${i ? '' : 'disabled style="opacity:.3"'} aria-label="Su">${icon('up', 18)}</button><button class="icon-btn" data-a="homeMove" data-i="${i}" data-d="1" ${i < L.length - 1 ? '' : 'disabled style="opacity:.3"'} aria-label="Giù">${icon('down', 18)}</button>
      <button class="switch ${c.on ? 'on' : ''}" data-a="homeToggle" data-i="${i}" aria-label="Mostra ${c.n}"></button></div>`).join('')}</div>
    <button class="btn ghost block" data-a="homeReset" style="margin-top:8px">Ripristina</button>`;
}
function homeSaveLayout(L) { S.profile.home = L.map(c => ({ k: c.k, on: c.on })); save(); }

Object.assign(A, {
  coachAll() { UI.coachAll = !UI.coachAll; render(); },
  startLight(el) { const r = S.routines.find(x => x.id === el.dataset.id); if (r) guardStart(() => startWorkout(r, null, { light: true })); },
  homeEdit() { pushLayer({ type: 'sheet', title: 'Personalizza Oggi', items: [], html: homeEditHTML() }); },
  homeMove(el) { const L = homeLayout(), i = +el.dataset.i, j = i + +el.dataset.d; if (j < 0 || j >= L.length) return; L.splice(j, 0, L.splice(i, 1)[0]); homeSaveLayout(L); topLayer().html = homeEditHTML(); renderLayers(); render(); },
  homeToggle(el) { const L = homeLayout(), i = +el.dataset.i; L[i].on = !L[i].on; homeSaveLayout(L); topLayer().html = homeEditHTML(); renderLayers(); render(); },
  homeReset() { delete S.profile.home; save(); topLayer().html = homeEditHTML(); renderLayers(); render(); },
});

/* low recovery: offer the light version inside the workout (no extra dialog) */
function coachRed() { try { return healthRecent() && zone(scoresToday().rec.score) === 'r'; } catch (e) { return false; } }
function lightOfferHTML(w) {
  if (!w.rid || w.light || w.past || w.lightNo || w.ex.some(e => e.sets.some(s => s.done)) || !coachRed()) return '';
  return `<div class="card tight light-card offer">${icon('heart', 18)}<div class="grow small"><b>Recupero basso oggi.</b> Vuoi la versione leggera? Una serie in meno per esercizio e 1 ripetizione di margine in più.</div>
    <div class="row" style="gap:6px"><button class="btn sm primary" data-a="goLight">Sì</button><button class="btn sm" data-a="noLight">No</button></div></div>`;
}
Object.assign(A, {
  goLight() {
    const w = S.active; if (!w) return;
    for (const e of w.ex) { if (e.sets.some(s => s.done)) continue; const work = e.sets.filter(isWork); if (work.length > 1) e.sets.splice(e.sets.lastIndexOf(work[work.length - 1]), 1); }
    w.light = true; save(); renderLayers(); toast('Versione leggera attiva');
  },
  noLight() { if (S.active) { S.active.lightNo = true; save(); renderLayers(); } },
});
