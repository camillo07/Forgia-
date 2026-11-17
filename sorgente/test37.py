"""Allenamento dimenticato aperto: non deve salvare giorni di durata.

Caso reale (ottobre-novembre 2026): tre allenamenti salvati con 11 h, 44 h e 48 h di durata
perché l'app era rimasta con l'allenamento aperto. Ora la fine è l'ultima serie + 3 minuti.
"""
import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake


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
        await pg.fill('#ob-name', 'Amico')
        await pg.click('input[value="ppl"]')
        await pg.click('[data-a="finishOnboard"]')
        await pg.wait_for_timeout(600)
        H = 3600e3
        r = await pg.evaluate("""H => {
          const mk = (ago, last) => ({ start: Date.now() - ago, lastDone: last ? Date.now() - last : undefined,
            ex: [{ sets: [{ done: true }, { done: true }, { done: true }, { done: true }, { done: false }] }] });
          return {
            normal: (workoutEnd(mk(1.2 * H)) - (Date.now() - 1.2 * H)) / 60000,
            forgot: (workoutEnd(mk(44 * H, 43 * H)) - (Date.now() - 44 * H)) / 60000,
            noLast: (workoutEnd(mk(48 * H)) - (Date.now() - 48 * H)) / 60000,
            past: (workoutEnd({ past: true, start: 0, dur: 75, ex: [] })) / 60000,
          };
        }""", 3600e3)
        print(r)
        assert 70 <= r['normal'] <= 74, r            # allenamento normale: fino ad adesso
        assert 62 <= r['forgot'] <= 64, r            # ultima serie dopo 1 h + 3 min
        assert 19 <= r['noLast'] <= 21, r            # nessun orario: stima dalle serie (min 20)
        assert r['past'] == 75, r
        # flusso reale: un allenamento aperto da 30 ore, una serie spuntata, poi Fine
        await pg.evaluate("""() => {
          S.active = { id: uid(), name: 'Test', rid: null, start: Date.now() - 30 * 3600e3, note: '', restEnd: 0, restTotal: 0,
            ex: [{ id: 'Barbell_Squat', note: '', sets: [{ t: 'n', kg: 60, r: 8, done: true }] }] };
          finishWorkout(true, true);
        }""")
        await pg.wait_for_timeout(300)
        mins = await pg.evaluate("() => { const w = S.workouts[S.workouts.length - 1]; return (w.end - w.start) / 60000; }")
        print('durata salvata', mins)
        assert mins <= 30, mins
        print('errors', errs)
        await b.close()

asyncio.run(main())
