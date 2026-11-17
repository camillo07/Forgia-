"""Dati di esempio mescolati ai veri: il conteggio della settimana non deve gonfiarsi.

Caso reale (novembre 2026): un amico con 4-5 allenamenti veri vedeva "9 allenamenti la
settimana scorsa" e 3 giorni con un allenamento in più. Gli allenamenti in più erano i dati
di esempio (6 settimane, lun/mar/gio/ven), che non vanno nel cloud ma restano sul telefono
e venivano contati nelle statistiche come quelli veri.
"""
import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake

REAL = """() => {
  const ws = startOfWeek(Date.now()) - 7 * DAY;  // lunedi' della settimana scorsa
  // 4 allenamenti veri: lun, mar, ven, dom
  for (const d of [0, 1, 4, 6]) {
    const st = ws + d * DAY + 10 * 3600e3;
    S.workouts.push({ id: 'real' + d, name: 'Vero ' + d, rid: null, start: st, end: st + 3600e3, note: '',
      ex: [{ id: 'Barbell_Squat', note: '', sets: [{ t: 'n', kg: 60, r: 8, done: true }] }] });
  }
  save();
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
        await pg.fill('#ob-name', 'Amico')
        await pg.click('input[value="ppl"]')
        await pg.click('[data-a="finishOnboard"]')
        await pg.wait_for_timeout(600)
        # 1) prima: dati di esempio caricati (come all'inizio), poi allenamenti veri aggiunti
        #    "a mano" nello stato salvato, cioè come li aveva il telefono dell'amico
        await pg.evaluate("() => { S.workouts.push(...makeDemo()); localStorage.setItem(KEY, serialize(S)); }")
        demo_n = await pg.evaluate("() => S.workouts.filter(w => w.demo && w.start >= startOfWeek(Date.now()) - 7 * DAY && w.start < startOfWeek(Date.now())).length")
        await pg.evaluate(REAL.replace('save();', "localStorage.setItem(KEY, serialize(S));"))
        before = await pg.evaluate("() => weekStats(startOfWeek(Date.now()) - 7 * DAY).n")
        print('esempio nella settimana', demo_n, '· conteggio misto prima della correzione', before)
        assert demo_n > 0, 'il test non ha messo esempi nella settimana scorsa'
        # 2) riapro l'app: all'avvio gli esempi vanno via e restano i 4 veri
        await pg.reload(); await pg.wait_for_timeout(900)
        after = await pg.evaluate("() => weekStats(startOfWeek(Date.now()) - 7 * DAY).n")
        left = await pg.evaluate("() => hasDemoData()")
        print('dopo la riapertura', after, '· esempi rimasti', left)
        assert after == 4, 'i dati di esempio gonfiano la settimana: %d invece di 4' % after
        assert not left
        # 3) con dati veri il tasto "Carica dati di esempio" non compare più
        txt = await pg.evaluate("() => { UI.tab = 'me'; render(); return document.body.innerText; }")
        assert 'Carica dati di esempio' not in txt
        # 4) utente nuovo con soli esempi: restano finché non salva il primo allenamento vero
        await pg.evaluate("() => { S.workouts = makeDemo(); save(); }")
        assert await pg.evaluate("() => S.workouts.length > 0 && S.workouts.every(w => w.demo)")
        await pg.evaluate(REAL)
        assert await pg.evaluate("() => !hasDemoData() && S.workouts.length === 4")
        print('errors', errs)
        await b.close()

asyncio.run(main())
