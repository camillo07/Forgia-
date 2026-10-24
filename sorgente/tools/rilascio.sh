#!/bin/bash
# Rilascio Forgia: test, alza la cache del service worker, build, commit, pubblica, verifica online
# e archivia la copia fisica della versione in V5/V5.X/ (cartella + zip).
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

# 3. commit + push: si aggiungono solo i file del progetto.
#    Mai "git add -A" cieco: e' cosi' che un file estraneo e' finito nel repo pubblico.
cd ..
git add -A -- index.html manifest.webmanifest sw.js supabase.min.js zxing.min.js \
              leaflet.min.js icon-180.png icon-192.png icon-512.png \
              .nojekyll .gitignore CLAUDE.md .claude sorgente

fuori=$(git status --porcelain | grep -E '^(\?\?| [MD])' || true)
if [ -n "$fuori" ]; then
  echo "NOTA: questi file NON entrano nel rilascio perche' sono fuori dal progetto:"
  echo "$fuori"
fi

echo "file che entrano nel rilascio:"
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

# 5. copia fisica nell'archivio delle versioni: V5/V5.X/forgia-v5.X/ + lo zip.
#    Numerazione minore crescente, e mai sovrascrivere una cartella che esiste gia'.
python3 - <<'PY'
import re, shutil, pathlib
FILES = ["index.html", "manifest.webmanifest", "sw.js", "supabase.min.js", "zxing.min.js",
         "leaflet.min.js", "icon-180.png", "icon-192.png", "icon-512.png"]
repo = pathlib.Path.cwd()
base = repo.parent.parent          # .../V5  (il repo sta in .../V5/<cartella>/<repo>)
nums = [int(d.name[3:]) for d in base.iterdir() if d.is_dir() and re.fullmatch(r"V5\.\d+", d.name)]
if not nums:
    print("archivio: in", base, "non ci sono cartelle V5.N - copia fisica saltata.")
    raise SystemExit
n = max(nums) + 1
ver = base / ("V5.%d" % n)
if ver.exists():
    print("archivio:", ver.name, "esiste gia' - copia fisica saltata.")
    raise SystemExit
dest = ver / ("forgia-v5.%d" % n)
dest.mkdir(parents=True)
for f in FILES:
    shutil.copy2(repo / f, dest / f)
shutil.make_archive(str(dest), "zip", root_dir=str(dest))
print("archivio: creata", ver, "(cartella + zip)")
PY

if [ "$ok" = "1" ]; then
  echo "FATTO - $attesa e' online su https://camillo07.github.io/Forgia-/"
  echo "Sull'iPhone: chiudi e riapri l'app 2 volte."
else
  echo "ATTENZIONE: dopo 3 minuti il sito non mostra ancora $attesa (pages: $stato)."
  echo "Il codice e' su GitHub. Riprova tra qualche minuto con: bash tools/controlla_online.sh"
fi
