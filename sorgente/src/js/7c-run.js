/* =========================================================
   CORSA
   S.runs = [{ id, start, sec, km, type, title, hr, elev, rpe, note, splits:[s per km], route:[[lat,lon]], src:'gps'|'man'|'gpx', plan:{w,i}, demo }]
   S.runActive = corsa in corso (solo su questo telefono, non sincronizzata)
   S.runPlan = { kind, start (lunedì), done: { 'w-i': runId } }
   ========================================================= */
Object.assign(IC, {
  runner: '<circle cx="15" cy="4.5" r="2"/><path d="M13 8l-2 6M13 8 9.5 10.5 6.5 9.5M13 8l3 3.5h3M11 14l3 3-1 4M11 14l-3 3.5H4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7"/>',
  volx: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l4 6M21 9l-4 6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
});

const RUN_T = {
  free: { n: 'Corsa', c: '#ff8a3d', d: 'Corsa libera' },
  easy: { n: 'Facile', c: '#3ddc97', d: 'Ritmo comodo: riesci a parlare' },
  long: { n: 'Lungo', c: '#7fb2e5', d: 'La più lunga della settimana, piano' },
  tempo: { n: 'Ritmo', c: '#ffb547', d: 'Sostenuto e regolare, vicino alla soglia' },
  int: { n: 'Intervalli', c: '#ff5c6c', d: 'Tratti veloci e recuperi' },
  race: { n: 'Gara', c: '#c792ea', d: 'Gara o prova a tutta' },
  walk: { n: 'Camminata', c: '#8b95a4', d: 'Camminata veloce o escursione' },
};
const PACE_F = { E: [0.65, 0.74], M: 0.80, T: 0.88, I: 0.975, R: 1.08 };
const PACE_N = { E: ['Facile', 'riesci a parlare, la maggior parte dei km'], M: ['Maratona', 'sostenuto ma regolare'], T: ['Soglia', 'impegnativo ma controllato, 20–40 min in totale'], I: ['Intervalli', 'forte, tratti da 2–5 min'], R: ['Ripetute', 'molto veloce, tratti brevi da 200–400 m'] };
const STEP_N = { warm: 'Riscaldamento', run: 'Corri', walk: 'Cammina', fast: 'Veloce', rec: 'Recupero', cool: 'Defaticamento', steady: 'Ritmo' };
const STEP_HI = ['run', 'fast', 'steady'];
const EFFORTS = [[1, '1 km'], [5, '5 km'], [10, '10 km'], [21.0975, 'Mezza'], [42.195, 'Maratona']];

/* ---------- helpers ---------- */
function runs() { return S.runs || (S.runs = []); }
function runsSorted() { return [...runs()].sort((a, b) => b.start - a.start); }
function paceTxt(s) { if (!s || !isFinite(s) || s > 3600 || s < 60) return '–:––'; s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function runPace(r) { return r && r.km > 0 && r.sec > 0 ? r.sec / r.km : null; }
function kmTxt(m) { return (Math.floor(m / 10) / 100).toFixed(2).replace('.', ','); }
function durShort(s) { const m = Math.floor(s / 60), r = Math.round(s % 60); return r ? (m ? `${m}'${String(r).padStart(2, '0')}"` : `${r}"`) : `${m}'`; }
function hav(a, b) { const R = 6371000, k = Math.PI / 180, dLa = (b[0] - a[0]) * k, dLo = (b[1] - a[1]) * k; const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * k) * Math.cos(b[0] * k) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.min(1, Math.sqrt(x))); }
function runTitle(r) { return r.title || (RUN_T[r.type] || RUN_T.free).n; }
function runKcal(r) { return kcalRun(r)?.net ?? 0; }
function hhmm(t) { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

/* ---------- fitness: Daniels VDOT ---------- */
function vdotOf(km, sec) {
  if (!km || !sec || km < 0.8) return null;
  const t = sec / 60, v = km * 1000 / t;
  if (v < 100 || v > 450) return null;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const pct = 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
  return vo2 / pct;
}
function predictSec(vd, km) { let lo = km * 100, hi = km * 1500; for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (vdotOf(km, mid) > vd) lo = mid; else hi = mid; } return (lo + hi) / 2; }
function paceAt(vd, f) { const a = 0.000104, b = 0.182258, c = -(vd * f + 4.6), v = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a); return 60000 / v; }
function runVdot() {
  const t0 = Date.now() - 120 * DAY; let best = null;
  for (const r of runs()) if (r.start >= t0 && r.km >= 1.5 && r.type !== 'walk' && runPace(r) >= 150) { const v = vdotOf(r.km, r.sec); if (v && (!best || v > best.v)) best = { v, r }; }
  const ref = S.profile.runRef; if (ref && ref.at >= Date.now() - 240 * DAY) { const v = vdotOf(ref.km, ref.sec); if (v && (!best || v > best.v)) best = { v, ref }; }
  if (best) best.v = clamp(best.v, 20, 85);
  return best;
}
function paceFor(code, vd) { vd = vd || runVdot()?.v; if (!vd || !PACE_F[code]) return null; const f = PACE_F[code]; return Array.isArray(f) ? [paceAt(vd, f[1]), paceAt(vd, f[0])] : paceAt(vd, f); }
function paceLabel(code) { const p = paceFor(code); if (!p) return PACE_N[code] ? PACE_N[code][1] : ''; return Array.isArray(p) ? paceTxt(p[0]) + '–' + paceTxt(p[1]) + '/km' : paceTxt(p) + '/km'; }
function effortOf(r, D) {
  if (!r || r.km < D - 0.02) return null;
  const sp = r.splits || [], k = Math.round(D);
  if (Math.abs(D - k) < 0.01 && sp.length >= k) { let t = null; for (let i = 0; i + k <= sp.length; i++) { const s = sp.slice(i, i + k).reduce((a, b) => a + b, 0); if (t == null || s < t) t = s; } return t; }
  return r.sec * D / r.km;
}
function bestEffort(D, except) { let best = null; for (const r of runs()) { if (r === except || r.type === 'walk') continue; const t = effortOf(r, D); if (t && (!best || t < best.sec)) best = { sec: t, r }; } return best; }
function hrMax() { return S.profile.hrMax || (S.nutri?.age ? Math.round(208 - 0.7 * S.nutri.age) : null); }

/* ---------- plans ---------- */
const RUN_PLANS = [
  { k: '5k', n: 'Da 0 a 5 km', d: '8 settimane, 3 uscite a settimana. Alterni corsa e camminata fino a correre 25–30 minuti di fila.', need: 'Per chi parte da zero o riprende dopo tanto.' },
  { k: '10k', n: '10 km', d: '8 settimane, 3 uscite: una facile, una di qualità (ripetute o ritmo), un lungo.', need: 'Serve già correre 30 minuti senza fermarti.' },
  { k: '21k', n: 'Mezza maratona', d: '10 settimane, 3 uscite: facile, qualità e lungo fino a 17 km.', need: 'Serve già correre 8–10 km.' },
];
function intSteps(n, on, off, o = {}) {
  const st = [], warm = o.warm ?? 600, cool = o.cool ?? 600;
  if (warm) st.push({ k: 'warm', s: warm, p: o.walk ? undefined : 'E' });
  for (let i = 0; i < n; i++) { st.push({ k: o.onK || 'fast', s: on, p: o.p === undefined ? 'I' : o.p || undefined }); if (off && i < n - 1) st.push({ k: o.offK || 'rec', s: off }); }
  if (cool) st.push({ k: 'cool', s: cool, p: o.walk ? undefined : 'E' });
  return st;
}
function sessInt(n, on, off) { return { t: 'int', n: `${n} × ${durShort(on)} veloce · rec ${durShort(off)}`, steps: intSteps(n, on, off) }; }
function sessTempo(n, on, off, p = 'T') { return { t: 'tempo', n: n > 1 ? `${n} × ${durShort(on)} a ritmo ${p === 'M' ? 'maratona' : 'soglia'} · rec ${durShort(off)}` : `${durShort(on)} a ritmo ${p === 'M' ? 'maratona' : 'soglia'}`, steps: intSteps(n, on, off, { p, onK: 'steady' }) }; }
function planWeeks(kind) {
  const W = [];
  if (kind === '5k') {
    const C = [[60, 90, 8], [120, 90, 6], [180, 90, 5], [300, 120, 4], [480, 120, 3], [720, 120, 2], [900, 60, 2], [1500, 0, 1]];
    C.forEach(([on, off, n], w) => {
      const s = { t: 'int', n: n > 1 ? `${n} × ${durShort(on)} corsa · ${durShort(off)} camminata` : `${durShort(on)} di corsa continua`, steps: intSteps(n, on, off, { warm: 300, cool: 300, walk: true, p: null, onK: 'run', offK: 'walk' }) };
      W.push([s, s, w === 7 ? { t: 'race', n: 'Prova: 5 km di corsa', km: 5 } : s]);
    });
  } else if (kind === '10k') {
    const easy = [4, 5, 5, 6, 5, 6, 6, 4], long = [6, 7, 8, 7, 9, 10, 8, 10];
    const Q = [() => sessInt(6, 120, 90), () => sessTempo(2, 480, 120), () => sessInt(5, 180, 120), () => sessTempo(1, 1200), () => sessInt(6, 180, 120), () => sessTempo(1, 1500), () => sessInt(4, 240, 150), () => sessInt(4, 120, 120)];
    for (let w = 0; w < 8; w++) W.push([{ t: 'easy', n: `${easy[w]} km facili`, km: easy[w], p: 'E' }, Q[w](), w === 7 ? { t: 'race', n: 'Gara o prova 10 km', km: 10 } : { t: 'long', n: `Lungo ${long[w]} km`, km: long[w], p: 'E' }]);
  } else if (kind === '21k') {
    const easy = [5, 6, 6, 7, 6, 7, 8, 7, 6, 4], long = [10, 11, 13, 10, 14, 16, 12, 17, 12, 21.1];
    const Q = [() => sessInt(6, 180, 120), () => sessTempo(1, 1200), () => sessInt(5, 240, 150), () => sessTempo(1, 1500), () => sessInt(6, 240, 120), () => sessTempo(2, 900, 180), () => sessTempo(1, 2400, 0, 'M'), () => sessTempo(1, 1800), () => sessTempo(3, 600, 120), () => sessInt(4, 180, 120)];
    for (let w = 0; w < 10; w++) W.push([{ t: 'easy', n: `${easy[w]} km facili`, km: easy[w], p: 'E' }, Q[w](), w === 9 ? { t: 'race', n: 'Mezza maratona', km: 21.1 } : { t: 'long', n: `Lungo ${long[w]} km`, km: long[w], p: 'E' }]);
  }
  return W;
}
function planState() {
  const p = S.runPlan; if (!p) return null;
  const meta = RUN_PLANS.find(x => x.k === p.kind); if (!meta) return null;
  const weeks = planWeeks(p.kind), done = p.done || {};
  const wNow = Math.round((startOfWeek(Date.now()) - p.start) / (7 * DAY));
  const w = clamp(wNow, 0, weeks.length - 1);
  const total = weeks.reduce((a, x) => a + x.length, 0), nDone = Object.keys(done).length;
  let next = null;
  for (let ww = Math.max(0, Math.min(w, weeks.length - 1)); ww < weeks.length && !next; ww++) weeks[ww].forEach((s, i) => { if (!next && !done[ww + '-' + i]) next = { w: ww, i, s }; });
  return { p, meta, weeks, w, wNow, done, total, nDone, next, over: wNow >= weeks.length || nDone >= total };
}
function sessHint(s) { if (s.steps) { const tot = s.steps.reduce((a, x) => a + x.s, 0); const q = s.steps.find(x => STEP_HI.includes(x.k)); return `~${Math.round(tot / 60)} min${q && q.p ? ' · ' + PACE_N[q.p][0].toLowerCase() + ' ' + paceLabel(q.p) : ''}`; } return s.p ? PACE_N[s.p][0] + ' ' + paceLabel(s.p) : s.t === 'race' ? 'A tutta, gestendo il ritmo' : ''; }

