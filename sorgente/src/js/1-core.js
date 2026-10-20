'use strict';
/* =========================================================
   FORGIA — gym, diet & body tracker
   Fase 1: base + allenamento
   ========================================================= */

const RAW_EX = /*__EXDB__*/[];
const POPULAR = /*__POPULAR__*/[];
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

/* ---------- labels ---------- */
const MUSCLE_IT = {
  chest: 'Petto', lats: 'Dorsali', 'middle back': 'Dorso', 'lower back': 'Lombari', traps: 'Trapezi',
  shoulders: 'Spalle', biceps: 'Bicipiti', triceps: 'Tricipiti', forearms: 'Avambracci',
  quadriceps: 'Quadricipiti', hamstrings: 'Femorali', glutes: 'Glutei', calves: 'Polpacci',
  adductors: 'Adduttori', abductors: 'Abduttori', abdominals: 'Addominali', neck: 'Collo'
};
const EQUIP_IT = {
  barbell: 'Bilanciere', dumbbell: 'Manubri', cable: 'Cavi', machine: 'Macchina', 'body only': 'Corpo libero',
  kettlebells: 'Kettlebell', bands: 'Elastici', 'medicine ball': 'Palla medica', 'exercise ball': 'Fitball',
  'foam roll': 'Foam roller', 'e-z curl bar': 'Bilanciere EZ', other: 'Altro'
};
const CAT_IT = {
  strength: 'Forza', stretching: 'Stretching', plyometrics: 'Pliometria', powerlifting: 'Powerlifting',
  'olympic weightlifting': 'Pesistica', strongman: 'Strongman', cardio: 'Cardio'
};
const LEVEL_IT = { beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Avanzato' };
/* filter groups for the exercise library */
const GROUPS = [
  { k: 'chest', n: 'Petto', m: ['chest'] },
  { k: 'back', n: 'Schiena', m: ['lats', 'middle back', 'lower back', 'traps'] },
  { k: 'shoulders', n: 'Spalle', m: ['shoulders'] },
  { k: 'biceps', n: 'Bicipiti', m: ['biceps'] },
  { k: 'triceps', n: 'Tricipiti', m: ['triceps'] },
  { k: 'forearms', n: 'Avambracci', m: ['forearms'] },
  { k: 'quads', n: 'Quadricipiti', m: ['quadriceps'] },
  { k: 'hams', n: 'Femorali', m: ['hamstrings'] },
  { k: 'glutes', n: 'Glutei', m: ['glutes', 'abductors', 'adductors'] },
  { k: 'calves', n: 'Polpacci', m: ['calves'] },
  { k: 'core', n: 'Core', m: ['abdominals'] },
  { k: 'cardio', n: 'Cardio', cat: 'cardio' },
  { k: 'stretch', n: 'Stretching', cat: 'stretching' },
];
/* groups used for the weekly volume tracker (sets per week) */
const VOL_GROUPS = [
  { n: 'Petto', m: ['chest'] },
  { n: 'Schiena', m: ['lats', 'middle back'] },
  { n: 'Spalle', m: ['shoulders'] },
  { n: 'Bicipiti', m: ['biceps'] },
  { n: 'Tricipiti', m: ['triceps'] },
  { n: 'Avambracci', m: ['forearms'] },
  { n: 'Quadricipiti', m: ['quadriceps'] },
  { n: 'Femorali', m: ['hamstrings'] },
  { n: 'Glutei', m: ['glutes'] },
  { n: 'Polpacci', m: ['calves'] },
  { n: 'Addominali', m: ['abdominals'] },
];
const SET_TYPES = {
  n: { l: 'Serie normale', s: '', d: 'Serie allenante classica' },
  w: { l: 'Riscaldamento', s: 'W', d: 'Non conta per volume e record' },
  ts: { l: 'Top set', s: 'T', d: 'La serie più pesante della giornata, poche ripetizioni' },
  bo: { l: 'Back-off', s: 'B', d: 'Dopo il top set: carico ridotto (−10/20%) e più ripetizioni' },
  d: { l: 'Drop set', s: 'D', d: 'Scali il peso subito dopo la serie precedente' },
  f: { l: 'Cedimento', s: 'F', d: 'Serie portata a cedimento muscolare' },
  rp: { l: 'Rest-pause', s: 'RP', d: 'Pause di 10–20 s e altre ripetizioni' },
  m: { l: 'Myo-reps', s: 'M', d: 'Serie di attivazione + mini-serie con 3–5 respiri' },
  pa: { l: 'Parziali', s: 'P', d: 'Ripetizioni parziali, di solito in allungamento' },
  dx: { l: 'Lato destro', s: 'Dx', d: 'Esercizio unilaterale: braccio o gamba destra' },
  sx: { l: 'Lato sinistro', s: 'Sx', d: 'Esercizio unilaterale: braccio o gamba sinistra' },
};

/* ---------- exercise index ---------- */
const EXMAP = new Map();
for (const r of RAW_EX) {
  EXMAP.set(r[0], { id: r[0], n: r[1], en: r[1], it: r[11] || '', p: r[2], s: r[3], e: r[4], c: r[5], k: r[6], l: r[7], i: r[8], img: r[9], a: r[10] || '', im: r[12] || '', es: r[13] || '' });
}
const POP_RANK = new Map(POPULAR.map((id, i) => [id, i]));
function ex(id) {
  return EXMAP.get(id) || (S.customEx || []).find(x => x.id === id) || { id, n: 'Esercizio rimosso', p: [], s: [], e: 'other', c: 'strength', img: 0, a: '' };
}
function allExercises() { return [...(S.customEx || []), ...EXMAP.values()]; }
function exImg(x, i = 0) { return x.img > i ? IMG_BASE + encodeURI(x.im || x.id) + '/' + i + '.jpg' : ''; }
function initials(name) { return name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '•'; }
function thumbHTML(x, cls = '') {
  const src = exImg(x, 0);
  return `<span class="thumb ${cls}">${esc(initials(x.n))}${src ? `<img src="${src}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
}
function isLower(x) { return (x.p || []).some(m => ['quadriceps', 'hamstrings', 'glutes', 'adductors', 'abductors'].includes(m)); }

/* ---------- utils ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DAY = 864e5;
function num(v) { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : null; }
function fmtN(n, d = 1) { if (n == null || !isFinite(n)) return '–'; return Number(n).toLocaleString(locale(), { maximumFractionDigits: d }); }
function fmtKg(n) { if (n == null || !isFinite(n)) return '–'; return Number(n).toLocaleString(locale(), { maximumFractionDigits: 2, useGrouping: false }); }
function fmtTon(kg) { return kg >= 1000 ? fmtN(kg / 1000, 1) + ' t' : fmtN(Math.round(kg), 0) + ' kg'; }
function fmtDur(ms) { const m = Math.round(ms / 6e4); if (m < 60) return m + ' min'; return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); }
function fmtClock(ms) { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0'); }
const DOW = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const MON = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
function fmtDate(t) { const d = new Date(t); return d.getDate() + ' ' + MON[d.getMonth()]; }
function fmtDateLong(t) { const d = new Date(t); return DAYS_L[lang()][d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; }
function relDay(t) {
  const a = startOfDay(Date.now()), b = startOfDay(t), diff = Math.round((a - b) / DAY);
  if (diff === 0) return 'Oggi'; if (diff === 1) return 'Ieri'; if (diff < 7) return DOW[new Date(t).getDay()] + ' ' + fmtDate(t); return fmtDate(t);
}
function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
function startOfWeek(t) { const d = new Date(startOfDay(t)); const wd = (d.getDay() + 6) % 7; return d.getTime() - wd * DAY; }

/* Epley estimated 1RM */
function e1rm(kg, r) { if (!kg || !r) return 0; return r === 1 ? kg : kg * (1 + r / 30); }
const isWork = s => s.t !== 'w';

/* ---------- store ---------- */
const KEY = 'forgia.v1';
function defaultState() {
  return {
    v: 1,
    profile: { name: '', restDefault: 120, weeklyGoal: 4, sound: true, onboarded: false, dayEnd: 0, exLang: 'en', lang: 'it' },
    ai: { key: '', model: 'claude-haiku-4-5' },
    customEx: [], routines: [], workouts: [], active: null, exNotes: {}, seenBadges: [],
    foods: {}, diary: {}, savedMeals: [], nutri: null, body: {}, health: {}, folders: [], exRir: {}, rm: {}, runs: [], runPlan: null, runActive: null, favEx: [], favFood: [],
  };
}
function loadState() {
  try {
    const r = localStorage.getItem(KEY);
    if (r) { const d = JSON.parse(r); const s = Object.assign(defaultState(), d); s.profile = Object.assign(defaultState().profile, d.profile || {}); return s; }
  } catch (e) { }
  return defaultState();
}
let S = loadState();
/* exercise names: English (gym standard) or Italian */
function applyExLang() { const L = S.profile.exLang; for (const x of EXMAP.values()) { x.n = L === 'it' && x.it ? x.it : L === 'es' && x.es ? x.es : x.en; x._s = null; } }
applyExLang();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, serialize(S)); } catch (e) { } }, 120);
  CACHE.k = null;
  if (typeof syncSoon === 'function') syncSoon();
}
function serialize(o, space) { return JSON.stringify(o, (k, v) => (k === '_ix' || k === '_s') ? undefined : v, space); }
window.addEventListener('pagehide', () => { try { localStorage.setItem(KEY, serialize(S)); } catch (e) { } });

