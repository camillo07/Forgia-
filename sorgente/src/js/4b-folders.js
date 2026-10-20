/* =========================================================
   CARTELLE DELLE SCHEDE
   S.folders = [{ id, name, img (dataURL piccolo, quadrato) | null, c (colore) }]
   routine.fid = id della cartella (assente = fuori dalle cartelle)
   ========================================================= */
const FOLDER_COLORS = ['#ff6b2c', '#7fb2e5', '#3ddc97', '#c792ea', '#ffb547', '#ff5c6c'];
function folders() { return S.folders || (S.folders = []); }
function folderById(id) { return folders().find(f => f.id === id) || null; }
function folderOf(r) { return r.fid ? folderById(r.fid) : null; }
function folderIcon(f, size = 48) {
  return f.img ? `<img class="fold-img" src="${f.img}" alt="" style="width:${size}px;height:${size}px">`
    : `<span class="fold-img" style="width:${size}px;height:${size}px;--fc:${f.c || FOLDER_COLORS[0]}">${icon('layers', Math.round(size * 0.45))}</span>`;
}
function routinesHTML(card) {
  const loose = S.routines.filter(r => !folderOf(r));
  const fs = folders();
  if (!S.routines.length && !fs.length) return '';
  const fold = fs.map(f => {
    const rs = S.routines.filter(r => r.fid === f.id), open = !!(UI.fopen && UI.fopen[f.id]);
    return `<div class="folder ${open ? 'open' : ''}" data-fid="${f.id}" style="--fc:${f.c || FOLDER_COLORS[0]}">
      <div class="fold-h"><button class="row grow" data-a="folderToggle" data-id="${f.id}" style="text-align:left;min-width:0">${folderIcon(f)}<div class="grow" style="min-width:0"><b class="fold-n">${esc(f.name)}</b><div class="small muted">${rs.length} ${rs.length === 1 ? 'scheda' : 'schede'}</div></div>${icon(open ? 'up' : 'down', 18)}</button>
        <button class="icon-btn" data-a="folderMenu" data-id="${f.id}" aria-label="Opzioni cartella">${icon('more')}</button></div>
      ${open ? `<div class="fold-body">${rs.length ? rs.map(card).join('') : `<div class="small muted">Vuota. Tieni premuta una scheda e trascinala qui.</div>`}</div>` : ''}
    </div>`;
  }).join('');
  return `<div class="rt-list">${loose.map(card).join('') + fold}</div><div class="small faint" style="text-align:center">Tieni premuta una scheda o una cartella per spostarla</div>`;
}

/* square crop + shrink, returns a small JPEG data URL (syncs with the account) */
function cropSquare(file, size = 200) {
  return new Promise((res, rej) => {
    const img = new Image(), u = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
    img.src = u;
  });
}
function fdInput() { let f = $('#fdFile'); if (!f) { f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.id = 'fdFile'; f.hidden = true; document.body.appendChild(f); } return f; }
const FD = { target: null };
document.addEventListener('change', async ev => {
  const el = ev.target; if (el.id !== 'fdFile' || !el.files || !el.files[0]) return;
  const f = folderById(FD.target); const file = el.files[0]; el.value = '';
  if (!f) return;
  try { f.img = await cropSquare(file); save(); render(); toast('Immagine della cartella aggiornata'); } catch (e) { toast('Non riesco a leggere l\'immagine'); }
});

function folderNameSheet(title, value, action, extra = '') {
  pushLayer({ type: 'sheet', title, html: `<div class="field"><label for="fd-name">Nome della cartella</label><input id="fd-name" class="input" maxlength="40" value="${esc(value || '')}" placeholder="Es. Massa 2026, PPL, Vecchie"></div>
    <div class="row" style="margin-top:8px;gap:8px">${FOLDER_COLORS.map(c => `<button class="fdc ${c === (FD.color || FOLDER_COLORS[0]) ? 'on' : ''}" data-a="fdColor" data-c="${c}" style="background:${c}" aria-label="Colore"></button>`).join('')}</div>
    <button class="btn primary block" style="margin-top:12px" data-a="${action}" ${extra}>Salva</button>`, items: [] });
  setTimeout(() => $('#fd-name')?.focus(), 60);
}
function moveRoutineSheet(r) {
  pushLayer({
    type: 'sheet', title: 'Sposta in cartella', items: [
      { label: 'Nessuna cartella', ic: 'x', on: !r.fid, fn: () => { delete r.fid; save(); } },
      ...folders().map(f => ({ label: f.name, ic: 'layers', on: r.fid === f.id, fn: () => { r.fid = f.id; UI.fopen = UI.fopen || {}; UI.fopen[f.id] = true; save(); } })),
      { label: 'Nuova cartella…', ic: 'plus', fn: () => setTimeout(() => { FD.moveId = r.id; FD.color = FOLDER_COLORS[folders().length % FOLDER_COLORS.length]; folderNameSheet('Nuova cartella', '', 'folderCreate'); }, 0) },
    ]
  });
}

