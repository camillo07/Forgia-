/* ---------- boot ---------- */
if (S.active && S.active.restEnd && S.active.restEnd < Date.now()) { S.active.restEnd = 0; S.active.restBeeped = true; }
try { if (!S.profile.onboarded && !S.profile.langSet) { const l = (navigator.language || 'it').slice(0, 2).toLowerCase(); S.profile.lang = l === 'es' || l === 'en' ? l : 'it'; } applyLang(); } catch (e) { }
try { if (microFillAll()) save(); } catch (e) { }
render();
if (S.active) { pushLayer({ type: 'workout' }); requestWake(); }
if (window.FORGIA_PWA && 'serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
