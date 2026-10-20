/* =========================================================
   4.1 ALLENAMENTO AVANZATO
   back-off in %, serie in % del massimale, riscaldamento automatico,
   progressione lineare, settimana di scarico, creazione guidata delle schede
   ========================================================= */
const PROGS = [['double', 'Doppia progressione'], ['linear', 'Lineare (+peso ogni seduta)'], ['rir', 'Regolata sul RIR'], ['fixed', 'Peso fisso']];

/* ---------- loads ---------- */
function roundKg(kg, id) { const x = ex(id), step = x && (x.e === 'dumbbell' || x.e === 'kettlebells') ? 2 : 2.5; return Math.max(0, Math.round(kg / step) * step); }
function oneRM(id) { if (S.rm && S.rm[id]) return S.rm[id]; const b = derive().best[id]; return b && b.e1rm ? Math.round(b.e1rm * 2) / 2 : null; }
/* weight suggested by the plan for a set: % of 1RM, or back-off from today's top set */
function planKg(e, s) {
  if (s.rm) { const r = oneRM(e.id); if (r) return roundKg(r * s.rm / 100, e.id); }
  if (s.bpct) {
    const ts = e.sets.find(o => o.t === 'ts' && o.kg != null);
    if (ts) return roundKg(ts.kg * (1 + s.bpct / 100), e.id);
  }
  return null;
}
function workingKg(aex, wid) {
  const w = aex.sets.find(s => isWork(s) && s.kg != null); if (w) return w.kg;
  const pk = aex.sets.map(s => planKg(aex, s)).find(v => v != null); if (pk) return pk;
  const sg = suggestion(aex, wid); if (sg && sg.kg) return sg.kg;
  const last = lastSession(aex.id, wid); if (last) { const ws = workSets(last.e); if (ws.length) return Math.max(...ws.map(s => s.kg || 0)) || null; }
  return null;
}
/* warm-up ramp from the working weight */
function addWarmup(aex, wid, silent) {
  if (mtOf(aex) !== 'wr') return false;
  const W = workingKg(aex, wid); if (!W || W < 15) return false;
  const x = ex(aex.id), bar = x.e === 'barbell' ? 20 : 0;
  const steps = W < 40 ? [[0.5, 8]] : W < 70 ? [[0.45, 8], [0.7, 4]] : W < 120 ? [[0.4, 8], [0.6, 5], [0.8, 3]] : [[0.4, 8], [0.55, 5], [0.7, 3], [0.85, 1]];
  const sets = []; let lastKg = -1;
  for (const [p, r] of steps) { const kg = Math.max(bar, roundKg(W * p, aex.id)); if (kg >= W || kg === lastKg) continue; lastKg = kg; sets.push({ t: 'w', kg, r: null, ta: r, tb: null, rir: null, done: false }); }
  if (!sets.length) return false;
  aex.sets = [...sets, ...aex.sets.filter(s => s.t !== 'w' || s.done)];
  if (!silent) toast(`Riscaldamento: ${sets.map(s => fmtKg(s.kg) + '×' + s.ta).join(' · ')}`);
  return true;
}

/* ---------- linear progression ---------- */
function linearSuggestion(aex, wid) {
  const x = ex(aex.id), last = lastSession(aex.id, wid); if (!last) return null;
  const ws = workSets(last.e); if (!ws.length) return null;
  const T = workTargets(aex), top = Math.max(...ws.map(s => s.kg || 0)), inc = increment(x) || 0;
  const hit = ws.every((s, i) => s.r >= (T[i] || T[T.length - 1] || { a: aex.rmin || 5 }).a);
  if (hit && inc) return { kind: 'up', kg: +(top + inc).toFixed(2), text: `Progressione lineare: tutte le serie chiuse, <b>passa a ${fmtKg(top + inc)} kg</b>.` };
  const prev = lastSession(aex.id, last.w.id);
  const missPrev = prev && workSets(prev.e).some((s, i) => s.kg === top && s.r < (T[i] || T[0] || { a: 5 }).a);
  if (!hit && missPrev) { const kg = roundKg(top * 0.9, aex.id); return { kind: 'down', kg, text: `Due sedute senza chiudere le serie: <b>riparti da ${fmtKg(kg)} kg</b> (−10%) e risali.` }; }
  return { kind: 'hold', kg: top, text: `Progressione lineare: <b>resta a ${fmtKg(top)} kg</b> finché chiudi tutte le serie.` };
}