Object.assign(A, {
  folderNew() { FD.moveId = null; FD.color = FOLDER_COLORS[folders().length % FOLDER_COLORS.length]; folderNameSheet('Nuova cartella', '', 'folderCreate'); },
  fdColor(el) { FD.color = el.dataset.c; document.querySelectorAll('.fdc').forEach(b => b.classList.toggle('on', b.dataset.c === FD.color)); },
  folderCreate() {
    const name = ($('#fd-name')?.value || '').trim() || 'Cartella ' + (folders().length + 1);
    const f = { id: uid(), name, img: null, c: FD.color || FOLDER_COLORS[0] }; folders().push(f);
    if (FD.moveId) { const r = S.routines.find(x => x.id === FD.moveId); if (r) r.fid = f.id; FD.moveId = null; }
    UI.fopen = UI.fopen || {}; UI.fopen[f.id] = true;
    save(); popLayer(); render(); toast('Cartella creata');
  },
  folderToggle(el) { UI.fopen = UI.fopen || {}; UI.fopen[el.dataset.id] = !UI.fopen[el.dataset.id]; render(); if (UI.fopen[el.dataset.id]) flash(`.folder[data-fid="${el.dataset.id}"] .fold-body`, 'open-anim'); },
  folderMenu(el) {
    const f = folderById(el.dataset.id); if (!f) return;
    const rs = () => S.routines.filter(r => r.fid === f.id);
    pushLayer({
      type: 'sheet', title: f.name, items: [
        { label: 'Rinomina e colore', ic: 'edit', fn: () => setTimeout(() => { FD.editId = f.id; FD.color = f.c; folderNameSheet('Modifica cartella', f.name, 'folderRename'); }, 0) },
        { label: f.img ? 'Cambia immagine' : 'Aggiungi immagine', desc: 'Dalla galleria o dalla fotocamera', ic: 'camera', fn: () => { FD.target = f.id; fdInput().click(); } },
        ...(f.img ? [{ label: 'Togli immagine', ic: 'x', fn: () => { f.img = null; save(); } }] : []),
        { label: 'Duplica cartella', desc: 'Copia anche tutte le schede', ic: 'copy', fn: () => { const c = { ...f, id: uid(), name: f.name + ' (copia)' }; folders().splice(folders().indexOf(f) + 1, 0, c); for (const r of rs()) { const n = JSON.parse(JSON.stringify(r)); n.id = uid(); n.fid = c.id; S.routines.push(n); } save(); toast('Cartella duplicata'); } },
        ...(folders().indexOf(f) > 0 ? [{ label: 'Sposta su', ic: 'up', fn: () => { const a = folders(), i = a.indexOf(f); a.splice(i - 1, 0, a.splice(i, 1)[0]); save(); } }] : []),
        { label: 'Elimina cartella', desc: 'Le schede restano, fuori dalle cartelle', ic: 'trash', danger: true, fn: () => { for (const r of rs()) delete r.fid; S.folders = folders().filter(x => x !== f); save(); } },
        ...(rs().length ? [{ label: 'Elimina cartella e schede', desc: `${rs().length} schede. Lo storico degli allenamenti resta.`, ic: 'trash', danger: true, fn: () => setTimeout(() => pushLayer({ type: 'confirm', title: 'Eliminare cartella e schede?', text: `“${f.name}” e le sue ${rs().length} schede verranno eliminate.`, ok: 'Elimina', danger: true, fn: () => { S.routines = S.routines.filter(r => r.fid !== f.id); S.folders = folders().filter(x => x !== f); save(); } }), 0) }] : []),
      ]
    });
  },
  folderRename() { const f = folderById(FD.editId); if (!f) return popLayer(); const n = ($('#fd-name')?.value || '').trim(); if (n) f.name = n; f.c = FD.color || f.c; save(); popLayer(); render(); },
  routineMove(el) { const r = S.routines.find(x => x.id === el.dataset.id); if (r) moveRoutineSheet(r); },
});
