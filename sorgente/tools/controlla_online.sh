#!/bin/bash
# Controlla che il sito Forgia sia online e aggiornato rispetto al codice locale.
# Uso: bash tools/controlla_online.sh
cd "$(dirname "$0")/.."

attesa=$(grep -o 'forgia-shell-v[0-9]*' src/sw.js | head -1)
codice=$(curl -s -o /dev/null -w '%{http_code}' "https://camillo07.github.io/Forgia-/?t=$(date +%s)")
online=$(curl -s "https://camillo07.github.io/Forgia-/sw.js?t=$(date +%s)" \
         | grep -o 'forgia-shell-v[0-9]*' | head -1)

if [ "$codice" != "200" ]; then
  echo "SITO GIU': https://camillo07.github.io/Forgia-/ risponde $codice"
  exit 1
fi

if [ "$online" = "$attesa" ]; then
  echo "OK - il sito e' online e aggiornato ($online)"
else
  echo "DA RILASCIARE - online c'e' ${online:-nessuna versione}, in locale $attesa"
  exit 1
fi
