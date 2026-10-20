from testlib import setup_fake
import asyncio, json
from playwright.async_api import async_playwright
SH='shots/'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page()
        errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(800)
        await pg.screenshot(path=SH+'0-onboard.png', full_page=True)
        await pg.fill('#ob-name','Mattia')
        await pg.click('input[value="ppl"]')
        await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SH+'1-home.png', full_page=True)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SH+'2-train.png', full_page=True)
        await pg.click('[data-a="tab"][data-k="progress"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SH+'3-progress.png', full_page=True)
        await pg.click('[data-a="tab"][data-k="me"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SH+'4-me.png', full_page=True)
        # start workout from home
        await pg.click('[data-a="tab"][data-k="home"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="startRoutine"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SH+'5-workout.png')
        # tick first set using placeholders
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="0"]'); await pg.wait_for_timeout(300)
        # type a heavy set to trigger PR
        await pg.fill('input[data-ei="0"][data-si="1"][data-f="kg"]','100')
        await pg.fill('input[data-ei="0"][data-si="1"][data-f="r"]','8')
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="1"]'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SH+'6-workout-done.png')
        # picker
        await pg.click('[data-a="pickForWorkout"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="pickGroup"][data-g=""]'); await pg.wait_for_timeout(200)
        await pg.fill('#pk-q','lat machine'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SH+'7-picker.png')
        await pg.click('#pk-list [data-a="pickEx"] >> nth=0'); await pg.wait_for_timeout(100)
        await pg.click('[data-a="pickDone"]'); await pg.wait_for_timeout(300)
        # exercise detail
        await pg.click('.exc [data-a="openEx"] >> nth=0'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SH+'8-exdetail.png', full_page=False)
        await pg.click('[data-a="pop"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="finishWorkout"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(500)
        if await pg.query_selector('.sheet [data-a="sheetPick"]'): await pg.click('.sheet [data-a="sheetPick"] >> text=Mantieni'); await pg.wait_for_timeout(400)
        await pg.screenshot(path=SH+'9-summary.png', full_page=False)
        await pg.click('[data-a="closeAll"]'); await pg.wait_for_timeout(200)
        # routine editor
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="routineMenu"] >> nth=0'); await pg.wait_for_timeout(200)
        await pg.click('.sheet .opt >> nth=1'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SH+'10-editor.png')
        st = await pg.evaluate("JSON.parse(localStorage.getItem('forgia.v1'))")
        print('workouts', len(st['workouts']), 'routines', len(st['routines']), 'active', st['active'] is not None)
        last = sorted(st['workouts'], key=lambda w:w['start'])[-1]
        print('last', last['name'], [(e['id'], e['sets']) for e in last['ex']])
        # overflow check
        ov = await pg.evaluate("document.documentElement.scrollWidth > innerWidth")
        print('hoverflow', ov)
        print('ERRORS', errs)
        await b.close()
asyncio.run(main())
