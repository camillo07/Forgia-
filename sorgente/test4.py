import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(400)
        r = await pg.evaluate("""() => {
          S.profile.onboarded = true; S.nutri = defaultNutri(); S.nutri.weight = 76; S.nutri.cycle = false;
          const k = dkey(Date.now());
          addEntry(k, {fid:'b_pasta', g:150, m:'l'}); addEntry(k, {fid:'b_olio', g:20, m:'l'}); addEntry(k, {fid:'b_pane', g:150, m:'d'}); addEntry(k, {fid:'b_mozzarella', g:125, m:'d'}); addEntry(k, {fid:'b_avena', g:80, m:'b'}); addEntry(k, {fid:'b_latte_ps', g:250, m:'b'});
          const T = targetsFor(k), t = dayTotals(k).tot, mc = macroCloser(k);
          return {T, tot:{kcal:Math.round(t.kcal),p:Math.round(t.p),c:Math.round(t.c),f:Math.round(t.f)}, rem: mc.rem, list: mc.list.map(x => [x.id, x.g, Math.round(x.n.kcal), Math.round(x.n.p)])};
        }""")
        print(r); print(errs); await b.close()
asyncio.run(main())
