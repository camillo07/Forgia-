/* =========================================================
   LISTA DELLA SPESA (dal diario) · ANALISI AI DELLA SETTIMANA
   ========================================================= */

/* ---------- shopping list ---------- */
const SHOP_AISLES = [['meat', 'Carne'], ['fish', 'Pesce'], ['egg', 'Uova'], ['dairy', 'Latticini'], ['fr', 'Frutta'], ['veg', 'Verdura'], ['cer', 'Pane, pasta e cereali'], ['leg', 'Legumi'], ['nut', 'Frutta secca e semi'], ['fat', 'Olio e grassi'], ['sauce', 'Salse e condimenti'], ['sweet', 'Dolci e snack'], ['drink', 'Bevande'], ['dish', 'Piatti pronti'], ['supp', 'Integratori'], ['', 'Altro']];
function shopRaw(f, g) {
  const n = (f.n || '').toLowerCase();
  if (/\((cott|lessat|bollit|al vapore)|griglia/.test(n)) {
    if (['meat', 'fish'].includes(f.cat)) return { g: g * 1.3, note: 'peso crudo stimato' };
    if (/pasta|riso|cous|farro|quinoa|orzo|legum|ceci|lenticch|fagiol/.test(n)) return { g: g / 2.4, note: 'peso crudo stimato' };
  }
  return { g };
}
function shopBuild(days) {
  const logged = [];
  for (let i = 1; i <= 14 && logged.length < 7; i++) { const k = dkey(kdate(todayKey()) - i * DAY + 7200e3); if (dayEntries(k).some(e => e.fid)) logged.push(k); }
  if (logged.length < 2) return null;
  const tot = new Map();
  const addF = (fid, g) => {
    const f = food(fid); if (!f || !g) return;
    if (f.src === 'recipe' && Array.isArray(f.ingr)) { const c = recipeCalc(f); for (const it of f.ingr) addF(it.fid, it.g * g / (c.W || 1)); return; }
    const o = tot.get(fid) || { g: 0 }; o.g += g; tot.set(fid, o);
  };
  for (const k of logged) for (const e of dayEntries(k)) if (e.fid) addF(e.fid, e.g);
  const items = [];
  for (const [fid, o] of tot) {
    const f = food(fid), daily = o.g / logged.length, need = shopRaw(f, daily * days);
    if (need.g < 5) continue;
    const g = need.g < 100 ? Math.ceil(need.g / 10) * 10 : Math.ceil(need.g / 50) * 50;
    const sv = f.serv && f.serv.g && f.serv.l && !/porzion/i.test(f.serv.l) ? Math.ceil(need.g / f.serv.g) : null;
    items.push({ fid, n: need.note ? f.n.replace(/\s*\((cott|lessat|bollit|al vapore)[^)]*\)/i, '') : f.n, cat: f.cat || '', g, pcs: sv && sv <= 60 ? `${sv} × ${f.serv.l.replace(/^1\s*/, '')}` : '', note: need.note || '', done: false });
  }
  items.sort((a, b) => a.n.localeCompare(b.n));
  return { days, base: logged.length, at: Date.now(), items, extra: (S.shop && S.shop.extra) || [] };
}
function shopText() {
  const s = S.shop; if (!s) return '';
  const lines = [`Lista della spesa · ${s.days} giorni`];
  for (const [k, n] of SHOP_AISLES) { const it = s.items.filter(x => x.cat === k && !x.done); if (it.length) { lines.push('', n.toUpperCase()); it.forEach(x => lines.push(`- ${x.n}: ${x.g >= 1000 ? fmtN(x.g / 1000, 2) + ' kg' : x.g + ' g'}${x.note ? ' (peso crudo)' : ''}${x.pcs ? ' (' + x.pcs + ')' : ''}`)); } }
  const ex2 = s.extra.filter(x => !x.done); if (ex2.length) { lines.push('', 'ALTRO'); ex2.forEach(x => lines.push('- ' + x.n)); }
  return lines.join('\n');
}
function layerShop(l, i) {
  const s = S.shop;
  const row = (x, kind, idx) => `<button class="shop-it ${x.done ? 'done' : ''}" data-a="shopTick" data-kind="${kind}" data-i="${idx}"><span class="pchk">${x.done ? icon('check', 14, 3) : ''}</span><span class="grow"><b>${esc(x.n)}</b>${x.note ? ` <span class="faint small">· ${x.note}</span>` : ''}</span>${x.g ? `<span class="tnum small"><b>${x.g >= 1000 ? fmtN(x.g / 1000, 2) + ' kg' : x.g + ' g'}</b>${x.pcs ? `<br><span class="faint">${esc(x.pcs)}</span>` : ''}</span>` : ''}</button>`;
  const left = s ? s.items.filter(x => !x.done).length + s.extra.filter(x => !x.done).length : 0;
  return `<div class="layer">${head('Lista della spesa', 'back', s ? `<button class="icon-btn" data-a="shopShare" aria-label="Condividi">${icon('upload')}</button>` : '')}
    <div class="layer-body" data-scroll-key="sh${i}"><div class="layer-inner">
      <div class="card tight"><div class="small muted">Calcolata da quello che hai mangiato di solito: media degli ultimi giorni registrati nel diario, moltiplicata per i giorni da coprire. Carne, pesce, pasta e riso registrati cotti diventano peso crudo.</div>
        <div class="chips" style="margin:0;padding:0">${[3, 5, 7, 14].map(d => `<button class="chip ${(s?.days || UI.shopDays || 7) === d ? 'on' : ''}" data-a="shopMake" data-d="${d}">${d} giorni</button>`).join('')}</div>
        ${s ? `<div class="small faint">Basata su ${s.base} giorni di diario · creata ${relDay(s.at).toLowerCase()} · ${left} da prendere</div>` : ''}</div>
      ${!s ? `<div class="empty card">${icon('food', 34)}<b>Scegli quanti giorni coprire</b><span class="small">Servono almeno 2 giorni registrati nel diario nelle ultime 2 settimane.</span></div>` : `
      ${SHOP_AISLES.map(([k, n]) => { const it = s.items.map((x, idx) => [x, idx]).filter(([x]) => x.cat === k); return it.length ? `<div class="stack" style="gap:6px"><div class="section-title" style="font-size:15px">${n}</div><div class="list">${it.map(([x, idx]) => row(x, 'i', idx)).join('')}</div></div>` : ''; }).join('')}
      <div class="stack" style="gap:6px"><div class="section-title" style="font-size:15px">Altro da prendere</div>
        ${s.extra.length ? `<div class="list">${s.extra.map((x, idx) => row(x, 'x', idx)).join('')}</div>` : ''}
        <form class="row" data-form="shopAdd"><input class="input grow" id="shop-new" maxlength="40" placeholder="Es. detersivo, spugne…"><button class="btn" type="submit">${icon('plus', 16)}</button></form></div>
      <button class="btn ghost block" data-a="shopClear" style="color:var(--muted)">Togli le cose già prese</button>`}
    </div></div></div>`;
}
Object.assign(LAYER_RENDER, { shop: layerShop });
document.addEventListener('submit', ev => {
  if (ev.target.dataset.form !== 'shopAdd') return; ev.preventDefault();
  const v = ($('#shop-new')?.value || '').trim(); if (!v || !S.shop) return;
  S.shop.extra.push({ n: v.slice(0, 40), done: false }); save(); renderLayers(); setTimeout(() => $('#shop-new')?.focus(), 30);
});

