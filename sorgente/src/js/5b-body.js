/* =========================================================
   CORPO: peso, media 7 giorni, composizione, misure, abitudini, foto,
   mantenimento adattivo (TDEE dal peso reale)
   S.body = { 'YYYY-MM-DD': { w, bf, mm, water, steps, sleep, meas:{...}, note } }
   ========================================================= */
Object.assign(IC, {
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  drop: '<path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/>',
  steps: '<path d="M8 21c-1.7 0-3-1.3-3-3.5S6 13 8 13s3 2.5 3 4.5S9.7 21 8 21zM16 14c-1.7 0-3-1.3-3-3.5S14 6 16 6s3 2.5 3 4.5S17.7 14 16 14z"/>',
  ruler: '<path d="m3 17 14-14 4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2"/>',
});
const MEAS = [['waist', 'Vita'], ['hips', 'Fianchi'], ['chest', 'Petto'], ['arm', 'Braccio'], ['thigh', 'Coscia'], ['calf', 'Polpaccio'], ['neck', 'Collo']];
const BMET = {
  w: { n: 'Peso', u: 'kg', d: 1, max: 400 }, bf: { n: 'Grasso corporeo', u: '%', d: 1, max: 70 }, mm: { n: 'Massa muscolare', u: 'kg', d: 1, max: 200 },
  water: { n: 'Acqua', u: 'ml', d: 0, max: 10000 }, steps: { n: 'Passi', u: '', d: 0, max: 100000 }, sleep: { n: 'Sonno', u: 'h', d: 1, max: 16 },
  hrv: { n: 'HRV', u: 'ms', d: 0, max: 300 }, rhr: { n: 'FC a riposo', u: 'bpm', d: 0, max: 150 }, kcalA: { n: 'Calorie attive', u: 'kcal', d: 0, max: 6000 },
};
for (const [k, n] of MEAS) BMET[k] = { n, u: 'cm', d: 1, max: 300, meas: true };

function bodyOn() { return S.body || (S.body = {}); }
function bodyKeys() { return Object.keys(bodyOn()).sort(); }
function bodyVal(d, k) { return d ? (BMET[k]?.meas ? d.meas?.[k] : d[k]) : null; }
/* a day's value: what you typed wins, otherwise what arrived from Apple Health */
function dayVal(key, k) { const b = S.body?.[key], v = b && !(b.demo && S.health?.[key]) ? bodyVal(b, k) : null; if (v != null) return v; return typeof healthDay === 'function' && !BMET[k]?.meas ? healthDay(key)[k] ?? null : null; }
function allDayKeys() { return [...new Set([...Object.keys(bodyOn()), ...Object.keys(S.health || {})])].sort(); }
function bodySeries(k, from = 0) {
  const out = [];
  for (const key of allDayKeys()) { const t = kdate(key); if (t < from) continue; const v = dayVal(key, k); if (v != null && v > 0) out.push({ x: t, y: v, k: key }); }
  return out;
}
/* mean of the weigh-ins in the 7 days ending at t */
function avg7(series, t) { const p = series.filter(s => s.x <= t && s.x > t - 7 * DAY); return p.length ? p.reduce((a, s) => a + s.y, 0) / p.length : null; }
/* least squares slope in units/day */
function slope(pts) {
  const n = pts.length; if (n < 2) return null;
  const mx = pts.reduce((a, p) => a + p.x, 0) / n, my = pts.reduce((a, p) => a + p.y, 0) / n;
  let nu = 0, de = 0; for (const p of pts) { nu += (p.x - mx) * (p.y - my); de += (p.x - mx) ** 2; }
  return de ? nu / de * DAY : null;
}
function weightNow() {
  const s = bodySeries('w'); if (!s.length) return null;
  const last = s[s.length - 1], trend = avg7(s, last.x);
  const recent = s.filter(p => p.x >= last.x - 20 * DAY);
  const span = recent.length ? (last.x - recent[0].x) / DAY : 0;
  const rate = recent.length >= 4 && span >= 7 ? slope(recent) * 7 : null;  // kg/week
  const wkAgo = avg7(s, last.x - 7 * DAY), mAgo = avg7(s, last.x - 30 * DAY);
  return { w: last.y, k: last.k, t: last.x, trend, rate, d7: wkAgo != null ? trend - wkAgo : null, d30: mAgo != null ? trend - mAgo : null, n: s.length, first: s[0] };
}
/* weight used by the diet targets: 7-day average if you weighed in the last 30 days */
function bodyWeight() { const b = weightNow(); return b && Date.now() - b.t < 30 * DAY ? Math.round(b.trend * 10) / 10 : null; }

/* ---------- adaptive maintenance ----------
   intake (complete diary days) minus the energy of the weight change.
   Recalculated once a week (Monday) on the previous 28 days. */
function adaptiveTDEE(asOf = startOfWeek(Date.now())) {
  const n = S.nutri; if (!n) return { ok: false, days: 0, wN: 0 };
  const end = asOf, start = end - 28 * DAY;
  const w0 = bodyWeight() || n.weight, formula = bmr({ ...n, weight: w0 }) * n.act;
  let kc = 0, days = 0;
  for (const [k, d] of Object.entries(S.diary)) {
    const t = kdate(k); if (t < start || t >= end) continue;
    if (!(d.e || []).length) continue;
    const v = dayTotals(k).tot.kcal;
    if (v >= Math.max(900, formula * 0.45)) { kc += v; days++; }   // very low days are probably not fully logged
  }
  const ws = bodySeries('w', start - 3 * DAY).filter(p => p.x < end);
  const span = ws.length ? (ws[ws.length - 1].x - ws[0].x) / DAY : 0;
  const res = { days, wN: ws.length, span: Math.round(span), formula: Math.round(formula), asOf };
  if (days < 10 || ws.length < 6 || span < 14) return { ...res, ok: false };
  const sl = slope(ws), intake = kc / days;
  let tdee = intake - sl * 7700;
  tdee = clamp(tdee, formula * 0.7, formula * 1.3);
  return { ...res, ok: true, intake: Math.round(intake), rate: sl * 7, tdee: Math.round(tdee / 10) * 10, conf: days >= 20 && ws.length >= 12 ? 'alta' : 'media' };
}
const ADAPT_CACHE = { k: null, v: null };
function adaptiveCached() {
  const k = startOfWeek(Date.now()) + '|' + Object.keys(S.diary).length + '|' + Object.keys(bodyOn()).length + '|' + (S.nutri ? S.nutri.act + ':' + S.nutri.weight : '');
  if (ADAPT_CACHE.k !== k) { ADAPT_CACHE.k = k; ADAPT_CACHE.v = adaptiveTDEE(); }
  return ADAPT_CACHE.v;
}

