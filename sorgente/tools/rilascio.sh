#!/bin/bash
# Rilascio Forgia: alza la cache del service worker, fa la build, committa e pubblica.
# Uso: bash tools/rilascio.sh "cosa e' cambiato"
set -e
cd "$(dirname "$0")/.."

msg="$1"
if [ -z "$msg" ]; then echo 'Uso: bash tools/rilascio.sh "cosa e'"'"' cambiato"'; exit 1; fi

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

# 2. build: scrive i 9 file del sito nella root del repo
python3 build.py | tail -2

# 3. commit + push
cd ..
git add -A
git status --short
git commit -q -m "$msg"
git push
echo "fatto: https://camillo07.github.io/Forgia-/ - chiudi e riapri l'app sull'iPhone 2 volte."