/* ---------- live run: GPS, timer, voice ---------- */
const RUN = { watch: null, tick: null, saveT: null, audio: null, url: null, primed: false, hold: null };
const RUN_HOLE = 20000;    // oltre 20 s senza un rilevamento usabile = segnale perso, non una sosta
const RUN_ELEV_A = 0.15;   // quanto pesa una quota nuova nella media mobile
const RUN_ELEV_H = 5;      // salita minima in metri da considerare vera e non rumore
/* Tempo totale: quello del cronometro da polso. Si ferma solo con la pausa a mano. */
function runElapsed(a = S.runActive, now = Date.now()) { if (!a) return 0; return ((a.pauseAt || now) - a.start - (a.pausedMs || 0)) / 1000; }
/* Tempo misurato: il totale meno i tratti in cui il GPS era muto. E' la base di passi e
   parziali, perche' di quei tratti non sappiamo ne' quanto si e' corso ne' quanta strada. */
function runMoving(a = S.runActive, now = Date.now()) { if (!a) return 0; return runElapsed(a, now) - (a.lostMs || 0) / 1000; }
function runSaveSoon() { if (RUN.saveT) return; RUN.saveT = setTimeout(() => { RUN.saveT = null; try { localStorage.setItem(KEY, serialize(S)); } catch (e) { } }, 6000); }
function say(txt) {
  if (S.profile.runVoice === false) return;
  try { const ss = window.speechSynthesis; if (!ss) return; ss.cancel(); const u = new SpeechSynthesisUtterance(tr(txt)); u.lang = locale(); u.rate = 1.02; const v = ss.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith(lang())); if (v) u.voice = v; ss.speak(u); } catch (e) { }
}
function speechPrime() { try { const ss = window.speechSynthesis; if (ss && !RUN.primed) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; ss.speak(u); RUN.primed = true; } } catch (e) { } }
const VOICE_W = {
  it: { and: 'e', flat: 'netti', h: ['ora', 'ore'], m: ['minuto', 'minuti'], s: 'secondi', km: ['chilometro', 'chilometri'], comma: ' virgola ' },
  en: { and: 'and', flat: 'flat', h: ['hour', 'hours'], m: ['minute', 'minutes'], s: 'seconds', km: ['kilometre', 'kilometres'], comma: ' point ' },
  es: { and: 'y', flat: 'justos', h: ['hora', 'horas'], m: ['minuto', 'minutos'], s: 'segundos', km: ['kilómetro', 'kilómetros'], comma: ' coma ' },
};
function vw() { return VOICE_W[lang()] || VOICE_W.it; }
function sayPace(sec) { if (!sec || !isFinite(sec)) return ''; const s = Math.round(sec), m = Math.floor(s / 60), r = s % 60, W = vw(); return r ? `${m} ${W.and} ${r}` : `${m} ${W.flat}`; }
function sayDur(sec) { const s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60, W = vw(); return [h ? `${h} ${W.h[h === 1 ? 0 : 1]}` : '', m ? `${m} ${W.m[m === 1 ? 0 : 1]}` : '', r && !h ? `${r} ${W.s}` : ''].filter(Boolean).join(` ${W.and} `) || `0 ${W.s}`; }
function runTone(hi) {
  if (S.profile.sound === false) return; unlockAudio(); if (!AC) return;
  try { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = hi ? 988 : 523; g.gain.setValueAtTime(0.0001, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.45, AC.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + (hi ? 0.5 : 0.18)); o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + 0.55); } catch (e) { }
}

function startRun(o = {}) {
  unlockAudio(); speechPrime();
  if (S.runActive) return openRun();
  S.runActive = { id: uid(), start: Date.now() + 3000, type: o.type || 'free', gps: o.gps !== false, sess: o.sess || null, planRef: o.planRef || null, pausedMs: 0, pauseAt: 0, pts: [], m: 0, splits: [], splitAt: 0, acc: null, si: 0, stepT0: 0, lostMs: 0, fixAt: 0, holes: 0, elev: 0, eSm: null, eRef: null };
  save(); UI.runLock = false;
  closeLayersOfType('run'); pushLayer({ type: 'run' }); requestWake(); runResume();
}
function openRun() { closeLayersOfType('run'); pushLayer({ type: 'run' }); requestWake(); runResume(); }
function runResume() {
  const a = S.runActive; if (!a) return;
  if (a.gps && RUN.watch == null) {
    if (!navigator.geolocation) a.gpsErr = 'Questo dispositivo non dà la posizione';
    else try { RUN.watch = navigator.geolocation.watchPosition(runPos, runPosErr, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }); } catch (e) { a.gpsErr = 'Posizione non disponibile'; }
  }
  if (!RUN.tick) RUN.tick = setInterval(runTick, 1000);
  if (a.sess?.steps && !a.pauseAt && runElapsed(a) > 0) runAudioStart();
}
function runDetach() { if (typeof liveMapDestroy === 'function') liveMapDestroy(); if (RUN.watch != null) { try { navigator.geolocation.clearWatch(RUN.watch); } catch (e) { } RUN.watch = null; } clearInterval(RUN.tick); RUN.tick = null; runAudioStop(); }
function runPosErr(err) {
  const a = S.runActive; if (!a) return;
  a.gpsErr = err && err.code === 1 ? 'Posizione negata: attivala in Impostazioni › Privacy › Localizzazione' : err && err.code === 3 ? null : 'Segnale GPS assente';
  runUpdateDom();
}
/* Dislivello positivo dal GPS. La quota satellitare balla di oltre 10 m anche stando fermi:
   prima si smussa con una media mobile, poi si somma solo quando la salita supera RUN_ELEV_H.
   Senza i due passaggi si "guadagnerebbero" centinaia di metri in pianura. */
