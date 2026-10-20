import json
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
async def setup_fake(ctx):
    """logged-in fake Supabase (no network) so the login gate lets the app open"""
    await ctx.add_init_script("Object.defineProperty(navigator, 'language', { get: () => 'it-IT' });")
    async def srv(op, payload):
        if op == 'select': return '[]'
        if op == 'tok_get': return '[]'
        return 'ok'
    await ctx.expose_function('__srv', srv)
    await ctx.route('**/supabase.min.js', lambda r: r.fulfill(status=200, content_type='application/javascript', body=FAKE))
    await ctx.add_init_script("localStorage.setItem('fakeuser', JSON.stringify({id:'u1', email:'test@forgia.it'})); localStorage.setItem('forgia.auth', '1');")
