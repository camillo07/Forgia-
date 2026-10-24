/* =========================================================
   IMPORTA SCHEDE: Excel/CSV del PT, testo (Lyfta, note, chat), AI
   Risultato comune: { name, days: [{ name, ex: [{ raw, id, conf, plan:[{t,a,b}], ss, tags:[], note }] }], notes: [] }
   ========================================================= */

/* ---------- minimal .xlsx reader (zip + XML), no external library ---------- */
async function inflateRaw(bytes) {
  const ds = new DecompressionStream('deflate-raw');
  const out = await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(out);
}
async function unzipEntries(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
  let e = buf.byteLength - 22; while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const files = {};
  for (let i = 0; i < n; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
    files[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { method, csize, lho };
    p += 46 + nl + el + cl;
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name]; if (!f) return null;
      const s = f.lho + 30 + dv.getUint16(f.lho + 26, true) + dv.getUint16(f.lho + 28, true);
      const raw = u8.subarray(s, s + f.csize);
      return dec.decode(f.method === 8 ? await inflateRaw(raw) : raw);
    },
  };
}
function colIdx(ref) { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return 0; let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; }
async function readXlsx(buf) {
  const z = await unzipEntries(buf), P = new DOMParser();
  const ss = [];
  const sst = await z.text('xl/sharedStrings.xml');
  if (sst) { const d = P.parseFromString(sst, 'application/xml'); for (const si of d.getElementsByTagName('si')) ss.push([...si.getElementsByTagName('t')].map(t => t.textContent).join('')); }
  // first sheet in workbook order
  let sheetPath = 'xl/worksheets/sheet1.xml';
  try {
    const wb = P.parseFromString(await z.text('xl/workbook.xml'), 'application/xml'), rels = P.parseFromString(await z.text('xl/_rels/workbook.xml.rels'), 'application/xml');
    const first = wb.getElementsByTagName('sheet')[0], rid = first && (first.getAttribute('r:id') || first.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'));
    for (const r of rels.getElementsByTagName('Relationship')) if (r.getAttribute('Id') === rid) { const t = r.getAttribute('Target'); sheetPath = t.startsWith('/') ? t.slice(1) : 'xl/' + t.replace(/^\.\//, ''); }
  } catch (e) { }
  const xml = await z.text(sheetPath) || await z.text(z.names.find(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)));
  const d = P.parseFromString(xml, 'application/xml'), rows = [];
  for (const r of d.getElementsByTagName('row')) {
    const row = [];
    for (const c of r.getElementsByTagName('c')) {
      const t = c.getAttribute('t'), v = c.getElementsByTagName('v')[0], is = c.getElementsByTagName('is')[0];
      let val = t === 's' ? ss[+(v?.textContent)] : t === 'inlineStr' ? (is ? [...is.getElementsByTagName('t')].map(x => x.textContent).join('') : '') : v ? v.textContent : '';
      if (val != null && t !== 's' && t !== 'inlineStr' && t !== 'str' && /^-?\d+\.\d{6,}$/.test(val)) val = String(Math.round(+val * 1000) / 1000);
      row[colIdx(c.getAttribute('r'))] = val == null ? '' : String(val);
    }
    rows.push([...row].map(x => x ?? ''));
  }
  return rows;
}
function readCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim());
  const dl = [';', '\t', ','].sort((a, b) => (lines[0].split(b).length) - (lines[0].split(a).length))[0];
  return lines.map(l => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === dl && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); });
}

