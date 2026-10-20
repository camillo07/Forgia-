from testlib import setup_fake
import asyncio, json
from playwright.async_api import async_playwright
SSE = ''.join('event: content_block_delta\ndata: ' + json.dumps({'type':'content_block_delta','index':0,'delta':{'type':'text_delta','text':t}}) + '\n\n' for t in ['Questa settimana ', 'hai fatto **4 allenamenti**.\n', '- Petto: 14 serie\n', '- Dorsali: 12 serie\n', 'Continua così.'])
SSE = 'event: message_start\ndata: {"type":"message_start"}\n\n' + SSE + 'event: message_stop\ndata: {"type":"message_stop"}\n\n'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        seen = []
        async def api(route):
            body = json.loads(route.request.post_data); seen.append(body)
            if body['messages'][-1]['content'].startswith('ERRORE'):
                await route.fulfill(status=401, content_type='application/json', body='{"error":{"message":"bad"}}'); return
            await route.fulfill(status=200, headers={'content-type':'text/event-stream','access-control-allow-origin':'*'}, body=SSE)
        await ctx.route('https://api.anthropic.com/**', api)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(300)
        # no key: chat shows key card
        await pg.click('.coach [data-a="chatOpen"]'); await pg.wait_for_timeout(300)
        print('nokey card', await pg.evaluate("document.querySelector('.layer.chat').innerText.includes('chiave API')"))
        await pg.screenshot(path='shots/chat-0.png')
        await pg.evaluate("S.ai.key='sk-ant-test'; renderLayers()"); await pg.wait_for_timeout(100)
        await pg.click('[data-a="chatAsk"]'); await pg.wait_for_timeout(800)
        print('msgs', await pg.evaluate("S.ai.chat.map(m=>m.role+': '+m.text.slice(0,60))"))
        print('sys has data', len(seen[0]['system']), 'SCHEDE' in seen[0]['system'], 'ULTIMI ALLENAMENTI' in seen[0]['system'], seen[0]['stream'])
        print(seen[0]['system'][:1500])
        await pg.fill('#chat-in', 'E per la dieta?'); await pg.click('[data-a="chatGo"]'); await pg.wait_for_timeout(800)
        print('turns sent', [m['role'] for m in seen[1]['messages']])
        await pg.screenshot(path='shots/chat-1.png')
        await pg.fill('#chat-in', 'ERRORE prova'); await pg.click('[data-a="chatGo"]'); await pg.wait_for_timeout(600)
        print('err', await pg.evaluate("S.ai.chat.at(-1)"))
        await pg.screenshot(path='shots/chat-2.png')
        # persistence + export excludes chat
        await pg.evaluate("save()"); await pg.wait_for_timeout(300); await pg.reload(); await pg.wait_for_timeout(600)
        print('persist', await pg.evaluate("S.ai.chat.length"))
        # exercise sheet button prefill
        await pg.evaluate("pushLayer({type:'exercise', id:'Pullups'})"); await pg.wait_for_timeout(200)
        await pg.click('.layer [data-a="chatOpen"]'); await pg.wait_for_timeout(400)
        print('prefill', await pg.evaluate("document.querySelector('#chat-in').value"))
        # clear
        await pg.click('[data-a="chatClear"]'); await pg.wait_for_timeout(200); await pg.click('[data-a="confirmOk"]'); await pg.wait_for_timeout(200)
        print('cleared', await pg.evaluate("[S.ai.chat.length, topLayer().type]"))
        # spanish
        await pg.evaluate("S.profile.lang='es'; applyLang(); UI.layers=[]; render(); pushLayer({type:'chat'})"); await pg.wait_for_timeout(400)
        await pg.screenshot(path='shots/chat-es.png')
        print('es', await pg.evaluate("document.querySelector('.layer.chat').innerText.slice(0,300)"))
        print('errors', errs)
        await b.close()
asyncio.run(main())
