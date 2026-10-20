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
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        print('folders after onboarding', await pg.evaluate("JSON.stringify(S.folders.map(f=>f.name))"), await pg.evaluate("S.routines.map(r=>!!r.fid)"))
        # new routine
        await pg.click('[data-a="newRoutine"]'); await pg.fill('#rt-name','Upper A')
        await pg.click('[data-a="pickForRoutine"]'); await pg.fill('#pk-q','bench press'); await pg.wait_for_timeout(250)
        await pg.click('#pk-list [data-a="pickEx"] >> nth=0'); await pg.click('[data-a="pickDone"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="rtAddSet"]'); await pg.wait_for_timeout(100)
        sel = lambda si,f: f'input[data-in="rtSet"][data-ei="0"][data-si="{si}"][data-f="{f}"]'
        await pg.fill(sel(0,'a'),'8'); await pg.fill(sel(0,'b'),'10')
        await pg.fill(sel(1,'a'),'10'); await pg.fill(sel(1,'b'),'12')
        await pg.fill(sel(3,'a'),'12'); await pg.fill(sel(3,'b'),'15')
        print('plan', await pg.evaluate("JSON.stringify(topLayer().draft.ex[0].plan)"))
        # set type warmup on row 0
        await pg.click('[data-a="rtSetType"][data-si="0"]'); await pg.click('.sheet [data-a="sheetPick"][data-k="1"]'); await pg.wait_for_timeout(100)
        # fixed reps: clear max on row 2 -> cascades rows 2,3
        await pg.fill(sel(2,'b'),'')
        await pg.screenshot(path='shots/o1-editor.png')
        await pg.click('[data-a="saveRoutine"]'); await pg.wait_for_timeout(200)
        r = await pg.evaluate("JSON.stringify(S.routines.find(r=>r.name==='Upper A').ex[0])"); print('saved', r)
        # folder
        await pg.click('[data-a="folderNew"]'); await pg.fill('#fd-name','Massa 2026'); await pg.click('[data-a="fdColor"] >> nth=2'); await pg.click('[data-a="folderCreate"]'); await pg.wait_for_timeout(200)
        rid = await pg.evaluate("S.routines.find(r=>r.name==='Upper A').id")
        await pg.click(f'[data-a="routineMenu"][data-id="{rid}"]'); await pg.click('.sheet [data-a="sheetPick"] >> text=Sposta in cartella'); await pg.wait_for_timeout(100)
        await pg.click('.sheet [data-a="sheetPick"] >> text=Massa 2026'); await pg.wait_for_timeout(200)
        fid = await pg.evaluate("S.folders.find(f=>f.name==='Massa 2026').id")
        await pg.click(f'[data-a="folderMenu"][data-id="{fid}"]')
        async with pg.expect_file_chooser() as fc:
            await pg.click('.sheet [data-a="sheetPick"] >> text=Aggiungi immagine')
        ch = await fc.value; await ch.set_files('fixtures/fold.jpg'); await pg.wait_for_timeout(500)
        print('img', await pg.evaluate("(S.folders.find(f=>f.name==='Massa 2026').img||'').slice(0,30)"), await pg.evaluate("(S.folders.find(f=>f.name==='Massa 2026').img||'').length"))
        await pg.evaluate("window.scrollTo(0,0)"); await pg.screenshot(path='shots/o2-train.png', full_page=True)
        # start routine
        await pg.click(f'[data-a="startRoutine"][data-id="{rid}"]'); await pg.wait_for_timeout(300)
        print('sets', await pg.evaluate("JSON.stringify(S.active.ex[0].sets.map(s=>[s.t,s.ta,s.tb]))"))
        await pg.screenshot(path='shots/o3-workout.png')
        print('rir inputs', await pg.evaluate("document.querySelectorAll('input[data-f=rir]').length"))
        await pg.click('[data-a="exMenu"][data-ei="0"]'); await pg.click('.sheet [data-a="sheetPick"] >> text=Registra RIR'); await pg.wait_for_timeout(200)
        print('rir inputs after', await pg.evaluate("document.querySelectorAll('input[data-f=rir]').length"))
        # rir tag exclusive
        await pg.click('[data-a="woTags"][data-ei="0"]'); await pg.click('[data-a="tagToggle"][data-t="RIR 1"]'); await pg.click('[data-a="tagToggle"][data-t="RIR 2"]'); await pg.wait_for_timeout(100)
        print('tags', await pg.evaluate("JSON.stringify(S.active.ex[0].tags)"), 'rirT', await pg.evaluate("rirTarget(S.active.ex[0])"))
        await pg.click('.sheet [data-a="pop"]')
        await pg.screenshot(path='shots/o4-workout-rir.png')
        print('ERR', errs)
        await b.close()
asyncio.run(main())