/* ---------- body coach (rules) ---------- */
function bodyCoach() {
  const b = weightNow(), n = S.nutri, out = [];
  if (!b) return out;
  if (b.rate != null && b.trend) {
    const pct = b.rate / b.trend * 100, goal = n ? n.rate : 0;
    if (goal < 0 || (!n && pct < 0)) {
      if (pct < -1) out.push({ lv: 'warn', t: `Scendi di ${fmtN(Math.abs(pct), 1)}% a settimana: troppo veloce. Sopra l'1% rischi di perdere muscolo e forza. Aggiungi ~150–200 kcal.` });
      else if (pct > -0.2) out.push({ lv: 'warn', t: `Peso fermo nelle ultime settimane. Se il diario è preciso, togli 150–200 kcal o aggiungi 2–3 mila passi al giorno.` });
      else out.push({ lv: 'ok', t: `Ritmo buono: ${fmtN(Math.abs(b.rate), 2)} kg a settimana (${fmtN(Math.abs(pct), 1)}%). Tra 0,5 e 1% a settimana tieni il muscolo.` });
    } else if (goal > 0) {
      if (pct > 0.5) out.push({ lv: 'warn', t: `Sali di ${fmtN(pct, 1)}% a settimana: troppo veloce, accumuli soprattutto grasso. Togli ~150 kcal.` });
      else if (pct < 0.1) out.push({ lv: 'warn', t: `Il peso non sale. Per costruire muscolo aggiungi ~150 kcal, meglio da carboidrati intorno all'allenamento.` });
      else out.push({ lv: 'ok', t: `Massa pulita: +${fmtN(b.rate, 2)} kg a settimana (${fmtN(pct, 1)}%). Range ideale 0,25–0,5%.` });
    } else if (Math.abs(pct) > 0.3) out.push({ lv: 'info', t: `Obiettivo mantenimento ma il peso ${pct > 0 ? 'sale' : 'scende'} di ${fmtN(Math.abs(b.rate), 2)} kg a settimana. ${pct > 0 ? 'Togli' : 'Aggiungi'} ~150 kcal.` });
    else out.push({ lv: 'ok', t: 'Peso stabile, in linea col mantenimento.' });
  } else if (b.n < 4) out.push({ lv: 'info', t: 'Pesati 3–4 volte a settimana, al mattino a digiuno dopo il bagno. Dopo 7 giorni vedi la media e il ritmo reale.' });
  const g = S.profile.goalW;
  if (g && b.rate && Math.sign(g - b.trend) === Math.sign(b.rate) && Math.abs(g - b.trend) > 0.3) {
    const wk = Math.abs(g - b.trend) / Math.abs(b.rate);
    if (wk < 150) out.push({ lv: 'info', t: `Obiettivo ${fmtN(g, 1)} kg: a questo ritmo ci arrivi in ~${fmtN(Math.ceil(wk), 0)} settimane (${fmtDate(Date.now() + wk * 7 * DAY)}).` });
  }
  return out;
}
function coachLines(list) {
  return list.map(c => `<div class="row" style="align-items:flex-start;gap:8px"><span style="color:${c.lv === 'warn' ? 'var(--gold)' : c.lv === 'ok' ? 'var(--good)' : 'var(--steel)'};margin-top:1px">${icon(c.lv === 'warn' ? 'info' : c.lv === 'ok' ? 'check' : 'sparkle', 16)}</span><div class="small grow" style="line-height:1.45">${c.t}</div></div>`).join('');
}

/* ---------- composition ---------- */
function heightCm() { return S.nutri?.height || S.profile.height || null; }
function navyBF(meas) {
  const h = heightCm(), sex = S.nutri?.sex || 'm';
  if (!h || !meas?.waist || !meas?.neck) return null;
  let v;
  if (sex === 'm') { if (meas.waist <= meas.neck) return null; v = 495 / (1.0324 - 0.19077 * Math.log10(meas.waist - meas.neck) + 0.15456 * Math.log10(h)) - 450; }
  else { if (!meas.hips) return null; v = 495 / (1.29579 - 0.35004 * Math.log10(meas.waist + meas.hips - meas.neck) + 0.22100 * Math.log10(h)) - 450; }
  return v > 2 && v < 60 ? v : null;
}
function lastOf(k) { const s = bodySeries(k); return s.length ? s[s.length - 1] : null; }
function lastMeas() { const o = {}; for (const [k] of MEAS) { const l = lastOf(k); if (l) o[k] = l.y; } return o; }
function composition() {
  const b = weightNow(); if (!b) return null;
  const bfL = lastOf('bf'), nv = navyBF(lastMeas());
  const bf = bfL ? bfL.y : nv, src = bfL ? 'misurato' : nv != null ? 'stima Navy (misure)' : null;
  if (bf == null) return { w: b.trend };
  const lean = b.trend * (1 - bf / 100), fat = b.trend - lean, h = heightCm();
  const ffmi = h ? lean / (h / 100) ** 2 + 6.1 * (1.8 - h / 100) : null;
  return { w: b.trend, bf, src, lean, fat, ffmi };
}
function ffmiLabel(v) { return v < 18 ? 'sotto la media' : v < 20 ? 'nella media' : v < 22 ? 'sopra la media' : v < 23.5 ? 'ottimo' : v < 25 ? 'eccellente' : 'molto raro senza farmaci'; }

