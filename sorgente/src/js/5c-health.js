/* =========================================================
   APPLE SALUTE + PUNTEGGI (recupero, sforzo, sonno)
   S.health = { 'YYYY-MM-DD': { hrv, rhr, sleep, deep, rem, steps, kcal, w, bf, at } }
   I valori arrivano come testo dal Comando Rapido (via Supabase) e qui vengono letti.
   ========================================================= */
Object.assign(IC, {
  heart: '<path d="M12 20s-7-4.4-9-9.2C1.7 7.6 3.8 4.5 7 4.5c2 0 3.6 1.2 5 3 1.4-1.8 3-3 5-3 3.2 0 5.3 3.1 4 6.3C19 15.6 12 20 12 20z"/>',
  watch: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l.5-3h5L15 6M9 18l.5 3h5l.5-3M12 10v2.5l1.5 1"/>',
});

/* "8.123" (thousands), "45,2" (decimal), "1.234,5" */
function hNum(v, intLike) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  let s = String(v).trim().replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  if (s.includes('.') && s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (intLike && /^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s); return isFinite(n) ? n : null;
}
/* sleep in hours from "7:12", "7 h 12 min", "7,2", minutes or seconds */
function hDur(v) {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase();
  if (/\d:\d/.test(s)) { const p = s.split(':').map(x => parseInt(x, 10) || 0); return p[0] + (p[1] || 0) / 60 + (p[2] || 0) / 3600; }
  const h = s.match(/(\d+[.,]?\d*)\s*(h|or)/), m = s.match(/(\d+)\s*(min|m\b)/);
  if (h || m) return (h ? hNum(h[1]) : 0) + (m ? +m[1] / 60 : 0);
  const n = hNum(s); if (n == null || n <= 0) return null;
  return n <= 24 ? n : n <= 1440 ? n / 60 : n / 3600;
}
const H_CACHE = new Map();
function healthDay(k) {
  const r = S.health?.[k]; if (!r) return {};
  const ck = k + JSON.stringify(r); if (H_CACHE.has(ck)) return H_CACHE.get(ck);
  const o = {
    hrv: hNum(r.hrv), rhr: hNum(r.rhr), sleep: hDur(r.sleep), deep: hDur(r.deep), rem: hDur(r.rem),
    steps: hNum(r.steps, true), kcalA: hNum(r.kcal, true), w: hNum(r.w), bf: hNum(r.bf), at: r.at,
  };
  if (o.bf != null && o.bf > 0 && o.bf < 1) o.bf = Math.round(o.bf * 1000) / 10;   // Salute gives 0,18 for 18%
  for (const f of ['hrv', 'rhr', 'sleep', 'steps', 'kcalA', 'w', 'bf']) if (o[f] != null && (o[f] <= 0 || o[f] > (BMET[f]?.max || 1e6))) o[f] = null;
  H_CACHE.set(ck, o); return o;
}
function hasHealth() { return S.health && Object.keys(S.health).length > 0; }
function lastHealthKey() { const ks = Object.keys(S.health || {}).sort(); return ks[ks.length - 1] || null; }