/* ---------- deload ---------- */
function deloadOn() { return !!(S.profile.deloadUntil && S.profile.deloadUntil > Date.now()); }
function deloadAdj(sg, aex) {
  if (!sg || !deloadOn() || sg.kg == null) return sg;
  const kg = roundKg(sg.kg * 0.9, aex.id);
  return { ...sg, kind: 'down', kg, text: `Settimana di scarico: <b>${fmtKg(kg)} kg</b> (−10%), meno serie, lascia 3–4 ripetizioni in riserva.` };
}
function deloadSignals() {
  const out = [];
  if (typeof recovery === 'function') {
    const t = kdate(todayKey()), low = [0, 1, 2, 3, 4].map(i => recovery(dkey(t - i * DAY + 7200e3)).score).filter(v => v != null && v < 34).length;
    if (low >= 3) out.push(`Recupero basso in ${low} degli ultimi 5 giorni`);
  }
  const t28 = Date.now() - 28 * DAY, ids = new Set(S.workouts.filter(w => w.start > t28).flatMap(w => w.ex.map(e => e.id)));
  let stalled = 0;
  for (const id of ids) { const ser = (derive().series[id] || []).slice(-4); if (ser.length === 4 && Math.max(...ser.slice(1).map(p => p.e1rm)) <= ser[0].e1rm + 0.01) stalled++; }
  if (stalled >= 3) out.push(`${stalled} esercizi fermi da 4 sedute`);
  const weeks = [...Array(7)].map((_, i) => S.workouts.filter(w => w.start > Date.now() - (i + 1) * 7 * DAY && w.start <= Date.now() - i * 7 * DAY).length);
  if (weeks.every(n => n >= 3) && !(S.profile.lastDeload > Date.now() - 56 * DAY)) out.push('7 settimane di fila senza una settimana leggera');
  return out;
}
function deloadCard() {
  if (deloadOn()) return `<div class="card tight" style="border:1px solid rgba(127,178,229,.35)"><div class="row"><span style="color:var(--steel)">${icon('moon', 20)}</span><div class="grow"><b>Settimana di scarico</b><div class="small muted">Fino a ${fmtDateLong(S.profile.deloadUntil)}: −10% di carico e ~40% di serie in meno. Poi riparti più forte.</div></div><button class="btn sm" data-a="deloadStop">Termina</button></div></div>`;
  const sig = S.workouts.length >= 6 ? deloadSignals() : [];
  if (!sig.length) return '';
  return `<div class="card tight coach"><div class="row"><span class="coach-ic">${icon('info', 18)}</span><b class="grow">Forse è ora di scaricare</b></div><div class="small muted">${sig.join(' · ')}.</div><div class="row"><button class="btn sm primary" data-a="deloadStart">Inizia 7 giorni di scarico</button><button class="btn sm ghost" data-a="openMethod" data-id="deload">Cos'è</button></div></div>`;
}

