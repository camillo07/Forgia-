import asyncio, json
from playwright.async_api import async_playwright
from testlib import setup_fake
AI = {"voto": 7, "sintesi": "Settimana buona sulla forza, dieta sotto le proteine.", "bene": ["4 allenamenti", "Panca in salita"], "azioni": [{"titolo": "Proteine", "dettaglio": "+30 g al giorno: yogurt greco a colazione"}, {"titolo": "Sonno", "dettaglio": "A letto entro le 23:30, obiettivo 7,5 h"}, {"titolo": "Passi", "dettaglio": "8.000 al giorno anche nei giorni di riposo"}], "attenzione": "Carico in aumento: niente serie extra"}
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        sent = []
        async def ai(route):
            sent.append(json.loads(route.request.post_data)); await route.fulfill(status=200, content_type='application/json', body=json.dumps({"content": [{"type": "text", "text": json.dumps(AI)}]}))
        await ctx.route('https://api.anthropic.com/**', ai)
        pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo')
        await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(800)
        await pg.evaluate("() => { S.nutri = S.nutri || defaultNutri(); S.ai.key = 'sk-test'; save(); render(); }")
        await pg.click('[data-a="tab"][data-k="diet"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="shopOpen"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="shopMake"][data-d="7"]'); await pg.wait_for_timeout(300)
        print('shop', await pg.evaluate("() => S.shop && [S.shop.base, S.shop.items.length, S.shop.items.slice(0,6).map(x => [x.n, x.g, x.pcs, x.note, x.cat])]"))
        await pg.click('.shop-it >> nth=0'); await pg.wait_for_timeout(150)
        await pg.fill('#shop-new', 'Detersivo'); await pg.press('#shop-new', 'Enter'); await pg.wait_for_timeout(200)
        print('tick/extra', await pg.evaluate("() => [S.shop.items[0].done, S.shop.extra.map(x => x.n)]"))
        await pg.screenshot(path='shots/s1-shop.png', full_page=True)
        print('text', (await pg.evaluate("() => shopText()"))[:300].replace('\n', ' / '))
        await pg.click('[data-a="shopClear"]'); await pg.wait_for_timeout(150)
        print('after clear', await pg.evaluate("() => S.shop.items.length"))
        await pg.evaluate("() => { UI.layers = []; UI.tab = 'home'; render(); }"); await pg.wait_for_timeout(200)
        await pg.click('.coach [data-a="aiWeekOpen"]'); await pg.wait_for_timeout(300)
        await pg.click('[data-a="aiWeekRun"]'); await pg.wait_for_timeout(800)
        print('ai saved', await pg.evaluate("() => [S.profile.aiWeek.length, S.profile.aiWeek[0].r.voto]"), 'prompt has', [k for k in ['PALESTRA', 'DIETA', 'PESO', 'RECUPERO', 'Serie per muscolo'] if k in sent[0]['messages'][0]['content']])
        await pg.screenshot(path='shots/s2-ai.png', full_page=True)
        print(sent[0]['messages'][0]['content'][-900:])
        print('hoverflow', await pg.evaluate("() => document.documentElement.scrollWidth > innerWidth"), 'ERR', errs)
        await b.close()
asyncio.run(main())
