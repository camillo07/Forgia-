/* =========================================================
   MAPPA REALE (OpenStreetMap + Leaflet, senza account né chiavi)
   Il percorso disegnato resta sotto come riserva: offline o senza mappa si vede quello.
   ========================================================= */
const MAP = { lib: null, live: null, box: null, line: null, dot: null, follow: true, n: 0 };
function mapOn() { return S.profile.mapOff !== true && navigator.onLine !== false; }
function leafletReady() {
  if (window.L && window.L.map) return Promise.resolve(window.L);
  if (!MAP.lib) MAP.lib = loadScript('leaflet.min.js').then(() => window.L || null).catch(() => { MAP.lib = null; return null; });
  return MAP.lib;
}
function osmLayer(L, el) {
  let ok = 0, fail = 0;
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' })
    .on('tileload', () => { ok++; if (ok === 1) el.classList.add('has-map'); })
    .on('tileerror', () => { fail++; if (fail > 8 && !ok) el.classList.remove('has-map'); });
}
function kmMarks(route) {
  const out = []; let m = 0, next = 1000;
  for (let i = 1; i < route.length; i++) {
    const d = hav(route[i - 1], route[i]);
    while (d > 0 && m + d >= next) { const f = (next - m) / d; out.push([route[i - 1][0] + (route[i][0] - route[i - 1][0]) * f, route[i - 1][1] + (route[i][1] - route[i - 1][1]) * f, next / 1000]); next += 1000; }
    m += d;
  }
  return out;
}
function mountRouteMap(el, route) {
  if (!mapOn() || !route || route.length < 2 || el.dataset.mapped) return;
  el.dataset.mapped = '1';
  leafletReady().then(L => {
    if (!L || !document.contains(el)) return;
    const box = document.createElement('div'); box.className = 'lmap'; el.appendChild(box);
    const map = L.map(box, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
    osmLayer(L, el).addTo(map);
    const ll = route.map(p => [p[0], p[1]]);
    L.polyline(ll, { color: '#ff6b2c', weight: 9, opacity: .25 }).addTo(map);
    const line = L.polyline(ll, { color: '#ff8a3d', weight: 4 }).addTo(map);
    L.circleMarker(ll[0], { radius: 7, color: '#11151b', weight: 2, fillColor: '#3ddc97', fillOpacity: 1 }).addTo(map);
    L.circleMarker(ll[ll.length - 1], { radius: 7, color: '#11151b', weight: 2, fillColor: '#ff5c6c', fillOpacity: 1 }).addTo(map);
    for (const [la, lo, k] of kmMarks(route)) L.marker([la, lo], { icon: L.divIcon({ className: 'km-ic', html: String(k), iconSize: [22, 22] }), interactive: false }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [20, 20] });
  });
}
/* live map: one Leaflet instance kept alive across re-renders of the run screen */
function liveMapMount(slot) {
  const a = S.runActive; if (!a || !mapOn()) return;
  if (MAP.box) { slot.appendChild(MAP.box); slot.classList.toggle('has-map', MAP.ok); setTimeout(() => MAP.live && MAP.live.invalidateSize(), 0); return; }
  MAP.box = document.createElement('div'); MAP.box.className = 'lmap'; slot.appendChild(MAP.box); MAP.follow = true; MAP.ok = false;
  leafletReady().then(L => {
    if (!L || !MAP.box || !S.runActive) return;
    const P = S.runActive.pts, c = P.length ? [P[P.length - 1][0], P[P.length - 1][1]] : [41.9, 12.5];
    MAP.live = L.map(MAP.box, { zoomControl: false, attributionControl: true }).setView(c, P.length ? 16 : 5);
    osmLayer(L, slot).on('tileload', () => { MAP.ok = true; }).addTo(MAP.live);
    MAP.line = L.polyline(P.map(p => [p[0], p[1]]), { color: '#ff8a3d', weight: 5 }).addTo(MAP.live);
    MAP.dot = L.circleMarker(c, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f80ff', fillOpacity: 1 }).addTo(MAP.live);
    MAP.n = P.length;
    MAP.live.on('dragstart', () => { MAP.follow = false; const b = document.getElementById('rn-center'); if (b) b.hidden = false; });
  });
}
function liveMapUpdate() {
  const a = S.runActive; if (!a || !MAP.live || !MAP.line) return;
  const P = a.pts; for (let i = MAP.n; i < P.length; i++) MAP.line.addLatLng([P[i][0], P[i][1]]); MAP.n = P.length;
  if (!P.length) return;
  const c = [P[P.length - 1][0], P[P.length - 1][1]]; MAP.dot.setLatLng(c);
  if (MAP.follow) MAP.live.setView(c, Math.max(MAP.live.getZoom(), 16), { animate: true });
}
function liveMapDestroy() { try { MAP.live && MAP.live.remove(); } catch (e) { } Object.assign(MAP, { live: null, box: null, line: null, dot: null, n: 0, follow: true }); }
function mapsAfterRender() {
  document.querySelectorAll('.route-card[data-map]').forEach(el => {
    const k = el.dataset.map;
    if (k === 'live') return liveMapMount(el);
    if (k === 'draft') { const l = UI.layers.find(x => x.type === 'runEdit'); return mountRouteMap(el, l && l.draft.route); }
    if (k.startsWith('run:')) { const r = runs().find(x => x.id === k.slice(4)); return mountRouteMap(el, r && r.route); }
  });
}
Object.assign(A, {
  mapFollow(el) { MAP.follow = true; el.hidden = true; liveMapUpdate(); },
  runViewMode(el) { UI.runMode = el.dataset.v; renderLayers(); },
  mapToggle() { S.profile.mapOff = S.profile.mapOff !== true; save(); render(); },
});
