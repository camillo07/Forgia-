import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='shots/h1-home.png', full_page=True)
        await pg.click('[data-a="homePick"]'); await pg.wait_for_timeout(300); await pg.click('.sheet .opt >> nth=2'); await pg.wait_for_timeout(300)
        print('picked', await pg.inner_text('.hx-n'))
        await pg.click('.qa [data-a="homeRun"]'); await pg.wait_for_timeout(300); print('run sheet', await pg.locator('.sheet h3').inner_text()); await pg.click('[data-a="pop"]', timeout=2000) if await pg.locator('[data-a="pop"]').count() else None
        await pg.evaluate("() => { UI.layers = []; render(); }")
        await pg.click('[data-a="startRoutine"]'); await pg.wait_for_timeout(400); await pg.click('[data-a="minimize"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='shots/h2-active.png')
        print('hoverflow', await pg.evaluate("() => document.documentElement.scrollWidth > innerWidth"), 'ERR', errs)
        await b.close()
asyncio.run(main())