function runElev(a, c) {
  const e = c.altitude;
  if (e == null || !isFinite(e) || (c.altitudeAccuracy != null && c.altitudeAccuracy > 15)) return;
  a.eSm = a.eSm == null ? e : a.eSm + RUN_ELEV_A * (e - a.eSm);
  if (a.eRef == null) { a.eRef = a.eSm; return; }
  if (a.eSm > a.eRef + RUN_ELEV_H) { a.elev = (a.elev || 0) + (a.eSm - a.eRef); a.eRef = a.eSm; }
  else if (a.eSm < a.eRef - RUN_ELEV_H) a.eRef = a.eSm;
}
function runPos(p) {
  const a = S.runActive; if (!a) return;
  const c = p.coords; a.acc = Math.round(c.accuracy); a.gpsAt = Date.now(); a.gpsErr = null;
  const ts = p.timestamp && p.timestamp > 1e12 ? Math.min(p.timestamp, Date.now()) : Date.now();
  if (runElapsed(a, ts) < 0 || a.pauseAt || c.accuracy > 35) return;
  // Buco di segnale: per un po' non e' arrivato nessun rilevamento usabile. Non sappiamo se ha
  // corso o si e' fermato, quindi quel tratto resta non misurato - tempo e distanza - invece di
  // scaricare tutti i minuti morti sul chilometro che era in corso.
  if (a.fixAt && ts - a.fixAt > RUN_HOLE) { a.lostMs = (a.lostMs || 0) + (ts - a.fixAt); a.holes = (a.holes || 0) + 1; a.gap = true; }
  a.fixAt = ts;
  runElev(a, c);
  const t = runMoving(a, ts);
  const pt = [+c.latitude.toFixed(6), +c.longitude.toFixed(6), Math.round(t * 10) / 10];
  const last = a.pts[a.pts.length - 1];
  if (!last || a.gap) { a.gap = false; a.pts.push([...pt, Math.round(a.m)]); if (typeof liveMapUpdate === 'function') liveMapUpdate(); runSaveSoon(); return; }
  const d = hav(last, pt), dt = pt[2] - last[2];
  if (dt <= 0 || d / dt > 9) return;                       // GPS jump (over 32 km/h)
  if (d < Math.max(4, c.accuracy * 0.25)) return;          // jitter while standing
  const m0 = a.m; a.m += d; a.pts.push([...pt, Math.round(a.m)]);
  if (typeof liveMapUpdate === 'function') liveMapUpdate();
  while (a.m >= (a.splits.length + 1) * 1000) {
    const target = (a.splits.length + 1) * 1000, tk = last[2] + dt * ((target - m0) / d);
    a.splits.push(Math.round(tk - a.splitAt)); a.splitAt = tk; runSplitCue(a);
  }
  runSaveSoon();
}
function runCurPace(a) {
  const P = a.pts; if (P.length < 2 || a.pauseAt) return null;
  const last = P[P.length - 1]; if (runMoving(a) - last[2] > 15) return null;
  let j = P.length - 1; while (j > 0 && last[2] - P[j - 1][2] <= 30) j--;
  const o = P[j], dm = last[3] - o[3], dt = last[2] - o[2];
  return dm >= 25 && dt >= 5 ? dt / dm * 1000 : null;
}
function runGps(a) {
  if (!a.gps) return ['Senza GPS', ''];
  if (a.gpsErr) return [a.gpsErr, 'bad'];
  if (!a.gpsAt || Date.now() - a.gpsAt > 15000) return ['GPS: cerco il segnale…', 'warn'];
  return a.acc <= 15 ? ['GPS ottimo', 'ok'] : a.acc <= 35 ? ['GPS buono', 'ok'] : [`GPS debole (±${a.acc} m)`, 'warn'];
}
function runSplitCue(a) {
  const k = a.splits.length, last = a.splits[k - 1], avg = runMoving(a) / (a.m / 1000);
  say({ it: `${k} ${vw().km[k === 1 ? 0 : 1]}. Ultimo in ${sayPace(last)}. Media ${sayPace(avg)}.`, en: `${k} ${vw().km[k === 1 ? 0 : 1]}. Last one in ${sayPace(last)}. Average ${sayPace(avg)}.`, es: `${k} ${vw().km[k === 1 ? 0 : 1]}. El último en ${sayPace(last)}. Media ${sayPace(avg)}.` }[lang()]); haptic([60, 60, 60]);
  if (topLayer()?.type === 'run') renderLayers();
}
function runStepCue(a) {
  const st = a.sess.steps, cur = st[a.si];
  if (!cur) { say('Allenamento finito, ottimo lavoro. Puoi continuare piano o premere Fine.'); runTone(true); haptic([200, 100, 200]); return; }
  const same = st.filter(s => s.k === cur.k).length, idx = st.slice(0, a.si + 1).filter(s => s.k === cur.k).length;
  const pz = cur.p && !Array.isArray(paceFor(cur.p)) && paceFor(cur.p) ? `, passo ${sayPace(paceFor(cur.p))}` : '';
  say(`${STEP_N[cur.k]}${same > 1 ? ` ${idx} di ${same}` : ''}. ${sayDur(cur.s)}${pz}.`);
  runTone(STEP_HI.includes(cur.k)); haptic(STEP_HI.includes(cur.k) ? [120, 80, 120] : 200);
}
function runTick() {
  const a = S.runActive; if (!a) { runDetach(); return; }
  // I tratti dell'allenamento seguono il tempo totale: un buco di GPS non deve allungare
  // un minuto di corsa veloce. Passi e parziali invece usano il tempo misurato.
  const t = runElapsed(a);
  if (t < 0) { const n = Math.ceil(-t); if (a.cd !== n) { a.cd = n; if (n <= 3) { say(String(n)); runTone(false); } } }
  else if (!a.go) { a.go = true; if (!a.sess?.steps) say('Via!'); runTone(true); if (a.sess?.steps) runStepCue(a); runAudioStart(); if (topLayer()?.type === 'run') renderLayers(); }
  if (a.sess?.steps && !a.pauseAt && t >= 0) {
    const st = a.sess.steps; let changed = false;
    while (a.si < st.length && t >= a.stepT0 + st[a.si].s) { a.stepT0 += st[a.si].s; a.si++; changed = true; }
    if (changed) { runStepCue(a); save(); if (topLayer()?.type === 'run') renderLayers(); }
    else { const cur = st[a.si]; if (cur) { const left = Math.ceil(a.stepT0 + cur.s - t); if (left >= 1 && left <= 3 && a.cdBeep !== a.si * 10 + left) { a.cdBeep = a.si * 10 + left; runTone(false); } } }
  }
  if (a.sess?.km && !a.kmDone && a.m >= a.sess.km * 1000) { a.kmDone = true; say({ it: `Obiettivo raggiunto: ${String(a.sess.km).replace('.', vw().comma)} ${vw().km[1]}. Tempo ${sayDur(runMoving(a))}.`, en: `Goal reached: ${String(a.sess.km).replace('.', vw().comma)} ${vw().km[1]}. Time ${sayDur(runMoving(a))}.`, es: `Objetivo alcanzado: ${String(a.sess.km).replace('.', vw().comma)} ${vw().km[1]}. Tiempo ${sayDur(runMoving(a))}.` }[lang()]); runTone(true); }
  runUpdateDom();
}
function runVals(a) {
  const t = runMoving(a), te = runElapsed(a), km = a.m / 1000;
  return {
    time: fmtClock(Math.max(0, t) * 1000), km: kmTxt(a.m), avg: km > 0.05 ? paceTxt(t / km) : '–:––',
    cur: paceTxt(runCurPace(a)), gps: runGps(a), t, te,
    tot: te - t >= 10 ? `totale ${fmtClock(Math.max(0, te) * 1000)}` : '',
    elev: a.elev >= 5 ? `${Math.round(a.elev)} m D+` : '',
  };
}
function runUpdateDom() {
  const a = S.runActive; if (!a || topLayer()?.type !== 'run') return;
  const v = runVals(a), set = (id, x) => { const el = document.getElementById(id); if (el && el.textContent !== x) el.textContent = x; };
  set('rn-time', v.time); set('rn-km', v.km); set('rn-avg', v.avg); set('rn-cur', v.cur); set('rl-time', v.time); set('rl-km', v.km); set('rl-pace', v.cur !== '–:––' ? v.cur : v.avg);
  set('rn-tot', v.tot); set('rn-elev', v.elev);
  const g = document.getElementById('rn-gps'); if (g) { g.textContent = v.gps[0]; g.className = 'gps ' + v.gps[1]; }
  const cd = document.getElementById('rn-cd'); if (cd) { if (v.te >= 0) cd.remove(); else cd.textContent = Math.ceil(-v.te); }
  const st = a.sess?.steps && a.sess.steps[a.si];
  if (st) { const left = Math.max(0, a.stepT0 + st.s - Math.max(0, v.te)); set('rn-step', fmtClock(left * 1000 + 999)); const b = document.getElementById('rn-stepbar'); if (b) b.style.width = (100 * (1 - left / st.s)).toFixed(1) + '%'; }
}
function runRoute(P) {
  const out = []; let last = null;
  for (const p of P) { if (!last || hav(last, p) >= 12) { out.push([+p[0].toFixed(5), +p[1].toFixed(5)]); last = p; } }
  if (P.length && out.length > 1) { const e = P[P.length - 1]; out[out.length - 1] = [+e[0].toFixed(5), +e[1].toFixed(5)]; }
  if (out.length > 800) { const k = Math.ceil(out.length / 800); return out.filter((_, i) => i % k === 0 || i === out.length - 1); }
  return out;
}
function runFinish() {
  const a = S.runActive; if (!a) return;
  const t = Math.max(0, runMoving(a));
  runDetach(); try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) { }
  S.runActive = null; UI.runLock = false;
  if (!S.active) releaseWake();
  closeLayersOfType('run');
  if (t < 20 && a.m < 50) { save(); renderLayers(); render(); toast('Corsa troppo breve: non salvata'); return; }
  const r = { id: a.id, start: a.start, sec: Math.round(t), km: a.gps ? +(a.m / 1000).toFixed(2) : 0, type: a.type, splits: a.splits, route: runRoute(a.pts), src: a.gps ? 'gps' : 'man' }; if (!a.gps) r.indoor = true;
  const tot = Math.max(0, runElapsed(a));
  if (tot - t >= 10) { r.secTot = Math.round(tot); r.lost = Math.round((a.lostMs || 0) / 1000); r.holes = a.holes || 0; }
  if (a.elev >= 5) r.elev = Math.round(a.elev);
  if (a.sess?.n) r.title = a.sess.n;
  if (a.planRef) r.plan = a.planRef;
  if (!r.route.length) delete r.route;
  if (r.km > 0) { runs().push(r); runPlanMark(r); save(); runPRToast(r); }
  render();
  pushLayer({ type: 'runEdit', draft: JSON.parse(JSON.stringify(r)), isNew: !(r.km > 0), fromTrack: true });
}
function runPlanMark(r) { if (r.plan && S.runPlan) { S.runPlan.done = S.runPlan.done || {}; S.runPlan.done[r.plan.w + '-' + r.plan.i] = r.id; } }
function runPRToast(r) {
  if (r.type === 'walk') return;
  for (const [D, n] of [...EFFORTS].reverse()) {
    const t = effortOf(r, D); if (!t) continue;
    const prev = bestEffort(D, r);
    if (prev && t < prev.sec - 0.5) { toast(`${icon('trophy', 18)} Nuovo record ${n} · ${fmtClock(t * 1000)}`, 'pr'); return; }
  }
  const others = runs().filter(x => x !== r && x.type !== 'walk');
  if (others.length && r.km > Math.max(...others.map(x => x.km))) toast(`${icon('trophy', 18)} Corsa più lunga di sempre · ${fmtN(r.km, 2)} km`, 'pr');
}

/* interval beeps on the lock screen (optional: an audio track pauses the music) */
function toneWav(sec, beeps, sr = 2000) {
  const n = Math.max(1, Math.round(sec * sr)), buf = new ArrayBuffer(44 + n), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
  const d = new Uint8Array(buf, 44); d.fill(128);
  for (const [t0, f, len] of beeps) { const s0 = Math.round(t0 * sr), L = Math.round(len * sr); for (let i = 0; i < L && s0 + i < n; i++) { if (s0 + i < 0) continue; const env = Math.min(1, i / 30, (L - i) / 60); d[s0 + i] = 128 + Math.round(95 * env * Math.sin(2 * Math.PI * f * i / sr)); } }
  return new Blob([buf], { type: 'audio/wav' });
}
function runAudioStop() { try { if (RUN.audio) { RUN.audio.pause(); RUN.audio.src = ''; } if (RUN.url) URL.revokeObjectURL(RUN.url); } catch (e) { } RUN.audio = null; RUN.url = null; audioIdle(); }
function runAudioStart() {
  runAudioStop();
  const a = S.runActive; if (!a || !a.sess?.steps || !S.profile.runLockBeep || a.pauseAt) return;
  const t = Math.max(0, runElapsed(a)), st = a.sess.steps, beeps = []; let acc = a.stepT0 - t;
  for (let i = a.si; i < st.length; i++) { acc += st[i].s; const nk = st[i + 1]?.k, hi = !nk || STEP_HI.includes(nk); beeps.push([acc - 3, 440, 0.12], [acc - 2, 440, 0.12], [acc - 1, 440, 0.12], [acc, hi ? 880 : 330, hi ? 0.6 : 0.4]); }
  const total = acc + 1; if (total < 6 || total > 100 * 60) return;
  try {
    audioMode('playback'); RUN.url = URL.createObjectURL(toneWav(total, beeps)); RUN.audio = new Audio(RUN.url); RUN.audio.setAttribute('playsinline', '');
    const p = RUN.audio.play(); if (p && p.catch) p.catch(() => { });
    if ('mediaSession' in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: a.sess.n || 'Intervalli', artist: 'Forgia · corsa', artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }] }); try { navigator.mediaSession.setActionHandler('pause', () => A.runPause()); } catch (e) { } }
  } catch (e) { }
}