/* ---------- baselines & scores ---------- */
function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function baseline(f, k, days = 30) {
  const end = kdate(k), vals = [];
  for (let i = 1; i <= days; i++) { const v = dayVal(dkey(end - i * DAY + 7200e3), f); if (v != null) vals.push(v); }
  return vals.length >= 5 ? { v: median(vals), n: vals.length } : { v: null, n: vals.length };
}
function sleepNeed() { return S.profile.sleepNeed || 8; }
function sleepScore(k) {
  const s = dayVal(k, 'sleep'); if (s == null) return null;
  const need = sleepNeed(), pct = s / need;
  let sc = pct >= 1 ? 100 - Math.max(0, s - need - 1.5) * 6 : 100 * Math.pow(pct, 2.2);
  const hd = healthDay(k);
  if (hd.deep != null && hd.rem != null && s > 0) sc += clamp(((hd.deep + hd.rem) / s - 0.35) * 100, -10, 5);
  return Math.round(clamp(sc, 0, 100));
}
function recovery(k) {
  const hrv = dayVal(k, 'hrv'), rhr = dayVal(k, 'rhr'), sl = sleepScore(k);
  const bh = baseline('hrv', k), br = baseline('rhr', k);
  const parts = [], why = [];
  if (hrv != null && bh.v) { const r = hrv / bh.v; parts.push([clamp(50 + (r - 1) * 250, 0, 100), 0.5]); why.push({ n: 'HRV', v: `${fmtN(hrv, 0)} ms`, d: `media 30 gg ${fmtN(bh.v, 0)}`, good: r >= 0.97 }); }
  if (rhr != null && br.v) { const r = rhr / br.v; parts.push([clamp(50 - (r - 1) * 500, 0, 100), 0.3]); why.push({ n: 'FC a riposo', v: `${fmtN(rhr, 0)} bpm`, d: `media 30 gg ${fmtN(br.v, 0)}`, good: r <= 1.03 }); }
  if (sl != null) { parts.push([sl, 0.2]); why.push({ n: 'Sonno', v: `${fmtN(dayVal(k, 'sleep'), 1)} h`, d: `punteggio ${sl}`, good: sl >= 70 }); }
  const calib = !(bh.v || br.v);
  if (calib || parts.length < 2) return { score: null, calib: true, n: Math.max(bh.n, br.n), why, hasData: hrv != null || rhr != null };
  const w = parts.reduce((a, p) => a + p[1], 0);
  return { score: Math.round(parts.reduce((a, p) => a + p[0] * p[1], 0) / w), why };
}
function strain(k) {
  const t0 = kdate(k), ws = S.workouts.filter(w => w.start >= t0 && w.start < t0 + DAY);
  const sets = ws.reduce((a, w) => a + w.ex.reduce((b, e) => b + workSets(e).length, 0), 0);
  const mins = ws.reduce((a, w) => a + ((w.end || w.start) - w.start) / 60000, 0);
  const kcal = dayVal(k, 'kcalA'), steps = dayVal(k, 'steps');
  const rs = (S.runs || []).filter(r => r.start >= t0 && r.start < t0 + DAY), runKm = rs.reduce((a, r) => a + r.km, 0);
  const runHard = rs.reduce((a, r) => a + (['tempo', 'int', 'race'].includes(r.type) || (r.rpe || 0) >= 7 ? r.sec / 60 : 0), 0);
  if (kcal == null && steps == null && !ws.length && !rs.length) return { score: null };
  const move = kcal != null ? kcal / 8 : (steps || 0) * 0.04 / 8 + mins * 0.5 + runKm * 9;
  const load = move + sets * 2.5 + runHard * 0.6;
  return { score: Math.round(100 * (1 - Math.exp(-load / 110))), sets, mins: Math.round(mins), kcal, steps, runKm };
}
function zone(r) { return r == null ? null : r >= 67 ? 'g' : r >= 34 ? 'y' : 'r'; }
const ZCOL = { g: 'var(--good)', y: 'var(--gold)', r: 'var(--bad)' };
function readinessAdvice(rec) {
  const z = zone(rec);
  if (z === 'g') return { t: 'Pronto per spingere', d: 'Giornata buona per un record o una serie in più. Sforzo consigliato 60–80.', c: 'g' };
  if (z === 'y') return { t: 'Allenamento normale', d: 'Segui la scheda e lascia 2 ripetizioni di margine (RIR 2). Sforzo consigliato 40–65.', c: 'y' };
  if (z === 'r') return { t: 'Recupera', d: 'Seduta leggera, tecnica o mobilità, oppure riposo. Stasera punta a dormire di più. Sforzo sotto 40.', c: 'r' };
  return null;
}

