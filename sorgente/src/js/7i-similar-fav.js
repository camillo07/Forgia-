/* =========================================================
   4.8 · Similar exercises · Favourites · Estimated micronutrients
   ========================================================= */

/* ---------- similar exercises ----------
   Score = same primary muscles (most weight) + same movement pattern + same mechanic,
   with a bonus for common gym exercises and the ones you have already done. */
const MOVE_PAT = [
  ['legcurl', /leg curl/], ['legext', /leg extension/], ['calf', /calf/], ['shrug', /shrug|scrollat/],
  ['adduct', /adductor|adduttor/], ['abduct', /abductor|abduttor/],
  ['reardelt', /rear delt|reverse fly|reverse machine fly|face pull|deltoidi posteriori/],
  ['lateral', /lateral raise|side lateral|alzate laterali|laterals?$/], ['front', /front raise|front .*raise/],
  ['fly', /fly|flye|croci|crossover|pec deck|butterfly/],
  ['pullover', /pullover|straight-arm|braccia tese/],
  ['curl', /curl/], ['pushdown', /pushdown|push-down/],
  ['triext', /triceps? extension|skull|french|kickback|overhead triceps|tricipiti sopra/],
  ['lunge', /lunge|affond|split squat|step-?up|bulgar/],
  ['pulldown', /pulldown|lat machine|pull-?ups?|\bchin|trazion/],
  ['row', /row|rematore|pulley/],
  ['squat', /leg press|pressa\b|hack/],
  ['ohp', /shoulder press|military|overhead press|arnold|lento/],
  ['press', /press|bench|panca|push-?up|dips?\b|piegament/],
  ['hinge', /deadlift|stacco|good morning|hip thrust|glute bridge|hyperext|back extension|iperest/],
  ['squat', /squat|leg press|pressa|lunge|affond|step-?up/],
  ['abs', /crunch|sit-?up|leg raise|plank|tuck|ab roll|addominal/],
];
function movePat(x) {
  if (x._mp !== undefined) return x._mp;
  const t = norm((x.n || '') + ' ' + (x.it || ''));
  const m = MOVE_PAT.find(([, re]) => re.test(t));
  return (x._mp = m ? m[0] : '');
}
function angleOf(x) { const t = norm((x.n || '') + ' ' + (x.it || '')); return /incline|inclinat|low-to-high|dal basso/.test(t) ? 'inc' : /decline|declinat/.test(t) ? 'dec' : ''; }
function jacc(a = [], b = []) { if (!a.length || !b.length) return 0; const B = new Set(b); const i = a.filter(m => B.has(m)).length; return i / (new Set([...a, ...b]).size); }
function similarExercises(id, opts = {}) {
  const src = ex(id), pat = movePat(src), ang = angleOf(src), done = new Set(recentExIds());
  const skip = new Set([id, ...(opts.exclude || [])]);
  const out = [];
  for (const x of allExercises()) {
    if (skip.has(x.id) || x.c === 'stretching' || (x.c !== src.c && !x.id.startsWith('c_') && !src.id.startsWith('c_'))) continue;
    const pj = jacc(src.p, x.p); if (!pj) continue;
    const xp = movePat(x), samePat = pat && xp === pat;
    let s = pj * 6 + jacc(src.s, x.s) * 1.5 + (samePat ? 4 : pat && xp ? -3 : 0) + (src.k && src.k === x.k ? 1 : 0);
    if ((pat === 'press' || pat === 'fly') && samePat) s += angleOf(x) === ang ? 1.2 : -1;
    if (POP_RANK.has(x.id)) s += 1.3;
    if (x.e === src.e) s += 0.8;
    if (x.e === 'body only' && src.e !== 'body only' && src.c === 'strength') s -= 1;
    if (done.has(x.id)) s += 1;
    if (isFav('ex', x.id)) s += 0.8;
    if (x.l === 'expert') s -= 1;
    if (!x.img && !x.im && !x.id.startsWith('c_')) s -= 0.3;
    out.push({ x, s, samePat, sameEq: x.e === src.e });
  }
  out.sort((a, b) => b.s - a.s);
  // variety: at most 3 with the same equipment
  const perEq = {}, res = [];
  for (const r of out) { if ((perEq[r.x.e] = (perEq[r.x.e] || 0) + 1) > 3) continue; res.push(r); if (res.length >= (opts.n || 8)) break; }
  return res;
}
function simReason(r, src) {
  const bits = [];
  bits.push(r.samePat ? 'stesso movimento' : 'stessi muscoli');
  bits.push(r.sameEq ? 'stesso attrezzo' : 'con ' + (r.x.e !== 'other' && EQUIP_IT[r.x.e] ? EQUIP_IT[r.x.e] : 'altro attrezzo').toLowerCase());
  const last = lastSession(r.x.id, S.active?.id);
  if (last) { const ws = workSets(last.e).slice().sort((a, b) => (b.kg || 0) - (a.kg || 0) || (b.r || 0) - (a.r || 0)); if (ws[0]) bits.push('ultima: ' + fmtSet(ws[0], mtOf(last.e))); }
  return bits.join(' · ');
}
function similarRowsHTML(l) {
  const src = ex(l.ref), exclude = l.target === 'workout' && S.active ? S.active.ex.map(e => e.id) : l.target === 'routine' ? (UI.layers.find(x => x.type === 'routine')?.draft.ex || []).map(e => e.id) : [];
  const list = similarExercises(l.ref, { exclude });
  const q = norm(l.q).split(/\s+/).filter(Boolean);
  const rows = list.filter(r => !q.length || q.every(w => (r.x._s || (r.x._s = searchText(r.x))).includes(w)));
  return `<div class="sim-head">${icon('sparkle', 16)}<span>Simili a <b>${esc(src.n)}</b></span></div>` +
    (rows.length ? rows.map(r => pickRowHTML(r.x, l, simReason(r, src))).join('') : `<div class="empty"><span class="small">Nessun esercizio simile trovato.</span></div>`) +
    `<div class="small faint" style="padding:10px 16px 16px">Ordinati per muscoli, movimento e attrezzo. Tocca "Tutti" per cercare liberamente.</div>`;
}