/* ---------- guided routine builder ---------- */
/* candidates per movement pattern: [id, equipment, joints stressed] */
const PAT = {
  squat: [['Barbell_Squat', 'bb', 'knee lowback'], ['Hack_Squat', 'mach', 'knee'], ['Leg_Press', 'mach', 'knee'], ['x_pendulum_squat', 'mach', 'knee'], ['x_belt_squat', 'mach', 'knee'], ['x_smith_squat', 'mach', 'knee'], ['Goblet_Squat', 'db', 'knee'], ['Box_Squat', 'bb', 'lowback'], ['Bodyweight_Squat', 'bw', 'knee']],
  hinge: [['Romanian_Deadlift', 'bb', 'lowback'], ['Barbell_Deadlift', 'bb', 'lowback'], ['Barbell_Hip_Thrust', 'bb', 'hip'], ['x_hip_thrust_machine', 'mach', 'hip'], ['Stiff-Legged_Dumbbell_Deadlift', 'db', 'lowback'], ['Hyperextensions_Back_Extensions', 'bw', 'lowback'], ['Glute_Ham_Raise', 'bw', 'knee']],
  lunge: [['x_bulgarian_split_squat', 'db', 'knee hip'], ['Dumbbell_Lunges', 'db', 'knee'], ['Dumbbell_Step_Ups', 'db', 'knee'], ['Split_Squat_with_Dumbbells', 'db', 'knee'], ['Bodyweight_Walking_Lunge', 'bw', 'knee']],
  kneeflex: [['Lying_Leg_Curls', 'mach', ''], ['Seated_Leg_Curl', 'mach', ''], ['Glute_Ham_Raise', 'bw', 'knee'], ['Stiff-Legged_Dumbbell_Deadlift', 'db', 'lowback']],
  kneeext: [['Leg_Extensions', 'mach', 'knee'], ['Single-Leg_Leg_Extension', 'mach', 'knee'], ['Goblet_Squat', 'db', 'knee'], ['Bodyweight_Squat', 'bw', 'knee']],
  calves: [['Standing_Calf_Raises', 'mach', ''], ['Seated_Calf_Raise', 'mach', ''], ['Standing_Dumbbell_Calf_Raise', 'db', ''], ['Calf_Raise_On_A_Dumbbell', 'bw', '']],
  hpress: [['Barbell_Bench_Press_-_Medium_Grip', 'bb', 'shoulder wrist'], ['Dumbbell_Bench_Press', 'db', 'shoulder'], ['Machine_Bench_Press', 'mach', ''], ['Dumbbell_Bench_Press_with_Neutral_Grip', 'db', ''], ['Leverage_Chest_Press', 'mach', ''], ['Pushups', 'bw', 'wrist shoulder'], ['Dips_-_Chest_Version', 'bw', 'shoulder elbow']],
  ipress: [['Incline_Dumbbell_Press', 'db', 'shoulder'], ['Barbell_Incline_Bench_Press_-_Medium_Grip', 'bb', 'shoulder wrist'], ['x_incline_machine_press', 'mach', ''], ['Leverage_Incline_Chest_Press', 'mach', ''], ['Push-Ups_With_Feet_Elevated', 'bw', 'wrist shoulder']],
  vpress: [['Standing_Military_Press', 'bb', 'shoulder lowback wrist'], ['Dumbbell_Shoulder_Press', 'db', 'shoulder'], ['Machine_Shoulder_Military_Press', 'mach', 'shoulder'], ['Arnold_Dumbbell_Press', 'db', 'shoulder'], ['Leverage_Shoulder_Press', 'mach', 'shoulder'], ['Decline_Push-Up', 'bw', 'shoulder wrist']],
  hpull: [['x_chest_supported_row', 'mach', ''], ['Seated_Cable_Rows', 'cable', ''], ['One-Arm_Dumbbell_Row', 'db', ''], ['Bent_Over_Barbell_Row', 'bb', 'lowback'], ['T-Bar_Row_with_Handle', 'bb', 'lowback'], ['x_seated_machine_row', 'mach', ''], ['Leverage_Iso_Row', 'mach', ''], ['Inverted_Row', 'bw', '']],
  vpull: [['Pullups', 'bw', 'elbow shoulder'], ['Wide-Grip_Lat_Pulldown', 'cable', 'shoulder'], ['x_neutral_lat_pulldown', 'cable', ''], ['Chin-Up', 'bw', 'elbow wrist'], ['Close-Grip_Front_Lat_Pulldown', 'cable', ''], ['x_assisted_pullup', 'mach', ''], ['Band_Assisted_Pull-Up', 'bw', '']],
  fly: [['Flat_Bench_Cable_Flyes', 'cable', 'shoulder'], ['Butterfly', 'mach', ''], ['Dumbbell_Flyes', 'db', 'shoulder'], ['x_cable_fly_low_high', 'cable', ''], ['Pushups', 'bw', 'wrist']],
  lateral: [['Side_Lateral_Raise', 'db', ''], ['x_cable_lateral_raise', 'cable', ''], ['Cable_Seated_Lateral_Raise', 'cable', ''], ['Lateral_Raise_-_With_Bands', 'bw', '']],
  rear: [['Face_Pull', 'cable', ''], ['Reverse_Machine_Flyes', 'mach', ''], ['Reverse_Flyes', 'db', ''], ['Band_Pull_Apart', 'bw', '']],
  biceps: [['Dumbbell_Bicep_Curl', 'db', 'elbow wrist'], ['Barbell_Curl', 'bb', 'elbow wrist'], ['Hammer_Curls', 'db', ''], ['Incline_Dumbbell_Curl', 'db', 'elbow shoulder'], ['x_bayesian_curl', 'cable', 'elbow'], ['x_cable_curl_bar', 'cable', 'wrist']],
  triceps: [['Triceps_Pushdown_-_Rope_Attachment', 'cable', ''], ['Triceps_Pushdown', 'cable', 'wrist'], ['Cable_Rope_Overhead_Triceps_Extension', 'cable', 'elbow shoulder'], ['EZ-Bar_Skullcrusher', 'bb', 'elbow'], ['Standing_Dumbbell_Triceps_Extension', 'db', 'elbow shoulder'], ['Dips_-_Triceps_Version', 'bw', 'shoulder elbow'], ['Push-Ups_-_Close_Triceps_Position', 'bw', 'wrist elbow']],
  core: [['Cable_Crunch', 'cable', ''], ['Hanging_Leg_Raise', 'bw', 'shoulder'], ['Ab_Roller', 'bw', 'lowback'], ['Plank', 'bw', ''], ['Dead_Bug', 'bw', ''], ['Crunches', 'bw', 'neck']],
};
const PAT_MUSCLE = { squat: 'q', hinge: 'h', lunge: 'q', kneeflex: 'h', kneeext: 'q', calves: 'c', hpress: 'p', ipress: 'p', vpress: 's', hpull: 'b', vpull: 'b', fly: 'p', lateral: 's', rear: 's', biceps: 'bi', triceps: 'tr', core: 'a' };
const WZ_MUSCLES = [['p', 'Petto'], ['b', 'Schiena'], ['s', 'Spalle'], ['bi', 'Bicipiti'], ['tr', 'Tricipiti'], ['q', 'Quadricipiti'], ['h', 'Femorali e glutei'], ['c', 'Polpacci'], ['a', 'Addome']];
const WZ_LIFTS = [['bench', 'Panca', 'hpress', 'Barbell_Bench_Press_-_Medium_Grip'], ['squat', 'Squat', 'squat', 'Barbell_Squat'], ['dead', 'Stacco', 'hinge', 'Barbell_Deadlift'], ['ohp', 'Military press', 'vpress', 'Standing_Military_Press'], ['pull', 'Trazioni', 'vpull', 'Pullups']];
const WZ_PAINS = [['shoulder', 'Spalla'], ['elbow', 'Gomito'], ['wrist', 'Polso'], ['lowback', 'Schiena bassa'], ['knee', 'Ginocchio'], ['hip', 'Anca'], ['neck', 'Collo']];
const WZ_GOALS = [['strength', 'Forza'], ['hyper', 'Ipertrofia'], ['both', 'Forza + ipertrofia'], ['cut', 'Definizione']];
const WZ_METHODS = ['linear', 'topset', 'double', 'rir', 'dup', 'pause', 'lengthened', 'priority', 'special', 'volume', 'superset', 'density', 'drop', 'restpause', 'myo'];
const RM_ = 'M', RS_ = 'S', RA_ = 'A';
const DAYS = {
  fullA: ['Full body A', [['squat', RM_], ['hpress', RM_], ['hpull', RS_], ['hinge', RS_], ['lateral', RA_], ['biceps', RA_], ['core', RA_]]],
  fullB: ['Full body B', [['hinge', RM_], ['vpress', RM_], ['vpull', RS_], ['lunge', RS_], ['fly', RA_], ['triceps', RA_], ['calves', RA_]]],
  fullC: ['Full body C', [['squat', RS_], ['ipress', RS_], ['vpull', RM_], ['kneeflex', RA_], ['rear', RA_], ['biceps', RA_], ['triceps', RA_]]],
  upperA: ['Upper A', [['hpress', RM_], ['hpull', RM_], ['vpress', RS_], ['vpull', RS_], ['lateral', RA_], ['biceps', RA_], ['triceps', RA_]]],
  upperB: ['Upper B', [['vpull', RM_], ['ipress', RS_], ['hpull', RS_], ['fly', RA_], ['rear', RA_], ['biceps', RA_], ['triceps', RA_]]],
  lowerA: ['Lower A', [['squat', RM_], ['hinge', RS_], ['lunge', RS_], ['kneeflex', RA_], ['calves', RA_], ['core', RA_]]],
  lowerB: ['Lower B', [['hinge', RM_], ['squat', RS_], ['kneeext', RA_], ['kneeflex', RA_], ['calves', RA_], ['core', RA_]]],
  push: ['Push', [['hpress', RM_], ['vpress', RS_], ['ipress', RS_], ['fly', RA_], ['lateral', RA_], ['triceps', RA_]]],
  pull: ['Pull', [['vpull', RM_], ['hpull', RS_], ['hpull', RS_], ['rear', RA_], ['biceps', RA_], ['biceps', RA_]]],
  legs: ['Legs', [['squat', RM_], ['hinge', RS_], ['lunge', RS_], ['kneeext', RA_], ['kneeflex', RA_], ['calves', RA_]]],
};
const SPLITS = { 2: ['Full body', ['fullA', 'fullB']], 3: ['Full body', ['fullA', 'fullB', 'fullC']], 4: ['Upper / Lower', ['upperA', 'lowerA', 'upperB', 'lowerB']], 5: ['Upper / Lower + PPL', ['upperA', 'lowerA', 'push', 'pull', 'legs']], 6: ['Push / Pull / Legs ×2', ['push', 'pull', 'legs', 'push', 'pull', 'legs']] };
function wzDefault() { return { mode: 'auto', goal: 'hyper', methods: [], days: 4, mins: 60, level: 'inter', equip: 'gym', lifts: [], weak: [], prefer: [], avoid: [], pains: [], note: '' }; }

