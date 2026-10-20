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
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("S.workouts.forEach(w=>delete w.demo); save(); render()")
        print('recent card', await pg.evaluate("!!document.querySelector('[data-a=copyWorkout]')"))
        await pg.click('[data-a="copyWorkout"] >> nth=0'); await pg.wait_for_timeout(150)
        print('copied', await pg.evaluate("S.routines.slice(-1)[0].name"))
        rid = await pg.evaluate("S.routines.find(r=>r.name==='Push').id")
        await pg.click(f'[data-a="startRoutine"][data-id="{rid}"]'); await pg.wait_for_timeout(300)
        # set 1: too easy
        await pg.fill('input[data-ei="0"][data-si="0"][data-f="kg"]','80'); await pg.fill('input[data-ei="0"][data-si="0"][data-f="r"]','12')
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="0"]'); await pg.wait_for_timeout(200)
        print('live', await pg.evaluate("document.querySelector('.exc .sugg')?.innerText"), '| next ph', await pg.evaluate("document.querySelector('input[data-ei=\"0\"][data-si=\"1\"][data-f=\"kg\"]').placeholder"))
        print('audio', await pg.evaluate("!!RA.audio"), await pg.evaluate("navigator.mediaSession && navigator.mediaSession.metadata && navigator.mediaSession.metadata.title + ' | ' + navigator.mediaSession.metadata.artist"))
        await pg.screenshot(path='shots/u1-live.png')
        await pg.click('[data-a="restSkip"]'); await pg.wait_for_timeout(100)
        print('audio after skip', await pg.evaluate("!!RA.audio"))
        # remove last set of ex 0 (set menu -> elimina?) use state directly; finish others
        await pg.evaluate("() => { const e = S.active.ex[0]; e.sets.pop(); e.sets.forEach(s => { s.kg = 80; s.r = 10; s.done = true; }); S.active.ex.splice(2, 1); save(); renderLayers(); }")
        await pg.wait_for_timeout(150)
        print('collapsed ex0', await pg.evaluate("S.active.ex[0].col"))
        # drag ex1 to top with pointer
        h = await pg.query_selector('[data-drag-item]:nth-of-type(2) .drag-h') or await pg.query_selector_all('.drag-h')
        hs = await pg.query_selector_all('.exc .drag-h'); bb1 = await hs[1].bounding_box(); bb0 = await hs[0].bounding_box()
        order0 = await pg.evaluate("S.active.ex.map(e=>e.id)")
        await pg.mouse.move(bb1['x']+10, bb1['y']+10); await pg.mouse.down(); await pg.mouse.move(bb1['x']+10, bb0['y']-30, steps=12); await pg.mouse.up(); await pg.wait_for_timeout(200)
        order1 = await pg.evaluate("S.active.ex.map(e=>e.id)")
        print('drag moved', order0[:2], '->', order1[:2])
        # add an exercise
        await pg.evaluate("() => { S.active.ex.push({ id: 'Face_Pull', mt: 'wr', tags: [], rest: 75, ss:false, note:'', sets: [{t:'n',kg:20,r:15,done:true},{t:'n',kg:20,r:15,done:false}] }); save(); renderLayers(); }")
        await pg.screenshot(path='shots/u2-collapsed.png')
        await pg.click('[data-a="finishWorkout"]'); await pg.wait_for_timeout(200)
        if await pg.query_selector('[data-a="confirmOk"]'): await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(300)
        print('sheet title', await pg.evaluate("document.querySelector('.sheet h3')?.innerText"), '|', await pg.evaluate("document.querySelector('.sheet')?.innerText.slice(0,400)"))
        await pg.screenshot(path='shots/u3-update.png')
        await pg.click('.sheet [data-a="sheetPick"] >> text=Aggiorna serie ed esercizi'); await pg.wait_for_timeout(300)
        r = await pg.evaluate(f"JSON.stringify(S.routines.find(r=>r.id==='{rid}').ex.map(e=>[e.id, planOf(e).length]))"); print('routine after', r)
        # stretching group
        await pg.evaluate("UI.layers=[]; renderLayers()"); await pg.click('[data-a="openLibrary"]'); await pg.click('[data-a="pickGroup"][data-g="stretch"]'); await pg.wait_for_timeout(200)
        print('stretch count', await pg.evaluate("filterExercises(topLayer()).length"), 'groups', await pg.evaluate("GROUPS.map(g=>g.n).join(',')"))
        # sheet swipe
        await pg.evaluate("UI.layers=[]; render()"); await pg.click('[data-a="tab"][data-k="train"]')
        await pg.click('[data-a="routineMenu"] >> nth=0'); await pg.wait_for_timeout(200)
        sb = await (await pg.query_selector('.sheet .grab')).bounding_box()
        await pg.dispatch_event('.sheet .grab', 'touchstart', {'touches':[{'identifier':1,'clientX':sb['x'],'clientY':sb['y']}]} ) if False else None
        await pg.evaluate("""() => { const g = document.querySelector('.sheet .grab'); const mk = (t, y) => { const e = new Event(t, {bubbles:true}); e.touches = [{clientY:y}]; return e; }; g.dispatchEvent(mk('touchstart', 100)); document.dispatchEvent(mk('touchmove', 260)); document.dispatchEvent(mk('touchend', 260)); }""")
        await pg.wait_for_timeout(400)
        print('sheet closed by swipe', await pg.evaluate("!document.querySelector('.sheet')"))
        print('types', await pg.evaluate("Object.keys(SET_TYPES).join(',')"))
        print('ERR', errs); await b.close()
asyncio.run(main())
