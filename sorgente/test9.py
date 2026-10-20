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
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => { S.nutri = defaultNutri(); S.nutri.rate = -0.25; save(); render(); }")
        await pg.screenshot(path='shots/j0-home.png', full_page=True)
        print('body days', await pg.evaluate("Object.keys(S.body).length"), 'wnow', await pg.evaluate("JSON.stringify(weightNow())"))
        print('adaptive', await pg.evaluate("JSON.stringify(adaptiveTDEE())"))
        print('targets before', await pg.evaluate("JSON.stringify(baseTargets())"))
        await pg.click('[data-a="tab"][data-k="progress"]'); await pg.click('[data-a="progSeg"][data-v="body"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='shots/j1-body.png', full_page=True)
        await pg.click('[data-a="adaptToggle"]'); await pg.wait_for_timeout(200)
        print('targets adapt', await pg.evaluate("JSON.stringify(baseTargets())"))
        # log today
        await pg.click('.hero [data-a="bodyLog"]'); await pg.wait_for_timeout(200)
        await pg.fill('input[data-f="w"]','77,8'); await pg.fill('input[data-f="bf"]','16,4')
        await pg.click('[data-a="bdWater"][data-v="500"]'); await pg.fill('input[data-f="steps"]','9500'); await pg.fill('input[data-f="sleep"]','7,5')
        if not await pg.query_selector('input[data-f="waist"]'): await pg.click('[data-a="bdMeasOpen"]')
        await pg.fill('input[data-f="waist"]','82'); await pg.fill('input[data-f="neck"]','38')
        await pg.screenshot(path='shots/j2-log.png', full_page=False)
        print('navy', await pg.inner_text('#bd-navy'))
        await pg.click('[data-a="bodySave"]'); await pg.wait_for_timeout(200)
        print('today', await pg.evaluate("JSON.stringify(S.body[todayKey()])"))
        await pg.click('[data-a="water"][data-v="250"] >> nth=0'); await pg.wait_for_timeout(150)
        print('water', await pg.evaluate("S.body[todayKey()].water"))
        # bad weight
        await pg.click('.hero [data-a="bodyLog"]'); await pg.fill('input[data-f="w"]','5'); await pg.click('[data-a="bodySave"]'); await pg.wait_for_timeout(100)
        print('still open', await pg.evaluate("topLayer()?.type")); await pg.click('[data-a="pop"]'); await pg.wait_for_timeout(100)
        # metric + history
        await pg.click('[data-a="bodyMetric"] >> nth=0'); await pg.wait_for_timeout(200); await pg.screenshot(path='shots/j3-metric.png'); await pg.click('[data-a="pop"]')
        await pg.click('[data-a="bodyHistory"]'); await pg.wait_for_timeout(200); await pg.screenshot(path='shots/j4-hist.png'); await pg.click('[data-a="pop"]')
        # photos
        for i,pose in enumerate(['front','front']):
            await pg.click('[data-a="phAddAsk"]'); await pg.wait_for_timeout(100)
            async with pg.expect_file_chooser() as fc:
                await pg.click('[data-a="sheetPick"][data-k="0"]')
            ch = await fc.value; await ch.set_files(f'fixtures/ph{i}.jpg'); await pg.wait_for_timeout(900)
        print('photos', await pg.evaluate("PH.list.length"))
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/j5-photos.png')
        await pg.click('[data-a="phCompare"]'); await pg.wait_for_timeout(500); await pg.screenshot(path='shots/j6-compare.png'); await pg.click('[data-a="pop"]')
        await pg.click('[data-a="phOpen"] >> nth=0'); await pg.wait_for_timeout(400); await pg.screenshot(path='shots/j7-photo.png')
        await pg.click('[data-a="phDel"]'); await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(500)
        print('photos after del', await pg.evaluate("PH.list.length"), 'layers', await pg.evaluate("UI.layers.length"))
        # sync items include body
        print('sync b items', await pg.evaluate("[...localItems().keys()].filter(k=>k.startsWith('b|')).length"))
        # nutri layer
        await pg.click('[data-a="tab"][data-k="diet"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="nutriSetup"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/j8-nutri.png', full_page=False)
        print('draft w', await pg.evaluate("topLayer().draft.weight"))
        await pg.click('[data-a="nutriSave"]'); await pg.wait_for_timeout(100)
        # remove demo
        await pg.click('[data-a="tab"][data-k="me"]'); await pg.click('[data-a="removeDemo"]'); await pg.wait_for_timeout(200)
        print('body after demo removal', await pg.evaluate("Object.keys(S.body)"))
        await pg.click('[data-a="tab"][data-k="progress"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/j9-body-real.png', full_page=True)
        ov = await pg.evaluate("document.documentElement.scrollWidth > innerWidth"); print('hoverflow', ov)
        print('ERR', errs)
        await b.close()
asyncio.run(main())
