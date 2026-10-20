/* =========================================================
   ANALISI: mappa muscolare · cosa influenza la forza · ultimi 7 giorni del peso
   ========================================================= */

/* ---------- muscle map ---------- */
function musCol(v) { return !v ? '#2a313c' : v < 5 ? '#6b3a22' : v < 10 ? '#c4561f' : v <= 20 ? '#ff7a2f' : '#ffc15c'; }
function bodyMapSVG(back, sets) {
  const g = n => sets[n] || 0, M = (n, d) => `<g class="mm" data-n="${n}"><title>${n}: ${fmtN(g(n))} serie</title>${d.replace(/FILL/g, musCol(g(n)))}</g>`;
  const base = `<circle cx="50" cy="15" r="9.5" fill="#20262f"/><rect x="45" y="23" width="10" height="8" rx="3" fill="#20262f"/>
    <path d="M33 33 Q50 28 67 33 L71 48 L66 94 L60 102 L40 102 L34 94 L29 48 Z" fill="#20262f"/>
    <path d="M30 40 L24 74 L20 102" stroke="#20262f" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 40 L76 74 L80 102" stroke="#20262f" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M42 100 L41 146 L42 188" stroke="#20262f" stroke-width="15" fill="none" stroke-linecap="round"/><path d="M58 100 L59 146 L58 188" stroke="#20262f" stroke-width="15" fill="none" stroke-linecap="round"/>`;
  const sh = M('Spalle', `<ellipse cx="29.5" cy="43" rx="7.5" ry="7" fill="FILL"/><ellipse cx="70.5" cy="43" rx="7.5" ry="7" fill="FILL"/>`);
  const front = `${base}${sh}
    ${M('Petto', `<path d="M49 38 L37 38 Q31 43 33.5 55 Q42 60 49 56 Z" fill="FILL"/><path d="M51 38 L63 38 Q69 43 66.5 55 Q58 60 51 56 Z" fill="FILL"/>`)}
    ${M('Bicipiti', `<ellipse cx="25.5" cy="61" rx="4.6" ry="10" transform="rotate(10 25.5 61)" fill="FILL"/><ellipse cx="74.5" cy="61" rx="4.6" ry="10" transform="rotate(-10 74.5 61)" fill="FILL"/>`)}
    ${M('Addominali', `<rect x="42" y="59" width="16" height="33" rx="5" fill="FILL"/><path d="M50 60 V91 M42.5 70 H57.5 M42.5 80 H57.5" stroke="#11151b" stroke-width="1.1" opacity=".55"/>`)}
    ${M('Quadricipiti', `<ellipse cx="41.5" cy="122" rx="7.6" ry="21" fill="FILL"/><ellipse cx="58.5" cy="122" rx="7.6" ry="21" fill="FILL"/>`)}
    ${M('Polpacci', `<ellipse cx="41.5" cy="166" rx="4.6" ry="14" fill="FILL" opacity=".75"/><ellipse cx="58.5" cy="166" rx="4.6" ry="14" fill="FILL" opacity=".75"/>`)}`;
  const rear = `${base}
    ${M('Schiena', `<path d="M41 31 L59 31 L67 40 L50 47 L33 40 Z" fill="FILL"/><path d="M35 47 Q31 62 40 78 L48.5 73 L48.5 49 Z" fill="FILL"/><path d="M65 47 Q69 62 60 78 L51.5 73 L51.5 49 Z" fill="FILL"/>`)}
    ${sh}
    ${M('Tricipiti', `<ellipse cx="25.5" cy="61" rx="4.8" ry="10.5" transform="rotate(10 25.5 61)" fill="FILL"/><ellipse cx="74.5" cy="61" rx="4.8" ry="10.5" transform="rotate(-10 74.5 61)" fill="FILL"/>`)}
    ${M('Glutei', `<ellipse cx="43" cy="100" rx="8" ry="8.5" fill="FILL"/><ellipse cx="57" cy="100" rx="8" ry="8.5" fill="FILL"/>`)}
    ${M('Femorali', `<ellipse cx="42" cy="129" rx="7" ry="17.5" fill="FILL"/><ellipse cx="58" cy="129" rx="7" ry="17.5" fill="FILL"/>`)}
    ${M('Polpacci', `<ellipse cx="42" cy="164" rx="6" ry="13" fill="FILL"/><ellipse cx="58" cy="164" rx="6" ry="13" fill="FILL"/>`)}`;
  return `<svg viewBox="0 0 100 196" class="bodymap" role="img" aria-label="Mappa muscolare ${back ? 'dietro' : 'davanti'}">${back ? rear : front}</svg>`;
}
function muscleMapHTML(weekStart) {
  const ms = weekMuscleSets(weekStart), sets = {}; ms.forEach(m => sets[m.n] = m.v);
  const low = ms.filter(m => m.v < 10 && m.n !== 'Avambracci').map(m => m.n), hi = ms.filter(m => m.v > 20).map(m => m.n);
  return `${typeof anMiniHTML === 'function' && BODY.front ? anMiniHTML(weekStart) + '<div class="small faint" style="text-align:center;margin-top:-2px">Tocca la mappa per esplorare i muscoli</div>' : `<div class="bm-wrap"><div>${bodyMapSVG(false, sets)}<span>Davanti</span></div><div>${bodyMapSVG(true, sets)}<span>Dietro</span></div></div>`}
    <div class="bm-leg"><span><i style="background:#2a313c"></i>0</span><span><i style="background:#6b3a22"></i>1–4</span><span><i style="background:#c4561f"></i>5–9</span><span><i style="background:#ff7a2f"></i>10–20</span><span><i style="background:#ffc15c"></i>oltre 20</span></div>
    ${weekStart === startOfWeek(Date.now()) || !ms.some(m => m.v) ? '' : `<div class="small muted">${low.length ? `Sotto le 10 serie: <b style="color:var(--fg)">${low.join(', ')}</b>. ` : 'Tutti i muscoli nel range. '}${hi.length ? `Oltre 20: ${hi.join(', ')}.` : ''}</div>`}`;
}

