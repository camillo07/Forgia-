"""Doppia progressione anche con le reps secche (richiesta di Mattia, novembre 2026).

Alzate laterali con "8 reps" nella scheda: con 10 kg x 8 l'app diceva subito "passa a 12 kg".
Giusto invece: 10 kg x 9, x 10, x 11, x 12 e solo poi si sale di peso ripartendo da 8.
"""
import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake

JS = """() => {
  const mk = (id, reps, kg, ta, tb) => ({ id, name: 'T', rid: null, start: Date.now() - 86400e3, end: Date.now() - 86000e3, note: '',
    ex: [{ id, sets: reps.map(r => ({ t: 'n', kg, r, done: true, ta, tb })) }] });
  const cur = (id, ta, tb) => ({ id, rmin: ta, rmax: tb ?? ta, tags: [], sets: [0, 0, 0].map(() => ({ t: 'n', kg: null, r: null, ta, tb, done: false })) });
  const out = {};
  const L = 'Side_Lateral_Raise';
  S.workouts = [mk(L, [8, 8, 8], 10, 8, null)];  out.lat8 = suggestion(cur(L, 8, null));
  S.workouts = [mk(L, [11, 10, 10], 10, 8, null)]; out.lat11 = suggestion(cur(L, 8, null));
  S.workouts = [mk(L, [12, 12, 12], 10, 8, null)]; out.lat12 = suggestion(cur(L, 8, null));
  S.workouts = [mk(L, [15, 15, 15], 10, 12, 15)]; out.range = suggestion(cur(L, 12, 15));
  const B = 'Barbell_Bench_Press_-_Medium_Grip';
  S.workouts = [mk(B, [5, 5, 5], 80, 5, null)]; out.bench5 = suggestion(cur(B, 5, null));
  S.workouts = [mk(B, [7, 7, 7], 80, 5, null)]; out.bench7 = suggestion(cur(B, 5, null));
  // consiglio dopo la serie: 10 reps con target secco 8 sulle laterali = nel range, non "troppo facile"
  const a = cur(L, 8, null); a.sets[0] = { ...a.sets[0], kg: 10, r: 10, done: true };
  out.live = liveAdvice(a);
  out.k = [ex(L).k, ex(B).k];
  return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html')
        await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia'); await pg.click('input[value="ppl"]')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(600)
        r = await pg.evaluate(JS)
        for k, v in r.items(): print(k, v if not isinstance(v, dict) else (v.get('kind'), v.get('kg'), v.get('r')))
        assert (r['lat8']['kind'], r['lat8']['kg'], r['lat8']['r']) == ('reps', 10, 9), r['lat8']
        assert (r['lat11']['kind'], r['lat11']['r']) == ('reps', 12), r['lat11']
        assert (r['lat12']['kind'], r['lat12']['kg'], r['lat12']['r']) == ('up', 12, 8), r['lat12']
        assert r['range']['kind'] == 'up', r['range']
        assert r['bench5']['kind'] == 'reps' and r['bench5']['r'] == 6, r['bench5']
        assert r['bench7']['kind'] == 'up', r['bench7']
        assert r['live']['kind'] == 'hold', r['live']
        # fine allenamento con "aggiorna anche le ripetizioni": un range non diventa reps secche
        r2 = await pg.evaluate("""() => {
          const rt = { id: 'rt1', name: 'Spalle', ex: [{ id: 'Side_Lateral_Raise', sets: 2, rmin: 12, rmax: 15, rest: 60, plan: [{ t: 'n', a: 12, b: 15 }, { t: 'n', a: 12, b: 15 }] }] };
          S.routines.push(rt);
          const w = { rid: 'rt1', ex: [{ id: 'Side_Lateral_Raise', src: 0, sets: [{ t: 'n', kg: 10, r: 10, done: true, pi: 0 }, { t: 'n', kg: 10, r: 17, done: true, pi: 1 }] }] };
          return routineAfter(w, true).ex[0].plan;
        }""")
        print('scheda aggiornata', r2)
        assert r2[0]['a'] == 10 and r2[0]['b'] == 15, r2
        assert r2[1]['a'] == 12 and r2[1]['b'] == 15, r2
        print('errors', errs); assert not errs
        await b.close()

asyncio.run(main())
