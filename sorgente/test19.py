import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake
async def touch(cdp, kind, pts): await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})
async def swipe(pg, cdp, x0, y0, x1, y1, n=10):
    await touch(cdp, 'touchStart', [(x0, y0)])
    for k in range(1, n + 1): await touch(cdp, 'touchMove', [(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)]); await pg.wait_for_timeout(16)
    await touch(cdp, 'touchEnd', [])
async def longdrag(pg, sel_from, sel_to, dy=0):
    await pg.evaluate("() => window.scrollBy(0, document.querySelector('.rt-list').getBoundingClientRect().top - 110)"); await pg.wait_for_timeout(100)
    a = await pg.locator(sel_from).first.bounding_box(); t = await pg.locator(sel_to).first.bounding_box()
    x, y = a['x'] + a['width'] / 2, a['y'] + 18
    await pg.mouse.move(x, y); await pg.mouse.down(); await pg.wait_for_timeout(600)
    tx, ty = t['x'] + t['width'] / 2, t['y'] + t['height'] / 2 + dy
    for k in range(1, 11): await pg.mouse.move(x + (tx - x) * k / 10, y + (ty - y) * k / 10); await pg.wait_for_timeout(20)
    await pg.mouse.up(); await pg.wait_for_timeout(300)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia'); await pg.click('input[value="ppl"]')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => { S.folders.push({ id: 'fA', name: 'Cartella A', img: null, c: '#7fb2e5' }, { id: 'fB', name: 'Cartella B', img: null, c: '#3ddc97' }); save(); render(); }")
        names = lambda: pg.evaluate("() => S.routines.map(r => r.name + (r.fid ? '@' + r.fid : ''))")
        print('start', await names())
        # long press Push -> drop on folder A header
        await longdrag(pg, '.rt[data-rid] >> text=Push', '.folder[data-fid="fA"] .fold-h')
        print('into folder', await names(), 'click eaten (no workout):', await pg.evaluate("() => !S.active"))
        # short tap still works (open folder)
        print('folder opened after drop', await pg.locator('.folder[data-fid="fA"] .fold-body .rt').count())
        # drag Legs below Pull (reorder, loose)
        await longdrag(pg, '.rt-list > .rt >> text=Legs', '.rt-list > .rt >> text=Pull', -20)
        print('reorder', await names())
        # drag Push out of folder via zone
        await pg.evaluate("() => window.scrollBy(0, document.querySelector('.rt-list').getBoundingClientRect().top - 110)"); await pg.wait_for_timeout(100)
        a = await pg.locator('.fold-body .rt').first.bounding_box()
        await pg.mouse.move(a['x'] + 100, a['y'] + 18); await pg.mouse.down(); await pg.wait_for_timeout(600)
        z = await pg.locator('.lp-zone').bounding_box(); await pg.screenshot(path='shots/g1-drag.png')
        for k in range(1, 11): await pg.mouse.move(a['x'] + 100, a['y'] + 18 + (z['y'] + 20 - a['y'] - 18) * k / 10); await pg.wait_for_timeout(20)
        await pg.mouse.up(); await pg.wait_for_timeout(300)
        print('out of folder', await names())
        # folder reorder: B before A
        await pg.evaluate("() => window.scrollBy(0, document.querySelector('.folder[data-fid=fA]').getBoundingClientRect().top - 300)"); await pg.wait_for_timeout(100)
        fb = await pg.locator('.folder[data-fid="fB"] .fold-h').bounding_box(); fa = await pg.locator('.folder[data-fid="fA"] .fold-h').bounding_box(); print('fold boxes', fb, fa)
        await pg.mouse.move(fb['x'] + 150, fb['y'] + 30); await pg.mouse.down(); await pg.wait_for_timeout(600)
        print('lp', await pg.evaluate("() => [LP.on, LP.kind]"))
        for k in range(1, 11): await pg.mouse.move(fb['x'] + 150, fb['y'] + 30 + (fa['y'] + 15 - fb['y'] - 30) * k / 10); await pg.wait_for_timeout(20)
        print('tgt', await pg.evaluate("() => JSON.stringify(LP.target)"))
        await pg.mouse.up(); await pg.wait_for_timeout(300)
        print('folders', await pg.evaluate("() => S.folders.map(f => f.id)"))
        # moving finger before long press = scroll, no drag
        a = await pg.locator('.rt').first.bounding_box()
        await pg.mouse.move(a['x'] + 50, a['y'] + 20); await pg.mouse.down(); await pg.mouse.move(a['x'] + 50, a['y'] + 80); await pg.wait_for_timeout(600); await pg.mouse.up()
        print('no drag after early move', await pg.evaluate("() => !LP.on && !document.querySelector('.lp-ghost')"))
        # workout: swipe set to delete + undo
        await pg.click('[data-a="startRoutine"] >> nth=0'); await pg.wait_for_timeout(500)
        cdp = await ctx.new_cdp_session(pg)
        n0 = await pg.evaluate("() => S.active.ex[0].sets.length")
        r = await pg.locator('.set-row').nth(1).bounding_box()
        await swipe(pg, cdp, r['x'] + r['width'] - 30, r['y'] + r['height'] / 2, r['x'] + 20, r['y'] + r['height'] / 2 + 3); await pg.wait_for_timeout(400)
        n1 = await pg.evaluate("() => S.active.ex[0].sets.length")
        await pg.click('.toast [data-a="undo"]'); await pg.wait_for_timeout(200)
        n2 = await pg.evaluate("() => S.active.ex[0].sets.length")
        print('swipe delete', n0, n1, n2)
        # short swipe snaps back
        await swipe(pg, cdp, r['x'] + r['width'] - 30, r['y'] + r['height'] / 2, r['x'] + r['width'] - 70, r['y'] + r['height'] / 2); await pg.wait_for_timeout(400)
        print('short swipe kept', await pg.evaluate("() => S.active.ex[0].sets.length"))
        # vertical swipe on row does not delete
        await swipe(pg, cdp, r['x'] + 200, r['y'] + 10, r['x'] + 205, r['y'] + 200); await pg.wait_for_timeout(300)
        print('vertical kept', await pg.evaluate("() => S.active.ex[0].sets.length"))
        # long press exercise header -> reorder
        ids0 = await pg.evaluate("() => S.active.ex.map(e => e.id)")
        h = await pg.locator('.exc-head .name').first.bounding_box(); h2 = await pg.locator('.exc').nth(1).bounding_box()
        await pg.mouse.move(h['x'] + 40, h['y'] + 10); await pg.mouse.down(); await pg.wait_for_timeout(600)
        for k in range(1, 11): await pg.mouse.move(h['x'] + 40, h['y'] + 10 + (h2['y'] + h2['height'] - h['y']) * k / 10); await pg.wait_for_timeout(20)
        await pg.mouse.up(); await pg.wait_for_timeout(300)
        ids1 = await pg.evaluate("() => S.active.ex.map(e => e.id)")
        print('ex reorder', ids0[:2], ids1[:2], 'no exercise page opened:', await pg.evaluate("() => topLayer().type"))
        # pull header down -> minimize
        hd = await pg.locator('.layer[data-t="workout"] .wo-timer').bounding_box()
        await touch(cdp, 'touchStart', [(hd['x'] + 30, hd['y'] + 5)]); await touch(cdp, 'touchMove', [(hd['x'] + 30, hd['y'] + 40)])
        print('PD', await pg.evaluate(f"() => [JSON.stringify(PD && {{on: PD.on, dy: PD.dy}}), document.elementFromPoint({hd['x'] + 30}, {hd['y'] + 5})?.className]"))
        for k in range(2, 11): await touch(cdp, 'touchMove', [(hd['x'] + 30, hd['y'] + 30 * k)]); await pg.wait_for_timeout(16)
        await touch(cdp, 'touchEnd', []); await pg.wait_for_timeout(500)
        print('minimized', await pg.evaluate("() => UI.layers.length"), 'active kept', await pg.evaluate("() => !!S.active"))
        print('ERR', errs)
        await b.close()
asyncio.run(main())