/* ---------- what drives strength: simple comparisons between your own sessions ---------- */
function sessionPerf() {
  const ws = S.workouts.filter(w => w.ex && w.ex.length).sort((a, b) => a.start - b.start), best = new Map();
  for (const w of ws) for (const e of w.ex) {
    if (mtOf(e) !== 'wr') continue;
    const v = Math.max(0, ...workSets(e).map(s => e1rm(s.kg, s.r))); if (!v) continue;
    if (!best.has(e.id)) best.set(e.id, []); best.get(e.id).push({ t: w.start, v, w: w.id });
  }
  const out = [];
  for (const w of ws) {
    const rs = [];
    for (const e of w.ex) {
      const list = best.get(e.id); if (!list) continue; const me = list.find(x => x.w === w.id); if (!me) continue;
      const ref = list.filter(x => x.w !== w.id && Math.abs(x.t - w.start) <= 45 * DAY).map(x => x.v);
      if (ref.length < 2) continue;
      rs.push(me.v / median(ref));
    }
    if (rs.length) out.push({ w, k: dkey(w.start), p: rs.reduce((a, b) => a + b, 0) / rs.length });
  }
  return out;
}
function corrRows() {
  const P = sessionPerf(), rows = [];
  const cmp = (name, fn, labA, labB) => {
    const A = [], B = [];
    for (const s of P) { const g = fn(s); if (g === true) A.push(s.p); else if (g === false) B.push(s.p); }
    const ok = A.length >= 3 && B.length >= 3, d = ok ? (A.reduce((a, b) => a + b, 0) / A.length) / (B.reduce((a, b) => a + b, 0) / B.length) - 1 : null;
    rows.push({ name, labA, labB, nA: A.length, nB: B.length, d });
  };
  const prevK = k => dkey(kdate(k) - DAY + 7200e3);
  cmp('Sonno', s => { const v = dayVal(s.k, 'sleep'); return v == null ? null : v >= 7; }, 'notti da 7 h o più', 'meno di 7 h');
  cmp('Recupero', s => { const r = typeof recovery === 'function' ? recovery(s.k).score : null; return r == null ? null : r >= 60; }, 'recupero 60 o più', 'sotto 60');
  cmp('Calorie del giorno prima', s => { if (!S.nutri) return null; const pk = prevK(s.k); if (!dayEntries(pk).length) return null; const t = targetsFor(pk); if (!t) return null; return dayTotals(pk).tot.kcal >= t.kcal * 0.95; }, 'all\'obiettivo', 'sotto l\'obiettivo');
  cmp('Proteine del giorno prima', s => { if (!S.nutri) return null; const pk = prevK(s.k); if (!dayEntries(pk).length) return null; const t = targetsFor(pk); if (!t) return null; return dayTotals(pk).tot.p >= t.p * 0.9; }, 'al target', 'sotto il target');
  cmp('Giorni di riposo prima', s => { const prev = S.workouts.filter(w => w.start < s.w.start).sort((a, b) => b.start - a.start)[0]; if (!prev) return null; return (startOfDay(s.w.start) - startOfDay(prev.start)) / DAY >= 2; }, 'dopo almeno 1 giorno di riposo', 'il giorno dopo un allenamento');
  cmp('Orario', s => new Date(s.w.start).getHours() < 14, 'mattina', 'pomeriggio/sera');
  return { rows, n: P.length };
}
function corrCard() {
  const { rows, n } = corrRows();
  const ok = rows.filter(r => r.d != null).sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const top = ok[0] && Math.abs(ok[0].d) >= 0.03 ? ok[0] : null;
  return `<div class="card"><div class="section-title">Cosa influenza la tua forza</div>
    ${top ? `<div class="corr-top">${icon('bolt', 18)}<div><b>${top.name}</b> · ${top.labA}: forza <b>${top.d > 0 ? '+' : '−'}${fmtN(Math.abs(top.d * 100), 0)}%</b> rispetto a ${top.labB}. È la differenza più grande nei tuoi dati.</div></div>` : ''}
    <div class="corr">${rows.map(r => `<div class="row"><div class="grow"><div class="lbl">${r.name}</div><div class="small faint">${r.labA} vs ${r.labB}</div></div>${r.d != null ? `<b class="tnum ${Math.abs(r.d) < 0.02 ? '' : r.d > 0 ? 'up' : 'dn'}">${Math.abs(r.d) < 0.02 ? '≈ uguale' : (r.d > 0 ? '+' : '−') + fmtN(Math.abs(r.d * 100), 1) + '%'}</b>` : `<span class="small faint" style="text-align:right">${r.nA + r.nB ? `${r.nA} vs ${r.nB} sedute,<br>ne servono 3 per lato` : 'nessun dato'}</span>`}</div>`).join('')}</div>
    <div class="small faint">Confronta la tua forza (1RM stimato rispetto alla tua media dello stesso periodo) tra sedute diverse${n ? `, su ${n} sedute` : ''}. Servono sonno e recupero da Apple Salute e il diario per le calorie. È una correlazione, non una prova: con poche sedute può cambiare molto.</div></div>`;
}

