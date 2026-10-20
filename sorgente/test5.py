from testlib import setup_fake
import asyncio, json
from playwright.async_api import async_playwright
AI_JSON = {"content":[{"type":"text","text":json.dumps({"name":"Carbonara (ristorante)","grams":350,"kcal":780,"p":30,"c":85,"f":34,"fib":4,"sug":3,"sat":13,"salt":2.4,"cat":"dish","confidence":"media","notes":"120 g di pasta"})}]}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('**/search.openfoodfacts.org/**', lambda r: r.fulfill(status=200, content_type='application/json', body='{"hits":[]}', headers={'access-control-allow-origin':'*'}))
        await pg.route('**/api.anthropic.com/**', lambda r: r.fulfill(status=200, content_type='application/json', body=json.dumps(AI_JSON), headers={'access-control-allow-origin':'*'}))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        # search tests via JS
        res = await pg.evaluate("""() => { const q = s => searchLocal(s).slice(0,4).map(f=>f.n);
          return {mele:q('mele'), ciliegie:q('ciliegie'), mango:q('mango'), pomodoro:q('pomodoro'), spaghetti:q('spaghetti'), typo:q('yougurt greco'), atun:q('atun'), petto:q('petto pollo'), count: BASE_FOODS.size} }""")
        for k,v in res.items(): print(k, v)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => { S.nutri = defaultNutri(); S.nutri.weight=76; S.ai.key='sk-test'; save(); render(); }")
        await pg.click('[data-a="tab"][data-k="diet"]'); await pg.wait_for_timeout(200)
        # yesterday has demo data → navigate back
        await pg.click('[data-a="dayNav"][data-d="-1"]'); await pg.wait_for_timeout(200)
        await pg.click("[data-a=\"toggleMicro\"]"); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/e1-dayyest.png', full_page=True)
        await pg.click('[data-a="microInfo"][data-k="vitc"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/e2-microinfo.png')
        await pg.click('[data-a="pop"]', timeout=2000) if await pg.query_selector('[data-a="pop"]') else None
        await pg.evaluate("UI.layers=[]; renderLayers()")
        # AI food estimate
        await pg.click('[data-a="dayToday"]'); await pg.click('.meal [data-a="foodAdd"][data-m="l"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="aiFood"]'); await pg.fill('#ai-desc','carbonara al ristorante'); await pg.click('[data-a="aiFoodRun"]'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/e3-aifood.png')
        await pg.click('[data-a="aiFoodSave"]'); await pg.wait_for_timeout(300)
        # analysis ranges
        await pg.click('[data-a="dietStats"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/e4-stats7.png', full_page=False)
        await pg.click('[data-a="statsRange"][data-r="30"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("document.querySelector('[data-scroll-key^=ds]').scrollTop=900"); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/e5-stats30.png')
        await pg.click('[data-a="pop"]'); await pg.wait_for_timeout(100)
        # targets manual mode + coach
        await pg.click('[data-a="nutriSetup"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="ntMode"][data-v="manual"]'); await pg.wait_for_timeout(200)
        await pg.fill('[data-in="ntMan"][data-k="kcal"]','1500'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/e6-manual.png')
        await pg.click('[data-a="nutriSave"]'); await pg.wait_for_timeout(200)
        # custom food with bad values
        await pg.click('[data-a="myFoods"]'); await pg.click('[data-a="foodNew"]'); await pg.fill('#fe-n','Barretta test')
        for k,v in [('kcal','150'),('p','30'),('c','40'),('f','20')]: await pg.fill(f'[data-in="feNut"][data-k="{k}"]', v)
        await pg.wait_for_timeout(200); await pg.screenshot(path='shots/e7-foodedit.png')
        await pg.click('[data-a="foodSave"]'); await pg.wait_for_timeout(200)
        t = await pg.inner_text('#layers'); print('confirm shown', 'Controlla i valori' in t)
        await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(300)
        # methods
        await pg.evaluate("UI.layers=[]; renderLayers()")
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/e8-methods.png')
        await pg.click('[data-a="methodCat"][data-k="carente"]'); await pg.click('[data-a="openMethod"][data-id="special"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/e9-method.png')
        st = await pg.evaluate("Object.values(S.foods).map(f=>[f.n,f.brand,Math.round(f.per.kcal)])"); print(st)
        print('hoverflow', await pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
        print('ERR', errs)
        await b.close()
asyncio.run(main())
