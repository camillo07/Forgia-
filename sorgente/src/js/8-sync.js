/* =========================================================
   ACCOUNT E SINCRONIZZAZIONE (Supabase)
   Una riga per oggetto: allenamento (w), scheda (r), giorno di diario (d),
   alimento personale (f), pasto salvato (m), giorno corpo (b), corsa (u), impostazioni (s).
   ========================================================= */
const SUPA = /*__SUPA__*/{ url: '', key: '' };
const SYNC_KEY = 'forgia.sync';
const SYNC = { client: null, user: null, busy: false, again: false, timer: null, status: 'off', lastOk: 0, err: '' };
function syncConfigured() { return !!(SUPA.url && SUPA.key && window.FORGIA_PWA); }
/* the installed app requires an account: no session = login screen */
function storedSession() { try { return !!localStorage.getItem('forgia.auth'); } catch (e) { return false; } }
function gateNeeded() { return syncConfigured() && !SYNC.user && !(SYNC.loading && storedSession()); }
function viewGate() {
  const loading = SYNC.loading || (!SYNC.client && !SYNC.err);
  return `<div class="stack" style="gap:22px;padding-top:12px">
    <div class="row">${hexBadge('F', 60)}<div><div class="eyebrow">Benvenuto in</div><div class="page-head"><h1 style="font-size:46px">Forgia</h1></div></div></div>
    <p class="muted" style="margin:0;max-width:52ch">Allenamenti, dieta e corpo in un'unica app. Per usarla serve un account gratuito: i tuoi dati restano salvati e li ritrovi su telefono e PC.</p>
    ${loading ? `<div class="card tight small muted">Un attimo…</div>` : !SYNC.client ? `<div class="card tight small">${icon('info', 14)} ${navigator.onLine ? esc(SYNC.err || 'Non riesco a collegarmi.') : 'Sei offline: per accedere la prima volta serve internet.'}<button class="btn sm" data-a="gateRetry" style="margin-top:8px">Riprova</button></div>` : accountCard(true)}
    <div class="small faint">Hai già usato Forgia su questo telefono senza account? Accedi o registrati: i dati che hai qui vengono salvati nel tuo account.</div>
  </div>`;
}
function syncMeta() { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || { hashes: {}, last: null }; } catch (e) { return { hashes: {}, last: null }; } }
function syncMetaSave(m) { try { localStorage.setItem(SYNC_KEY, JSON.stringify(m)); } catch (e) { } }
function fnv(str) { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(36); }

/* local state -> items */
function localItems() {
  const m = new Map();
  for (const w of S.workouts) if (!w.demo) m.set('w|' + w.id, w);
  S.routines.forEach((r, i) => m.set('r|' + r.id, { ...r, _o: i }));
  for (const [k, d] of Object.entries(S.diary)) {
    const e = (d.e || []).filter(x => !x.demo);
    if (e.length || d.type) m.set('d|' + k, { e, type: d.type || null });
  }
  for (const [id, f] of Object.entries(S.foods)) m.set('f|' + id, f);
  for (const sm of S.savedMeals) m.set('m|' + sm.id, sm);
  for (const [k, b] of Object.entries(S.body || {})) if (!b.demo) m.set('b|' + k, b);
  for (const [k, h] of Object.entries(S.health || {})) m.set('h|' + k, h);
  for (const r of S.runs || []) if (!r.demo) m.set('u|' + r.id, r);
  m.set('s|main', { profile: S.profile, nutri: S.nutri, exType: S.exType || {}, exNotes: S.exNotes, customEx: S.customEx, customTags: S.customTags || [], folders: S.folders || [], exRir: S.exRir || {}, rm: S.rm || {}, runPlan: S.runPlan || null, shop: S.shop || null, favEx: S.favEx || [], favFood: S.favFood || [], aiModel: S.ai?.model });
  return m;
}
function applyItem(kind, id, data, deleted) {
  if (kind === 'w') { S.workouts = S.workouts.filter(w => w.id !== id); if (!deleted) S.workouts.push(data); }
  else if (kind === 'r') { S.routines = S.routines.filter(r => r.id !== id); if (!deleted) S.routines.push(data); S.routines.sort((a, b) => (a._o ?? 0) - (b._o ?? 0)); }
  else if (kind === 'd') { const demo = (S.diary[id]?.e || []).filter(e => e.demo); if (deleted && !demo.length) delete S.diary[id]; else S.diary[id] = { e: [...demo, ...(deleted ? [] : data.e || [])], type: deleted ? null : data.type }; }
  else if (kind === 'f') { if (deleted) delete S.foods[id]; else S.foods[id] = data; }
  else if (kind === 'h') { S.health = S.health || {}; if (deleted) delete S.health[id]; else S.health[id] = data; }
  else if (kind === 'b') { S.body = S.body || {}; if (deleted) delete S.body[id]; else S.body[id] = data; }
  else if (kind === 'u') { S.runs = (S.runs || []).filter(x => x.id !== id); if (!deleted) S.runs.push(data); }
  else if (kind === 'm') { S.savedMeals = S.savedMeals.filter(x => x.id !== id); if (!deleted) S.savedMeals.push(data); }
  else if (kind === 's' && !deleted && data) {
    S.profile = Object.assign(defaultState().profile, data.profile || {}, { onboarded: true });
    S.nutri = data.nutri || S.nutri; S.exType = data.exType || {}; S.exNotes = data.exNotes || {}; S.customEx = data.customEx || []; S.customTags = data.customTags || []; S.folders = data.folders || S.folders || []; S.exRir = data.exRir || S.exRir || {}; S.rm = data.rm || S.rm || {};
    if ('runPlan' in data) S.runPlan = data.runPlan;
    if ('shop' in data) S.shop = data.shop;
    if (Array.isArray(data.favEx)) S.favEx = data.favEx;
    if (Array.isArray(data.favFood)) S.favFood = data.favFood;
    if (data.aiModel) S.ai.model = data.aiModel;
    applyLang();
  }
}

