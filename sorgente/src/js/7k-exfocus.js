/* =========================================================
   MUSCOLI DELL'ESERCIZIO
   In the exercise sheet (from the workout, the routine editor or the library) a body map
   zooms on the muscles worked and colours every part (e.g. triceps long / lateral head)
   by how much it works. Estimate: muscles of the exercise (primary 1, secondary 0.5)
   split in their parts by the type of movement (incline, overhead, seated, ...).
   ========================================================= */
const EXF_MK = { chest: 'petto', shoulders: 'spalle', biceps: 'bicipiti', triceps: 'tricipiti', forearms: 'avambracci', abdominals: 'addome', traps: 'trapezio', lats: 'dorsali', 'middle back': 'dorsali', 'lower back': 'lombari', glutes: 'glutei', abductors: 'glutei', quadriceps: 'quadricipiti', hamstrings: 'femorali', adductors: 'adduttori', calves: 'polpacci' };
const EXF_PULL = /\b(row|rows|rowing|pull ?ups?|pullups?|chin ?ups?|chins?|pulldowns?|pull ?down|rematore|trazion\w*|lat machine|pulley|t bar|seal)\b/;
const EXF_PUSH = /\b(bench|press|push ?ups?|pushups?|dips?|fly|flyes?|crossover|panca|spinte?|distensioni)\b/;
/* [regex, distribution] per group, first match wins; last entry is the default */
const EXF_RULES = {
  petto: [
    [/incline|inclinat|low high|low to high|upward|dal basso/, { petto_alto: 1, petto_medio: .55, petto_basso: .2 }],
    [/decline|declinat|\bdips?\b|high low|high to low|downward|dall alto/, { petto_basso: 1, petto_medio: .6, petto_alto: .15 }],
    [/pullover/, { petto_basso: .8, petto_medio: .6, petto_alto: .3 }],
    [null, { petto_medio: 1, petto_alto: .6, petto_basso: .6 }]],
  spalle: [
    [/rear|reverse fly|reverse flye|reverse machine|face pull|posterior|bent over.*raise|pec deck reverse|w raise/, { delt_post: 1, delt_lat: .35 }],
    [/\blateral\b|side raise|upright|alzate laterali|\by raise|lu raise/, { delt_lat: 1, delt_ant: .3, delt_post: .25 }],
    [/front raise|front cable|front plate|frontal|alzate frontali/, { delt_ant: 1, delt_lat: .3 }],
    ['pull', { delt_post: 1, delt_lat: .3 }],
    [/military|arnold|push press|overhead press|shoulder press|lento|\bpress\b.*shoulder|shoulder.*\bpress\b/, { delt_ant: 1, delt_lat: .55, delt_post: .1 }],
    ['push', { delt_ant: 1, delt_lat: .2 }],
    [null, { delt_ant: .8, delt_lat: .8, delt_post: .5 }]],
  bicipiti: [
    [/incline.*curl|bayesian|drag curl|behind|curl inclinat|close grip curl/, { bic_lungo: 1, bic_corto: .55 }],
    [/preacher|scott|spider|concentration|larry|wide grip curl|high cable curl/, { bic_corto: 1, bic_lungo: .55 }],
    [/hammer|martello|reverse|cross body|zottman/, { bic_lungo: .6, bic_corto: .4 }],
    [null, { bic_lungo: .9, bic_corto: .9 }]],
  tricipiti: [
    [/overhead|french|skull|lying|above head|sopra la testa|tate|jm press|over head|incline triceps extension/, { tri_lungo: 1, tri_mediale: .55, tri_laterale: .5 }],
    [/reverse grip|reverse triceps|underhand|supin/, { tri_mediale: 1, tri_laterale: .7, tri_lungo: .4 }],
    [/kickback/, { tri_laterale: .9, tri_mediale: .9, tri_lungo: .6 }],
    [/pushdown|push down|rope/, { tri_laterale: 1, tri_mediale: .8, tri_lungo: .45 }],
    [/\bdips?\b|close grip|bench|press|push ?ups?|pushups?|diamond/, { tri_laterale: 1, tri_mediale: .7, tri_lungo: .4 }],
    [/extension/, { tri_lungo: 1, tri_mediale: .55, tri_laterale: .5 }],
    [null, { tri_laterale: 1, tri_mediale: .8, tri_lungo: .65 }]],
  avambracci: [
    [/palms down|reverse wrist|wrist extension|wrist roller/, { avb_estensori: 1, avb_flessori: .3 }],
    [/palms up|wrist curl|wrist flexion/, { avb_flessori: 1, avb_estensori: .2 }],
    [/hammer|reverse curl|reverse barbell curl|reverse cable curl|reverse ez|zottman|martello/, { avb_brachio: 1, avb_estensori: .6, avb_flessori: .2 }],
    [/farmer|grip|carry|\bhang|deadlift|shrug|pull ?ups?|pullups?|chin|\brow/, { avb_flessori: 1, avb_brachio: .4, avb_estensori: .4 }],
    [/curl/, { avb_brachio: .7, avb_flessori: .6 }],
    [null, { avb_flessori: .8, avb_brachio: .6, avb_estensori: .6 }]],
  addome: [
    [/twist|wood ?chop|pallof|side bend|oblique|obliqu|rotation|russian|windmill|side plank|saxon|landmine 180/, { obliqui: 1, addome_alto: .35, addome_basso: .3 }],
    [/leg raise|knee raise|reverse crunch|tuck|flutter|scissor|hanging|v up|toes to bar|leg lift|captain|leg pull/, { addome_basso: 1, addome_alto: .5, obliqui: .35 }],
    [/roll ?out|ab roller|wheel/, { addome_alto: .9, addome_basso: .9, obliqui: .4, serrato: .4 }],
    [/crunch|sit ?ups?|situp/, { addome_alto: 1, addome_basso: .55, obliqui: .3 }],
    [/plank|hollow|dead bug|stir the pot/, { addome_alto: .8, addome_basso: .8, obliqui: .5 }],
    [/shoulder raise|scapular push|serratus|protraction/, { serrato: 1, addome_alto: .2 }],
    [null, { addome_alto: 1, addome_basso: .7, obliqui: .45, serrato: .15 }]],
  trapezio: [
    [/shrug|scrollat|upright|farmer|carry|deadlift|clean|snatch|high pull|stacco/, { trap_alto: 1, trap_medio: .45, trap_basso: .2 }],
    [/face pull|reverse fly|rear|\brows?\b|rowing|rematore|t bar|y raise|prone|seal/, { trap_medio: 1, trap_basso: .6, trap_alto: .3 }],
    [/pull ?ups?|pullups?|chin|pulldown|scapular|lat machine|trazion/, { trap_basso: 1, trap_medio: .5, trap_alto: .1 }],
    [null, { trap_medio: 1, trap_alto: .6, trap_basso: .5 }]],
  dorsali: [
    [/external rotation|rotazione esterna|cuban/, { infraspinato: 1 }],
    [/face pull|reverse fly|rear delt/, { infraspinato: .8, grande_rotondo: .3, dorsali: .1 }],
    [/pull ?ups?|pullups?|chin|pulldown|lat machine|trazion|straight arm|pullover|lat pull/, { dorsali: 1, grande_rotondo: .65, infraspinato: .3 }],
    [/\brows?\b|rowing|rematore|t bar|pulley|low pull|seal/, { grande_rotondo: 1, dorsali: .8, infraspinato: .5 }],
    [null, { dorsali: 1, grande_rotondo: .6, infraspinato: .3 }]],
  lombari: [[null, { lombari: 1 }]],
  glutei: [
    [/abduct|side leg|clam|lateral walk|fire hydrant|monster|band walk/, { glu_medio: 1, glu_grande: .3 }],
    [/bulgarian|split|lunge|step ?up|single leg|one leg|pistol|affond|curtsy/, { glu_grande: 1, glu_medio: .6 }],
    [null, { glu_grande: 1, glu_medio: .4 }]],
  quadricipiti: [
    [/leg extension|sissy|leg ext|estensioni/, { quad_retto: 1, quad_laterale: .7, quad_mediale: .7 }],
    [/bulgarian|split|lunge|step ?up|affond|pistol|single leg|one leg|spanish|cyclist|heels elevated|front squat/, { quad_mediale: 1, quad_laterale: .8, quad_retto: .45 }],
    [/squat|press|hack|pendulum|belt|pressa|wall sit/, { quad_laterale: 1, quad_mediale: .85, quad_retto: .5 }],
    [null, { quad_laterale: 1, quad_mediale: .8, quad_retto: .6 }]],
  femorali: [
    [/seated leg curl|seated curl|leg curl seduto/, { fem_bicipite: 1, fem_semi: 1 }],
    [/lying|leg curl|nordic|glute ham|ghr|standing leg curl/, { fem_bicipite: 1, fem_semi: .8 }],
    [/deadlift|romanian|rdl|stiff|good morning|hinge|stacco/, { fem_semi: 1, fem_bicipite: .85 }],
    [null, { fem_bicipite: .9, fem_semi: .9 }]],
  adduttori: [[null, { adduttori: 1 }]],
  polpacci: [
    [/tibialis|toe raise|tibial|dorsiflex/, { pol_tibiale: 1 }],
    [/seated/, { pol_soleo: 1, pol_gastro: .35 }],
    [null, { pol_gastro: 1, pol_soleo: .55 }]],
};
const EXF_SMALL = { calves: .22, forearms: .3, 'lower back': .4, abdominals: .4 };
/* well known compounds where the database lists every muscle alike: [pattern, parts, unless] */
const EXF_EXTRA = [
  [/\bdeadlift\b|stacco/, { glu_grande: 1, lombari: .9, fem_semi: .75, fem_bicipite: .75, quad_laterale: .55, quad_mediale: .5, trap_alto: .6, trap_medio: .45, avb_flessori: .55, dorsali: .4, adduttori: .5 }, /romanian|stiff|rdl|straight leg|single leg|sumo|trap bar|hex/],
  [/sumo/, { adduttori: .85, glu_grande: 1, quad_mediale: .65 }],
  [/trap bar|hex bar/, { quad_laterale: .85, quad_mediale: .75, glu_grande: 1, lombari: .7, trap_alto: .6 }],
  [/squat/, { glu_grande: .7, adduttori: .55 }, /sissy|jump|split|bulgarian|pistol/],
  [/leg press|pressa/, { glu_grande: .55, adduttori: .4 }],
];
const EXF_ARMS = new Set(['bicipiti', 'tricipiti', 'avambracci']);
const EXF_CACHE = new Map();
function exfText(x) { return ((x.id || '') + ' ' + (x.en || x.n || '') + ' ' + (x.it || '')).toLowerCase().replace(/[_\-()/,.]+/g, ' ').replace(/\s+/g, ' '); }
function exfDist(g, t) {
  for (const [re, d] of EXF_RULES[g] || []) {
    if (re === null) return d;
    if (re === 'pull' ? EXF_PULL.test(t) : re === 'push' ? EXF_PUSH.test(t) : re.test(t)) return d;
  }
  return {};
}
/* { r: 0..1 } for every part that works */
function exFocus(x) {
  if (!x || !x.id) return {};
  if (EXF_CACHE.has(x.id)) return EXF_CACHE.get(x.id);
  const t = exfText(x), out = {};
  const add = (r, v) => { if (v > (out[r] || 0)) out[r] = v; };
  const use = (m, w) => {
    const g = EXF_MK[m]; if (!g) return;
    if (m === 'abductors') { add('glu_medio', w); add('glu_grande', w * .3); return; }
    const d = exfDist(g, t); for (const r in d) add(r, w * d[r]);
    if (m === 'middle back') { const d2 = exfDist('trapezio', t); for (const r in d2) add(r, w * .75 * d2[r]); }
  };
  (x.p || []).forEach(m => use(m, 1));
  (x.s || []).forEach(m => use(m, EXF_SMALL[m] || .5));   // calves / forearms listed as helpers are mostly stabilisers
  for (const [re, add2, not] of EXF_EXTRA) if (re.test(t) && !(not && not.test(t))) for (const r in add2) add(r, add2[r]);
  for (const r in AN_R) if (AN_R[r].ex.includes(x.id)) add(r, AN_R[r].ex[0] === x.id ? 1 : .9);   // curated "best exercises" lists
  const mx = Math.max(0, ...Object.values(out));
  if (mx > 0) for (const r in out) { out[r] = Math.round(out[r] / mx * 100) / 100; if (out[r] < .12) delete out[r]; }
  EXF_CACHE.set(x.id, out);
  return out;
}
function exfLevel(v) { return v >= .75 ? 'Principale' : v >= .4 ? 'Secondario' : 'Di supporto'; }
const EXF_STOPS = [[0, [74, 52, 44]], [.4, [150, 66, 30]], [.75, [255, 122, 47]], [1, [255, 186, 92]]];
function exfColor(v) {
  for (let i = 1; i < EXF_STOPS.length; i++) {
    const [b, cb] = EXF_STOPS[i], [a, ca] = EXF_STOPS[i - 1];
    if (v <= b) { const k = (v - a) / (b - a); return '#' + ca.map((c, j) => Math.round(c + (cb[j] - c) * k).toString(16).padStart(2, '0')).join(''); }
  }
  return '#ffba5c';
}
/* which sides to show and where to zoom */
function exfView(foc) {
  const BB = anMeasure(), sides = [];
  for (const side of ['front', 'back']) {
    let wsum = 0; const keep = [];
    for (const p of anParts(side)) { const v = p.r && foc[p.r]; if (!v) continue; const b = BB.get(p.d); wsum += v * b.a; if (v >= .3) keep.push(p); }
    sides.push({ side, w: wsum, keep });
  }
  const mx = Math.max(...sides.map(s => s.w));
  const show = sides.filter(s => s.w > 0 && s.w >= mx * .22 && s.keep.length);
  const arms = Object.keys(foc).filter(r => foc[r] >= .3).every(r => EXF_ARMS.has(AN_R[r].g));
  return show.map(s => {
    let ps = s.keep; if (arms) { const one = ps.filter(p => p.lr !== 'R'); if (one.length) ps = one; }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of ps) { const b = BB.get(p.d); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
    return { side: s.side, box: [x0, y0, x1 - x0, y1 - y0] };
  });
}
function exfFit(box, ar, full) {
  let [x, y, w, h] = box; const mw = 150, mh = 150;
  if (w < mw) { x -= (mw - w) / 2; w = mw; } if (h < mh) { y -= (mh - h) / 2; h = mh; }
  const px = w * .16, py = h * .16; x -= px; y -= py; w += 2 * px; h += 2 * py;
  if (w / h < ar) { const nw = h * ar; x -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y -= (nh - h) / 2; h = nh; }
  if (full && w > full[2] * 1.1 && h > full[3]) return full;
  return [x, y, w, h];
}
function exfSVG(side, foc, vb, idp, anim) {
  const parts = anParts(side), defs = [], body = []; let ci = 0;
  const order = Object.keys(foc).sort((a, b) => foc[b] - foc[a]);
  for (const p of parts) {
    let clip = '';
    if (p.clip) { const id = `${idp}c${ci++}`; defs.push(`<clipPath id="${id}"><polygon points="${p.clip}"/></clipPath>`); clip = ` clip-path="url(#${id})"`; }
    const v = p.r && foc[p.r];
    if (!v) { body.push(`<path class="${p.r ? 'an-r exf-off' : 'an-b'}" d="${p.d}"${p.r ? ` fill="${AN_BASE}"` : ''}${clip}/>`); continue; }
    const d = anim ? Math.round(380 + order.indexOf(p.r) * 140) : 0;
    body.push(`<path class="an-r exf-on ${v >= .75 ? 'top' : ''}" data-r="${p.r}" d="${p.d}" fill="${exfColor(v)}" style="--d:${d}ms"${clip}/>`);
  }
  return `<svg class="an-svg exf-svg ${anim ? 'anim' : ''}" viewBox="${vb.map(n => Math.round(n * 10) / 10).join(' ')}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs>${defs.join('')}</defs><path class="an-out" d="${side === 'front' ? BODY.oF : BODY.oB}"/>${body.join('')}</svg>`;
}
/* the card in the exercise sheet */
function exFocusHTML(x, l) {
  if (!BODY.front || !x || x.c === 'cardio') return '';
  let foc; try { foc = exFocus(x); } catch (e) { return ''; }
  const regs = Object.keys(foc).sort((a, b) => foc[b] - foc[a]);
  if (!regs.length) return '';
  const anim = !(l && l.exfShown) && motionOK(); if (l) l.exfShown = true;
  const views = exfView(foc), two = views.length > 1, ar = two ? .62 : 1.35;
  const top = regs[0], g0 = AN_R[top].g;
  const svgs = views.map((v, i) => {
    const full = anBodyBox(v.side), to = exfFit(v.box, ar, full), from = exfFit(full, ar);
    return `<div class="exf-side" data-nt>${exfSVG(v.side, foc, anim ? from : to, 'xf' + i, anim).replace('<svg ', `<svg data-to="${to.join(',')}" `)}<span>${v.side === 'front' ? 'Davanti' : 'Dietro'}</span></div>`;
  }).join('');
  const rows = regs.slice(0, 7).map((r, i) => {
    const v = foc[r], c = exfColor(v);
    return `<div class="exf-row" style="--c:${c};--w:${Math.round(v * 100)}%;--d:${anim ? 380 + i * 140 : 0}ms"><div class="exf-n"><span data-nt><b>${esc(L3(AN_G[AN_R[r].g].n))}</b> · ${esc(L3(AN_R[r].n))}</span><small>${exfLevel(v)}</small></div><div class="exf-bar"><i></i></div></div>`;
  }).join('');
  return `<div class="card tight exf ${anim ? 'anim' : ''}">
    <div class="row"><b class="grow">Muscoli allenati</b><button class="link small" data-a="exfOpen" data-g="${g0}" data-r="${top}" style="color:var(--gold)">Esplora ${icon('chev', 13)}</button></div>
    <button class="exf-stage ${two ? 'two' : ''}" data-a="exfOpen" data-g="${g0}" data-r="${top}" aria-label="Apri la mappa dei muscoli">${svgs}</button>
    <div class="exf-scale"><span>Poco</span><i></i><span>Molto</span></div>
    <div class="exf-rows">${rows}</div>
    <div class="small faint">Più il colore è acceso, più lavora quella parte. È una stima basata sul tipo di movimento (angolo, presa, posizione del braccio).</div>
  </div>`;
}
/* zoom from the whole body to the muscles, once per sheet, when the card comes into view */
function exfZoom(s) {
  if (s.dataset.run) return; s.dataset.run = '1';
  const from = s.getAttribute('viewBox').split(/\s+/).map(Number), to = s.dataset.to.split(',').map(Number);
  const t0 = performance.now() + 120, ms = 950, ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const step = now => {
    if (!s.isConnected) return;
    const k = Math.max(0, Math.min(1, (now - t0) / ms)), e = ease(k);
    s.setAttribute('viewBox', from.map((v, i) => Math.round((v + (to[i] - v) * e) * 10) / 10).join(' '));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function exfGo(card) { if (card.classList.contains('go')) return; card.classList.add('go'); card.querySelectorAll('.exf-svg.anim').forEach(exfZoom); }
function exfAfterRender() {
  document.querySelectorAll('.exf.anim:not([data-obs])').forEach(card => {
    card.dataset.obs = '1';
    if (typeof IntersectionObserver === 'undefined') { exfGo(card); return; }
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); exfGo(card); } }, { threshold: .45 });
    io.observe(card.querySelector('.exf-stage') || card);
  });
  document.querySelectorAll('.exf-svg:not(.anim)[data-to]').forEach(s => { const to = s.dataset.to.replace(/,/g, ' '); if (s.getAttribute('viewBox') !== to) s.setAttribute('viewBox', to); });
}
Object.assign(A, {
  exfOpen(el) {
    const g = el.dataset.g, r = el.dataset.r;
    const side = (() => { const a = anGroupBox('front', g), b = anGroupBox('back', g); return !a || (b && b.area > a.area * 2.2) ? 'back' : 'front'; })();
    pushLayer({ type: 'anatomy', side, g: null, r: null });
    setTimeout(() => anFocus(g, r), 80);
  },
});
