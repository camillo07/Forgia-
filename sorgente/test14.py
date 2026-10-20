from testlib import setup_fake
import asyncio, json
from playwright.async_api import async_playwright
LYFTA = """Programma 2
PETTO 1
Incline Bench Press
4 sets x 2-8 reps
Cable Standing Fly
3 sets x 4-12 reps
Smith Bench Press
2 sets x 8-10 reps
Seated Lateral Raise
3 sets x 5-13 reps
Dumbbell Alternate Seated Hammer Curl
2 sets x 8-10 reps
Triceps Pushdown
2 sets x 12 reps
Hanging Leg Hip Raise
2 sets x 12-13 reps
Lying Toe Touch
2 sets x 12-20 reps
SCHIENA 1
Lat pulldown
4 sets x 8-10 reps
T-Bar Row
3 sets x 10 reps"""
PLAIN = """Giorno A
Panca piana 4x6-8
Rematore bilanciere 4x8 rec 2'
Alzate laterali manubri 3x12-15 RIR 1
Giorno B
Squat 5x5 @75%
Stacco rumeno 3x8
Leg curl 3 x 12/10/8"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(400)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.click('[data-a="importOpen"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/r1-import.png')
        async with pg.expect_file_chooser() as fc:
            await pg.click('[data-a="impPick"][data-k="file"]')
        ch = await fc.value; await ch.set_files('fixtures/pt.xlsx'); await pg.wait_for_timeout(800)
        res = await pg.evaluate("JSON.stringify(topLayer().res && {name: topLayer().res.name, notes: topLayer().res.notes, days: topLayer().res.days.map(d=>({n:d.name, ex:d.ex.map(e=>[e.raw, e.id, e.conf, planSummary(e.plan), e.ss, e.tags.join('/'), e.note])}))})")
        print(json.dumps(json.loads(res), indent=0, ensure_ascii=False)[:6000])
        await pg.screenshot(path='shots/r2-review.png', full_page=False)
        await pg.click('[data-a="impSave"] >> nth=0'); await pg.wait_for_timeout(300)
        print('routines', await pg.evaluate("S.routines.filter(r=>r.fid).map(r=>r.name+':'+r.ex.length)"))
        await pg.evaluate("window.scrollTo(0,0)"); await pg.screenshot(path='shots/r3-train.png', full_page=True)
        # text imports
        for txt in [LYFTA, PLAIN]:
            await pg.click('[data-a="importOpen"]'); await pg.click('[data-a="impMode"][data-k="text"]'); await pg.fill('#imp-text', txt); await pg.click('[data-a="impParseText"]'); await pg.wait_for_timeout(300)
            res = await pg.evaluate("JSON.stringify({name: topLayer().res.name, days: topLayer().res.days.map(d=>({n:d.name, ex:d.ex.map(e=>[e.raw, e.id, e.conf, planSummary(e.plan), e.tags.join('/'), e.note])}))})")
            print(json.dumps(json.loads(res), indent=0, ensure_ascii=False))
            await pg.screenshot(path='shots/r4-text.png')
            await pg.evaluate("UI.layers=[]; renderLayers()")
        # start imported routine day 1
        rid = await pg.evaluate("S.routines.find(r=>r.fid && r.name==='DAY 2').id")
        await pg.evaluate(f"startWorkout(S.routines.find(r=>r.id==='{rid}'))"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/r5-wo.png')
        print('ERR', errs)
        await b.close()
asyncio.run(main())
