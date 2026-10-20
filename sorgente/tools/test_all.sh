#!/bin/bash
# Build, serve, run every Playwright test. Prints FAIL lines; exit 1 if any fails.
cd "$(dirname "$0")/.."
python3 build.py | tail -1 && bash tools/serve.sh && bash tools/make_fixtures.sh
fail=0
# macOS non ha "timeout" (e' di GNU coreutils): se manca, i test girano senza limite di tempo
TO=""
command -v timeout >/dev/null && TO="timeout 300"
command -v gtimeout >/dev/null && TO="gtimeout 300"
for t in $(ls test*.py | grep -v testlib | sort -V); do
  out=$($TO python3 $t 2>&1); rc=$?
  if [ $rc -ne 0 ] || echo "$out" | grep -q "errors \[.\+\]"; then echo "FAIL $t"; echo "$out" | tail -5; fail=1; fi
done
echo "done fail=$fail"; exit $fail