/* ---------- client & auth ---------- */
async function syncInit() {
  if (!syncConfigured()) return null;
  if (SYNC.client) return SYNC.client;
  SYNC.loading = true;
  try {
    if (!window.supabase) await loadScript('supabase.min.js');
    SYNC.client = window.supabase.createClient(SUPA.url, SUPA.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'forgia.auth' } });
    SYNC.client.auth.onAuthStateChange((ev, session) => {
      const was = SYNC.user?.id;
      SYNC.user = session?.user || null;
      if (ev === 'PASSWORD_RECOVERY') setTimeout(() => pushLayer({ type: 'pwReset' }), 300);
      if (SYNC.user && SYNC.user.id !== was) {
        const m = syncMeta();
        if (m.uid && m.uid !== SYNC.user.id) {
          // another account on this device: start clean, never mix two people's data
          const key = S.ai?.key || ''; S = defaultState(); S.ai.key = key; try { localStorage.setItem(KEY, serialize(S)); } catch (e) { }
          syncMetaSave({ hashes: {}, last: null, uid: SYNC.user.id });
        }
        syncNow();
      }
      if ((SYNC.user?.id || null) !== (was || null) || UI.tab === 'me' || !S.profile.onboarded) render();
    });
    const { data } = await SYNC.client.auth.getSession();
    SYNC.user = data.session?.user || null;
    SYNC.loading = false;
    // removed or banned accounts lose access as soon as the app is online
    if (SYNC.user && navigator.onLine && SYNC.client.auth.getUser) SYNC.client.auth.getUser().then(({ error }) => { if (error && (error.status === 401 || error.status === 403 || /not found|banned|invalid|expired|missing/i.test(error.message || ''))) SYNC.client.auth.signOut({ scope: 'local' }).catch(() => { }).finally(() => { SYNC.user = null; render(); toast('Accesso non più valido: entra di nuovo'); }); }).catch(() => { });
    return SYNC.client;
  } catch (e) { SYNC.loading = false; SYNC.err = 'Libreria di sincronizzazione non caricata (sei offline?)'; return null; }
}
function syncSoon(ms = 3000) { if (!SYNC.user) return; clearTimeout(SYNC.timer); SYNC.timer = setTimeout(syncNow, ms); }
async function pullSince(since, onRow) {
  let from = 0, maxTs = since;
  for (; ;) {
    let q = SYNC.client.from('items').select('kind,id,data,deleted,updated_at').order('updated_at', { ascending: true }).range(from, from + 999);
    if (since) q = q.gte('updated_at', since);
    const { data, error } = await q; if (error) throw error;
    for (const r of data) { onRow(r); if (!maxTs || r.updated_at > maxTs) maxTs = r.updated_at; }
    if (data.length < 1000) break; from += 1000;
  }
  return maxTs;
}
async function pushRows(rows) {
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await SYNC.client.from('items').upsert(rows.slice(i, i + 200), { onConflict: 'user_id,kind,id' });
    if (error) throw error;
  }
}
function rowFor(key, data, deleted) { const [kind, ...rest] = key.split('|'); return { user_id: SYNC.user.id, kind, id: rest.join('|'), data: deleted ? null : JSON.parse(serialize(data)), deleted: !!deleted }; }
async function syncNow() {
  if (!SYNC.client || !SYNC.user || !navigator.onLine) return;
  if (SYNC.busy) { SYNC.again = true; return; }
  SYNC.busy = true; SYNC.status = 'sync'; SYNC.err = ''; updateSyncBadge();
  const meta = syncMeta(); meta.uid = SYNC.user.id;
  let changed = false;
  try {
    if (!meta.last) {
      // first sync on this device: what is online wins, then upload what exists only here
      const remoteKeys = new Set();
      const maxTs = await pullSince(null, r => {
        const key = r.kind + '|' + r.id; remoteKeys.add(key);
        if (!r.deleted) { applyItem(r.kind, r.id, r.data, false); changed = true; meta.hashes[key] = fnv(serialize(r.data)); }
      });
      const rows = [];
      for (const [key, data] of localItems()) if (!remoteKeys.has(key)) { rows.push(rowFor(key, data)); meta.hashes[key] = fnv(serialize(data)); }
      await pushRows(rows);
      // no server time yet: start from zero (never trust this device's clock); the next pull fixes it
      meta.last = maxTs || '1970-01-01T00:00:00Z';
    } else {
      // 1) push local changes
      const cur = localItems(), rows = [], newHash = {};
      for (const [key, data] of cur) { const h = fnv(serialize(data)); newHash[key] = h; if (meta.hashes[key] !== h) rows.push(rowFor(key, data)); }
      for (const key of Object.keys(meta.hashes)) if (!cur.has(key)) rows.push(rowFor(key, null, true));
      await pushRows(rows);
      for (const r of rows) { const key = r.kind + '|' + r.id; if (r.deleted) delete meta.hashes[key]; else meta.hashes[key] = newHash[key]; }
      // 2) pull changes made on other devices
      meta.last = await pullSince(meta.last, r => {
        const key = r.kind + '|' + r.id, h = r.deleted ? null : fnv(serialize(r.data));
        const differs = r.deleted ? key in meta.hashes : meta.hashes[key] !== h;
        if (differs) { applyItem(r.kind, r.id, r.data, r.deleted); changed = true; }
        if (r.deleted) delete meta.hashes[key]; else meta.hashes[key] = h;
      });
    }
    syncMetaSave(meta);
    SYNC.status = 'ok'; SYNC.lastOk = Date.now();
    if (changed && typeof microFillAll === 'function' && microFillAll()) save();
    if (changed) {
      CACHE.k = null; try { localStorage.setItem(KEY, serialize(S)); } catch (e) { }
      const ae = document.activeElement; if (!ae || !/INPUT|TEXTAREA|SELECT/.test(ae.tagName)) render();
    }
  } catch (e) {
    SYNC.status = 'err'; SYNC.err = e?.message || 'Errore di sincronizzazione';
  } finally {
    SYNC.busy = false; updateSyncBadge();
    if (SYNC.again) { SYNC.again = false; syncSoon(1000); }
  }
}
function updateSyncBadge() { const el = $('#sync-state'); if (el) el.innerHTML = syncStateText(); }
function syncStateText() {
  if (!SYNC.user) return '';
  if (SYNC.status === 'sync') return `<span class="muted">${icon('swap', 14)} Sincronizzo…</span>`;
  if (SYNC.status === 'err') return `<span style="color:var(--bad)">${icon('info', 14)} ${esc(SYNC.err)}</span>`;
  if (SYNC.lastOk) return `<span style="color:var(--good)">${icon('check', 14)} Sincronizzato alle ${new Date(SYNC.lastOk).toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' })}</span>`;
  return '';
}

