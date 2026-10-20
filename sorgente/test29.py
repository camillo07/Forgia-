from testlib import setup_fake
import asyncio, re, sys
from playwright.async_api import async_playwright
LANG = sys.argv[1] if len(sys.argv) > 1 else 'es'
IT = re.compile(r"\b(di|il|della|delle|degli|dei|per|allenamenti?|oggi|giorni|settimana|scheda|schede|esercizi|esercizio|recupero|aggiungi|nessun[ao]?|anche|quando|dopo|tocca|ancora|tuo|tua|tuoi|cibi|pasto|pasti|grassi|proteine|carboidrati|obiettivo|ultim[ao]|fatt[oie]|vuoi|puoi|qui|più|sotto|glutei|femorali|petto|schiena|spalle|bicipiti|tricipiti|addome|polpacci|seduta|sedute|chilometri|corsa|peso di)\b", re.I)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.click(f'[data-a="setLang"][data-v="{LANG}"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(400)
        left = {}
        async def grab(name):
            await pg.wait_for_timeout(250)
            txt = await pg.evaluate("[...document.querySelectorAll('#app, #layers')].map(e=>e.innerText).join('\\n')")
            for line in txt.split('\n'):
                line=line.strip()
                if line and IT.search(line): left.setdefault(line, name)
        # wizard result
        await pg.evaluate("""() => { const a = wzDefault(); a.weak = ['h','b']; a.strength = a.strength || []; a.days = 5; A.wizardOpen(); const l = topLayer(); l.a = Object.assign(l.a, a); l.step = 5; l.res = null; renderLayers(); }""")
        await grab('wizard')
        await pg.screenshot(path=f'shots/w-{LANG}.png', full_page=False)
        layers = ["{type:'nutri'}", "{type:'dietStats'}", "{type:'records'}", "{type:'methods'}", "{type:'health'}", "{type:'import'}", "{type:'body'}", "{type:'runPlan'}", "{type:'aiWeek'}", "{type:'shop'}", "{type:'homeEdit'}"]
        for L in layers:
            ok = await pg.evaluate(f"() => {{ try {{ UI.layers=[]; render(); const l={L}; if (!LAYER_RENDER[l.type]) return false; pushLayer(l); return true; }} catch(e) {{ return 'ERR '+e.message; }} }}")
            if ok is True: await grab(L)
        for t in ['home','train','diet','progress','me']:
            await pg.evaluate(f"UI.layers=[]; UI.tab='{t}'; render()"); await grab(t)
        print('LEFTOVER', len(left))
        for k,v in left.items(): print(' ', v, '|', k[:170])
        print('errors', errs[:3])
asyncio.run(main())
