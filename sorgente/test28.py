from testlib import setup_fake
import asyncio, json, re, sys
from playwright.async_api import async_playwright
LANG = sys.argv[1] if len(sys.argv) > 1 else 'en'
IT = re.compile(r"\b(di|il|per|della|delle|degli|con|una|sono|questo|questa|allenamento|allenamenti|oggi|ieri|serie|scheda|schede|esercizi|esercizio|peso|settimana|giorni|recupero|aggiungi|nessun|nessuna|anche|quando|dopo|prima|tocca|ancora|tuo|tua|tuoi|cibi|pasto|pasti|grassi|proteine|carboidrati|obiettivo|media|ultima|ultimo|fatto|fatte|vuoi|puoi|qui|più)\b", re.I)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.click(f'[data-a="setLang"][data-v="{LANG}"]'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f'shots/l-{LANG}-onb.png')
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(400)
        left = {}
        async def grab(name):
            await pg.wait_for_timeout(250)
            txt = await pg.evaluate("[...document.querySelectorAll('#app, #layers')].map(e=>e.innerText).join('\\n')")
            for line in txt.split('\n'):
                line=line.strip()
                if line and IT.search(line): left.setdefault(line, name)
            await pg.screenshot(path=f'shots/l-{LANG}-{name}.png')
        await grab('home')
        for t in ['train','diet','progress','me']:
            await pg.click(f'[data-a="tab"][data-k="{t}"]'); await grab(t)
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        rid = await pg.evaluate("S.routines.find(r=>r.name==='Push').id")
        await pg.click(f'[data-a="startRoutine"][data-id="{rid}"]'); await grab('workout')
        await pg.click('[data-a="suggestSimilar"][data-ei="0"]'); await grab('similar')
        await pg.evaluate("UI.layers=[]; render(); pushLayer({type:'food', m:'b', q:'', tab:'all'})"); await grab('food')
        await pg.click('#fd-list [data-a="foodPick"] >> nth=0'); await grab('amount')
        await pg.evaluate("UI.layers=[]; render(); A.shopOpen && A.shopOpen()"); await grab('shop')
        await pg.evaluate("UI.layers=[]; render(); pushLayer({type:'exercise', id:'Incline_Dumbbell_Press'})"); await grab('exdetail')
        print('dates', await pg.evaluate("[fmtDateLong(Date.now()), relDay(Date.now()-2*864e5), fmtN(1234.5)]"))
        print('exercise name', await pg.evaluate("ex('Incline_Dumbbell_Press').n"), '| food', await pg.evaluate("food('b_pollo_cotto').n"))
        print('LEFTOVER', len(left))
        for k,v in list(left.items())[:80]: print(' ', v, '|', k[:150])
        print('errors', errs)
asyncio.run(main())
