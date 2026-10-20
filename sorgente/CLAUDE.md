# Forgia — note per Claude Code

App web installabile (PWA) di Mattia per **palestra, corsa, dieta, corpo, Apple Salute e coach AI**. Interfaccia in italiano, con inglese e spagnolo. Tema scuro. Vanilla JS in un unico file, senza framework.

Mattia parla italiano, spesso usa la dettatura vocale (qualche parola sbagliata). Vuole risposte semplici e dirette, a punti, con una conclusione pratica. Non è uno sviluppatore: spiegagli le cose in modo concreto.

## Regole di sicurezza (sempre)
- Nel codice va **solo** l'URL di Supabase e la chiave **publishable** (`data/supabase.json`). Mai la chiave secret/service_role.
- La chiave API Anthropic dell'utente resta **solo sul dispositivo** (`S.ai.key`): non va nella sync, non va nei backup (`exportData` la svuota), mai nel codice. Il repository è pubblico.
- La chat AI (`S.ai.chat`) resta sul dispositivo: non va sincronizzata e non va nei backup.

## Struttura
Il repo è `camillo07/Forgia-` (in locale `~/Desktop/Forgia🛠️/V5/V5.1 per claude code/forgia-sorgente-5.1`): nella **root** stanno i 9 file del sito pubblicati da GitHub Pages, in **`sorgente/`** tutto il codice (`build.py`, `src/`, `i18n/`, `data/`, `tools/`, i `test*.py`). I percorsi qui sotto sono relativi a `sorgente/`.
- `src/js/*.js`: moduli concatenati **in ordine alfabetico** da `build.py`. La build si ferma se due funzioni hanno lo stesso nome.
  - `0-i18n.js` traduzioni · `1-core.js` stato, esercizi, util · `2-views.js` schermate · `3-layers.js` fogli/layer (`LAYER_RENDER`, `renderLayers`) · `4-actions.js` azioni (`A.nome`, attivate da `data-a="nome"`) · `4d-workout.js` allenamento · `5-diet.js` dieta e scanner · `5b-body.js` corpo · `5c-health.js` Apple Salute · `6-coach.js` AI (`aiAsk`, `aiErr`, `mdLite`) · `7-methods.js` metodi/tecniche · `7b-planner.js` crea scheda · `7c-run.js` corsa · `7e-analysis.js` analisi · `7f-coach.js` Coach di oggi · `7h-shop-ai.js` spesa + analisi settimana · `7i-similar-fav.js` simili/preferiti · `7j-anatomy.js` mappa muscoli interattiva · `7k-exfocus.js` muscoli allenati nella scheda esercizio · `7l-chat.js` chat coach AI · `8-sync.js` Supabase · `9-boot.js` avvio.
- `src/style.css`, `src/head.html`, `src/body.html`, `src/sw.js` (cache `forgia-shell-vNN`: **aumenta il numero a ogni rilascio**).
- `src/exercises_raw.json`: banca esercizi (free-exercise-db + extra), circa 894.
- `data/`: `body.json` (sagome muscoli, MIT, vedi `body-LICENSE.txt`), CIQUAL, SQL di Supabase, `ex_it.py` (nomi italiani).
- `i18n/`: `strings.json` (chiavi v1, **non rigenerare gli id**), `out_ui_*.json`, `out_ex_*.json` (nomi esercizi ES), `out_food_*.json`, **`extra.json`** (traduzioni a mano: le stringhe nuove vanno qui, formato `"italiano": ["english", "español"]`, anche con `{0}` per i numeri).
- Le stringhe dentro `[data-nt]` non vengono tradotte (nomi, testo AI).

## Build, test, rilascio
- `python3 build.py` (da `sorgente/`) → i **9 file** del sito nella root del repo + `sorgente/dist/artifact.html` (anteprima su Claude). Richiede Pillow. I 9 file vengono sovrascritti, non cancellati: la root contiene anche `.git` e `sorgente/`.
- **Rilascio: `bash tools/rilascio.sh "cosa è cambiato"`** → alza `forgia-shell-vNN`, fa la build, commit e push. Poi sull'iPhone chiudere e riaprire l'app 2 volte (service worker).
- Test: Playwright + Chromium (**da installare**: `pip3 install playwright && python3 -m playwright install chromium`). `bash tools/test_all.sh` (build, server su :8765 che serve la root, tutti i `test*.py`). `testlib.setup_fake` simula Supabase e forza `it-IT`.
- Traduzioni mancanti: `python3 crawl.py es` / `en` → `i18n/miss_<lang>.json`. "ELIMINA" è voluto (parola da digitare). Alcuni falsi positivi spagnoli ("cerca", "registro").
- Sito: GitHub Pages dalla root del repo, URL https://camillo07.github.io/Forgia-/. I 9 file: `icon-180.png icon-192.png icon-512.png index.html manifest.webmanifest supabase.min.js sw.js zxing.min.js leaflet.min.js`. Nella root c'è anche `.nojekyll` (niente Jekyll) e `Tema_2_Ejercicios_1-2-3_resueltos.xlsx` (file estraneo già presente nel repo, non c'entra con l'app).

## Stato (ottobre 2026, versione 5.1)
Funzioni principali: schede e cartelle, allenamento con timer di recupero (suoni impostabili, solo con app aperta), top set/back-off, RIR, progressioni, scarico, crea scheda guidata, import schede (Excel/testo/AI), "Consiglia simile", preferiti, corsa con GPS e mappa, dieta con diario, CIQUAL, Open Food Facts e scanner barcode (BarcodeDetector o ZXing), lista della spesa, corpo (peso, misure, Navy, FFMI), Apple Salute tramite Comando Rapido → `rpc/ingest_health`, Coach di oggi, analisi AI della settimana, mappa muscoli interattiva (35 fasce), muscoli allenati per esercizio, chat coach AI (streaming con la chiave personale), lingue IT/EN/ES, sync Supabase (tabella `items` con RLS).

Limiti noti: niente notifiche push; GPS fermo a schermo bloccato; Web Audio muto con iPhone in silenzioso; Apple Salute solo via Comando Rapido (PWA).

Idee in sospeso: AI per gli amici con una Edge Function di Supabase e limiti (la paga Mattia); Apple Salute più semplice (Comando Rapido via link iCloud); modalità privacy; pagina privacy ed eliminazione account prima di renderla pubblica; eventuale app nativa con Capacitor (servono Mac e account Apple da 99 €/anno).
