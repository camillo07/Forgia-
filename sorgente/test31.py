from testlib import setup_fake
import asyncio, json, sys
from playwright.async_api import async_playwright
import os
SP=os.path.abspath('fixtures')+'/'
async def run(video):
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',f'--use-file-for-fake-video-capture={SP}{video}'])
        ctx = await b.new_context(viewport={'width':390,'height':844}, permissions=['camera'])
        await setup_fake(ctx)
        prod = {'status':1,'product':{'code':'8001505005707','product_name':'Biscotti test','brands':'Test','nutriments':{'energy-kcal_100g':450,'proteins_100g':7,'carbohydrates_100g':70,'fat_100g':15}}}
        await ctx.route('**/api/v2/product/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(prod)))
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.fill('#ob-name','M'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("window.BarcodeDetector = undefined; delete window.BarcodeDetector; window.FORGIA_PWA = true;")
        await pg.evaluate("openScanner('b')")
        for i in range(40):
            await pg.wait_for_timeout(250)
            t = await pg.evaluate("topLayer() && topLayer().type")
            if t == 'amount': break
        print(video, 'result layer:', await pg.evaluate("topLayer() && topLayer().type"), await pg.evaluate("topLayer() && topLayer().food && topLayer().food.n"), 'ticks', await pg.evaluate("SCAN.n"), 'msg', await pg.evaluate("document.querySelector('#scan-msg')?.textContent"))
        print('errors', errs)
        await b.close()
async def main():
    for v in ['ean.y4m','ean_v.y4m']: await run(v)
asyncio.run(main())
