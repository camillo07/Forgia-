from testlib import setup_fake
import asyncio, json
from playwright.async_api import async_playwright
IDS = ['Cable_Rope_Overhead_Triceps_Extension','Triceps_Pushdown','Barbell_Bench_Press_-_Medium_Grip','Incline_Dumbbell_Press','Dips_-_Chest_Version','Barbell_Squat','Romanian_Deadlift','Barbell_Deadlift','Pullups','Seated_Cable_Rows','Side_Lateral_Raise','Face_Pull','Incline_Dumbbell_Curl','Preacher_Curl','Hammer_Curls','Seated_Calf_Raise','Hanging_Leg_Raise','Leg_Extensions','x_bulgarian_split_squat','Barbell_Hip_Thrust','Dumbbell_Shoulder_Press','x_cable_fly_low_high']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        r = await pg.evaluate("ids => ids.map(id => [id, EXMAP.has(id), Object.entries(exFocus(ex(id))).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>k+' '+v).join(', '), exfView(exFocus(ex(id))).map(v=>v.side).join('+')])", IDS)
        for row in r: print(row)
        # coverage over all strength exercises: how many get a focus
        print('coverage', await pg.evaluate("(() => { let n=0, ok=0; for (const x of EXMAP.values()) { if (x.c==='cardio'||x.c==='stretching') continue; n++; if (Object.keys(exFocus(x)).length) ok++; } return [ok, n]; })()"))
        for i, id in enumerate(['Cable_Rope_Overhead_Triceps_Extension','Barbell_Bench_Press_-_Medium_Grip','Barbell_Deadlift']):
            await pg.evaluate(f"pushLayer({{type:'exercise', id:'{id}'}})"); await pg.wait_for_timeout(150)
            await pg.evaluate("document.querySelector('.exf').scrollIntoView({block:'start'})")
            await pg.screenshot(path=f'shots/exf-{i}a.png'); await pg.wait_for_timeout(2200)
            await pg.screenshot(path=f'shots/exf-{i}.png')
            await pg.evaluate("UI.layers.pop(); renderLayers()"); await pg.wait_for_timeout(100)
        # rerender must not restart animation
        await pg.evaluate("pushLayer({type:'exercise', id:'Pullups'})"); await pg.wait_for_timeout(1500)
        await pg.evaluate("renderLayers()"); await pg.wait_for_timeout(50)
        print('rerender anim', await pg.evaluate("document.querySelectorAll('.exf-svg.anim').length"), await pg.evaluate("document.querySelector('.exf-svg').getAttribute('viewBox') === document.querySelector('.exf-svg').dataset.to.replace(/,/g,' ')"))
        await pg.click('.exf-stage'); await pg.wait_for_timeout(1300)
        print('open anat', await pg.evaluate("[topLayer().type, topLayer().side, topLayer().g, topLayer().r]"))
        await pg.screenshot(path='shots/exf-anat.png')
        # from a workout: tap exercise name
        await pg.evaluate("UI.layers=[]; renderLayers()")
        await pg.evaluate("A.startEmpty ? A.startEmpty() : null"); await pg.wait_for_timeout(200)
        print('errors', errs)
        await b.close()
asyncio.run(main())