/* ---------- UI ---------- */
function accountCard(gate) {
  if (!window.FORGIA_PWA) return `<div class="card tight small muted">${icon('info', 14)} Account e sincronizzazione funzionano nell'app installata (GitHub Pages), non in questa anteprima.</div>`;
  if (!SUPA.url) return '';
  if (!SYNC.client) return `<div class="card tight small muted">${SYNC.err || 'Carico la sincronizzazione…'}</div>`;
  if (SYNC.user) return `<div class="card">
      <div class="row"><span class="coach-ic">${icon('user', 20)}</span><div class="grow" style="min-width:0"><b style="overflow-wrap:anywhere">${esc(SYNC.user.email)}</b><div class="small" id="sync-state">${syncStateText()}</div></div></div>
      <div class="small muted">I tuoi dati sono salvati online e sincronizzati su tutti i dispositivi dove accedi con questo account. Solo tu puoi vederli.</div>
      <div class="row"><button class="btn grow" data-a="syncNow">${icon('swap', 16)} Sincronizza ora</button><button class="btn ghost" data-a="logout" style="color:var(--bad)">Esci</button></div>
    </div>`;
  return `<div class="card">
      ${gate ? `<div><b>Accedi o crea un account</b><div class="small muted">Se ti registri ora ti arriva una mail di conferma: aprila, poi torna qui e premi "Accedi".</div></div>` : `<div><b>Salva i tuoi dati online</b><div class="small muted">Crea un account per non perdere niente e usare l'app su telefono e PC.</div></div>`}
      <div class="field"><label for="acc-email">Email</label><input id="acc-email" class="input" type="email" autocomplete="email" autocapitalize="off" maxlength="80"></div>
      <div class="field"><label for="acc-pw">Password</label><input id="acc-pw" class="input" type="password" autocomplete="current-password" maxlength="72" placeholder="Almeno 8 caratteri"></div>
      <div id="acc-msg" class="small"></div>
      <div class="row"><button class="btn primary grow" data-a="login">Accedi</button><button class="btn grow" data-a="signup">Crea account</button></div>
      <button class="link small" data-a="pwForgot" style="color:var(--gold);text-align:left">Password dimenticata?</button>
    </div>`;
}
function layerPwReset() {
  return `<div class="layer modal" data-a="backdrop"><div class="sheet" role="dialog" aria-label="Nuova password"><div class="grab"></div><h3>Nuova password</h3>
    <div class="stack"><div class="field"><label for="pw-new">Nuova password</label><input id="pw-new" class="input" type="password" autocomplete="new-password" maxlength="72"></div>
    <div id="pw-msg" class="small"></div><button class="btn primary block" data-a="pwSave">Salva password</button></div></div></div>`;
}
Object.assign(LAYER_RENDER, { pwReset: layerPwReset });
function accMsg(t, bad) { const m = $('#acc-msg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--bad)' : 'var(--good)'; } }
function authErr(e) {
  const m = (e?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email o password sbagliate.';
  if (m.includes('not confirmed')) return 'Devi prima confermare l\'email: apri il link che ti è arrivato.';
  if (m.includes('already registered')) return 'Esiste già un account con questa email: usa "Accedi".';
  if (m.includes('password')) return 'Password troppo debole: usa almeno 8 caratteri.';
  if (m.includes('rate limit')) return 'Troppi tentativi: riprova tra qualche minuto.';
  return e?.message || 'Errore, riprova.';
}
Object.assign(A, {
  async login() {
    const email = $('#acc-email').value.trim(), password = $('#acc-pw').value;
    if (!email || !password) return accMsg('Inserisci email e password', true);
    accMsg('Accedo…');
    const { error } = await SYNC.client.auth.signInWithPassword({ email, password });
    if (error) accMsg(authErr(error), true); else toast('Accesso effettuato: sincronizzo i dati');
  },
  async signup() {
    const email = $('#acc-email').value.trim(), password = $('#acc-pw').value;
    if (!email || password.length < 8) return accMsg('Inserisci l\'email e una password di almeno 8 caratteri', true);
    accMsg('Creo l\'account…');
    const { data, error } = await SYNC.client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) return accMsg(authErr(error), true);
    if (!data.session) accMsg('Ti ho mandato una mail: apri il link per confermare, poi torna qui e premi "Accedi".');
    else toast('Account creato: sincronizzo i dati');
  },
  async pwForgot() {
    const email = $('#acc-email').value.trim(); if (!email) return accMsg('Scrivi prima la tua email', true);
    const { error } = await SYNC.client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    accMsg(error ? authErr(error) : 'Ti ho mandato una mail con il link per cambiare password.', !!error);
  },
  async pwSave() {
    const pw = $('#pw-new').value; const m = $('#pw-msg');
    if (pw.length < 8) { m.textContent = 'Almeno 8 caratteri'; m.style.color = 'var(--bad)'; return; }
    const { error } = await SYNC.client.auth.updateUser({ password: pw });
    if (error) { m.textContent = authErr(error); m.style.color = 'var(--bad)'; return; }
    popLayer(); toast('Password aggiornata');
  },
  syncNow() { syncNow(); },
  logout() {
    pushLayer({
      type: 'confirm', title: 'Uscire dall\'account?', text: 'I tuoi dati restano salvati online. Per usare di nuovo l\'app dovrai accedere.', ok: 'Esci',
      fn: async () => { const uid = SYNC.user?.id; await SYNC.client.auth.signOut(); syncMetaSave({ hashes: {}, last: null, uid }); SYNC.status = 'off'; SYNC.lastOk = 0; render(); toast('Sei uscito'); }
    });
  },
});
window.addEventListener('online', () => syncSoon(500));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncSoon(800); else if (SYNC.user) syncNow(); });
if (syncConfigured()) { SYNC.loading = true; syncInit().then(() => render()); }
A.gateRetry = () => { SYNC.client = null; SYNC.err = ''; render(); syncInit().then(() => render()); };