const TOPSET_PATS = new Set(['hpress', 'ipress', 'squat', 'hinge', 'vpress', 'vpull']);
function wzScheme(a, role, dayIdx, pat) {
  const m = new Set(a.methods), g = a.goal, lvl = a.level;
  const fx = (n, r, t = 'n') => [...Array(n)].map(() => ({ t, a: r, b: null }));
  const rg = (n, lo, hi, t = 'n') => [...Array(n)].map(() => ({ t, a: lo, b: hi }));
  const plus = lvl === 'adv' ? 1 : 0, minus = lvl === 'beg' ? 1 : 0;
  if (role === RM_) {
    if (m.has('dup')) return dayIdx % 2 ? rg(3 + plus, 8, 12) : rg(4 + plus, 4, 6);
    if (m.has('linear') || (g === 'strength' && lvl === 'beg')) return fx(5, 5);
    if (TOPSET_PATS.has(pat) && (m.has('topset') || (g !== 'hyper' && g !== 'cut' && lvl !== 'beg'))) {
      const top = g === 'strength' ? { t: 'ts', a: 3, b: 5 } : g === 'both' ? { t: 'ts', a: 4, b: 6 } : { t: 'ts', a: 6, b: 8 };
      const bo = g === 'strength' ? { t: 'bo', a: 5, b: null, pct: -10 } : { t: 'bo', a: 8, b: 10, pct: -15 };
      return [top, ...[...Array(2 + plus + (g === 'strength' ? 1 : 0))].map(() => ({ ...bo }))];
    }
    return g === 'strength' ? rg(4 + plus, 4, 6) : rg(3 + plus, 6, 10);
  }
  if (role === RS_) return g === 'strength' ? rg(3, 6, 8) : g === 'cut' ? rg(3 - minus, 8, 12) : rg(3, 8, 12);
  return rg(Math.max(2, (g === 'cut' ? 2 : 3) - minus), 10, 15);
}
function wzPick(pat, a, used, forceId) {
  const pains = new Set(a.pains), avoid = new Set(a.avoid);
  const eqOk = c => a.equip === 'gym' || (a.equip === 'db' ? ['db', 'bw'].includes(c[1]) : c[1] === 'bw');
  let list = (PAT[pat] || []).filter(c => EXMAP.has(c[0]) || allExercises().some(x => x.id === c[0]));
  let ok = list.filter(c => eqOk(c) && !avoid.has(c[0]) && !c[2].split(' ').some(j => pains.has(j)));
  if (!ok.length) ok = list.filter(c => eqOk(c) && !avoid.has(c[0]));   // nothing pain-free: least bad option, flagged
  if (!ok.length) return null;
  if (forceId) { const f = ok.find(c => c[0] === forceId); if (f) return { id: f[0], painFree: !f[2].split(' ').some(j => pains.has(j)) }; }
  const pref = { bb: 'bb', db: 'db', mach: 'mach', cable: 'mach', bw: 'bw' };
  ok = [...ok].sort((x, y) => (a.prefer.includes(pref[y[1]]) ? 1 : 0) - (a.prefer.includes(pref[x[1]]) ? 1 : 0));
  const n = used.get(pat) || 0; used.set(pat, n + 1);
  const c = ok[n % ok.length];
  return { id: c[0], painFree: !c[2].split(' ').some(j => pains.has(j)) };
}
function wzBuild(a) {
  const m = new Set(a.methods), [splitName, keys] = SPLITS[clamp(a.days, 2, 6)], used = new Map();
  const notes = [], forced = new Map(a.lifts.map(k => { const L = WZ_LIFTS.find(x => x[0] === k); return [L[2], L[3]]; }));
  const days = keys.map((k, di) => {
    const [name, slots0] = DAYS[k];
    let slots = slots0.map(s => [...s]);
    // weak points: priority = first in the session; specialization/volume = one more exercise
    if (a.weak.length) {
      const isWeak = p => a.weak.includes(PAT_MUSCLE[p]);
      if (m.has('priority') || m.has('special')) {
        const order = { M: 0, S: 1, A: 2 }, wi = slots.map((s, i) => i).filter(i => isWeak(slots[i][0])).sort((x, y) => order[slots[x][1]] - order[slots[y][1]])[0];
        if (wi > 0) { const [w] = slots.splice(wi, 1); slots.unshift(w); }
      }
      if (m.has('special') || m.has('volume') || m.has('priority')) {
        const extra = Object.keys(PAT_MUSCLE).find(p => isWeak(p) && !slots.some(s => s[0] === p) && slots.some(s => PAT_MUSCLE[s[0]] && (k.startsWith('full') || (k.startsWith('upper') || k === 'push' || k === 'pull') === ['p', 'b', 's', 'bi', 'tr'].includes(PAT_MUSCLE[p]))));
        if (extra) slots.push([extra, RA_]);
      }
    }
    // strength focus lifts become the main lift of their pattern
    for (const s of slots) if (forced.has(s[0]) && s[1] === RS_ && !slots.some(o => o[0] === s[0] && o[1] === RM_)) s[1] = RM_;
    const list = [];
    for (const [pat, role] of slots) {
      const pk = wzPick(pat, a, used, role === RM_ ? forced.get(pat) : null); if (!pk) continue;
      if (list.some(e => e.id === pk.id)) continue;
      let plan = wzScheme(a, role, di, pat).map(p => ({ ...p }));
      if (forced.has(pat) && role === RM_ && forced.get(pat) === pk.id && !plan.some(p => p.t === 'ts')) plan.push({ ...plan[plan.length - 1] });
      if (a.weak.includes(PAT_MUSCLE[pat]) && (m.has('volume') || m.has('special'))) plan.push({ ...plan[plan.length - 1] });
      const tags = [];
      if (m.has('rir')) tags.push(role === RA_ ? 'RIR 1' : 'RIR 2');
      if (m.has('pause') && role === RM_) tags.push('Fermo 1–2 s');
      if (m.has('lengthened') && role === RA_) tags.push('Parziali in allungamento');
      const x = ex(pk.id), iso = x && x.k === 'isolation';
      if (role === RA_ && iso) {
        if (m.has('myo') && !list.some(e => e.plan.some(p => p.t === 'm'))) plan = [{ t: 'm', a: 12, b: 15 }, { t: 'm', a: 4, b: 5 }, { t: 'm', a: 4, b: 5 }, { t: 'm', a: 4, b: 5 }];
        else if (m.has('restpause')) plan[plan.length - 1].t = 'rp';
        else if (m.has('drop')) plan.push({ t: 'd', a: 8, b: 12 });
      }
      list.push({ role, raw: x ? x.n : pk.id, id: pk.id, conf: 1, plan, ss: false, tags, note: pk.painFree ? '' : 'Attenzione al fastidio: carichi moderati, interrompi se fa male', rest: role === RM_ ? (a.goal === 'strength' ? 180 : 150) : role === RS_ ? 120 : 75, prog: m.has('linear') && role !== RA_ ? 'linear' : undefined, warm: role === RM_ });
    }
    // antagonist supersets on accessories
    if (m.has('superset') || m.has('density')) {
      for (let j = 0; j + 1 < list.length; j++) {
        if (list[j].role !== RA_ || list[j + 1].role !== RA_) continue;
        list[j].ss = true; if (m.has('density')) { list[j].rest = 60; list[j + 1].rest = 60; } j++;
      }
    }
    // time budget
    const minutes = () => list.reduce((t, e) => t + e.plan.length * (40 + (e.ss ? e.rest / 2 : e.rest)) / 60, 0) + 5;
    while (minutes() > a.mins && list.length > 4) list.pop();
    if (minutes() > a.mins) list.forEach(e => { if (e.plan.length > 2 && e.rest < 120) e.plan.pop(); });
    const nm = keys.filter(x => x === k).length > 1 ? `${name} ${keys.slice(0, di + 1).filter(x => x === k).length}` : name;
    return { name: nm, ex: list, mins: Math.round(minutes()) };
  });
  // weekly volume check
  const vol = {}; for (const d of days) for (const e of d.ex) { const pm = Object.entries(PAT).find(([p, l]) => l.some(c => c[0] === e.id)); const mu = pm && PAT_MUSCLE[pm[0]]; if (mu) vol[mu] = (vol[mu] || 0) + e.plan.filter(p => p.t !== 'w').length; }
  const goalTxt = WZ_GOALS.find(g => g[0] === a.goal)[1];
  notes.push(`${goalTxt} · ${a.days} giorni (${splitName}) · ~${a.mins} min a seduta.`);
  notes.push('Serie a settimana: ' + WZ_MUSCLES.map(([k, n]) => `${n} ${vol[k] || 0}`).join(', ') + '. Per crescere: 10–20 serie per muscolo.');
  if (a.pains.length) notes.push(`Esclusi o limitati gli esercizi che caricano: ${a.pains.map(p => WZ_PAINS.find(x => x[0] === p)[1].toLowerCase()).join(', ')}. Non è un parere medico: se il dolore persiste fatti vedere da un professionista.`);
  if (m.has('topset') || days.some(d => d.ex.some(e => e.plan.some(p => p.t === 'ts')))) notes.push('Top set + back-off: fai la serie pesante, i back-off si calcolano da soli in percentuale.');
  if (m.has('linear')) notes.push('Progressione lineare sui fondamentali: se chiudi tutte le serie, la volta dopo +2,5/5 kg.');
  return { name: `${goalTxt} ${a.days} giorni`, days: days.filter(d => d.ex.length), notes, wz: true };
}
function wzWhy(a, res) {
  const out = [];
  out.push(`<b>Divisione:</b> con ${a.days} giorni ${a.days <= 3 ? 'il full body allena ogni muscolo 2–3 volte a settimana: è la scelta più efficiente' : a.days === 4 ? 'upper/lower allena ogni muscolo 2 volte a settimana con sedute gestibili' : 'si possono dividere i muscoli e aumentare il volume'}.`);
  out.push(`<b>Ripetizioni:</b> ${a.goal === 'strength' ? 'fondamentali tra 3 e 6, complementari 6–8' : a.goal === 'cut' ? 'come in massa ma con meno serie: in definizione serve mantenere i carichi, non fare più volume' : 'fondamentali 6–10, complementari 8–12, isolamento 10–15'}.`);
  if (a.weak.length) out.push(`<b>Punti carenti</b> (${a.weak.map(k => WZ_MUSCLES.find(x => x[0] === k)[1].toLowerCase()).join(', ')}): ${a.methods.includes('priority') ? 'messi a inizio seduta, quando sei più fresco' : 'aggiungi principio di priorità o specializzazione per dargli più spazio'}.`);
  if (a.lifts.length) out.push(`<b>Forza su</b> ${a.lifts.map(k => WZ_LIFTS.find(x => x[0] === k)[1]).join(', ')}: diventano l'esercizio principale della seduta, con riscaldamento automatico.`);
  return out;
}