/* ---------- GPX import ---------- */
function runGpxInput() { let f = $('#gpxFile'); if (!f) { f = document.createElement('input'); f.type = 'file'; f.accept = '.gpx,application/gpx+xml,application/xml,text/xml'; f.id = 'gpxFile'; f.hidden = true; document.body.appendChild(f); } return f; }
function parseGPX(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  let nodes = [...doc.getElementsByTagName('trkpt')]; if (!nodes.length) nodes = [...doc.getElementsByTagName('rtept')];
  const P = nodes.map(n => {
    const tm = n.getElementsByTagName('time')[0]?.textContent, ele = n.getElementsByTagName('ele')[0]?.textContent; let hr = null;
    for (const c of n.getElementsByTagName('*')) if (/(^|:)hr$/i.test(c.tagName) || /heartrate/i.test(c.tagName)) { hr = +c.textContent; break; }
    return { la: +n.getAttribute('lat'), lo: +n.getAttribute('lon'), t: tm ? Date.parse(tm) : null, e: ele != null && ele !== '' ? +ele : null, hr };
  }).filter(p => isFinite(p.la) && isFinite(p.lo));
  if (P.length < 2) return null;
  let m = 0, mov = 0, gain = 0, ref = P[0].e; const splits = []; let splitAt = 0;
  for (let i = 1; i < P.length; i++) {
    const a = P[i - 1], b = P[i], d = hav([a.la, a.lo], [b.la, b.lo]), dt = a.t && b.t ? (b.t - a.t) / 1000 : 0;
    const add = dt > 0 && !(dt > 10 && d / dt < 0.4) ? dt : 0, mov0 = mov, m0 = m; mov += add; m += d;
    while (d > 0 && m >= (splits.length + 1) * 1000) { const tk = mov0 + add * (((splits.length + 1) * 1000 - m0) / d); splits.push(Math.round(tk - splitAt)); splitAt = tk; }
    if (b.e != null) { if (ref == null) ref = b.e; else if (b.e > ref + 3) { gain += b.e - ref; ref = b.e; } else if (b.e < ref - 3) ref = b.e; }
  }
  const hrs = P.map(p => p.hr).filter(x => x > 30 && x < 240);
  const sec = Math.round(mov || ((P[P.length - 1].t - P[0].t) / 1000) || 0), km = +(m / 1000).toFixed(2);
  const name = doc.getElementsByTagName('name')[0]?.textContent?.trim();
  const r = { id: uid(), start: P[0].t || Date.now(), sec, km, type: sec / km > 540 ? 'walk' : 'free', splits: sec ? splits : [], route: runRoute(P.map(p => [p.la, p.lo])), src: 'gpx' };
  if (hrs.length) r.hr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length);
  if (gain >= 5) r.elev = Math.round(gain);
  if (name && name.length < 60) r.title = name;
  return r;
}
document.addEventListener('change', ev => {
  const el = ev.target; if (el.id !== 'gpxFile' || !el.files || !el.files[0]) return;
  const f = el.files[0]; el.value = '';
  f.text().then(t => { const r = parseGPX(t); if (!r || !(r.km > 0)) { toast('File GPX senza un percorso valido'); return; } pushLayer({ type: 'runEdit', draft: r, isNew: true }); }).catch(() => toast('Non riesco a leggere il file'));
});

