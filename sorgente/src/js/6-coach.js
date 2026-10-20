/* =========================================================
   COACH: qualità dei cibi, micronutrienti, consigli, AI
   ========================================================= */

/* ---------- food quality (Nutri-Score style estimate) ---------- */
function pts(v, steps) { let p = 0; for (const s of steps) if (v > s) p++; return p; }
const OLIVE_LIKE = /olio (extravergine|d'oliva|di oliva|di colza|di noci|di lino)/i;
function nutriScore(f) {
  if (!f || !f.per || f.cat === 'supp') return '';
  if (f.ns) return f.ns;
  const P = f.per, cat = f.cat || '';
  const kj = (P.kcal || 0) * 4.184, sug = P.sug || 0, sat = P.sat || 0, na = (P.salt || 0) * 400, fib = P.fib || 0, pro = P.p || 0;
  const fv = ['fr', 'fd', 'veg', 'leg', 'nut'].includes(cat) || OLIVE_LIKE.test(f.n) ? 100 : cat === 'fj' ? 100 : cat === 'dish' ? 25 : 0;
  if (['drink', 'fj', 'alc'].includes(cat)) {
    if (cat === 'alc') return 'E';
    if ((P.kcal || 0) < 2 && sug < 0.5) return 'A';
    const N = pts(kj, [0, 30, 60, 90, 120, 150, 180, 210, 240, 270]) + pts(sug, [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5]) + pts(sat, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) + pts(na, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);
    const Pp = (fv > 80 ? 10 : fv > 60 ? 4 : fv > 40 ? 2 : 0) + pts(fib, [0.9, 1.9, 2.8, 3.7, 4.7]) + pts(pro, [1.6, 3.2, 4.8, 6.4, 8.0]);
    const s = N - Pp; return s <= 1 ? 'B' : s <= 5 ? 'C' : s <= 9 ? 'D' : 'E';
  }
  let N = pts(kj, [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350]) + pts(sug, [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45]) + pts(na, [90, 180, 270, 360, 450, 540, 630, 720, 810, 900]);
  if (cat === 'fat' && (P.f || 0) > 0) N += pts(sat / P.f * 100, [10, 16, 22, 28, 34, 40, 46, 52, 58, 64]);
  else N += pts(sat, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const fvp = fv > 80 ? 5 : fv > 60 ? 2 : fv > 40 ? 1 : 0;
  const Pp = fvp + pts(fib, [0.9, 1.9, 2.8, 3.7, 4.7]) + (N >= 11 && fvp < 5 && cat !== 'dairy' ? 0 : pts(pro, [1.6, 3.2, 4.8, 6.4, 8.0]));
  const s = N - Pp;
  return s <= -1 ? 'A' : s <= 2 ? 'B' : s <= 10 ? 'C' : s <= 18 ? 'D' : 'E';
}
const GRADE_COL = { A: '#2fbf71', B: '#8bcf3f', C: '#f2c230', D: '#f08a2a', E: '#e5484d' };
function gradeChip(f, small) {
  const g = nutriScore(f); if (!g) return '';
  return `<span class="ns ${small ? 'sm' : ''}" style="background:${GRADE_COL[g]}" title="Qualità ${f.ns ? 'Nutri-Score' : 'stimata'}: ${g}">${g}</span>`;
}

/* ---------- micronutrients ---------- */
const MICROS = [
  { k: 'fib', n: 'Fibre', u: 'g', ref: () => 30 },
  { k: 'k', n: 'Potassio', u: 'mg', ref: () => 3500 },
  { k: 'ca', n: 'Calcio', u: 'mg', ref: () => 1000 },
  { k: 'fe', n: 'Ferro', u: 'mg', ref: s => s === 'f' ? 18 : 10 },
  { k: 'mg', n: 'Magnesio', u: 'mg', ref: s => s === 'f' ? 300 : 350 },
  { k: 'zn', n: 'Zinco', u: 'mg', ref: s => s === 'f' ? 9 : 12 },
  { k: 'se', n: 'Selenio', u: 'µg', ref: () => 55 },
  { k: 'vita', n: 'Vitamina A', u: 'µg', ref: s => s === 'f' ? 600 : 700 },
  { k: 'vitc', n: 'Vitamina C', u: 'mg', ref: s => s === 'f' ? 85 : 105 },
  { k: 'vitd', n: 'Vitamina D', u: 'µg', ref: () => 15 },
  { k: 'vite', n: 'Vitamina E', u: 'mg', ref: s => s === 'f' ? 11 : 13 },
  { k: 'b6', n: 'Vitamina B6', u: 'mg', ref: () => 1.3 },
  { k: 'b9', n: 'Folati (B9)', u: 'µg', ref: () => 400 },
  { k: 'b12', n: 'Vitamina B12', u: 'µg', ref: () => 2.4 },
  { k: 'om3', n: 'Omega-3', u: 'g', ref: () => 2 },
  { k: 'crea', n: 'Creatina', u: 'g', ref: () => 5 },
];
const MICRO_TIPS = {
  crea: 'Con la dieta ne assumi circa 1 g al giorno (carne e pesce, stima). Per i benefici sulla forza servono 3–5 g al giorno di integratore, tutti i giorni, anche quelli di riposo.',
  vitd: 'La vitamina D arriva soprattutto dal sole (15–20 min al giorno su braccia e viso). Con il cibo è difficile arrivarci: pesce grasso e uova aiutano; in inverno valuta un integratore con il medico.',
  b12: 'Si trova solo in alimenti animali o fortificati. Se mangi poca carne, pesce, uova o latticini, valuta un integratore.',
  om3: 'Pesce grasso (salmone, sgombro, sardine) 2 volte a settimana, oppure noci, semi di lino o chia.',
  fe: 'Il ferro dei vegetali si assorbe meglio con vitamina C nello stesso pasto (agrumi, peperoni, kiwi).',
};
function microRef(m) { return m.ref(S.nutri?.sex || 'm'); }
function microRows(tot, daysN = 1, k) {
  return MICROS.map(m => { const v = (tot[m.k] || 0) / daysN, r = microRef(m); return { ...m, v, r, pct: r ? v / r : 0, cov: k && m.k !== 'crea' ? microCoverage(k, m.k) : 1 }; });
}
/* best foods for a nutrient: per typical portion, preferring foods you already eat */
function microSources(key, n = 6, by = 'serv') {
  const freq = new Set(frequentFoods(30));
  const list = [];
  for (const f of [...BASE_FOODS.values(), ...Object.values(S.foods)]) {
    const v = f.per && (key === 'crea' ? creaPer(f.per, f) : f.per[key]); if (!v || f.deleted) continue;
    if (['alc', 'sweet', 'sauce', 'other', 'supp'].includes(f.cat)) continue;
    const g = f.serv?.g || 100, amount = v * g / 100, kcal = (f.per.kcal || 0) * g / 100;
    if (amount <= 0) continue;
    const density = amount / Math.max(40, kcal);
    const base = by === '100' ? v : density;
    list.push({ f, g, amount, kcal, v100: v, score: base * (freq.has(f.id) ? (by === '100' ? 1.3 : 2.2) : 1) * (nutriScore(f) <= 'B' ? 1.1 : 1) });
  }
  return list.sort((a, b) => b.score - a.score).slice(0, n);
}

function microSheetHTML(k, by) {
  const m = MICROS.find(x => x.k === k), src = microSources(k, 8, by), ref = microRef(m), dec = v => v < 10 ? 1 : 0;
  return `<p class="small muted" style="margin:0 0 10px">Riferimento giornaliero: ${fmtN(ref, 1)} ${m.u}. ${MICRO_TIPS[k] || ''}</p>
    <div class="row" style="margin-bottom:8px"><span class="eyebrow grow">Dove trovarlo</span><div class="seg" style="width:200px"><button class="${by === 'serv' ? 'on' : ''}" data-a="microBy" data-v="serv">Per porzione</button><button class="${by === '100' ? 'on' : ''}" data-a="microBy" data-v="100">Per 100 g</button></div></div>
    <div class="msrc-h small faint"><span class="grow">Alimento</span><span>100 g</span><span>Porzione</span></div>
    ${src.map(s => `<div class="msrc"><div class="grow" style="min-width:0"><div class="t">${esc(s.f.n)} ${gradeChip(s.f, true)}</div><div class="s">porzione ${fmtN(s.g, 0)} g · ${fmtN(s.kcal, 0)} kcal</div></div><span class="tnum ${by === '100' ? 'hl' : ''}">${fmtN(s.v100, dec(s.v100))} ${m.u}</span><span class="tnum ${by === 'serv' ? 'hl' : ''}">${fmtN(s.amount, dec(s.amount))} ${m.u}<small>${Math.round(s.amount / ref * 100)}%</small></span></div>`).join('')}
    <div class="small faint" style="margin-top:8px">${by === 'serv' ? 'Ordinati per quantità rispetto alle calorie della porzione, dando priorità ai cibi che mangi già.' : 'Ordinati per contenuto su 100 g.'}</div>`;
}

/* ---------- coach rules ---------- */
function msg(lvl, text, act) { return { lvl, text, act }; }
function coachTargets(n = S.nutri) {
  if (!n) return [];
  const out = [], b = baseTargets(n), w = num(n.weight) || 70, bm = bmr({ ...n, weight: w, height: num(n.height) || 175, age: num(n.age) || 25 }), td = bm * n.act;
  if (b.kcal < bm * 1.05) out.push(msg('bad', `Obiettivo di ${fmtN(b.kcal, 0)} kcal: è sotto il tuo metabolismo basale (~${fmtN(bm, 0)} kcal). Rischi di perdere massa muscolare e di non recuperare dagli allenamenti. Alza le calorie o riduci il deficit.`));
  else if (b.kcal < td - 1000) out.push(msg('warn', `Deficit di oltre 1000 kcal al giorno: è aggressivo. Per mantenere i muscoli mentre ti alleni seriamente, punta a perdere 0,5–1% del peso a settimana.`));
  if (!n.manual && Math.abs(n.rate) / w > 0.01) out.push(msg('warn', `Il ritmo scelto supera l'1% del peso corporeo a settimana. È sostenibile solo per poche settimane.`));
  if (n.manual && Math.abs(b.kcal - td) / td > 0.25) out.push(msg('warn', `Le calorie manuali sono il ${Math.round(Math.abs(b.kcal - td) / td * 100)}% ${b.kcal > td ? 'sopra' : 'sotto'} il mantenimento stimato (${fmtN(td, 0)} kcal). Va bene se te l'ha dato un professionista, altrimenti ricontrolla.`));
  const pk = b.p / w, fk = b.f / w;
  if (pk < 1.6) out.push(msg('warn', `Proteine a ${fmtN(pk, 1)} g/kg: per chi si allena con i pesi conviene stare tra 1,6 e 2,2 g/kg.`));
  else if (pk > 2.8) out.push(msg('info', `Proteine a ${fmtN(pk, 1)} g/kg: oltre 2,2–2,5 g/kg i benefici sono minimi. Puoi spostare calorie sui carboidrati per allenarti meglio.`));
  else out.push(msg('good', `Proteine a ${fmtN(pk, 1)} g/kg: nel range ottimale per la massa magra.`));
  if (fk < 0.6) out.push(msg('warn', `Grassi a ${fmtN(fk, 1)} g/kg: sotto 0,6 g/kg possono risentirne ormoni e assorbimento delle vitamine.`));
  if (b.c / w < 2.5 && n.rate >= 0) out.push(msg('info', `Carboidrati bassi (${fmtN(b.c / w, 1)} g/kg) per una fase di massa: con più carboidrati di solito rendi meglio in palestra.`));
  if (n.manual) out.push(msg('info', 'Modalità manuale: l\'app usa i tuoi numeri così come sono. In Progressi → Corpo vedi se il peso si muove come previsto.'));
  return out;
}
function dayDone(k) { return k < todayKey() || new Date().getHours() >= 20; }
function coachDay(k) {
  const T = targetsFor(k), ents = dayEntries(k);
  if (!T || !ents.length) return [];
  const { tot } = dayTotals(k), out = [], done = dayDone(k);
  const pct = x => Math.round(x * 100);
  if (done) {
    if (tot.kcal < T.kcal * 0.8) out.push(msg('warn', `Hai mangiato il ${pct(tot.kcal / T.kcal)}% delle calorie. Se manca qualcosa nel diario, aggiungilo: altrimenti oggi il deficit è più grande del previsto.`));
    else if (tot.kcal > T.kcal * 1.1) out.push(msg('warn', `${fmtN(tot.kcal - T.kcal, 0)} kcal sopra l'obiettivo. Nessun dramma: conta la media della settimana.`));
    else out.push(msg('good', 'Calorie centrate: entro il 10% dell\'obiettivo.'));
    if (tot.p < T.p * 0.85) out.push(msg('warn', `Proteine al ${pct(tot.p / T.p)}% (${fmtN(tot.p, 0)}/${T.p} g). Prova "Chiudi i macro" o aggiungi una fonte proteica a cena.`));
  }
  const free = tot.sug - tot.sugF - tot.sugM, freeLim = T.kcal * 0.1 / 4;
  if (free > freeLim) out.push(msg('warn', `Zuccheri aggiunti/liberi: ${fmtN(free, 0)} g, oltre il limite OMS di ~${fmtN(freeLim, 0)} g (10% delle calorie). Quelli della frutta (${fmtN(tot.sugF, 0)} g) e del latte (${fmtN(tot.sugM, 0)} g) non contano.`));
  if (done && tot.fib < 20) out.push(msg('warn', `Fibre a ${fmtN(tot.fib, 0)} g (obiettivo ~30 g). Aggiungi verdura, legumi, frutta o cereali integrali.`));
  if (tot.salt > 6) out.push(msg('warn', `Sale a ${fmtN(tot.salt, 1)} g: il limite consigliato è 5 g. Attento a salumi, formaggi stagionati, pane e piatti pronti.`));
  if (tot.sat > T.sat * 1.2) out.push(msg('info', `Grassi saturi a ${fmtN(tot.sat, 0)} g (limite consigliato ~${T.sat} g).`));
  const q = dayQuality(k);
  if (q.de > 0.35) out.push(msg('warn', `Il ${pct(q.de)}% delle calorie arriva da alimenti di qualità bassa (D/E): ${q.worst.slice(0, 2).map(esc).join(', ')}. Prova a sostituirne uno con un'alternativa A/B.`));
  else if (q.ab > 0.6 && ents.length >= 4) out.push(msg('good', `Il ${pct(q.ab)}% delle calorie arriva da alimenti di buona qualità (A/B).`));
  const fv = ents.reduce((a, e) => { const f = e.fid && food(e.fid); return a + (f && ['fr', 'veg'].includes(f.cat) ? e.g : 0); }, 0);
  const left = T.kcal - tot.kcal;
  if (done && fv < 400) out.push(msg('info', `Frutta e verdura: ${fmtN(fv, 0)} g. L'obiettivo è 400 g al giorno (circa 5 porzioni).`));
  else if (!done && fv < 300 && left > 0 && left <= 600) out.push(msg('warn', `Ti restano ${fmtN(left, 0)} kcal e di frutta e verdura sei a ${fmtN(fv, 0)} g su 400. Usa queste calorie lì: 200 g di verdura sono 40–60 kcal, un frutto 60–90 kcal. Riempiono, portano fibre e micronutrienti.`));
  if (done) {
    const low = microRows(tot, 1, k).filter(m => m.k !== 'fib' && m.cov > 0.6 && m.pct < 0.5);
    if (low.length >= 3) out.push(msg('info', `Micronutrienti bassi oggi: ${low.slice(0, 4).map(m => m.n).join(', ')}. Tocca la scheda Micronutrienti per vedere dove trovarli.`));
  }
  return out;
}
function dayQuality(k) {
  let tot = 0, ab = 0, de = 0; const bad = new Map();
  for (const e of dayEntries(k)) {
    const f = e.fid && food(e.fid); if (!f) continue;
    const kc = entryNut(e).kcal, g = nutriScore(f); tot += kc;
    if (g === 'A' || g === 'B') ab += kc; if (g === 'D' || g === 'E') { de += kc; bad.set(f.n, (bad.get(f.n) || 0) + kc); }
  }
  return { ab: tot ? ab / tot : 0, de: tot ? de / tot : 0, worst: [...bad.entries()].sort((a, b) => b[1] - a[1]).map(x => x[0]) };
}
/* custom food sanity check */
function foodIssues(f) {
  const P = f.per, out = [];
  const p = num(P.p) || 0, c = num(P.c) || 0, fa = num(P.f) || 0, fib = num(P.fib) || 0, kcal = num(P.kcal);
  const calc = p * 4 + c * 4 + fa * 9 + fib * 2;
  if (p + c + fa + fib > 101) out.push('Proteine + carboidrati + grassi + fibre superano 100 g su 100 g: controlla i valori.');
  if (kcal != null && calc > 20 && Math.abs(kcal - calc) > Math.max(25, calc * 0.15)) out.push(`Con questi macro le calorie dovrebbero essere circa ${fmtN(calc, 0)} kcal, non ${fmtN(kcal, 0)}. Forse hai copiato i valori per porzione invece che per 100 g, o i kJ al posto delle kcal.`);
  if ((num(P.sug) || 0) > c + 0.5) out.push('Gli zuccheri non possono essere più dei carboidrati.');
  if ((num(P.sat) || 0) > fa + 0.5) out.push('I grassi saturi non possono essere più dei grassi totali.');
  if ((num(P.salt) || 0) > 10) out.push('Sale oltre 10 g per 100 g: è un valore da dado o salsa di soia, controlla.');
  return out;
}
function coachCard(list, opts = {}) {
  if (!list.length && !opts.ai) return '';
  const ic = { good: 'check', warn: 'info', bad: 'info', info: 'sparkle' };
  const max = opts.max || 3;
  const shown = opts.all ? list : list.slice(0, max);
  return `<div class="card tight coach"><div class="row"><span class="coach-ic">${icon('sparkle', 18)}</span><b class="grow">Coach</b>${opts.ai ? `<button class="btn sm" data-a="${opts.ai}" ${opts.aiData || ''}>${icon('bolt', 14)} Analisi AI</button>` : ''}</div>
    ${shown.map(m => `<div class="cm ${m.lvl}"><span>${icon(ic[m.lvl], 16)}</span><div>${m.text}</div></div>`).join('')}
    ${list.length > shown.length ? `<button class="link small" data-a="coachAll" data-k="${opts.key || ''}" style="color:var(--gold);text-align:left">Mostra altri ${list.length - shown.length} consigli</button>` : ''}
    <div id="ai-out-${opts.key || 'x'}" class="ai-out" hidden></div>
  </div>`;
}

/* ---------- micro & sugar UI ---------- */
function sugarSplit(tot) {
  const free = Math.max(0, tot.sug - tot.sugF - tot.sugM);
  return `<div class="sugsplit"><div class="row small"><span class="grow muted">Zuccheri ${fmtN(tot.sug, 0)} g</span><span><i class="sw" style="background:#3ddc97"></i> frutta ${fmtN(tot.sugF, 0)}</span><span><i class="sw" style="background:#7fb2e5"></i> latte ${fmtN(tot.sugM, 0)}</span><span><i class="sw" style="background:#ff6b2c"></i> altri ${fmtN(free, 0)}</span></div>
    <div class="stackbar" style="height:8px">${tot.sug ? `<i style="width:${tot.sugF / tot.sug * 100}%;background:#3ddc97"></i><i style="width:${tot.sugM / tot.sug * 100}%;background:#7fb2e5"></i><i style="width:${free / tot.sug * 100}%;background:#ff6b2c"></i>` : ''}</div></div>`;
}
function microCard(tot, daysN, k, open) {
  const rows = microRows(tot, daysN, k);
  const ok = rows.filter(r => r.pct >= 1).length;
  return `<div class="card tight"><button class="row" data-a="toggleMicro" style="text-align:left"><b class="grow">Micronutrienti</b><span class="small muted">${ok}/${rows.length} a obiettivo</span>${icon(open ? 'up' : 'down', 18)}</button>
    ${open ? `<div class="micros">${rows.map(r => { const col = r.pct >= 1 ? 'var(--good)' : r.pct >= 0.5 ? 'var(--gold)' : 'var(--bad)'; return `<button class="mrow" data-a="microInfo" data-k="${r.k}"><span class="mn">${r.n}</span><span class="mtrack"><i style="width:${Math.min(100, r.pct * 100)}%;background:${col}"></i></span><span class="mv tnum">${fmtN(r.v, r.v < 10 ? 1 : 0)} <small>/ ${fmtN(r.r, r.r < 10 ? 1 : 0)} ${r.u}</small></span></button>`; }).join('')}</div>
    <div class="small faint">Riferimenti LARN/EFSA per adulti. ${k ? 'Alcuni prodotti confezionati non riportano le vitamine: il totale può essere sottostimato.' : 'Media giornaliera sui giorni registrati.'} Tocca una riga per sapere dove trovarlo.</div>` : ''}
  </div>`;
}

/* ---------- AI ---------- */
const AI_MODELS = [{ k: 'claude-haiku-4-5', l: 'Haiku 4.5 · veloce ed economico' }, { k: 'claude-sonnet-5-5', l: 'Sonnet 5.5 · più preciso' }];
let SAMPLE = null;
if (window.claude && window.claude.use) { window.claude.use('sample').then(s => { SAMPLE = s; }).catch(() => { }); }
function aiReady() { return !!SAMPLE || !!(S.ai && S.ai.key); }
function aiLangNote() { return lang() === 'it' ? '' : `\n\nIMPORTANT: the user reads the app in ${lang() === 'en' ? 'English' : 'Spanish'}. Write every text of your answer in ${lang() === 'en' ? 'English' : 'Spanish (Spain)'}; keep JSON keys and exercise ids unchanged.`; }
async function aiAsk(prompt, { json = false, maxTokens = 1200 } = {}) {
  if (lang() !== 'it') { const note = aiLangNote(); prompt = Array.isArray(prompt) ? [...prompt, { type: 'text', text: note }] : prompt + note; }
  if (SAMPLE && Array.isArray(prompt)) prompt = prompt.filter(c => c.type === 'text').map(c => c.text).join('\n');
  if (SAMPLE) {
    if (json) return await SAMPLE.json(prompt, { modelTier: 'default' });
    const r = await SAMPLE(prompt, { modelTier: 'default' }); return r.text;
  }
  if (!S.ai?.key) throw { code: 'no_key' };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': S.ai.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: S.ai.model || 'claude-haiku-4-5', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),  // prompt: string or content blocks (image, document, text)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw { code: r.status === 401 ? 'bad_key' : r.status === 429 ? 'rate' : 'http', message: d?.error?.message || ('HTTP ' + r.status) };
  const text = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  if (!json) return text;
  const m = text.match(/[\[{][\s\S]*[\]}]/); if (!m) throw { code: 'parse' };
  return JSON.parse(m[0]);
}
function aiErr(e) {
  const c = e && e.code;
  return c === 'no_key' ? 'Per usare l\'AI inserisci la chiave API in Profilo → Coach AI.' : c === 'bad_key' ? 'Chiave API non valida: controllala in Profilo → Coach AI.' : c === 'rate' || c === 'rate_limited' ? 'Troppe richieste: riprova tra un minuto.' : c === 'not_granted' ? 'Hai negato il permesso per l\'AI.' : c === 'parse' ? 'Risposta dell\'AI non leggibile, riprova.' : 'AI non raggiungibile ora. Controlla la connessione.';
}
function profileLine() {
  const n = S.nutri; if (!n) return 'Profilo non impostato.';
  return `${n.sex === 'm' ? 'Uomo' : 'Donna'}, ${n.age} anni, ${n.height} cm, ${n.weight} kg, attività ${ACT.find(a => a.k == n.act)?.l || n.act}, obiettivo ${RATES.find(r => r.v == n.rate)?.l || n.rate}, si allena con i pesi ${S.profile.weeklyGoal} volte a settimana.`;
}
function daySummaryText(keys) {
  const lines = [];
  for (const k of keys) {
    const T = targetsFor(k), { tot, meals } = dayTotals(k); if (!dayEntries(k).length) continue;
    lines.push(`${k} (${dayType(k) === 'train' ? 'allenamento' : 'riposo'}) — target ${T?.kcal} kcal P${T?.p} C${T?.c} G${T?.f}; mangiato ${Math.round(tot.kcal)} kcal P${Math.round(tot.p)} C${Math.round(tot.c)} G${Math.round(tot.f)} fibre ${Math.round(tot.fib)} zuccheri ${Math.round(tot.sug)} (frutta ${Math.round(tot.sugF)}, latte ${Math.round(tot.sugM)}) sale ${tot.salt.toFixed(1)}.`);
    for (const m of MEALS) { const es = dayEntries(k).filter(e => e.m === m.k); if (es.length) lines.push(`  ${m.n}: ` + es.map(e => `${entryName(e)} ${e.q ? '' : Math.round(e.g) + 'g'} [${e.fid ? nutriScore(food(e.fid)) : '?'}]`).join('; ')); }
  }
  return lines.join('\n');
}
async function runAI(boxKey, prompt) {
  const box = $('#ai-out-' + boxKey); if (!box) return;
  box.hidden = false; box.innerHTML = `<div class="small muted">${icon('sparkle', 14)} Sto analizzando…</div>`;
  try { const t = await aiAsk(prompt); box.innerHTML = mdLite(t); }
  catch (e) { box.innerHTML = `<div class="small" style="color:var(--bad)">${aiErr(e)}</div>`; }
}
function mdLite(t) {
  return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').split(/\n+/).map(l => /^\s*[-•*]\s+/.test(l) ? `<li>${l.replace(/^\s*[-•*]\s+/, '')}</li>` : `<p>${l}</p>`).join('').replace(/(<li>.*?<\/li>)+/gs, m => `<ul>${m}</ul>`);
}
const AI_STYLE = 'Rispondi in italiano, tono diretto e pratico da coach esperto (non da marketing), massimo 6 punti elenco brevi, con numeri concreti. Niente premesse né saluti. Se qualcosa non va dillo chiaramente.';

/* ---------- AI food estimate ---------- */
function layerAiFood(l) {
  const r = l.res;
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="dialog" aria-label="Stima con AI"><div class="grab"></div><h3>${icon('sparkle', 18)} Stima con AI</h3>
    <div class="stack">
      <div class="small muted">Descrivi cosa hai mangiato, anche fuori casa. Più dettagli dai (quantità, condimenti, cottura), più la stima è precisa.</div>
      <textarea id="ai-desc" class="input" rows="3" placeholder="Es. piatto di carbonara al ristorante, porzione abbondante">${esc(l.desc || '')}</textarea>
      ${r ? `<div class="card tight"><div class="row"><b class="grow">${esc(r.name)}</b><span class="chip ${r.confidence === 'alta' ? 'good' : r.confidence === 'bassa' ? 'warm' : 'gold'}">affidabilità ${esc(r.confidence || 'media')}</span></div>
        <div class="amt-out tnum">${amountOut(nutOf(r.per, r.grams))}</div><div class="small muted">${fmtN(r.grams, 0)} g stimati${r.notes ? ' · ' + esc(r.notes) : ''}</div></div>` : ''}
      <div id="ai-food-msg" class="small"></div>
      ${!aiReady() ? `<div class="small" style="color:var(--gold)">Per usare l'AI inserisci la chiave API in Profilo → Coach AI.</div>` : ''}
      <div class="row"><button class="btn grow" data-a="aiFoodRun" ${aiReady() ? '' : 'disabled'}>${r ? 'Ricalcola' : 'Stima'}</button>${r ? `<button class="btn primary grow" data-a="aiFoodSave">Aggiungi a ${MEAL_N[l.m] || 'diario'}</button>` : ''}</div>
    </div></div></div>`;
}
async function aiFoodRun() {
  const l = topLayer(); l.desc = $('#ai-desc').value.trim();
  if (l.desc.length < 3) { toast('Descrivi il piatto'); return; }
  const m = $('#ai-food-msg'); m.innerHTML = `<span class="muted">${icon('sparkle', 14)} Stimo calorie e macro…</span>`;
  const prompt = `Sei un nutrizionista. Stima i valori nutrizionali di questo pasto/alimento come lo si trova tipicamente in Italia o Spagna: "${l.desc}".
Restituisci SOLO un oggetto JSON con: name (nome breve in italiano), grams (peso totale stimato della porzione descritta), kcal, p, c, f, fib, sug, sat, salt (tutti per l'INTERA porzione, numeri), cat (una tra: dish, meat, fish, cer, dairy, fr, veg, leg, nut, sweet, drink, alc, fat, sauce), confidence ("alta","media","bassa"), notes (max 15 parole, ipotesi fatte).
Esempio: {"name":"Carbonara (ristorante)","grams":350,"kcal":780,"p":30,"c":85,"f":34,"fib":4,"sug":3,"sat":13,"salt":2.4,"cat":"dish","confidence":"media","notes":"porzione da 120 g di pasta, guanciale e pecorino"}`;
  try {
    const j = await aiAsk(prompt, { json: true, maxTokens: 500 });
    const g = Math.max(1, +j.grams || 100), per = {};
    for (const k of ['kcal', 'p', 'c', 'f', 'fib', 'sug', 'sat', 'salt']) per[k] = +((+j[k] || 0) / g * 100).toFixed(2);
    l.res = { name: String(j.name || l.desc).slice(0, 60), grams: g, per, cat: j.cat || 'dish', confidence: j.confidence, notes: j.notes };
    renderLayers();
  } catch (e) { m.innerHTML = `<span style="color:var(--bad)">${aiErr(e)}</span>`; }
}

/* ---------- AI on custom food ---------- */
async function aiCheckFood() {
  const l = topLayer(), f = feFood100(l), box = $('#fe-ai'); box.hidden = false; box.innerHTML = `<span class="small muted">${icon('sparkle', 14)} Controllo…</span>`;
  const prompt = `Valuta questo alimento inserito a mano in un'app di dieta. Nome: "${f.n}" ${f.brand ? '(marca ' + f.brand + ')' : ''}. Valori per 100 g: kcal ${f.per.kcal}, proteine ${f.per.p}, carboidrati ${f.per.c} (zuccheri ${f.per.sug}), grassi ${f.per.f} (saturi ${f.per.sat}), fibre ${f.per.fib}, sale ${f.per.salt}.
1) I valori sono plausibili per questo prodotto? Se un numero sembra sbagliato dillo e proponi il valore tipico. 2) Giudica la qualità nutrizionale (A–E stile Nutri-Score) in una riga. 3) Un consiglio pratico su quando/come usarlo per chi si allena. ${AI_STYLE}`;
  try { box.innerHTML = mdLite(await aiAsk(prompt)); } catch (e) { box.innerHTML = `<span class="small" style="color:var(--bad)">${aiErr(e)}</span>`; }
}

/* ---------- copy for Claude (free fallback) ---------- */
async function copyForClaude(text) {
  text += aiLangNote();
  try { await navigator.clipboard.writeText(text); toast('Copiato: incollalo nella chat con Claude'); }
  catch (e) { pushLayer({ type: 'sheet', title: 'Copia il testo', html: `<textarea class="input" rows="10" readonly>${esc(text)}</textarea>`, items: [] }); }
}

Object.assign(LAYER_RENDER, { aiFood: layerAiFood });
Object.assign(A, {
  aiFood(el) { const l = topLayer(); pushLayer({ type: 'aiFood', m: l?.m || mealByTime(), day: l?.day || UI.dietDay, desc: l?.q || '' }); },
  aiFoodRun() { aiFoodRun(); },
  aiFoodSave() {
    const l = topLayer(), r = l.res; if (!r) return;
    const f = { id: 'c_' + uid(), n: r.name, brand: 'stima AI', src: 'custom', ai: true, cat: r.cat, per: r.per, serv: { g: r.grams, l: '1 porzione stimata' } };
    S.foods[f.id] = f; addEntry(l.day, { fid: f.id, g: r.grams, m: l.m });
    UI.layers = UI.layers.filter(x => !['aiFood', 'food', 'quick'].includes(x.type)); render(); toast(`${esc(r.name)} aggiunto (${fmtN(r.per.kcal * r.grams / 100, 0)} kcal)`);
  },
  aiFoodCheck() { aiCheckFood(); },
  coachAll(el) { UI.coachAll = UI.coachAll || {}; UI.coachAll[el.dataset.k] = true; render(); renderLayers(); },
  toggleMicro() { UI.microOpen = !UI.microOpen; render(); renderLayers(); },
  microInfo(el) { pushLayer({ type: 'sheet', title: MICROS.find(x => x.k === el.dataset.k).n, micro: el.dataset.k, by: UI.microBy || 'serv', html: microSheetHTML(el.dataset.k, UI.microBy || 'serv'), items: [] }); },
  microBy(el) { const l = topLayer(); UI.microBy = l.by = el.dataset.v; l.html = microSheetHTML(l.micro, l.by); renderLayers(); },
  aiDay(el) {
    const k = el.dataset.k || UI.dietDay;
    runAI(el.dataset.box || 'day', `Analizza la giornata alimentare di un ragazzo che si allena seriamente in palestra. ${profileLine()}\n${daySummaryText([k])}\nTra parentesi quadre la qualità A–E di ogni alimento. Dimmi cosa va bene, cosa migliorare (qualità dei prodotti, distribuzione proteine nei pasti, fibre, micronutrienti) e 1–2 sostituzioni concrete. ${AI_STYLE}`);
  },
  aiTargets() {
    const d = topLayer().draft, b = baseTargets(d);
    runAI('nt', `Valuta questi obiettivi nutrizionali. ${profileLine().replace(/.*?,/, 'Persona: ')} Dati: ${d.sex === 'm' ? 'uomo' : 'donna'}, ${d.age} anni, ${d.height} cm, ${d.weight} kg, fattore attività ${d.act}. Modalità ${d.manual ? 'manuale' : 'automatica'}. Target medio: ${b.kcal} kcal, proteine ${b.p} g, carboidrati ${b.c} g, grassi ${b.f} g. Ciclizzazione allenamento/riposo: ${d.cycle ? '±' + d.delta + ' kcal' : 'no'}. È coerente e sostenibile per chi si allena con i pesi 4 volte a settimana? Cosa cambieresti? ${AI_STYLE}`);
  },
  aiRange(el) {
    const keys = statsKeys(UI.statsRange || '7');
    runAI('range', `Analizza l'alimentazione di questo periodo (${keys.length} giorni registrati). ${profileLine()}\n${daySummaryText(keys.slice(-10))}\nDammi: andamento rispetto ai target, abitudini ricorrenti (buone e cattive), qualità dei prodotti, 3 azioni concrete per la prossima settimana. ${AI_STYLE}`);
  },
  copyRange() { const keys = statsKeys(UI.statsRange || '7'); copyForClaude(`Analizza la mia alimentazione. ${profileLine()}\n${daySummaryText(keys)}`); },
  aiTest() {
    const out = $('#ai-test'); out.textContent = 'Provo…';
    aiAsk('Rispondi solo: OK').then(t => { out.textContent = 'Funziona ✓ (' + t.trim().slice(0, 20) + ')'; out.style.color = 'var(--good)'; }).catch(e => { out.textContent = aiErr(e); out.style.color = 'var(--bad)'; });
  },
});
document.addEventListener('input', ev => {
  const el = ev.target;
  if (el.dataset.in === 'aiKey') { S.ai.key = el.value.trim(); save(); }
});
document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset.in === 'aiModel') { S.ai.model = el.value; save(); }
  if (el.dataset.in === 'dayEnd') { S.profile.dayEnd = +el.value; save(); UI.dietDay = todayKey(); }
});
