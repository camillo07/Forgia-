from testlib import setup_fake
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => { S.nutri = defaultNutri(); save(); render(); }")
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/m1-train.png', full_page=True)
        await pg.click('[data-a="progToggle"]'); await pg.wait_for_timeout(100)
        print('progs open', await pg.evaluate("document.querySelectorAll('.prog-card').length"))
        await pg.click('[data-a="tab"][data-k="diet"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="foodAdd"] >> nth=0'); await pg.click('[data-a="foodTab"][data-t="all"]'); await pg.fill('#fd-q','spinaci'); await pg.wait_for_timeout(300)
        await pg.click('#fd-list [data-a="foodPick"] >> nth=0'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="amMicro"]'); await pg.wait_for_timeout(100)
        await pg.fill('#am-qty','200'); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/m2-micro.png')
        await pg.click('[data-a="amSave"]'); await pg.wait_for_timeout(200)
        # coach fruit veg: add big meal to leave ~400 kcal
        await pg.evaluate("() => { const T = targetsFor(todayKey()); addEntry(todayKey(), {q:{n:'Pranzo', kcal: T.kcal-450, p:100, c:200, f:60}, m:'l'}); save(); render(); }")
        txt = await pg.evaluate("coachDay(todayKey()).map(m=>m.text||m.t||JSON.stringify(m)).join(' | ')")
        print('coach:', txt[:400])
        print('ERR', errs)
        await b.close()
asyncio.run(main())