/* ---------- habits ---------- */
function waterGoal() { const w = bodyWeight() || S.nutri?.weight || 75; return Math.round(w * 35 / 250) * 250; }
function stepsGoal() { return S.profile.stepsGoal || 8000; }
function avgLast(k, days = 7) {
  const from = startOfDay(Date.now()) - (days - 1) * DAY, s = bodySeries(k, from);
  return s.length ? { v: s.reduce((a, p) => a + p.y, 0) / s.length, n: s.length } : null;
}

/* ---------- chart: dots = single values, line = 7-day average ---------- */
function bodyChart(series, unit, dec = 1, withTrend = true) {
  if (series.length < 2) return `<div class="small muted">Servono almeno due valori per il grafico.</div>`;
  const W = 320, H = 170, pl = 36, pr = 10, pt = 12, pb = 22;
  const tr = withTrend ? series.map(p => ({ x: p.x, y: avg7(series, p.x) })) : [];
  const ys = [...series.map(p => p.y), ...tr.map(p => p.y)], mn = Math.min(...ys), mx = Math.max(...ys);
  const pad = Math.max(dec ? 0.3 : 1, (mx - mn) * 0.12);
  const step = niceStep((mx - mn + 2 * pad) || 4);
  const lo = Math.floor((mn - pad) / step) * step, hi = Math.ceil((mx + pad) / step) * step;
  const t0 = series[0].x, t1 = series[series.length - 1].x;
  const X = t => pl + (W - pl - pr) * ((t - t0) / ((t1 - t0) || 1));
  const Y = v => pt + (H - pt - pb) * (1 - (v - lo) / ((hi - lo) || 1));
  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += step) g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#2c3440"/><text x="${pl - 6}" y="${Y(v) + 3}" text-anchor="end">${fmtN(v, step < 1 ? 1 : 0)}</text>`;
  const path = arr => arr.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
  const dots = series.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${withTrend ? 2.4 : 2.6}" fill="${withTrend ? '#5b6675' : '#ff8a3d'}"/>`).join('');
  const line = withTrend ? `<path d="${path(tr)}" fill="none" stroke="#ff8a3d" stroke-width="2.4" stroke-linejoin="round"/>` : `<path d="${path(series)}" fill="none" stroke="#ff8a3d" stroke-width="2" stroke-linejoin="round" opacity=".7"/>`;
  const last = withTrend ? tr[tr.length - 1] : series[series.length - 1];
  const lab = `<text x="${pl}" y="${H - 6}">${fmtDate(t0)}</text><text x="${W - pr}" y="${H - 6}" text-anchor="end">${fmtDate(t1)}</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Andamento ${unit}">${g}${dots}${line}<circle cx="${X(last.x)}" cy="${Y(last.y)}" r="5" fill="#ffb547" stroke="#11151b" stroke-width="2"/>${lab}</svg>`;
}
const BRANGE = [['30', '30 g', 30], ['90', '90 g', 90], ['365', '1 anno', 365], ['all', 'Tutto', 0]];
function rangeFrom() { const r = BRANGE.find(x => x[0] === (UI.bRange || '90')); return r[2] ? startOfDay(Date.now()) - (r[2] - 1) * DAY : 0; }
function rangeChips() { return `<div class="chips" style="margin:0;padding:0">${BRANGE.map(r => `<button class="chip ${(UI.bRange || '90') === r[0] ? 'on' : ''}" data-a="bRange" data-v="${r[0]}">${r[1]}</button>`).join('')}</div>`; }
const sgn = (v, d = 1) => v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '') + fmtN(Math.abs(v), d);

