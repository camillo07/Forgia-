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
        # similarity quality
        for id in ['Incline_Dumbbell_Press','Leverage_Chest_Press','x_cable_fly_low_high','x_cable_lateral_raise','Cable_Rope_Overhead_Triceps_Extension','x_bayesian_curl','Wide-Grip_Lat_Pulldown','x_chest_supported_row','Hack_Squat','Cable_Crunch','Seated_Leg_Curl']:
            r = await pg.evaluate(f"similarExercises('{id}').map(r=>r.x.n+' ['+r.s.toFixed(1)+']')")
            print(id, '->', r[:6])
        print('img bayesian', await pg.evaluate("exImg(ex('x_bayesian_curl'))"))
        # workout: consiglia simile button
        await pg.click('[data-a="tab"][data-k="train"]'); await pg.wait_for_timeout(200)
        rid = await pg.evaluate("S.routines.find(r=>r.name==='Push').id")
        await pg.click(f'[data-a="startRoutine"][data-id="{rid}"]'); await pg.wait_for_timeout(300)
        first = await pg.evaluate("ex(S.active.ex[0].id).n")
        await pg.click('[data-a="suggestSimilar"][data-ei="0"]'); await pg.wait_for_timeout(250)
        head = await pg.inner_text('.sim-head'); rows = await pg.evaluate("[...document.querySelectorAll('#pk-list [data-a=pickEx]')].slice(0,4).map(b=>b.innerText.replace(/\\n/g,' | '))")
        print('first', first, '| head', head, rows)
        await pg.screenshot(path='shots/v48-similar.png')
        # star the first suggestion, then check favourites chip
        fid = await pg.evaluate("document.querySelector('#pk-list .fav-btn').dataset.id")
        await pg.click('#pk-list .fav-btn >> nth=0'); await pg.wait_for_timeout(150)
        print('fav ex', await pg.evaluate("S.favEx"))
        await pg.click('[data-a="pickGroup"][data-g="fav"]'); await pg.wait_for_timeout(150)
        print('fav list', await pg.evaluate("[...document.querySelectorAll('#pk-list [data-a=pickEx]')].map(b=>b.dataset.id)"))
        await pg.click('[data-a="pickGroup"][data-g="similar"]'); await pg.wait_for_timeout(150)
        await pg.click('#pk-list [data-a="pickEx"] >> nth=0'); await pg.wait_for_timeout(200)
        print('replaced ->', await pg.evaluate("ex(S.active.ex[0].id).n"))
        await pg.click('.toast [data-a="undo"]'); await pg.wait_for_timeout(150)
        print('undo ->', await pg.evaluate("ex(S.active.ex[0].id).n")); assert await pg.evaluate("S.active.ex[0].id") == 'Barbell_Bench_Press_-_Medium_Grip'
        await pg.click('[data-a="suggestSimilar"][data-ei="0"]'); await pg.wait_for_timeout(250)
        print('reason rows', await pg.evaluate("[...document.querySelectorAll('#pk-list .s')].slice(0,3).map(e=>e.innerText)"))
        print("reason incl", await pg.evaluate("similarExercises('Incline_Dumbbell_Press').slice(0,4).map(r=>r.x.n+': '+simReason(r))"))
        await pg.click('#pk-list [data-a="pickEx"] >> nth=0'); await pg.wait_for_timeout(200)
        await pg.screenshot(path='shots/v48-workout.png')
        # exercise detail: star + similar section
        await pg.evaluate("pushLayer({type:'exercise', id:'x_bayesian_curl'})"); await pg.wait_for_timeout(200)
        print('detail similar', await pg.evaluate("[...document.querySelectorAll('.layer:last-child [data-a=openEx] .t')].map(e=>e.innerText)"), 'img', await pg.evaluate("!!document.querySelector('.layer:last-child .thumb.lg img')"))
        await pg.screenshot(path='shots/v48-detail.png')
        await pg.evaluate("UI.layers=[]; render()")
        await pg.evaluate("discardWorkout && S.active && discardWorkout()")
        # routine editor replace
        await pg.evaluate(f"pushLayer({{type:'routine', draft: JSON.parse(JSON.stringify(S.routines.find(r=>r.id==='{rid}')))}})"); await pg.wait_for_timeout(200)
        await pg.click('.layer:last-child [data-a="suggestSimilar"][data-t="routine"] >> nth=1'); await pg.wait_for_timeout(200)
        before = await pg.evaluate("UI.layers.find(l=>l.type==='routine').draft.ex[1].id")
        await pg.click('#pk-list [data-a="pickEx"] >> nth=0'); await pg.wait_for_timeout(200)
        print('routine', before, '->', await pg.evaluate("UI.layers.find(l=>l.type==='routine').draft.ex[1].id"), await pg.evaluate("topLayer().type"))
        await pg.evaluate("UI.layers=[]; render()")
        # foods: favourites
        await pg.click('[data-a="tab"][data-k="diet"]'); await pg.wait_for_timeout(200)
        await pg.evaluate("pushLayer({type:'food', m:'b', q:'', tab:'all'})"); await pg.wait_for_timeout(200)
        await pg.click('#fd-list .fav-btn >> nth=1'); await pg.wait_for_timeout(150)
        await pg.click('[data-a="foodTab"][data-t="fav"]'); await pg.wait_for_timeout(150)
        print('fav foods', await pg.evaluate("S.favFood"), await pg.evaluate("[...document.querySelectorAll('#fd-list [data-a=foodPick]')].map(b=>b.dataset.id)"))
        await pg.screenshot(path='shots/v48-foodfav.png')
        await pg.click('#fd-list [data-a="foodPick"] >> nth=0'); await pg.wait_for_timeout(200)
        await pg.evaluate("UI.layers.pop(); renderLayers(); topLayer().tab='all'; renderLayers()"); await pg.wait_for_timeout(150)
        print('fav on top', await pg.evaluate("document.querySelector('#fd-list .eyebrow')?.innerText"))
        await pg.click('#fd-list [data-a="foodPick"] >> nth=0'); await pg.wait_for_timeout(200)
        print('amount star on', await pg.evaluate("document.querySelector('.sheet .fav-btn').classList.contains('on')"))
        await pg.evaluate("UI.layers=[]; render()")
        # micro estimates for label-only products
        prods = [
          {'code':'1','product_name':'Yogurt greco 0% bianco','brands':'Fage','nutriments':{'energy-kcal_100g':54,'proteins_100g':10.3,'carbohydrates_100g':3,'fat_100g':0,'sugars_100g':3,'salt_100g':0.1},'categories_tags':['en:dairies','en:yogurts']},
          {'code':'2','product_name':'Petto di pollo a fette','brands':'Amadori','nutriments':{'energy-kcal_100g':100,'proteins_100g':23,'carbohydrates_100g':0,'fat_100g':1,'salt_100g':0.2},'categories_tags':['en:meats','en:poultries']},
          {'code':'3','product_name':'Fiocchi di avena integrali','brands':'Quaker','nutriments':{'energy-kcal_100g':372,'proteins_100g':13,'carbohydrates_100g':60,'fat_100g':7,'fiber_100g':9,'salt_100g':0}},
          {'code':'4','product_name':'Barretta proteica gusto cioccolato','brands':'Myprotein','nutriments':{'energy-kcal_100g':360,'proteins_100g':33,'carbohydrates_100g':30,'fat_100g':12,'salt_100g':0.5}},
          {'code':'5','product_name':'Spaghetti n.5','brands':'Barilla','nutriments':{'energy-kcal_100g':359,'proteins_100g':12.5,'carbohydrates_100g':71,'fat_100g':2,'salt_100g':0}, 'categories_tags':['en:pastas']},
          {'code':'6','product_name':'Tonno all\'olio di oliva','brands':'Rio Mare','nutriments':{'energy-kcal_100g':192,'proteins_100g':25,'carbohydrates_100g':0,'fat_100g':10,'salt_100g':1}, 'categories_tags':['en:fishes']},
          {'code':'7','product_name':'Skyr naturale','brands':'Milbona','nutriments':{'energy-kcal_100g':63,'proteins_100g':11,'carbohydrates_100g':4,'fat_100g':0.2,'salt_100g':0.1}},
          {'code':'8','product_name':'Gocciole','brands':'Pavesi','nutriments':{'energy-kcal_100g':477,'proteins_100g':7.6,'carbohydrates_100g':67,'fat_100g':19,'salt_100g':0.5}, 'categories_tags':['en:biscuits']},
        ]
        r = await pg.evaluate("ps => ps.map(p => { const f = offToFood(p); microFill(f); return [f.n, f.est && (f.est.n || 'nessuna'), f.est && f.est.how, f.est && (f.est.k||[]).length, f.per.ca, f.per.vitd] })", prods)
        for x in r: print('est', x)
        print('base estimated', await pg.evaluate("[...BASE_FOODS.values()].filter(f=>f.est&&!f.est.none).map(f=>f.n+' <- '+f.est.n).slice(0,40)"))
        print('base not matched', await pg.evaluate("[...BASE_FOODS.values()].filter(f=>f.est&&f.est.none).map(f=>f.n)"))
        # amount sheet shows estimate note
        await pg.evaluate("ps => { const f = offToFood(ps[0]); OFF_TEMP.set(f.id, f); openAmount(f, {m:'b'}); }", prods)
        await pg.click('[data-a="amMicro"]'); await pg.wait_for_timeout(150)
        print('note', await pg.evaluate("document.querySelector('.est-note')?.innerText"), 'italic rows', await pg.evaluate("document.querySelectorAll('.mrow.est').length"))
        await pg.screenshot(path='shots/v48-est.png')
        await pg.click('[data-a="estOff"]'); await pg.wait_for_timeout(150)
        print('after off', await pg.evaluate("document.querySelectorAll('.mrow.est').length"), await pg.evaluate("topLayer().food.noEst"))
        print('errors', errs); assert not errs
asyncio.run(main())
