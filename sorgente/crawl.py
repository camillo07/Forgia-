"""Crawl many screens in a language and dump untranslated strings (i18n/miss_<lang>.json)."""
from testlib import setup_fake
import asyncio, json, sys
from playwright.async_api import async_playwright
LANG = sys.argv[1] if len(sys.argv) > 1 else 'es'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        await setup_fake(ctx)
        await ctx.add_init_script("window.__trLog = new Set();")
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(500)
        await pg.click(f'[data-a="setLang"][data-v="{LANG}"]'); await pg.wait_for_timeout(200)
        await pg.fill('#ob-name','Mattia'); await pg.click('input[value="ppl"]'); await pg.check('#ob-demo'); await pg.click('[data-a="finishOnboard"]'); await pg.wait_for_timeout(400)
        async def show(js):
            try:
                await pg.evaluate("() => { " + js + " }"); await pg.wait_for_timeout(120)
            except Exception as e: errs.append(js[:60] + ' -> ' + str(e)[:120])
        for t in ['home','train','diet','progress','me']:
            await show(f"UI.layers=[]; UI.tab='{t}'; render();")
            for seg in ['progSeg','bodySeg']: pass
        await show("UI.layers=[]; UI.tab='train'; UI.trainSeg='run'; render();")
        await show("UI.layers=[]; UI.tab='progress'; UI.progSeg='body'; render();")
        await show("UI.layers=[]; UI.tab='progress'; UI.prog='body'; render();")
        w = "S.workouts[0]"
        layers = ["{type:'dietStats'}", "{type:'bodyHistory'}", "{type:'healthDetail'}", "{type:'runPlan'}", "{type:'myFoods'}", "{type:'shop'}", "{type:'aiWeek'}",
          "{type:'import', step:'src', mode:null}", "{type:'aiFood', m:'b', day: UI.dietDay, desc:''}", "{type:'quick', m:'b', day: UI.dietDay}",
          "{type:'history', id: S.workouts[0].id}", "{type:'nutri', draft: JSON.parse(JSON.stringify(S.nutri || defaultNutri()))}",
          "{type:'bodyLog', k: todayKey(), draft: bodyDraft(todayKey()), measOpen: true}", "{type:'run'}", "{type:'healthSetup'}",
          "{type:'foodEdit', isNew: true, food: { id: 'c_x', n: '', brand: '', src: 'custom', per: { kcal: '', p: '', c: '', f: '', fib: '', sug: '', sat: '', salt: '' }, serv: null }}",
          "{type:'recipe', isNew: true, draft: { id: 'r_x', n: '', portions: '1', cooked: '', ingr: [] }}", "{type:'picker', mode:'browse', q:'', g:'', eq:'', sel:[]}"]
        for L in layers: await show(f"UI.layers=[]; render(); pushLayer({L});")
        for k in ['w','bf','waist','sleep','steps','hrv','rhr','water']:
            await show(f"UI.layers=[]; render(); pushLayer({{type:'bodyMetric', k:'{k}'}});")
        await show("UI.layers=[]; render(); if (S.runs && S.runs[0]) pushLayer({type:'runView', id: S.runs[0].id});")
        ids = await pg.evaluate("(typeof METHODS!=='undefined'? METHODS : []).map(m=>m.id||m.k).filter(Boolean)")
        for m in ids: await show(f"UI.layers=[]; render(); pushLayer({{type:'method', id:'{m}'}});")
        for st in range(6): await show(f"UI.layers=[]; render(); A.wizardOpen(); topLayer().step={st}; topLayer().a.weak=['h','b']; renderLayers();")
        # workout + sheets + summary
        await show("UI.layers=[]; render(); startWorkout(S.routines[0]);")
        await show("A.exMenu({dataset:{ei:0}});")
        await show("UI.layers=[]; render(); pushLayer({type:'summary', wid: S.workouts[0].id, xp: 50, before: {xp:0,level:1}, after:{xp:50,level:1}, newBadges: []});")
        await show("UI.layers=[]; render(); pushLayer({type:'routine', draft: JSON.parse(JSON.stringify(S.routines[0]))});")
        await show("UI.layers=[]; render(); pushLayer({type:'exercise', id: S.routines[0].ex[0].id});")
        await show("UI.layers=[]; render(); if (typeof startPast==='function') startPast();")
        extra = ["UI.layers=[]; render(); A.routineMenu({dataset:{id:S.routines[0].id}});",
          "UI.layers=[]; render(); A.histMenu && A.histMenu({dataset:{id:S.workouts[0].id}});",
          "UI.layers=[]; render(); startWorkout(S.routines[0]); A.setMenu && A.setMenu({dataset:{ei:0, si:0}});",
          "UI.layers=[]; render(); startWorkout(S.routines[0]); A.finishWorkout && A.finishWorkout();",
          "UI.layers=[]; render(); pushLayer({type:'import', step:'paste', mode:'text'});",
          "UI.layers=[]; render(); pushLayer({type:'import', step:'src', mode:'ai'});",
          "UI.layers=[]; render(); A.resetAll && A.resetAll();",
          "UI.layers=[]; render(); toast('Allenamento salvato'); toast('Scheda salvata'); toast('Alimento salvato');",
          "UI.layers=[]; render(); A.runStart && A.runStart({dataset:{}});",
          "UI.layers=[]; UI.tab='diet'; render(); A.dietStats && A.dietStats();",
          "UI.layers=[]; UI.tab='me'; render(); A.openLibrary && A.openLibrary();", "UI.layers=[]; render(); A.anatOpen();", "anFocus('petto');", "A.anatRegion({dataset:{r:'petto_alto'}});", "UI.layers=[]; UI.tab='progress'; render();", "UI.layers=[]; render(); pushLayer({type:'exercise', id:'Barbell_Deadlift'});", "UI.layers=[]; render(); pushLayer({type:'exercise', id:'Cable_Rope_Overhead_Triceps_Extension'});", "UI.layers=[]; render(); pushLayer({type:'chat'});", "S.ai.chat=[{role:'user',text:'ciao'},{role:'assistant',text:'Chiave API non valida',err:true}]; renderLayers();", "S.ai.chat=[]; UI.layers=[]; UI.tab='home'; render();"]
        for js in extra: await show(js)
        for st in range(6): await show(f"UI.layers=[]; render(); A.wizardOpen(); const l=topLayer(); l.step={st}; l.a.mode='manual'; renderLayers();")
        miss = await pg.evaluate("[...window.__trLog]")
        json.dump(sorted(miss), open(f'i18n/miss_{LANG}.json','w'), ensure_ascii=False, indent=0)
        print('misses', len(miss)); print('errors', errs[:8])
asyncio.run(main())