/* ---------- view (Progressi → Corpo) ---------- */
function viewBody() {
  const b = weightNow(), comp = composition(), today = todayKey(), td = S.body?.[today] || {};
  const hero = b ? `<div class="card hero">
      <div class="row" style="align-items:flex-start"><div class="grow"><div class="eyebrow" style="color:var(--gold)">Peso · media 7 giorni</div>
        <div style="font-family:var(--font-display);font-size:44px;font-weight:800;line-height:1" class="tnum">${fmtN(b.trend, 1)} <small style="font-size:18px;color:var(--muted)">kg</small></div>
        <div class="small muted">Ultima pesata ${fmtN(b.w, 1)} kg · ${relDay(b.t).toLowerCase()}</div></div>
        <button class="btn primary sm" data-a="bodyLog">${icon('plus', 16)} Registra</button></div>
      ${b.n >= 2 ? `<div class="tiles"><div class="tile"><div class="v" style="font-size:22px">${sgn(b.d7, 1)}${b.d7 != null ? '<small>kg</small>' : ''}</div><div class="k">7 giorni</div></div><div class="tile"><div class="v" style="font-size:22px">${sgn(b.d30, 1)}${b.d30 != null ? '<small>kg</small>' : ''}</div><div class="k">30 giorni</div></div><div class="tile"><div class="v" style="font-size:22px">${b.rate != null ? sgn(b.rate, Math.abs(b.rate) < 1 ? 2 : 1) : '–'}</div><div class="k">kg a settimana</div></div></div>` : ''}
      ${coachLines(bodyCoach())}
      <button class="link small" data-a="goalW" style="align-self:flex-start">${S.profile.goalW ? `Obiettivo ${fmtN(S.profile.goalW, 1)} kg · cambia` : 'Imposta un peso obiettivo'}</button>
    </div>` : `<div class="card hero"><div class="eyebrow" style="color:var(--gold)">Corpo</div><h2 style="font-family:var(--font-display);font-size:28px;text-transform:uppercase">Registra il primo peso</h2><p class="muted small" style="margin:0">Pesati al mattino, a digiuno, dopo il bagno. L'app fa la media dei 7 giorni: le oscillazioni di acqua e sale non ti ingannano più.</p><button class="btn primary block" data-a="bodyLog">${icon('scale', 18)} Registra peso</button></div>`;
  const ws = bodySeries('w', rangeFrom());
  const chart = b && bodySeries('w').length >= 2 ? `<div class="card"><div class="section-title">Andamento peso</div>${rangeChips()}${bodyChart(ws, 'kg')}<div class="small faint">Punti grigi: pesate singole. Linea: media degli ultimi 7 giorni.</div>${weight7HTML()}</div>` : b ? `<div class="card"><div class="section-title">Andamento peso</div>${weight7HTML()}</div>` : '';
  return `${hero}${chart}${recoveryCard()}${adaptCard()}${compCard(comp)}${habitsCard(td)}${measCard()}${photoCard()}
    <div class="list"><button class="li" data-a="bodyHistory">${icon('calendar')}<div class="grow"><div class="t">Storico giorni</div><div class="s">${bodyKeys().length} giorni registrati</div></div>${icon('chev', 18)}</button></div>`;
}
function adaptCard() {
  if (!S.nutri || S.nutri.manual) return '';
  const a = adaptiveCached(), on = !!S.nutri.adapt;
  const body = a.ok ? `<div class="row" style="align-items:flex-end"><div class="grow"><div style="font-family:var(--font-display);font-size:34px;font-weight:800;line-height:1" class="tnum">${fmtN(a.tdee, 0)} <small style="font-size:16px;color:var(--muted)">kcal</small></div><div class="small muted">formula: ${fmtN(a.formula, 0)} kcal · ${a.tdee >= a.formula ? '+' : '−'}${fmtN(Math.abs(a.tdee - a.formula), 0)}</div></div><span class="chip ${a.conf === 'alta' ? 'good' : 'steel'}">affidabilità ${a.conf}</span></div>
      <div class="small muted" style="line-height:1.45">Nelle ultime 4 settimane hai mangiato in media <b>${fmtN(a.intake, 0)} kcal</b> e il peso è ${Math.abs(a.rate) < 0.05 ? 'rimasto stabile' : (a.rate < 0 ? 'sceso' : 'salito') + ` di <b>${fmtN(Math.abs(a.rate), 2)} kg a settimana</b>`}. Quindi il tuo mantenimento reale è circa ${fmtN(a.tdee, 0)} kcal.</div>`
    : `<div class="small muted" style="line-height:1.45">Per calcolarlo servono, nelle ultime 4 settimane, almeno <b>10 giorni di diario completi</b> e <b>6 pesate su 2 settimane</b>.<br>Ora: ${a.days}/10 giorni · ${a.wN}/6 pesate · ${a.span || 0}/14 giorni di pesate.</div>`;
  return `<div class="card"><div class="section-title">Mantenimento reale</div>${body}
    <div class="row"><div class="grow"><div class="lbl" style="color:var(--fg)">Usalo per i miei target</div><div class="small faint">Si aggiorna ogni lunedì. Se mancano dati usa la formula.</div></div><button class="switch ${on ? 'on' : ''}" data-a="adaptToggle" aria-label="Mantenimento adattivo"></button></div></div>`;
}
function compCard(c) {
  if (!c) return '';
  if (c.bf == null) return `<div class="card"><div class="section-title">Composizione</div><div class="small muted">Aggiungi la % di grasso (bilancia impedenziometrica, plicometro, DEXA) oppure vita e collo${S.nutri?.sex === 'f' ? ' e fianchi' : ''}: stimo grasso, massa magra e FFMI.</div><button class="btn sm" data-a="bodyLog" style="align-self:flex-start">${icon('plus', 16)} Aggiungi</button></div>`;
  const bfS = bodySeries('bf', rangeFrom());
  return `<div class="card"><div class="section-title">Composizione <span class="small muted" style="font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:500">${c.src}</span></div>
    <div class="tiles"><div class="tile"><div class="v">${fmtN(c.bf, 1)}<small>%</small></div><div class="k">Grasso</div></div><div class="tile"><div class="v">${fmtN(c.lean, 1)}<small>kg</small></div><div class="k">Massa magra</div></div><div class="tile"><div class="v">${fmtN(c.fat, 1)}<small>kg</small></div><div class="k">Massa grassa</div></div></div>
    ${c.ffmi ? `<div class="row"><div class="grow"><div class="lbl" style="color:var(--fg)">FFMI ${fmtN(c.ffmi, 1)}</div><div class="small faint">Massa magra rispetto all'altezza: ${ffmiLabel(c.ffmi)}.</div></div></div>` : ''}
    ${bfS.length >= 2 ? bodyChart(bfS, '%', 1, false) : ''}
    <div class="small faint">Le bilance a impedenza sbagliano anche di 3–5 punti: guarda la tendenza, non il singolo valore. Pesati sempre nelle stesse condizioni.</div></div>`;
}
function habitsCard(td) {
  const wg = waterGoal(), wv = td.water || 0, sg = stepsGoal(), today = todayKey();
  const aw = avgLast('water'), as = avgLast('steps'), asl = avgLast('sleep');
  const bar = (v, g, col) => `<span class="track" style="display:block;height:8px;border-radius:9px;background:var(--surface-3);overflow:hidden"><span style="display:block;height:100%;width:${clamp(v / g * 100, 0, 100)}%;background:${col};border-radius:9px"></span></span>`;
  return `<div class="card"><div class="section-title">Oggi <button class="link" data-a="bodyLog">Modifica</button></div>
    <div class="stack" style="gap:6px"><div class="row"><span style="color:var(--steel)">${icon('drop', 18)}</span><b class="grow">Acqua</b><span class="small muted tnum">${fmtN(wv / 1000, 2)} / ${fmtN(wg / 1000, 1)} L</span><button class="chip steel" data-a="water" data-v="250">+250</button><button class="chip steel" data-a="water" data-v="500">+500</button></div>${bar(wv, wg, 'var(--steel)')}</div>
    <button class="row" data-a="bodyLog" style="text-align:left"><span style="color:var(--good)">${icon('steps', 18)}</span><b class="grow">Passi</b><span class="small muted tnum">${dayVal(today, 'steps') != null ? fmtN(dayVal(today, 'steps'), 0) : '–'} / ${fmtN(sg, 0)}</span></button>
    <button class="row" data-a="bodyLog" style="text-align:left"><span style="color:var(--gold)">${icon('moon', 18)}</span><b class="grow">Sonno (notte scorsa)</b><span class="small muted tnum">${dayVal(today, 'sleep') != null ? fmtN(dayVal(today, 'sleep'), 1) + ' h' : '–'}</span></button>
    <div class="small faint">Media 7 giorni: acqua ${aw ? fmtN(aw.v / 1000, 1) + ' L' : '–'} · passi ${as ? fmtN(as.v, 0) : '–'} · sonno ${asl ? fmtN(asl.v, 1) + ' h' : '–'}. ${S.health && Object.keys(S.health).length ? 'Passi e sonno arrivano da Apple Salute.' : 'Collega Apple Salute (Profilo) e passi e sonno arrivano da soli.'}</div></div>`;
}
function measCard() {
  const rows = MEAS.map(([k, n]) => { const s = bodySeries(k); if (!s.length) return ''; const l = s[s.length - 1], f = s[0]; return `<button class="li" data-a="bodyMetric" data-k="${k}"><div class="grow"><div class="t">${n}</div><div class="s">${relDay(l.x)}${s.length > 1 ? ' · dal ' + fmtDate(f.x) + ': ' + sgn(l.y - f.y, 1) + ' cm' : ''}</div></div><b class="tnum">${fmtN(l.y, 1)} cm</b>${icon('chev', 18)}</button>`; }).join('');
  return `<div class="stack"><div class="section-title">Misure <button class="link" data-a="bodyLog" data-meas="1">Aggiungi</button></div>${rows ? `<div class="list">${rows}</div>` : `<div class="card tight small muted">Vita, fianchi, petto, braccio, coscia, polpaccio, collo. Misura ogni 2–4 settimane, al mattino, nello stesso punto.</div>`}</div>`;
}

/* ---------- layers ---------- */
function bodyDraft(k) { const d = JSON.parse(JSON.stringify(S.body?.[k] || {})); delete d.demo; d.meas = d.meas || {}; return d; }
function layerBodyLog(l, i) {
  const d = l.draft, k = l.k, today = todayKey();
  const lab = k === today ? 'Oggi' : fmtDateLong(kdate(k));
  const inp = (f, lab, unit, mode = 'decimal', meas) => { const v = meas ? d.meas[f] : d[f]; return `<div class="field"><label>${lab}</label><input class="input" data-in="bdNum" data-f="${f}" ${meas ? 'data-meas="1"' : ''} inputmode="${mode}" data-max="${BMET[f].max}" value="${v != null ? String(v).replace('.', ',') : ''}" placeholder="${unit}"></div>`; };
  const nv = navyBF(d.meas);
  const hd = typeof healthDay === 'function' ? healthDay(k) : {};
  const hp = (f, unit) => hd[f] != null ? fmtN(hd[f], BMET[f].d) + ' (Salute)' : unit;
  return `<div class="layer">${head('Corpo', 'x', `<button class="btn primary sm" data-a="bodySave">Salva</button>`)}
    <div class="layer-body" data-scroll-key="bd${i}"><div class="layer-inner">
      <div class="row datenav"><button class="icon-btn solid" data-a="bdNav" data-d="-1" aria-label="Giorno precedente">${icon('back')}</button><b class="grow" style="text-align:center;font-family:var(--font-display);font-size:20px;text-transform:uppercase">${lab}</b><button class="icon-btn solid" data-a="bdNav" data-d="1" ${k >= today ? 'disabled' : ''} aria-label="Giorno successivo">${icon('chev')}</button></div>
      <div class="card"><div class="lbl">Peso e composizione</div><div class="ed-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${inp('w', 'Peso', 'kg')}${inp('bf', 'Grasso %', '%')}${inp('mm', 'Muscolo kg', 'kg')}</div><div class="small faint">Solo il peso è importante. Grasso e muscolo se hai una bilancia che li misura.</div></div>
      <div class="card"><div class="lbl">Abitudini</div>
        <div class="row"><span style="color:var(--steel)">${icon('drop', 18)}</span><b class="grow">Acqua <span class="tnum">${fmtN((d.water || 0) / 1000, 2)} L</span></b><button class="chip" data-a="bdWater" data-v="-250">−250</button><button class="chip steel" data-a="bdWater" data-v="250">+250</button><button class="chip steel" data-a="bdWater" data-v="500">+500</button></div>
        <div class="ed-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">${inp('steps', 'Passi', hp('steps', 'n.'), 'numeric')}${inp('sleep', 'Sonno ore', hp('sleep', 'h'))}${inp('hrv', 'HRV ms', hp('hrv', 'ms'), 'numeric')}${inp('rhr', 'FC riposo bpm', hp('rhr', 'bpm'), 'numeric')}</div>
        <div class="small faint">${S.health?.[k] ? 'I valori in grigio arrivano da Apple Salute: scrivi solo se vuoi correggerli.' : 'HRV e FC a riposo li trovi in Salute (Apple Watch). Servono per il punteggio di recupero.'}</div></div>
      <div class="card"><button class="row" data-a="bdMeasOpen" style="text-align:left"><b class="grow">Misure <span class="small muted" style="font-weight:500">(cm, facoltative)</span></b>${icon(l.measOpen ? 'up' : 'down', 18)}</button>
        ${l.measOpen ? `<div class="ed-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${MEAS.map(([f, n]) => inp(f, n, 'cm', 'decimal', true)).join('')}</div><div class="small faint" id="bd-navy">${nv != null ? `Stima grasso (metodo Navy): <b>${fmtN(nv, 1)}%</b>` : 'Con vita e collo' + (S.nutri?.sex === 'f' ? ' e fianchi' : '') + ' stimo la % di grasso (serve l\'altezza negli obiettivi dieta).'}</div>` : ''}</div>
      <div class="field"><label>Nota</label><input class="input" data-in="bdNote" value="${esc(d.note || '')}" placeholder="es. dopo cena fuori, ciclo, poco sonno"></div>
      ${S.body?.[k] ? `<button class="btn ghost danger" data-a="bodyDel">${icon('trash', 16)} Elimina il giorno</button>` : ''}
    </div></div></div>`;
}
function layerBodyMetric(l, i) {
  const m = BMET[l.k], s = bodySeries(l.k);
  const rows = [...s].reverse().slice(0, l.all ? 9999 : 30);
  return `<div class="layer">${head(m.n)}<div class="layer-body" data-scroll-key="bm${i}"><div class="layer-inner">
    <div class="card">${bodyChart(s, m.u, m.d, l.k === 'w')}</div>
    <div class="list">${rows.map(p => `<button class="li" data-a="bodyLog" data-k="${p.k}"><div class="grow"><div class="t">${fmtDateLong(p.x)}</div></div><b class="tnum">${fmtN(p.y, m.d)} ${m.u}</b>${icon('chev', 18)}</button>`).join('')}</div>
    ${s.length > rows.length ? `<button class="btn ghost" data-a="bmAll">Mostra tutti (${s.length})</button>` : ''}</div></div></div>`;
}
function layerBodyHistory(l, i) {
  const keys = bodyKeys().reverse();
  const desc = d => [d.w != null && fmtN(d.w, 1) + ' kg', d.bf != null && fmtN(d.bf, 1) + '% grasso', d.water && fmtN(d.water / 1000, 1) + ' L', d.steps != null && fmtN(d.steps, 0) + ' passi', d.sleep != null && fmtN(d.sleep, 1) + ' h sonno', d.meas && Object.keys(d.meas).length && Object.keys(d.meas).length + ' misure'].filter(Boolean).join(' · ');
  return `<div class="layer">${head('Storico corpo')}<div class="layer-body" data-scroll-key="bh${i}"><div class="layer-inner">
    ${keys.length ? `<div class="list">${keys.slice(0, l.all ? 9999 : 60).map(k => `<button class="li" data-a="bodyLog" data-k="${k}"><div class="grow"><div class="t">${fmtDateLong(kdate(k))} ${S.body[k].demo ? '<span class="demo-tag">esempio</span>' : ''}</div><div class="s">${desc(S.body[k]) || '–'}${S.body[k].note ? ' · ' + esc(S.body[k].note) : ''}</div></div>${icon('chev', 18)}</button>`).join('')}</div>` : '<div class="card tight small muted">Nessun dato ancora.</div>'}
    ${keys.length > 60 && !l.all ? `<button class="btn ghost" data-a="bhAll">Mostra tutti (${keys.length})</button>` : ''}</div></div></div>`;
}

/* ---------- progress photos: only on this device (IndexedDB) ---------- */
const PH = { db: null, list: null, urls: new Map(), loading: false };
const POSES = [['front', 'Fronte'], ['side', 'Lato'], ['back', 'Retro']];
function phDB() {
  return new Promise((res, rej) => {
    if (PH.db) return res(PH.db);
    try { const r = indexedDB.open('forgia-photos', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' }); r.onsuccess = () => res(PH.db = r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); }
  });
}
function phTx(mode, fn) { return phDB().then(db => new Promise((res, rej) => { const tx = db.transaction('p', mode), st = tx.objectStore('p'); const out = fn(st); tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out); tx.onerror = () => rej(tx.error); })); }
async function phLoad(force) {
  if ((PH.list && !force) || PH.loading) return;
  PH.loading = true;
  try { const all = await phTx('readonly', st => st.getAll()); PH.list = (all || []).map(p => ({ id: p.id, k: p.k, pose: p.pose, t: p.t, thumb: p.thumb })).sort((a, b) => b.k.localeCompare(a.k) || b.t - a.t); }
  catch (e) { PH.list = []; PH.err = true; }
  PH.loading = false;
  if (UI.tab === 'progress' && UI.progSeg === 'body') render();
}
function phURL(id, blob) { if (!PH.urls.has(id)) PH.urls.set(id, URL.createObjectURL(blob)); return PH.urls.get(id); }
function phFull(id) { return phTx('readonly', st => st.get(id)); }
function shrink(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => { const r = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => b ? res(b) : rej(new Error('blob')), 'image/jpeg', q); };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
    img.src = u;
  });
}
/* the file input lives outside the re-rendered views, so the change event is never lost */
function phInput() { let f = $('#phFile'); if (!f) { f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.id = 'phFile'; f.hidden = true; document.body.appendChild(f); } return f; }
async function phAdd(file, pose, k) {
  try {
    toast('Salvo la foto…');
    const full = await shrink(file, 1600, 0.85), thumb = await shrink(file, 360, 0.75);
    const p = { id: uid(), k, pose, t: Date.now(), full, thumb };
    await phTx('readwrite', st => st.put(p));
    PH.list = null; await phLoad(true); toast('Foto salvata su questo telefono');
  } catch (e) { toast('Non riesco a salvare la foto'); }
}
function photoCard() {
  if (!('indexedDB' in window)) return '';
  if (!PH.list) { phLoad(); return `<div class="card tight small muted">Carico le foto…</div>`; }
  const byDay = new Map(); for (const p of PH.list) { if (!byDay.has(p.k)) byDay.set(p.k, []); byDay.get(p.k).push(p); }
  const days = [...byDay.entries()].slice(0, 6);
  return `<div class="stack"><div class="section-title">Foto progressi <span class="row" style="gap:12px">${PH.list.length >= 2 ? `<button class="link" data-a="phCompare">Confronta</button>` : ''}<button class="link" data-a="phAddAsk">Aggiungi</button></span></div>
    ${days.length ? `<div class="phgrid">${days.map(([k, ps]) => `<button class="phday" data-a="phOpen" data-id="${ps[0].id}"><img src="${phURL(ps[0].id + 't', ps[0].thumb)}" alt="Foto ${fmtDate(kdate(k))}"><span>${fmtDate(kdate(k))}${ps.length > 1 ? ' · ' + ps.length : ''}</span></button>`).join('')}</div>` : `<div class="card tight small muted">Stessa luce, stessa posa, stessa ora: una foto ogni 2–4 settimane mostra cambiamenti che la bilancia non vede. Restano solo su questo telefono, non vanno online.</div>`}
</div>`;
}
function layerPhoto(l, i) {
  const p = PH.list?.find(x => x.id === l.id); if (!p) return `<div class="layer">${head('Foto')}</div>`;
  const same = PH.list.filter(x => x.k === p.k);
  const w = S.body?.[p.k]?.w;
  return `<div class="layer">${head(fmtDateLong(kdate(p.k)), 'back', `<button class="icon-btn" data-a="phDel" data-id="${p.id}" aria-label="Elimina">${icon('trash')}</button>`)}<div class="layer-body" data-scroll-key="ph${i}"><div class="layer-inner">
    <div class="chips" style="margin:0;padding:0">${same.map(x => `<button class="chip ${x.id === p.id ? 'on' : ''}" data-a="phOpen" data-id="${x.id}" data-replace="1">${POSES.find(q => q[0] === x.pose)?.[1] || 'Foto'}</button>`).join('')}</div>
    <img class="phfull" id="ph-img" src="${phURL(p.id + 't', p.thumb)}" alt="">
    <div class="small muted">${POSES.find(q => q[0] === p.pose)?.[1] || ''}${w ? ' · ' + fmtN(w, 1) + ' kg quel giorno' : ''}</div>
  </div></div></div>`;
}
async function phShowFull(id) { try { const r = await phFull(id); const img = $('#ph-img'); if (r && img) img.src = phURL(id, r.full); } catch (e) { } }
function layerPhCompare(l, i) {
  const list = PH.list || [], pose = l.pose;
  const ofPose = list.filter(p => p.pose === pose);
  const a = ofPose.find(p => p.id === l.a) || ofPose[ofPose.length - 1], b = ofPose.find(p => p.id === l.b) || ofPose[0];
  const side = (p, which) => p ? `<div class="stack" style="gap:6px;min-width:0"><img class="phfull" id="phc-${which}" src="${phURL(p.id + 't', p.thumb)}" alt=""><select class="input" data-in="phPick" data-w="${which}">${ofPose.map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${fmtDate(kdate(x.k))} ${kdate(x.k) < Date.now() - 300 * DAY ? new Date(kdate(x.k)).getFullYear() : ''}</option>`).join('')}</select><div class="small muted tnum">${S.body?.[p.k]?.w ? fmtN(S.body[p.k].w, 1) + ' kg' : ''}</div></div>` : '<div class="small muted">Nessuna foto</div>';
  const days = a && b ? Math.round((kdate(b.k) - kdate(a.k)) / DAY) : 0;
  return `<div class="layer">${head('Confronta')}<div class="layer-body" data-scroll-key="pc${i}"><div class="layer-inner">
    <div class="seg">${POSES.map(([k, n]) => `<button class="${pose === k ? 'on' : ''}" data-a="phcPose" data-v="${k}">${n}</button>`).join('')}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${side(a, 'a')}${side(b, 'b')}</div>
    ${days > 0 ? `<div class="small muted">Distanza: ${days} giorni</div>` : ''}</div></div></div>`;
}
async function phCompareFull(l) { for (const w of ['a', 'b']) { const img = $('#phc-' + w); const id = l['_' + w]; if (img && id) { try { const r = await phFull(id); if (r) img.src = phURL(id, r.full); } catch (e) { } } } }

/* ---------- home card ---------- */
function bodyHomeCard() {
  const b = weightNow(), k = todayKey(), td = S.body?.[k] || {}, wg = waterGoal();
  return `<div class="card tight"><div class="row"><span style="color:var(--gold)">${icon('scale', 20)}</span>
    <button class="grow" data-a="bodyLog" style="text-align:left"><b>${dayVal(k, 'w') != null ? fmtN(dayVal(k, 'w'), 1) + ' kg oggi' : 'Pesati'}</b><div class="small muted">${b ? 'Media 7 gg ' + fmtN(b.trend, 1) + ' kg' + (b.d7 != null ? ' · ' + sgn(b.d7, 1) + ' in 7 gg' : '') : 'Al mattino, a digiuno'}</div></button>
    <div class="stack" style="gap:4px;align-items:flex-end"><span class="small muted tnum" style="white-space:nowrap">${fmtN((td.water || 0) / 1000, 1)} / ${fmtN(wg / 1000, 1)} L acqua</span><button class="chip steel" data-a="water" data-v="250" aria-label="Aggiungi 250 ml di acqua">${icon('drop', 14)} +250</button></div></div></div>`;
}

/* ---------- demo ---------- */
function makeBodyDemo() {
  const S0 = 79.6;
  for (let d = 42; d >= 0; d--) {
    const k = dkey(Date.now() - d * DAY); if (S.body?.[k]) continue;
    const r = Math.sin(d * 1.7) * 0.45 + Math.cos(d * 0.9) * 0.25;
    const o = { demo: true };
    if (d % 7 !== 3 && d % 7 !== 5) o.w = Math.round((S0 - (42 - d) * 0.045 + r) * 10) / 10;
    o.water = 1500 + ((d * 37) % 6) * 250; o.steps = 6000 + ((d * 1931) % 6000); o.sleep = Math.round((6.4 + ((d * 7) % 20) / 10) * 10) / 10;
    if (d % 14 === 0) { o.bf = Math.round((17.5 - (42 - d) * 0.03) * 10) / 10; o.meas = { waist: Math.round((84 - (42 - d) * 0.05) * 10) / 10, neck: 38.5, arm: 36.5, chest: 102 }; }
    bodyOn()[k] = o;
  }
  addHealthDemo();
}
function removeBodyDemo() { for (const [k, d] of Object.entries(bodyOn())) if (d.demo) delete S.body[k]; }

Object.assign(LAYER_RENDER, { bodyLog: layerBodyLog, bodyMetric: layerBodyMetric, bodyHistory: layerBodyHistory, photo: layerPhoto, phCompare: layerPhCompare });
Object.assign(A, {
  progSeg(el) { UI.progSeg = el.dataset.v; render(); window.scrollTo(0, 0); },
  bRange(el) { UI.bRange = el.dataset.v; render(); },
  bodyLog(el) { const k = el?.dataset?.k || todayKey(); pushLayer({ type: 'bodyLog', k, draft: bodyDraft(k), measOpen: !!el?.dataset?.meas || Object.keys(bodyDraft(k).meas).length > 0 }); },
  bdNav(el) { const l = topLayer(); const k = dkey(kdate(l.k) + +el.dataset.d * DAY + 7200e3); if (k > todayKey()) return; l.k = k; l.draft = bodyDraft(k); renderLayers(); },
  bdWater(el) { const l = topLayer(); l.draft.water = clamp((l.draft.water || 0) + +el.dataset.v, 0, 10000); renderLayers(); },
  bdMeasOpen() { const l = topLayer(); l.measOpen = !l.measOpen; renderLayers(); },
  bodySave() {
    const l = topLayer(), d = l.draft, o = {};
    for (const f of ['w', 'bf', 'mm', 'water', 'steps', 'sleep', 'hrv', 'rhr']) { const v = num(d[f]); if (v != null && v > 0) o[f] = f === 'steps' || f === 'water' ? Math.round(v) : Math.round(v * 10) / 10; }
    const meas = {}; for (const [f] of MEAS) { const v = num(d.meas[f]); if (v != null && v > 0) meas[f] = Math.round(v * 10) / 10; }
    if (Object.keys(meas).length) o.meas = meas;
    if (d.note && d.note.trim()) o.note = d.note.trim().slice(0, 120);
    if (o.w != null && (o.w < 25 || o.w > 400)) { toast('Controlla il peso'); return; }
    if (Object.keys(o).length) bodyOn()[l.k] = o; else delete bodyOn()[l.k];
    save(); popLayer(); render(); toast('Salvato');
  },
  bodyDel() { const l = topLayer(); delete bodyOn()[l.k]; save(); popLayer(); render(); toast('Giorno eliminato'); },
  water(el) { const k = todayKey(), d = bodyOn()[k] || (S.body[k] = {}); delete d.demo; d.water = clamp((d.water || 0) + +el.dataset.v, 0, 10000); save(); render(); haptic(); toast(`Acqua ${fmtN(d.water / 1000, 2)} L`); },
  bodyMetric(el) { pushLayer({ type: 'bodyMetric', k: el.dataset.k }); },
  bmAll() { topLayer().all = true; renderLayers(); },
  bodyHistory() { pushLayer({ type: 'bodyHistory' }); },
  bhAll() { topLayer().all = true; renderLayers(); },
  adaptToggle() {
    if (!S.nutri) return; S.nutri.adapt = !S.nutri.adapt; save(); render();
    const a = adaptiveCached(); toast(S.nutri.adapt ? (a.ok ? `Target su ${fmtN(a.tdee, 0)} kcal di mantenimento` : 'Attivo: parte appena ci sono abbastanza dati') : 'Torno alla formula');
  },
  goalW() {
    pushLayer({ type: 'sheet', title: 'Peso obiettivo', html: `<div class="field"><label for="goal-w">kg (lascia vuoto per toglierlo)</label><input id="goal-w" class="input" inputmode="decimal" data-max="400" value="${S.profile.goalW ?? ''}"></div><button class="btn primary block" style="margin-top:12px" data-a="goalWSave">Salva</button>`, items: [] });
    setTimeout(() => $('#goal-w')?.focus(), 50);
  },
  goalWSave() { const v = num($('#goal-w')?.value); S.profile.goalW = v && v > 25 && v < 400 ? v : null; save(); popLayer(); render(); },
  phAddAsk() {
    pushLayer({ type: 'sheet', title: 'Nuova foto', html: '<p class="small muted" style="margin:0 0 8px">Resta solo su questo telefono. Non va nel backup né online.</p>', items: POSES.map(([k, n]) => ({ label: n, ic: 'camera', fn: () => { PH.pose = k; phInput().click(); } })) });
  },
  phOpen(el) { const id = el.dataset.id; if (el.dataset.replace) { topLayer().id = id; renderLayers(); } else pushLayer({ type: 'photo', id }); phShowFull(id); },
  phDel(el) {
    const id = el.dataset.id;
    pushLayer({ type: 'confirm', title: 'Eliminare la foto?', text: 'Non si può recuperare.', ok: 'Elimina', danger: true, fn: async () => { try { await phTx('readwrite', st => st.delete(id)); } catch (e) { } closeLayersOfType('photo'); PH.list = null; await phLoad(true); renderLayers(); } });
  },
  phCompare() { const l = { type: 'phCompare', pose: (PH.list.find(p => p.pose === 'front') || PH.list[0]).pose }; pushLayer(l); setTimeout(() => phCompareSync(l), 30); },
  phcPose(el) { const l = topLayer(); l.pose = el.dataset.v; l.a = l.b = null; renderLayers(); phCompareSync(l); },
});
function phCompareSync(l) {
  const ofPose = (PH.list || []).filter(p => p.pose === l.pose);
  l._a = l.a || ofPose[ofPose.length - 1]?.id; l._b = l.b || ofPose[0]?.id; phCompareFull(l);
}
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.in; if (!k) return;
  const l = topLayer();
  if (k === 'bdNum' && l?.type === 'bodyLog') {
    if (el.dataset.meas) l.draft.meas[el.dataset.f] = el.value; else l.draft[el.dataset.f] = el.value;
    const n = $('#bd-navy'); if (n && el.dataset.meas) { const m = {}; for (const [f] of MEAS) { const v = num(l.draft.meas[f]); if (v) m[f] = v; } const nv = navyBF(m); if (nv != null) n.innerHTML = `Stima grasso (metodo Navy): <b>${fmtN(nv, 1)}%</b>`; }
  }
  if (k === 'bdNote' && l?.type === 'bodyLog') l.draft.note = el.value;
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.in === 'stepsGoal') { S.profile.stepsGoal = +el.value; save(); }
  if (el.id === 'phFile' && el.files && el.files[0]) { const k = topLayer()?.type === 'bodyLog' ? topLayer().k : todayKey(); phAdd(el.files[0], PH.pose || 'front', k); el.value = ''; }
  if (el.dataset.in === 'phPick') { const l = topLayer(); l[el.dataset.w] = el.value; l['_' + el.dataset.w] = el.value; renderLayers(); phCompareFull(l); }
});
