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
        # regions coverage
        cov = await pg.evaluate("""() => { const f = anParts('front'), b = anParts('back'); const rs = new Set([...f, ...b].map(p => p.r).filter(Boolean)); return { missing: Object.keys(AN_R).filter(r => !rs.has(r)), nf: f.length, nb: b.length, badEx: Object.entries(AN_R).flatMap(([k, r]) => r.ex.filter(id => !EXMAP.has(id)).map(id => k + ':' + id)) }; }""")
        print('coverage', cov)
        await pg.click('[data-a="tab"][data-k="progress"]'); await pg.wait_for_timeout(300)
        print('mini map', await pg.evaluate("!!document.querySelector('.an-mini svg .an-r')"))
        await pg.evaluate("document.querySelector('.an-mini').scrollIntoView()"); await pg.wait_for_timeout(100)
        await pg.screenshot(path='shots/an-mini.png')
        await pg.click('.an-mini'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/an-1.png')
        # tap chest
        box = await pg.evaluate("(() => { const e = document.querySelector('#an-stage .an-r[data-r=petto_medio]'); const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]; })()")
        await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(800)
        print('focus', await pg.evaluate("[topLayer().g, topLayer().r, document.querySelectorAll('#an-stage .an-r.in').length]"))
        await pg.screenshot(path='shots/an-2.png')
        box = await pg.evaluate("(() => { const e = document.querySelector('#an-stage .an-r[data-r=petto_alto]'); const r = e.getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height*0.35]; })()")
        await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(700)
        print('region', await pg.evaluate("[topLayer().g, topLayer().r, document.querySelector('#an-panel').innerText.slice(0,300)]"))
        await pg.screenshot(path='shots/an-3.png')
        # chip: dorsali -> should flip to back
        await pg.click('[data-a="anatBack"]'); await pg.wait_for_timeout(600)
        await pg.click('[data-a="anatGroup"][data-g="dorsali"]'); await pg.wait_for_timeout(1200)
        print('flip', await pg.evaluate("[topLayer().side, topLayer().g]"))
        await pg.screenshot(path='shots/an-4.png')
        # zoom buttons + wheel
        await pg.click('[data-a="anatZoom"][data-d="1"]'); await pg.wait_for_timeout(200)
        print('vb', await pg.evaluate("topLayer().vb.map(Math.round)"))
        await pg.click('[data-a="anatReset"]'); await pg.wait_for_timeout(700)
        await pg.click('[data-a="anatGroup"][data-g="tricipiti"]'); await pg.wait_for_timeout(1200)
        await pg.click('[data-a="anatRegion"][data-r="tri_lungo"]'); await pg.wait_for_timeout(600)
        await pg.screenshot(path='shots/an-5.png')
        await pg.click('#an-panel [data-a="openEx"] >> nth=0'); await pg.wait_for_timeout(300)
        print('opened ex', await pg.evaluate("topLayer().type + ' ' + topLayer().id"))
        print('picker forearms', await pg.evaluate("filterExercises({q:'',g:'forearms',eq:''}).length"), await pg.evaluate("VOL_GROUPS.map(g=>g.n).join(',')"))
        print('errors', errs); assert not errs and not cov['missing'] and not cov['badEx']
asyncio.run(main())
