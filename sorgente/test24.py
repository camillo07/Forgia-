import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, permissions=['geolocation'], geolocation={'latitude': 45.4642, 'longitude': 9.19, 'accuracy': 8})
        await setup_fake(ctx)
        tile = open('fixtures/tile.png','rb').read()
        await ctx.route('**/tile.openstreetmap.org/**', lambda r: r.fulfill(status=200, content_type='image/png', body=tile))
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        tiles = []; pg.on('response', lambda r: tiles.append(r.status) if 'tile.openstreetmap' in r.url else None)
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(800)
        await pg.evaluate("() => { S.nutri = defaultNutri(); save(); render(); }"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/c1-home.png', full_page=True)
        print('coach', (await pg.inner_text('.coach')).replace('\n', ' | ')[:500])
        print('home sections', await pg.evaluate("() => homeLayout().filter(c => c.on).map(c => c.k).join(',')"))
        # customize: enable records, move diet up
        await pg.click('[data-a="homeEdit"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="homeToggle"][data-i="10"]'); await pg.wait_for_timeout(150)
        await pg.click('[data-a="homeMove"][data-i="5"][data-d="-1"]'); await pg.wait_for_timeout(150)
        print('after edit', await pg.evaluate("() => [homeLayout().filter(c => c.on).map(c => c.k).join(','), !!document.querySelector('.pr-scroll'), S.profile.home.length]"))
        await pg.click('[data-a="homeReset"]'); await pg.wait_for_timeout(150); await pg.evaluate("() => { UI.layers = []; render(); }")
        print('load', await pg.evaluate("() => { const l = loadRatio(); return l && [Math.round(l.acute), Math.round(l.chronic), l.ratio.toFixed(2)] }"))
        # rir progression + fixed
        print('prog', await pg.evaluate("""() => { const r = S.routines[0], e = r.ex[0]; const a = aexPreview(e);
          a.prog = 'fixed'; const f = suggestion(a).text; a.prog = 'rir'; const s = suggestion(a).text; return [f, s] }"""))
        # start routine -> light offer (demo recovery?)
        print('red?', await pg.evaluate("() => coachRed()"))
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="startRoutine"] >> nth=0'); await pg.wait_for_timeout(500)
        offer = await pg.locator('.light-card.offer').count()
        n0 = await pg.evaluate("() => S.active.ex.map(e => e.sets.length).join(',')")
        if offer:
            await pg.click('[data-a="goLight"]'); await pg.wait_for_timeout(200)
        print('light', offer, n0, '->', await pg.evaluate("() => [S.active.ex.map(e => e.sets.length).join(','), !!S.active.light]"))
        # vs last
        await pg.fill('input[data-ei="0"][data-si="0"][data-f="kg"]', '200'); await pg.fill('input[data-ei="0"][data-si="0"][data-f="r"]', '5')
        await pg.click('[data-a="toggleSet"][data-ei="0"][data-si="0"]'); await pg.wait_for_timeout(300)
        print('vslast', await pg.inner_text('.vs-last'))
        await pg.screenshot(path='shots/c2-workout.png')
        await pg.click('[data-a="finishWorkout"]'); await pg.wait_for_timeout(300)
        if await pg.locator('[data-a="confirmOk"]').count(): await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(400)
        print('finish layers', await pg.evaluate("() => UI.layers.map(l => l.type)"))
        await pg.evaluate("() => { UI.layers = []; render(); }")
        # map on run detail
        await pg.click('[data-a="tab"][data-k="progress"]'); await pg.wait_for_timeout(300)
        print('loadCard', await pg.locator('.ld-bars').count())
        rid = await pg.evaluate("() => runs().find(r => r.route).id")
        await pg.evaluate(f"() => pushLayer({{ type: 'runView', id: '{rid}' }})"); await pg.wait_for_timeout(2500)
        print('map', await pg.evaluate("() => [!!document.querySelector('.route-card .leaflet-container'), document.querySelector('.route-card').classList.contains('has-map'), document.querySelectorAll('.km-ic').length]"), 'tiles', tiles[:5], len(tiles))
        await pg.screenshot(path='shots/c3-map.png')
        await pg.evaluate("() => { UI.layers = []; render(); }")
        # live map
        await pg.evaluate("() => startRun({ type: 'free' })"); await pg.wait_for_timeout(4500)
        await pg.evaluate("""() => { const a = S.runActive, now = Date.now(); a.start = now - 300e3; a.pts = []; a.m = 0;
          for (let i = 0; i <= 60; i++) runPos({ coords: { latitude: 45.4642 + i * 12 / 111320, longitude: 9.19 + i * 5 / 78000, accuracy: 6 }, timestamp: now - 300e3 + 2000 + i * 4500 }); renderLayers(); }""")
        await pg.wait_for_timeout(2000)
        print('live', await pg.evaluate("() => [!!MAP.live, MAP.n, !!document.querySelector('.route-card.live .leaflet-container')]"))
        await pg.screenshot(path='shots/c4-live.png')
        await pg.click('[data-a="runViewMode"][data-v="data"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="runViewMode"][data-v="map"]'); await pg.wait_for_timeout(500)
        print('live after toggle', await pg.evaluate("() => [!!MAP.live, !!document.querySelector('.route-card.live .leaflet-container')]"))
        print('hoverflow', await pg.evaluate("() => document.documentElement.scrollWidth > innerWidth"), 'ERR', errs)
        await b.close()
asyncio.run(main())
