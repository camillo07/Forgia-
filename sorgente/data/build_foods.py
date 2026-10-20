#!/usr/bin/env python3
"""Builds src/js/1c-fooddb.js from the CIQUAL 2017 table (ANSES, Etalab open licence)
plus our Italian names/categories (data/ciqual_it.txt) and the original base foods."""
import csv, json, re
from pathlib import Path

ROOT = Path(__file__).parent
CIQ = Path('/tmp/pk/pyfood_x/pyfood/assets/nutri/CIQUAL/TableCiqual2017.csv')
rows = list(csv.reader(open(CIQ, encoding='latin-1')))
H, rows = rows[0], rows[1:]

def col(prefix):
    for i, h in enumerate(H):
        if h.startswith(prefix):
            return i
    raise KeyError(prefix)

C = {
    'kcal_eu': col('Energie, R'), 'kcal_j': 11, 'p': col('Prot'), 'c': col('Glucides'), 'f': col('Lipides'),
    'sug': col('Sucres'), 'fib': col('Fibres'), 'sat': col('AG satur'), 'salt': col('Sel chlorure'),
    'na': col('Sodium'), 'k': col('Potassium'), 'ca': col('Calcium'), 'fe': col('Fer '), 'mg': col('Magn'),
    'zn': col('Zinc'), 'se': col('S\xe9l\xe9nium') if any(h.startswith('S\xe9l\xe9nium') for h in H) else col('S'),
    'ret': col('R\xe9tinol'), 'beta': col('Beta-Carot'), 'vd': col('Vitamine D'), 've': col('Vitamine E'),
    'vc': col('Vitamine C'), 'b6': col('Vitamine B6'), 'b9': col('Vitamine B9'), 'b12': col('Vitamine B12'),
    'ala': col('AG 18:3'), 'epa': col('AG 20:5'), 'dha': col('AG 22:6'),
}
assert H[C['kcal_j']].startswith('Energie, N x facteur Jones, avec fibres  (kcal')

def val(s):
    s = (s or '').strip()
    if s in ('', '-'):
        return None
    if s.lower().startswith('traces'):
        return 0.0
    if s.startswith('<'):
        try:
            return float(s[1:].strip().replace(',', '.')) / 2
        except ValueError:
            return 0.0
    try:
        return float(s.replace(',', '.'))
    except ValueError:
        return None

BY = {r[6]: r for r in rows}

def nut(code):
    r = BY[code]
    g = lambda k: val(r[C[k]])
    kcal = g('kcal_eu')
    if kcal is None:
        kcal = g('kcal_j')
    if kcal is None and any(g(k) is not None for k in ('p', 'c', 'f')):
        kcal = 4 * (g('p') or 0) + 4 * (g('c') or 0) + 9 * (g('f') or 0) + 2 * (g('fib') or 0)
    salt = g('salt')
    if salt is None and g('na') is not None:
        salt = g('na') * 2.5 / 1000
    ret, beta = g('ret'), g('beta')
    vita = None if ret is None and beta is None else (ret or 0) + (beta or 0) / 6
    om = [g('ala'), g('epa'), g('dha')]
    om3 = None if all(v is None for v in om) else sum(v or 0 for v in om)
    out = [kcal, g('p'), g('c'), g('f'), g('fib'), g('sug'), g('sat'), salt,
           g('k'), g('ca'), g('fe'), g('mg'), g('zn'), g('se'), vita, g('vd'), g('ve'), g('vc'), g('b6'), g('b9'), g('b12'), om3]
    return [None if v is None else round(v, 3 if (v and v < 1) else 2) for v in out]

