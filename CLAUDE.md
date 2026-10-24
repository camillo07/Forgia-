# Forgia

Le note complete del progetto stanno in **[`sorgente/CLAUDE.md`](sorgente/CLAUDE.md)**: leggile
prima di toccare qualunque cosa. Qui c'è solo l'indispensabile per orientarsi nella root.

- Questa cartella è la root del repo `camillo07/Forgia-`. Contiene i **9 file del sito** generati
  dalla build e pubblicati da GitHub Pages: non si modificano a mano, si rigenerano.
- Tutto il codice sta in **`sorgente/`** (`build.py`, `src/`, `i18n/`, `data/`, `tools/`, i test).
- Build: `cd sorgente && python3 build.py`
- Rilascio: `cd sorgente && bash tools/rilascio.sh "cosa è cambiato"`
- Il repository è **pubblico**: nel codice solo l'URL e la chiave *publishable* di Supabase,
  mai chiavi segrete. La chiave API Anthropic dell'utente resta solo sul suo dispositivo.