/* wizard layer */
function wzChips(key, list, multi, a) {
  const cur = a[key];
  return `<div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${list.map(([k, n]) => `<button class="chip ${multi ? (cur.includes(k) ? 'on' : '') : (cur == k ? 'on' : '')}" data-a="wzSet" data-k="${key}" data-v="${k}" data-m="${multi ? 1 : ''}">${n}</button>`).join('')}</div>`;
}
const WZ_STEPS = ['Obiettivo', 'Metodi', 'Disponibilità', 'Priorità', 'Preferenze e fastidi', 'Riepilogo'];
function layerWizard(l, i) {
  const a = l.a, st = l.step;
  const body = [
    () => `<div class="lbl">Come vuoi crearla?</div><div class="seg"><button class="${a.mode === 'auto' ? 'on' : ''}" data-a="wzSet" data-k="mode" data-v="auto">Automatica</button><button class="${a.mode === 'manual' ? 'on' : ''}" data-a="wzSet" data-k="mode" data-v="manual">Manuale con consigli</button></div>
      <div class="small faint">${a.mode === 'auto' ? 'Creo io le schede complete: le controlli e le modifichi prima di salvarle.' : 'Ti do la proposta con le spiegazioni e creo le schede vuote: gli esercizi li scegli tu, con i consigli a portata di mano.'}</div>
      <div class="lbl">Obiettivo</div>${wzChips('goal', WZ_GOALS, false, a)}`,
    () => `<div class="small muted">Scegli uno o più metodi (facoltativo). Li trovi spiegati in Allena → Metodi e tecniche.</div>
      ${METHOD_CATS.filter(c => c.k !== 'stallo').map(c => { const ms = METHODS.filter(x => x.cat === c.k && WZ_METHODS.includes(x.id)); return ms.length ? `<div class="lbl" style="color:${c.c}">${c.n}</div><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${ms.map(x => `<button class="chip ${a.methods.includes(x.id) ? 'on' : ''}" data-a="wzSet" data-k="methods" data-v="${x.id}" data-m="1">${x.n}</button>`).join('')}</div>` : ''; }).join('')}`,
    () => `<div class="row"><div class="grow"><div class="lbl" style="color:var(--fg)">Giorni a settimana</div></div><div class="stepper"><button data-a="wzDays" data-d="-1">−</button><span>${a.days}</span><button data-a="wzDays" data-d="1">+</button></div></div>
      <div class="lbl">Minuti per seduta</div>${wzChips('mins', [[45, '45'], [60, '60'], [75, '75'], [90, '90']], false, a)}
      <div class="lbl">Livello</div>${wzChips('level', [['beg', 'Principiante (< 1 anno)'], ['inter', 'Intermedio'], ['adv', 'Avanzato (3+ anni)']], false, a)}
      <div class="lbl">Attrezzatura</div>${wzChips('equip', [['gym', 'Palestra completa'], ['db', 'Manubri e panca'], ['bw', 'Corpo libero / elastici']], false, a)}`,
    () => `<div class="lbl">Vuoi aumentare la forza su… <span class="faint">(facoltativo)</span></div>${wzChips('lifts', WZ_LIFTS.map(x => [x[0], x[1]]), true, a)}
      <div class="lbl">Muscoli carenti da migliorare <span class="faint">(max 2)</span></div>${wzChips('weak', WZ_MUSCLES, true, a)}
      <div class="small faint">Con il principio di priorità o la specializzazione (passo 2) li metto a inizio seduta e con più serie.</div>`,
    () => `<div class="lbl">Preferisco</div>${wzChips('prefer', [['bb', 'Bilanciere'], ['db', 'Manubri'], ['mach', 'Macchine e cavi'], ['bw', 'Corpo libero']], true, a)}
      <div class="lbl">Esercizi da evitare</div><div class="row wrap">${a.avoid.map(id => `<span class="chip warm">${esc(ex(id).n)} <button data-a="wzAvoidDel" data-id="${esc(id)}" aria-label="Togli">${icon('x', 12)}</button></span>`).join('')}<button class="chip" data-a="wzAvoidAdd">${icon('plus', 12)} Aggiungi</button></div>
      <div class="lbl">Dolori o fastidi</div>${wzChips('pains', WZ_PAINS, true, a)}
      <div class="field"><label>Altro da sapere <span class="faint">(usato dall'AI)</span></label><input class="input" data-in="wzNote" maxlength="200" value="${esc(a.note)}" placeholder="Es. ernia L5, preferisco allenarmi la mattina"></div>
      <div class="small faint">Sui fastidi tolgo gli esercizi che di solito caricano quella zona. Non sostituisce un medico o un fisioterapista.</div>`,
    () => { const res = l.res || (l.res = wzBuild(a)); return `<div class="card hero"><div class="eyebrow" style="color:var(--gold)">Proposta</div><b style="font-size:18px">${esc(res.name)}</b><div class="small muted">${res.days.map(d => `${esc(d.name)} · ${d.ex.length} esercizi · ~${d.mins} min`).join('<br>')}</div></div>
      <div class="card"><div class="lbl">Perché così</div>${wzWhy(a, res).map(t => `<div class="small" style="line-height:1.5">${t}</div>`).join('')}${res.notes.slice(1).map(t => `<div class="small muted" style="line-height:1.5">${esc(t)}</div>`).join('')}</div>
      ${a.mode === 'manual' ? res.days.map(d => `<div class="card tight"><b>${esc(d.name)}</b>${d.ex.map(e => `<div class="small"><span class="muted">${esc(ex(e.id).n)}</span> · ${planSummary(e.plan)}</div>`).join('')}</div>`).join('') : ''}
      <div class="stack">${a.mode === 'auto' ? `<button class="btn primary block" data-a="wzCreate">Crea le schede</button>` : `<button class="btn primary block" data-a="wzManual">Crea le schede vuote con i consigli</button><button class="btn block" data-a="wzCreate">Usa questa proposta completa</button>`}
      ${aiReady() ? `<button class="btn block" data-a="wzAi" ${l.busy ? 'disabled' : ''}>${l.busy ? 'L\'AI ci sta lavorando…' : icon('sparkle', 16) + ' Migliora con l\'AI'}</button>` : `<button class="btn block" data-a="wzAiCopy">${icon('copy', 16)} Chiedi a Claude di migliorarla (copia)</button>`}
      ${l.err ? `<div class="small" style="color:var(--bad)">${esc(l.err)}</div>` : ''}</div>`; },
  ][st]();
  return `<div class="layer">${head('Crea scheda guidata', st ? 'back' : 'x')}
    <div class="layer-body" data-scroll-key="wz${i}"><div class="layer-inner">
      <div class="wzsteps">${WZ_STEPS.map((n, k) => `<span class="${k === st ? 'on' : k < st ? 'done' : ''}"></span>`).join('')}</div>
      <div class="eyebrow">${st + 1} di ${WZ_STEPS.length} · ${WZ_STEPS[st]}</div>
      ${body}
      ${st < WZ_STEPS.length - 1 ? `<div class="row" style="margin-top:6px">${st ? `<button class="btn" data-a="wzStep" data-d="-1">Indietro</button>` : ''}<button class="btn primary grow" data-a="wzStep" data-d="1">Avanti</button></div>` : `<button class="btn ghost" data-a="wzStep" data-d="-1">Indietro</button>`}
    </div></div></div>`;
}
function wzAiPrompt(a, res) {
  const p = n => (WZ_PAINS.find(x => x[0] === n) || [, n])[1];
  return `Sei un preparatore atletico. Migliora questa proposta di programma per l'app Forgia tenendo conto delle risposte dell'utente. Mantieni gli stessi giorni, cambia esercizi, serie e ripetizioni solo se serve. Rispondi SOLO con il JSON.
Utente: obiettivo ${a.goal}, livello ${a.level}, ${a.days} giorni da ${a.mins} minuti, attrezzatura ${a.equip}, metodi scelti: ${a.methods.join(', ') || 'nessuno'}, forza su: ${a.lifts.join(', ') || '-'}, muscoli carenti: ${a.weak.join(', ') || '-'}, preferisce: ${a.prefer.join(', ') || '-'}, da evitare: ${a.avoid.map(id => ex(id).n).join(', ') || '-'}, fastidi: ${a.pains.map(p).join(', ') || 'nessuno'}. Altro: ${a.note || '-'}.
Proposta attuale:
${res.days.map(d => d.name + ': ' + d.ex.map(e => `${ex(e.id).en || ex(e.id).n} ${planSummary(e.plan)}${e.plan.some(p => p.t === 'ts') ? ' (top set + back-off)' : ''}`).join('; ')).join('\n')}
Usa nomi di esercizi in inglese standard (es. "Barbell Bench Press", "Seated Cable Rows").
Schema: ${IMP_AI_SCHEMA}`;
}

