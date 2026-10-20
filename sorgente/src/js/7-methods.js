/* =========================================================
   METODI E TECNICHE DI ALLENAMENTO
   ========================================================= */
const METHOD_CATS = [
  { k: 'forza', n: 'Forza', ic: 'bolt', c: '#ff6b2c' },
  { k: 'ipertrofia', n: 'Ipertrofia', ic: 'layers', c: '#7fb2e5' },
  { k: 'carente', n: 'Muscolo carente', ic: 'target', c: '#3ddc97' },
  { k: 'stallo', n: 'Rompere lo stallo', ic: 'swap', c: '#c792ea' },
  { k: 'tempo', n: 'Poco tempo', ic: 'timer', c: '#ffb547' },
  { k: 'intensita', n: 'Tecniche di intensità', ic: 'flame', c: '#ff5c6c' },
];
const EV = { 3: 'Evidenze forti', 2: 'Evidenze moderate', 1: 'Evidenze limitate / esperienza pratica' };
const METHODS = [
  {
    id: 'linear', cat: 'forza', n: 'Progressione lineare (5×5)', lvl: 'Principiante', ev: 3,
    what: 'Aggiungi peso a ogni seduta sui multiarticolari finché riesci a chiudere tutte le serie.',
    how: ['5 serie da 5 su squat, panca, stacco, rematore, lento', '+2,5 kg (parte alta) o +5 kg (gambe) ogni volta che chiudi 5×5', 'Se fallisci 3 volte di fila allo stesso peso: scendi del 10% e risali'],
    when: 'Primi 6–12 mesi di palestra seria, quando i carichi salgono ancora quasi ogni seduta.',
    avoid: 'Se sei intermedio: i progressi si fermano presto e la fatica si accumula.',
    ex: 'Lun: squat 5×5 · panca 5×5 · rematore 5×5. Mer: squat · lento · stacco 1×5.',
  },
  {
    id: 'w531', cat: 'forza', n: '5/3/1 (Wendler)', lvl: 'Intermedio', ev: 2,
    what: 'Cicli di 4 settimane sulle percentuali di un "training max" (90% del massimale) con un\'ultima serie a ripetizioni massime.',
    how: ['Sett. 1: 65–75–85% × 5, 5, 5+', 'Sett. 2: 70–80–90% × 3, 3, 3+', 'Sett. 3: 75–85–95% × 5, 3, 1+', 'Sett. 4: scarico (40–60%)', 'Dopo ogni ciclo: +2,5 kg parte alta, +5 kg gambe sul training max'],
    when: 'Quando la progressione lineare si è fermata e vuoi progredire per mesi senza stalli.',
    avoid: 'Se hai poco tempo per gli accessori: il volume da solo è basso per l\'ipertrofia.',
    ex: 'Panca con TM 90 kg, settimana 3: 67,5×5 · 77,5×3 · 85×1+ (spingi fino a 1 rep dal cedimento).',
  },
  {
    id: 'topset', cat: 'forza', n: 'Top set + back-off', lvl: 'Intermedio', ev: 2,
    what: 'Una serie pesante a RPE alto, poi 2–4 serie più leggere (−10/15%) per il volume.',
    how: ['Riscaldamento progressivo', 'Top set: 3–5 reps a RPE 8–9', 'Back-off: 3 × 5–8 al 85–90% del top set', 'Quando il top set sale di 1–2 reps a parità di RPE, aumenta il peso'],
    when: 'Per mantenere forza e volume nello stesso esercizio, anche in definizione.',
    avoid: 'Su esercizi di isolamento: non serve.',
    ex: 'Squat: top 140×4 @8, poi 3×6 a 120 kg.',
  },
  {
    id: 'blocks', cat: 'forza', n: 'Periodizzazione a blocchi', lvl: 'Avanzato', ev: 2,
    what: 'Blocchi di 3–6 settimane con un obiettivo ciascuno: accumulo (volume), intensificazione (carichi), realizzazione (picco).',
    how: ['Accumulo: 4–6 × 6–10 al 65–75%', 'Intensificazione: 4–6 × 3–5 al 80–90%', 'Realizzazione: 1–3 reps al 90%+, volume basso', 'Scarico di 1 settimana tra un ciclo e l\'altro'],
    when: 'Se vuoi fare un test di massimale o una gara, o se sei avanzato e progredisci a fatica.',
    avoid: 'Se sei principiante: troppo complesso per il beneficio.',
  },
  {
    id: 'cluster', cat: 'forza', n: 'Cluster set', lvl: 'Avanzato', ev: 2,
    what: 'Una serie spezzata in mini-blocchi con 15–30 s di pausa: più ripetizioni pesanti con meno fatica.',
    how: ['Esempio: 5 × (2+2+2) all\'85% con 20 s tra i blocchi', 'Riposo normale (3–4 min) tra le serie'],
    when: 'Per accumulare lavoro pesante con buona tecnica e velocità.',
  },
  {
    id: 'pause', cat: 'forza', n: 'Ripetizioni con fermo (pause reps)', lvl: 'Intermedio', ev: 2,
    what: 'Fermo di 1–3 s nel punto più difficile (petto in panca, buca nello squat).',
    how: ['Carico −10/20% rispetto al normale', '3–5 serie da 3–5', 'Fermo vero, senza rimbalzo'],
    when: 'Se ti blocchi sempre nello stesso punto o rimbalzi troppo.',
  },
  {
    id: 'double', cat: 'ipertrofia', n: 'Doppia progressione', lvl: 'Tutti', ev: 3,
    what: 'Lavori in un range (es. 8–12): prima aumenti le reps, quando arrivi in cima su tutte le serie aumenti il peso.',
    how: ['Scegli un range (6–10, 8–12, 12–15)', 'Aggiungi 1 rep alla volta finché tutte le serie arrivano al massimo', 'Poi +2–5% di carico e riparti dal minimo del range'],
    when: 'È il metodo di base dell\'app: i suggerimenti "Applica" lo usano già.',
    ex: 'Lat machine 3×8–12: 60×12,11,10 → 60×12,12,12 → 65×8,8,8.',
  },
  {
    id: 'rir', cat: 'ipertrofia', n: 'Autoregolazione con RIR', lvl: 'Intermedio', ev: 3,
    what: 'Regoli il carico in base a quante ripetizioni lasci "in riserva" invece che su numeri fissi.',
    how: ['Serie allenanti a 0–3 RIR (vicino al cedimento)', 'Multiarticolari: 1–3 RIR', 'Isolamenti e macchine: 0–1 RIR', 'Se le reps calano molto tra le serie, sei andato troppo vicino al cedimento'],
    when: 'Sempre: compensa giornate buone e cattive (sonno, stress, dieta).',
  },
  {
    id: 'volume', cat: 'ipertrofia', n: 'Volume progressivo (10–20 serie)', lvl: 'Intermedio', ev: 3,
    what: 'La crescita dipende soprattutto dalle serie allenanti settimanali per muscolo. Parti basso e aumenta nel mesociclo.',
    how: ['Inizio mesociclo: ~10 serie/settimana per muscolo', 'Aggiungi 1–2 serie a settimana per 4–6 settimane', 'Quando recuperi male o le prestazioni calano: scarico', 'Il grafico "Serie per muscolo" in Oggi ti dice dove sei'],
    when: 'Per pianificare ipertrofia per mesi.',
  },
  {
    id: 'dup', cat: 'ipertrofia', n: 'Periodizzazione ondulata (DUP)', lvl: 'Intermedio', ev: 2,
    what: 'Stesso esercizio con range diversi nella settimana: giorno pesante, medio e leggero.',
    how: ['Giorno A: 4×4–6', 'Giorno B: 3×8–10', 'Giorno C: 3×12–15', 'Progressione indipendente per ciascun range'],
    when: 'Se alleni ogni muscolo 2–3 volte a settimana e vuoi forza e ipertrofia insieme.',
  },
  {
    id: 'lengthened', cat: 'ipertrofia', n: 'Enfasi in allungamento', lvl: 'Intermedio', ev: 2,
    what: 'Esercizi e parziali che caricano il muscolo quando è allungato sembrano dare più crescita.',
    how: ['Scegli varianti in allungamento: curl su panca inclinata, overhead extension, RDL, leg curl seduto', 'A cedimento, aggiungi 3–5 parziali nella metà bassa del movimento', 'Eccentrica controllata (2–3 s)'],
    when: 'Per muscoli che crescono poco o su isolamenti.',
  },
  {
    id: 'special', cat: 'carente', n: 'Ciclo di specializzazione', lvl: 'Intermedio', ev: 2,
    what: 'Per 4–8 settimane dai priorità a 1–2 muscoli carenti e riduci il volume degli altri al mantenimento.',
    how: ['Muscolo carente: +4–6 serie/settimana (fino a 16–22) e frequenza 3×', 'Altri muscoli: circa 6 serie/settimana (mantenimento)', 'Alleni il muscolo carente all\'inizio della seduta, quando sei fresco', 'Dopo il ciclo: una settimana di scarico, poi torni al volume normale'],
    when: 'Quando un muscolo è indietro rispetto agli altri da mesi. Il coach te lo segnala dal grafico "Serie per muscolo".',
    avoid: 'Più di 2 muscoli insieme: il recupero non regge.',
    ex: 'Spalle carenti: alzate laterali 4 serie × 3 giorni + lento 3 serie × 2 giorni.',
  },
  {
    id: 'priority', cat: 'carente', n: 'Principio di priorità', lvl: 'Tutti', ev: 2,
    what: 'L\'esercizio del muscolo che vuoi migliorare va per primo, quando hai più energia.',
    how: ['Metti il muscolo carente come primo esercizio della seduta', 'Usa l\'esercizio in cui senti meglio il muscolo, non quello più pesante', 'Sposta i multiarticolari pesanti dopo, o in un altro giorno'],
    when: 'Sempre, a costo zero.',
  },
  {
    id: 'mmc', cat: 'carente', n: 'Scelta dell\'esercizio e connessione mente-muscolo', lvl: 'Tutti', ev: 2,
    what: 'Se un muscolo non cresce spesso è l\'esercizio sbagliato: cambi variante e concentri la tensione.',
    how: ['Preferisci macchine e cavi stabili: puoi spingere vicino al cedimento in sicurezza', 'ROM completo e ritmo controllato', 'Concentrati sul muscolo target (riduce il lavoro dei muscoli che compensano)', 'Prova 2–3 varianti per 3 settimane e tieni quella dove progredisci meglio'],
    when: 'Su isolamenti e muscoli piccoli (bicipiti, deltoidi, polpacci).',
  },
  {
    id: 'deload', cat: 'stallo', n: 'Scarico (deload)', lvl: 'Tutti', ev: 2,
    what: 'Una settimana più leggera per smaltire la fatica accumulata: spesso dopo torni più forte.',
    how: ['Volume −40/50% (metà delle serie)', 'Carichi uguali o −10%', 'Stai lontano dal cedimento (RIR 3–4)', 'Ogni 4–8 settimane, o quando i segnali di fatica si sommano'],
    when: 'Prestazioni in calo per 2+ sedute, dolori articolari, sonno peggiore, voglia a zero.',
  },
  {
    id: 'variation', cat: 'stallo', n: 'Cambio di stimolo', lvl: 'Tutti', ev: 2,
    what: 'Se un esercizio è fermo da settimane, cambi range di ripetizioni o variante per 4–6 settimane.',
    how: ['Cambia range: da 8–12 a 4–6 (o viceversa)', 'Oppure variante: panca piana → panca inclinata o manubri', 'Torna all\'esercizio originale dopo 4–6 settimane e misura il nuovo massimale'],
    when: 'Stallo su un singolo esercizio mentre gli altri progrediscono.',
  },
  {
    id: 'calories', cat: 'stallo', n: 'Controllo recupero e calorie', lvl: 'Tutti', ev: 3,
    what: 'Spesso lo stallo non è il programma: sono sonno, calorie e proteine.',
    how: ['In definizione è normale progredire poco: punta a mantenere i carichi', 'Proteine 1,6–2,2 g/kg ogni giorno', '7–9 ore di sonno', 'Controlla in Dieta che la media settimanale sia vicina all\'obiettivo'],
    when: 'Stallo su tutti gli esercizi insieme.',
  },
  {
    id: 'superset', cat: 'tempo', n: 'Superserie antagoniste', lvl: 'Tutti', ev: 3,
    what: 'Alterni due esercizi di muscoli opposti senza riposo tra loro: stesso risultato in meno tempo.',
    how: ['Accoppia: petto + schiena, bicipiti + tricipiti, quadricipiti + femorali', 'Esegui A, poi subito B, poi riposa 90–120 s', 'Nell\'app: menu ⋯ dell\'esercizio → "Superserie con il successivo"'],
    when: 'Quando hai 45 minuti o meno. Funzionano bene su accessori e macchine.',
    ex: 'Panca manubri ↔ rematore manubrio; curl ↔ pushdown.',
  },
  {
    id: 'density', cat: 'tempo', n: 'Full body ad alta densità', lvl: 'Tutti', ev: 2,
    what: '3 sedute brevi a settimana con pochi esercizi multiarticolari e recuperi stretti.',
    how: ['4–5 esercizi per seduta (spinta, tirata, gambe, cerniera, core)', '2–3 serie ciascuno vicino al cedimento', 'Recuperi 60–90 s, superserie dove possibile', 'Usa il programma Full Body in "Programmi pronti"'],
    when: 'Settimane piene, esami, viaggi, Erasmus con orari irregolari.',
  },
  {
    id: 'drop', cat: 'intensita', n: 'Drop set', lvl: 'Intermedio', ev: 2,
    what: 'Arrivi a cedimento, scali subito il peso del 20–30% e continui fino a un nuovo cedimento.',
    how: ['Solo sull\'ultima serie di un esercizio', '1–2 scali consecutivi', 'Ideale su macchine e manubri (cambio peso veloce)', 'Nell\'app: tocca il numero della serie → "Drop set"'],
    when: 'Per aggiungere stimolo in poco tempo su isolamenti.',
    avoid: 'Su squat e stacchi pesanti, e ogni serie: aumenta molto la fatica.',
  },
  {
    id: 'restpause', cat: 'intensita', n: 'Rest-pause', lvl: 'Intermedio', ev: 2,
    what: 'Serie a cedimento, 10–20 s di pausa, altre ripetizioni con lo stesso peso, ripeti 2–3 volte.',
    how: ['Serie principale a 0–1 RIR (es. 10 reps)', '15 s di pausa → reps fino a cedimento (es. 4)', '15 s → altre reps (es. 2)', 'Conta come circa 2 serie allenanti'],
    when: 'Quando hai poco tempo o vuoi più stimolo su un esercizio stabile.',
  },
  {
    id: 'myo', cat: 'intensita', n: 'Myo-reps', lvl: 'Intermedio', ev: 2,
    what: 'Serie di attivazione da 12–20 reps, poi mini-serie da 3–5 reps con 3–5 respiri di pausa.',
    how: ['Attivazione: 12–20 reps a 1 RIR', '3–5 respiri profondi', 'Mini-serie da 3–5 reps, ripeti finché non riesci a fare più di 3', 'Peso: circa 60–70% del massimale'],
    when: 'Isolamenti, polpacci, deltoidi, braccia. Ottimo nei giorni con poco tempo.',
  },
  {
    id: 'preex', cat: 'intensita', n: 'Pre-affaticamento', lvl: 'Intermedio', ev: 1,
    what: 'Isolamento prima del multiarticolare per affaticare il muscolo target (es. croci prima della panca).',
    how: ['1–2 serie di isolamento a 1–2 RIR', 'Subito dopo il multiarticolare con carico ridotto', 'Utile se nel multiarticolare lavorano più altri muscoli del target'],
    when: 'Quando un muscolo "non si sente" nel multiarticolare. Le prove sulla crescita sono contrastanti: usalo a periodi.',
  },
];

