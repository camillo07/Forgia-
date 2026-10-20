import asyncio, json
from playwright.async_api import async_playwright
from testlib import setup_fake
GPX = """<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"><trk><name>Giro parco</name><trkseg>""" + "".join(
  f'<trkpt lat="{45.46+i*0.000027:.6f}" lon="9.19"><ele>{120+i//300}</ele><time>2026-10-01T07:{i//60:02d}:{i%60:02d}Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>{140+i%5}</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>' for i in range(0, 2400, 3)) + "</trkseg></trk></gpx>"
async def touch(cdp, kind, pts): await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y} for x, y in pts]})
async def swipe(pg, cdp, x0, y0, x1, y1, n=10):
    await touch(cdp, 'touchStart', [(x0, y0)])
    for k in range(1, n + 1): await touch(cdp, 'touchMove', [(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n)]); await pg.wait_for_timeout(16)
    await touch(cdp, 'touchEnd', [])
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True, permissions=['geolocation'], geolocation={'latitude': 45.4642, 'longitude': 9.19, 'accuracy': 8})
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="trainSeg"][data-v="run"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/r1-run.png', full_page=True)
        info = await pg.evaluate("() => ({ n: S.runs.length, vd: runVdot()?.v, pred5: fmtClock(predictSec(runVdot().v, 5)*1000), T: paceLabel('T'), E: paceLabel('E'), best5: bestEffort(5)?.sec })")
        print('demo', info)
        # Daniels check: VDOT 50 -> 5K ~19:57, T pace ~4:15
        print('daniels', await pg.evaluate("() => [fmtClock(predictSec(50,5)*1000), fmtClock(predictSec(50,42.195)*1000), paceTxt(paceAt(50,.88)), vdotOf(5, 1197).toFixed(1)]"))
        # manual entry
        await pg.click('[data-a="runManual"]'); await pg.wait_for_timeout(300)
        await pg.fill('#re-km', '5,2'); await pg.fill('[data-in="reDur"][data-f="m"]', '27'); await pg.fill('[data-in="reDur"][data-f="s"]', '30')
        await pg.click('[data-a="reRpe"][data-v="6"]'); print('pace line', await pg.inner_text('#re-pace'))
        await pg.click('[data-a="runSave"]'); await pg.wait_for_timeout(300)
        print('after manual', await pg.evaluate("() => { const r = S.runs[S.runs.length-1]; return [S.runs.length, r.km, r.sec, r.rpe, r.type] }"))
        # GPS run
        await pg.click('[data-a="runStartSheet"]'); await pg.wait_for_timeout(250)
        await pg.click('.sheet .opt >> nth=0'); await pg.wait_for_timeout(1500)
        print('cd shown', await pg.locator('#rn-cd').count())
        await pg.wait_for_timeout(2600)
        st = await pg.evaluate("() => ({ gpsAt: !!S.runActive.gpsAt, acc: S.runActive.acc, go: S.runActive.go, gps: document.querySelector('#rn-gps')?.textContent })")
        print('gps live', st)
        # simulate 1.8 km at ~5:00/km fed via runPos
        await pg.evaluate("""() => { const a = S.runActive, now = Date.now(); a.start = now - 600e3; a.pts = []; a.m = 0; a.splits = []; a.splitAt = 0;
          for (let i = 0; i <= 120; i++) runPos({ coords: { latitude: 45.4642 + i * 15 / 111320, longitude: 9.19, accuracy: 6 }, timestamp: now - 600e3 + 2000 + i * 4500 });
          runPos({ coords: { latitude: 46, longitude: 9.19, accuracy: 6 }, timestamp: now });   // jump: rejected
          runPos({ coords: { latitude: 45.47, longitude: 9.19, accuracy: 80 }, timestamp: now }); }""")
        await pg.evaluate("() => renderLayers()"); await pg.wait_for_timeout(1100)
        print('tracked', await pg.evaluate("() => [Math.round(S.runActive.m), S.runActive.splits, document.querySelector('#rn-km').textContent, document.querySelector('#rn-avg').textContent, document.querySelector('#rn-cur').textContent]"))
        await pg.screenshot(path='shots/r2-live.png')
        await pg.click('[data-a="runLock"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/r3-lock.png')
        bx = await pg.locator('.rl-unlock').bounding_box()
        await pg.mouse.move(bx['x'] + 20, bx['y'] + 10); await pg.mouse.down(); await pg.wait_for_timeout(300); await pg.mouse.up(); await pg.wait_for_timeout(100)
        print('still locked after short press', await pg.locator('.runlock').count())
        await pg.mouse.down(); await pg.wait_for_timeout(1100); await pg.mouse.up(); await pg.wait_for_timeout(200)
        print('unlocked', await pg.locator('.runlock').count() == 0)
        await pg.click('[data-a="runPause"]'); await pg.wait_for_timeout(200)
        print('paused', await pg.evaluate("() => !!S.runActive.pauseAt"))
        await pg.click('[data-a="runPause"]'); await pg.wait_for_timeout(200)
        await pg.click('[data-a="runFinish"]'); await pg.wait_for_timeout(250)
        await pg.click('.sheet .opt >> nth=0'); await pg.wait_for_timeout(500)
        await pg.screenshot(path='shots/r4-summary.png')
        print('saved', await pg.evaluate("() => { const r = S.runs.find(x => x.src === 'gps' && !x.demo); return r && [r.km, r.splits.length, r.route.length, S.runActive] }"))
        await pg.click('[data-a="reType"][data-v="tempo"]'); await pg.click('[data-a="runSave"]'); await pg.wait_for_timeout(300)
        print('type updated', await pg.evaluate("() => S.runs.find(x => x.src === 'gps' && !x.demo).type"))
        # view detail
        rid = await pg.evaluate("() => S.runs.find(x => x.src === 'gps' && !x.demo).id")
        await pg.click(f'[data-a="runView"][data-id="{rid}"] >> nth=0'); await pg.wait_for_timeout(400)
        await pg.screenshot(path='shots/r5-detail.png', full_page=True)
        # edge swipe back from detail
        cdp = await ctx.new_cdp_session(pg)
        await swipe(pg, cdp, 8, 400, 300, 405); await pg.wait_for_timeout(500)
        print('edge back', await pg.evaluate("() => UI.layers.length"))
        # intervals without GPS (short steps)
        await pg.evaluate("() => startRun({ type: 'int', gps: false, sess: { n: 'Test', steps: [{ k: 'fast', s: 2, p: 'I' }, { k: 'rec', s: 2 }, { k: 'fast', s: 2, p: 'I' }] } })")
        await pg.wait_for_timeout(4200); await pg.screenshot(path='shots/r6-int.png')
        print('step at', await pg.evaluate("() => [S.runActive.si, document.querySelector('.step-card b')?.textContent]"))
        await pg.wait_for_timeout(4200)
        print('steps done', await pg.evaluate("() => S.runActive.si"))
        await pg.evaluate("() => { S.runActive.start -= 600e3; }"); await pg.wait_for_timeout(1100)
        await pg.click('[data-a="runFinish"]'); await pg.wait_for_timeout(250); await pg.click('.sheet .opt >> nth=0'); await pg.wait_for_timeout(400)
        print('treadmill editor', await pg.evaluate("() => [topLayer().type, topLayer().isNew, topLayer().draft.km]"))
        await pg.fill('#re-km', '2'); await pg.click('[data-a="runSave"]'); await pg.wait_for_timeout(300)
        print('runs', await pg.evaluate("() => S.runs.filter(r => !r.demo).map(r => [r.type, r.km, r.src])"))
        # plan
        await pg.click('[data-a="runPlanStart"][data-k="10k"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(300)
        await pg.screenshot(path='shots/r7-plan.png', full_page=True)
        await pg.click('[data-a="runPlanGo"] >> nth=0'); await pg.wait_for_timeout(200); await pg.click('.sheet .opt >> nth=1'); await pg.wait_for_timeout(300)
        await pg.evaluate("() => { S.runActive.start -= 1800e3; }"); await pg.wait_for_timeout(1100)
        await pg.click('[data-a="runFinish"]'); await pg.wait_for_timeout(250); await pg.click('.sheet .opt >> nth=0'); await pg.wait_for_timeout(300)
        await pg.fill('#re-km', '5'); await pg.click('[data-a="runSave"]'); await pg.wait_for_timeout(300)
        print('plan', await pg.evaluate("() => { const ps = planState(); return [ps.nDone, ps.next.s.n, Object.keys(S.runPlan.done)] }"))
        await pg.click('[data-a="runPlanOpen"]'); await pg.wait_for_timeout(300); await pg.screenshot(path='shots/r8-planfull.png', full_page=True)
        await pg.click('[data-a="pop"]'); await pg.wait_for_timeout(300)
        # GPX import
        async with pg.expect_file_chooser() as fc: await pg.click('[data-a="runGpx"]')
        f = await fc.value; await f.set_files(files=[{'name': 'giro.gpx', 'mimeType': 'application/gpx+xml', 'buffer': GPX.encode()}]); await pg.wait_for_timeout(500)
        print('gpx draft', await pg.evaluate("() => { const r = topLayer().draft; return [r.km, r.sec, r.splits.length, r.hr, r.elev, r.title, r.route.length] }"))
        await pg.click('[data-a="runSave"]'); await pg.wait_for_timeout(300)
        # sync items
        print('sync', await pg.evaluate("() => { const m = localItems(); return [[...m.keys()].filter(k => k.startsWith('u|')).length, !!m.get('s|main').runPlan] }"))
        print('strain today', await pg.evaluate("() => strain(todayKey())"))
        await pg.click('[data-a="tab"][data-k="home"]'); await pg.wait_for_timeout(300)
        print('home week', await pg.inner_text('.week'))
        await pg.screenshot(path='shots/r9-home.png', full_page=True)
        hov = await pg.evaluate("() => document.documentElement.scrollWidth > innerWidth")
        print('hoverflow', hov, 'ERR', errs)
        await b.close()
asyncio.run(main())