Object.assign(LAYER_RENDER, { wizard: layerWizard });
Object.assign(A, {
  wizardOpen() { pushLayer({ type: 'wizard', step: 0, a: wzDefault() }); },
  wzSet(el) {
    const l = topLayer(), a = l.a, k = el.dataset.k; let v = el.dataset.v; if (k === 'mins') v = +v;
    if (el.dataset.m) { const arr = a[k]; const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else { arr.push(v); if (k === 'weak' && arr.length > 2) arr.shift(); } }
    else a[k] = v;
    if (k === 'methods' && v === 'linear' && a.methods.includes('linear')) a.methods = a.methods.filter(x => x !== 'dup');
    if (k === 'methods' && v === 'dup' && a.methods.includes('dup')) a.methods = a.methods.filter(x => x !== 'linear');
    l.res = null; renderLayers();
  },
  wzDays(el) { const l = topLayer(); l.a.days = clamp(l.a.days + +el.dataset.d, 2, 6); l.res = null; renderLayers(); },
  wzStep(el) { const l = topLayer(); l.step = clamp(l.step + +el.dataset.d, 0, WZ_STEPS.length - 1); l.err = ''; renderLayers(); const b = document.querySelector('[data-scroll-key^="wz"]'); if (b) b.scrollTop = 0; },
  wzAvoidAdd() { pushLayer({ type: 'picker', mode: 'add', target: 'wizard', q: '', g: '', eq: '', sel: [] }); },
  wzAvoidDel(el) { const l = topLayer(); l.a.avoid = l.a.avoid.filter(x => x !== el.dataset.id); l.res = null; renderLayers(); },
  wzCreate() {
    const l = topLayer(), res = l.res || wzBuild(l.a);
    UI.layers = UI.layers.filter(x => x.type !== 'wizard');
    pushLayer({ type: 'import', step: 'review', res: JSON.parse(JSON.stringify(res)) });
  },
  wzManual() {
    const l = topLayer(), res = l.res || wzBuild(l.a), why = wzWhy(l.a, res).map(t => t.replace(/<[^>]+>/g, ''));
    const f = { id: uid(), name: res.name.slice(0, 40), img: null, c: FOLDER_COLORS[folders().length % FOLDER_COLORS.length] }; folders().push(f);
    for (const d of res.days) S.routines.push({ id: uid(), name: d.name, fid: f.id, ex: [], note: ['CONSIGLI', ...why, ...res.notes.slice(1), '', 'Proposta per questa seduta:', ...d.ex.map(e => `• ${ex(e.id).n}: ${planSummary(e.plan)}${e.tags.length ? ' (' + e.tags.join(', ') + ')' : ''}`)].join('\n').slice(0, 1000) });
    UI.fopen = UI.fopen || {}; UI.fopen[f.id] = true;
    save(); UI.layers = UI.layers.filter(x => x.type !== 'wizard'); UI.tab = 'train'; render(); renderLayers();
    toast(`${res.days.length} schede vuote create: i consigli sono nella nota di ogni scheda`);
  },
  async wzAi() {
    const l = topLayer(), res = l.res || wzBuild(l.a); l.busy = true; l.err = ''; renderLayers();
    try { const j = await aiAsk(wzAiPrompt(l.a, res), { json: true, maxTokens: 4000 }); l.busy = false; const r2 = fromAiJson(j); r2.notes = [...res.notes, ...(r2.notes || [])]; UI.layers = UI.layers.filter(x => x.type !== 'wizard'); pushLayer({ type: 'import', step: 'review', res: r2 }); }
    catch (e) { l.busy = false; l.err = aiErr(e); renderLayers(); }
  },
  wzAiCopy() {
    const l = topLayer(), res = l.res || wzBuild(l.a);
    try { navigator.clipboard.writeText(wzAiPrompt(l.a, res)).then(() => toast('Copiato: incollalo in Claude, poi Importa → Con l\'AI → incolla la risposta'), () => toast('Copia non riuscita')); } catch (e) { toast('Copia non riuscita'); }
  },
  deloadStart() { S.profile.deloadUntil = Date.now() + 7 * DAY; S.profile.lastDeload = Date.now(); save(); render(); toast('Settimana di scarico attiva per 7 giorni'); },
  deloadStop() { S.profile.deloadUntil = null; save(); render(); toast('Scarico terminato'); },
});