/* ---------- training coach ---------- */
function coachTraining() {
  const out = [];
  if (S.workouts.length < 3) return out;
  const ms = weekMuscleSets(startOfWeek(Date.now()) - 7 * DAY).concat(); // last full week
  const cur = weekMuscleSets();
  const avg = ms.map((m, i) => ({ n: m.n, v: (m.v + cur[i].v) / 2 }));
  const trained = avg.filter(m => m.v > 0);
  if (trained.length >= 5) {
    const mean = trained.reduce((a, m) => a + m.v, 0) / trained.length;
    const weak = avg.filter(m => m.v < Math.min(8, mean * 0.5) && !['Addominali', 'Polpacci', 'Avambracci'].includes(m.n));
    if (weak.length) out.push({ lvl: 'info', text: `Pochi stimoli per <b>${weak.slice(0, 2).map(m => m.n.toLowerCase()).join(' e ')}</b> (meno di 8 serie a settimana). Se sono punti carenti, prova un <b>ciclo di specializzazione</b>.`, m: 'special' });
  }
  // stalled exercises: e1RM not improved in last 4 sessions
  const d = derive(), stalled = [];
  for (const [id, ser] of Object.entries(d.series)) {
    if (ser.length < 5) continue;
    const val = p => p.e1rm || p.reps || 0;
    const last = ser.slice(-4), before = Math.max(...ser.slice(0, -4).map(val));
    if (before > 0 && Math.max(...last.map(val)) <= before + 0.01 && Date.now() - ser[ser.length - 1].t < 21 * DAY) stalled.push(id);
  }
  if (stalled.length) out.push({ lvl: 'warn', text: `Fermo da 4 sedute: <b>${stalled.slice(0, 2).map(id => esc(ex(id).n)).join(', ')}</b>. Prova un <b>cambio di stimolo</b>${stalled.length >= 3 ? ', oppure valuta uno <b>scarico</b>: sono fermi più esercizi' : ''}.`, m: stalled.length >= 3 ? 'deload' : 'variation' });
  const wk = S.workouts.filter(w => w.start > Date.now() - 42 * DAY).length / 6;
  if (wk >= 3 && !S.workouts.some(w => w.start > Date.now() - 49 * DAY && wSetCount(w) < 8)) out.push({ lvl: 'info', text: 'Sei a 6+ settimane di allenamento costante senza sedute leggere. Se senti fatica accumulata, programma uno <b>scarico</b>.', m: 'deload' });
  return out;
}
function viewMethods() {
  const c = UI.methodCat || 'forza';
  const tips = coachTraining();
  return `<div class="stack"><div class="section-title">Metodi e tecniche</div>
    ${tips.length ? `<div class="card tight coach"><div class="row"><span class="coach-ic">${icon('sparkle', 18)}</span><b class="grow">Coach</b></div>${tips.map(t => `<button class="cm ${t.lvl}" data-a="openMethod" data-id="${t.m}" style="text-align:left"><span>${icon(t.lvl === 'warn' ? 'info' : 'sparkle', 16)}</span><div>${t.text} <span style="color:var(--gold)">Apri →</span></div></button>`).join('')}</div>` : ''}
    <div class="chips">${METHOD_CATS.map(m => `<button class="chip ${c === m.k ? 'on' : ''}" data-a="methodCat" data-k="${m.k}"><span style="color:${m.c}">${icon(m.ic, 14, 2.4)}</span> ${m.n}</button>`).join('')}</div>
    <div class="list">${METHODS.filter(m => m.cat === c).map(m => { const mc = METHOD_CATS.find(x => x.k === m.cat); return `<button class="li" data-a="openMethod" data-id="${m.id}"><span class="mic" style="--mc:${mc.c}">${icon(mc.ic, 18)}</span><div class="grow"><div class="t">${m.n}</div><div class="s">${m.lvl} · ${EV[m.ev].split(' /')[0]}</div></div>${icon('chev', 18)}</button>`; }).join('')}</div>
  </div>`;
}
function layerMethod(l, i) {
  const m = METHODS.find(x => x.id === l.id); if (!m) return '';
  const cat = METHOD_CATS.find(c => c.k === m.cat);
  return `<div class="layer">${head(m.n)}
    <div class="layer-body" data-scroll-key="mt${i}"><div class="layer-inner">
      <div class="row wrap"><span class="chip" style="background:color-mix(in srgb, ${cat.c} 15%, transparent);color:${cat.c}">${icon(cat.ic, 14)} ${cat.n}</span><span class="chip">${m.lvl}</span><span class="chip ${m.ev === 3 ? 'good' : m.ev === 2 ? 'gold' : ''}">${EV[m.ev]}</span></div>
      <p style="margin:0;font-size:16px;line-height:1.5">${m.what}</p>
      <div class="card"><div class="section-title">Come si fa</div><ol class="instr" style="color:var(--fg)">${m.how.map(h => `<li>${h}</li>`).join('')}</ol></div>
      <div class="card tight"><div class="lbl" style="color:var(--good)">Quando usarlo</div><div>${m.when}</div>${m.avoid ? `<div class="lbl" style="color:var(--bad);margin-top:6px">Quando evitarlo</div><div>${m.avoid}</div>` : ''}</div>
      ${m.ex ? `<div class="card tight"><div class="lbl">Esempio</div><div class="tnum">${m.ex}</div></div>` : ''}
      ${m.id === 'deload' ? (deloadOn() ? `<button class="btn block" data-a="deloadStop">Termina lo scarico in corso</button>` : `<button class="btn primary block" data-a="deloadStart">Inizia 7 giorni di scarico</button><div class="small faint">Per 7 giorni: −10% di carico e circa il 40% di serie in meno sulle schede. Poi torna tutto normale.</div>`) : ''}
    </div></div></div>`;
}
Object.assign(LAYER_RENDER, { method: layerMethod });
Object.assign(A, {
  methodCat(el) { UI.methodCat = el.dataset.k; render(); },
  openMethod(el) { pushLayer({ type: 'method', id: el.dataset.id }); },
});
