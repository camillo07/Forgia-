import asyncio, json, time
from playwright.async_api import async_playwright
SERVER = {}  # (kind,id) -> row
T = [0]
def now():
    T[0] += 1; return '2026-10-06T10:00:%06d' % T[0]
FAKE = r"""
window.supabase = { createClient(url, key, opts) {
  let cb = null, user = JSON.parse(localStorage.getItem('fakeuser') || 'null');
  const auth = {
    onAuthStateChange(f) { cb = f; },
    async getSession() { return { data: { session: user ? { user } : null } }; },
    async signInWithPassword({ email }) { user = { id: 'u1', email }; localStorage.setItem('fakeuser', JSON.stringify(user)); cb && cb('SIGNED_IN', { user }); return { error: null }; },
    async signUp({ email }) { return this.signInWithPassword({ email }).then(() => ({ data: { session: { user } }, error: null })); },
    async signOut() { user = null; localStorage.removeItem('fakeuser'); cb && cb('SIGNED_OUT', null); return {}; },
  };
  function from() {
    return {
      async upsert(rows) { await window.__srv('upsert', JSON.stringify(rows)); return { error: null }; },
      select() { const q = { since: null, a: 0, b: 999,
        order() { return q; }, range(a, b) { q.a = a; q.b = b; return q; }, gte(c, v) { q.since = v; return q; },
        then(res, rej) { return window.__srv('select', JSON.stringify({ since: q.since, a: q.a, b: q.b })).then(t => res({ data: JSON.parse(t), error: null }), rej); } };
        return q; },
    };
  }
  return { auth, from };
} };
"""
async def srv(op, payload):
    p = json.loads(payload)
    if op == 'upsert':
        for r in p:
            r = dict(r); r['updated_at'] = now(); SERVER[(r['kind'], r['id'])] = r
        return 'ok'
    rows = sorted(SERVER.values(), key=lambda r: r['updated_at'])
    if p['since']: rows = [r for r in rows if r['updated_at'] >= p['since']]
    return json.dumps(rows[p['a']:p['b']+1])
async def device(b, name):
    ctx = await b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
    await ctx.expose_function('__srv', srv)
    await ctx.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=FAKE))
    pg = await ctx.new_page(); errs=[]
    pg.on('pageerror', lambda e: errs.append(name+': '+str(e)))
    await pg.goto('http://localhost:8765/index.html'); await pg.wait_for_timeout(600)
    return pg, errs
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # device A: has data, creates account
        A, ea = await device(b, 'A')
        await A.fill('#acc-email','m@test.it'); await A.fill('#acc-pw','password123'); await A.click('[data-a="login"]'); await A.wait_for_timeout(1500)
        await A.wait_for_timeout(300)
        await A.fill('#ob-name','Mattia'); await A.click('input[value="ppl"]')
        await A.click('[data-a="finishOnboard"]'); await A.wait_for_timeout(200)
        await A.evaluate("() => { S.nutri = defaultNutri(); addEntry(todayKey(), {fid:'b_banana', g:120, m:'b'}); S.workouts.push({id:'wA1',name:'Push',start:Date.now()-3600e3,end:Date.now(),ex:[{id:'Pullups',mt:'bw',sets:[{t:'n',kg:0,r:10}]}]}); save(); }")
        await A.evaluate('syncNow()'); await A.wait_for_timeout(1200)
        print('server after A login:', sorted(k for k in SERVER))
        await A.screenshot(path='shots/k1-account.png', full_page=True)
        # device B: fresh, logs in from onboarding
        B, eb = await device(b, 'B')
        await B.fill('#acc-email','m@test.it'); await B.fill('#acc-pw','password123'); await B.click('[data-a="login"]'); await B.wait_for_timeout(1500)
        st = await B.evaluate("[S.profile.onboarded, S.profile.name, S.routines.map(r=>r.name), S.workouts.map(w=>w.id), dayEntries(todayKey()).map(e=>e.fid), !!S.nutri]")
        print('B after login:', st)
        # B adds a diary entry and deletes the workout
        await B.evaluate("() => { addEntry(todayKey(), {fid:'b_mela', g:180, m:'s'}); S.workouts = S.workouts.filter(w=>w.id!=='wA1'); save(); }")
        await B.wait_for_timeout(200); await B.evaluate("syncNow()"); await B.wait_for_timeout(800)
        await A.evaluate("syncNow()"); await A.wait_for_timeout(800)
        st = await A.evaluate("[S.workouts.map(w=>w.id), dayEntries(todayKey()).map(e=>e.fid)]")
        print('A after B changes:', st)
        print('server w|wA1 deleted:', SERVER.get(('w','wA1'),{}).get('deleted'))
        print('ERR', ea + eb)
        await b.close()
asyncio.run(main())