/* ---------- AI weekly analysis ---------- */
function avgOf(a) { const v = a.filter(x => x != null && isFinite(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; }
function weekSummaryText(off = 0) {
  const ws = startOfWeek(Date.now()) - off * 7 * DAY, we = Math.min(ws + 7 * DAY, Date.now()), L = [];
  const st = weekStats(ws), prev = weekStats(ws - 7 * DAY, off === 0 ? Date.now() - 7 * DAY : 0);
  L.push(`Settimana dal ${fmtDate(ws)} (${off === 0 ? 'in corso, fino a oggi' : 'completa'}). ${profileLine()}`);
  if (S.profile.goalW) L.push(`Peso obiettivo: ${S.profile.goalW} kg.`);
  L.push(`PALESTRA: ${st.n} allenamenti (obiettivo ${S.profile.weeklyGoal}), ${st.sets} serie, volume ${Math.round(st.vol)} kg, ${st.prs} record. Settimana prima: ${prev.n} allenamenti, ${prev.sets} serie, volume ${Math.round(prev.vol)} kg.`);
  for (const w of S.workouts.filter(w => w.start >= ws && w.start < we).sort((a, b) => a.start - b.start)) {
    const top = w.ex.slice(0, 3).map(e => { const b = workSets(e).reduce((m, s) => !m || e1rm(s.kg, s.r) > e1rm(m.kg, m.r) ? s : m, null); return b ? `${ex(e.id).n} ${fmtSet(b, mtOf(e))}` : null; }).filter(Boolean).join('; ');
    L.push(`- ${fmtDate(w.start)} ${w.name}: ${wSetCount(w)} serie, ${Math.round(((w.end || w.start) - w.start) / 60000)} min${w.light ? ' (versione leggera)' : ''}. ${top}`);
  }
  const mus = weekMuscleSets(ws).map(m => `${m.n} ${fmtN(m.v)}`).join(', '); L.push(`Serie per muscolo: ${mus}.`);
  if (st.runs) L.push(`CORSA: ${st.runs} uscite, ${fmtN(st.km, 1)} km.`);
  const lr = loadRatio(); if (lr) L.push(`Carico ultimi 7 giorni / media 4 settimane: ${lr.ratio.toFixed(2)}.`);
  L.push(`Calorie attive stimate da allenamento e corsa: ${Math.round(st.kcal)} kcal nella settimana.`);
  if (S.nutri) {
    const ks = [...Array(7)].map((_, i) => dkey(ws + i * DAY + 7200e3)).filter(k => kdate(k) <= Date.now() && dayEntries(k).length);
    if (ks.length) {
      const kc = avgOf(ks.map(k => dayTotals(k).tot.kcal)), p = avgOf(ks.map(k => dayTotals(k).tot.p)), tk = avgOf(ks.map(k => targetsFor(k)?.kcal)), tp = avgOf(ks.map(k => targetsFor(k)?.p));
      L.push(`DIETA: ${ks.length} giorni registrati. Media ${Math.round(kc)} kcal (target ${Math.round(tk)}), proteine ${Math.round(p)} g (target ${Math.round(tp)}).`);
    } else L.push('DIETA: nessun giorno registrato nel diario.');
  }
  const wn = weightNow(); if (wn) L.push(`PESO: media 7 giorni ${fmtN(wn.trend, 1)} kg${wn.rate != null ? `, ritmo ${wn.rate.toFixed(2)} kg/settimana` : ''}, ultima pesata ${relDay(wn.t).toLowerCase()}.`);
  const ks7 = [...Array(7)].map((_, i) => dkey(ws + i * DAY + 7200e3));
  const sl = avgOf(ks7.map(k => dayVal(k, 'sleep'))), hrv = avgOf(ks7.map(k => dayVal(k, 'hrv'))), rhr = avgOf(ks7.map(k => dayVal(k, 'rhr'))), steps = avgOf(ks7.map(k => dayVal(k, 'steps')));
  if (sl || hrv || steps) L.push(`RECUPERO: sonno medio ${sl ? fmtN(sl, 1) + ' h' : 'n.d.'}, HRV media ${hrv ? Math.round(hrv) + ' ms' : 'n.d.'}${hrv && baseline('hrv', todayKey()).v ? ` (base 30 gg ${Math.round(baseline('hrv', todayKey()).v)})` : ''}, FC riposo ${rhr ? Math.round(rhr) : 'n.d.'}, passi medi ${steps ? Math.round(steps) : 'n.d.'} (obiettivo ${stepsGoal()}).`);
  return L.join('\n');
}
const AI_WEEK_SCHEMA = '{"voto":7,"sintesi":"2 frasi","bene":["cosa è andato bene", "..."],"azioni":[{"titolo":"breve","dettaglio":"cosa fare esattamente, con numeri"}],"attenzione":"un rischio o null"}';
function aiWeekPrompt(off, json) {
  return `Sei il coach di Forgia: allenatore e nutrizionista sportivo esperto, diretto e pratico. Analizza la settimana di questo atleta usando SOLO i dati qui sotto. Collega i dati tra loro (sonno, carico, dieta, peso, forza) ma distingui correlazione e causa. Dai esattamente 3 azioni concrete per la prossima settimana, con numeri (serie, kg, kcal, grammi, ore, passi). Niente frasi generiche, niente premesse.
${json ? `Rispondi SOLO con JSON valido in questo formato: ${AI_WEEK_SCHEMA}` : 'Formato: voto da 1 a 10, sintesi in 2 frasi, cosa è andato bene, 3 azioni numerate, 1 attenzione. In italiano.'}

DATI
${weekSummaryText(off)}`;
}
function aiWeekHTML(r) {
  if (!r) return '';
  return `<div class="card aiw"><div class="row"><div class="aiw-score">${esc(String(r.voto ?? '–'))}<small>/10</small></div><div class="grow small" style="line-height:1.45">${esc(r.sintesi || '')}</div></div>
    ${(r.bene || []).length ? `<div class="lbl">Cosa va bene</div><ul class="aiw-ok">${r.bene.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <div class="lbl">Le 3 azioni per la prossima settimana</div>
    ${(r.azioni || []).slice(0, 3).map((a, i) => `<div class="aiw-act"><span>${i + 1}</span><div><b>${esc(a.titolo || '')}</b><div class="small muted">${esc(a.dettaglio || '')}</div></div></div>`).join('')}
    ${r.attenzione ? `<div class="aiw-warn">${icon('info', 16)} ${esc(r.attenzione)}</div>` : ''}</div>`;
}
function layerAiWeek(l, i) {
  const off = l.off || 0, saved = (S.profile.aiWeek || []).find(x => x.ws === startOfWeek(Date.now()) - off * 7 * DAY);
  return `<div class="layer">${head('Analisi della settimana')}
    <div class="layer-body" data-scroll-key="aw${i}"><div class="layer-inner">
      <div class="seg"><button class="${off === 0 ? 'on' : ''}" data-a="aiWeekOff" data-v="0">Questa settimana</button><button class="${off === 1 ? 'on' : ''}" data-a="aiWeekOff" data-v="1">Settimana scorsa</button></div>
      <div class="small muted">L'AI legge allenamenti, corse, carico, dieta, peso, sonno e HRV della settimana e ti dà un voto e 3 azioni concrete. I dati inviati sono solo numeri riassunti, niente foto.</div>
      ${l.busy ? `<div class="card tight small muted">${icon('sparkle', 14)} Sto analizzando la settimana…</div>` : ''}
      ${l.err ? `<div class="card tight small" style="color:var(--bad)">${esc(l.err)}</div>` : ''}
      ${saved ? aiWeekHTML(saved.r) + `<div class="small faint">Analisi del ${fmtDate(saved.at)} alle ${hhmm(saved.at)}</div>` : ''}
      ${aiReady() ? `<button class="btn primary block" data-a="aiWeekRun" ${l.busy ? 'disabled' : ''}>${icon('sparkle', 16)} ${saved ? 'Rifai l\'analisi' : 'Analizza la settimana'}</button>` : `<div class="card tight small muted">Per l'analisi dentro l'app serve la chiave API (Profilo → Coach AI). Gratis: copia il messaggio e incollalo in una chat con Claude.</div>`}
      <button class="btn block" data-a="aiWeekCopy">${icon('copy', 16)} Copia per Claude</button>
      <button class="btn block ghost" data-a="chatOpen" data-q="${({ it: 'Riguardo all\'analisi della settimana: ', en: 'About the weekly analysis: ', es: 'Sobre el análisis de la semana: ' }[lang()])}">${icon('sparkle', 16)} Fai una domanda al coach</button>
    </div></div></div>`;
}
Object.assign(LAYER_RENDER, { aiWeek: layerAiWeek });

Object.assign(A, {
  shopOpen() { pushLayer({ type: 'shop' }); },
  shopMake(el) {
    const d = +el.dataset.d; UI.shopDays = d; const s = shopBuild(d);
    if (!s) { toast('Servono almeno 2 giorni registrati nel diario'); renderLayers(); return; }
    S.shop = s; save(); renderLayers(); toast(`Lista per ${d} giorni pronta`);
  },
  shopTick(el) { const s = S.shop; if (!s) return; const arr = el.dataset.kind === 'x' ? s.extra : s.items, x = arr[+el.dataset.i]; if (x) { x.done = !x.done; save(); renderLayers(); haptic(10); } },
  shopClear() { const s = S.shop; if (!s) return; s.items = s.items.filter(x => !x.done); s.extra = s.extra.filter(x => !x.done); save(); renderLayers(); },
  async shopShare() { const t = shopText(); try { if (navigator.share) { await navigator.share({ title: 'Lista della spesa', text: t }); return; } } catch (e) { if (e && e.name === 'AbortError') return; } copyForClaude(t).then(() => { }); },
  aiWeekOpen() { pushLayer({ type: 'aiWeek', off: UI.recapOff === 1 ? 1 : 0 }); },
  aiWeekOff(el) { const l = topLayer(); l.off = +el.dataset.v; l.err = ''; renderLayers(); },
  async aiWeekRun() {
    const l = topLayer(); if (!l || l.type !== 'aiWeek' || l.busy) return;
    const off = l.off || 0; l.busy = true; l.err = ''; renderLayers();
    try {
      const r = await aiAsk(aiWeekPrompt(off, true), { json: true, maxTokens: 1500 });
      const ws = startOfWeek(Date.now()) - off * 7 * DAY;
      S.profile.aiWeek = [{ ws, at: Date.now(), r }, ...(S.profile.aiWeek || []).filter(x => x.ws !== ws)].slice(0, 6); save();
    } catch (e) { l.err = aiErr(e); }
    l.busy = false; if (UI.layers.includes(l)) renderLayers();
  },
  aiWeekCopy() { const l = topLayer(); copyForClaude(aiWeekPrompt(l.off || 0, false)); },
});
