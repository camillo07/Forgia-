import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':375,'height':740}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        # start Pull (second routine) via train tab
        await pg.click('[data-a="tab"][data-k="train"]')
        await pg.click('[data-a="startRoutine"] >> nth=1'); await pg.wait_for_timeout(300)
        await pg.fill('input[data-ei="0"][data-si="0"][data-f="r"]','15')
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="0"]'); await pg.wait_for_timeout(300)
        # set type menu -> drop set on set 3 of row ex 1
        await pg.click('[data-a="setMenu"][data-ei="1"][data-si="2"]'); await pg.wait_for_timeout(200)
        await pg.click('.sheet .opt >> nth=2'); await pg.wait_for_timeout(200)
        # reload mid workout
        await pg.reload(); await pg.wait_for_timeout(600)
        await pg.screenshot(path='shots/11-pull-resume.png')
        txt = await pg.inner_text('#layers')
        print('resumed', 'PULL' in txt.upper(), 'D' in txt)
        # minimize and check home banner
        await pg.click('[data-a="minimize"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/12-home-active.png')
        print('ERR', errs)
        await b.close()
asyncio.run(main())