/* ---------- weight: last 7 days ---------- */
function weight7HTML() {
  const today = startOfDay(Date.now()), all = bodySeries('w'), cells = [], vals = [];
  for (let i = 6; i >= 0; i--) {
    const t = today - i * DAY, k = dkey(t), v = dayVal(k, 'w');
    const prev = [...all].reverse().find(p => p.x < t);
    const d = v != null && prev ? v - prev.y : null;
    if (v != null) vals.push(v);
    cells.push(`<button class="w7 ${v == null ? 'none' : ''} ${t === today ? 'today' : ''}" data-a="bodyLog" data-k="${k}"><span>${'DLMMGVS'[new Date(t).getDay()]} ${new Date(t).getDate()}</span><b class="tnum">${v != null ? fmtN(v, 1) : '–'}</b><em class="${d == null || Math.abs(d) < 0.05 ? '' : d < 0 ? 'dn' : 'up'}">${d == null ? '' : Math.abs(d) < 0.05 ? '=' : (d > 0 ? '+' : '−') + fmtN(Math.abs(d), 1)}</em></button>`);
  }
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  return `<div class="lbl" style="margin-top:4px">Ultimi 7 giorni</div><div class="w7s">${cells.join('')}</div>
    <div class="small muted">${vals.length ? `Media <b style="color:var(--fg)">${fmtN(avg, 1)} kg</b> · min ${fmtN(Math.min(...vals), 1)} · max ${fmtN(Math.max(...vals), 1)} · ${vals.length}/7 pesate` : 'Nessuna pesata negli ultimi 7 giorni'}. Il numero piccolo è la differenza con la pesata precedente. Tocca un giorno per modificarlo.</div>`;
}

/* ---------- weight used by the diet: 7-day average or last weigh-in ---------- */
function lastWeight() { const b = weightNow(); return b && Date.now() - b.t < 30 * DAY ? b.w : null; }
function dietWeight(n = S.nutri) { return n && n.wMode === 'last' ? lastWeight() : bodyWeight(); }
Object.assign(A, {
  ntWMode(el) { const d = topLayer().draft; d.wMode = el.dataset.v; const w = dietWeight(d); if (w) d.weight = w; renderLayers(); },
});
