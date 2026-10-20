/* =========================================================
   DIETA — Fase 2
   ========================================================= */
const MEALS = [
  { k: 'b', n: 'Colazione' }, { k: 'l', n: 'Pranzo' }, { k: 'd', n: 'Cena' }, { k: 's', n: 'Snack' }, { k: 'o', n: 'Altro' },
];
const MEAL_N = Object.fromEntries(MEALS.map(m => [m.k, m.n])); MEAL_N.x = 'Integratori';
const MEAL_COL = { b: '#ffb547', l: '#ff6b2c', d: '#7fb2e5', s: '#3ddc97', o: '#8b95a4', x: '#b48cff' };
function mealOpen(k) { const o = S.profile.mealOpen || {}; return o[k] !== false; }
const NK = [...MICRO_KEYS, 'sugF', 'sugM', 'crea'];
const NUT_LABEL = { kcal: 'Calorie', p: 'Proteine', c: 'Carboidrati', f: 'Grassi', fib: 'Fibre', sug: 'Zuccheri', sat: 'Grassi saturi', salt: 'Sale' };
const ACT = [
  { k: 1.2, l: 'Sedentario', d: 'Pochi passi, giornata seduta' },
  { k: 1.375, l: 'Leggero', d: '~5–7k passi + 2–3 allenamenti' },
  { k: 1.55, l: 'Moderato', d: '~7–10k passi + 3–5 allenamenti' },
  { k: 1.725, l: 'Alto', d: '10k+ passi + 5–6 allenamenti' },
];
const RATES = [
  { v: -0.75, l: 'Definizione veloce', d: '−0,75 kg/sett.' }, { v: -0.5, l: 'Definizione', d: '−0,5 kg/sett.' },
  { v: -0.25, l: 'Definizione lenta', d: '−0,25 kg/sett.' }, { v: 0, l: 'Mantenimento', d: 'peso stabile' },
  { v: 0.25, l: 'Massa pulita', d: '+0,25 kg/sett.' }, { v: 0.5, l: 'Massa', d: '+0,5 kg/sett.' },
];

/* ---------- food index ---------- */
const BASE_FOODS = new Map();
function perFrom(arr) { const o = {}; MICRO_KEYS.forEach((k, i) => { o[k] = arr[i] == null ? null : arr[i]; }); return o; }
for (const r of BASE_FOOD_ROWS) {
  const up = BASE_UPGRADE[r[0]];
  const per = up ? perFrom(up.slice(1)) : { kcal: r[2], p: r[3], c: r[4], f: r[5], fib: r[6], sug: r[7], sat: r[8], salt: r[9] };
  BASE_FOODS.set(r[0], { id: r[0], n: r[1], brand: '', per, serv: r[10] ? { g: r[10], l: r[11] } : null, src: 'base', a: r[12] || '', cat: (up && up[0]) || BASE_CAT[r[0]] || '' });
}
for (const r of CIQ_FOODS) {
  BASE_FOODS.set(r[0], { id: r[0], n: r[1], brand: '', cat: r[2], serv: r[3] ? { g: r[3], l: r[4] } : null, a: r[5] || '', per: perFrom(r.slice(6)), src: 'base' });
}
/* supplements: values for ONE unit (g = weight of the unit), stored per 100 g like every food */
const SUPPLEMENTS = [
  ['s_multi', 'Multivitaminico', 1, '1 compressa', { vita: 400, vitc: 80, vitd: 5, vite: 12, b6: 1.4, b9: 200, b12: 2.5, fe: 7, zn: 5, mg: 56, ca: 120, se: 27.5 }],
  ['s_d1000', 'Vitamina D3 1000 UI', 1, '1 compressa/goccia', { vitd: 25 }],
  ['s_d2000', 'Vitamina D3 2000 UI', 1, '1 compressa', { vitd: 50 }],
  ['s_omega3', 'Omega-3 (olio di pesce 1 g)', 1, '1 capsula', { om3: 0.3, f: 1, kcal: 9 }],
  ['s_omega3x', 'Omega-3 concentrato (600 mg EPA+DHA)', 1, '1 capsula', { om3: 0.6, f: 1, kcal: 9 }],
  ['s_mg', 'Magnesio 300 mg', 1, '1 dose', { mg: 300 }],
  ['s_zn', 'Zinco 10 mg', 1, '1 compressa', { zn: 10 }],
  ['s_fe', 'Ferro 14 mg', 1, '1 compressa', { fe: 14 }],
  ['s_vitc', 'Vitamina C 500 mg', 1, '1 compressa', { vitc: 500 }],
  ['s_b12', 'Vitamina B12 1000 µg', 1, '1 compressa', { b12: 1000 }],
  ['s_ca', 'Calcio 500 mg', 1, '1 compressa', { ca: 500 }],
  ['s_creatina', 'Creatina monoidrato', 5, '1 dose (5 g)', { crea: 5 }],
  ['s_creatina3', 'Creatina monoidrato (3 g)', 3, '1 dose (3 g)', { crea: 3 }],
];
for (const [id, n, g, l, vals] of SUPPLEMENTS) {
  const per = { crea: vals.crea != null ? vals.crea / g * 100 : null }; for (const k of MICRO_KEYS) per[k] = vals[k] != null ? vals[k] / g * 100 : (['kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'salt'].includes(k) ? 0 : null);
  BASE_FOODS.set(id, { id, n, brand: '', cat: 'supp', serv: { g, l }, a: 'integratore integratori supplement', per, src: 'base' });
}
/* food names in the app language: base and CIQUAL foods have English/Spanish names; search finds them in every language */
function applyFoodLang() {
  const L = lang();
  for (const f of BASE_FOODS.values()) {
    if (f.nIt == null) { f.nIt = f.n; f.aIt = f.a || ''; const t = FOOD_TR[f.id]; f.a = [f.aIt, t ? t.join(' ') : ''].join(' ').trim(); }
    const t = FOOD_TR[f.id];
    f.n = L === 'it' ? f.nIt : t ? t[L === 'en' ? 0 : 1] : tr(f.nIt);
    f._ix = null; f._s = null;
  }
}
function food(id) { return BASE_FOODS.get(id) || S.foods[id] || null; }
/* sugars: fruit (whole fruit), milk (lactose) and the rest (added/free) */
function sugarKind(f) { const c = f && f.cat; return c === 'fr' || c === 'fd' ? 'F' : c === 'dairy' ? 'M' : ''; }
function foodName(f) { return f ? f.n + (f.brand ? ' · ' + f.brand : '') : 'Alimento rimosso'; }
/* creatine: from supplements, or estimated ~0.4 g/100 g in meat and fish */
function creaPer(per, f) { return per.crea != null ? per.crea : f && f.cat === 'meat' ? 0.4 : f && f.cat === 'fish' ? 0.35 : 0; }
function nutOf(per, g, f) {
  const o = {}; for (const k of MICRO_KEYS) o[k] = (per[k] || 0) * g / 100;
  o.crea = creaPer(per, f) * g / 100;
  const sk = sugarKind(f); o.sugF = sk === 'F' ? o.sug : 0; o.sugM = sk === 'M' ? o.sug : 0;
  return o;
}
function entryNut(e) {
  if (e.q) { const o = zeroNut(); Object.assign(o, { kcal: e.q.kcal || 0, p: e.q.p || 0, c: e.q.c || 0, f: e.q.f || 0 }); return o; }
  const f = food(e.fid); return f ? nutOf(f.per, e.g, f) : zeroNut();
}
/* share of the day's kcal for which a micronutrient value is known */
function microCoverage(k, key) {
  let kn = 0, tot = 0;
  for (const e of dayEntries(k)) { const f = e.fid && food(e.fid); const kc = entryNut(e).kcal; tot += kc; if (f && f.per[key] != null) kn += kc; }
  return tot ? kn / tot : 0;
}
function entryName(e) { return e.q ? (e.q.n || 'Aggiunta rapida') : foodName(food(e.fid)); }
function addNut(a, b) { for (const k of NK) a[k] = (a[k] || 0) + (b[k] || 0); return a; }
const zeroNut = () => Object.fromEntries(NK.map(k => [k, 0]));

/* ---------- dates ---------- */
function dkey(t) { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function kdate(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); }
function day(k) { return S.diary[k] || (S.diary[k] = { e: [] }); }
function dayEntries(k) { return (S.diary[k] && S.diary[k].e) || []; }
function dayTotals(k) {
  const tot = zeroNut(), meals = {};
  for (const m of MEALS) meals[m.k] = zeroNut(); meals.x = zeroNut();
  for (const e of dayEntries(k)) { const n = entryNut(e); addNut(tot, n); addNut(meals[e.m] || meals.o, n); }
  return { tot, meals };
}
function mealByTime(t = Date.now()) { const h = new Date(t).getHours(); return h < (S.profile.dayEnd || 0) ? 'o' : h < 11 ? 'b' : h < 15 ? 'l' : h < 18 ? 's' : h < 23 ? 'd' : 'o'; }
/* the diary day can end after midnight (e.g. 03:00) so a late snack counts for the evening */
function todayKey() { return dkey(Date.now() - (S.profile.dayEnd || 0) * 3600e3); }

/* ---------- targets ---------- */
function defaultNutri() {
  return { sex: 'm', age: 22, height: 178, weight: 75, act: 1.55, rate: 0, pkg: 2.0, fkg: 0.9, cycle: true, delta: 300, trainDays: [0, 1, 3, 4], manual: false, man: { kcal: 2500, p: 160, f: 70 } };
}
function bmr(n) { return 10 * n.weight + 6.25 * n.height - 5 * n.age + (n.sex === 'm' ? 5 : -161); }
function tdeeStart(n) { return bmr(n) * n.act; }
/* saved targets follow the body log (7-day average) and, if enabled, the adaptive maintenance */
function liveNutri(n) { if (n !== S.nutri || typeof bodyWeight !== 'function') return n; const w = dietWeight(n); return w ? { ...n, weight: w } : n; }
function maintFor(n) { if (n.adapt && !n.manual && typeof adaptiveCached === 'function') { const a = adaptiveCached(); if (a.ok) return a.tdee; } return tdeeStart(liveNutri(n)); }
function baseTargets(n = S.nutri) {
  if (!n) return null;
  let kcal, p, f;
  if (n.manual) { kcal = n.man.kcal; p = n.man.p; f = n.man.f; }
  else {
    const ln = liveNutri(n);
    kcal = maintFor(n) + n.rate * 7700 / 7;
    p = n.pkg * ln.weight; f = n.fkg * ln.weight;
  }
  const c = Math.max(40, (kcal - 4 * p - 9 * f) / 4);
  return { kcal: Math.round(kcal), p: Math.round(p), c: Math.round(c), f: Math.round(f) };
}
function dayType(k) {
  const d = S.diary[k];
  if (d && d.type) return d.type;
  const t = kdate(k);
  if (S.workouts.some(w => startOfDay(w.start) === t)) return 'train';
  const wd = (new Date(t).getDay() + 6) % 7;
  return (S.nutri?.trainDays || []).includes(wd) ? 'train' : 'rest';
}
function targetsFor(k) {
  const n = S.nutri, b = baseTargets(n);
  if (!b) return null;
  let kcal = b.kcal, c = b.c;
  if (n.cycle) {
    const nt = clamp((n.trainDays || []).length, 0, 7);
    const adj = dayType(k) === 'train' ? n.delta * (7 - nt) / 7 : -n.delta * nt / 7;
    kcal += adj; c += adj / 4;
  }
  kcal = Math.round(kcal); c = Math.max(30, Math.round(c));
  return { kcal, p: b.p, c, f: b.f, fib: Math.round(kcal / 1000 * 14), sat: Math.round(kcal * 0.1 / 9), sug: Math.round(kcal * 0.1 / 4), salt: 5 };
}

/* ---------- frequent / recent ---------- */
function foodStats(days = 60) {
  const since = dkey(Date.now() - days * DAY);
  const cnt = new Map(), lastG = new Map(), lastT = new Map();
  for (const [k, d] of Object.entries(S.diary)) {
    if (k < since) continue;
    for (const e of d.e || []) {
      if (!e.fid) continue;
      cnt.set(e.fid, (cnt.get(e.fid) || 0) + 1);
      if (!lastT.has(e.fid) || e.t > lastT.get(e.fid)) { lastT.set(e.fid, e.t || 0); lastG.set(e.fid, e.g); }
    }
  }
  return { cnt, lastG, lastT };
}
function recentFoods(n = 40) { const { lastT } = foodStats(); return [...lastT.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]).filter(food); }
function frequentFoods(n = 25) { const { cnt } = foodStats(); return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]).filter(food); }

/* ---------- market basket: food combinations (closed itemsets, size 2–4) ---------- */
function foodCombos(days = 60) {
  const since = dkey(Date.now() - days * DAY);
  const baskets = [];
  for (const [k, d] of Object.entries(S.diary)) {
    if (k < since) continue;
    const by = {};
    for (const e of d.e || []) if (e.fid) (by[e.m] || (by[e.m] = new Set())).add(e.fid);
    for (const [m, set] of Object.entries(by)) if (set.size >= 2 && set.size <= 10) baskets.push({ m, items: [...set].sort() });
  }
  const single = new Map(), sets = new Map();
  const subsets = (arr, k, start = 0, pre = [], out = []) => { if (pre.length === k) { out.push(pre.join('|')); return out; } for (let i = start; i < arr.length; i++) subsets(arr, k, i + 1, [...pre, arr[i]], out); return out; };
  for (const b of baskets) {
    for (const a of b.items) single.set(a, (single.get(a) || 0) + 1);
    for (let k = 2; k <= Math.min(4, b.items.length); k++) for (const key of subsets(b.items, k)) {
      const o = sets.get(key) || { c: 0, meals: {} }; o.c++; o.meals[b.m] = (o.meals[b.m] || 0) + 1; sets.set(key, o);
    }
  }
  const N = baskets.length || 1;
  let list = [...sets.entries()].filter(([, o]) => o.c >= 2).map(([k, o]) => ({ ids: k.split('|'), c: o.c, meal: Object.entries(o.meals).sort((a, b) => b[1] - a[1])[0][0] }));
  // keep only "closed" itemsets: drop a combo if a bigger one containing it occurs just as often
  list = list.filter(x => !list.some(y => y.ids.length > x.ids.length && y.c === x.c && x.ids.every(id => y.ids.includes(id))));
  list.forEach(x => { if (x.ids.length === 2) { const [a, b] = x.ids; x.lift = (x.c / N) / ((single.get(a) / N) * (single.get(b) / N)); } });
  return { list: list.sort((a, b) => b.c - a.c || b.ids.length - a.ids.length).slice(0, 8), baskets: baskets.length };
}

