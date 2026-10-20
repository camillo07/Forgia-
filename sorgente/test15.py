from testlib import setup_fake
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2)
        await setup_fake(ctx); pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(600)
        print('gate when logged', await pg.evaluate("!!document.querySelector('#acc-email')"))
        await pg.fill('#ob-name','Mattia'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("() => { S.workouts.push({id:'w1',name:'X',start:Date.now()-1e6,end:Date.now(),ex:[]}); save(); }")
        await pg.click('[data-a="tab"][data-k="me"]'); await pg.click('[data-a="logout"]'); await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(500)
        print('gate after logout', await pg.evaluate("!!document.querySelector('#acc-email')"), 'tabbar hidden', await pg.evaluate("document.querySelector('#tabbar').hidden"))
        await pg.screenshot(path='shots/s1-gate.png')
        # another account logs in on this device
        await pg.evaluate("() => { const m = syncMeta(); m.uid = 'someone-else'; syncMetaSave(m); }")
        await pg.fill('#acc-email','x@test.it'); await pg.fill('#acc-pw','password123'); await pg.click('[data-a="login"]'); await pg.wait_for_timeout(1200)
        print('workouts after other user login', await pg.evaluate("S.workouts.length"), 'onboarded', await pg.evaluate("S.profile.onboarded"))
        # reload with no stored session -> gate
        await pg.evaluate("localStorage.removeItem('forgia.auth'); localStorage.removeItem('fakeuser')")
        print('ERR', errs); await b.close()
asyncio.run(main())
