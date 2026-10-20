from testlib import setup_fake
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        await ctx.add_init_script("navigator.audioSession = { type: 'auto' }; window.__modes = []; Object.defineProperty(navigator.audioSession, 'type', { get(){ return this._t || 'auto' }, set(v){ this._t = v; window.__modes.push(v) } });")
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        rid = await pg.evaluate("S.routines.find(r=>r.name==='Push').id")
        await pg.click(f'[data-a="startRoutine"][data-id="{rid}"]'); await pg.wait_for_timeout(300)
        await pg.fill('input[data-ei="0"][data-si="0"][data-f="kg"]','80'); await pg.fill('input[data-ei="0"][data-si="0"][data-f="r"]','10')
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="0"]'); await pg.wait_for_timeout(200)
        r1 = await pg.evaluate("({lock:S.profile.lockTimer, audio:!!RA.audio, rest:!!S.active.restEnd, mode:navigator.audioSession.type})")
        print('default', r1); assert r1['audio'] is False and r1['rest'] and r1['mode']=='ambient'
        await pg.evaluate("A.toggleLockTimer()"); await pg.wait_for_timeout(100)
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="1"]'); await pg.wait_for_timeout(200)
        r2 = await pg.evaluate("({lock:S.profile.lockTimer, audio:!!RA.audio, mode:navigator.audioSession.type})")
        print('on', r2); assert r2['lock'] is True and r2['audio'] and r2['mode']=='playback'
        await pg.click('[data-a="restSkip"]'); await pg.wait_for_timeout(100)
        r3 = await pg.evaluate("({audio:!!RA.audio, mode:navigator.audioSession.type})")
        print('skip', r3); assert not r3['audio'] and r3['mode']=='ambient'
        await pg.evaluate("A.toggleLockTimer()")
        print('off again', await pg.evaluate("S.profile.lockTimer"))
        await pg.evaluate("UI.layers=[]; UI.tab='me'; render()"); await pg.wait_for_timeout(200)
        txt = await pg.evaluate("[...document.querySelectorAll('.lbl')].find(l=>l.textContent.includes('schermata di blocco'))?.parentElement.innerText")
        print('label', txt)
        print('errors', errs); assert not errs
asyncio.run(main())
