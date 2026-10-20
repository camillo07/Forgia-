import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 800}, is_mobile=True, has_touch=True)
        await setup_fake(ctx); await ctx.add_init_script("Object.defineProperty(navigator, 'webdriver', { get: () => false })")
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia'); await pg.click('input[value="ppl"]'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(300)
        print('motion', await pg.evaluate("() => motionOK()"))
        await pg.click('[data-a="openLibrary"]'); await pg.wait_for_timeout(500)
        await pg.click('[data-a="pop"]'); await pg.wait_for_timeout(80)
        print('ghost during', await pg.locator('body > .ghost-out').count())
        await pg.screenshot(path='shots/g2-ghost.png')
        await pg.wait_for_timeout(350)
        print('ghost after', await pg.locator('body > .layer').count(), 'layers', await pg.evaluate("() => UI.layers.length"))
        await pg.click('[data-a="routineMenu"] >> nth=0'); await pg.wait_for_timeout(400)
        await pg.click('.layer.modal', position={'x': 50, 'y': 50}); await pg.wait_for_timeout(80)
        print('sheet ghost', await pg.locator('body > .ghost-sheet').count())
        await pg.wait_for_timeout(350)
        # start workout and minimize -> ghost-down
        await pg.click('[data-a="startRoutine"] >> nth=0'); await pg.wait_for_timeout(500)
        await pg.click('[data-a="minimize"]'); await pg.wait_for_timeout(80)
        print('down ghost', await pg.locator('body > .ghost-down').count())
        await pg.wait_for_timeout(350)
        await pg.click('[data-a="tab"][data-k="progress"]'); await pg.wait_for_timeout(400)
        print('ERR', errs)
        await b.close()
asyncio.run(main())
