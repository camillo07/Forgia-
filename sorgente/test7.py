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
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => { S.nutri = defaultNutri(); save(); render(); }")
        # workout with plank (time), treadmill (dist), pullups (bw)
        await pg.click('[data-a="startEmpty"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="pickForWorkout"]'); await pg.click('[data-a="pickGroup"][data-g=""]')
        for q,idx in [('plank',0),('tapis roulant',0),('trazioni alla sbarra',0)]:
            await pg.fill('#pk-q', q); await pg.wait_for_timeout(250)
            await pg.click('#pk-list [data-a="pickEx"] >> nth=0')
        await pg.click('[data-a="pickDone"]'); await pg.wait_for_timeout(300)
        print('types', await pg.evaluate("S.active.ex.map(e => [ex(e.id).n, e.mt])"))
        await pg.fill('input[data-ei="0"][data-si="0"][data-f="sec"]','60')
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="0"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="restSkip"]') if await pg.query_selector('[data-a="restSkip"]') else None
        await pg.fill('input[data-ei="1"][data-si="0"][data-f="km"]','5,2'); await pg.fill('input[data-ei="1"][data-si="0"][data-f="min"]','28')
        await pg.click('[data-a="toggleSet"][data-ei="1"][data-si="0"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="restSkip"]') if await pg.query_selector('[data-a="restSkip"]') else None
        await pg.fill('input[data-ei="2"][data-si="0"][data-f="r"]','10')
        await pg.click('[data-a="toggleSet"][data-ei="2"][data-si="0"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="restSkip"]') if await pg.query_selector('[data-a="restSkip"]') else None
        # tags
        await pg.click('[data-a="woTags"][data-ei="2"]'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="tagToggle"][data-t="Eccentrica 3 s"]'); await pg.fill('#tag-new','Presa neutra'); await pg.press('#tag-new','Enter'); await pg.wait_for_timeout(100)
        await pg.click('.sheet [data-a="pop"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/i1-workout.png', full_page=False)
        await pg.evaluate("document.querySelector('[data-scroll-key=workout]').scrollTop=400")
        await pg.screenshot(path='shots/i2-workout2.png')
        await pg.click('[data-a="finishWorkout"]'); await pg.wait_for_timeout(200)
        if await pg.query_selector('[data-a="confirmOk"]'): await pg.click('[data-a="confirmOk"]')
        await pg.wait_for_timeout(300)
        w = await pg.evaluate("S.workouts[S.workouts.length-1].ex.map(e=>[e.id,e.mt,e.tags,e.sets])"); print(w)
        await pg.click('[data-a="closeAll"]')
        # diet
        await pg.click('[data-a="tab"][data-k="diet"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="foodAdd"][data-m="x"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="foodPick"][data-id="s_creatina"]'); await pg.click('[data-a="amSave"]'); await pg.wait_for_timeout(200)
        await pg.click('.meal [data-a="foodAdd"][data-m="l"]'); await pg.click('[data-a="foodTab"][data-t="all"]'); await pg.fill('#fd-q','petto di pollo'); await pg.wait_for_timeout(300)
        await pg.click('#fd-list [data-a="foodPick"] >> nth=0'); await pg.click('[data-a="amSave"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="mealToggle"][data-m="b"]'); await pg.wait_for_timeout(100)
        print('crea', await pg.evaluate("Math.round(dayTotals(todayKey()).tot.crea*10)/10"), 'entries', await pg.evaluate("dayEntries(todayKey()).map(e=>e.m)"))
        await pg.click('[data-a="toggleMicro"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/i3-diet.png', full_page=True)
        print('hoverflow', await pg.evaluate("document.documentElement.scrollWidth > innerWidth"))
        print('ERR', errs)
        await b.close()
asyncio.run(main())