/* ---------- icons (24px stroke) ---------- */
const IC = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
  food: '<path d="M7 3v8a2 2 0 0 0 2 2v8M5 3v6M9 3v6M17 21V3c-2.2 1.2-3 3.5-3 6.5V13h3"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  flame: '<path d="M12 22c4 0 7-2.8 7-6.8 0-3.4-2.2-5.5-3.6-7.2-.4 2-1.4 3.2-2.6 3.6C13.5 8 12.5 4.5 9.5 2c.3 3.5-1.5 5.6-3 7.4C5.2 11 4.5 12.7 4.5 15c0 4.2 3.4 7 7.5 7Z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  medal: '<circle cx="12" cy="15" r="6"/><path d="M8.5 10 6 3h4l2 5 2-5h4l-2.5 7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  scale: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 9a5 5 0 0 1 8 0l-3 3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 9v6M10 9v6M13 9v6M17 9v6"/>',
  sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
};
function icon(name, size = 22, sw = 2) {
  const filled = name === 'play';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || ''}</svg>`;
}

/* ---------- derived data (cached per save) ---------- */
const CACHE = { k: null };
function workoutsSorted() { return [...S.workouts].sort((a, b) => a.start - b.start); }
/* ---------- how an exercise is logged ---------- */
const MT = {
  wr: { l: 'Peso × ripetizioni', d: 'Bilanciere, manubri, macchine, cavi', cols: ['kg', 'Reps', 'RIR'] },
  bw: { l: 'Corpo libero (+ zavorra)', d: 'Trazioni, dip, piegamenti: kg = zavorra aggiunta', cols: ['+kg', 'Reps', 'RIR'] },
  time: { l: 'Tempo', d: 'Plank, isometrie, stretching, corda', cols: ['kg', 'Sec', 'RIR'] },
  dist: { l: 'Distanza e tempo', d: 'Corsa, cyclette, vogatore, camminata', cols: ['km', 'Min', ''] },
};
function defaultMT(x) {
  const n = (x.en || x.n || '').toLowerCase();
  if (/plank|hold|wall sit|hollow|isometric|dead hang|l-sit|jump rope|stretch|smr/.test(n) || x.c === 'stretching') return 'time';
  if (x.c === 'cardio') return 'dist';
  if (x.e === 'body only' && x.c !== 'plyometrics') return 'bw';
  return 'wr';
}
function exType(id) { return (S.exType && S.exType[id]) || defaultMT(ex(id)); }
function mtOf(e) { return e.mt || exType(e.id); }
/* per-set plan of a routine exercise: [{ t, a, b }] a = reps (min), b = max (null = fixed reps) */
function planOf(e) {
  if (Array.isArray(e.plan) && e.plan.length) return e.plan;
  return [...Array(clamp(+e.sets || 3, 1, 20))].map(() => ({ t: 'n', a: e.rmin ?? 8, b: e.rmax != null && e.rmax !== e.rmin ? e.rmax : null }));
}
function repTxt(a, b) { return a == null ? '' : b != null && b !== a ? a + '–' + b : String(a); }
function planSummary(plan) {
  const w = plan.filter(p => p.t !== 'w'), txt = [...new Set(w.map(p => repTxt(p.a, p.b)).filter(Boolean))];
  const warm = plan.length - w.length;
  return `${txt.length ? `${w.length} × ${txt.length === 1 ? txt[0] : txt.join(' / ')}` : `${w.length} serie`}${warm ? ` + ${warm} risc.` : ''}`;
}
/* targets of the work sets of an exercise in the active workout */
function workTargets(aex) { return aex.sets.filter(isWork).map(s => s.ta != null ? { a: s.ta, b: s.tb ?? s.ta } : { a: aex.rmin || 8, b: aex.rmax || 12 }); }
function rirTarget(aex) { const t = (aex.tags || []).find(x => /^RIR \d/.test(x)); return t ? +t[4] : aex.rir ?? 2; }
function rirOn(e) { return !!(S.exRir && S.exRir[e.id]) || e.prog === 'rir'; }
function setDone(s, mt) { return mt === 'time' ? !!s.sec : mt === 'dist' ? !!(s.km || s.min) : s.kg != null && !!s.r; }
function workSets(e) { const mt = mtOf(e); return (e.sets || []).filter(s => isWork(s) && setDone(s, mt)); }
function fmtSet(s, mt) {
  if (mt === 'time') return (s.kg ? fmtKg(s.kg) + ' kg · ' : '') + fmtN(s.sec, 0) + ' s';
  if (mt === 'dist') return (s.km ? fmtN(s.km, 2) + ' km' : '') + (s.km && s.min ? ' · ' : '') + (s.min ? fmtN(s.min, 1) + '′' : '');
  if (mt === 'bw') return (s.kg ? '+' + fmtKg(s.kg) + '×' : '') + s.r;
  return fmtKg(s.kg) + '×' + s.r;
}
function wVolume(w) { let v = 0; for (const e of w.ex) for (const s of workSets(e)) v += (s.kg || 0) * (s.r || 0); return v; }
function wSetCount(w) { let n = 0; for (const e of w.ex) n += (e.sets || []).filter(isWork).length; return n; }

/* Walk history chronologically and record PR events + bests per exercise */
function derive() {
  const key = S.workouts.length + ':' + (S.workouts[S.workouts.length - 1]?.id || '') + ':' + (S.workouts.reduce((a, w) => a + (w.end || 0), 0));
  if (CACHE.k === key) return CACHE;
  const best = {};      // exId -> {e1rm, kg, vol, sessions, last}
  const prByW = {};     // wid -> [{exId, type, value}]
  const series = {};    // exId -> [{t, e1rm, kg, vol}]
  for (const w of workoutsSorted()) {
    prByW[w.id] = [];
    for (const e of w.ex) {
      const ws = workSets(e);
      if (!ws.length) continue;
      const b = best[e.id] || (best[e.id] = { e1rm: 0, kg: 0, vol: 0, reps: 0, sec: 0, km: 0, sessions: 0, last: 0 });
      const had = b.sessions > 0, mt = mtOf(e);
      b.mt = mt;
      if (mt === 'time' || mt === 'dist') {
        const ssec = Math.max(0, ...ws.map(s => s.sec || 0)), skm = Math.max(0, ...ws.map(s => s.km || 0)), smin = ws.reduce((a, s) => a + (s.min || 0), 0);
        if (had && mt === 'time' && ssec > b.sec) prByW[w.id].push({ exId: e.id, type: 'sec', value: ssec });
        if (had && mt === 'dist' && skm > b.km) prByW[w.id].push({ exId: e.id, type: 'km', value: skm });
        b.sec = Math.max(b.sec, ssec); b.km = Math.max(b.km, skm); b.sessions++; b.last = w.start;
        (series[e.id] || (series[e.id] = [])).push({ t: w.start, sec: ssec, km: skm, min: smin });
        continue;
      }
      let se = 0, sk = 0, sv = 0, svol = 0, sr = 0;
      for (const s of ws) { se = Math.max(se, e1rm(s.kg, s.r)); sk = Math.max(sk, s.kg); sv = Math.max(sv, s.kg * s.r); svol += s.kg * s.r; if (!s.kg) sr = Math.max(sr, s.r); }
      if (had && se > b.e1rm + 0.01) prByW[w.id].push({ exId: e.id, type: 'e1rm', value: se });
      if (had && sk > b.kg + 0.01) prByW[w.id].push({ exId: e.id, type: 'kg', value: sk });
      if (had && sr > b.reps && sk === 0) prByW[w.id].push({ exId: e.id, type: 'reps', value: sr });
      b.reps = Math.max(b.reps, sr);
      b.e1rm = Math.max(b.e1rm, se); b.kg = Math.max(b.kg, sk); b.vol = Math.max(b.vol, sv); b.sessions++; b.last = w.start;
      (series[e.id] || (series[e.id] = [])).push({ t: w.start, e1rm: se, kg: sk, vol: svol, reps: sr });
    }
  }
  Object.assign(CACHE, { k: key, best, prByW, series });
  return CACHE;
}
function prCount(w) { const d = derive(); const list = d.prByW[w.id] || []; return new Set(list.map(p => p.exId)).size; }

/* ---------- gamification ---------- */
function workoutXP(w) { return 50 + 5 * wSetCount(w) + 25 * prCount(w); }
function totalXP() { return S.workouts.reduce((a, w) => a + workoutXP(w), 0); }
function xpForLevel(n) { return Math.round(100 * Math.pow(n - 1, 1.5)); }
function levelInfo(xp = totalXP()) {
  let n = 1; while (xpForLevel(n + 1) <= xp) n++;
  const a = xpForLevel(n), b = xpForLevel(n + 1);
  return { n, xp, into: xp - a, need: b - a, pct: (xp - a) / (b - a), rank: rankName(n) };
}
function rankName(n) {
  return n >= 50 ? 'Titanio' : n >= 40 ? 'Platino' : n >= 30 ? 'Oro' : n >= 20 ? 'Argento' : n >= 15 ? 'Bronzo' : n >= 10 ? 'Acciaio' : n >= 5 ? 'Ferro' : 'Apprendista';
}
function weekCounts() {
  const m = new Map();
  for (const w of S.workouts) { const k = startOfWeek(w.start); m.set(k, (m.get(k) || 0) + 1); }
  return m;
}
function streakWeeks() {
  const goal = S.profile.weeklyGoal || 3, m = weekCounts();
  let wk = startOfWeek(Date.now()), n = 0;
  if ((m.get(wk) || 0) >= goal) n++;
  wk -= 7 * DAY;
  while ((m.get(wk) || 0) >= goal) { n++; wk -= 7 * DAY; }
  return n;
}
function bestStreak() {
  const goal = S.profile.weeklyGoal || 3, m = weekCounts();
  const keys = [...m.keys()].sort((a, b) => a - b);
  let best = 0, cur = 0, prev = null;
  for (const k of keys) {
    if (m.get(k) >= goal) { cur = (prev != null && Math.round((k - prev) / (7 * DAY)) === 1) ? cur + 1 : 1; prev = k; best = Math.max(best, cur); }
    else { cur = 0; prev = null; }
  }
  return best;
}
function globalStats() {
  const d = derive();
  let vol = 0, sets = 0, prs = 0, early = 0, late = 0, long = 0;
  for (const w of S.workouts) {
    vol += wVolume(w); sets += wSetCount(w); prs += (d.prByW[w.id] || []).length;
    const h = new Date(w.start).getHours();
    if (h < 7) early++; if (h >= 21) late++;
    if ((w.end - w.start) >= 90 * 6e4) long++;
  }
  return { n: S.workouts.length, vol, sets, prs, early, late, long, streak: bestStreak(), exCount: Object.keys(d.best).length };
}
const BADGES = [
  { id: 'w1', n: 'Prima scintilla', d: 'Primo allenamento', ic: 'flame', v: s => s.n, goal: 1 },
  { id: 'w10', n: 'In forgia', d: '10 allenamenti', ic: 'dumbbell', v: s => s.n, goal: 10 },
  { id: 'w25', n: 'Abitudine', d: '25 allenamenti', ic: 'dumbbell', v: s => s.n, goal: 25 },
  { id: 'w50', n: 'Ferro battuto', d: '50 allenamenti', ic: 'medal', v: s => s.n, goal: 50 },
  { id: 'w100', n: 'Centurione', d: '100 allenamenti', ic: 'medal', v: s => s.n, goal: 100 },
  { id: 'w250', n: 'Veterano', d: '250 allenamenti', ic: 'trophy', v: s => s.n, goal: 250 },
  { id: 'pr1', n: 'Primo record', d: '1 PR', ic: 'trophy', v: s => s.prs, goal: 1 },
  { id: 'pr25', n: 'Cacciatore di PR', d: '25 PR', ic: 'trophy', v: s => s.prs, goal: 25 },
  { id: 'pr100', n: 'Macchina da PR', d: '100 PR', ic: 'star', v: s => s.prs, goal: 100 },
  { id: 'v10', n: '10 tonnellate', d: 'Volume totale 10 t', ic: 'layers', v: s => s.vol / 1000, goal: 10 },
  { id: 'v100', n: '100 tonnellate', d: 'Volume totale 100 t', ic: 'layers', v: s => s.vol / 1000, goal: 100 },
  { id: 'v1000', n: 'Mille tonnellate', d: 'Volume totale 1000 t', ic: 'layers', v: s => s.vol / 1000, goal: 1000 },
  { id: 's4', n: 'Costante', d: '4 settimane di fila a obiettivo', ic: 'calendar', v: s => s.streak, goal: 4 },
  { id: 's12', n: 'Inarrestabile', d: '12 settimane di fila', ic: 'calendar', v: s => s.streak, goal: 12 },
  { id: 's26', n: 'Mezzo anno', d: '26 settimane di fila', ic: 'calendar', v: s => s.streak, goal: 26 },
  { id: 'set1k', n: 'Mille serie', d: '1000 serie allenanti', ic: 'bolt', v: s => s.sets, goal: 1000 },
  { id: 'early', n: 'Alba di ferro', d: 'Allenamento prima delle 7', ic: 'sun', v: s => s.early, goal: 1 },
  { id: 'late', n: 'Turno di notte', d: 'Allenamento dopo le 21', ic: 'moon', v: s => s.late, goal: 1 },
  { id: 'long', n: 'Maratoneta', d: 'Sessione oltre 90 min', ic: 'timer', v: s => s.long, goal: 1 },
  { id: 'ex30', n: 'Esploratore', d: '30 esercizi diversi', ic: 'search', v: s => s.exCount, goal: 30 },
];
function badgeState() {
  const st = globalStats();
  return BADGES.map(b => { const v = b.v(st); return { ...b, val: v, got: v >= b.goal, pct: clamp(v / b.goal, 0, 1) }; });
}

/* ---------- program templates ----------
   row: [exerciseId, sets, repMin, repMax, RIR target, rest seconds] */
const PROGRAMS = [
  {
    id: 'ppl', name: 'Push Pull Legs', freq: '3 o 6 giorni', level: 'Intermedio',
    desc: 'Spinta, tirata e gambe in giorni separati. A 6 giorni alleni ogni muscolo 2 volte a settimana: ottimo per ipertrofia se recuperi bene.',
    routines: [
      { name: 'Push', ex: [['Barbell_Bench_Press_-_Medium_Grip', 3, 6, 8, 2, 180], ['Incline_Dumbbell_Press', 3, 8, 12, 2, 120], ['Dumbbell_Shoulder_Press', 3, 8, 12, 2, 120], ['Side_Lateral_Raise', 4, 12, 20, 1, 60], ['Triceps_Pushdown_-_Rope_Attachment', 3, 10, 15, 1, 75], ['Cable_Rope_Overhead_Triceps_Extension', 2, 10, 15, 1, 75]] },
      { name: 'Pull', ex: [['Pullups', 3, 6, 10, 2, 150], ['Bent_Over_Barbell_Row', 3, 6, 10, 2, 150], ['Seated_Cable_Rows', 3, 10, 12, 2, 120], ['Face_Pull', 3, 12, 20, 1, 60], ['Barbell_Curl', 3, 8, 12, 1, 75], ['Hammer_Curls', 2, 10, 15, 1, 60]] },
      { name: 'Legs', ex: [['Barbell_Squat', 3, 5, 8, 2, 180], ['Romanian_Deadlift', 3, 8, 10, 2, 150], ['Leg_Press', 3, 10, 15, 2, 120], ['Lying_Leg_Curls', 3, 10, 15, 1, 75], ['Leg_Extensions', 2, 12, 15, 1, 75], ['Standing_Calf_Raises', 4, 10, 15, 1, 60]] },
    ]
  },
  {
    id: 'ul', name: 'Upper / Lower', freq: '4 giorni', level: 'Principiante–Intermedio',
    desc: 'Due giorni parte alta e due parte bassa. Una sessione più di forza (A) e una più di volume (B): equilibrio tra carichi e ipertrofia.',
    routines: [
      { name: 'Upper A — Forza', ex: [['Barbell_Bench_Press_-_Medium_Grip', 4, 4, 6, 2, 180], ['Bent_Over_Barbell_Row', 4, 6, 8, 2, 150], ['Barbell_Shoulder_Press', 3, 6, 8, 2, 150], ['Wide-Grip_Lat_Pulldown', 3, 8, 10, 2, 120], ['EZ-Bar_Skullcrusher', 2, 8, 12, 1, 75], ['Barbell_Curl', 2, 8, 12, 1, 75]] },
      { name: 'Lower A — Forza', ex: [['Barbell_Squat', 4, 4, 6, 2, 180], ['Romanian_Deadlift', 3, 6, 8, 2, 150], ['Leg_Press', 3, 8, 12, 2, 120], ['Seated_Leg_Curl', 3, 10, 12, 1, 75], ['Standing_Calf_Raises', 4, 8, 12, 1, 60]] },
      { name: 'Upper B — Volume', ex: [['Incline_Dumbbell_Press', 3, 8, 12, 2, 120], ['Seated_Cable_Rows', 3, 10, 12, 2, 120], ['Butterfly', 3, 12, 15, 1, 75], ['Close-Grip_Front_Lat_Pulldown', 3, 10, 12, 1, 90], ['Side_Lateral_Raise', 4, 12, 20, 1, 60], ['Triceps_Pushdown_-_Rope_Attachment', 3, 10, 15, 1, 60], ['Incline_Dumbbell_Curl', 3, 10, 15, 1, 60]] },
      { name: 'Lower B — Volume', ex: [['Barbell_Hip_Thrust', 3, 8, 12, 2, 120], ['Hack_Squat', 3, 8, 12, 2, 120], ['x_bulgarian_split_squat', 3, 8, 12, 2, 90], ['Lying_Leg_Curls', 3, 10, 15, 1, 75], ['Leg_Extensions', 3, 12, 15, 1, 75], ['Seated_Calf_Raise', 4, 12, 20, 1, 60], ['Cable_Crunch', 3, 10, 15, 1, 60]] },
    ]
  },
  {
    id: 'fb', name: 'Full Body', freq: '3 giorni', level: 'Principiante',
    desc: 'Tutto il corpo in ogni seduta, alternando A e B. Alta frequenza e poco tempo in palestra: ideale se ti alleni 3 volte o hai una settimana piena.',
    routines: [
      { name: 'Full Body A', ex: [['Barbell_Squat', 3, 5, 8, 2, 180], ['Barbell_Bench_Press_-_Medium_Grip', 3, 6, 8, 2, 150], ['Seated_Cable_Rows', 3, 8, 12, 2, 120], ['Dumbbell_Shoulder_Press', 2, 8, 12, 2, 90], ['Lying_Leg_Curls', 2, 10, 15, 1, 75], ['Cable_Crunch', 2, 10, 15, 1, 60]] },
      { name: 'Full Body B', ex: [['Romanian_Deadlift', 3, 6, 10, 2, 150], ['Incline_Dumbbell_Press', 3, 8, 12, 2, 120], ['Wide-Grip_Lat_Pulldown', 3, 8, 12, 2, 120], ['Leg_Press', 3, 10, 15, 2, 120], ['Side_Lateral_Raise', 3, 12, 20, 1, 60], ['Barbell_Curl', 2, 10, 12, 1, 60]] },
    ]
  },
];
function routineFromTemplate(t) {
  return {
    id: uid(), name: t.name, note: '',
    ex: t.ex.map(r => ({ id: r[0], sets: r[1], rmin: r[2], rmax: r[3], rest: r[5], ss: false, tags: ['RIR ' + r[4]], plan: [...Array(r[1])].map(() => ({ t: 'n', a: r[2], b: r[3] })) })),
  };
}

/* ---------- progression engine (double progression + RIR) ---------- */
function lastSession(exId, excludeWid) {
  const ws = S.workouts.filter(w => w.id !== excludeWid).sort((a, b) => b.start - a.start);
  for (const w of ws) { const e = w.ex.find(x => x.id === exId); if (e && workSets(e).length) return { w, e }; }
  return null;
}
function increment(x) {
  if (x.e === 'dumbbell' || x.e === 'kettlebells') return 2;
  if (x.e === 'body only') return 0;
  if (x.e === 'barbell' && isLower(x)) return 5;
  return 2.5;
}
function suggestion(aex, wid) {
  const x = ex(aex.id), mt = mtOf(aex);
  if (mt === 'dist' || x.c === 'stretching') return null;
  if (mt === 'time') {
    const last = lastSession(aex.id, wid); if (!last) return null;
    const top = Math.max(...workSets(last.e).map(s => s.sec || 0));
    return { kind: 'reps', sec: top + 5, text: `Ultima volta <b>${top} s</b>: prova a tenere <b>${top + 5} s</b>.` };
  }
  if (aex.sets.some(s => s.rm) && typeof oneRM === 'function' && oneRM(aex.id)) return { kind: 'pct', text: `Carichi calcolati sul massimale: <b>${fmtKg(oneRM(aex.id))} kg</b>${S.rm?.[aex.id] ? '' : ' (stimato)'}. Lo cambi nella scheda dell'esercizio.` };
  if (aex.prog === 'fixed') { const l0 = lastSession(aex.id, wid), kg = l0 ? Math.max(...workSets(l0.e).map(s => s.kg || 0)) : null; return kg ? { kind: 'hold', kg, text: `Peso fisso: <b>${fmtKg(kg)} kg</b>. Il carico non cambia: cerca ripetizioni pulite e controllate.` } : { kind: 'new', text: 'Peso fisso: scegli il carico e tienilo uguale a ogni seduta.' }; }
  if (aex.prog === 'rir' && typeof rirSuggestion === 'function') { const rs = rirSuggestion(aex, wid); if (rs) return rs; }
  if (aex.prog === 'linear' && typeof linearSuggestion === 'function') { const ls = linearSuggestion(aex, wid); if (ls) return ls; }
  const T = workTargets(aex), T0 = T[0] || { a: aex.rmin || 8, b: aex.rmax || 12 };
  const rmin = T0.a, rmax = T0.b, rirT = rirTarget(aex), same = T.every(t => t.a === T0.a && t.b === T0.b);
  const maxTxt = same ? `${rmax} reps` : 'il massimo delle reps', minTxt = same ? `le ${rmin} reps` : 'il minimo di reps';
  const last = lastSession(aex.id, wid);
  if (!last) return { kind: 'new', text: `Prima volta: scegli un carico con cui arrivi a <b>${rmax}</b> ripetizioni lasciandone <b>${rirT}</b> in riserva.` };
  const ws = workSets(last.e);
  const top = Math.max(...ws.map(s => s.kg));
  const tg = i => T[i] || T[T.length - 1] || T0;
  const atTopI = ws.map((s, i) => ({ s, t: tg(i) })).filter(o => o.s.kg === top), atTop = atTopI.map(o => o.s);
  const inc = increment(x);
  const rirs = atTop.map(s => s.rir).filter(v => v != null);
  const avgRir = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  const allHit = atTopI.every(o => o.s.r >= o.t.b);
  const miss = atTopI.some(o => o.s.r < o.t.a);
  if (inc === 0) {
    if (allHit) return { kind: 'up', kg: top, text: `Hai chiuso ${maxTxt} su tutte le serie: <b>aggiungi zavorra</b> o rallenta l'eccentrica.` };
    return { kind: 'reps', kg: top, r: Math.min(rmax, Math.max(...atTop.map(s => s.r)) + 1), text: `Punta a <b>+1 ripetizione</b> per serie rispetto all'ultima volta.` };
  }
  if (allHit) {
    const big = avgRir != null && avgRir >= rirT + 2;
    const kg = +(top + inc * (big ? 2 : 1)).toFixed(2);
    return { kind: 'up', kg, r: rmin, text: `Hai chiuso ${maxTxt} su tutte le serie${big ? ' con margine' : ''}: <b>passa a ${fmtKg(kg)} kg</b> e riparti ${same ? 'da ' + rmin + ' reps' : 'dal minimo di ogni serie'}.` };
  }
  if (miss) {
    const prev = lastSession(aex.id, last.w.id);
    const missAgain = prev && workSets(prev.e).some(s => s.kg === top && s.r < rmin);
    if (missAgain) { const kg = Math.round(top * 0.9 / 0.5) * 0.5; return { kind: 'down', kg, r: rmax, text: `Sotto ${minTxt} per due sedute: <b>scarica a ${fmtKg(kg)} kg</b> e riprendi a salire.` }; }
    return { kind: 'hold', kg: top, r: rmin, text: `Ultima volta sotto ${minTxt}: <b>resta a ${fmtKg(top)} kg</b> e consolida.` };
  }
  const tr = Math.min(rmax, Math.max(...atTop.map(s => s.r)) + 1);
  if (!same) return { kind: 'reps', kg: top, text: `<b>${fmtKg(top)} kg</b>: punta a +1 ripetizione per serie prima di aumentare il carico.` };
  return { kind: 'reps', kg: top, r: tr, text: `<b>${fmtKg(top)} kg</b>: punta a ${tr} reps (+1) prima di aumentare il carico.` };
}