/* ---------- UI ---------- */
function scoreRing(v, label, col, sub, size = 84) {
  const r = size / 2 - 7, c = 2 * Math.PI * r, p = v == null ? 0 : clamp(v / 100, 0, 1);
  return `<div class="sring"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="7"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg><b class="tnum">${v == null ? '–' : v}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
}
function scoresToday() {
  const k = todayKey(), y = dkey(kdate(k) - DAY + 7200e3);
  const rec = recovery(k), st = strain(k), sl = sleepScore(k);
  return { k, y, rec, st, sl, stY: strain(y) };
}
function healthRecent() { const ks = allDayKeys().slice(-4); return ks.some(k => ['hrv', 'rhr', 'sleep'].some(f => dayVal(k, f) != null)); }
function readinessCard() {
  if (!healthRecent()) return '';
  const s = scoresToday(), z = zone(s.rec.score), adv = readinessAdvice(s.rec.score);
  return `<button class="card tight readiness" data-a="healthDetail" style="text-align:left">
    <div class="row"><b class="grow">Prontezza di oggi</b>${icon('chev', 18)}</div>
    <div class="rings">${scoreRing(s.rec.score, 'Recupero', z ? ZCOL[z] : 'var(--faint)', s.rec.calib ? `calibro ${Math.min(s.rec.n, 5)}/5` : '')}${scoreRing(s.st.score, 'Sforzo', 'var(--steel)', s.st.score == null ? 'nessun dato' : 'oggi')}${scoreRing(s.sl, 'Sonno', '#b494ff', dayVal(s.k, 'sleep') != null ? fmtN(dayVal(s.k, 'sleep'), 1) + ' h' : '')}</div>
    ${adv ? `<div class="small" style="line-height:1.4"><b style="color:${ZCOL[adv.c]}">${adv.t}.</b> <span class="muted">${adv.d}</span></div>` : s.rec.calib ? `<div class="small muted">Il recupero si confronta con la tua media: servono 5 giorni di HRV o FC a riposo.</div>` : ''}
  </button>`;
}
function scoreBars(list, col, max = 100, line) {
  return `<div class="sbars">${line ? `<em style="bottom:${18 + Math.min(1, line / max) * 56}px"></em>` : ''}${list.map(x => `<div title="${fmtDate(x.t)}"><i style="height:${x.v == null ? 0 : Math.round(clamp(x.v / max, 0.04, 1) * 56)}px;background:${typeof col === 'function' ? col(x.v) : col}"></i><span>${'LMMGVSD'[(new Date(x.t).getDay() + 6) % 7]}</span></div>`).join('')}</div>`;
}
function last14(fn) { const t = kdate(todayKey()); return [...Array(14)].map((_, i) => { const tt = t - (13 - i) * DAY, k = dkey(tt + 7200e3); return { t: tt, k, v: fn(k) }; }); }
function recoveryCard() {
  if (!healthRecent() && !hasHealth()) return `<button class="card tight" data-a="healthSetup" style="text-align:left;flex-direction:row;align-items:center">${icon('watch')}<div class="grow"><b>Collega Apple Salute</b><div class="small muted">HRV, battito a riposo, sonno, passi e calorie dall'Apple Watch: recupero, sforzo e sonno in un colpo d'occhio.</div></div>${icon('chev')}</button>`;
  const rec = last14(k => recovery(k).score), sl = last14(k => dayVal(k, 'sleep'));
  const hrv = avgLast('hrv'), rhr = avgLast('rhr'), k = todayKey(), bh = baseline('hrv', k), br = baseline('rhr', k);
  return `<div class="card"><div class="section-title">Recupero e sonno <button class="link" data-a="healthDetail">Dettagli</button></div>
    <div class="tiles"><div class="tile"><div class="v" style="font-size:22px">${hrv ? fmtN(hrv.v, 0) : '–'}<small>ms</small></div><div class="k">HRV 7 gg${bh.v ? ' · base ' + fmtN(bh.v, 0) : ''}</div></div><div class="tile"><div class="v" style="font-size:22px">${rhr ? fmtN(rhr.v, 0) : '–'}<small>bpm</small></div><div class="k">FC riposo${br.v ? ' · base ' + fmtN(br.v, 0) : ''}</div></div><div class="tile"><div class="v" style="font-size:22px">${avgLast('sleep') ? fmtN(avgLast('sleep').v, 1) : '–'}<small>h</small></div><div class="k">Sonno 7 gg</div></div></div>
    <div class="lbl">Recupero · 14 giorni</div>${scoreBars(rec, v => v == null ? 'transparent' : ZCOL[zone(v)])}
    <div class="lbl">Sonno · 14 giorni <span class="faint">(linea: ${fmtN(sleepNeed(), 1)} h)</span></div>${scoreBars(sl, '#b494ff', 10, sleepNeed())}
  </div>`;
}
function layerHealthDetail(l, i) {
  const s = scoresToday(), adv = readinessAdvice(s.rec.score);
  const stl = last14(k => strain(k).score);
  return `<div class="layer">${head('Prontezza')}<div class="layer-body" data-scroll-key="hd${i}"><div class="layer-inner">
    <div class="rings">${scoreRing(s.rec.score, 'Recupero', s.rec.score != null ? ZCOL[zone(s.rec.score)] : 'var(--faint)')}${scoreRing(s.st.score, 'Sforzo', 'var(--steel)')}${scoreRing(s.sl, 'Sonno', '#b494ff')}</div>
    ${adv ? `<div class="card tight"><b style="color:${ZCOL[adv.c]}">${adv.t}</b><div class="small muted">${adv.d}</div></div>` : ''}
    <div class="card"><div class="section-title">Recupero</div>
      ${s.rec.calib ? `<div class="small muted">In calibrazione: ${Math.min(s.rec.n, 5)}/5 giorni con HRV o FC a riposo. Il punteggio confronta oggi con la <b>tua</b> media, non con quella degli altri.</div>` : ''}
      ${s.rec.why.map(w => `<div class="row"><span style="color:${w.good ? 'var(--good)' : 'var(--gold)'}">${icon(w.good ? 'check' : 'info', 16)}</span><b class="grow">${w.n}</b><span class="tnum">${w.v}</span><span class="small faint" style="min-width:110px;text-align:right">${w.d}</span></div>`).join('') || '<div class="small muted">Nessun dato di oggi.</div>'}
      <div class="small faint">HRV sopra la tua media e battito a riposo sotto = corpo recuperato. HRV bassa, battito alto = stress, poco sonno, alcol, malattia o allenamenti pesanti.</div></div>
    <div class="card"><div class="section-title">Sforzo</div>
      <div class="small muted">${s.st.score == null ? 'Nessun dato di oggi.' : `Oggi: ${s.st.sets ? s.st.sets + ' serie allenanti' : s.st.runKm ? '' : 'nessun allenamento'}${s.st.runKm ? (s.st.sets ? ' · ' : '') + fmtN(s.st.runKm, 1) + ' km di corsa' : ''}${s.st.kcal != null ? ' · ' + fmtN(s.st.kcal, 0) + ' kcal attive' : ''}${s.st.steps != null ? ' · ' + fmtN(s.st.steps, 0) + ' passi' : ''}.`} Ieri: ${s.stY.score ?? '–'}.</div>
      ${scoreBars(stl, 'var(--steel)')}
      <div class="small faint">Unisce calorie attive dell'Apple Watch (o i passi) e le serie registrate in Forgia. 0–33 leggero, 34–66 medio, 67+ pesante.</div></div>
    <div class="card"><div class="section-title">Sonno</div>
      <div class="small muted">${dayVal(s.k, 'sleep') != null ? `Stanotte ${fmtN(dayVal(s.k, 'sleep'), 1)} h su ${fmtN(sleepNeed(), 1)} h di bisogno.` : 'Nessun dato di stanotte.'}</div>
      <div class="row"><div class="grow"><div class="lbl" style="color:var(--fg)">Bisogno di sonno</div><div class="small faint">7–9 ore per chi si allena</div></div><div class="stepper"><button data-a="sleepNeed" data-d="-0.5">−</button><span>${fmtN(sleepNeed(), 1)}</span><button data-a="sleepNeed" data-d="0.5">+</button></div></div></div>
    <div class="small faint">Punteggi calcolati da Forgia, ispirati alle app tipo Bevel e Whoop. Non sono un parere medico.</div>
  </div></div></div>`;
}

/* ---------- setup ---------- */
function rpcURL() { return (SUPA.url || 'https://TUO-PROGETTO.supabase.co') + '/rest/v1/rpc/ingest_health'; }
function copyRow(label, val, id) { return `<div class="field"><label>${label}</label><div class="row"><input class="input tnum" readonly id="${id}" value="${esc(val)}" style="font-size:13px"><button class="btn sm" data-a="copyVal" data-id="${id}">${icon('copy', 16)}</button></div></div>`; }
const SC_STEPS = [
  ['HRV', 'Trova campioni di Salute → Tipo: <b>Variabilità della frequenza cardiaca</b>, Data di inizio <b>negli ultimi 12 ore</b>. Poi <b>Ottieni dettagli dei campioni di Salute → Valore</b>, poi <b>Calcola statistiche → Media</b>, poi <b>Imposta variabile</b> → nome <b>HRV</b>.'],
  ['FC a riposo', 'Trova campioni → <b>Frequenza cardiaca a riposo</b>, Ordina per <b>Data di inizio, dal più recente</b>, Limite <b>1</b>. Poi Ottieni dettagli → <b>Valore</b>, Imposta variabile → <b>RHR</b>.'],
  ['Sonno', 'Trova campioni → <b>Analisi del sonno</b>, Data di inizio <b>negli ultimi 16 ore</b>, e aggiungi i filtri Valore <b>non è A letto</b> e Valore <b>non è Sveglio</b>. Poi Ottieni dettagli → <b>Durata</b>, Calcola statistiche → <b>Somma</b>, Imposta variabile → <b>SONNO</b>.'],
  ['Passi', 'Trova campioni → <b>Passi</b>, Data di inizio <b>è oggi</b>. Ottieni dettagli → <b>Valore</b>, Calcola statistiche → <b>Somma</b>, Imposta variabile → <b>PASSI</b>.'],
  ['Calorie attive', 'Come i passi ma con <b>Energia attiva</b> → variabile <b>KCAL</b>.'],
  ['Peso (facoltativo)', 'Solo se hai una bilancia collegata a Salute: Trova campioni → <b>Peso</b>, dal più recente, Limite 1, negli ultimi 1 giorni. Valore → variabile <b>PESO</b>.'],
  ['Invio', 'Azione <b>Ottieni contenuti dell\'URL</b>: incolla l\'URL qui sotto. Tocca la freccia: Metodo <b>POST</b>. Intestazioni: <b>apikey</b> = chiave qui sotto. Corpo richiesta <b>JSON</b>, aggiungi campi di tipo <b>Testo</b>: <b>p_token</b> = il tuo codice, <b>hrv</b> = HRV, <b>rhr</b> = RHR, <b>sleep</b> = SONNO, <b>steps</b> = PASSI, <b>kcal</b> = KCAL, <b>w</b> = PESO.'],
  ['Prova', 'Esegui il comando una volta a mano: iPhone chiede il permesso di leggere i dati di Salute, consenti tutto. Se l\'ultima azione mostra <b>ok</b> + la data, funziona.'],
  ['Automazione', 'Scheda <b>Automazione</b> → <b>Nuova automazione</b> → <b>Ora del giorno</b> 08:00, ogni giorno → <b>Esegui immediatamente</b> → azione <b>Esegui comando</b>: il tuo comando. Rifalla alle <b>23:30</b> per passi e calorie completi.'],
];
function layerHealthSetup(l, i) {
  const lk = lastHealthKey(), last = lk ? S.health[lk] : null;
  const logged = !!SYNC.user;
  return `<div class="layer">${head('Apple Salute')}<div class="layer-body" data-scroll-key="hs${i}"><div class="layer-inner">
    <div class="card tight"><div class="row"><span style="color:${last ? 'var(--good)' : 'var(--faint)'}">${icon(last ? 'check' : 'info', 18)}</span><b class="grow">${last ? `Ultimi dati: ${relDay(kdate(lk)).toLowerCase()}${last.at ? ' alle ' + esc(last.at) : ''}` : 'Nessun dato ricevuto'}</b>${logged ? `<button class="btn sm" data-a="syncNow">Aggiorna</button>` : ''}</div>
      <div class="small muted">Un'app web non può leggere Salute direttamente: lo fa un <b>Comando Rapido</b> sull'iPhone, che ogni mattina e sera invia i valori al tuo account. Lo costruisci una volta, ~15 minuti.</div></div>
    ${!logged ? `<div class="card tight"><div class="small">Serve l'account: vai in <b>Profilo → Account</b> e accedi. Poi torna qui.</div></div>` : `
    <div class="card"><div class="lbl">1 · Il tuo codice personale</div>
      ${l.token ? copyRow('Codice (p_token)', l.token, 'hs-tok') : `<button class="btn primary" data-a="healthToken" ${l.busy ? 'disabled' : ''}>${l.busy ? 'Un attimo…' : 'Genera codice'}</button>`}
      ${l.err ? `<div class="small" style="color:var(--bad)">${esc(l.err)}</div>` : ''}
      ${copyRow('URL', rpcURL(), 'hs-url')}${copyRow('Chiave (apikey)', SUPA.key, 'hs-key')}
      <div class="small faint">Il codice permette solo di <b>scrivere</b> i tuoi dati di Salute, non di leggerli. Se lo perdi o lo condividi per errore, rigeneralo.${l.token ? ' <button class="link small" data-a="healthTokenNew">Rigenera</button>' : ''}</div></div>
    <div class="card"><div class="lbl">2 · Crea il comando in Comandi Rapidi</div><div class="small muted">Nuovo comando → nome <b>Forgia Salute</b>. Aggiungi le azioni in quest'ordine:</div>
      <ol class="instr" style="color:var(--fg)">${SC_STEPS.map(s => `<li><b>${s[0]}</b> — <span class="muted">${s[1]}</span></li>`).join('')}</ol>
      <div class="small faint">Se un nome di azione o di filtro sul tuo iPhone è diverso, mandami uno screenshot e lo sistemiamo.</div></div>`}
  </div></div></div>`;
}
async function healthTokenGet(l, renew) {
  l.busy = true; l.err = ''; renderLayers();
  try {
    const c = SYNC.client;
    if (renew) await c.from('health_tokens').delete().eq('user_id', SYNC.user.id);
    else { const { data, error } = await c.from('health_tokens').select('token').limit(1); if (error) throw error; if (data && data[0]) { l.token = data[0].token; return; } }
    const b = new Uint8Array(20); crypto.getRandomValues(b);
    const tok = 'fg_' + [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    const { error } = await c.from('health_tokens').insert({ token: tok, user_id: SYNC.user.id }); if (error) throw error;
    l.token = tok;
  } catch (e) {
    l.err = /health_tokens|relation|schema/i.test(e?.message || '') ? 'Manca la tabella su Supabase: esegui prima lo script SQL di Forgia 3.2 (SQL Editor).' : 'Errore: ' + (e?.message || 'riprova');
  } finally { l.busy = false; renderLayers(); }
}

/* ---------- demo ---------- */
function addHealthDemo() {
  for (const [k, d] of Object.entries(bodyOn())) {
    if (!d.demo) continue;
    const i = kdate(k) / DAY;
    d.hrv = Math.round(52 + Math.sin(i * 1.3) * 9 + Math.cos(i * 0.7) * 4); d.rhr = Math.round(54 - Math.sin(i * 1.3) * 3);
  }
}

Object.assign(LAYER_RENDER, { healthDetail: layerHealthDetail, healthSetup: layerHealthSetup });
Object.assign(A, {
  healthDetail() { pushLayer({ type: 'healthDetail' }); },
  healthSetup() { const l = { type: 'healthSetup' }; pushLayer(l); if (SYNC.user) healthTokenGet(l); },
  healthToken() { healthTokenGet(topLayer()); },
  healthTokenNew() { const l = topLayer(); pushLayer({ type: 'confirm', title: 'Rigenerare il codice?', text: 'Il vecchio smette di funzionare: dovrai incollare quello nuovo nel Comando Rapido.', ok: 'Rigenera', fn: () => healthTokenGet(l, true) }); },
  copyVal(el) { const i = $('#' + el.dataset.id); if (!i) return; try { navigator.clipboard.writeText(i.value).then(() => toast('Copiato'), () => { i.select(); document.execCommand('copy'); toast('Copiato'); }); } catch (e) { i.select(); try { document.execCommand('copy'); toast('Copiato'); } catch (_) { } } },
  sleepNeed(el) { S.profile.sleepNeed = clamp(sleepNeed() + +el.dataset.d, 6, 10); save(); renderLayers(); },
});