/* ---------- exercise name matching ---------- */
const IMP_ABBR = { man: 'manubri', manub: 'manubri', mnb: 'manubri', bil: 'bilanciere', bilan: 'bilanciere', inc: 'inclinata', incl: 'inclinata', decl: 'declinata', alz: 'alzate', lat: 'lat', ecc: '', cav: 'cavi', mach: 'macchina', db: 'dumbbell', bb: 'barbell', kb: 'kettlebell', ez: 'ez', sm: 'smith', uni: 'unilaterale', mono: 'unilaterale', orizz: 'orizzontale', vert: 'verticale', pres: 'presa', st: 'stretta', larg: 'larga' };
const IMP_IT_EN = [
  [/\bpanca piana\b/, 'bench press'], [/\bpanca inclinata\b/, 'incline bench press'], [/\bpanca declinata\b/, 'decline bench press'],
  [/\blento avanti\b/, 'shoulder press'], [/\blento dietro\b/, 'behind neck press'], [/\balzate laterali\b/, 'side lateral raise'], [/\balzate frontali\b/, 'front raise'], [/\balzate posteriori\b/, 'rear lateral raise'],
  [/\bcroci\b/, 'fly'], [/\bspinte\b/, 'press'], [/\brematore\b/, 'row'], [/\bstacco rumeno\b/, 'romanian deadlift'], [/\bstacco\b/, 'deadlift'],
  [/\btrazioni\b/, 'pullups'], [/\bpull ?ups?\b/, 'pullups'], [/\bchin ?ups?\b/, 'chin-up'], [/\blat ?machine\b/, 'lat pulldown'], [/\bpulley\b/, 'seated cable rows'], [/\btriangolo\b/, 'v-bar'],
  [/\bpiegamenti\b/, 'pushups'], [/\bpush ?ups?\b/, 'pushups'], [/\bpush ?down\b/, 'pushdown'], [/\bpressa\b/, 'leg press'], [/\baffondi\b/, 'lunge'], [/\bpolpacci\b/, 'calf raise'],
  [/\broll ?out\b/, 'ab roller'], [/\biperestensioni\b/, 'hyperextensions'], [/\bghd\b/, 'hyperextensions'], [/\bseal row\b/, 'chest supported row'], [/\babduttori\b/, 'abductor'], [/\badduttori\b/, 'adductor'],
  [/\bmanubri\b/, 'dumbbell'], [/\bbilanciere\b/, 'barbell'], [/\bcavi\b/, 'cable'], [/\bcavo\b/, 'cable'], [/\bmacchina\b/, 'machine'], [/\binclinata\b/, 'incline'], [/\bdeclinata\b/, 'decline'], [/\bpiana\b/, 'flat'],
  [/\bpanca\b/, 'bench'], [/\balternato\b/, 'alternate'], [/\bseduto\b/, 'seated'], [/\bin piedi\b/, 'standing'], [/\bsdraiato\b/, 'lying'], [/\bmilitary\b/, 'military press'], [/\bdip\b/, 'dips'], [/\bfrench press\b/, 'skull crusher'],
];
/* direct hits for the classic names (only when the name is just that) */
const IMP_ALIAS = {
  'panca': 'Barbell_Bench_Press_-_Medium_Grip', 'panca piana': 'Barbell_Bench_Press_-_Medium_Grip', 'bench press': 'Barbell_Bench_Press_-_Medium_Grip', 'panca inclinata': 'Barbell_Incline_Bench_Press_-_Medium_Grip',
  'squat': 'Barbell_Squat', 'back squat': 'Barbell_Squat', 'stacco': 'Barbell_Deadlift', 'stacco da terra': 'Barbell_Deadlift', 'deadlift': 'Barbell_Deadlift', 'rdl': 'Romanian_Deadlift', 'stacco rumeno': 'Romanian_Deadlift',
  'military': 'Standing_Military_Press', 'military press': 'Standing_Military_Press', 'lento avanti': 'Standing_Military_Press', 'seal row': 'x_chest_supported_row',
  'pull up': 'Pullups', 'pullup': 'Pullups', 'trazioni': 'Pullups', 'dip': 'Dips_-_Chest_Version', 'dips': 'Dips_-_Chest_Version', 'push up': 'Pushups', 'pushup': 'Pushups', 'piegamenti': 'Pushups',
  'push down': 'Triceps_Pushdown', 'pushdown': 'Triceps_Pushdown', 'pulley': 'Seated_Cable_Rows', 'lat machine': 'Wide-Grip_Lat_Pulldown', 'face pull': 'Face_Pull', 'leg extension': 'Leg_Extensions',
  'leg curl': 'Lying_Leg_Curls', 'ghd hyperextension': 'Hyperextensions_Back_Extensions', 'hyperextension': 'Hyperextensions_Back_Extensions', 'iperestensioni': 'Hyperextensions_Back_Extensions',
  'curl alternato manubri': 'Dumbbell_Alternate_Bicep_Curl', 'curl alternato': 'Dumbbell_Alternate_Bicep_Curl', 'curl manubri': 'Dumbbell_Bicep_Curl', 'alzate laterali': 'Side_Lateral_Raise', 'alzate laterali manubri': 'Side_Lateral_Raise',
  'curl panca inclinata': 'Incline_Dumbbell_Curl', 'curl panca inclinata manubri': 'Incline_Dumbbell_Curl', 'french press': 'EZ-Bar_Skullcrusher', 'hip thrust': 'Barbell_Hip_Thrust', 'roll out': 'Ab_Roller', 'rollout': 'Ab_Roller', 'leg press': 'Leg_Press', 'pressa': 'Leg_Press', 'hack squat': 'Hack_Squat',
};
const IMP_MOVES = ['curl', 'press', 'row', 'fly', 'raise', 'squat', 'deadlift', 'pulldown', 'pushdown', 'extension', 'lunge', 'dips', 'pullups', 'crunch', 'thrust', 'shrug', 'pullover', 'kickback', 'plank'];
const IMP_GENERIC = new Set(['with', 'the', 'and', 'grip', 'medium', 'version', 'attachment', 'barbell', 'dumbbell', 'cable', 'machine', 'standing', 'seated', 'from', 'one', 'two', 'arm']);
const IMP_NOISE = /\b(gara|fermo|fermi|tut|ecc|eccentrica|con|tempo|paralimpica|bil|x\d*|\d+"?|\d+|di|da|la|il|lo|al|alla|e|a)\b/g;
function impClean(raw) {
  let s = norm(raw).replace(/[.'’()\/\-_,]/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.split(' ').map(w => IMP_ABBR[w] ?? w).join(' ').replace(/\s+/g, ' ').trim();
  return s;
}
function matchExercise(raw) {
  const clean = impClean(raw), core = clean.replace(IMP_NOISE, ' ').replace(/\s+/g, ' ').trim();
  const all = allExercises();
  const byId = id => all.find(x => x.id === id);
  if (IMP_ALIAS[core] && byId(IMP_ALIAS[core])) return { id: IMP_ALIAS[core], conf: 1 };
  // exact name (en or it)
  for (const x of all) { if (norm(x.en || '') === norm(raw) || norm(x.it || '') === norm(raw) || norm(x.n) === norm(raw)) return { id: x.id, conf: 1 }; }
  let en = ' ' + core + ' '; for (const [re, rep] of IMP_IT_EN) en = en.replace(re, rep);
  const toks = [...new Set((core + ' ' + en).split(/\s+/).filter(w => w.length > 1))];
  if (!toks.length) return { id: null, conf: 0 };
  const firstMove = en.split(/\s+/).find(w => IMP_MOVES.some(mv => w.startsWith(mv)));
  const qMoves = firstMove ? [IMP_MOVES.find(mv => firstMove.startsWith(mv))] : [];
  const stem = w => w.length > 5 ? w.slice(0, w.length - 2) : w;
  let best = null, bs = -99, second = -99;
  for (const x of all) {
    if (x.c === 'stretching') continue;
    const t = x._s || (x._s = searchText(x)), nameT = norm((x.en || x.n) + ' ' + (x.it || ''));
    let sc = 0;
    for (const w of toks) { if (new RegExp('\\b' + stem(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(nameT)) sc += w.length > 3 ? 2 : 1.2; else if (t.includes(w)) sc += 0.5; }
    if (!sc) continue;
    const enW = norm(x.en || x.n).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !IMP_GENERIC.has(w));
    sc -= enW.filter(w => !toks.some(q => w.startsWith(stem(q)) || q.startsWith(stem(w)))).length * 0.45;
    for (const mv of qMoves) if (!new RegExp('\\b' + mv).test(nameT)) sc -= 4;
    sc += (POP_RANK.has(x.id) ? 1.2 : 0) + (x.id.startsWith('x_') ? 0.4 : 0);
    if (sc > bs) { second = bs; bs = sc; best = x; } else if (sc > second) second = sc;
  }
  if (!best || bs <= 0) return { id: null, conf: 0 };
  let conf = clamp((bs - Math.max(0, second)) / 2 + bs / (toks.length * 2.4), 0, 1);
  // words of the original name that the match does not explain lower the confidence
  const bn = norm((best.en || best.n) + ' ' + (best.it || '')), rawW = core.split(' ').filter(w => w.length > 2);
  const enOf = w => { let e = ' ' + w + ' '; for (const [re, rp] of IMP_IT_EN) e = e.replace(re, rp); return e.trim().split(/\s+/); };
  const miss = rawW.filter(w => ![w, ...enOf(w)].some(v => new RegExp('\\b' + stem(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(bn))).length;
  if (rawW.length) conf *= 1 - (miss / rawW.length) * 0.8;
  return { id: best.id, conf: Math.round(conf * 100) / 100 };
}

/* ---------- reps / sets parsing ---------- */
function impNum(v) { const n = num(String(v ?? '').replace(/[^\d.,]/g, '')); return n != null && n > 0 ? n : null; }
function parseReps(str, sets) {
  const s = String(str ?? '').trim(), out = { plan: null, note: '' };
  if (!s) return out;
  if (/^max/i.test(s)) { out.plan = [...Array(sets || 1)].map(() => ({ t: 'n', a: null, b: null })); out.note = 'Ripetizioni: massime'; return out; }
  // "7 @70%, 5 @75%, 3 @80 X2"
  if (/@/.test(s)) {
    const items = [...s.matchAll(/(\d+)\s*@\s*(\d+)/g)].map(m => +m[1]);
    const rep = +(/x\s*(\d+)\s*$/i.exec(s) || [])[1] || 1;
    if (items.length) { out.plan = []; for (let k = 0; k < rep; k++) for (const r of items) out.plan.push({ t: 'n', a: r, b: null }); out.note = s; return out; }
  }
  const sx = /^(\d+)\s*[x×]\s*(\d+)(?:\s*[-–]\s*(\d+))?/.exec(s);
  if (sx) { const n = +sx[1]; out.plan = [...Array(n)].map(() => ({ t: 'n', a: +sx[2], b: sx[3] ? +sx[3] : null })); return out; }
  const nums = s.split(/[-–\/,;]+/).map(x => impNum(x)).filter(x => x != null);
  if (nums.length === 1) { out.plan = [...Array(sets || 3)].map(() => ({ t: 'n', a: nums[0], b: null })); return out; }
  if (nums.length === 2 && (!sets || sets !== 2 || /[-–]/.test(s))) {
    if (sets && sets === 2 && /\//.test(s)) { out.plan = nums.map(a => ({ t: 'n', a, b: null })); return out; }
    const [a, b] = nums[0] <= nums[1] ? nums : [nums[1], nums[0]];
    if (nums[0] > nums[1] && sets === 2) { out.plan = nums.map(a => ({ t: 'n', a, b: null })); return out; }
    out.plan = [...Array(sets || 3)].map(() => ({ t: 'n', a, b })); return out;
  }
  if (nums.length >= 2) { out.plan = nums.map(a => ({ t: 'n', a, b: null })); while (sets && out.plan.length < sets) out.plan.push({ ...out.plan[out.plan.length - 1] }); return out; }
  out.note = s; return out;
}
function niceCase(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''; }
function rirTag(v) { const n = Math.round(num(v)); return n == null || isNaN(n) ? null : n <= 0 ? 'RIR 0 (cedimento)' : 'RIR ' + Math.min(n, 3); }

/* ---------- table parser (Excel / CSV of a coach) ---------- */
const DAY_RE = /^(day|giorno|g|seduta|allenamento|workout|scheda|sessione|session)\s*\.?\s*[a-z0-9]{1,3}\b/i;
function parseTable(rows) {
  const res = { name: '', days: [], notes: [] };
  let cols = null, day = null, weeks = null, lift = '';
  const newDay = n => { day = { name: n, ex: [] }; res.days.push(day); };
  for (const r0 of rows) {
    const r = r0.map(c => String(c ?? '').replace(/\s+/g, ' ').trim()), ne = r.filter(Boolean);
    if (!ne.length) continue;
    const first = ne[0];
    const wk = r.map((c, i) => /^(week|settimana|sett)\s*\d+/i.test(c) ? i : -1).filter(i => i >= 0);
    if (wk.length >= 2) { weeks = wk; continue; }
    if (weeks) {
      if (ne.length === 1) { lift = first; continue; }
      const parts = weeks.map(i => r[i] ? `${r[weeks[0]] ? '' : ''}${rows[0] ? '' : ''}S${weeks.indexOf(i) + 2}: ${r[i]}` : '').filter(Boolean);
      res.notes.push(`${lift ? lift + ' · ' : ''}${niceCase(first)} → ${parts.join(' | ')}`); continue;
    }
    const isHead = r.some(c => /^esercizi|^exercise/i.test(c)) && r.some(c => /^(set|serie|rep|rip)/i.test(c));
    if (isHead) {
      cols = { name: r.findIndex(c => /^esercizi|^exercise/i.test(c)) };
      r.forEach((c, i) => { if (/^(set|serie)/i.test(c)) cols.sets = i; else if (/^(rep|rip)/i.test(c)) cols.reps = i; else if (/^(mode|modalit|tecnica|esecuz|tempo)/i.test(c)) cols.mode = i; else if (/^rir|^rpe/i.test(c)) { cols.rir = i; cols.rpe = /^rpe/i.test(c); } else if (/^(rm|%|carico|intens|peso|kg)/i.test(c)) { cols.rm = i; cols.rmKg = /^(peso|kg)/i.test(c); } else if (/^(note|nota)/i.test(c)) cols.note = i; else if (/^(rec|riposo|pausa|rest)/i.test(c)) cols.rest = i; });
      if (!day) newDay('Giorno 1');
      continue;
    }
    if (ne.length === 1 && (DAY_RE.test(first) || !cols)) {
      if (!res.name && !DAY_RE.test(first)) res.name = first; else newDay(first);
      continue;
    }
    if (!cols) continue;
    const name = r[cols.name] || first; if (!name || /^(esercizi|totale)/i.test(name)) continue;
    if (!day) newDay('Giorno 1');
    const prev = day.ex[day.ex.length - 1];
    let sets = impNum(r[cols.sets]);
    const noteRaw = cols.note != null ? r[cols.note] : '';
    if (!sets && prev && prev.ss) sets = prev.plan.length;
    let { plan, note } = parseReps(cols.reps != null ? r[cols.reps] : '', sets);
    if (!plan) plan = [...Array(sets || 3)].map(() => ({ t: 'n', a: prev && prev.ss && !r[cols.reps] ? null : null, b: null }));
    const tags = [];
    if (cols.mode != null && r[cols.mode]) tags.push(niceCase(r[cols.mode]).slice(0, 30));
    if (cols.rir != null && r[cols.rir] !== '') { const v = num(r[cols.rir]); const t = cols.rpe ? rirTag(10 - v) : rirTag(v); if (t) tags.push(t); }
    const notes = [];
    if (note) notes.push(note);
    if (cols.rm != null && r[cols.rm] !== '') { const v = num(r[cols.rm]); if (v != null) notes.push(cols.rmKg ? `${fmtN(v, 1)} kg` : `${fmtN(v <= 1.5 ? v * 100 : v, 0)}% del massimale`); }
    const ss = /jump|super|biserie|ss\b|circuit/i.test(noteRaw);
    if (noteRaw && !ss) notes.push(noteRaw);
    if (cols.rest != null && r[cols.rest]) notes.push('Recupero ' + r[cols.rest]);
    const m = matchExercise(name);
    day.ex.push({ raw: name, id: m.id, conf: m.conf, plan, ss, tags, note: notes.join(' · ') });
  }
  if (!res.name) res.name = 'Scheda importata';
  res.days = res.days.filter(d => d.ex.length);
  return res;
}

/* ---------- plain text parser (Lyfta, notes, chat) ---------- */
const SET_RE = /(\d+)\s*(?:sets?|serie|series)?\s*[x×*]\s*([\d][\d\s\-–\/,]*|max)\s*(?:reps?|rip\w*)?|(\d+)\s*(?:sets?|serie)\s*(?:da|of|x|×)?\s*([\d][\d\s\-–\/,]*|max)\s*(?:reps?|rip\w*)?/i;
function parseText(text) {
  const res = { name: '', days: [], notes: [] };
  const lines = String(text || '').replace(/\r/g, '').split('\n').map(l => l.replace(/^[\s•·\-–*\d]+[.)]\s+/, '').replace(/^[•·*\-–]\s*/, '').trim()).filter(Boolean);
  let day = null, pending = null;
  const newDay = n => { day = { name: n, ex: [] }; res.days.push(day); };
  const push = (name, plan, extra = {}) => { if (!day) newDay(res.name ? 'Giorno 1' : 'Scheda'); const m = matchExercise(name); day.ex.push({ raw: name, id: m.id, conf: m.conf, plan, ss: false, tags: extra.tags || [], note: extra.note || '' }); };
  const planFrom = (sets, reps) => { const p = parseReps(reps, sets).plan; return p && p.length ? (sets && p.length !== sets && !/[-–\/,]{1}.*[-–\/,]/.test(reps) ? [...Array(sets)].map(() => ({ ...p[0] })) : p) : [...Array(sets || 3)].map(() => ({ t: 'n', a: null, b: null })); };
  const extras = l => { const tags = [], notes = []; const rir = /rir\s*(\d)/i.exec(l); if (rir) tags.push(rirTag(rir[1])); const pc = /@\s*(\d+)\s*%/.exec(l); if (pc) notes.push(`${pc[1]}% del massimale`); const rec = /(rec\w*|riposo|rest)\s*:?\s*([\d'"’:,.]+\s*(?:s|sec|min|')?)/i.exec(l); if (rec) notes.push('Recupero ' + rec[2].trim()); return { tags, note: notes.join(' · ') }; };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i], m = SET_RE.exec(l);
    if (m) {
      const sets = +(m[1] || m[3]), reps = (m[2] || m[4] || '').trim();
      const before = l.slice(0, m.index).replace(/[:\-–|,]+\s*$/, '').trim();
      if (before && /[a-zà-ú]{3}/i.test(before)) { push(before, planFrom(sets, reps), extras(l)); pending = null; }
      else if (pending) { push(pending, planFrom(sets, reps), extras(l)); pending = null; }
      continue;
    }
    if (DAY_RE.test(l) || /:$/.test(l)) { if (pending) { push(pending, planFrom(3, '')); pending = null; } newDay(l.replace(/:$/, '')); continue; }
    if (/^(lyfta|scarica|download|esercizi|exercises|\d+\s*esercizi|\d+\s*exercises|creat|by )/i.test(l)) continue;
    if (pending) {
      // two names in a row: the first was a day title (if no exercise yet in this day) or an exercise without scheme
      if (!day || day.ex.length || res.days.length) { if (!day || day.ex.length) newDay(pending); else { if (!res.name) res.name = day.name; day.name = pending; } }
      else if (!res.name) res.name = pending;
    }
    pending = l;
  }
  if (pending) { if (res.days.length || day) push(pending, planFrom(3, '')); }
  if (!res.name) res.name = res.days.length > 1 ? 'Programma importato' : (res.days[0]?.name || 'Scheda importata');
  res.days = res.days.filter(d => d.ex.length);
  return res;
}

/* ---------- AI (any format: photo, PDF, strange tables) ---------- */
const IMP_AI_SCHEMA = `{"name":"nome programma","days":[{"name":"nome giorno","exercises":[{"name":"nome esercizio come scritto","sets":[{"type":"n|w|ts|bo|d|f","reps":8,"max":10}],"superset_with_next":false,"technique":"es. fermo 1s, eccentrica 3s","rir":1,"note":"% massimale, recupero, altre indicazioni"}]}],"notes":["periodizzazione settimanale o note generali"]}`;
function impAiPrompt(content) {
  return `Converti questa scheda di allenamento in JSON per l'app Forgia. Rispondi SOLO con il JSON, senza testo prima o dopo.
Schema: ${IMP_AI_SCHEMA}
Regole: una voce "sets" per ogni serie (type: n normale, w riscaldamento, ts top set, bo back-off, d drop set, f cedimento). "max" = null se le ripetizioni sono secche. Ripetizioni diverse per serie (es. 12-10-8) = una voce per serie. Jump set / superserie / biserie: superset_with_next=true sul primo dei due. RIR o RPE in "rir" (RPE 9 = RIR 1). Percentuali, chili, recuperi e varianti in "note". Tabelle con le settimane (week 2, 3...) in "notes". Nomi degli esercizi come scritti nella scheda.
${content ? 'Scheda:\n' + content : 'La scheda è nell\'immagine/file allegato.'}`;
}
function fromAiJson(j) {
  const res = { name: j.name || 'Scheda importata', days: [], notes: (j.notes || []).map(String) };
  for (const d of j.days || []) {
    const day = { name: d.name || 'Giorno ' + (res.days.length + 1), ex: [] };
    for (const e of d.exercises || []) {
      const m = matchExercise(e.name || '');
      const plan = (e.sets || []).map(s => ({ t: SET_TYPES[s.type] ? s.type : 'n', a: impNum(s.reps), b: impNum(s.max) && impNum(s.max) !== impNum(s.reps) ? impNum(s.max) : null }));
      const tags = []; if (e.technique) tags.push(niceCase(e.technique).slice(0, 30)); const rt = e.rir != null ? rirTag(e.rir) : null; if (rt) tags.push(rt);
      day.ex.push({ raw: e.name || '?', id: m.id, conf: m.conf, plan: plan.length ? plan : [{ t: 'n', a: null, b: null }], ss: !!e.superset_with_next, tags, note: e.note || '' });
    }
    if (day.ex.length) res.days.push(day);
  }
  return res;
}
function rowsToText(rows) { return rows.map(r => r.filter(c => String(c).trim()).join(' | ')).filter(Boolean).join('\n'); }
function fileToB64(file) { return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(file); }); }

/* ---------- UI ---------- */
function impInput() { let f = $('#impFile'); if (!f) { f = document.createElement('input'); f.type = 'file'; f.id = 'impFile'; f.hidden = true; f.accept = '.xlsx,.csv,.txt,.tsv,.json,application/json,image/*,application/pdf'; document.body.appendChild(f); } return f; }
function layerImport(l, i) {
  if (l.step === 'review') return layerImportReview(l, i);
  const ai = aiReady();
  return `<div class="layer">${head('Importa scheda')}<div class="layer-body" data-scroll-key="im${i}"><div class="layer-inner">
    <div class="small muted">Le schede importate finiscono in una <b>cartella nuova</b>. Prima di salvare controlli gli esercizi abbinati e puoi cambiarli.</div>
    <div class="list">
      <button class="li" data-a="impPick" data-k="file">${icon('upload')}<div class="grow"><div class="t">File</div><div class="s">Excel o CSV del PT, o file di Forgia (.json)</div></div>${icon('chev', 18)}</button>
      <button class="li" data-a="impMode" data-k="text">${icon('edit')}<div class="grow"><div class="t">Incolla testo</div><div class="s">Da Lyfta, note, WhatsApp: "Panca 4x8-10", "Squat 5x5"…</div></div>${icon('chev', 18)}</button>
      <button class="li" data-a="impMode" data-k="ai">${icon('sparkle')}<div class="grow"><div class="t">Con l'AI</div><div class="s">Foto, PDF o schede complicate${ai ? '' : ' · gratis copiando per Claude'}</div></div>${icon('chev', 18)}</button>
    </div>
    ${l.mode === 'text' ? `<div class="card"><div class="lbl">Incolla la scheda</div><textarea id="imp-text" class="input" data-free="1" rows="10" placeholder="PETTO 1&#10;Panca inclinata 4x6-8&#10;Croci ai cavi 3x12&#10;&#10;SCHIENA 1&#10;Trazioni 4x8">${esc(l.text || '')}</textarea>
      <div class="small faint">Da Lyfta: apri il link, seleziona la scheda e copia, oppure scrivila tu. Un giorno per blocco, con il nome in cima.</div>
      <button class="btn primary" data-a="impParseText">Leggi la scheda</button></div>` : ''}
    ${l.mode === 'ai' ? `<div class="card"><div class="lbl">Con l'AI</div>
      ${ai ? `<button class="btn" data-a="impPick" data-k="ai">${icon('camera', 16)} Foto o PDF della scheda</button><div class="small faint">Oppure incolla il testo qui sotto e premi "Analizza".</div>` : `<div class="small muted">Senza chiave API: copia il messaggio, incollalo in una chat con Claude insieme alla foto/al file della scheda, poi incolla qui la risposta.</div>`}
      <textarea id="imp-text" class="input" data-free="1" rows="6" placeholder="${ai ? 'Testo della scheda (facoltativo se carichi una foto)' : 'Testo della scheda (facoltativo)'}">${esc(l.text || '')}</textarea>
      ${ai ? `<button class="btn primary" data-a="impAiRun" ${l.busy ? 'disabled' : ''}>${l.busy ? 'Analizzo…' : icon('sparkle', 16) + ' Analizza'}</button>` : `<button class="btn" data-a="impAiCopy">${icon('copy', 16)} 1 · Copia il messaggio per Claude</button>
      <textarea id="imp-json" class="input" data-free="1" rows="5" placeholder="2 · Incolla qui la risposta di Claude (il JSON)"></textarea><button class="btn primary" data-a="impAiPaste">3 · Leggi la risposta</button>`}
      ${l.err ? `<div class="small" style="color:var(--bad)">${esc(l.err)}</div>` : ''}</div>` : ''}
    ${l.err && l.mode !== 'ai' ? `<div class="card tight small" style="color:var(--bad)">${esc(l.err)}</div>` : ''}
  </div></div></div>`;
}
function layerImportReview(l, i) {
  const r = l.res, nEx = r.days.reduce((a, d) => a + d.ex.length, 0), unk = r.days.reduce((a, d) => a + d.ex.filter(e => !e.id || e.conf < 0.5).length, 0);
  return `<div class="layer">${head('Controlla', 'back', `<button class="btn primary sm" data-a="impSave">Importa</button>`)}<div class="layer-body" data-scroll-key="ir${i}"><div class="layer-inner">
    <div class="field"><label>Nome della cartella</label><input class="input" data-in="impName" value="${esc(r.name)}" maxlength="40"></div>
    <div class="small muted">${r.days.length} ${r.days.length === 1 ? 'scheda' : 'schede'} · ${nEx} esercizi${unk ? ` · <b style="color:var(--gold)">${unk} da verificare</b>` : ''}. Tocca un esercizio per cambiarlo.</div>
    ${r.days.map((d, di) => `<div class="card"><input class="input" data-in="impDay" data-di="${di}" value="${esc(d.name)}" maxlength="40" style="font-weight:700">
      ${d.ex.map((e, ei) => { const x = e.id ? ex(e.id) : null, low = !x || e.conf < 0.5; return `<div class="imp-ex ${e.ss ? 'ss' : ''}">
        <button class="row grow" data-a="impReplace" data-di="${di}" data-ei="${ei}" style="text-align:left;min-width:0">${x ? thumbHTML(x) : `<span class="thumb">?</span>`}<div class="grow" style="min-width:0"><div class="t" style="font-weight:700;${low ? 'color:var(--gold)' : ''}">${x ? esc(x.n) : 'Non trovato: tocca per scegliere'}</div><div class="small muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">da "${esc(e.raw)}" · ${planSummary(e.plan)}${e.ss ? ' · superserie con il successivo' : ''}</div>${e.tags.length || e.note ? `<div class="small" style="color:var(--steel)">${esc([...e.tags, e.note].filter(Boolean).join(' · '))}</div>` : ''}</div>${low ? `<span class="chip gold">verifica</span>` : ''}</button>
        <button class="icon-btn" data-a="impDel" data-di="${di}" data-ei="${ei}" aria-label="Togli">${icon('x', 16)}</button></div>`; }).join('')}</div>`).join('')}
    ${r.notes.length ? `<div class="card"><div class="lbl">Note del programma</div><div class="small" style="white-space:pre-wrap;line-height:1.5">${esc(r.notes.join('\n'))}</div><div class="small faint">Le salvo come nota nelle schede, così le vedi durante l'allenamento.</div></div>` : ''}
    <button class="btn primary block" data-a="impSave">Importa ${r.days.length} ${r.days.length === 1 ? 'scheda' : 'schede'}</button>
  </div></div></div>`;
}
function impShow(l, res) {
  if (!res.days.length) { l.err = 'Non ho trovato esercizi. Prova con "Con l\'AI" oppure controlla il formato.'; renderLayers(); return; }
  l.res = res; l.step = 'review'; l.err = ''; renderLayers();
}
async function impHandleFile(file) {
  const l = UI.layers.find(x => x.type === 'import'); if (!l) return;
  const nm = file.name.toLowerCase();
  try {
    if (l.fileFor === 'ai' || /^image\//.test(file.type) || file.type === 'application/pdf') {
      if (!S.ai?.key) { l.mode = 'ai'; l.err = 'Per leggere foto e PDF dentro l\'app serve la chiave API (Profilo → Coach AI). In alternativa usa "Copia il messaggio per Claude".'; renderLayers(); return; }
      l.busy = true; l.mode = 'ai'; renderLayers();
      const b64 = await fileToB64(file), isPdf = file.type === 'application/pdf';
      const content = [{ type: isPdf ? 'document' : 'image', source: { type: 'base64', media_type: isPdf ? 'application/pdf' : (file.type || 'image/jpeg'), data: b64 } }, { type: 'text', text: impAiPrompt('') }];
      const j = await aiAsk(content, { json: true, maxTokens: 4000 });
      l.busy = false; impShow(l, fromAiJson(j)); return;
    }
    if (nm.endsWith('.json') || nm.endsWith('.txt') || file.type === 'application/json') {
      const t = (await file.text()).trim();
      if (/^[\[{]/.test(t) && /"days"\s*:/.test(t)) { impShow(l, fromAiJson(JSON.parse(t.match(/[\[{][\s\S]*[\]}]/)[0]))); return; }
      if (nm.endsWith('.json')) { l.err = 'Il file JSON non contiene una scheda di Forgia.'; renderLayers(); return; }
    }
    if (nm.endsWith('.xls')) { l.err = 'Il vecchio formato .xls non è supportato: in Excel o Numbers salvalo come .xlsx o .csv.'; renderLayers(); return; }
    const rows = nm.endsWith('.xlsx') ? await readXlsx(await file.arrayBuffer()) : readCsv(await file.text());
    l.rowsText = rowsToText(rows);
    let res = parseTable(rows);
    if (!res.days.length) res = parseText(l.rowsText);
    impShow(l, res);
  } catch (e) { l.busy = false; l.err = e && e.code ? aiErr(e) : 'Non riesco a leggere il file. Prova a salvarlo come .xlsx o .csv, oppure usa "Con l\'AI".'; renderLayers(); }
}
document.addEventListener('change', ev => { const el = ev.target; if (el.id !== 'impFile' || !el.files || !el.files[0]) return; const f = el.files[0]; el.value = ''; impHandleFile(f); });
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.in, l = topLayer(); if (!k || !l || l.type !== 'import' || !l.res) return;
  if (k === 'impName') l.res.name = el.value;
  if (k === 'impDay') l.res.days[+el.dataset.di].name = el.value;
});

Object.assign(LAYER_RENDER, { import: layerImport });
Object.assign(A, {
  importOpen() { pushLayer({ type: 'import', step: 'src', mode: null }); },
  impMode(el) { const l = topLayer(); l.text = $('#imp-text')?.value || l.text; l.mode = el.dataset.k; l.err = ''; renderLayers(); },
  impPick(el) { const l = topLayer(); l.fileFor = el.dataset.k; impInput().accept = el.dataset.k === 'ai' ? 'image/*,application/pdf' : '.xlsx,.csv,.txt,.tsv,.json,application/json'; impInput().click(); },
  impParseText() { const l = topLayer(); l.text = $('#imp-text')?.value || ''; if (!l.text.trim()) return toast('Incolla prima la scheda'); impShow(l, parseText(l.text)); },
  async impAiRun() {
    const l = topLayer(); l.text = $('#imp-text')?.value || ''; if (!l.text.trim()) return toast('Incolla il testo o carica una foto');
    l.busy = true; l.err = ''; renderLayers();
    try { const j = await aiAsk(impAiPrompt(l.text), { json: true, maxTokens: 4000 }); l.busy = false; impShow(l, fromAiJson(j)); }
    catch (e) { l.busy = false; l.err = aiErr(e); renderLayers(); }
  },
  impAiCopy() {
    const l = topLayer(); l.text = $('#imp-text')?.value || '';
    const t = impAiPrompt(l.text.trim() || l.rowsText || '');
    try { navigator.clipboard.writeText(t).then(() => toast('Copiato: incollalo in Claude con la foto della scheda'), () => toast('Copia non riuscita')); } catch (e) { toast('Copia non riuscita'); }
  },
  impAiPaste() {
    const l = topLayer(), raw = $('#imp-json')?.value || '';
    try { const m = raw.match(/[\[{][\s\S]*[\]}]/); impShow(l, fromAiJson(JSON.parse(m[0]))); }
    catch (e) { l.err = 'Non riesco a leggere la risposta: copia tutto il blocco JSON di Claude.'; renderLayers(); }
  },
  impReplace(el) { pushLayer({ type: 'picker', mode: 'replace', target: 'import', di: +el.dataset.di, ei: +el.dataset.ei, q: (() => { const l = UI.layers.find(x => x.type === 'import'); return l ? impClean(l.res.days[+el.dataset.di].ex[+el.dataset.ei].raw).replace(IMP_NOISE, ' ').replace(/\s+/g, ' ').trim() : ''; })(), g: '', eq: '', sel: [] }); },
  impDel(el) { const l = topLayer(); const d = l.res.days[+el.dataset.di]; d.ex.splice(+el.dataset.ei, 1); renderLayers(); },
  impSave() {
    const l = UI.layers.find(x => x.type === 'import'); if (!l || !l.res) return;
    const r = l.res, miss = r.days.reduce((a, d) => a + d.ex.filter(e => !e.id).length, 0);
    if (miss) { toast(`${miss} esercizi non abbinati: toccali per sceglierli o toglili`); return; }
    const f = { id: uid(), name: (r.name || 'Scheda importata').slice(0, 40), img: null, c: FOLDER_COLORS[folders().length % FOLDER_COLORS.length] }; folders().push(f);
    const allNote = r.notes.join('\n');
    for (const d of r.days) {
      const exs = d.ex.map((e, i) => {
        const x = ex(e.id), iso = x && x.k === 'isolation', w = e.plan.filter(p => p.t !== 'w'), w0 = w[0] || e.plan[0] || {};
        const relevant = r.notes.filter(n => impClean(n).split(' ').some(t => t.length > 3 && impClean(e.raw).split(' ').includes(t)));
        const o = { id: e.id, sets: w.length || e.plan.length, rmin: w0.a ?? 8, rmax: w0.b ?? w0.a ?? 12, rest: e.rest || (iso ? 90 : 150), ss: !!e.ss && i < d.ex.length - 1, tags: e.tags.length ? e.tags : undefined, plan: e.plan.map(p => { const q = { t: p.t || 'n', a: p.a ?? null, b: p.b ?? null }; if (p.pct) q.pct = p.pct; if (p.rm) q.rm = p.rm; return q; }), note: [e.note, ...relevant].filter(Boolean).join(' · ').slice(0, 400) || undefined };
        if (e.prog) o.prog = e.prog; if (e.warm) o.warm = true; return o;
      });
      S.routines.push({ id: uid(), name: d.name.slice(0, 40), note: allNote.slice(0, 1000), ex: exs, fid: f.id });
    }
    UI.fopen = UI.fopen || {}; UI.fopen[f.id] = true;
    save(); UI.layers = UI.layers.filter(x => x.type !== 'import'); UI.tab = 'train'; render(); renderLayers();
    toast(`${r.days.length} ${r.days.length === 1 ? 'scheda importata' : 'schede importate'} in “${esc(f.name)}”`);
  },
});