/* ---------- weekly muscle volume ---------- */
function weekMuscleSets(weekStart = startOfWeek(Date.now())) {
  const out = VOL_GROUPS.map(g => ({ n: g.n, v: 0 }));
  for (const w of S.workouts) {
    if (w.start < weekStart || w.start >= weekStart + 7 * DAY) continue;
    for (const e of w.ex) {
      const x = ex(e.id), n = (e.sets || []).filter(isWork).length;
      if (!n) continue;
      VOL_GROUPS.forEach((g, i) => {
        if (x.p.some(m => g.m.includes(m))) out[i].v += n;
        else if (x.s.some(m => g.m.includes(m))) out[i].v += n * 0.5;
      });
    }
  }
  return out;
}

/* ---------- demo data ---------- */
function makeDemo() {
  const tpl = PROGRAMS[0].routines;
  const base = {
    'Barbell_Bench_Press_-_Medium_Grip': 70, 'Incline_Dumbbell_Press': 24, 'Dumbbell_Shoulder_Press': 20, 'Side_Lateral_Raise': 9,
    'Triceps_Pushdown_-_Rope_Attachment': 22, 'Cable_Rope_Overhead_Triceps_Extension': 18, 'Pullups': 0, 'Bent_Over_Barbell_Row': 60,
    'Seated_Cable_Rows': 55, 'Face_Pull': 20, 'Barbell_Curl': 30, 'Hammer_Curls': 14, 'Barbell_Squat': 90, 'Romanian_Deadlift': 80,
    'Leg_Press': 160, 'Lying_Leg_Curls': 40, 'Leg_Extensions': 45, 'Standing_Calf_Raises': 60
  };
  const out = [];
  const now = Date.now();
  let k = 0;
  for (let d = 41; d >= 1; d--) {
    const day = new Date(startOfDay(now - d * DAY));
    const wd = (day.getDay() + 6) % 7;
    if (![0, 1, 3, 4].includes(wd)) continue;
    const r = tpl[k % 3]; const cycle = Math.floor(k / 3); k++;
    const start = day.getTime() + (18 * 60 + (k % 3) * 20) * 6e4;
    const w = { id: 'demo' + d, name: r.name, rid: null, start, end: start + (62 + (k % 4) * 7) * 6e4, demo: true, note: '', ex: [] };
    for (const row of r.ex) {
      const [id, sets, rmin, rmax] = row;
      const x = ex(id), inc = increment(x) || 0;
      const kg = base[id] + inc * Math.floor(cycle / 2);
      const reps = rmin + (cycle % 2 ? Math.ceil((rmax - rmin) / 2) : 0);
      const ss = [];
      if (x.e === 'barbell') ss.push({ t: 'w', kg: Math.round(kg * 0.5 / 2.5) * 2.5, r: 8, rir: null, done: true });
      for (let i = 0; i < sets; i++) ss.push({ t: 'n', kg, r: Math.max(rmin, reps - (i === sets - 1 ? 1 : 0) + (inc === 0 ? cycle : 0)), rir: i === sets - 1 ? 1 : 2, done: true });
      w.ex.push({ id, sets: ss, note: '' });
    }
    out.push(w);
  }
  return out;
}
