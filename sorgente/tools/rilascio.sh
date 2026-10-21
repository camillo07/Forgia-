#!/bin/bash
# Rilascio Forgia: test, alza la cache del service worker, build, commit, pubblica e verifica online.
# Uso: bash tools/rilascio.sh "cosa e' cambiato"
#      bash tools/rilascio.sh --salta-test "cosa e' cambiato"   (solo se i test li hai appena fatti)
set -e
cd "$(dirname "$0")/.."

salta_test=0
if [ "$1" = "--salta-test" ]; then salta_test=1; shift; fi

msg="$1"
if [ -z "$msg" ]; then echo 'Uso: bash tools/rilascio.sh "cosa e'"'"' cambiato"'; exit 1; fi

# 0. test: se qualcosa e' rotto si ferma qui, prima di toccare il service worker
if [ "$salta_test" = "0" ]; then
  echo "test in corso (qualche minuto)..."
  if ! bash tools/test_all.sh; then
    echo "RILASCIO ANNULLATO: ci sono test che falliscono (vedi le righe FAIL qui sopra)."
    echo "Niente e' stato committato o pubblicato."
    exit 1
  fi
else
  echo "test saltati su richiesta."
fi

# 1. forgia-shell-vNN -> vNN+1: senza il bump l'iPhone resta sulla vecchia cache
python3 - <<'PY'
import re, pathlib
p = pathlib.Path("src/sw.js"); old = p.read_text()
new, n = re.subn(r"forgia-shell-v(\d+)", lambda m: "forgia-shell-v%d" % (int(m.group(1)) + 1), old)
if not n: raise SystemExit("forgia-shell-vNN non trovato in src/sw.js")
p.write_text(new)
print("service worker:", re.search(r"forgia-shell-v\d+", old).group(0),
      "->", re.search(r"forgia-shell-v\d+", new).group(0))
PY

# versione attesa online dopo la pubblicazione
attesa=$(grep -o 'forgia-shell-v[0-9]*' src/sw.js | head -1)

# 2. build: scrive i 9 file del sito nella root del repo
python3 build.py | tail -2

# 3. commit + push
cd ..
git add -A
git status --short
git commit -q -m "$msg"
git push

# 4. attende che GitHub Pages ripubblichi e controlla la versione davvero online
echo "attendo GitHub Pages (max 3 minuti)..."
ok=0
for i in $(seq 1 18); do
  sleep 10
  stato=$(gh api repos/camillo07/Forgia-/pages/builds/latest --jq .status 2>/dev/null || echo "?")
  online=$(curl -s "https://camillo07.github.io/Forgia-/sw.js?t=$(date +%s)" \
           | grep -o 'forgia-shell-v[0-9]*' | head -1)
  echo "  $((i*10))s - pages: $stato - online: ${online:-nessuna}"
  if [ "$stato" = "built" ] && [ "$online" = "$attesa" ]; then ok=1; break; fi
  if [ "$stato" = "errored" ]; then
    echo "ERRORE: GitHub Pages ha fallito la pubblicazione. Il codice e' su GitHub ma il sito non e' aggiornato."
    exit 1
  fi
done

if [ "$ok" = "1" ]; then
  echo "FATTO - $attesa e' online su https://camillo07.github.io/Forgia-/"
  echo "Sull'iPhone: chiudi e riapri l'app 2 volte."
else
  echo "ATTENZIONE: dopo 3 minuti il sito non mostra ancora $attesa (pages: $stato)."
  echo "Il codice e' su GitHub. Riprova tra qualche minuto con: bash tools/controlla_online.sh"
fi