/* ---------- favourites (exercises and foods) ---------- */
function favList(kind) { const k = kind === 'ex' ? 'favEx' : 'favFood'; if (!Array.isArray(S[k])) S[k] = []; return S[k]; }
function isFav(kind, id) { return favList(kind).includes(id); }
function favBtn(kind, id, size = 20) {
  const on = isFav(kind, id);
  return `<button class="icon-btn fav-btn ${on ? 'on' : ''}" data-a="favToggle" data-k="${kind}" data-id="${esc(id)}" aria-label="${on ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'}" aria-pressed="${on}">${icon('star', size)}</button>`;
}
function favChip(on, action, extra = '') { return `<button class="chip fav ${on ? 'on' : ''}" data-a="${action}" ${extra}>${icon('star', 14)} Preferiti</button>`; }

/* one exercise row in the picker, with the star (and the info button when picking several) */
function pickRowHTML(x, l, sub) {
  const multi = l.mode === 'add' || l.mode === 'routine';
  const sel = multi && l.sel.includes(x.id);
  return `<div class="li pk-row" style="${sel ? 'background:var(--warm-bg)' : ''}"><button class="row grow" data-a="pickEx" data-id="${esc(x.id)}" style="text-align:left;min-width:0;gap:12px">${thumbHTML(x)}<div class="grow" style="min-width:0"><div class="t">${esc(x.n)}</div><div class="s">${sub || ((x.p || []).map(m => MUSCLE_IT[m]).join(', ') || CAT_IT[x.c] || '') + ' · ' + (EQUIP_IT[x.e] || 'Altro')}</div></div>${sel ? `<span class="chip warm">${l.sel.indexOf(x.id) + 1}</span>` : ''}</button>${favBtn('ex', x.id)}${multi ? `<button class="icon-btn" data-a="openEx" data-id="${esc(x.id)}" aria-label="Esecuzione e muscoli">${icon('info', 20)}</button>` : ''}</div>`;
}