/* ---------- drawing ---------- */
function routeSVG(route, W = 320, H = 200, cls = '') {
  if (!route || route.length < 2) return '';
  const lat0 = route.reduce((a, p) => a + p[0], 0) / route.length, kx = Math.cos(lat0 * Math.PI / 180);
  const xs = route.map(p => p[1] * kx), ys = route.map(p => -p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = cls === 'mini' ? 5 : 16;
  const sc = Math.min((W - 2 * pad) / Math.max(x1 - x0, 1e-6), (H - 2 * pad) / Math.max(y1 - y0, 1e-6));
  const ox = (W - (x1 - x0) * sc) / 2, oy = (H - (y1 - y0) * sc) / 2;
  const P = route.map((p, i) => [ox + (xs[i] - x0) * sc, oy + (ys[i] - y0) * sc]);
  const d = P.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('');
  const s = P[0], e = P[P.length - 1], mini = cls === 'mini';
  return `<svg class="route ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Percorso">${mini ? '' : `<defs><pattern id="rgrid" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M22 0H0V22" fill="none" stroke="#212934" stroke-width="1"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#rgrid)"/>`}
    <path d="${d}" fill="none" stroke="rgba(255,107,44,.22)" stroke-width="${mini ? 5 : 10}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="#ff8a3d" stroke-width="${mini ? 2.2 : 3.5}" stroke-linecap="round" stroke-linejoin="round"/>
    ${mini ? '' : `<circle cx="${s[0].toFixed(1)}" cy="${s[1].toFixed(1)}" r="6" fill="#3ddc97" stroke="#11151b" stroke-width="2"/><circle cx="${e[0].toFixed(1)}" cy="${e[1].toFixed(1)}" r="6" fill="#ff5c6c" stroke="#11151b" stroke-width="2"/>`}</svg>`;
}
function runThumb(r) { return r.route && r.route.length > 2 ? `<span class="run-thumb">${routeSVG(r.route, 48, 48, 'mini')}</span>` : `<span class="run-thumb" style="color:${(RUN_T[r.type] || RUN_T.free).c}">${icon('runner', 24)}</span>`; }
function splitsHTML(sp, totalKm, totalSec) {
  if (!sp || !sp.length) return '';
  const mn = Math.min(...sp), mx = Math.max(...sp), rest = totalKm - sp.length, restSec = totalSec - sp.reduce((a, b) => a + b, 0);
  const row = (lab, s, pace, best) => `<div class="split ${best ? 'best' : ''}"><span>${lab}</span><b class="tnum">${paceTxt(pace)}</b><span class="bar"><i style="width:${(35 + 65 * (mx - Math.min(mx, pace)) / ((mx - mn) || 1)).toFixed(0)}%"></i></span><span class="small muted tnum">${fmtClock(s * 1000)}</span></div>`;
  return `<div class="splits">${sp.map((s, i) => row('Km ' + (i + 1), s, s, sp.length > 1 && s === mn)).join('')}${rest > 0.05 && restSec > 0 ? row(fmtN(rest, 2) + ' km', restSec, restSec / rest, false) : ''}</div>`;
}

/* ---------- views ---------- */
function trainSegHTML() { return `<div class="seg"><button class="${UI.trainSeg !== 'run' ? 'on' : ''}" data-a="trainSeg" data-v="gym">${icon('dumbbell', 17)} Palestra</button><button class="${UI.trainSeg === 'run' ? 'on' : ''}" data-a="trainSeg" data-v="run">${icon('runner', 17)} Corsa</button></div>`; }
function runWeekKm(ws) { return runs().filter(r => r.start >= ws && r.start < ws + 7 * DAY).reduce((a, r) => a + r.km, 0); }
function viewRun() {
  const ws = startOfWeek(Date.now()), wr = runs().filter(r => r.start >= ws), km = wr.reduce((a, r) => a + r.km, 0), sec = wr.reduce((a, r) => a + r.sec, 0);
  const today = startOfDay(Date.now());
  const perDay = [...Array(7)].map((_, i) => runs().filter(r => startOfDay(r.start) === ws + i * DAY).reduce((a, r) => a + r.km, 0));
  const mx = Math.max(5, ...perDay);
  const wk = [];
  for (let i = 9; i >= 0; i--) { const s = ws - i * 7 * DAY; wk.push({ l: fmtDate(s), v: runWeekKm(s) }); }
  const all = runsSorted(), list = UI.moreRuns ? all : all.slice(0, 8);
  const a = S.runActive;
  return `
  <div class="page-head"><h1>Allenamento</h1></div>
  ${trainSegHTML()}
  ${a ? `<button class="card hero" data-a="runOpen" style="text-align:left"><div class="row"><div class="grow"><div class="eyebrow" style="color:var(--gold)">Corsa in corso</div><b style="font-size:17px">${kmTxt(a.m)} km · ${fmtClock(Math.max(0, runMoving(a)) * 1000)}</b></div>${icon('chev')}</div></button>` : ''}
  <div class="card hero">
    <div class="row" style="align-items:flex-end"><div class="grow"><div class="eyebrow" style="color:var(--gold)">Questa settimana</div><div class="run-big sm" style="justify-content:flex-start"><b>${fmtN(km, 1)}</b><span>km</span></div><div class="small muted">${wr.length} ${wr.length === 1 ? 'uscita' : 'uscite'}${sec ? ' · ' + fmtDur(sec * 1000) : ''}</div></div>
      <div class="wkbars">${perDay.map((v, i) => `<div class="${ws + i * DAY === today ? 'today' : ''}"><i style="height:${v ? Math.max(8, v / mx * 100) : 0}%"></i><span>${[...(WLETTER_L[lang()] || WLETTER_L.it)][i]}</span></div>`).join('')}</div></div>
    ${a ? '' : `<div class="row"><button class="btn primary grow" data-a="runStartSheet">${icon('play', 18)} Inizia corsa</button><button class="btn" data-a="runIntSheet">Intervalli</button></div>`}
    <div class="row" style="gap:16px"><button class="link" data-a="runManual">${icon('calendar', 14)} Corsa passata</button><button class="link" data-a="runGpx">${icon('download', 14)} Importa GPX</button></div>
  </div>
  ${runPlanCard()}
  ${runPaceCard()}
  ${runRecordsCard()}
  ${runs().length ? `<div class="card"><div class="section-title">Km a settimana</div>${barChart(wk, 'km')}</div>` : ''}
  <div class="stack"><div class="section-title">Le tue corse</div>
    ${list.length ? `<div class="list">${list.map(r => `<button class="li" data-a="runView" data-id="${r.id}">${runThumb(r)}<div class="grow"><div class="t">${fmtN(r.km, 2)} km · ${esc(runTitle(r))} ${r.demo ? '<span class="demo-tag">esempio</span>' : ''}</div><div class="s">${relDay(r.start)} · ${fmtClock(r.sec * 1000)} · ${paceTxt(runPace(r))}/km</div></div>${icon('chev', 18)}</button>`).join('')}</div>${all.length > list.length ? `<button class="btn ghost" data-a="more" data-k="moreRuns">Mostra tutte (${all.length})</button>` : ''}`
    : `<div class="empty card">${icon('runner', 34)}<b>Nessuna corsa</b><span class="small">Inizia una corsa col GPS, registrala a mano o importa un file GPX da Strava, Garmin o dall'app che usi.</span></div>`}
  </div>
  ${runHrCard()}
  <div class="card"><div class="section-title">Impostazioni corsa</div>
    <div class="row"><div class="grow"><div class="lbl">Voce guida</div><div class="small faint">Annuncia ogni km, i cambi degli intervalli e il passo</div></div><button class="switch ${S.profile.runVoice !== false ? 'on' : ''}" data-a="runVoice" aria-label="Voce guida"></button></div>
    <div class="row"><div class="grow"><div class="lbl">Mappa (OpenStreetMap)</div><div class="small faint">Strade sotto il percorso, durante e dopo la corsa. Serve internet: senza rete vedi solo il percorso</div></div><button class="switch ${S.profile.mapOff !== true ? 'on' : ''}" data-a="mapToggle" aria-label="Mappa"></button></div>
    <div class="row"><div class="grow"><div class="lbl">Bip degli intervalli a schermo bloccato</div><div class="small faint">Usa una traccia audio come il timer di recupero: funziona col telefono bloccato ma mette in pausa la musica</div></div><button class="switch ${S.profile.runLockBeep ? 'on' : ''}" data-a="runLockBeep" aria-label="Bip a schermo bloccato"></button></div>
  </div>`;
}
function runPlanCard() {
  const ps = planState();
  if (!ps) return `<div class="stack"><div class="section-title">Piani di allenamento</div>${RUN_PLANS.map(p => `<div class="prog-card"><div class="row"><h4 class="grow">${p.n}</h4></div><p>${p.d}</p><div class="small faint">${p.need}</div><button class="btn sm" data-a="runPlanStart" data-k="${p.k}">${icon('play', 14)} Inizia questo piano</button></div>`).join('')}</div>`;
  const pct = Math.round(ps.nDone / ps.total * 100), n = ps.next;
  return `<div class="card"><div class="section-title">Piano: ${esc(ps.meta.n)} <button class="link" data-a="runPlanOpen">Vedi tutto</button></div>
    <div class="row"><span class="small muted grow">${ps.over ? 'Piano concluso' : `Settimana ${ps.w + 1} di ${ps.weeks.length}`}</span><span class="small muted tnum">${ps.nDone}/${ps.total} uscite</span></div>
    <div class="xpbar" style="height:6px"><i style="width:${pct}%"></i></div>
    ${n ? `<div class="plan-next"><div class="grow"><div class="small" style="color:var(--gold)">${n.w > ps.w ? 'Prossima settimana' : 'Prossima uscita'}</div><b>${esc(n.s.n)}</b><div class="small muted">${sessHint(n.s)}</div></div><button class="btn primary sm" data-a="runPlanGo" data-w="${n.w}" data-i="${n.i}">${icon('play', 14)} Avvia</button></div>` : `<div class="small" style="color:var(--good)">${icon('check', 14)} Hai completato tutte le uscite. Scegli un nuovo piano quando vuoi.</div>`}
  </div>`;
}
function runPaceCard() {
  const vd = runVdot();
  if (!vd) return `<div class="card"><div class="section-title">I tuoi ritmi</div><div class="small muted">Fai una corsa di almeno 3 km a buon ritmo, oppure inserisci il tempo di una gara recente: calcolo i tempi previsti e i passi giusti per ogni allenamento.</div><button class="btn sm" data-a="runRefSet">Inserisci un tempo</button></div>`;
  const v = vd.v, src = vd.ref ? `tempo inserito: ${fmtN(vd.ref.km, 2)} km in ${fmtClock(vd.ref.sec * 1000)}` : `corsa del ${fmtDate(vd.r.start)}: ${fmtN(vd.r.km, 2)} km in ${fmtClock(vd.r.sec * 1000)}`;
  return `<div class="card"><div class="section-title">I tuoi ritmi <button class="link" data-a="runRefSet">Inserisci un tempo</button></div>
    <div class="row"><div class="grow"><div class="small muted">Indice di forma (VDOT)</div><div class="small faint">Da ${src}</div></div><b class="vdot">${fmtN(v, 1)}</b></div>
    <div class="pred">${[[5, '5 km'], [10, '10 km'], [21.0975, 'Mezza'], [42.195, 'Maratona']].map(([d, n]) => `<div><span>${n}</span><b class="tnum">${fmtClock(predictSec(v, d) * 1000)}</b></div>`).join('')}</div>
    <div class="paces">${Object.keys(PACE_F).map(k => `<div class="row"><span class="pz pz-${k}">${PACE_N[k][0]}</span><span class="small muted grow">${PACE_N[k][1]}</span><b class="tnum">${paceLabel(k).replace('/km', '')}</b></div>`).join('')}</div>
    <div class="small faint">Tempi previsti con le tabelle di Jack Daniels. Valgono se sei allenato per quella distanza. Se hai fatto solo corse facili il valore è sottostimato: inserisci un tempo di gara o di una prova.</div></div>`;
}
function runRecordsCard() {
  if (!runs().some(r => r.type !== 'walk')) return '';
  const recs = EFFORTS.map(([D, n]) => ({ n, b: bestEffort(D) })).filter(x => x.b);
  const longest = runs().filter(r => r.type !== 'walk').sort((a, b) => b.km - a.km)[0];
  return `<div class="card"><div class="section-title">Record</div><div class="recs">
    ${longest ? `<button data-a="runView" data-id="${longest.id}"><span>Corsa più lunga</span><b>${fmtN(longest.km, 2)} km</b><small>${fmtDate(longest.start)}</small></button>` : ''}
    ${recs.map(x => `<button data-a="runView" data-id="${x.b.r.id}"><span>${x.n}</span><b class="tnum">${fmtClock(x.b.sec * 1000)}</b><small>${paceTxt(x.b.sec / EFFORTS.find(e => e[1] === x.n)[0])}/km · ${fmtDate(x.b.r.start)}</small></button>`).join('')}
  </div><div class="small faint">I record su 1, 5 e 10 km usano i parziali al km delle corse col GPS.</div></div>`;
}
function runHrCard() {
  const mx = hrMax();
  const Z = [[0.5, 0.6, 'Z1', 'Recupero'], [0.6, 0.7, 'Z2', 'Base aerobica: corse facili e lunghi'], [0.7, 0.8, 'Z3', 'Aerobico medio'], [0.8, 0.9, 'Z4', 'Soglia: corse a ritmo'], [0.9, 1, 'Z5', 'Massimale: intervalli brevi']];
  return `<div class="card"><button class="section-title" data-a="runHrToggle" style="width:100%;text-align:left">Zone cardio ${icon(UI.hrOpen ? 'up' : 'down', 18)}</button>
    ${UI.hrOpen ? `<div class="row"><div class="grow"><div class="lbl">Frequenza massima</div><div class="small faint">${S.profile.hrMax ? 'Inserita da te' : mx ? 'Stimata dall\'età (208 − 0,7 × età). Se la conosci, scrivila' : 'Scrivila o inserisci l\'età negli obiettivi dieta'}</div></div><input class="input" style="width:90px" inputmode="numeric" data-in="hrMax" data-max="230" value="${S.profile.hrMax || ''}" placeholder="${mx || 'bpm'}" aria-label="Frequenza massima"></div>
    ${mx ? `<div class="zones">${Z.map(([a, b, z, d], i) => `<div class="row"><span class="pz z${i + 1}">${z}</span><span class="small muted grow">${d}</span><b class="tnum">${Math.round(mx * a)}–${Math.round(mx * b)}</b></div>`).join('')}</div><div class="small faint">L'80% dei km in Z1–Z2 e il resto in Z4–Z5 è la distribuzione che funziona meglio per la maggior parte dei runner.</div>` : ''}` : ''}
  </div>`;
}
function stepTimeline(a) {
  const st = a.sess.steps, tot = st.reduce((x, s) => x + s.s, 0);
  return `<div class="step-tl">${st.map((s, i) => `<i class="k-${s.k} ${i < a.si ? 'past' : i === a.si ? 'cur' : ''}" style="flex:${s.s / tot}"></i>`).join('')}</div>`;
}
function stepCard(a, t) {
  const st = a.sess.steps, cur = st[a.si];
  if (!cur) return `<div class="step-card k-done">${icon('check', 20)} <b>Allenamento completato</b><div class="small">Continua piano per defaticare o premi Fine.</div></div>${stepTimeline(a)}`;
  const same = st.filter(s => s.k === cur.k).length, idx = st.slice(0, a.si + 1).filter(s => s.k === cur.k).length;
  const left = Math.max(0, a.stepT0 + cur.s - Math.max(0, t)), nx = st[a.si + 1];
  return `<div class="step-card k-${cur.k}"><div class="row"><b class="grow">${STEP_N[cur.k]}${same > 1 ? ` ${idx}/${same}` : ''}</b><span class="small">${cur.p ? paceLabel(cur.p) : ''}</span></div>
    <div class="step-left tnum" id="rn-step">${fmtClock(left * 1000 + 999)}</div><div class="step-bar"><i id="rn-stepbar" style="width:${(100 * (1 - left / cur.s)).toFixed(1)}%"></i></div>
    <div class="small">${nx ? 'Poi: ' + STEP_N[nx.k].toLowerCase() + ' ' + durShort(nx.s) : 'Ultimo tratto'}</div></div>${stepTimeline(a)}`;
}
function layerRun(l, i) {
  const a = S.runActive;
  if (!a) return `<div class="layer">${head('Corsa', 'down')}<div class="layer-body"><div class="layer-inner"><div class="empty card">${icon('runner', 34)}<b>Nessuna corsa in corso</b></div></div></div></div>`;
  const v = runVals(a), T = RUN_T[a.type] || RUN_T.free;
  return `<div class="layer run-layer" role="dialog" aria-label="Corsa in corso">
    <div class="layer-head"><button class="icon-btn" data-a="minimize" aria-label="Riduci">${icon('down')}</button><h2>${esc(a.sess?.n || T.n)}</h2><button class="icon-btn" data-a="runVoice" aria-label="Voce guida">${icon(S.profile.runVoice === false ? 'volx' : 'vol')}</button><button class="btn primary sm" data-a="runFinish">Fine</button></div>
    <div class="layer-body" data-scroll-key="run"><div class="layer-inner">
      <div class="row"><span class="gps ${v.gps[1]}" id="rn-gps">${v.gps[0]}</span><span class="grow"></span>${a.pauseAt ? '<span class="chip warm">In pausa</span>' : ''}</div>
      ${a.gps && mapOn() ? `<div class="run-modes"><button class="${UI.runMode !== 'data' ? 'on' : ''}" data-a="runViewMode" data-v="map">Mappa</button><button class="${UI.runMode === 'data' ? 'on' : ''}" data-a="runViewMode" data-v="data">Solo dati</button></div>
      ${UI.runMode !== 'data' ? `<div class="route-card live big" data-map="live">${a.pts.length > 2 ? routeSVG(a.pts, 320, 260) : ''}<button class="btn sm" id="rn-center" data-a="mapFollow" ${MAP.follow ? 'hidden' : ''}>${icon('target', 14)} Centra</button></div>` : ''}` : ''}
      ${v.te < 0 ? `<div class="run-cd" id="rn-cd">${Math.ceil(-v.te)}</div>` : ''}
      ${a.sess?.steps ? stepCard(a, v.te) : a.sess?.km ? `<div class="step-card k-steady"><div class="row"><b class="grow">Obiettivo ${fmtN(a.sess.km, 1)} km</b><span class="small">${a.sess.p ? paceLabel(a.sess.p) : ''}</span></div><div class="step-bar"><i style="width:${Math.min(100, a.m / 10 / a.sess.km).toFixed(1)}%"></i></div></div>` : ''}
      <div class="run-big"><b id="rn-km" class="tnum">${v.km}</b><span>km</span></div>
      <div class="run-grid"><div><b id="rn-time" class="tnum">${v.time}</b><span>Tempo</span></div><div><b id="rn-avg" class="tnum">${v.avg}</b><span>Passo medio</span></div><div><b id="rn-cur" class="tnum">${v.cur}</b><span>Passo attuale</span></div></div>
      <div class="run-sub"><span id="rn-tot">${v.tot}</span><span id="rn-elev">${v.elev}</span></div>
      ${a.gps && mapOn() ? '' : a.pts.length > 2 ? `<div class="route-card">${routeSVG(a.pts, 320, 180)}</div>` : ''}
      ${a.splits.length ? `<div class="card tight"><div class="section-title">Parziali</div>${splitsHTML(a.splits, 0, 0)}</div>` : ''}
      <div class="small faint">${a.gps ? 'Lo schermo resta acceso da solo: usa "Blocca" per evitare tocchi in tasca. Su iPhone, se blocchi il telefono il GPS si ferma e il tratto viene stimato in linea retta.' : 'Senza GPS: a fine corsa inserisci la distanza letta sul tapis roulant.'}</div>
    </div></div>
    <div class="layer-foot"><button class="btn" data-a="runLock">${icon('lock', 18)} Blocca</button><button class="btn grow ${a.pauseAt ? 'primary' : ''}" data-a="runPause">${icon(a.pauseAt ? 'play' : 'pause', 18)} ${a.pauseAt ? 'Riprendi' : 'Pausa'}</button></div>
    ${UI.runLock ? `<div class="runlock"><div class="rl-k">km</div><div class="rl-big tnum" id="rl-km">${v.km}</div><div class="rl-row"><div><b id="rl-time" class="tnum">${v.time}</b><span>tempo</span></div><div><b id="rl-pace" class="tnum">${v.cur !== '–:––' ? v.cur : v.avg}</b><span>passo</span></div></div><button class="rl-unlock" data-hold="runUnlock"><i></i>${icon('lock', 18)} Tieni premuto per sbloccare</button></div>` : ''}
  </div>`;
}
function runEditSummary(r) {
  return `${r.route && r.route.length > 2 ? `<div class="route-card" data-map="${runs().some(x => x.id === r.id) ? 'run:' + r.id : 'draft'}">${routeSVG(r.route, 320, 190)}</div>` : ''}
    ${r.km > 0 ? `<div class="tiles"><div class="tile"><div class="v">${fmtN(r.km, 2)}<small>km</small></div><div class="k">Distanza</div></div><div class="tile"><div class="v">${fmtClock(r.sec * 1000)}</div><div class="k">Tempo</div></div><div class="tile"><div class="v">${paceTxt(runPace(r))}</div><div class="k">Passo /km</div></div></div>` : ''}`;
}
function layerRunEdit(l, i) {
  const r = l.draft, s0 = r.sec || 0, h = Math.floor(s0 / 3600), m = Math.floor(s0 % 3600 / 60), s = Math.round(s0 % 60);
  const ps = planState(), pn = ps && !r.plan && l.isNew && !l.fromTrack ? (ps.next && ps.next.w === ps.w ? ps.next : null) : null;
  if (pn && l.planOn === undefined) l.planOn = true;
  return `<div class="layer">${head(l.fromTrack ? 'Com\'è andata?' : l.isNew ? 'Registra corsa' : 'Modifica corsa', 'x', `<button class="btn primary sm" data-a="runSave">Salva</button>`)}
    <div class="layer-body" data-scroll-key="re${i}"><div class="layer-inner">
      ${l.fromTrack || r.src === 'gpx' ? runEditSummary(r) : ''}
      <div class="chips" style="margin:0;padding:0">${Object.entries(RUN_T).map(([k, v]) => `<button class="chip ${r.type === k ? 'on' : ''}" data-a="reType" data-v="${k}">${v.n}</button>`).join('')}</div>
      <div class="row"><div class="field grow"><label for="re-d">Giorno</label><input id="re-d" type="date" class="input" data-in="reDate" value="${dkey(r.start)}"></div><div class="field" style="width:118px"><label for="re-t">Ora</label><input id="re-t" type="time" class="input" data-in="reTime" value="${hhmm(r.start)}"></div></div>
      <div class="row"><div class="field grow"><label for="re-km">Distanza (km)</label><input id="re-km" class="input" inputmode="decimal" data-in="reKm" data-max="500" value="${r.km ? fmtKg(r.km) : ''}" placeholder="Es. 5,2"></div>
        <div class="field grow"><label>Durata</label><div class="dur3"><input class="input" inputmode="numeric" data-in="reDur" data-f="h" data-max="48" value="${h || ''}" placeholder="0" aria-label="Ore"><span>h</span><input class="input" inputmode="numeric" data-in="reDur" data-f="m" data-max="59" value="${s0 ? m : ''}" placeholder="min" aria-label="Minuti"><span>:</span><input class="input" inputmode="numeric" data-in="reDur" data-f="s" data-max="59" value="${s0 ? String(s).padStart(2, '0') : ''}" placeholder="s" aria-label="Secondi"></div></div></div>
      <div class="small muted" id="re-pace">${r.km > 0 && r.sec > 0 ? `Passo medio <b>${paceTxt(r.sec / r.km)}/km</b> · ~${runKcal(r)} kcal attive` : 'Inserisci distanza e durata'}</div>
      <div class="row"><div class="field grow"><label for="re-hr">FC media</label><input id="re-hr" class="input" inputmode="numeric" data-in="reNum" data-f="hr" data-max="230" value="${r.hr || ''}" placeholder="bpm"></div><div class="field grow"><label for="re-el">Dislivello +</label><input id="re-el" class="input" inputmode="numeric" data-in="reNum" data-f="elev" data-max="9000" value="${r.elev || ''}" placeholder="metri"></div></div>
      <div class="field"><label>Fatica percepita</label><div class="rpe">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="${r.rpe === n ? 'on' : ''}" data-a="reRpe" data-v="${n}">${n}</button>`).join('')}</div><div class="small faint">1–3 facile · 4–6 impegnativo · 7–8 duro · 9–10 al massimo</div></div>
      ${pn ? `<div class="row"><div class="grow"><div class="lbl">Conta per il piano</div><div class="small faint">${esc(pn.s.n)}</div></div><button class="switch ${l.planOn ? 'on' : ''}" data-a="rePlan" aria-label="Conta per il piano"></button></div>` : ''}
      <div class="field"><label for="re-note">Note</label><textarea id="re-note" class="input" data-in="reNote" rows="2" maxlength="300" placeholder="Percorso, sensazioni, scarpe…">${esc(r.note || '')}</textarea></div>
    </div></div></div>`;
}
function layerRunView(l, i) {
  const r = runs().find(x => x.id === l.id);
  if (!r) return `<div class="layer">${head('Corsa')}<div class="layer-body"><div class="layer-inner"><div class="empty card">Corsa eliminata</div></div></div></div>`;
  const T = RUN_T[r.type] || RUN_T.free, vd = vdotOf(r.km, r.sec);
  const eff = r.type === 'walk' ? [] : EFFORTS.filter(([D]) => r.km >= D - 0.02).map(([D, n]) => { const t = effortOf(r, D), b = bestEffort(D); return { n, t, pr: b && b.r === r }; });
  return `<div class="layer">${head(esc(runTitle(r)), 'back', `<button class="icon-btn" data-a="runMenu" data-id="${r.id}" aria-label="Opzioni">${icon('more')}</button>`)}
    <div class="layer-body" data-scroll-key="rv${i}"><div class="layer-inner">
      <div class="row"><span class="chip" style="color:${T.c};border-color:${T.c}55">${T.n}</span><span class="small muted grow">${fmtDateLong(r.start)} · ${hhmm(r.start)}</span>${r.demo ? '<span class="demo-tag">esempio</span>' : ''}</div>
      ${r.route && r.route.length > 2 ? `<div class="route-card" data-map="run:${r.id}">${routeSVG(r.route, 320, 200)}</div>` : ''}
      <div class="run-big"><b>${fmtN(r.km, 2)}</b><span>km</span></div>
      <div class="tiles"><div class="tile"><div class="v">${fmtClock(r.sec * 1000)}</div><div class="k">Tempo</div></div><div class="tile"><div class="v">${paceTxt(runPace(r))}</div><div class="k">Passo /km</div></div><div class="tile"><div class="v">${runKcal(r)}</div><div class="k">kcal attive</div></div></div>
      ${r.lost > 0 ? `<div class="card tight warn-card"><div class="small"><b>Segnale GPS perso per ${durShort(r.lost)}</b>${r.holes > 1 ? ` in ${r.holes} tratti` : ''}. Di quel tratto non si sa quanta strada hai fatto, quindi distanza e tempo non lo contano: il cronometro totale segnava ${fmtClock(r.secTot * 1000)}.</div></div>` : r.secTot > r.sec ? `<div class="small faint">Cronometro totale ${fmtClock(r.secTot * 1000)} · in movimento ${fmtClock(r.sec * 1000)}</div>` : ''}
      ${kcalLine(kcalRun(r), 'corsa')}
      ${r.hr || r.elev || r.rpe ? `<div class="tiles">${r.hr ? `<div class="tile"><div class="v">${r.hr}</div><div class="k">FC media</div></div>` : ''}${r.elev ? `<div class="tile"><div class="v">${r.elev}<small>m</small></div><div class="k">Dislivello</div></div>` : ''}${r.rpe ? `<div class="tile"><div class="v">${r.rpe}<small>/10</small></div><div class="k">Fatica</div></div>` : ''}</div>` : ''}
      ${r.splits && r.splits.length ? `<div class="card"><div class="section-title">Parziali</div>${splitsHTML(r.splits, r.km, r.sec)}</div>` : ''}
      ${eff.length ? `<div class="card"><div class="section-title">Migliori tempi in questa corsa</div>${eff.map(e => `<div class="row"><span class="grow">${e.n}</span><b class="tnum">${fmtClock(e.t * 1000)}</b>${e.pr ? `<span class="pr-flag">${icon('trophy', 16)}</span>` : ''}</div>`).join('')}</div>` : ''}
      ${vd && r.type !== 'walk' ? `<div class="small muted">Indice di forma (VDOT) di questa corsa: <b>${fmtN(vd, 1)}</b>${r.type === 'easy' || r.type === 'long' ? ' (corsa lenta: è normale che sia più basso)' : ''}</div>` : ''}
      ${r.note ? `<div class="card tight">${esc(r.note)}</div>` : ''}
    </div></div></div>`;
}
function layerRunPlan(l, i) {
  const ps = planState(); if (!ps) return `<div class="layer">${head('Piano')}<div class="layer-body"><div class="layer-inner"><div class="empty card">Nessun piano attivo</div></div></div></div>`;
  return `<div class="layer">${head(esc(ps.meta.n))}<div class="layer-body" data-scroll-key="rp${i}"><div class="layer-inner">
    <div class="small muted">${esc(ps.meta.d)} I passi si aggiornano da soli con il tuo indice di forma. Tocca il cerchio per segnare un'uscita fatta senza registrarla.</div>
    ${ps.weeks.map((wk, w) => `<div class="card plan-wk ${w === ps.w ? 'cur' : ''} ${w < ps.w ? 'past' : ''}"><div class="section-title">Settimana ${w + 1}${w === ps.w ? ' <span class="chip warm">ora</span>' : ''}</div>
      ${wk.map((s, k) => { const d = ps.done[w + '-' + k]; return `<div class="plan-s ${d ? 'done' : ''}"><button class="pchk" data-a="runPlanTick" data-w="${w}" data-i="${k}" aria-label="Segna come fatta">${d ? icon('check', 16, 3) : ''}</button><div class="grow"><b>${esc(s.n)}</b><div class="small muted">${sessHint(s)}</div></div>${d ? '' : `<button class="btn sm" data-a="runPlanGo" data-w="${w}" data-i="${k}">${icon('play', 12)}</button>`}</div>`; }).join('')}</div>`).join('')}
    <button class="btn ghost block" data-a="runPlanEnd" style="color:var(--bad)">Termina il piano</button>
  </div></div></div>`;
}
Object.assign(LAYER_RENDER, { run: layerRun, runEdit: layerRunEdit, runView: layerRunView, runPlan: layerRunPlan });

/* ---------- demo ---------- */
function demoRoute(km) {
  const c = [45.4642, 9.19], R = km * 1000 / (2 * Math.PI) / 111320, pts = [];
  for (let i = 0; i <= 140; i++) { const t = i / 140 * 2 * Math.PI, r = R * (1 + 0.18 * Math.sin(3 * t) + 0.07 * Math.cos(5 * t)); pts.push([+(c[0] + r * Math.sin(t)).toFixed(5), +(c[1] + r * Math.cos(t) / Math.cos(c[0] * Math.PI / 180)).toFixed(5)]); }
  return pts;
}
function makeRunDemo() {
  const out = [], now = Date.now();
  for (let w = 5; w >= 0; w--) for (const [dd, type, km0, p0] of [[1, 'easy', 5, 350], [5, 'long', 8, 362], ...(w % 2 ? [[3, 'tempo', 6, 302]] : [])]) {
    const start = startOfWeek(now) - w * 7 * DAY + dd * DAY + 18.5 * 3600e3; if (start > now) continue;
    const km = Math.round((km0 + (5 - w) * (type === 'long' ? 0.6 : 0.3)) * 100) / 100, p = p0 - (5 - w) * 2, sp = [];
    for (let k = 1; k <= Math.floor(km); k++) sp.push(Math.round(p + Math.random() * 14 - 7 - (type === 'long' && k > km - 2 ? 6 : 0)));
    const sec = Math.round(sp.reduce((a, b) => a + b, 0) + (km - Math.floor(km)) * p);
    out.push({ id: uid(), start, sec, km, type, splits: sp, hr: type === 'tempo' ? 166 : type === 'long' ? 148 : 143, rpe: type === 'tempo' ? 7 : 4, src: 'gps', demo: true });
  }
  out.sort((a, b) => a.start - b.start);
  if (out.length) out[out.length - 1].route = demoRoute(out[out.length - 1].km);
  runs().push(...out);
}
function removeRunDemo() { S.runs = runs().filter(r => !r.demo); }

/* ---------- actions ---------- */
function runIntDefaults() { return Object.assign({ n: 6, on: 120, off: 90, w: 600, c: 600, gps: true }, S.profile.intv || {}); }
const DUR_OPTS = [15, 20, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480, 600, 720, 900, 1200];
Object.assign(A, {
  homeRun() { if (S.runActive) return openRun(); A.runStartSheet(); },
  homePick() { pushLayer({ type: 'sheet', title: 'Quale allenamento?', items: S.routines.map(r => ({ label: r.name, desc: `${r.ex.length} esercizi · ~${estMinutes(r)} min`, ic: 'dumbbell', on: (UI.homeRid || nextRoutine()?.id) === r.id, fn: () => { UI.homeRid = r.id; } })) }); },
  trainSeg(el) { if (UI.trainSeg === el.dataset.v || (!UI.trainSeg && el.dataset.v === 'gym')) return; UI.trainSeg = el.dataset.v; render(); flash('#main', 'tab-in'); },
  runOpen() { openRun(); },
  runStartSheet() {
    pushLayer({
      type: 'sheet', title: 'Che corsa fai?', items: [
        { label: 'Corsa libera', desc: 'GPS: distanza, passo e parziali al km', ic: 'runner', fn: () => startRun({ type: 'free' }) },
        ...['easy', 'long', 'tempo'].map(k => ({ label: RUN_T[k].n, desc: RUN_T[k].d + (paceFor(k === 'tempo' ? 'T' : 'E') ? ' · ' + paceLabel(k === 'tempo' ? 'T' : 'E') : ''), ic: 'runner', fn: () => startRun({ type: k }) })),
        { label: 'Intervalli…', desc: 'Scegli ripetizioni, tratti veloci e recuperi', ic: 'timer', fn: () => setTimeout(() => A.runIntSheet(), 0) },
        { label: 'Camminata', desc: 'Camminata veloce o escursione', ic: 'runner', fn: () => startRun({ type: 'walk' }) },
        { label: 'Tapis roulant', desc: 'Senza GPS: tempo e voce, la distanza la scrivi alla fine', ic: 'timer', fn: () => startRun({ type: 'free', gps: false }) },
      ]
    });
  },
  runIntSheet() {
    const d = runIntDefaults(), opt = (sel, list, zero) => list.map(s => `<option value="${s}" ${+sel === s ? 'selected' : ''}>${s ? durShort(s) : zero}</option>`).join('');
    pushLayer({
      type: 'sheet', title: 'Intervalli', items: [], html: `<div class="intv">
      <label>Ripetizioni<select id="iv-n" class="input">${[...Array(19)].map((_, k) => `<option ${d.n === k + 2 ? 'selected' : ''}>${k + 2}</option>`).join('')}</select></label>
      <label>Veloce<select id="iv-on" class="input">${opt(d.on, DUR_OPTS)}</select></label>
      <label>Recupero<select id="iv-off" class="input">${opt(d.off, DUR_OPTS.filter(s => s <= 600))}</select></label>
      <label>Riscaldamento<select id="iv-w" class="input">${opt(d.w, [0, 300, 600, 900, 1200], 'No')}</select></label>
      <label>Defaticamento<select id="iv-c" class="input">${opt(d.c, [0, 300, 600, 900], 'No')}</select></label>
      <label>Passo veloce<select id="iv-p" class="input">${['I', 'T', 'R'].map(k => `<option value="${k}" ${(d.p || 'I') === k ? 'selected' : ''}>${PACE_N[k][0]}${paceFor(k) ? ' ' + paceTxt(paceFor(k)) : ''}</option>`).join('')}</select></label>
    </div>
    <label class="row" style="margin-top:10px"><input type="checkbox" id="iv-gps" ${d.gps ? 'checked' : ''} style="width:20px;height:20px;accent-color:#ff6b2c"><span class="grow">Usa il GPS</span><span class="small faint">togli per il tapis roulant</span></label>
    <button class="btn primary block" data-a="runIntGo" style="margin-top:12px">${icon('play', 16)} Avvia</button>`
    });
  },
  runIntGo() {
    const g = id => +($('#' + id)?.value || 0), d = { n: g('iv-n') || 6, on: g('iv-on') || 60, off: g('iv-off'), w: g('iv-w'), c: g('iv-c'), p: $('#iv-p')?.value || 'I', gps: !!$('#iv-gps')?.checked };
    S.profile.intv = d; popLayer();
    startRun({ type: 'int', gps: d.gps, sess: { t: 'int', n: `${d.n} × ${durShort(d.on)}${d.off ? ' · rec ' + durShort(d.off) : ''}`, steps: intSteps(d.n, d.on, d.off, { warm: d.w, cool: d.c, p: d.p }) } });
  },
  runPause() {
    const a = S.runActive; if (!a) return;
    if (a.pauseAt) { a.pausedMs += Date.now() - a.pauseAt; a.pauseAt = 0; a.gap = true; say('Si riparte'); runAudioStart(); }
    else { a.pauseAt = Date.now(); runAudioStop(); say('In pausa'); }
    save(); renderLayers();
  },
  runFinish() {
    const a = S.runActive; if (!a) return;
    pushLayer({ type: 'sheet', title: 'Finire la corsa?', items: [
      { label: 'Salva la corsa', desc: `${kmTxt(a.m)} km · ${fmtClock(Math.max(0, runMoving(a)) * 1000)}`, ic: 'check', fn: () => setTimeout(runFinish, 0) },
      { label: 'Continua a correre', ic: 'play', fn: () => { } },
      { label: 'Scarta la corsa', ic: 'trash', danger: true, fn: () => setTimeout(() => pushLayer({ type: 'confirm', title: 'Scartare la corsa?', text: 'Distanza e percorso andranno persi.', ok: 'Scarta', danger: true, fn: () => { runDetach(); S.runActive = null; UI.runLock = false; if (!S.active) releaseWake(); closeLayersOfType('run'); save(); } }), 0) },
    ] });
  },
  runLock() { UI.runLock = true; renderLayers(); },
  runVoice() { S.profile.runVoice = S.profile.runVoice === false; save(); if (S.profile.runVoice !== false) { speechPrime(); say('Voce attiva'); } if (topLayer()?.type === 'run') renderLayers(); else render(); },
  runLockBeep() { S.profile.runLockBeep = !S.profile.runLockBeep; save(); render(); if (S.runActive) runAudioStart(); },
  runHrToggle() { UI.hrOpen = !UI.hrOpen; render(); },
  runManual() { const now = Date.now(); pushLayer({ type: 'runEdit', isNew: true, draft: { id: uid(), start: now - 3600e3, sec: 0, km: 0, type: 'free', src: 'man' } }); },
  runGpx() { runGpxInput().click(); },
  runView(el) { pushLayer({ type: 'runView', id: el.dataset.id }); },
  runMenu(el) {
    const r = runs().find(x => x.id === el.dataset.id); if (!r) return;
    pushLayer({ type: 'sheet', title: runTitle(r), items: [
      { label: 'Modifica', ic: 'edit', fn: () => setTimeout(() => pushLayer({ type: 'runEdit', draft: JSON.parse(JSON.stringify(r)) }), 0) },
      { label: 'Elimina corsa', ic: 'trash', danger: true, fn: () => setTimeout(() => pushLayer({ type: 'confirm', title: 'Eliminare la corsa?', text: 'Record e statistiche verranno ricalcolati.', ok: 'Elimina', danger: true, fn: () => { S.runs = runs().filter(x => x !== r); if (S.runPlan?.done) for (const [k, v] of Object.entries(S.runPlan.done)) if (v === r.id) delete S.runPlan.done[k]; save(); closeLayersOfType('runView'); } }), 0) },
    ] });
  },
  reType(el) { const l = topLayer(); l.draft.type = el.dataset.v; renderLayers(); },
  reRpe(el) { const l = topLayer(), v = +el.dataset.v; l.draft.rpe = l.draft.rpe === v ? undefined : v; renderLayers(); },
  rePlan() { const l = topLayer(); l.planOn = !l.planOn; renderLayers(); },
  runSave() {
    const l = topLayer(), r = l.draft;
    if (!(r.km > 0)) { toast('Inserisci la distanza'); $('#re-km')?.focus(); return; }
    if (!(r.sec > 0)) { toast('Inserisci la durata'); return; }
    if (r.sec / r.km < 100) { toast('Passo sotto 1:40/km: controlla distanza e durata'); return; }
    if (r.start > Date.now() + 3600e3) { toast('La data è nel futuro'); return; }
    for (const k of ['hr', 'elev', 'rpe', 'note', 'title']) if (r[k] == null || r[k] === '') delete r[k];
    if (l.planOn && !r.plan) { const ps = planState(); if (ps && ps.next) r.plan = { w: ps.next.w, i: ps.next.i }; }
    const i = runs().findIndex(x => x.id === r.id), isNew = i < 0;
    if (isNew) runs().push(r); else runs()[i] = r;
    runPlanMark(r); save(); popLayer(); render();
    if (isNew) runPRToast(r);
    toast(isNew ? 'Corsa salvata' : 'Corsa aggiornata');
  },
  runRefSet() {
    const ref = S.profile.runRef || {};
    pushLayer({ type: 'sheet', title: 'Tempo di riferimento', items: [], html: `<div class="small muted" style="margin-bottom:10px">Una gara o una prova a tutta degli ultimi mesi. Serve a calcolare i passi giusti.</div>
      <div class="chips" style="margin:0 0 10px;padding:0">${[[5, '5 km'], [10, '10 km'], [21.0975, 'Mezza'], [42.195, 'Maratona']].map(([d, n]) => `<button class="chip ${ref.km === d ? 'on' : ''}" data-a="refKm" data-v="${d}">${n}</button>`).join('')}</div>
      <div class="row"><div class="field grow"><label for="rf-km">Km</label><input id="rf-km" class="input" inputmode="decimal" data-max="100" value="${ref.km ? fmtKg(ref.km) : ''}"></div>
      <div class="field grow"><label>Tempo</label><div class="dur3"><input id="rf-h" class="input" inputmode="numeric" data-max="9" placeholder="h" value="${ref.sec ? Math.floor(ref.sec / 3600) || '' : ''}"><span>h</span><input id="rf-m" class="input" inputmode="numeric" data-max="59" placeholder="min" value="${ref.sec ? Math.floor(ref.sec % 3600 / 60) : ''}"><span>:</span><input id="rf-s" class="input" inputmode="numeric" data-max="59" placeholder="s" value="${ref.sec ? ref.sec % 60 : ''}"></div></div></div>
      <div class="row" style="margin-top:12px">${ref.km ? `<button class="btn grow" data-a="refDel">Togli</button>` : ''}<button class="btn primary grow" data-a="refSave">Salva</button></div>` });
  },
  refKm(el) { const i = $('#rf-km'); if (i) i.value = fmtKg(+el.dataset.v); document.querySelectorAll('[data-a="refKm"]').forEach(b => b.classList.toggle('on', b === el)); },
  refSave() {
    const km = num($('#rf-km')?.value), sec = (num($('#rf-h')?.value) || 0) * 3600 + (num($('#rf-m')?.value) || 0) * 60 + (num($('#rf-s')?.value) || 0);
    if (!km || !sec) { toast('Inserisci km e tempo'); return; }
    if (!vdotOf(km, sec)) { toast('Tempo non realistico per questa distanza'); return; }
    S.profile.runRef = { km, sec, at: Date.now() }; save(); popLayer(); render(); toast('Ritmi aggiornati');
  },
  refDel() { delete S.profile.runRef; save(); popLayer(); render(); },
  runPlanStart(el) {
    const p = RUN_PLANS.find(x => x.k === el.dataset.k); if (!p) return;
    pushLayer({ type: 'confirm', title: `Iniziare “${p.n}”?`, text: `${p.d} ${p.need} Le uscite non hanno un giorno fisso: falle in ordine, lasciando almeno un giorno tra quelle impegnative.`, ok: 'Inizia', fn: () => { S.runPlan = { kind: p.k, start: startOfWeek(Date.now()), done: {} }; save(); toast('Piano iniziato: la prima uscita è in Corsa'); } });
  },
  runPlanOpen() { pushLayer({ type: 'runPlan' }); },
  runPlanGo(el) {
    const ps = planState(); if (!ps) return; const w = +el.dataset.w, i = +el.dataset.i, s = ps.weeks[w]?.[i]; if (!s) return;
    const go = gps => startRun({ type: s.t === 'race' ? 'race' : s.t, gps, sess: { ...s }, planRef: { w, i } });
    pushLayer({ type: 'sheet', title: s.n, items: [
      { label: 'Con GPS', desc: sessHint(s), ic: 'runner', fn: () => go(true) },
      { label: 'Tapis roulant', desc: 'Senza GPS', ic: 'timer', fn: () => go(false) },
    ] });
  },
  runPlanTick(el) {
    const p = S.runPlan; if (!p) return; p.done = p.done || {}; const k = el.dataset.w + '-' + el.dataset.i;
    if (p.done[k]) delete p.done[k]; else p.done[k] = true;
    save(); renderLayers(); haptic(15);
  },
  runPlanEnd() { pushLayer({ type: 'confirm', title: 'Terminare il piano?', text: 'Le corse registrate restano.', ok: 'Termina', danger: true, fn: () => { S.runPlan = null; save(); closeLayersOfType('runPlan'); } }); },
});

/* manual entry inputs */
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.in; if (!k) return;
  if (k === 'hrMax') { const v = num(el.value); if (v && v >= 120 && v <= 230) S.profile.hrMax = Math.round(v); else if (!el.value) delete S.profile.hrMax; save(); return; }
  if (!/^re[A-Z]/.test(k)) return;
  const l = topLayer(); if (!l || l.type !== 'runEdit') return; const r = l.draft;
  if (k === 'reDate' || k === 'reTime') { const d = $('[data-in="reDate"]')?.value, t = $('[data-in="reTime"]')?.value || '12:00'; if (d) { const [y, mo, dd] = d.split('-').map(Number), [hh, mm] = t.split(':').map(Number); r.start = new Date(y, mo - 1, dd, hh || 0, mm || 0).getTime(); } }
  if (k === 'reKm') r.km = num(el.value) || 0;
  // durata riscritta a mano: il cronometro totale e i buchi di segnale non c'entrano piu' nulla
  if (k === 'reDur') { const g = f => num($(`[data-in="reDur"][data-f="${f}"]`)?.value) || 0; r.sec = g('h') * 3600 + g('m') * 60 + g('s'); delete r.secTot; delete r.lost; delete r.holes; }
  if (k === 'reNum') { const v = num(el.value); r[el.dataset.f] = v ? Math.round(v) : undefined; }
  if (k === 'reNote') r.note = el.value;
  const p = $('#re-pace'); if (p) p.innerHTML = r.km > 0 && r.sec > 0 ? `Passo medio <b>${paceTxt(r.sec / r.km)}/km</b> · ~${runKcal(r)} kcal attive` : 'Inserisci distanza e durata';
});

/* pocket lock: hold to unlock */
document.addEventListener('pointerdown', ev => {
  const b = ev.target.closest('[data-hold]'); if (!b) return;
  ev.preventDefault(); b.classList.add('holding');
  clearTimeout(RUN.hold); RUN.hold = setTimeout(() => { RUN.hold = null; UI.runLock = false; haptic(30); renderLayers(); }, 900);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => document.addEventListener(t, ev => { if (!RUN.hold) return; clearTimeout(RUN.hold); RUN.hold = null; document.querySelectorAll('[data-hold].holding').forEach(b => b.classList.remove('holding')); }, true));

document.addEventListener('visibilitychange', () => {
  if (!S.runActive) return;
  if (document.visibilityState === 'visible') { if (RUN.watch != null) { try { navigator.geolocation.clearWatch(RUN.watch); } catch (e) { } RUN.watch = null; } requestWake(); runResume(); runTick(); if (topLayer()?.type === 'run') renderLayers(); }
  else { try { localStorage.setItem(KEY, serialize(S)); } catch (e) { } }
});
if (S.runActive) setTimeout(runResume, 400);
