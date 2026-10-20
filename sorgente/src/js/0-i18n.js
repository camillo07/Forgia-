/* =========================================================
   LANGUAGES (Italiano · English · Español)
   The app is written in Italian. For English/Spanish every piece of text that reaches
   the screen is translated on the fly: exact strings, strings with numbers inside
   ("{0} serie fatte") and "a · b" style composites. A MutationObserver translates
   whatever gets rendered, so every screen, sheet and toast is covered.
   ========================================================= */
const I18N_DATA = /*__I18N__*/{};
const FOOD_TR = /*__FOODTR__*/{};
const LANGS = [['it', 'Italiano'], ['en', 'English'], ['es', 'Español']];
const LOCALES = { it: 'it-IT', en: 'en-GB', es: 'es-ES' };
const DOW_L = { it: ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] };
const DAYS_L = { it: ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], es: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] };
const MON_L = { it: ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'] };
const WLETTER_L = { it: 'LMMGVSD', en: 'MTWTFSS', es: 'LMXJVSD' };

let LANG = 'it';
function lang() { return LANG; }
function locale() { return LOCALES[LANG] || 'it-IT'; }
function wLetter(i) { return (WLETTER_L[LANG] || WLETTER_L.it)[i]; }

const TRX = { lang: null, exact: null, pats: null, cache: new Map() };
const TR_SPLIT = /( · | \| |, | — | – |: | vs |\. |\n)/; // separators a short pattern must not swallow
function trPrepare() {
  if (TRX.lang === LANG) return;
  TRX.lang = LANG; TRX.cache = new Map(); TRX.exact = new Map(); TRX.pats = [];
  if (LANG === 'it' || !I18N_DATA.k) return;
  const out = I18N_DATA[LANG] || [];
  I18N_DATA.k.forEach((k, i) => {
    const v = out[i]; if (!v || (v === k && !/\{\d+\}/.test(k))) return;
    if (!/\{\d+\}/.test(k)) { TRX.exact.set(k, v); return; }
    if (/\}\{/.test(k)) return; // "{1}{2}" next to each other can't be matched reliably
    const lits = k.split(/\{\d+\}/), letters = lits.join('').replace(/[^A-Za-zÀ-ÿ]/g, '');
    if (letters.length < 2) return;
    const tiny = letters.length < 3;
    const order = [...k.matchAll(/\{(\d+)\}/g)].map(m => +m[1]);
    const re = new RegExp('^' + lits.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('(.+?)') + '$');
    TRX.pats.push({ re, order, out: v, tiny, short: letters.length < 16, lits: lits.filter(l => l.trim().length > 1).sort((a, b) => b.length - a.length) });
  });
  TRX.pats.sort((a, b) => b.lits.join('').length - a.lits.join('').length);
}
function trCore(s, depth = 0) {
  const e = TRX.exact.get(s); if (e != null) return e;
  const pm = /^(.*?)([.:!?…]+)$/.exec(s); if (pm && pm[1]) { const e2 = TRX.exact.get(pm[1]); if (e2 != null) return e2 + pm[2]; }
  for (const p of TRX.pats) {
    if (p.lits.length && !s.includes(p.lits[0])) continue;
    const m = p.re.exec(s); if (!m || m.slice(1).some(c => /\. | · |\n/.test(c))) continue;
    if (p.tiny && m.slice(1).some(c => /[A-Za-zÀ-ÿ]/.test(c))) continue; // "{0} di {1}" only between numbers
    if (p.short && m.slice(1).some(c => (c.match(/[A-Za-zÀ-ÿ]{2,}/g) || []).length > 3 || (/[A-Za-zÀ-ÿ]{3}/.test(c) && TR_SPLIT.test(c)))) continue; // "aggiungi {0}" must not swallow a whole sentence
    const vals = {}; p.order.forEach((n, i) => { const c = m[i + 1]; vals[n] = depth < 1 && /[A-Za-zÀ-ÿ]{2}/.test(c) ? (trText(c.trim(), depth + 1) ?? c) : (TRX.exact.get(c.trim()) ?? c); });
    return p.out.replace(/\{(\d+)\}/g, (_, n) => vals[n] ?? '');
  }
  return null;
}
/* one short piece: exact/pattern, then "Petto 14" / "3 sedute" (word + numbers), then lower-case variants */
function trSeg(p, depth) {
  let x = trCore(p, depth); if (x != null) return x;
  const a = /^(.*?[A-Za-zÀ-ÿ.)])(\s+[-−+–~]?[\d][\d\s.,:×%\/–-]*[a-z%]{0,3})$/.exec(p);
  if (a) { const y = trSeg(a[1], depth); if (y != null) return y + a[2]; }
  const b = /^([-−+~]?[\d][\d.,×%\/–-]*\s+)(.*[A-Za-zÀ-ÿ].*)$/.exec(p);
  if (b) { const y = trCore(b[2], depth); if (y != null) return b[1] + y; }
  const trail = /^(.+?)([)”»".,;:!?…]+)$/.exec(p); if (trail && /[(“«"]/.test(trail[1]) === false) { const y = trSeg(trail[1], depth); if (y != null) return y + trail[2]; }
  const lead = /^([.,;:·–—(“«"]\s*)(.+)$/.exec(p); if (lead) { const y = trSeg(lead[2], depth); if (y != null) return lead[1] + y; }
  const br = /^([("“«'])(.+)([)"”»'])$/.exec(p); if (br) { const y = trText(br[2], depth); if (y != null) return br[1] + y + br[3]; }
  if (/^[a-zà-ÿ]/.test(p)) { const y = trCore(p[0].toUpperCase() + p.slice(1), depth); if (y != null) return y[0].toLowerCase() + y.slice(1); }
  return null;
}
/* whole text, else piece by piece: first "a · b" blocks, then sentences, "x: y", lists */
const SPLIT_STRONG = /( · | \| |\n)/, SPLIT_WEAK = /(\. | vs |: |, | — | – )/;
function trText(core, depth) {
  const t = trSeg(core, depth); if (t != null) return t;
  for (const SP of [SPLIT_STRONG, SPLIT_WEAK]) {
    if (!SP.test(core)) continue;
    const parts = core.split(SP); let hit = false;
    for (let i = 0; i < parts.length; i += 2) {
      const p = parts[i].trim(); if (!p) continue;
      let x = null;
      if (parts[i + 1] === '. ') { const y = trCore(p + '.', depth); if (y != null && y.endsWith('.')) x = y.slice(0, -1); }
      if (x == null) x = SP === SPLIT_STRONG ? trText(p, depth) : trSeg(p, depth);
      if (x != null) { parts[i] = parts[i].replace(p, x); hit = true; }
    }
    if (hit) return parts.join('');
  }
  return null;
}
/* translate one piece of text (keeps the spaces around it) */
function tr(s) {
  if (LANG === 'it' || s == null) return s;
  trPrepare();
  const c = TRX.cache.get(s); if (c !== undefined) return c;
  let res = s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
  if (core && /[A-Za-zÀ-ÿ]/.test(core)) {
    const t = trText(core, 0);
    if (t != null) res = m[1] + t + m[3];
  }
  if (TRX.cache.size > 5000) TRX.cache.clear();
  TRX.cache.set(s, res);
  return res;
}
const TR_IT = /\b(di|il|della|delle|dei|degli|dello|nel|nella|nelle|negli|sul|sulla|dal|dalla|che|non|più|anche|sono|questo|questa|questi|quello|quella|dopo|ogni|tuo|tua|tuoi|puoi|vuoi|fai|hai|qui|sotto|sopra|ancora|nessun[ao]?|senza|oppure|allenament[oi]|sedut[ae]|sched[ae]|eserciz[io]+|giorn[oi]|settiman[ae]|recupero|obiettivo|cibi|pasti|grassi|proteine|carboidrati|uscit[ae]|corsa|corse|passi|sonno|battito|ripetizioni|carichi?|tocca|aggiungi|salva|elimina|scegli|fatt[oae]|intestazioni|ottieni|dettagli|poi|oggi|ieri|volte|chilometri|minuti|alla|alle|agli|tutt[oie]|molto|niente|così|perché|circa|almeno|già|sempre|bisogno|valori|ultim[aoie]|manca|mancano|stima|stimat[oaie]|grasso|misure|pesate|numero|piccolo|giorno|registro|corporeo|scrivere|leggerli|codice|salvare|controlli|abbinati|cambiarli|mostra|priorità|specializzazione|dargli|spazio|glutei|femorali|schiena|petto|spalle|bicipiti|tricipiti|polpacci|addome|cerca|nuov[oa]|scegli|vedi|apri|chiudi|indietro|avanti|domani)\b/i;
const TR_ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
function trTree(root) {
  if (LANG === 'it' || !root) return;
  if (root.nodeType === 3) { const v = root.nodeValue, t = tr(v); if (t !== v) root.nodeValue = t; return; }
  if (root.nodeType !== 1 || root.closest?.('[data-nt]')) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => { const p = n.parentElement; return !p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.tagName) || p.closest('[data-nt]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
  for (let n = w.nextNode(); n; n = w.nextNode()) { const v = n.nodeValue; if (v.length < 2 && !/[A-Za-z]/.test(v)) continue; const t = tr(v); if (t !== v) n.nodeValue = t; if (window.__trLog && TR_IT.test(t)) window.__trLog.add(v.trim()); }
  const els = root.querySelectorAll ? root.querySelectorAll('[placeholder],[aria-label],[title],[alt]') : [];
  for (const el of [root, ...els]) for (const a of TR_ATTRS) { const v = el.getAttribute?.(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
}
let TR_OBS = null;
function trObserve() {
  if (TR_OBS || typeof MutationObserver === 'undefined') return;
  TR_OBS = new MutationObserver(recs => { if (LANG === 'it') return; for (const r of recs) for (const n of r.addedNodes) trTree(n); });
  TR_OBS.observe(document.body, { childList: true, subtree: true });
}
/* switch language: dates, names of exercises and foods, then translate the screen */
function applyLang() {
  LANG = (typeof S !== 'undefined' && S.profile && S.profile.lang) || 'it';
  DOW.splice(0, 7, ...DOW_L[LANG]); MON.splice(0, 12, ...MON_L[LANG]);
  try { document.documentElement.lang = LANG; } catch (e) { }
  trPrepare();
  if (typeof applyFoodLang === 'function') applyFoodLang();
  if (typeof applyExLang === 'function') applyExLang();
  if (typeof CACHE !== 'undefined') CACHE.k = null;
  trObserve();
}