/* ---------- "chiudi i macro" ---------- */
const CLOSER_BASE = ['b_pollo_cotto', 'b_tonno_nat', 'b_greco0', 'b_skyr', 'b_albume', 'b_whey', 'b_bresaola', 'b_fiocchi', 'b_riso_cotto', 'b_avena', 'b_pane', 'b_banana', 'b_gallette', 'b_patate', 'b_mandorle', 'b_olio', 'b_parmigiano', 'b_uovo', 'b_pasta_cotta', 'b_salmone'];
function macroCloser(k) {
  const T = targetsFor(k); if (!T) return [];
  const tot = dayTotals(k).tot;
  const rem = { kcal: T.kcal - tot.kcal, p: T.p - tot.p, c: T.c - tot.c, f: T.f - tot.f };
  if ((rem.kcal < 80 && rem.p < 10) || rem.kcal > 1100) return { rem, list: [] };
  const cost = r => ['p', 'c', 'f'].reduce((a, m) => { const x = r[m] / T[m]; return a + (x > 0 ? x * x : 3 * x * x); }, 0) + (r.kcal < 0 ? 4 * Math.pow(r.kcal / T.kcal, 2) : 0);
  const c0 = cost(rem);
  const freq = frequentFoods(20), freqSet = new Set(freq);
  const ids = [...new Set([...freq, ...CLOSER_BASE])];
  const res = [];
  for (const id of ids) {
    const f = food(id); if (!f || (f.per.kcal || 0) <= 0) continue;
    let best = null;
    const step = f.per.kcal > 400 ? 5 : 10, max = Math.min(f.serv ? f.serv.g * 2 : 300, 350, (rem.kcal + 40) / f.per.kcal * 100);
    for (let g = step; g <= max; g += step) {
      const n = nutOf(f.per, g);
      const r = { kcal: rem.kcal - n.kcal, p: rem.p - n.p, c: rem.c - n.c, f: rem.f - n.f };
      const cc = cost(r);
      if (!best || cc < best.cc) best = { g, cc, n };
    }
    if (best && best.cc < c0 - 0.02) res.push({ id, g: best.g, gain: c0 - best.cc, n: best.n, freq: freqSet.has(id) });
  }
  return { rem, list: res.sort((a, b) => b.gain - a.gain).slice(0, 3) };
}

