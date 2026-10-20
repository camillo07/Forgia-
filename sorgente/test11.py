from testlib import setup_fake
import asyncio, json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(400)
        print('parse', await pg.evaluate("""JSON.stringify([hNum('45,2'), hNum('8.123', true), hNum('1.234,5', true), hNum('612,7 kcal', true), hDur('7:12'), hDur('7 h 12 min'), hDur('432'), hDur('25920'), hDur('7,2'), hDur('6 ore 30 min')])"""))
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => { S.nutri = defaultNutri(); const k = todayKey(); S.health[k] = {hrv:'61,3', rhr:'51', sleep:'7 h 40 min', steps:'6.512', kcal:'480', at:'08:00'}; save(); render(); }")
        print('today', await pg.evaluate("JSON.stringify({hd: healthDay(todayKey()), rec: recovery(todayKey()), st: strain(todayKey()), sl: sleepScore(todayKey())})"))
        await pg.evaluate('window.scrollTo(0,0)'); await pg.screenshot(path='shots/n1-home.png', full_page=True)
        await pg.click('[data-a="healthDetail"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='shots/n2-detail.png', full_page=False)
        await pg.evaluate("document.querySelector('[data-scroll-key^=hd]').scrollTop=600"); await pg.screenshot(path='shots/n3-detail2.png')
        await pg.click('[data-a="sleepNeed"][data-d="0.5"]'); print('need', await pg.evaluate("S.profile.sleepNeed"))
        await pg.click('[data-a="pop"]')
        await pg.click('[data-a="tab"][data-k="progress"]'); await pg.click('[data-a="progSeg"][data-v="body"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/n4-body.png', full_page=True)
        await pg.click('.hero [data-a="bodyLog"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='shots/n5-log.png')
        await pg.click('[data-a="pop"]')
        await pg.click('[data-a="tab"][data-k="me"]'); await pg.click('[data-a="healthSetup"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/n6-setup.png')
        print('sync h', await pg.evaluate("[...localItems().keys()].filter(k=>k.startsWith('h|'))"))
        # no health at all, fresh state
        await pg.evaluate("() => { S.health = {}; removeBodyDemo(); save(); render(); }")
        print('readiness empty', await pg.evaluate("readinessCard()==''"))
        ov = await pg.evaluate("document.documentElement.scrollWidth > innerWidth"); print('hoverflow', ov)
        print('ERR', errs)
        await b.close()
asyncio.run(main())