/* ---------- estimated micronutrients ----------
   Packaged products (Open Food Facts) and foods you create usually have only the label values.
   We copy the missing micronutrients from the most similar food of the CIQUAL database
   (same name words, same category, similar macros), and mark them as estimated. */
const EST_KEYS = ['fib', 'k', 'ca', 'fe', 'mg', 'zn', 'se', 'vita', 'vitd', 'vite', 'vitc', 'b6', 'b9', 'b12', 'om3'];
const EST_STOP = new Set(['di', 'del', 'della', 'dei', 'delle', 'con', 'al', 'alla', 'allo', 'ai', 'e', 'in', 'da', 'per', 'senza', 'bio', 'biologico', 'light', 'zero', 'gusto', 'tipo', 'the', 'and', 'with', 'de', 'la', 'el', 'y', 'g', 'gr', 'ml', 'kg', 'pz', 'x', 'conf', 'confezione', 'classico', 'classica', 'original', 'naturale', 'italiano', 'italiana', 'fresco', 'fresca', 'prodotto']);
const EST_SIMPLE = new Set(['meat', 'fish', 'dairy', 'egg', 'cer', 'tub', 'leg', 'veg', 'fr', 'fd', 'nut', 'fat', 'fj']);
let EST_POOL = null;
function estPool() {
  if (EST_POOL) return EST_POOL;
  EST_POOL = [...BASE_FOODS.values()].filter(f => f.cat !== 'supp' && foodMicroKnown(f) >= 9).map(f => ({ f, t: new Set(tokens((f.nIt || f.n) + ' ' + (f.a || '')).filter(w => !EST_STOP.has(w) && !/^\d/.test(w)).map(stem)) }));
  return EST_POOL;
}
function estNeeds(f) {
  if (!f || !f.per || f.cat === 'supp' || f.src === 'recipe' || f.noEst || f.est) return false;
  return EST_KEYS.filter(k => k !== 'fib' && f.per[k] == null).length >= 6;
}
function estMatch(f) {
  const brand = new Set(tokens(f.brand || ''));
  const words = [...new Set(tokens(f.n).filter(w => !EST_STOP.has(w) && !brand.has(w) && !/^\d/.test(w) && w.length > 1))].map(w => ({ v: stem(w), syn: (SYN[w] || '').split(' ').filter(Boolean).map(stem) }));
  const P = f.per, kc = Math.max(1, P.kcal || 0);
  let best = null;
  for (const r of estPool()) {
    if (r.f.id === f.id) continue;
    let hit = 0;
    for (const { v, syn } of words) { if (r.t.has(v)) hit += 1; else if (syn.some(x => r.t.has(x))) hit += 0.9; else if (v.length > 4) { for (const t of r.t) if (t.length > 4 && t[0] === v[0] && lev1(v, t)) { hit += 0.6; break; } } }
    const nameS = words.length ? hit / words.length : 0;
    const R = r.f.per;
    const d = (Math.abs((P.p || 0) - (R.p || 0)) + Math.abs((P.c || 0) - (R.c || 0)) + Math.abs((P.f || 0) - (R.f || 0))) / 100;
    const macroS = Math.max(0, 1 - d * 2.5) * (1 - Math.min(1, Math.abs(Math.log(kc / Math.max(1, R.kcal || 1))) / 1.2));
    const catS = f.cat && r.f.cat ? (f.cat === r.f.cat ? 1 : -1) : 0;
    const s = nameS * 5 + macroS * 3 + catS * 1.5 + (hit ? Math.min(1, hit / Math.max(1, r.t.size)) : 0);
    if (!best || s > best.s) best = { r, s, nameS, macroS, catS };
  }
  if (!best) return null;
  const byName = best.nameS >= 0.5 && best.macroS > 0.25;
  const byCat = best.catS > 0 && EST_SIMPLE.has(f.cat) && best.macroS > 0.65;
  if (!byName && !byCat) return null;
  return { f: best.r.f, how: byName ? 'nome' : 'categoria' };
}
function microFill(f) {
  if (!estNeeds(f)) return false;
  const m = estMatch(f); if (!m) { f.est = { none: 1 }; return true; }
  const R = m.f.per, scale = m.how === 'nome' ? 1 : clamp((f.per.kcal || 0) / Math.max(1, R.kcal || 1), 0.5, 2);
  const keys = [];
  for (const k of EST_KEYS) if (f.per[k] == null && R[k] != null) { f.per[k] = +(R[k] * scale).toFixed(3); keys.push(k); }
  f.est = { from: m.f.id, n: m.f.n, how: m.how, k: keys };
  return true;
}
function microUnfill(f) { if (!f || !f.est) return; for (const k of f.est.k || []) f.per[k] = null; delete f.est; f.noEst = true; }
/* runs on start and after a sync: base foods without micros, saved foods, then recipes that use them */
function microFillAll() {
  let changed = false;
  for (const f of BASE_FOODS.values()) if (f.cat !== 'supp' && estNeeds(f)) microFill(f);
  const touched = new Set();
  for (const f of Object.values(S.foods || {})) if (!f.deleted && estNeeds(f) && microFill(f)) { touched.add(f.id); changed = true; }
  for (const f of Object.values(S.foods || {})) {
    if (f.src !== 'recipe' || !Array.isArray(f.ingr) || f.deleted) continue;
    const c = recipeCalc(f), was = JSON.stringify(f.per);
    if (f.ingr.some(it => touched.has(it.fid) || BASE_FOODS.get(it.fid)?.est) && JSON.stringify(c.per) !== was) { f.per = c.per; changed = true; }
  }
  if (changed) CACHE.k = null;
  return changed;
}
function estNoteHTML(f) {
  if (!f.est || f.est.none || !(f.est.k || []).length) return '';
  return `<div class="est-note">${icon('sparkle', 14)}<span>Valori in <i>corsivo</i> stimati da <b>${esc(food(f.est.from)?.n || f.est.n)}</b> (banca dati CIQUAL${f.est.how === 'categoria' ? ', stessa categoria' : ''}). L'etichetta non li riporta.</span>${f.src !== 'base' ? `<button class="link" data-a="estOff">Togli stima</button>` : ''}</div>`;
}