# old base ids -> CIQUAL code (adopt CIQUAL nutrients + micros, keep id/name)
OLD_MAP = dict(
    b_pollo_crudo='36017', b_pollo_cotto='36018', b_tacchino='36304', b_manzo5='6250', b_manzo15='6254', b_bistecca='6201',
    b_lonza='28003', b_crudo='28800', b_cotto='28910', b_bresaola='28503', b_tonno_nat='26039', b_tonno_olio='26071',
    b_salmone='26036', b_salmone_aff='26037', b_merluzzo='26043', b_gamberi='10021', b_uovo='22000', b_albume='22001',
    b_latte_int='19024', b_latte_ps='19042', b_latte_scr='19051', b_greco5='19860', b_yogurt='19600', b_ricotta='19585',
    b_mozzarella='19590', b_parmigiano='12120', b_grana='12123', b_burro='16400', b_tofu='20904', b_pasta='9810',
    b_pasta_int='9870', b_pasta_cotta='9811', b_riso='9100', b_basmati='9119', b_riso_cotto='9104', b_riso_int='9102',
    b_avena='9311', b_pane='7000', b_pane_int='7110', b_pancarre='7200', b_fette='7300', b_gallette='7352', b_cornflakes='32014',
    b_muesli='32004', b_couscous='9681', b_quinoa='9340', b_patate='4008', b_patate_dolci='4101', b_farina='9436', b_wrap='7815',
    b_ceci='20532', b_lenticchie='20505', b_piselli='20084', b_zucchine='20020', b_pomodori='20047', b_insalata='20031',
    b_spinaci='20059', b_broccoli='20057', b_carote='20009', b_peperoni='20041', b_melanzane='20053', b_cipolla='20034',
    b_funghi='20056', b_fagiolini='20061', b_cavolfiore='20016', b_cetrioli='20210', b_asparagi='20073', b_rucola='20217',
    b_banana='13005', b_mela='13039', b_pera='13037', b_arancia='13034', b_kiwi='13021', b_fragole='13014', b_mirtilli='13028',
    b_uva='13112', b_ananas='13002', b_mandarini='13090', b_pesca='13043', b_anguria='13036', b_melone='13026', b_datteri='13011',
    b_uvetta='13046', b_avocado='13004', b_olio='17270', b_mandorle='15000', b_noci='15005', b_anacardi='15019', b_nocciole='15004',
    b_arachidi='15037', b_pb='15202', b_chia='15047', b_fondente='31074', b_cornetto='7602', b_nutella='31032', b_marmellata='31024',
    b_miele='31008', b_zucchero='31016', b_gelato='39515', b_patatine='4004', b_caffe='18071', b_cola='18018', b_birra='5001',
    b_vino='5205', b_succo='2070', b_soia='18900', b_avena_drink='18905', b_passata='20260', b_pesto='11179', b_maionese='11054',
    b_ketchup='11008', b_balsamico='11091', b_pizza='25404', b_lasagne='25081', b_carbonara='25135', b_frollini='24049',
    b_crackers='38402', b_es_paella='25031', b_es_gazpacho='25967',
)
OLD_CAT = {}
cat_rules = [
    ('fr', 'banana mela pera arancia kiwi fragole mirtilli uva ananas mandarini pesca anguria melone avocado'),
    ('fd', 'datteri uvetta'), ('fj', 'succo'),
    ('veg', 'zucchine pomodori insalata spinaci broccoli carote peperoni melanzane cipolla funghi fagiolini cavolfiore cetrioli asparagi rucola verdure_mix passata'),
    ('dairy', 'latte_int latte_ps latte_scr greco0 greco5 yogurt skyr fiocchi ricotta mozzarella mozz_light parmigiano grana whey caseina'),
    ('egg', 'uovo albume'),
    ('leg', 'ceci lenticchie fagioli piselli edamame tofu'),
    ('nut', 'mandorle noci anacardi nocciole arachidi pb chia'),
    ('fat', 'burro olio'),
    ('drink', 'caffe cola soia avena_drink'), ('alc', 'birra vino'),
    ('sweet', 'fondente frollini crackers taralli nutella marmellata miele zucchero gelato cornetto barretta patatine'),
    ('sauce', 'pesto maionese ketchup balsamico'),
    ('tub', 'patate patate_dolci'),
    ('meat', 'pollo_crudo pollo_cotto tacchino manzo5 manzo15 bistecca lonza crudo cotto bresaola es_serrano es_iberico es_chorizo'),
    ('fish', 'tonno_nat tonno_olio salmone salmone_aff merluzzo gamberi es_pulpo'),
    ('cer', 'pasta pasta_int pasta_cotta riso basmati riso_cotto riso_int avena pane pane_int pancarre fette gallette cornflakes muesli couscous quinoa farina piadina wrap'),
    ('dish', 'pizza lasagne pasta_pom carbonara es_tortilla es_salmorejo es_gazpacho es_flamenquin es_croqueta es_paella es_pantomate es_bravas es_berenjenas es_rabo es_pisto es_bocadillo'),
    ('dairy', 'es_manchego'), ('sweet', 'es_churros'),
]
for cat, names in cat_rules:
    for n in names.split():
        OLD_CAT['b_' + n] = cat

used = set(OLD_MAP.values())
items, skipped, seen = [], [], set()
for line in (ROOT / 'ciqual_it.txt').read_text().splitlines():
    if not line.strip() or line.startswith('#'):
        continue
    parts = [p.strip() for p in line.split('|')]
    code, name, cat, sg, sl, alias = (parts + [''] * 6)[:6]
    if code not in BY:
        skipped.append(code + ' ' + name); continue
    if code in used or code in seen:
        continue
    seen.add(code)
    items.append(['q' + code, name, cat, float(sg) if sg else None, sl, alias] + nut(code))

old = {k: [v, OLD_CAT.get(k, '')] for k, v in OLD_MAP.items()}
old_out = {k: [OLD_CAT.get(k, 'dish' if k.startswith('b_es_') else '')] + nut(v) for k, v in OLD_MAP.items()}
cats_only = {k: v for k, v in OLD_CAT.items() if k not in OLD_MAP}

js = ('/* Generated by data/build_foods.py — CIQUAL 2017 (ANSES, Licence Ouverte Etalab) */\n'
      'const MICRO_KEYS = ["kcal","p","c","f","fib","sug","sat","salt","k","ca","fe","mg","zn","se","vita","vitd","vite","vitc","b6","b9","b12","om3"];\n'
      f'const CIQ_FOODS = {json.dumps(items, ensure_ascii=False, separators=(",", ":"))};\n'
      f'const BASE_UPGRADE = {json.dumps(old_out, ensure_ascii=False, separators=(",", ":"))};\n'
      f'const BASE_CAT = {json.dumps(cats_only, separators=(",", ":"))};\n')
(ROOT.parent / 'src' / 'js' / '1c-fooddb.js').write_text(js)
print('ciqual items:', len(items), 'upgraded base:', len(old_out), 'skipped:', skipped, 'bytes:', len(js))