/* ---------- Open Food Facts ---------- */
const OFF_FIELDS = 'code,product_name,product_name_it,product_name_es,product_name_en,brands,nutriments,serving_quantity,serving_size,categories_tags,nutriscore_grade,nova_group,countries_tags';
const OFF_MICRO = { k: ['potassium_100g', 1e3], ca: ['calcium_100g', 1e3], fe: ['iron_100g', 1e3], mg: ['magnesium_100g', 1e3], zn: ['zinc_100g', 1e3], se: ['selenium_100g', 1e6], vita: ['vitamin-a_100g', 1e6], vitd: ['vitamin-d_100g', 1e6], vite: ['vitamin-e_100g', 1e3], vitc: ['vitamin-c_100g', 1e3], b6: ['vitamin-b6_100g', 1e3], b9: ['vitamin-b9_100g', 1e6], b12: ['vitamin-b12_100g', 1e6], om3: ['omega-3-fat_100g', 1] };
function offCat(tags) {
  const t = (tags || []).join(' ');
  if (/en:fruit-juices|en:nectars|en:smoothies/.test(t)) return 'fj';
  if (/en:alcoholic-beverages|en:beers|en:wines/.test(t)) return 'alc';
  if (/en:beverages/.test(t)) return 'drink';
  if (/en:dried-fruits/.test(t)) return 'fd';
  if (/en:fresh-fruits|en:fruits(?![-\w])|en:frozen-fruits/.test(t) && !/en:sweetened|en:jams|en:compotes|en:fruits-in-syrup/.test(t)) return 'fr';
  if (/en:dairies|en:yogurts|en:milks|en:cheeses/.test(t)) return 'dairy';
  if (/en:vegetables|en:fresh-vegetables/.test(t)) return 'veg';
  if (/en:legumes/.test(t)) return 'leg';
  if (/en:nuts/.test(t)) return 'nut';
  if (/en:fats|en:vegetable-oils|en:butters/.test(t)) return 'fat';
  if (/en:meats|en:poultries|en:hams|en:sausages/.test(t)) return 'meat';
  if (/en:fishes|en:seafood/.test(t)) return 'fish';
  if (/en:sweet-snacks|en:biscuits|en:chocolates|en:confectioneries|en:desserts|en:ice-creams/.test(t)) return 'sweet';
  if (/en:cereals-and-potatoes|en:breads|en:pastas|en:breakfast-cereals/.test(t)) return 'cer';
  if (/en:sauces|en:condiments/.test(t)) return 'sauce';
  if (/en:meals|en:pizzas/.test(t)) return 'dish';
  return '';
}
const OFF_CACHE = new Map();
function pickStr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return pickStr(v[0]);
  if (typeof v === 'object') return v.it || v.es || v.en || v.main || Object.values(v)[0] || '';
  return String(v);
}
function offToFood(p) {
  if (!p || !p.code) return null;
  const nm = p.nutriments || {};
  let kcal = nm['energy-kcal_100g'];
  if (kcal == null && nm['energy_100g'] != null) kcal = nm['energy_100g'] / 4.184;
  if (kcal == null) return null;
  const n = pickStr(p.product_name_it) || pickStr(p.product_name) || pickStr(p.product_name_es) || pickStr(p.product_name_en);
  if (!n) return null;
  const brand = pickStr(p.brands).split(',')[0].trim();
  const sq = +p.serving_quantity;
  const num0 = v => { const x = parseFloat(v); return isFinite(x) ? Math.max(0, x) : 0; };
  const per = { kcal: Math.round(num0(kcal)), p: num0(nm.proteins_100g), c: num0(nm.carbohydrates_100g), f: num0(nm.fat_100g), fib: nm.fiber_100g == null ? null : num0(nm.fiber_100g), sug: num0(nm.sugars_100g), sat: num0(nm['saturated-fat_100g']), salt: num0(nm.salt_100g) };
  for (const [k, [key, mul]] of Object.entries(OFF_MICRO)) per[k] = nm[key] == null ? null : +(num0(nm[key]) * mul).toFixed(3);
  const ns = pickStr(p.nutriscore_grade).toLowerCase();
  return {
    id: 'off_' + p.code, code: String(p.code), n: n.trim(), brand, src: 'off', per, cat: offCat(p.categories_tags),
    ns: /^[a-e]$/.test(ns) ? ns.toUpperCase() : '', nova: +p.nova_group || 0,
    cc: /en:(italy|spain)/.test((p.countries_tags || []).join(' ')) ? 1 : 0,
    serv: sq > 0 && sq < 2000 ? { g: sq, l: pickStr(p.serving_size) || '1 porzione' } : null,
  };
}
async function fetchJSON(url, ms = 9000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
async function offSearch(q) {
  const key = norm(q);
  if (OFF_CACHE.has(key)) return OFF_CACHE.get(key);
  let list;
  try {
    const r = await fetchJSON(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&langs=it,es,en&page_size=30&fields=${OFF_FIELDS}`);
    list = (r.hits || []).map(offToFood).filter(Boolean);
  } catch (e) {
    const r = await fetchJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=30&fields=${OFF_FIELDS}&app_name=Forgia`, 12000);
    list = (r.products || []).map(offToFood).filter(Boolean);
  }
  const seen = new Set(); list = list.filter(f => !seen.has(f.id) && seen.add(f.id));
  list = list.map((f, i) => [f, i]).sort((a, b) => (b[0].cc || 0) - (a[0].cc || 0) || a[1] - b[1]).map(x => x[0]); // Italy/Spain first
  OFF_CACHE.set(key, list);
  return list;
}
async function offProduct(code) {
  const r = await fetchJSON(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}&app_name=Forgia`);
  if (r.status !== 1 || !r.product) return null;
  return offToFood({ ...r.product, code: r.product.code || code });
}

/* ---------- local search ---------- */
function localFoods() { return [...Object.values(S.foods).filter(f => !f.deleted), ...BASE_FOODS.values()]; }
/* ---------- smart local search ----------
   1) normalizes accents/case  2) light Italian stemming (mele→mel, mela→mel, ciliegie→cilieg)
   3) synonyms (spaghetti→pasta, atun→tonno…)  4) prefix match on every word  5) 1-typo tolerance */
const SYN = {
  spaghetti: 'pasta', penne: 'pasta', fusilli: 'pasta', rigatoni: 'pasta', maccheroni: 'pasta', tagliatelle: 'pasta', linguine: 'pasta', farfalle: 'pasta',
  bistecca: 'manzo', fettina: 'manzo', carne: 'manzo pollo maiale', hamburger: 'macinato hamburger', polpette: 'polpette',
  yoghurt: 'yogurt', yogurth: 'yogurt', iogurt: 'yogurt', fiordilatte: 'mozzarella',
  atun: 'tonno', jamon: 'prosciutto', huevo: 'uovo', pollo: 'pollo', queso: 'formaggio', leche: 'latte', pan: 'pane', arroz: 'riso',
  manzana: 'mela', platano: 'banana', naranja: 'arancia', fresa: 'fragole', tomate: 'pomodoro', patata: 'patate', cebolla: 'cipolla',
  coca: 'cola', patatine: 'patatine chips', chips: 'patatine', toast: 'pancarre toast', merendina: 'brioche merendina', cornetto: 'croissant cornetto',
  insalata: 'insalata lattuga', verdura: 'verdure', frutta: 'frutta macedonia', proteine: 'whey proteine', shake: 'whey', integratore: 'whey',
};
function stem(w) { let s = w; for (let i = 0; i < 2 && s.length > 3 && /[aeiouy]$/.test(s); i++) s = s.slice(0, -1); if (s.length > 4 && s.endsWith('h')) s = s.slice(0, -1); return s; }
function tokens(str) { return norm(str).replace(/[^a-z0-9%]+/g, ' ').split(' ').filter(Boolean); }
function lev1(a, b) { // true if edit distance <= 1
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, e = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
  return e + (a.length - i) + (b.length - j) <= 1;
}
function foodIndex(f) {
  if (!f._ix) { const nameT = tokens(f.n), allT = tokens(f.n + ' ' + (f.brand || '') + ' ' + (f.a || '')); f._ix = { name: nameT.map(stem), all: allT.map(stem), raw: allT, code: f.code || '' }; }
  return f._ix;
}
function matchWord(ix, w, fuzzy) {
  const v = stem(w);
  if (ix.all.some(t => t.startsWith(v))) return (ix.name.some(t => t.startsWith(v)) ? 2 : 1) + (ix.name[0] && ix.name[0].startsWith(v) ? 1 : 0);
  for (const sw of (SYN[w] ? SYN[w].split(' ') : []).map(stem)) {
    if (ix.all.includes(sw)) return (ix.name.includes(sw) ? 1.8 : 0.9) + (ix.name[0] === sw ? 1 : 0);
  }
  if (fuzzy && v.length >= 4 && ix.all.some(t => lev1(t.slice(0, v.length + 1), v) || lev1(t, v))) return 0.5;
  return 0;
}
function searchLocal(q, opts = {}) {
  const words = tokens(q);
  const { cnt } = foodStats(120);
  let list = localFoods();
  if (!words.length) return list.sort((a, b) => (cnt.get(b.id) || 0) - (cnt.get(a.id) || 0) || (a.src === 'base') - (b.src === 'base') || a.n.localeCompare(b.n));
  if (/^\d{8,14}$/.test(words[0])) return list.filter(f => f.code === words[0]);
  const run = fuzzy => {
    const out = [];
    for (const f of list) {
      const ix = foodIndex(f); let sc = 0, ok = true;
      for (const w of words) { const m = matchWord(ix, w, fuzzy); if (!m) { ok = false; break; } sc += m; }
      if (!ok) continue;
      const nm = norm(f.n);
      sc += (nm.startsWith(norm(q)) ? 4 : 0) + (f.id.startsWith('b_') ? 0.6 : 0) + Math.min(6, (cnt.get(f.id) || 0)) + (f.src !== 'base' ? 1 : 0) - f.n.length / 60;
      out.push([sc, f]);
    }
    return out;
  };
  let res = run(false);
  if (!res.length) { const more = run(true); const ids = new Set(res.map(r => r[1].id)); res = res.concat(more.filter(r => !ids.has(r[1].id)).map(r => [r[0] - 3, r[1]])); }
  return res.sort((a, b) => b[0] - a[0] || a[1].n.localeCompare(b[1].n)).map(r => r[1]);
}

/* ---------- VIEW: Dieta ---------- */
UI.dietDay = todayKey();
function ring(val, max, size = 132) {
  const r = (size - 14) / 2, C = 2 * Math.PI * r, pct = clamp(max ? val / max : 0, 0, 1), over = max && val > max;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><defs><linearGradient id="ringg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff6b2c"/><stop offset="1" stop-color="#ffb547"/></linearGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#2a313c" stroke-width="12"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${over ? '#ff5c6c' : 'url(#ringg)'}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}
function macroBar(label, v, t, cls) {
  const pct = t ? clamp(v / t * 100, 0, 100) : 0, over = t && v > t * 1.08;
  return `<div class="mac"><div class="row"><span class="grow">${label}</span><b class="tnum">${fmtN(v, 0)}</b><span class="muted tnum">/ ${t ?? '–'} g</span></div><div class="mtrack"><i class="${cls} ${over ? 'over' : ''}" style="width:${pct}%"></i></div></div>`;
}
function dietSummaryCard(k, compact) {
  const T = targetsFor(k), { tot } = dayTotals(k);
  const left = T ? T.kcal - tot.kcal : null;
  return `<div class="card">
    <div class="ringwrap">
      <div class="ring">${ring(tot.kcal, T?.kcal)}<div class="ring-c"><b class="tnum">${T ? fmtN(Math.abs(left), 0) : fmtN(tot.kcal, 0)}</b><span>${T ? (left >= 0 ? 'kcal rimaste' : 'kcal in più') : 'kcal'}</span></div></div>
      <div class="grow stack" style="gap:10px;min-width:0">
        ${macroBar('Proteine', tot.p, T?.p, 'mp')}${macroBar('Carboidrati', tot.c, T?.c, 'mc')}${macroBar('Grassi', tot.f, T?.f, 'mf')}
      </div>
    </div>
    ${T ? `<div class="row small muted tnum" style="justify-content:space-between"><span>Mangiate <b style="color:var(--fg)">${fmtN(tot.kcal, 0)}</b></span><span>Obiettivo <b style="color:var(--fg)">${fmtN(T.kcal, 0)}</b></span><span class="chip ${dayType(k) === 'train' ? 'warm' : 'steel'}" style="padding:3px 9px">${dayType(k) === 'train' ? 'Allenamento' : 'Riposo'}</span></div>` : ''}
    ${!compact && T ? `<div class="micro">${[['fib', 'Fibre', '≥'], ['free', 'Zuccheri agg.', '≤'], ['sat', 'Saturi', '≤'], ['salt', 'Sale', '≤']].map(([kk, l, s]) => { const v = kk === 'free' ? Math.max(0, tot.sug - tot.sugF - tot.sugM) : tot[kk], t = kk === 'free' ? T.sug : T[kk], bad = s === '≤' ? v > t : false, good = s === '≥' && v >= t; return `<div><span>${l}</span><b class="tnum" style="color:${bad ? 'var(--bad)' : good ? 'var(--good)' : 'var(--fg)'}">${fmtN(v, 1)}</b><span class="faint">${s} ${t} g</span></div>`; }).join('')}</div>${tot.sug > 0 ? sugarSplit(tot) : ''}` : ''}
  </div>`;
}
function dietHomeCard() {
  if (!S.nutri) return `<button class="card tight" data-a="tab" data-k="diet" style="text-align:left;flex-direction:row;align-items:center">${icon('food')}<div class="grow"><b>Imposta la dieta</b><div class="small muted">Calcola calorie e macro in 1 minuto</div></div>${icon('chev')}</button>`;
  const k = todayKey();
  return `<div class="stack"><div class="section-title">Dieta di oggi <button class="link" data-a="tab" data-k="diet">Apri diario</button></div>${dietSummaryCard(k, true)}<div class="row"><button class="btn primary grow" data-a="foodAdd" data-m="${mealByTime()}">${icon('plus', 18)} Aggiungi cibo</button><button class="btn" data-a="scanOpen" data-m="${mealByTime()}" aria-label="Scanner">${icon('scan', 20)}</button></div></div>`;
}
function viewDiet() {
  if (!S.nutri) return `
    <div class="page-head"><h1>Dieta</h1></div>
    <div class="card hero"><div class="eyebrow" style="color:var(--gold)">Primo passo</div><h2 style="font-family:var(--font-display);font-size:28px;text-transform:uppercase">Calcola i tuoi obiettivi</h2><p class="muted small" style="margin:0">Età, altezza, peso, attività e obiettivo: l'app calcola calorie e macro, anche diversi tra giorni di allenamento e di riposo.</p><button class="btn primary block" data-a="nutriSetup">Inizia</button></div>
    <div class="list">${[['scan', 'Scanner codice a barre', 'Inquadri l\'EAN e trovi il prodotto su Open Food Facts'], ['search', 'Milioni di prodotti', 'Italia e Spagna, più ' + BASE_FOODS.size + ' cibi base già pronti'], ['target', 'Chiudi i macro', 'A fine giornata ti suggerisce cosa mangiare per arrivare ai target']].map(i => `<div class="li"><span class="thumb" style="width:42px;height:42px;color:var(--gold)">${icon(i[0])}</span><div class="grow"><div class="t">${i[1]}</div><div class="small muted" style="white-space:normal">${i[2]}</div></div></div>`).join('')}</div>`;
  const k = UI.dietDay, today = todayKey();
  const { meals, tot } = dayTotals(k);
  const ents = dayEntries(k);
  const label = k === today ? 'Oggi' : k === dkey(kdate(today) - DAY + 7200e3) ? 'Ieri' : k === dkey(kdate(today) + DAY + 7200e3) ? 'Domani' : fmtDateLong(kdate(k));
  const mc = macroCloser(k);
  const closer = k === today && mc.list && mc.list.length && ents.length ? `<div class="card tight"><div class="row"><span style="color:var(--gold)">${icon('target', 20)}</span><b class="grow">Chiudi i macro</b><span class="small muted tnum">mancano ${fmtN(Math.max(0, mc.rem.p), 0)} P · ${fmtN(Math.max(0, mc.rem.c), 0)} C · ${fmtN(Math.max(0, mc.rem.f), 0)} G</span></div>
    ${mc.list.map(s => { const f = food(s.id); return `<button class="li" style="padding:8px 0" data-a="closerAdd" data-id="${esc(s.id)}" data-g="${s.g}"><div class="grow"><div class="t">${s.g} g ${esc(f.n)}</div><div class="s tnum">+${fmtN(s.n.kcal, 0)} kcal · ${fmtN(s.n.p, 0)} P · ${fmtN(s.n.c, 0)} C · ${fmtN(s.n.f, 0)} G${s.freq ? ' · lo mangi spesso' : ''}</div></div><span class="chip warm">${icon('plus', 14)}</span></button>`; }).join('')}</div>` : '';
  return `
  <div class="page-head"><h1>Dieta</h1><button class="icon-btn solid" data-a="nutriSetup" aria-label="Obiettivi">${icon('target')}</button></div>
  <div class="row datenav"><button class="icon-btn solid" data-a="dayNav" data-d="-1" aria-label="Giorno precedente">${icon('back')}</button><button class="grow" data-a="dayToday" style="font-family:var(--font-display);font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:.03em">${label}</button><button class="chip ${dayType(k) === 'train' ? 'warm' : 'steel'}" data-a="dayType">${dayType(k) === 'train' ? icon('dumbbell', 14) + ' Allenamento' : icon('moon', 14) + ' Riposo'}</button><button class="icon-btn solid" data-a="dayNav" data-d="1" aria-label="Giorno successivo">${icon('chev')}</button></div>
  ${dietSummaryCard(k)}
  ${(() => { const kc = dayKcal(kdate(k)); return kc ? `<div class="small muted burn-note">${icon('flame', 14)} Allenamento e corsa: ~${Math.round(kc)} kcal attive. Sono già comprese nel tuo obiettivo (livello di attività), non vanno rimangiate.</div>` : ''; })()}
  ${coachCard(coachDay(k), { ai: aiReady() ? 'aiDay' : '', aiData: `data-k="${k}" data-box="day"`, key: 'day', all: UI.coachAll?.day })}
  ${closer}
  ${dayEntries(k).length ? microCard(tot, 1, k, UI.microOpen) : ''}
  <button class="foodsearch" data-a="foodSearchBar">${icon('search', 18)}<span>Cerca un cibo da aggiungere…</span><span class="chip" style="margin-left:auto;padding:3px 9px">${MEAL_N[mealByTime()]}</span></button>
  ${[...MEALS, { k: 'x', n: 'Integratori' }].map(m => {
    const list = ents.filter(e => e.m === m.k);
    const kc = meals[m.k].kcal, pct = tot.kcal ? Math.round(kc / tot.kcal * 100) : 0;
    if (m.k === 'o' && !list.length) return '';
    const open = mealOpen(m.k), supp = m.k === 'x';
    return `<div class="meal" style="--mc:${MEAL_COL[m.k]}">
      <div class="row meal-h"><button class="row grow" data-a="mealToggle" data-m="${m.k}" style="text-align:left;gap:10px;min-width:0"><span class="mdot"></span><b>${m.n}</b>${list.length ? `<span class="small muted tnum">${supp ? list.length + (list.length === 1 ? ' integratore' : ' integratori') : fmtN(kc, 0) + ' kcal · ' + pct + '%'}</span>` : ''}<span class="spacer"></span><span class="muted">${icon(open ? 'up' : 'down', 18)}</span></button>${supp ? '' : `<button class="icon-btn" data-a="mealMenu" data-m="${m.k}" aria-label="Opzioni ${m.n}">${icon('more', 20)}</button>`}</div>
      ${open ? `${list.length ? `<div class="list mlist">${list.map(e => { const n = entryNut(e), f = e.fid && food(e.fid); return `<button class="li" data-a="entryOpen" data-id="${e.id}"><div class="grow"><div class="t">${esc(entryName(e))}</div><div class="s tnum">${supp && f ? (e.g / (f.serv?.g || 1) === 1 ? esc(f.serv?.l || '1 dose') : fmtN(e.g / (f.serv?.g || 1), 1) + ' × ' + esc(f.serv?.l || 'dose')) : (e.q ? 'aggiunta rapida' : fmtN(e.g, 0) + ' g') + ` · ${fmtN(n.p, 0)} P · ${fmtN(n.c, 0)} C · ${fmtN(n.f, 0)} G`}</div></div><div class="meta">${supp ? '' : `<b style="color:var(--fg)">${fmtN(n.kcal, 0)}</b>`}</div></button>`; }).join('')}</div>` : ''}
      <div class="row"><button class="btn sm grow" data-a="foodAdd" data-m="${m.k}" ${supp ? 'data-tab="supp"' : ''}>${icon('plus', 16)} ${supp ? 'Aggiungi integratore' : 'Aggiungi'}</button>${supp ? '' : `<button class="btn sm" data-a="scanOpen" data-m="${m.k}" aria-label="Scansiona per ${m.n}">${icon('scan', 18)}</button>`}</div>` : ''}
    </div>`;
  }).join('')}
  ${!ents.some(e => e.m === 'o') ? `<button class="btn ghost" data-a="foodAdd" data-m="o">${icon('plus', 16)} Aggiungi ad "Altro"</button>` : ''}
  <button class="li card tight" data-a="dietStats" style="flex-direction:row">${icon('chart')}<div class="grow"><div class="t">Analisi alimentazione</div><div class="s">Cibi e combinazioni più frequenti, divisione dei pasti, medie</div></div>${icon('chev')}</button>
  <button class="li card tight" data-a="shopOpen" style="flex-direction:row">${icon('food')}<div class="grow"><div class="t">Lista della spesa</div><div class="s">${S.shop ? `${S.shop.items.filter(x => !x.done).length + S.shop.extra.filter(x => !x.done).length} cose da prendere · ${S.shop.days} giorni` : 'Dai cibi che mangi di solito, divisa per reparto'}</div></div>${icon('chev')}</button>
  <button class="li card tight" data-a="myFoods" style="flex-direction:row">${icon('layers')}<div class="grow"><div class="t">Cibi, ricette e pasti salvati</div><div class="s">Crea un alimento o una ricetta con calcolo per porzione</div></div>${icon('chev')}</button>`;
}

/* ---------- LAYER: food search ---------- */
function layerFood(l, i) {
  const tabs = [['all', 'Cerca'], ['recent', 'Recenti'], ['mine', 'I miei'], ['meals', 'Pasti salvati'], ['supp', 'Integratori']];
  if (l.mode === 'ingredient') tabs.splice(3, 2);
  return `<div class="layer">${head(l.mode === 'ingredient' ? 'Ingrediente' : 'Aggiungi a ' + MEAL_N[l.m], 'back', l.mode === 'ingredient' ? '' : `<button class="icon-btn solid" data-a="scanOpen" data-m="${l.m}" aria-label="Scanner">${icon('scan')}</button>`)}
    <div style="padding:12px 16px 6px;display:flex;flex-direction:column;gap:10px;border-bottom:1px solid var(--line)">
      <form class="search" data-form="foodSearch">${icon('search', 18)}<input class="input" id="fd-q" data-in="foodQ" value="${esc(l.q)}" placeholder="Cerca: yogurt greco, Mulino Bianco…" autocomplete="off" type="search" enterkeyhint="search"></form>
      <div class="chips">${favChip(l.tab === 'fav', 'foodTab', 'data-t="fav"')}${tabs.map(([k, n]) => `<button class="chip ${l.tab === k ? 'on' : ''}" data-a="foodTab" data-t="${k}">${n}</button>`).join('')}${l.mode !== 'ingredient' ? `<button class="chip gold" data-a="aiFood">${icon('sparkle', 14)} Stima con AI</button><button class="chip" data-a="quickAdd">${icon('bolt', 14)} Aggiunta rapida</button>` : ''}</div>
    </div>
    <div class="layer-body" data-scroll-key="food${i}"><div id="fd-list">${foodList(l)}</div></div>
  </div>`;
}
function foodRow(f, extra = '') {
  return `<div class="li pk-row"><button class="row grow" data-a="foodPick" data-id="${esc(f.id)}" style="text-align:left;min-width:0;gap:12px">${gradeChip(f)}<div class="grow" style="min-width:0"><div class="t">${esc(f.n)}</div><div class="s">${f.cat === 'supp' ? suppLine(f) : (f.brand ? esc(f.brand) + ' · ' : '') + fmtN(f.per.kcal, 0) + ' kcal · ' + fmtN(f.per.p, 0) + ' P / 100 g'}${extra}</div></div>${f.cat === 'supp' ? '<span class="chip steel">integratore</span>' : f.src === 'recipe' ? '<span class="chip gold">ricetta</span>' : f.src === 'custom' ? '<span class="chip">mio</span>' : ''}</button>${f.cat === 'supp' && f.src === 'base' ? '' : favBtn('food', f.id)}</div>`;
}
function foodList(l) {
  const { lastG } = foodStats(120);
  if (l.tab === 'fav') {
    const fv = favList('food').map(id => findAnyFood(id)).filter(f => f && !f.deleted);
    return fv.length ? `<div class="list" style="border-radius:0">${fv.map(f => foodRow(f, lastG.get(f.id) ? ` · ultima: ${fmtN(lastG.get(f.id), 0)} g` : '')).join('')}</div>` : `<div class="empty">${icon('star', 30)}<b>Nessun preferito</b><span class="small">Tocca la stella accanto a un cibo per averlo sempre qui, con un tap.</span></div>`;
  }
  if (l.tab === 'recent') {
    const r = recentFoods();
    return r.length ? `<div class="list" style="border-radius:0">${r.map(id => foodRow(food(id), ` · ultima: ${fmtN(lastG.get(id), 0)} g`)).join('')}</div>` : `<div class="empty">${icon('calendar', 30)}<b>Nessun cibo recente</b><span class="small">I cibi che registri compaiono qui per riaggiungerli al volo.</span></div>`;
  }
  if (l.tab === 'mine') {
    const mine = Object.values(S.foods).filter(f => (f.src === 'custom' || f.src === 'recipe') && !f.deleted);
    return `<div style="padding:12px 16px" class="row"><button class="btn sm grow" data-a="foodNew">${icon('plus', 16)} Nuovo alimento</button><button class="btn sm grow" data-a="recipeNew">${icon('plus', 16)} Nuova ricetta</button></div>` + (mine.length ? `<div class="list" style="border-radius:0">${mine.map(f => foodRow(f)).join('')}</div>` : `<div class="empty"><span class="small">Qui trovi gli alimenti e le ricette che crei tu.</span></div>`);
  }
  if (l.tab === 'supp') {
    const list = [...BASE_FOODS.values(), ...Object.values(S.foods)].filter(f => f.cat === 'supp' && !f.deleted);
    return `<div class="list" style="border-radius:0">${list.map(f => foodRow(f)).join('')}</div><div style="padding:16px" class="stack"><div class="small muted">Gli integratori aggiornano i micronutrienti della giornata. Se il tuo ha dosi diverse, crealo da "I miei" → Nuovo alimento, tipo "Integratore", con i valori per 1 porzione.</div><button class="btn" data-a="foodNew" data-cat="supp">${icon('plus', 16)} Crea integratore</button></div>`;
  }
  if (l.tab === 'meals') {
    return S.savedMeals.length ? `<div class="list" style="border-radius:0">${S.savedMeals.map(sm => { const n = sm.items.reduce((a, it) => { const f = food(it.fid); return f ? addNut(a, nutOf(f.per, it.g)) : a; }, zeroNut()); return `<button class="li" data-a="savedMealAdd" data-id="${sm.id}"><div class="grow"><div class="t">${esc(sm.name)}</div><div class="s">${sm.items.map(it => esc(food(it.fid)?.n || '')).join(' · ')}</div></div><div class="meta"><b style="color:var(--fg)">${fmtN(n.kcal, 0)}</b><br>kcal</div></button>`; }).join('')}</div>` : `<div class="empty">${icon('copy', 30)}<b>Nessun pasto salvato</b><span class="small">Dal diario: menu ⋯ di un pasto → "Salva come pasto". Poi lo riaggiungi con un tap.</span></div>`;
  }
  const loc = searchLocal(l.q).slice(0, l.q ? 40 : 30);
  const on = l.online || {};
  let online = '';
  if (l.q && l.q.trim().length >= 3) {
    if (on.loading) online = `<div class="li small muted">${icon('search', 16)} Cerco su Open Food Facts…</div>`;
    else if (on.error) online = `<div class="li small muted" style="white-space:normal">${esc(on.error)}</div>`;
    else if (on.q === norm(l.q)) online = on.results.length ? on.results.map(f => foodRow(f)).join('') : `<div class="li small muted">Nessun prodotto online per "${esc(l.q)}".</div>`;
    else online = `<button class="li" data-a="foodOnline" style="color:var(--gold)">${icon('search', 18)}<b class="grow">Cerca "${esc(l.q)}" su Open Food Facts</b>${icon('chev', 16)}</button>`;
  }
  const favTop = l.q ? [] : favList('food').map(id => findAnyFood(id)).filter(f => f && !f.deleted).slice(0, 5);
  return `${favTop.length ? `<div class="eyebrow row" style="padding:12px 16px 6px"><span class="grow" style="color:var(--star)">Preferiti</span>${favList('food').length > 5 ? `<button class="link" data-a="foodTab" data-t="fav">Tutti</button>` : ''}</div><div class="list" style="border-radius:0">${favTop.map(f => foodRow(f)).join('')}</div>` : ''}${l.q ? '' : `<div class="eyebrow" style="padding:12px 16px 6px">${frequentFoods(1).length ? 'I tuoi cibi più usati e cibi base' : 'Cibi base'}</div>`}
    <div class="list" style="border-radius:0">${loc.map(f => foodRow(f)).join('')}</div>
    ${l.q ? `<div class="eyebrow" style="padding:16px 16px 6px">Prodotti confezionati</div><div class="list" style="border-radius:0">${online}</div>` : ''}
    ${l.q ? `<div style="padding:16px" class="stack"><div class="small muted">Non trovi quello che cerchi?</div><div class="row"><button class="btn grow" data-a="aiFood">${icon('sparkle', 16)} Stima con AI</button><button class="btn grow" data-a="foodNew">${icon('plus', 16)} Crea alimento</button></div></div>` : ''}`;
}
function suppLine(f) {
  const g = f.serv?.g || 1, parts = MICROS.filter(m => f.per[m.k]).map(m => `${m.n} ${fmtN(f.per[m.k] * g / 100, f.per[m.k] * g / 100 < 10 ? 1 : 0)} ${m.u}`);
  return (parts.slice(0, 3).join(' · ') || 'nessun micronutriente') + ' per ' + esc(f.serv?.l || 'porzione');
}
function refreshFoodList() { const l = topLayer(); const el = $('#fd-list'); if (el && l && l.type === 'food') el.innerHTML = foodList(l); }
async function runOnline() {
  const l = topLayer(); if (!l || l.type !== 'food') return;
  const q = l.q.trim(); if (q.length < 3) return;
  if (!navigator.onLine) { l.online = { error: 'Sei offline: per i prodotti confezionati serve internet. I cibi base funzionano anche offline.' }; refreshFoodList(); return; }
  l.online = { loading: true }; refreshFoodList();
  try { const res = await offSearch(q); if (topLayer() === l) { l.online = { q: norm(q), results: res }; refreshFoodList(); } }
  catch (e) { l.online = { error: window.FORGIA_PWA ? 'Open Food Facts non risponde ora. Riprova tra poco o usa lo scanner.' : 'La ricerca online funziona nell\'app installata (GitHub Pages). In questa anteprima usa i cibi base o crea un alimento.' }; if (topLayer() === l) refreshFoodList(); }
}
let OFF_TEMP = new Map(); // online results not yet saved
function findAnyFood(id) { return food(id) || OFF_TEMP.get(id) || [...OFF_CACHE.values()].flat().find(f => f.id === id) || null; }

/* ---------- LAYER: amount ---------- */
function layerAmount(l) {
  const f = l.food;
  const g = num(l.qty) != null ? (l.unit === 'serv' && f.serv ? num(l.qty) * f.serv.g : num(l.qty)) : 0;
  const n = nutOf(f.per, g || 0);
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="dialog" aria-label="${esc(f.n)}"><div class="grab"></div>
    <div class="row" style="align-items:flex-start"><h3 class="grow" style="text-transform:none;font-family:var(--font-body);font-weight:700;font-size:18px;letter-spacing:0">${esc(f.n)}</h3>${l.mode === 'ingredient' || (f.cat === 'supp' && f.src === 'base') ? '' : favBtn('food', f.id, 24)}</div>
    <div class="row small muted" style="margin:-4px 0 12px;gap:8px">${gradeChip(f)}<span>${f.brand ? esc(f.brand) + ' · ' : ''}${fmtN(f.per.kcal, 0)} kcal / 100 g${f.src === 'base' ? ' · valori medi' : f.src === 'off' ? ' · Open Food Facts' : f.ai ? ' · stima AI' : ''}${f.nova === 4 ? ' · ultra-processato (NOVA 4)' : ''}</span></div>
    <div class="stack">
      <div class="row"><input class="input tnum" id="am-qty" data-in="amQty" inputmode="decimal" data-max="5000" value="${esc(l.qty)}" style="width:110px;font-size:22px;font-weight:700;text-align:center">
        <div class="chips" style="margin:0;padding:0;flex:1"><button class="chip ${l.unit === 'g' ? 'on' : ''}" data-a="amUnit" data-u="g">grammi</button>${f.serv ? `<button class="chip ${l.unit === 'serv' ? 'on' : ''}" data-a="amUnit" data-u="serv">${esc(f.serv.l)} (${fmtN(f.serv.g, 0)} g)</button>` : ''}</div></div>
      <div class="amt-out tnum" id="am-out">${amountOut(n)}</div>
      ${f.cat === 'supp' ? '' : `<div class="card tight" style="background:var(--surface-2)"><button class="row" data-a="amMicro" style="text-align:left"><b class="grow">Micronutrienti</b><span class="small muted">${foodMicroKnown(f)} su ${MICROS.length - 1} noti${f.est && !f.est.none && (f.est.k || []).length ? ' · alcuni stimati' : ''}</span>${icon(l.micro ? 'up' : 'down', 18)}</button>${l.micro ? `<div id="am-micro">${foodMicroHTML(f, g || 0)}</div>` : ''}</div>`}
      ${l.mode === 'ingredient' || f.cat === 'supp' ? (f.cat === 'supp' ? '<div class="small muted">Va nella sezione Integratori della giornata.</div>' : '') : `<div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${MEALS.map(m => `<button class="chip ${l.m === m.k ? 'on' : ''}" data-a="amMeal" data-m="${m.k}" style="${l.m === m.k ? `background:${MEAL_COL[m.k]};color:#1a0d05` : ''}">${m.n}</button>`).join('')}</div>`}
      <div class="row">${l.entryId ? `<button class="btn danger" data-a="entryDelete">${icon('trash', 18)}</button>` : ''}<button class="btn primary grow" data-a="amSave">${l.entryId ? 'Salva' : l.mode === 'ingredient' ? 'Aggiungi alla ricetta' : 'Aggiungi'}</button></div>
    </div></div></div>`;
}
/* micronutrients of ONE food for the chosen quantity, as % of the daily reference */
function foodMicroKnown(f) { return MICROS.filter(m => m.k !== 'crea' && f.per[m.k] != null).length; }
function foodMicroHTML(f, g) {
  const known = foodMicroKnown(f);
  if (!known) return `<div class="small muted">Questo prodotto non ha i micronutrienti: succede spesso con i confezionati di Open Food Facts, che riportano solo i valori obbligatori in etichetta. I cibi base e quelli della banca dati CIQUAL li hanno quasi sempre.</div>`;
  const rows = MICROS.filter(m => m.k !== 'crea').map(m => {
    const per = f.per[m.k]; if (per == null) return `<div class="mrow"><span class="mn">${m.n}</span><span class="small faint">non disponibile</span><span></span></div>`;
    const v = per * g / 100, r = microRef(m), pct = r ? v / r : 0;
    const col = pct >= 0.2 ? 'var(--good)' : pct >= 0.1 ? 'var(--gold)' : 'var(--steel)';
    return `<div class="mrow${f.est && (f.est.k || []).includes(m.k) ? ' est' : ''}"><span class="mn">${m.n}</span><span class="mtrack"><i style="width:${Math.min(100, pct * 100)}%;background:${col}"></i></span><span class="mv tnum">${fmtN(v, v < 10 ? 1 : 0)} ${m.u} <small>${fmtN(pct * 100, 0)}%</small></span></div>`;
  }).join('');
  return `${estNoteHTML(f)}<div class="micros" style="margin-top:4px">${rows}</div><div class="small faint" style="margin-top:6px">% = quota del fabbisogno giornaliero con questa quantità. Verde: fonte ricca (≥ 20%).</div>`;
}
function amountOut(n) {
  return `<div class="amt-k"><b>${fmtN(n.kcal, 0)}</b><span>kcal</span></div><div><b>${fmtN(n.p, 1)}</b><span>Prot.</span></div><div><b>${fmtN(n.c, 1)}</b><span>Carb.</span></div><div><b>${fmtN(n.f, 1)}</b><span>Grassi</span></div><div class="amt-sub">Fibre ${fmtN(n.fib, 1)} · Zuccheri ${fmtN(n.sug, 1)} · Saturi ${fmtN(n.sat, 1)} · Sale ${fmtN(n.salt, 2)} g</div>`;
}
function openAmount(f, opts = {}) {
  try { microFill(f); } catch (e) { }
  const last = foodStats(120).lastG.get(f.id);
  const g = f.cat === 'supp' && !opts.g ? f.serv.g : (opts.g ?? last ?? (f.serv ? f.serv.g : 100));
  const useServ = (!opts.g && !last && f.serv) || (f.cat === 'supp' && !opts.g);
  pushLayer({ type: 'amount', food: f, qty: useServ ? '1' : String(Math.round(g * 10) / 10).replace('.', ','), unit: useServ ? 'serv' : 'g', m: opts.m || 'b', mode: opts.mode || 'log', entryId: opts.entryId, day: opts.day || UI.dietDay, ingrIdx: opts.ingrIdx });
}

/* ---------- LAYER: quick add ---------- */
function layerQuick(l) {
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="dialog" aria-label="Aggiunta rapida"><div class="grab"></div><h3>Aggiunta rapida</h3>
    <div class="stack">
      <div class="field"><label for="qa-n">Descrizione</label><input id="qa-n" class="input" placeholder="Es. Pranzo al ristorante"></div>
      <div class="ed-grid"><div class="field"><label>kcal</label><input id="qa-k" class="input" inputmode="numeric" data-max="9000"></div><div class="field"><label>Prot. g</label><input id="qa-p" class="input" inputmode="decimal"></div><div class="field"><label>Carb. g</label><input id="qa-c" class="input" inputmode="decimal"></div><div class="field"><label>Grassi g</label><input id="qa-f" class="input" inputmode="decimal"></div></div>
      <div class="small faint">Se lasci vuote le kcal le calcolo dai macro (4/4/9).</div>
      <button class="btn primary block" data-a="quickSave">Aggiungi a ${MEAL_N[l.m]}</button>
    </div></div></div>`;
}

/* ---------- LAYER: custom food editor ---------- */
function layerFoodEdit(l) {
  const f = l.food, basis = l.basis || '100';
  const fld = (k, lab, mode = 'decimal', mx) => `<div class="field"><label>${lab}</label><input class="input" data-in="feNut" data-k="${k}" inputmode="${mode}" data-max="${mx ?? (k === 'kcal' ? 900 : 100)}" value="${f.per[k] ?? ''}"></div>`;
  const microMax = { k: 99999, ca: 99999, fe: 9999, mg: 99999, zn: 9999, se: 99999, vita: 99999, vitc: 99999, vitd: 9999, vite: 9999, b6: 999, b9: 99999, b12: 99999, om3: 100 };
  return `<div class="layer">${head(l.isNew ? (f.cat === 'supp' ? 'Nuovo integratore' : 'Nuovo alimento') : 'Modifica alimento', 'x', `<button class="btn primary sm" data-a="foodSave">Salva</button>`)}
    <div class="layer-body"><div class="layer-inner">
      <div class="field"><label for="fe-n">Nome</label><input id="fe-n" class="input" data-in="feStr" data-k="n" maxlength="60" value="${esc(f.n)}" placeholder="${f.cat === 'supp' ? 'Es. Vitamina D3 Prozis' : 'Es. Yogurt greco Lidl'}"></div>
      <div class="row"><div class="field grow"><label for="fe-b">Marca</label><input id="fe-b" class="input" data-in="feStr" data-k="brand" maxlength="40" value="${esc(f.brand)}"></div><div class="field grow"><label for="fe-c">Codice a barre</label><input id="fe-c" class="input" data-in="feStr" data-k="code" inputmode="numeric" data-maxlen="14" value="${esc(f.code || '')}"></div></div>
      <div class="row"><div class="field grow"><label>Porzione (g)</label><input class="input" data-in="feServ" data-k="g" inputmode="decimal" data-max="2000" value="${f.serv?.g ?? ''}"></div><div class="field grow"><label>Nome porzione</label><input class="input" data-in="feServ" data-k="l" maxlength="30" value="${esc(f.serv?.l ?? '')}" placeholder="${f.cat === 'supp' ? '1 capsula' : '1 vasetto'}"></div></div>
      <div class="row"><span class="lbl grow">I valori che inserisci sono per</span><div class="seg" style="width:190px"><button class="${basis === '100' ? 'on' : ''}" data-a="feBasis" data-v="100">100 g</button><button class="${basis === 'serv' ? 'on' : ''}" data-a="feBasis" data-v="serv">1 porzione</button></div></div>
      <div class="lbl">${basis === 'serv' ? `Valori per 1 porzione (${f.serv?.g ? fmtN(num(f.serv.g), 1) + ' g' : 'inserisci il peso della porzione'})` : 'Valori per 100 g (li trovi nella tabella sulla confezione)'}</div>
      <div class="ed-grid">${fld('kcal', 'kcal', 'numeric')}${fld('p', 'Proteine')}${fld('c', 'Carboidrati')}${fld('f', 'Grassi')}</div>
      <div class="ed-grid">${fld('fib', 'Fibre')}${fld('sug', 'di cui zuccheri')}${fld('sat', 'di cui saturi')}${fld('salt', 'Sale')}</div>
      <div class="card tight"><button class="row" data-a="feMicro" style="text-align:left"><b class="grow">Micronutrienti <span class="small muted" style="font-weight:500">(facoltativo)</span></b>${icon(l.microOpen ? 'up' : 'down', 18)}</button>
        ${l.microOpen ? `<div class="small faint">Compila solo quelli riportati in etichetta. ${basis === 'serv' ? 'Valori per 1 porzione.' : 'Valori per 100 g.'}</div><div class="ed-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${MICROS.filter(m => m.k !== 'fib').map(m => fld(m.k, `${m.n} (${m.u})`, 'decimal', microMax[m.k])).join('')}</div>` : ''}
      </div>
      <div class="field"><label>Tipo di alimento</label><div class="chips" style="margin:0;padding:0;flex-wrap:wrap">${FOOD_CATS.map(([k, n]) => `<button class="chip ${(f.cat || '') === k ? 'on' : ''}" data-a="feCat" data-k="${k}">${n}</button>`).join('')}</div><span class="small faint">Serve per separare gli zuccheri della frutta e del latte da quelli aggiunti, e per stimare la qualità.</span></div>
      <div id="fe-issues">${feIssuesHTML(l)}</div>
      <button class="btn block" data-a="aiFoodCheck" ${aiReady() ? '' : 'disabled'}>${icon('sparkle', 16)} Controlla con AI</button>
      <div id="fe-ai" class="ai-out card tight" hidden></div>
      ${!l.isNew ? `<button class="btn danger block" data-a="foodDelete">${icon('trash', 18)} Elimina alimento</button>` : ''}
    </div></div></div>`;
}
/* the editor keeps values in the chosen basis; this returns a copy of the food with values per 100 g */
function feFood100(l) {
  const f = l.food, g = num(f.serv?.g), per = {};
  for (const [k, v] of Object.entries(f.per)) { const x = num(v); per[k] = x == null ? null : (l.basis === 'serv' && g ? x / g * 100 : x); }
  return { ...f, per };
}
const FOOD_CATS = [['', 'Altro'], ['fr', 'Frutta'], ['veg', 'Verdura'], ['dairy', 'Latticini'], ['meat', 'Carne'], ['fish', 'Pesce'], ['egg', 'Uova'], ['cer', 'Cereali/pane'], ['leg', 'Legumi'], ['nut', 'Frutta secca'], ['sweet', 'Dolci/snack'], ['drink', 'Bevande'], ['fat', 'Grassi/oli'], ['sauce', 'Salse'], ['dish', 'Piatto pronto'], ['supp', 'Integratore']];
function feIssuesHTML(l) {
  const f = feFood100(l);
  if (l.basis === 'serv' && !(num(l.food.serv?.g) > 0)) return `<div class="card tight coach"><div class="cm warn"><span>${icon('info', 16)}</span><div>Inserisci il peso della porzione in grammi per convertire i valori.</div></div></div>`;
  const iss = f.cat === 'supp' ? [] : foodIssues(f); const g = num(f.per.kcal) != null ? nutriScore({ ...f, per: Object.fromEntries(Object.entries(f.per).map(([k, v]) => [k, num(v) || 0])) }) : '';
  return (iss.length ? `<div class="card tight coach">${iss.map(t => `<div class="cm warn"><span>${icon('info', 16)}</span><div>${t}</div></div>`).join('')}</div>` : '') + (g ? `<div class="row small muted" style="gap:8px"><span class="ns" style="background:${GRADE_COL[g]}">${g}</span>Qualità stimata (simile al Nutri-Score)</div>` : '');
}

/* ---------- LAYER: recipe editor ---------- */
function recipeCalc(r) {
  const tot = zeroNut(); let raw = 0;
  for (const it of r.ingr) { const f = food(it.fid); if (f) { addNut(tot, nutOf(f.per, it.g, f)); raw += it.g; } }
  const W = num(r.cooked) || raw || 1;
  const per = {}; for (const k of NK) per[k] = +(tot[k] / W * 100).toFixed(2);
  const portions = Math.max(1, num(r.portions) || 1);
  return { tot, raw, W, per, portions, portionG: W / portions };
}
function recipeSum(c) { return `<div class="lbl">Una porzione (${fmtN(c.portionG, 0)} g)</div><div class="amt-out tnum">${amountOut(nutOf(c.per, c.portionG))}</div>`; }
function layerRecipe(l, i) {
  const r = l.draft, c = recipeCalc(r);
  return `<div class="layer">${head(l.isNew ? 'Nuova ricetta' : 'Modifica ricetta', 'x', `<button class="btn primary sm" data-a="recipeSave">Salva</button>`)}
    <div class="layer-body" data-scroll-key="rc${i}"><div class="layer-inner">
      <div class="field"><label for="rc-n">Nome ricetta</label><input id="rc-n" class="input" data-in="rcStr" data-k="n" value="${esc(r.n)}" placeholder="Es. Porridge proteico"></div>
      <div class="row"><div class="field grow"><label>Porzioni</label><input class="input" data-in="rcStr" data-k="portions" inputmode="numeric" value="${esc(r.portions)}"></div><div class="field grow"><label>Peso cotto (g, facoltativo)</label><input class="input" data-in="rcStr" data-k="cooked" inputmode="decimal" value="${esc(r.cooked || '')}" placeholder="${fmtN(c.raw, 0)}"></div></div>
      <div class="lbl">Ingredienti</div>
      ${r.ingr.length ? `<div class="list">${r.ingr.map((it, k) => { const f = food(it.fid); return `<div class="li"><div class="grow"><div class="t">${esc(f?.n || '?')}</div><div class="s">${fmtN(it.g, 0)} g · ${fmtN(f ? f.per.kcal * it.g / 100 : 0, 0)} kcal</div></div><button class="icon-btn" data-a="rcRemove" data-k="${k}" aria-label="Rimuovi">${icon('x')}</button></div>`; }).join('')}</div>` : ''}
      <button class="btn block" data-a="rcAdd">${icon('plus', 18)} Aggiungi ingrediente</button>
      <div class="card tight" id="rc-sum">${recipeSum(c)}</div>
    </div></div></div>`;
}

/* ---------- LAYER: my foods ---------- */
function layerMyFoods(l, i) {
  const mine = Object.values(S.foods).filter(f => (f.src === 'custom' || f.src === 'recipe') && !f.deleted);
  return `<div class="layer">${head('I miei cibi')}
    <div class="layer-body" data-scroll-key="mf${i}"><div class="layer-inner">
      <div class="row"><button class="btn grow" data-a="foodNew">${icon('plus', 16)} Alimento</button><button class="btn grow" data-a="recipeNew">${icon('plus', 16)} Ricetta</button></div>
      <div class="section-title">Alimenti e ricette</div>
      ${mine.length ? `<div class="list">${mine.map(f => `<button class="li" data-a="myFoodOpen" data-id="${esc(f.id)}"><div class="grow"><div class="t">${esc(f.n)}</div><div class="s">${f.src === 'recipe' ? 'Ricetta · ' + fmtN(f.serv?.g, 0) + ' g a porzione' : (f.brand || 'Personale')} · ${fmtN(f.per.kcal, 0)} kcal/100 g</div></div>${icon('chev', 18)}</button>`).join('')}</div>` : `<div class="card tight small muted">Nessun alimento personale.</div>`}
      <div class="section-title">Pasti salvati</div>
      ${S.savedMeals.length ? `<div class="list">${S.savedMeals.map(sm => `<div class="li"><div class="grow"><div class="t">${esc(sm.name)}</div><div class="s">${sm.items.length} alimenti</div></div><button class="icon-btn" data-a="savedMealDelete" data-id="${sm.id}" aria-label="Elimina">${icon('trash', 18)}</button></div>`).join('')}</div>` : `<div class="card tight small muted">Salva un pasto dal diario (menu ⋯) per riaggiungerlo con un tap.</div>`}
    </div></div></div>`;
}

/* ---------- LAYER: nutrition setup ---------- */
function nutriSum(n) {
  const b = baseTargets(n), tdee = Math.round(maintFor(n)), nt = n.trainDays.length;
  const ad = n.adapt && !n.manual && typeof adaptiveCached === 'function' ? adaptiveCached() : null;
  const trainK = n.cycle ? Math.round(b.kcal + n.delta * (7 - nt) / 7) : b.kcal;
  const restK = n.cycle ? Math.round(b.kcal - n.delta * nt / 7) : b.kcal;
  return `<div class="card hero"><div class="row"><div class="grow"><div class="eyebrow" style="color:var(--gold)">Media giornaliera</div><div style="font-family:var(--font-display);font-size:40px;font-weight:800;line-height:1" class="tnum">${fmtN(b.kcal, 0)} <small style="font-size:18px;color:var(--muted)">kcal</small></div></div><div class="small muted" style="text-align:right">Mantenimento stimato<br><b style="color:var(--fg)" class="tnum">${fmtN(tdee, 0)} kcal</b></div></div>
        <div class="kv"><div><b>${b.p}</b><span>Proteine g</span></div><div><b>${b.c}</b><span>Carboidrati g</span></div><div><b>${b.f}</b><span>Grassi g</span></div><div><b class="tnum">${fmtN(trainK, 0)} / ${fmtN(restK, 0)}</b><span>kcal allenamento / riposo</span></div></div>
        <div class="small faint">${n.manual ? 'Target inseriti da te. A destra il mantenimento stimato, per confronto.' : (ad && ad.ok ? `Mantenimento reale: calcolato da ${ad.days} giorni di diario e dal tuo peso (si aggiorna ogni lunedì).` : 'Stima con la formula Mifflin-St Jeor × attività.' + (ad ? ' Il mantenimento reale parte appena ci sono abbastanza dati (Progressi → Corpo).' : ' Puoi attivare il mantenimento reale qui sotto.')) + (typeof bodyWeight === 'function' && bodyWeight() ? ` Peso: media 7 giorni dal registro corporeo.` : '')}</div></div>`;
}
function layerNutri(l, i) {
  const n = l.draft;
  const inp = (k, lab, unit) => `<div class="field"><label>${lab}</label><input class="input" data-in="ntNum" data-k="${k}" inputmode="decimal" value="${n[k]}"><span class="small faint" style="margin-top:-4px">${unit}</span></div>`;
  const auto = !n.manual;
  return `<div class="layer">${head('Obiettivi dieta', 'x', `<button class="btn primary sm" data-a="nutriSave">Salva</button>`)}
    <div class="layer-body" data-scroll-key="nt${i}"><div class="layer-inner">
      <div class="seg"><button class="${auto ? 'on' : ''}" data-a="ntMode" data-v="auto">Calcolo automatico</button><button class="${!auto ? 'on' : ''}" data-a="ntMode" data-v="manual">Inserisco io</button></div>
      ${!auto ? `<div class="card"><div class="lbl">I tuoi target (media giornaliera)</div><div class="ed-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="field"><label>kcal</label><input class="input" data-in="ntMan" data-k="kcal" inputmode="numeric" value="${n.man.kcal}"></div><div class="field"><label>Proteine g</label><input class="input" data-in="ntMan" data-k="p" inputmode="numeric" value="${n.man.p}"></div><div class="field"><label>Grassi g</label><input class="input" data-in="ntMan" data-k="f" inputmode="numeric" value="${n.man.f}"></div></div><div class="small faint">I carboidrati sono calcolati dalle calorie che restano. Per il confronto col mantenimento uso comunque i dati qui sotto.</div></div>` : ''}
      <div id="nt-sum">${nutriSum(n)}</div>
      <div id="nt-coach">${coachCard(coachTargets(n), { key: 'ntc', all: true })}</div>
      <button class="btn block" data-a="aiTargets" ${aiReady() ? '' : 'disabled'}>${icon('sparkle', 16)} Chiedi un parere all'AI</button>
      <div id="ai-out-nt" class="ai-out card tight" hidden></div>
      <div class="section-title">Dati</div>
      <div class="chips" style="margin:0;padding:0"><button class="chip ${n.sex === 'm' ? 'on' : ''}" data-a="ntSet" data-k="sex" data-v="m">Uomo</button><button class="chip ${n.sex === 'f' ? 'on' : ''}" data-a="ntSet" data-k="sex" data-v="f">Donna</button></div>
      <div class="ed-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))">${inp('age', 'Età', 'anni')}${inp('height', 'Altezza', 'cm')}${bodyWeight() ? `<div class="field"><label>Peso</label><div class="input ro tnum">${fmtN(n.weight, 1)}</div><span class="small faint" style="margin-top:-4px">kg · ${n.wMode === 'last' ? 'ultima pesata' : 'media 7 gg'}</span></div>` : inp('weight', 'Peso', 'kg')}</div>
      ${bodyWeight() ? `<div class="card tight"><div class="lbl">Peso usato per i calcoli</div><div class="seg"><button class="${n.wMode !== 'last' ? 'on' : ''}" data-a="ntWMode" data-v="avg">Media 7 giorni · ${fmtN(bodyWeight(), 1)}</button><button class="${n.wMode === 'last' ? 'on' : ''}" data-a="ntWMode" data-v="last">Ultima pesata · ${fmtN(lastWeight(), 1)}</button></div><div class="small faint">Il peso arriva da Progressi → Corpo e si aggiorna da solo. Consiglio la media: la singola pesata oscilla di 1–2 kg per acqua, sale e carboidrati, e farebbe cambiare i target ogni giorno. Ultima pesata ${relDay(weightNow().t).toLowerCase()}.</div></div>` : ''}
      <div class="section-title">Attività</div>
      <div class="list">${ACT.map(a => `<button class="li" data-a="ntSet" data-k="act" data-v="${a.k}"><div class="grow"><div class="t">${a.l}</div><div class="s">${a.d}</div></div>${n.act == a.k ? `<span style="color:var(--ember)">${icon('check')}</span>` : ''}</button>`).join('')}</div>
      ${auto ? `<div class="section-title">Obiettivo</div>
      <div class="list">${RATES.map(r => `<button class="li" data-a="ntSet" data-k="rate" data-v="${r.v}"><div class="grow"><div class="t">${r.l}</div><div class="s">${r.d}${r.v ? ' · ' + (r.v > 0 ? '+' : '−') + fmtN(Math.abs(r.v * 7700 / 7), 0) + ' kcal/giorno' : ''}</div></div>${n.rate == r.v ? `<span style="color:var(--ember)">${icon('check')}</span>` : ''}</button>`).join('')}</div>
      <div class="section-title">Macro</div>
      <div class="card">
        <div class="row"><div class="grow"><div class="lbl">Proteine</div><div class="small faint">1,6–2,2 g/kg è il range con più evidenze per la massa magra</div></div><div class="stepper"><button data-a="ntStep" data-k="pkg" data-d="-0.1">−</button><span>${fmtN(n.pkg, 1)}</span><button data-a="ntStep" data-k="pkg" data-d="0.1">+</button></div></div>
        <div class="row"><div class="grow"><div class="lbl">Grassi</div><div class="small faint">Non scendere sotto 0,6 g/kg</div></div><div class="stepper"><button data-a="ntStep" data-k="fkg" data-d="-0.1">−</button><span>${fmtN(n.fkg, 1)}</span><button data-a="ntStep" data-k="fkg" data-d="0.1">+</button></div></div>
        <div class="small faint">I carboidrati sono il resto delle calorie.</div>
      </div>` : ''}
      <div class="section-title">Allenamento e riposo</div>
      <div class="card">
        ${!n.manual ? `<div class="row"><div class="grow"><div class="lbl">Mantenimento reale</div><div class="small faint">Ogni lunedì ricalcola il mantenimento dal diario e dal peso delle ultime 4 settimane. Più preciso della formula.</div></div><button class="switch ${n.adapt ? 'on' : ''}" data-a="ntToggle" data-k="adapt" aria-label="Mantenimento reale"></button></div>` : ''}
        <div class="row"><div class="grow"><div class="lbl">Target diversi</div><div class="small faint">Più carboidrati nei giorni di allenamento, meno a riposo. La media settimanale resta uguale.</div></div><button class="switch ${n.cycle ? 'on' : ''}" data-a="ntToggle" data-k="cycle" aria-label="Target diversi"></button></div>
        ${n.cycle ? `<div class="row"><span class="lbl grow">Differenza</span><div class="stepper"><button data-a="ntStep" data-k="delta" data-d="-50">−</button><span>${n.delta}</span><button data-a="ntStep" data-k="delta" data-d="50">+</button></div></div>` : ''}
        <div class="lbl">Giorni di allenamento abituali</div>
        <div class="week">${[...(WLETTER_L[lang()] || WLETTER_L.it)].map((d, k) => `<button class="d" data-a="ntDay" data-k="${k}"><span class="dot ${n.trainDays.includes(k) ? 'on' : ''}">${d}</span></button>`).join('')}</div>
        <div class="small faint">Se registri un allenamento, quel giorno diventa automaticamente "allenamento". Puoi cambiarlo a mano dal diario.</div>
      </div>
    </div></div></div>`;
}

/* ---------- LAYER: analysis ---------- */
const RANGES = [['today', 'Oggi'], ['yday', 'Ieri'], ['7', '7 giorni'], ['30', '30 giorni'], ['90', '90 giorni']];
function statsKeys(r) {
  const today = todayKey(), shift = (k, d) => dkey(kdate(k) + d * DAY + 7200e3);
  if (r === 'today') return [today].filter(k => dayEntries(k).length);
  if (r === 'yday') return [shift(today, -1)].filter(k => dayEntries(k).length);
  const n = +r, since = shift(today, -(n - 1));
  return Object.keys(S.diary).filter(k => k >= since && k <= today && dayEntries(k).length).sort();
}
function layerDietStats(l, i) {
  const r = UI.statsRange || '7', keys = statsKeys(r), nd = keys.length || 1, today = todayKey();
  const tot = zeroNut(), mealSum = Object.fromEntries(MEALS.map(m => [m.k, 0]));
  let bal = 0, balDays = 0, tt = 0, ok = 0;
  const kcalBy = new Map(), cnt = new Map();
  for (const k of keys) {
    const d = dayTotals(k); addNut(tot, d.tot);
    for (const m of MEALS) mealSum[m.k] += d.meals[m.k].kcal;
    const T = targetsFor(k);
    if (T && (k !== today || dayDone(k))) { bal += T.kcal - d.tot.kcal; balDays++; tt += T.kcal; if (Math.abs(d.tot.kcal - T.kcal) <= T.kcal * 0.1) ok++; }
    for (const e of dayEntries(k)) if (e.fid) { kcalBy.set(e.fid, (kcalBy.get(e.fid) || 0) + entryNut(e).kcal); cnt.set(e.fid, (cnt.get(e.fid) || 0) + 1); }
  }
  const allMeal = Object.values(mealSum).reduce((a, b) => a + b, 0) || 1;
  const cols = MEAL_COL;
  const top = [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).filter(([id]) => food(id));
  const topK = [...kcalBy.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).filter(([id]) => food(id));
  const combos = r === 'today' || r === 'yday' ? { list: [] } : foodCombos(+r);
  // quality share
  let qAB = 0, qC = 0, qDE = 0;
  for (const [id, kc] of kcalBy) { const g = nutriScore(food(id)); if (g === 'A' || g === 'B') qAB += kc; else if (g === 'C') qC += kc; else if (g) qDE += kc; }
  const qT = qAB + qC + qDE || 1;
  const balTxt = balDays ? `<div class="card ${bal >= 0 ? '' : ''}"><div class="row"><div class="grow"><div class="eyebrow">${bal >= 0 ? 'Deficit' : 'Surplus'} nel periodo</div><div style="font-family:var(--font-display);font-size:34px;font-weight:800;line-height:1.05;color:${bal >= 0 ? 'var(--steel)' : 'var(--gold)'}" class="tnum">${bal >= 0 ? '−' : '+'}${fmtN(Math.abs(bal), 0)} kcal</div><div class="small muted">≈ ${fmtN(Math.abs(bal) / 7700, 2)} kg di grasso ${bal >= 0 ? 'in meno' : 'in più'} (7700 kcal/kg) · media ${bal >= 0 ? '−' : '+'}${fmtN(Math.abs(bal) / balDays, 0)} kcal/giorno</div></div></div><div class="small faint">Calcolato su ${balDays} ${balDays === 1 ? 'giorno completo' : 'giorni completi'} rispetto ai tuoi target. ${keys.includes(today) && !dayDone(today) ? 'Oggi è escluso finché non è finito. ' : ''}${(() => { const b = weightNow(); return b && b.rate != null ? `Il peso reale (media 7 giorni) va a ${sgn(b.rate, 2)} kg a settimana.` : 'È una stima: il peso reale (Progressi → Corpo) dirà quanto è precisa.'; })()}</div></div>` : '';
  return `<div class="layer">${head('Analisi alimentazione')}
    <div class="layer-body" data-scroll-key="ds${i}"><div class="layer-inner">
      <div class="chips" style="margin:0 -16px">${RANGES.map(([k, n]) => `<button class="chip ${r === k ? 'on' : ''}" data-a="statsRange" data-r="${k}">${n}</button>`).join('')}</div>
      ${!keys.length ? `<div class="empty card">${icon('calendar', 30)}<b>Nessun giorno registrato in questo periodo</b></div>` : `
      <div class="small muted">${keys.length} ${keys.length === 1 ? 'giorno registrato' : 'giorni registrati'}</div>
      <div class="tiles"><div class="tile"><div class="v">${fmtN(tot.kcal / nd, 0)}</div><div class="k">kcal ${nd > 1 ? 'medie' : ''}</div></div><div class="tile"><div class="v">${fmtN(tot.p / nd, 0)}<small>g</small></div><div class="k">Proteine ${nd > 1 ? 'medie' : ''}</div></div><div class="tile"><div class="v">${ok}<small>/${balDays}</small></div><div class="k">Giorni a ±10%</div></div></div>
      ${balTxt}
      <div class="row"><button class="btn grow" data-a="aiRange" ${aiReady() ? '' : 'disabled'}>${icon('sparkle', 16)} Analisi AI</button><button class="btn grow" data-a="copyRange">${icon('copy', 16)} Copia per Claude</button></div>
      <div id="ai-out-range" class="ai-out card tight" hidden></div>
      <div class="card"><div class="section-title">Qualità dei cibi</div>
        <div class="stackbar"><i style="width:${qAB / qT * 100}%;background:#2fbf71"></i><i style="width:${qC / qT * 100}%;background:#f2c230"></i><i style="width:${qDE / qT * 100}%;background:#e5484d"></i></div>
        <div class="legend"><div><span class="sw" style="background:#2fbf71"></span><span class="grow">Buona (A–B)</span><b>${Math.round(qAB / qT * 100)}%</b></div><div><span class="sw" style="background:#f2c230"></span><span class="grow">Media (C)</span><b>${Math.round(qC / qT * 100)}%</b></div><div><span class="sw" style="background:#e5484d"></span><span class="grow">Bassa (D–E)</span><b>${Math.round(qDE / qT * 100)}%</b></div></div>
        <div class="small faint">Percentuale delle calorie per qualità. Prodotti confezionati: Nutri-Score ufficiale di Open Food Facts; cibi base e tuoi: stima con lo stesso metodo.</div></div>
      <div class="card"><div class="section-title">Zuccheri</div>${sugarSplit({ sug: tot.sug / nd, sugF: tot.sugF / nd, sugM: tot.sugM / nd })}<div class="small faint">Media giornaliera. Il limite OMS riguarda solo gli zuccheri aggiunti (arancione): quelli della frutta intera e del latte non contano.</div></div>
      ${microCard(tot, nd, null, true)}
      <div class="card"><div class="section-title">Divisione dei pasti</div>
        <div class="stackbar">${MEALS.map(m => `<i style="width:${mealSum[m.k] / allMeal * 100}%;background:${cols[m.k]}"></i>`).join('')}</div>
        <div class="legend">${MEALS.map(m => `<div><span class="sw" style="background:${cols[m.k]}"></span><span class="grow">${m.n}</span><b class="tnum">${fmtN(mealSum[m.k] / nd, 0)} kcal</b><span class="muted tnum" style="width:40px;text-align:right">${Math.round(mealSum[m.k] / allMeal * 100)}%</span></div>`).join('')}</div>
      </div>
      <div class="stack"><div class="section-title">Cibi più mangiati</div>${top.length ? `<div class="list">${top.map(([id, c], k) => `<div class="li"><span class="rank-n">${k + 1}</span>${gradeChip(food(id), true)}<div class="grow"><div class="t">${esc(food(id).n)}</div><div class="s">${c} volte · ${fmtN(kcalBy.get(id) / nd, 0)} kcal/giorno in media</div></div></div>`).join('')}</div>` : ''}</div>
      ${topK.length ? `<div class="stack"><div class="section-title">Da dove arrivano le calorie</div><div class="list">${topK.map(([id, kc]) => `<div class="li"><div class="grow"><div class="t">${esc(food(id).n)}</div><div class="xpbar" style="margin-top:6px"><i style="width:${kc / topK[0][1] * 100}%"></i></div></div><div class="meta">${Math.round(kc / (tot.kcal || 1) * 100)}%</div></div>`).join('')}</div></div>` : ''}
      ${r !== 'today' && r !== 'yday' ? `<div class="stack"><div class="section-title">Combinazioni frequenti</div>
        ${combos.list.length ? `<div class="list">${combos.list.map(cb => `<div class="li" style="align-items:flex-start"><div class="grow"><div class="t" style="white-space:normal">${cb.ids.map(id => esc(food(id)?.n || '?')).join(' <span class="faint">+</span> ')}</div><div class="s">${cb.c} volte${cb.meal ? ' · soprattutto a ' + MEAL_N[cb.meal].toLowerCase() : ''}${cb.lift && cb.lift > 1.5 ? ' · abbinamento forte' : ''}</div></div><button class="btn sm" data-a="comboSave" data-ids="${cb.ids.join('|')}">${icon('copy', 14)} Salva</button></div>`).join('')}</div>
        <div class="small faint">Analisi dei pasti (market basket): conta quali alimenti finiscono insieme nello stesso pasto.</div>` : `<div class="card tight small muted">Servono almeno due pasti con gli stessi alimenti per trovare combinazioni.</div>`}
      </div>` : ''}`}
    </div></div></div>`;
}

/* ---------- SCANNER (separate overlay so the video survives re-renders) ---------- */
const SCAN = { m: 'b', busy: false, stream: null, track: null, det: null, zr: null, timer: 0, ticking: false, n: 0, cv: null };
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
/* Scanner: our own camera stream at high resolution, continuous focus when the phone allows it, and we decode
   only the strip inside the frame (much more reliable than the whole picture). Native BarcodeDetector when available
   (Android/Chrome), otherwise ZXing with two binarizers and the image also rotated (barcode held vertically). */
async function openScanner(m) {
  SCAN.m = m || mealByTime(); SCAN.busy = false; SCAN.n = 0;
  let host = $('#scanhost'); if (!host) { host = document.createElement('div'); host.id = 'scanhost'; document.body.appendChild(host); }
  host.innerHTML = `<div class="scan">
    <div class="layer-head" style="background:transparent;border:0"><button class="icon-btn solid" data-a="scanClose" aria-label="Chiudi">${icon('x')}</button><h2>Scansiona</h2><button class="icon-btn solid" id="scan-torch" data-a="scanTorch" aria-label="Torcia" hidden>${icon('bolt')}</button></div>
    <video id="scan-video" playsinline muted autoplay></video>
    <div class="scan-frame"><i></i><b class="scan-line"></b></div>
    <div class="scan-foot"><div id="scan-msg" class="small" style="text-align:center">Inquadra il codice a barre dentro il riquadro, a 10–20 cm</div>
      <form class="row" data-form="scanManual"><input class="input" id="scan-code" inputmode="numeric" data-maxlen="14" placeholder="Oppure scrivi il codice (EAN)"><button class="btn primary">Cerca</button></form></div>
  </div>`;
  const msg = t => { const e = $('#scan-msg'); if (e) e.textContent = t; };
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nocam');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    if (!$('#scan-video')) { stream.getTracks().forEach(t => t.stop()); return; }
    SCAN.stream = stream; SCAN.track = stream.getVideoTracks()[0];
    const v = $('#scan-video'); v.srcObject = stream; try { await v.play(); } catch (e) { }
    try {
      const caps = SCAN.track.getCapabilities ? SCAN.track.getCapabilities() : {}, adv = {};
      if (caps.focusMode && caps.focusMode.includes('continuous')) adv.focusMode = 'continuous';
      if (caps.zoom && caps.zoom.max >= 1.6) adv.zoom = Math.min(caps.zoom.max, 1.6);
      if (Object.keys(adv).length) await SCAN.track.applyConstraints({ advanced: [adv] });
      if (caps.torch) { const tb = $('#scan-torch'); if (tb) tb.hidden = false; }
    } catch (e) { }
    if ('BarcodeDetector' in window) {
      try { const fm = await window.BarcodeDetector.getSupportedFormats(); const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(f => fm.includes(f)); if (want.length) SCAN.det = new window.BarcodeDetector({ formats: want }); } catch (e) { SCAN.det = null; }
    }
    if (!SCAN.det) { if (!window.ZXing) { msg('Avvio lo scanner…'); await loadScript('zxing.min.js'); } scanZXingInit(); }
    msg('Inquadra il codice a barre dentro il riquadro, a 10–20 cm');
    clearInterval(SCAN.timer); SCAN.timer = setInterval(scanTick, 120);
  } catch (e) {
    msg(window.FORGIA_PWA ? 'Fotocamera non disponibile: consenti l\'accesso in Impostazioni → Safari → Fotocamera, oppure scrivi il codice qui sotto.' : 'Lo scanner funziona nell\'app installata. Qui puoi scrivere il codice a mano.');
  }
}
function scanZXingInit() {
  const Z = window.ZXing; if (!Z || SCAN.zr) return;
  const hints = new Map();
  hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E]);
  hints.set(Z.DecodeHintType.TRY_HARDER, true);
  SCAN.zr = new Z.MultiFormatReader(); SCAN.zr.setHints(hints);
}
/* decode one canvas with ZXing: hybrid + histogram binarizer, normal and rotated */
function scanDecodeCanvas(cv, rotate) {
  const Z = window.ZXing; if (!Z || !SCAN.zr) return null;
  let lum = new Z.HTMLCanvasElementLuminanceSource(cv);
  if (rotate && lum.isRotateSupported && lum.isRotateSupported()) lum = lum.rotateCounterClockwise();
  for (const Bin of [Z.HybridBinarizer, Z.GlobalHistogramBinarizer]) {
    try { const r = SCAN.zr.decodeWithState(new Z.BinaryBitmap(new Bin(lum))); if (r) return r.getText(); } catch (e) { }
  }
  return null;
}
function eanOk(c) {
  if (!/^\d{8}$|^\d{12,13}$/.test(c)) return false;
  const d = c.padStart(c.length === 8 ? 8 : 13, '0').split('').map(Number), chk = d.pop();
  const sum = d.reverse().reduce((a, v, i) => a + v * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === chk;
}
async function scanTick() {
  if (SCAN.busy || SCAN.ticking) return;
  const v = $('#scan-video'); if (!v) { closeScanner(); return; }
  if (v.readyState < 2 || !v.videoWidth) return;
  SCAN.ticking = true;
  try {
    const vw = v.videoWidth, vh = v.videoHeight, n = ++SCAN.n;
    // the strip inside the on-screen frame (wider for horizontal codes), alternating with a taller box for vertical/close codes
    const tall = n % 3 === 2;
    const cw = Math.round(vw * (tall ? 0.6 : 0.86)), ch = Math.round(vh * (tall ? 0.7 : 0.42));
    const sx = Math.round((vw - cw) / 2), sy = Math.round((vh - ch) / 2);
    const k = Math.min(1, 1280 / cw), w = Math.round(cw * k), h = Math.round(ch * k);
    const cv = SCAN.cv || (SCAN.cv = document.createElement('canvas')); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(v, sx, sy, cw, ch, 0, 0, w, h);
    let code = null;
    if (SCAN.det) { const r = await SCAN.det.detect(cv); if (r && r.length) code = r[0].rawValue; }
    else code = scanDecodeCanvas(cv, tall);
    if (code) { code = String(code).replace(/\D/g, ''); if (eanOk(code) && !SCAN.busy) { SCAN.busy = true; haptic(40); const f = $('.scan-frame'); if (f) f.classList.add('ok'); lookupBarcode(code); } }
  } catch (e) { }
  finally { SCAN.ticking = false; }
}
function closeScanner() {
  clearInterval(SCAN.timer); SCAN.timer = 0;
  try { SCAN.stream && SCAN.stream.getTracks().forEach(t => t.stop()); } catch (e) { }
  SCAN.stream = null; SCAN.track = null; SCAN.busy = false;
  const h = $('#scanhost'); if (h) h.innerHTML = '';
}
async function lookupBarcode(code) {
  code = String(code).replace(/\D/g, '');
  const msg = t => { const e = $('#scan-msg'); if (e) e.textContent = t; };
  const local = Object.values(S.foods).find(f => f.code === code && !f.deleted);
  if (local) { closeScanner(); openAmount(local, { m: SCAN.m }); return; }
  msg('Cerco il prodotto ' + code + '…');
  try {
    const f = await offProduct(code);
    if (f) { OFF_TEMP.set(f.id, f); closeScanner(); openAmount(f, { m: SCAN.m }); return; }
    closeScanner();
    toast('Prodotto non trovato: inserisci i valori dalla confezione');
    pushLayer({ type: 'foodEdit', isNew: true, food: { id: 'c_' + uid(), n: '', brand: '', code, src: 'custom', per: { kcal: '', p: '', c: '', f: '', fib: '', sug: '', sat: '', salt: '' }, serv: null }, then: { m: SCAN.m } });
  } catch (e) {
    SCAN.busy = false;
    msg(navigator.onLine === false ? 'Sei offline: serve internet per cercare il prodotto.' : (window.FORGIA_PWA ? 'Open Food Facts non risponde. Riprova.' : 'La ricerca del codice funziona nell\'app installata.'));
  }
}

/* ---------- diary ops ---------- */
function addEntry(k, entry) { const d = day(k); d.e.push({ id: uid(), t: Date.now(), ...entry }); save(); }
function persistFood(f) { try { microFill(f); } catch (e) { } if (!food(f.id)) { const c = { ...f }; delete c._s; delete c._ix; S.foods[c.id] = c; } return f.id; }

Object.assign(LAYER_RENDER, { food: layerFood, amount: layerAmount, quick: layerQuick, foodEdit: layerFoodEdit, recipe: layerRecipe, myFoods: layerMyFoods, nutri: layerNutri, dietStats: layerDietStats });

Object.assign(A, {
  nutriSetup() { const d = JSON.parse(JSON.stringify(S.nutri || defaultNutri())); const bw = dietWeight(d); if (bw) d.weight = bw; pushLayer({ type: 'nutri', draft: d }); },
  ntSet(el) { const d = topLayer().draft, k = el.dataset.k; d[k] = k === 'sex' ? el.dataset.v : +el.dataset.v; renderLayers(); },
  ntStep(el) { const d = topLayer().draft, k = el.dataset.k; const lim = { pkg: [1.2, 3], fkg: [0.5, 1.5], delta: [100, 600] }[k]; d[k] = +clamp(+(d[k] + +el.dataset.d).toFixed(2), lim[0], lim[1]).toFixed(2); renderLayers(); },
  ntMode(el) { const d = topLayer().draft; d.manual = el.dataset.v === 'manual'; if (d.manual && !d.manTouched) { const b = baseTargets({ ...d, manual: false }); d.man = { kcal: b.kcal, p: b.p, f: b.f }; } renderLayers(); },
  ntToggle(el) { const d = topLayer().draft; d[el.dataset.k] = !d[el.dataset.k]; renderLayers(); },
  ntDay(el) { const d = topLayer().draft, k = +el.dataset.k; d.trainDays = d.trainDays.includes(k) ? d.trainDays.filter(x => x !== k) : [...d.trainDays, k].sort(); renderLayers(); },
  nutriSave() {
    const d = topLayer().draft;
    for (const k of ['age', 'height', 'weight']) if (!(num(d[k]) > 0)) { toast('Controlla età, altezza e peso'); return; }
    d.age = num(d.age); d.height = num(d.height); d.weight = num(d.weight);
    S.nutri = d; save(); popLayer(); render(); toast('Obiettivi salvati');
  },
  dayNav(el) { UI.dietDay = dkey(kdate(UI.dietDay) + +el.dataset.d * DAY + 2 * 3600e3); render(); },
  dayToday() { UI.dietDay = todayKey(); render(); },
  dayType() { const k = UI.dietDay, d = day(k); d.type = dayType(k) === 'train' ? 'rest' : 'train'; save(); render(); },
  mealToggle(el) { S.profile.mealOpen = S.profile.mealOpen || {}; S.profile.mealOpen[el.dataset.m] = !mealOpen(el.dataset.m); save(); render(); },
  foodSearchBar() { A.foodAdd({ dataset: { m: mealByTime(), tab: 'all' } }); setTimeout(() => $('#fd-q')?.focus(), 60); },
  foodAdd(el) { pushLayer({ type: 'food', m: el.dataset.m || mealByTime(), q: '', tab: el.dataset.tab || (Object.keys(S.diary).length ? 'recent' : 'all'), mode: 'log', day: UI.tab === 'diet' ? UI.dietDay : todayKey() }); if (UI.tab !== 'diet') UI.dietDay = todayKey(); },
  foodTab(el) { const l = topLayer(); l.tab = el.dataset.t; renderLayers(); },
  foodOnline() { runOnline(); },
  foodPick(el) {
    const l = topLayer(), f = findAnyFood(el.dataset.id); if (!f) return;
    if (f.src === 'off') OFF_TEMP.set(f.id, f);
    if (l.mode === 'ingredient') openAmount(f, { mode: 'ingredient' });
    else openAmount(f, { m: l.m, day: l.day });
  },
  amMicro() { const l = topLayer(); l.micro = !l.micro; renderLayers(); },
  amUnit(el) {
    const l = topLayer(), f = l.food, q = num(l.qty) || 0;
    if (el.dataset.u === l.unit) return;
    l.qty = el.dataset.u === 'serv' ? String(+(q / f.serv.g).toFixed(2)).replace('.', ',') : String(Math.round(q * f.serv.g)); l.unit = el.dataset.u; renderLayers();
  },
  amMeal(el) { topLayer().m = el.dataset.m; renderLayers(); },
  amSave() {
    const l = topLayer(), f = l.food;
    const q = num(l.qty); if (!(q > 0)) { toast('Inserisci una quantità'); return; }
    const g = +(l.unit === 'serv' && f.serv ? q * f.serv.g : q).toFixed(1);
    if (l.mode === 'ingredient') {
      persistFood(f); UI.layers.pop();
      const fl = topLayer(); if (fl && fl.type === 'food') UI.layers.pop();
      const rl = topLayer(); if (rl && rl.type === 'recipe') rl.draft.ingr.push({ fid: f.id, g });
      renderLayers(); return;
    }
    persistFood(f);
    if (f.cat === 'supp') l.m = 'x';
    if (l.entryId) {
      for (const [k, d] of Object.entries(S.diary)) { const e = (d.e || []).find(x => x.id === l.entryId); if (e) { e.g = g; if (e.m !== l.m) e.m = l.m; } }
      save(); UI.layers.pop(); renderLayers(); render(); toast('Salvato'); return;
    }
    addEntry(l.day, { fid: f.id, g, m: l.m });
    UI.layers.pop();
    const fl = topLayer(); if (fl && fl.type === 'food') UI.layers.pop();
    render(); toast(f.cat === 'supp' ? `${esc(f.n)} aggiunto agli integratori` : `${esc(f.n)} · ${fmtN(f.per.kcal * g / 100, 0)} kcal aggiunte a ${MEAL_N[l.m].toLowerCase()}`);
  },
  entryOpen(el) {
    const k = UI.dietDay, e = dayEntries(k).find(x => x.id === el.dataset.id); if (!e) return;
    if (e.q) {
      pushLayer({ type: 'sheet', title: e.q.n || 'Aggiunta rapida', html: `<p class="muted small" style="margin:0 0 8px">${fmtN(e.q.kcal, 0)} kcal · ${fmtN(e.q.p, 0)} P · ${fmtN(e.q.c, 0)} C · ${fmtN(e.q.f, 0)} G</p>`, items: [{ label: 'Elimina', ic: 'trash', danger: true, fn: () => { day(k).e = day(k).e.filter(x => x !== e); save(); render(); } }] });
      return;
    }
    const f = food(e.fid); if (!f) return;
    const sv = f.cat === 'supp' && f.serv;
    pushLayer({ type: 'amount', food: f, qty: String(sv ? +(e.g / f.serv.g).toFixed(2) : e.g).replace('.', ','), unit: sv ? 'serv' : 'g', m: e.m, mode: 'log', entryId: e.id, day: k });
  },
  entryDelete() { const l = topLayer(); const d = day(l.day); d.e = d.e.filter(x => x.id !== l.entryId); save(); UI.layers.pop(); renderLayers(); render(); toast('Eliminato'); },
  closerAdd(el) { const f = food(el.dataset.id); openAmount(f, { g: +el.dataset.g, m: mealByTime(), day: UI.dietDay }); },
  quickAdd() { const l = topLayer(); pushLayer({ type: 'quick', m: l.m, day: l.day }); },
  quickSave() {
    const l = topLayer();
    const p = num($('#qa-p').value) || 0, c = num($('#qa-c').value) || 0, f = num($('#qa-f').value) || 0;
    const kcal = num($('#qa-k').value) ?? (p * 4 + c * 4 + f * 9);
    if (!(kcal > 0)) { toast('Inserisci almeno le calorie'); return; }
    addEntry(l.day, { q: { n: $('#qa-n').value.trim() || 'Aggiunta rapida', kcal, p, c, f }, m: l.m });
    UI.layers = UI.layers.filter(x => x.type !== 'quick' && x.type !== 'food'); render(); toast('Aggiunto');
  },
  mealMenu(el) {
    const m = el.dataset.m, k = UI.dietDay, list = dayEntries(k).filter(e => e.m === m);
    const yk = dkey(kdate(k) - DAY + 2 * 3600e3), ylist = dayEntries(yk).filter(e => e.m === m);
    pushLayer({
      type: 'sheet', title: MEAL_N[m], items: [
        ...(ylist.length ? [{ label: 'Copia da ieri', desc: ylist.map(entryName).slice(0, 3).join(', '), ic: 'copy', fn: () => { ylist.forEach(e => { const { id, t, ...rest } = e; addEntry(k, rest); }); render(); toast('Pasto copiato'); } }] : []),
        ...(list.filter(e => e.fid).length ? [{ label: 'Salva come pasto', desc: 'Lo riaggiungi con un tap da "Pasti salvati"', ic: 'star', fn: () => { const name = MEAL_N[m] + ' ' + fmtDate(kdate(k)); S.savedMeals.push({ id: uid(), name, items: list.filter(e => e.fid).map(e => ({ fid: e.fid, g: e.g })) }); save(); toast('Pasto salvato come "' + esc(name) + '"'); } }] : []),
        ...(list.length ? [{ label: 'Svuota pasto', ic: 'trash', danger: true, fn: () => { day(k).e = day(k).e.filter(e => e.m !== m); save(); render(); } }] : []),
        ...(!list.length && !ylist.length ? [{ label: 'Aggiungi cibo', ic: 'plus', fn: () => A.foodAdd({ dataset: { m } }) }] : []),
      ]
    });
  },
  savedMealAdd(el) {
    const l = topLayer(), sm = S.savedMeals.find(x => x.id === el.dataset.id); if (!sm) return;
    sm.items.forEach(it => { if (food(it.fid)) addEntry(l.day, { fid: it.fid, g: it.g, m: l.m }); });
    UI.layers.pop(); render(); toast(`"${esc(sm.name)}" aggiunto`);
  },
  savedMealDelete(el) { S.savedMeals = S.savedMeals.filter(x => x.id !== el.dataset.id); save(); renderLayers(); },
  comboSave(el) {
    const ids = el.dataset.ids.split('|'), { lastG } = foodStats(120);
    S.savedMeals.push({ id: uid(), name: ids.map(id => food(id)?.n.split(' (')[0]).join(' + '), items: ids.map(id => ({ fid: id, g: lastG.get(id) || food(id)?.serv?.g || 100 })) });
    save(); toast('Salvato in "Pasti salvati"');
  },
  myFoods() { pushLayer({ type: 'myFoods' }); },
  myFoodOpen(el) {
    const f = food(el.dataset.id); if (!f) return;
    if (f.src === 'recipe') pushLayer({ type: 'recipe', draft: { id: f.id, n: f.n, portions: String(f.portions || 1), cooked: f.cooked || '', ingr: JSON.parse(JSON.stringify(f.ingr || [])) } });
    else pushLayer({ type: 'foodEdit', food: JSON.parse(JSON.stringify(f)) });
  },
  foodNew(el) { const l = topLayer(), supp = el?.dataset?.cat === 'supp'; pushLayer({ type: 'foodEdit', isNew: true, basis: supp ? 'serv' : '100', microOpen: supp, food: { id: 'c_' + uid(), n: l && l.type === 'food' && !supp ? l.q : '', brand: '', code: '', src: 'custom', cat: supp ? 'supp' : '', per: { kcal: '', p: '', c: '', f: '', fib: '', sug: '', sat: '', salt: '' }, serv: supp ? { g: 1, l: '1 capsula' } : null }, then: l && l.type === 'food' && l.mode === 'log' ? { m: l.m } : null }); },
  feCat(el) { topLayer().food.cat = el.dataset.k; renderLayers(); },
  feMicro() { const l = topLayer(); l.microOpen = !l.microOpen; renderLayers(); },
  feBasis(el) {
    const l = topLayer(), to = el.dataset.v; if ((l.basis || '100') === to) return;
    const g = num(l.food.serv?.g);
    if (!(g > 0)) { toast('Prima inserisci il peso della porzione'); return; }
    for (const [k, v] of Object.entries(l.food.per)) { const x = num(v); if (x != null) l.food.per[k] = +(to === 'serv' ? x * g / 100 : x / g * 100).toFixed(3); }
    l.basis = to; renderLayers();
  },
  foodSave() {
    const l = topLayer();
    if (!l.food.n.trim()) { toast('Dai un nome all\'alimento'); return; }
    if (l.basis === 'serv' && !(num(l.food.serv?.g) > 0)) { toast('Inserisci il peso della porzione'); return; }
    const f = feFood100(l); l.food = f; l.basis = '100';
    const iss = f.cat === 'supp' ? [] : foodIssues(f);
    if (iss.length && !l.confirmed) {
      pushLayer({ type: 'confirm', title: 'Controlla i valori', text: iss.join(' ') + ' Vuoi salvarlo lo stesso?', ok: 'Salva comunque', fn: () => { l.confirmed = true; setTimeout(() => A.foodSave(), 0); } });
      return;
    }
    for (const k of MICRO_KEYS) f.per[k] = ['kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'salt'].includes(k) ? (num(f.per[k]) ?? 0) : (num(f.per[k]) ?? null);
    f.per.crea = num(f.per.crea) ?? null;
    if (!f.per.kcal && f.cat !== 'supp') f.per.kcal = Math.round(f.per.p * 4 + f.per.c * 4 + f.per.f * 9);
    if (f.serv && !(num(f.serv.g) > 0)) f.serv = null; else if (f.serv) { f.serv.g = num(f.serv.g); f.serv.l = f.serv.l || '1 porzione'; }
    if (f.est && !f.est.none) { for (const k of f.est.k || []) if (f.per[k] == null) delete f.est; }
    if (!f.noEst && f.cat !== 'supp') { const keep = f.est; delete f.est; if (!microFill(f) && keep) f.est = keep; }
    delete f._s; delete f._ix; S.foods[f.id] = f; save(); UI.layers.pop();
    if (l.then) { const fl = topLayer(); openAmount(f, { m: l.then.m, day: fl?.day || UI.dietDay }); } else { renderLayers(); render(); }
    toast('Alimento salvato');
  },
  foodDelete() { const l = topLayer(); const f = S.foods[l.food.id]; if (f) f.deleted = true; save(); UI.layers.pop(); renderLayers(); toast('Alimento eliminato'); },
  recipeNew() { pushLayer({ type: 'recipe', isNew: true, draft: { id: 'r_' + uid(), n: '', portions: '1', cooked: '', ingr: [] } }); },
  rcAdd() { pushLayer({ type: 'food', mode: 'ingredient', q: '', tab: 'all' }); },
  rcRemove(el) { topLayer().draft.ingr.splice(+el.dataset.k, 1); renderLayers(); },
  recipeSave() {
    const l = topLayer(), r = l.draft;
    if (!r.n.trim()) { toast('Dai un nome alla ricetta'); return; }
    if (!r.ingr.length) { toast('Aggiungi almeno un ingrediente'); return; }
    const c = recipeCalc(r);
    S.foods[r.id] = { id: r.id, n: r.n.trim(), brand: '', src: 'recipe', per: c.per, serv: { g: Math.round(c.portionG), l: '1 porzione' }, ingr: r.ingr, portions: c.portions, cooked: num(r.cooked) || '' };
    save(); UI.layers.pop(); renderLayers(); render(); toast('Ricetta salvata');
  },
  dietStats() { pushLayer({ type: 'dietStats' }); },
  statsRange(el) { UI.statsRange = el.dataset.r; renderLayers(); },
  scanOpen(el) { unlockAudio(); if (UI.tab !== 'diet') UI.dietDay = todayKey(); openScanner(el.dataset.m); },
  scanClose() { closeScanner(); },
  async scanTorch() { const t = SCAN.track; if (!t) return; SCAN.torch = !SCAN.torch; try { await t.applyConstraints({ advanced: [{ torch: SCAN.torch }] }); } catch (e) { toast('Torcia non disponibile'); } $('#scan-torch')?.classList.toggle('on', SCAN.torch); },
});

/* diet inputs */
let foodTimer = null, onlineTimer = null;
document.addEventListener('input', ev => {
  const el = ev.target, k = el.dataset.in; if (!k) return;
  const l = topLayer();
  if (k === 'foodQ') {
    l.q = el.value; l.tab = 'all'; l.online = null; clearTimeout(foodTimer); clearTimeout(onlineTimer);
    foodTimer = setTimeout(() => { refreshFoodList(); document.querySelectorAll('[data-a="foodTab"]').forEach(b => b.classList.toggle('on', b.dataset.t === 'all')); }, 80);
    if (l.q.trim().length >= 3 && l.mode !== 'aiOnly') onlineTimer = setTimeout(() => { if (topLayer() === l && OFF_CACHE.size < 400) runOnline(); }, 1000);
    return;
  }
  if (k === 'amQty') { l.qty = el.value; const f = l.food, q = num(el.value) || 0, g = l.unit === 'serv' && f.serv ? q * f.serv.g : q; const out = $('#am-out'); if (out) out.innerHTML = amountOut(nutOf(f.per, g)); const mi = $('#am-micro'); if (mi) mi.innerHTML = foodMicroHTML(f, g); return; }
  if (k === 'feStr') { l.food[el.dataset.k] = el.value; return; }
  if (k === 'feNut') { l.food.per[el.dataset.k] = el.value; l.confirmed = false; const b = $('#fe-issues'); if (b) b.innerHTML = feIssuesHTML(l); return; }
  if (k === 'feServ') { l.food.serv = l.food.serv || { g: '', l: '' }; l.food.serv[el.dataset.k] = el.value; const b = $('#fe-issues'); if (b) b.innerHTML = feIssuesHTML(l); return; }
  if (k === 'rcStr') { l.draft[el.dataset.k] = el.value; refreshSums(); return; }
  if (k === 'ntNum') { l.draft[el.dataset.k] = el.value; refreshSums(); return; }
  if (k === 'ntMan') { l.draft.man[el.dataset.k] = num(el.value) || 0; l.draft.manTouched = true; refreshSums(); return; }
});
function refreshSums() {
  const l = topLayer(); if (!l) return;
  if (l.type === 'recipe') { const e = $('#rc-sum'); if (e) e.innerHTML = recipeSum(recipeCalc(l.draft)); }
  if (l.type === 'nutri') { const d = { ...l.draft }; for (const k of ['age', 'height', 'weight']) d[k] = num(d[k]) || 0; const e = $('#nt-sum'); if (e) e.innerHTML = nutriSum(d); const c = $('#nt-coach'); if (c) c.innerHTML = coachCard(coachTargets(d), { key: 'ntc', all: true }); }
}
document.addEventListener('submit', ev => {
  const f = ev.target.dataset.form; if (!f) return;
  ev.preventDefault();
  if (f === 'foodSearch') { $('#fd-q')?.blur(); runOnline(); }
  if (f === 'scanManual') { const v = $('#scan-code').value.replace(/\D/g, ''); if (v.length >= 8) lookupBarcode(v); else toast('Il codice ha almeno 8 cifre'); }
});

/* ---------- demo diary ---------- */
function makeDietDemo() {
  const B = [[['b_greco0', 170], ['b_avena', 40], ['b_mirtilli', 80]], [['b_latte_ps', 200], ['b_fette', 30], ['b_marmellata', 20]], [['b_pane', 60], ['b_uovo', 100], ['b_cotto', 40]]];
  const L = [[['b_riso', 90], ['b_pollo_cotto', 150], ['b_olio', 10], ['b_zucchine', 200]], [['b_pasta', 100], ['b_tonno_nat', 80], ['b_olio', 10], ['b_pomodori', 150]], [['b_pasta', 90], ['b_passata', 100], ['b_parmigiano', 10], ['b_olio', 10]]];
  const Dn = [[['b_salmone', 150], ['b_patate', 250], ['b_olio', 10], ['b_insalata', 80]], [['b_bistecca', 200], ['b_pane', 50], ['b_broccoli', 200], ['b_olio', 10]], [['b_es_tortilla', 150], ['b_es_salmorejo', 250], ['b_pane', 40]]];
  const Sn = [[['b_whey', 30], ['b_banana', 120]], [['b_greco0', 170], ['b_mandorle', 20]], [['b_gallette', 24], ['b_bresaola', 50]]];
  for (let d = 14; d >= 1; d--) {
    const k = dkey(Date.now() - d * DAY), dd = day(k), t = kdate(k);
    const pick = (arr, salt) => arr[(d * 7 + salt) % arr.length];
    [['b', pick(B, 1), 8], ['l', pick(L, 2), 13], ['d', pick(Dn, 3), 20], ['s', pick(Sn, d % 2), 17]].forEach(([m, items, h]) => {
      if (m === 's' && d % 3 === 0) return;
      items.forEach(([fid, g]) => dd.e.push({ id: uid(), t: t + h * 3600e3, fid, g, m, demo: true }));
    });
  }
}
function removeDietDemo() { for (const [k, d] of Object.entries(S.diary)) { d.e = (d.e || []).filter(e => !e.demo); if (!d.e.length && !d.type) delete S.diary[k]; } }