Object.assign(A, {
  favToggle(el) {
    const kind = el.dataset.k, id = el.dataset.id, list = favList(kind), i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    else {
      list.unshift(id);
      if (kind === 'food') { const f = findAnyFood(id); if (f && !food(id)) { microFill(f); persistFood(f); } }
    }
    save(); haptic(12);
    const on = i < 0;
    document.querySelectorAll(`.fav-btn[data-k="${kind}"][data-id="${CSS.escape(id)}"]`).forEach(b => { b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', on ? 'Togli dai preferiti' : 'Aggiungi ai preferiti'); });
    toast(on ? icon('star', 16) + ' Aggiunto ai preferiti' : 'Tolto dai preferiti');
    const l = topLayer();
    if (!on && l && ((l.type === 'picker' && l.g === 'fav') || (l.type === 'food' && l.tab === 'fav'))) l.type === 'picker' ? refreshPicker(false) : refreshFoodList();
  },
  pickSimilar(el) { const l = topLayer(); l.g = 'similar'; refreshPicker(true); },
  suggestSimilar(el) {
    const ei = +el.dataset.ei, target = el.dataset.t || 'workout';
    const id = target === 'workout' ? S.active?.ex[ei]?.id : topLayer().draft?.ex[ei]?.id;
    if (!id) return;
    pushLayer({ type: 'picker', mode: 'replace', target, ei, ref: id, q: '', g: 'similar', eq: '', sel: [] });
  },
  estOff() {
    const l = topLayer(), f = l && l.food; if (!f) return;
    microUnfill(f); const sf = S.foods[f.id]; if (sf && sf !== f) microUnfill(sf);
    save(); renderLayers(); toast('Stima tolta: restano solo i valori dell\'etichetta');
  },
});
