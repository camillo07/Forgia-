"""Corsa: buco di segnale GPS, tempo totale vs in movimento, dislivello dal GPS.

Riproduce il caso reale: 7 km a 5:15/km con 8 minuti di segnale perso durante il quinto
chilometro. Prima della correzione il tempo morto finiva tutto sul quinto parziale (13:09).
"""
import asyncio
from playwright.async_api import async_playwright
from testlib import setup_fake

# una corsa a 5:15/km con un rilevamento ogni 5 s -> 15,873 m per punto
SIM = """hole => {
  const a = S.runActive, now = Date.now();
  a.start = now - 4000e3;
  a.pts = []; a.m = 0; a.splits = []; a.splitAt = 0; a.pausedMs = 0; a.pauseAt = 0;
  a.lostMs = 0; a.fixAt = 0; a.gap = false; a.holes = 0;
  a.elev = 0; a.eSm = null; a.eRef = null;
  const LAT = 45.4642, DEG = 1 / 111320, STEP = 15.873;
  let met = 0, sec = 0, i = 0;
  const fix = alt => runPos({
    coords: { latitude: LAT + met * DEG, longitude: 9.19, accuracy: 6,
              altitude: alt == null ? null : alt, altitudeAccuracy: alt == null ? null : 5 },
    timestamp: a.start + sec * 1000,
  });
  const alt = () => /*QUOTA*/ 100;
  // primo tratto: fino a 4 km
  while (met < 4000) { met += STEP; sec += 5; i++; fix(alt()); }
  const kmAtHole = a.m, secAtHole = sec;
  // buco di segnale: nessun rilevamento per "hole" secondi. Lui corre, l'app non vede nulla
  // e quando il segnale torna si ritrova a 20 m da dove l'aveva perso (percorso ad anello).
  if (hole) { sec += hole; met += 20; i++; fix(alt()); }
  // ultimo tratto: fino a 7 km
  while (met < 7100 + (hole ? 20 : 0)) { met += STEP; sec += 5; i++; fix(alt()); }
  return { splits: a.splits.slice(), m: Math.round(a.m), kmAtHole: Math.round(kmAtHole),
           secAtHole: Math.round(secAtHole), elev: Math.round(a.elev || 0),
           lostMs: a.lostMs || 0, holes: a.holes || 0,
           moving: Math.round(runMoving(a)), elapsed: Math.round(runElapsed(a)) };
}"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True,
                                  permissions=['geolocation'],
                                  geolocation={'latitude': 45.4642, 'longitude': 9.19, 'accuracy': 8})
        await setup_fake(ctx)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/index.html')
        await pg.wait_for_timeout(700)
        await pg.fill('#ob-name', 'Mattia')
        await pg.click('input[value="ppl"]')
        await pg.click('[data-a="finishOnboard"]')
        await pg.wait_for_timeout(800)
        await pg.evaluate("() => startRun({ type: 'free' })")
        await pg.wait_for_timeout(300)
        await pg.evaluate("() => { UI.layers = []; render(); }")

        quota = lambda expr: SIM.replace('/*QUOTA*/ 100', expr)

        # --- 1. corsa pulita, senza buchi: tutti i parziali uguali ---
        clean = await pg.evaluate(SIM, 0)
        print('pulita  splits', [round(s) for s in clean['splits']], 'm', clean['m'],
              'moving', clean['moving'], 'elapsed', clean['elapsed'])
        assert len(clean['splits']) == 7, clean['splits']
        assert all(300 <= s <= 330 for s in clean['splits']), clean['splits']
        assert clean['lostMs'] == 0 and clean['holes'] == 0, clean
        assert abs(clean['moving'] - clean['elapsed']) <= 1, clean

        # --- 2. stessa corsa con 8 minuti di segnale perso nel quinto km ---
        hole = await pg.evaluate(SIM, 480)
        print('buco    splits', [round(s) for s in hole['splits']], 'm', hole['m'],
              'perso', hole['lostMs'] / 1000, 'buchi', hole['holes'],
              'moving', hole['moving'], 'elapsed', hole['elapsed'])
        print('        km al buco', hole['kmAtHole'], 'a', hole['secAtHole'], 's')
        # il bug: il quinto parziale valeva 789 s (13:09) invece di ~315
        assert len(hole['splits']) >= 6, hole['splits']
        assert all(300 <= s <= 340 for s in hole['splits']), \
            'tempo morto scaricato su un parziale: %s' % [round(s) for s in hole['splits']]
        # il buco e' registrato, non nascosto
        assert hole['holes'] == 1, hole
        assert abs(hole['lostMs'] - 480e3) < 6e3, hole
        # tempo totale e tempo in movimento differiscono esattamente del buco
        assert abs((hole['elapsed'] - hole['moving']) - 480) <= 2, hole
        # la distanza del tratto non visto non viene inventata col segmento dritto
        assert hole['m'] <= clean['m'] + 40, (hole['m'], clean['m'])

        # --- 3. dislivello: salita costante di 100 m ---
        # +100 m esatti distribuiti sui 7100 m del percorso
        up = await pg.evaluate(quota('100 + met / 71'), 0)
        print('salita  elev', up['elev'], 'm su 100 reali')
        assert 90 <= up['elev'] <= 102, up['elev']

        # --- 4. dislivello: pianura con rumore GPS di +/-2 m -> nessuna salita inventata ---
        flat = await pg.evaluate(quota('100 + (i % 2 ? 2 : -2)'), 0)
        print('piano   elev', flat['elev'], 'm (atteso 0)')
        assert flat['elev'] == 0, flat['elev']

        # --- 5. quota assente (GPS senza altitudine): nessun errore, nessun dislivello ---
        noalt = await pg.evaluate(quota('null'), 0)
        print('no quota elev', noalt['elev'], 'splits', len(noalt['splits']))
        assert noalt['elev'] == 0, noalt['elev']
        assert len(noalt['splits']) == 7, noalt['splits']

        print('errors', errs)
        await b.close()


asyncio.run(main())
