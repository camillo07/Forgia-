/* =========================================================
   CHAT CON IL COACH AI
   A chat that knows the athlete: this week and the last one (workouts, sets per muscle,
   diet, weight, sleep, HRV, runs), the routines, the last sessions in detail, the best lifts
   and today's food. Uses the personal API key (streaming) or, in the Claude preview, the
   Claude account. Messages stay on this phone (not synced, not in backups).
   ========================================================= */
const CHAT_MAX = 60;
const CHAT_SUGG = ['Come sta andando questa settimana?', 'Cosa mi conviene allenare oggi?', 'Su quali esercizi sto progredendo e su quali no?', 'Cosa mangio stasera per chiudere i macro?', 'Il mio peso scende al ritmo giusto?', 'Come posso recuperare meglio?'];
IC.send = '<path d="M4 12 20 4l-6 16-3-7-7-1z"/>';

function chatLog() { S.ai = S.ai || {}; if (!Array.isArray(S.ai.chat)) S.ai.chat = []; return S.ai.chat; }
function chatContext() {
  const L = [], now = Date.now();
  L.push(`Oggi è ${fmtDateLong(now)}, ore ${hhmm(now)}.`);
  try { L.push('== QUESTA SETTIMANA ==\n' + weekSummaryText(0)); } catch (e) { L.push(profileLine()); }
  try { L.push('== SETTIMANA SCORSA ==\n' + weekSummaryText(1).split('\n').slice(1).join('\n')); } catch (e) { }
  if (typeof deloadOn === 'function' && deloadOn()) L.push('In questo momento è in settimana di scarico.');
  if (S.routines.length) {
    const nx = nextRoutine();
    L.push('== SCHEDE ==' + (nx ? ` (prossima in ordine: ${nx.name})` : ''));
    for (const r of S.routines.slice(0, 10)) {
      L.push(`- ${r.name}: ` + r.ex.map(e => { const p = planOf(e).filter(s => s.t !== 'w'); const reps = [...new Set(p.map(s => repTxt(s.a, s.b)).filter(Boolean))].join('/'); return `${ex(e.id).n} ${p.length}×${reps || '?'}`; }).join('; '));
      if (r.note) L.push(`  Note: ${String(r.note).replace(/\s+/g, ' ').slice(0, 300)}`);
    }
  }
  const last = [...S.workouts].sort((a, b) => b.start - a.start).slice(0, 3);
  if (last.length) {
    L.push('== ULTIMI ALLENAMENTI (serie allenanti kg×reps @RIR) ==');
    for (const w of last) {
      L.push(`- ${fmtDate(w.start)} ${w.name} (${Math.round(((w.end || w.start) - w.start) / 60000)} min)`);
      for (const e of w.ex) { const ss = workSets(e); if (ss.length) L.push(`  ${ex(e.id).n}: ${ss.map(s => fmtSet(s, mtOf(e)) + (s.rir != null ? ' @' + s.rir : '')).join(', ')}`); }
    }
  }
  try {
    const best = derive().best, top = Object.entries(best).filter(([, b]) => b.e1rm).sort((a, b) => b[1].sessions - a[1].sessions).slice(0, 10);
    if (top.length) L.push('== MIGLIORI ALZATE (1RM stimato) ==\n' + top.map(([id, b]) => `${ex(id).n} ${fmtKg(b.e1rm)} kg (${b.sessions} sedute)`).join('; '));
  } catch (e) { }
  try { const t = daySummaryText([todayKey()]); if (t) L.push('== DIETA DI OGGI ==\n' + t); } catch (e) { }
  return L.join('\n');
}
function chatSystem() {
  return `Sei il coach di Forgia, l'app di ${S.profile.name || 'questo atleta'}: allenatore e nutrizionista sportivo esperto. Hai i suoi dati qui sotto, aggiornati ad ora.
Regole: rispondi in italiano semplice e diretto, frasi brevi, punti elenco quando aiutano, numeri concreti (serie, kg, kcal, grammi). Usa i dati e citali quando servono; se un dato manca dillo, non inventarlo. Se una cosa non conviene dillo chiaramente. Niente premesse, niente saluti, niente tono da marketing. Risposte brevi (massimo ~150 parole) a meno che non ti chieda un piano o una spiegazione completa. Per dolori o problemi di salute seri consiglia un medico o un fisioterapista.

DATI DELL'ATLETA
${chatContext()}${aiLangNote()}`;
}
/* send the conversation; onText gets the text so far (streaming with the API key) */
async function chatSend(msgs, onText) {
  const sys = chatSystem();
  if (SAMPLE) {
    const tr = msgs.map(m => (m.role === 'user' ? 'ATLETA: ' : 'COACH: ') + m.text).join('\n\n');
    const r = await SAMPLE(`${sys}\n\nCONVERSAZIONE\n${tr}\n\nCOACH:`, { modelTier: 'default' });
    onText(r.text); return r.text;
  }
  if (!S.ai?.key) throw { code: 'no_key' };
  const body = { model: S.ai.model || 'claude-haiku-4-5', max_tokens: 1400, system: sys, messages: msgs.map(m => ({ role: m.role, content: m.text })), stream: true };
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': S.ai.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify(body) });
  if (!r.ok) { const d = await r.json().catch(() => ({})); throw { code: r.status === 401 ? 'bad_key' : r.status === 429 ? 'rate' : 'http', message: d?.error?.message || ('HTTP ' + r.status) }; }
  let text = '';
  if (!r.body || !r.body.getReader) { const raw = await r.text(); for (const ln of raw.split('\n')) text += chatDelta(ln); onText(text); return text; }
  const rd = r.body.getReader(), dec = new TextDecoder(); let buf = '';
  for (;;) {
    const { done, value } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n'); buf = lines.pop();
    let add = ''; for (const ln of lines) add += chatDelta(ln);
    if (add) { text += add; onText(text); }
  }
  text += chatDelta(buf); onText(text);
  return text;
}
function chatDelta(ln) {
  if (!ln.startsWith('data:')) return '';
  try { const j = JSON.parse(ln.slice(5)); if (j.type === 'content_block_delta' && j.delta && j.delta.type === 'text_delta') return j.delta.text; if (j.type === 'error') throw { code: 'http', message: j.error?.message }; } catch (e) { if (e && e.code) throw e; }
  return '';
}
function chatMsgHTML(m, i) {
  if (m.role === 'user') return `<div class="cm-u" data-nt>${esc(m.text).replace(/\n/g, '<br>')}</div>`;
  return `<div class="cm-a ${m.err ? 'err' : ''}"><div class="cm-av">${icon('sparkle', 15)}</div><div class="cm-b"><div data-nt>${m.err ? esc(m.text) : mdLite(m.text)}</div>${m.err ? `<button class="btn sm" data-a="chatRetry">${icon('refresh', 14)} Riprova</button>` : `<button class="link small cm-copy" data-a="chatCopy" data-i="${i}">${icon('copy', 13)} Copia</button>`}</div></div>`;
}
function layerChat(l) {
  const log = chatLog(), ready = aiReady();
  return `<div class="layer chat">${head(`${icon('sparkle', 18)} Coach AI`, 'back', log.length ? `<button class="icon-btn" data-a="chatClear" aria-label="Nuova chat">${icon('trash', 19)}</button>` : '')}
    <div class="layer-body chat-log" id="chat-log"><div class="layer-inner">
      ${!log.length ? `<div class="chat-hi"><div class="chat-hi-ic">${icon('sparkle', 26)}</div><b>Chiedimi qualsiasi cosa</b><div class="small muted">Conosco i tuoi allenamenti, le schede, la dieta, il peso, il sonno e le corse. Rispondo con i tuoi numeri, non con consigli generici.</div></div>
        <div class="chat-sugg">${CHAT_SUGG.map(q => `<button class="chip" data-a="chatAsk" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      ${log.map(chatMsgHTML).join('')}
      ${l.busy ? `<div class="cm-a live"><div class="cm-av">${icon('sparkle', 15)}</div><div class="cm-b"><div id="chat-live" data-nt>${l.live ? mdLite(l.live) : '<span class="typing"><i></i><i></i><i></i></span>'}</div></div></div>` : ''}
      ${!ready ? `<div class="card tight small"><b>Per la chat serve la chiave API</b><div class="muted" style="margin:4px 0 8px">Inseriscila in Profilo → Coach AI (con Haiku una risposta costa meno di 1 centesimo). Gratis: copia la domanda con i tuoi dati e incollala in una chat con Claude.</div><div class="row"><button class="btn sm" data-a="chatToProfile">Vai al Profilo</button><button class="btn sm" data-a="chatCopyCtx">${icon('copy', 14)} Copia per Claude</button></div></div>` : ''}
    </div></div>
    <div class="chat-bar"><textarea id="chat-in" class="input" rows="1" data-in="chatDraft" placeholder="Scrivi una domanda…" aria-label="Domanda al coach">${esc(l.draft || '')}</textarea><button class="btn primary chat-send" data-a="chatGo" aria-label="Invia" ${l.busy ? 'disabled' : ''}>${icon('send', 19)}</button></div>
  </div>`;
}
LAYER_RENDER.chat = layerChat;
function chatScroll() { const el = $('#chat-log'); if (el) el.scrollTop = el.scrollHeight; }
function chatAfterRender() {
  const l = topLayer(); if (!l || l.type !== 'chat') return;
  if (window.visualViewport) { const el = document.querySelector('.layer.chat'); if (el && Math.abs(visualViewport.height - innerHeight) > 40) { el.style.height = visualViewport.height + 'px'; el.style.top = visualViewport.offsetTop + 'px'; el.style.bottom = 'auto'; } }
  const ta = $('#chat-in'); if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(140, ta.scrollHeight) + 'px'; }
  if (l.scrollEnd !== false) chatScroll();
}
async function chatRun(q) {
  const l = topLayer(); if (!l || l.type !== 'chat' || l.busy) return;
  q = (q || '').trim();
  if (!q) return;
  if (!aiReady()) { l.draft = q; renderLayers(); toast('Serve la chiave API: Profilo → Coach AI'); return; }
  const log = chatLog();
  if (log.length && log[log.length - 1].err) log.pop();
  log.push({ role: 'user', text: q, t: Date.now() });
  l.draft = ''; l.busy = true; l.live = ''; save(); renderLayers();
  const msgs = log.filter(m => !m.err).slice(-16);
  while (msgs.length && msgs[0].role !== 'user') msgs.shift();
  let last = 0;
  try {
    const text = await chatSend(msgs, t => {
      l.live = t; const now = Date.now(); if (now - last < 60) return; last = now;
      const el = document.getElementById('chat-live'); if (el) { el.innerHTML = mdLite(t); const lg = $('#chat-log'); if (lg && lg.scrollHeight - lg.scrollTop - lg.clientHeight < 140) chatScroll(); }
    });
    log.push({ role: 'assistant', text: (text || '').trim() || '…', t: Date.now() });
  } catch (e) { log.push({ role: 'assistant', text: aiErr(e), err: true, t: Date.now() }); }
  if (log.length > CHAT_MAX) log.splice(0, log.length - CHAT_MAX);
  l.busy = false; l.live = ''; save();
  if (UI.layers.includes(l)) renderLayers();
}
Object.assign(A, {
  chatOpen(el) { pushLayer({ type: 'chat', draft: (el && el.dataset && el.dataset.q) || '' }); setTimeout(() => { const t = $('#chat-in'); if (t && el && el.dataset && el.dataset.q) { t.focus(); t.setSelectionRange(t.value.length, t.value.length); } }, 250); },
  chatAsk(el) { chatRun(el.dataset.q); },
  chatGo() { const t = $('#chat-in'); chatRun(t ? t.value : topLayer().draft); },
  chatRetry() { const log = chatLog(); if (log.length && log[log.length - 1].err) log.pop(); const u = log.length && log[log.length - 1].role === 'user' ? log.pop() : null; save(); if (u) chatRun(u.text); },
  chatClear() { pushLayer({ type: 'confirm', title: 'Nuova chat?', text: 'La conversazione attuale viene cancellata da questo telefono.', ok: 'Cancella', danger: true, fn: () => { S.ai.chat = []; save(); } }); },
  async chatCopy(el) { const m = chatLog()[+el.dataset.i]; if (!m) return; try { await navigator.clipboard.writeText(m.text); toast('Copiato'); } catch (e) { toast('Non riesco a copiare'); } },
  chatCopyCtx() { const t = $('#chat-in'), q = (t && t.value.trim()) || 'Analizza i miei dati e dimmi le 3 cose più importanti da migliorare.'; copyForClaude(`${chatSystem()}\n\nDOMANDA\n${q}`); },
  chatToProfile() { UI.layers = []; A.tab({ dataset: { k: 'profile' } }); },
});
document.addEventListener('input', ev => { const el = ev.target; if (el.dataset && el.dataset.in === 'chatDraft') { const l = topLayer(); if (l && l.type === 'chat') l.draft = el.value; el.style.height = 'auto'; el.style.height = Math.min(140, el.scrollHeight) + 'px'; } });
document.addEventListener('keydown', ev => { const el = ev.target; if (el && el.id === 'chat-in' && ev.key === 'Enter' && !ev.shiftKey && !('ontouchstart' in window)) { ev.preventDefault(); A.chatGo(); } });
/* iPhone keyboard: keep the input bar above it */
if (window.visualViewport) {
  const fit = () => { const el = document.querySelector('.layer.chat'); if (!el) return; const vv = window.visualViewport; el.style.height = vv.height + 'px'; el.style.top = vv.offsetTop + 'px'; el.style.bottom = 'auto'; if (document.activeElement && document.activeElement.id === 'chat-in') chatScroll(); };
  visualViewport.addEventListener('resize', fit); visualViewport.addEventListener('scroll', fit);
}
