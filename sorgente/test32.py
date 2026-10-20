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
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.fill('#ob-name','Mattia'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="me"]'); await pg.wait_for_timeout(200)
        await pg.select_option('[data-in="soundKind"]', 'campanella'); await pg.wait_for_timeout(150)
        await pg.click('[data-a="soundVol"][data-v="high"]'); await pg.click('[data-a="soundTest"]'); await pg.click('[data-a="toggleRestWarn"]')
        print('profile', await pg.evaluate("[S.profile.soundKind, S.profile.soundVol, S.profile.restWarn]"))
        await pg.evaluate("document.querySelector('.sub-h').scrollIntoView()"); await pg.screenshot(path='shots/timer-set.png')
        # rest warning fires
        await pg.evaluate("UI.tab='train'; render(); startWorkout(S.routines[0]); startRest(12)"); await pg.wait_for_timeout(2600)
        print('warned', await pg.evaluate("S.active.restWarned"))
        await pg.evaluate("discardWorkout()")
        # anatomy drag pan
        await pg.evaluate("A.anatOpen()"); await pg.wait_for_timeout(400)
        v0 = await pg.evaluate("anGetVB()")
        await pg.mouse.move(200, 300); await pg.mouse.down(); await pg.mouse.move(150, 260, steps=6); await pg.mouse.up(); await pg.wait_for_timeout(100)
        v1 = await pg.evaluate("anGetVB()")
        print('pan', [round(a) for a in v0[:2]], '->', [round(a) for a in v1[:2]], 'still unfocused', await pg.evaluate("topLayer().g"))
        await pg.mouse.wheel(0, -300); await pg.wait_for_timeout(100)
        print('wheel w', round(v1[2]), '->', round((await pg.evaluate("anGetVB()"))[2]))
        # spanish check
        await pg.evaluate("UI.layers=[]; S.profile.lang='es'; applyLang(); render(); A.anatOpen()"); await pg.wait_for_timeout(400)
        await pg.click('[data-a="anatGroup"][data-g="spalle"]'); await pg.wait_for_timeout(900)
        await pg.click('[data-a="anatRegion"][data-r="delt_lat"]'); await pg.wait_for_timeout(500)
        print('es panel', (await pg.evaluate("document.querySelector('#an-panel').innerText"))[:260].replace('\n',' | '))
        await pg.screenshot(path='shots/an-es.png')
        print('errors', errs); assert not errs
asyncio.run(main())
