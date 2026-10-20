import re
#!/usr/bin/env python3
"""Build Forgia: compacts the exercise DB, inlines everything, writes
dist/artifact.html (Claude preview) and the 9 site files in the repo root
(the PWA served by GitHub Pages)."""
import json, re, os, shutil
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"
SITE = ROOT.parent  # repo root: the 9 files published on GitHub Pages

raw = json.loads((SRC / "exercises_raw.json").read_text())

# Italian / gym-slang search aliases for the most used exercises
ALIASES = {
    "Barbell_Bench_Press_-_Medium_Grip": "panca piana bilanciere bench",
    "Dumbbell_Bench_Press": "panca piana manubri",
    "Incline_Dumbbell_Press": "panca inclinata manubri",
    "Barbell_Incline_Bench_Press_-_Medium_Grip": "panca inclinata bilanciere",
    "Butterfly": "pec deck croci macchina",
    "Reverse_Machine_Flyes": "reverse pec deck deltoidi posteriori",
    "Leverage_Chest_Press": "chest press macchina spinte",
    "Dumbbell_Flyes": "croci manubri",
    "Cable_Crossover": "croci ai cavi",
    "Barbell_Squat": "squat bilanciere",
    "Barbell_Full_Squat": "squat completo",
    "Front_Squat_Clean_Grip": "front squat",
    "Leg_Press": "pressa",
    "Hack_Squat": "hack squat",
    "Leg_Extensions": "leg extension",
    "Lying_Leg_Curls": "leg curl sdraiato",
    "Seated_Leg_Curl": "leg curl seduto",
    "Romanian_Deadlift": "stacco rumeno rdl",
    "Barbell_Deadlift": "stacco da terra",
    "Sumo_Deadlift": "stacco sumo",
    "Stiff-Legged_Barbell_Deadlift": "stacco gambe tese",
    "Barbell_Hip_Thrust": "hip thrust",
    "Barbell_Lunge": "affondi",
    "Dumbbell_Lunges": "affondi manubri",
    "Split_Squat_with_Dumbbells": "split squat bulgaro affondi",
    "Standing_Calf_Raises": "calf polpacci in piedi",
    "Seated_Calf_Raise": "calf polpacci seduto",
    "Thigh_Abductor": "abductor macchina abduttori",
    "Thigh_Adductor": "adductor macchina adduttori",
    "Wide-Grip_Lat_Pulldown": "lat machine presa larga",
    "Close-Grip_Front_Lat_Pulldown": "lat machine presa stretta",
    "Pullups": "trazioni",
    "Chin-Up": "trazioni supine",
    "Seated_Cable_Rows": "pulley basso rematore cavo",
    "Bent_Over_Barbell_Row": "rematore bilanciere",
    "One-Arm_Dumbbell_Row": "rematore manubrio",
    "T-Bar_Row_with_Handle": "t bar rematore",
    "Leverage_Iso_Row": "rematore macchina",
    "Leverage_High_Row": "high row macchina",
    "Face_Pull": "face pull",
    "Hyperextensions_Back_Extensions": "iperestensioni lombari",
    "Barbell_Shoulder_Press": "lento avanti military press",
    "Standing_Military_Press": "lento in piedi military",
    "Dumbbell_Shoulder_Press": "lento manubri spinte spalle",
    "Machine_Shoulder_Military_Press": "shoulder press macchina",
    "Side_Lateral_Raise": "alzate laterali",
    "Cable_Seated_Lateral_Raise": "alzate laterali cavo",
    "Barbell_Shrug": "scrollate",
    "Dumbbell_Shrug": "scrollate manubri",
    "Barbell_Curl": "curl bilanciere",
    "Dumbbell_Bicep_Curl": "curl manubri",
    "Hammer_Curls": "curl martello hammer",
    "Preacher_Curl": "curl panca scott",
    "Standing_Biceps_Cable_Curl": "curl cavo",
    "Incline_Dumbbell_Curl": "curl inclinato",
    "Triceps_Pushdown": "pushdown tricipiti cavo",
    "Triceps_Pushdown_-_Rope_Attachment": "pushdown corda tricipiti",
    "Cable_Rope_Overhead_Triceps_Extension": "french press cavo sopra la testa",
    "EZ-Bar_Skullcrusher": "french press skull crusher",
    "Dips_-_Triceps_Version": "dip parallele tricipiti",
    "Dips_-_Chest_Version": "dip parallele petto",
    "Plank": "plank addominali",
    "Cable_Crunch": "crunch cavo addominali",
    "Crunches": "crunch addominali",
    "Hanging_Leg_Raise": "leg raise sbarra addominali",
    "Ab_Roller": "ruota addominali",
    "Pushups": "piegamenti flessioni",
    "Running_Treadmill": "corsa tapis roulant",
    "Walking_Treadmill": "camminata tapis roulant",
    "Bicycling_Stationary": "cyclette bici",
    "Elliptical_Trainer": "ellittica",
    "Rowing_Stationary": "vogatore",
    "Stairmaster": "stairmaster scale",
}

POPULAR = [
    "Barbell_Bench_Press_-_Medium_Grip", "Incline_Dumbbell_Press", "Dumbbell_Bench_Press",
    "Barbell_Incline_Bench_Press_-_Medium_Grip", "Leverage_Chest_Press", "Butterfly", "Cable_Crossover",
    "Dips_-_Chest_Version", "Barbell_Squat", "Leg_Press", "Hack_Squat", "Romanian_Deadlift",
    "Barbell_Deadlift", "Barbell_Hip_Thrust", "Leg_Extensions", "Lying_Leg_Curls", "Seated_Leg_Curl",
    "Split_Squat_with_Dumbbells", "x_bulgarian_split_squat", "Standing_Calf_Raises", "Seated_Calf_Raise",
    "Wide-Grip_Lat_Pulldown", "Pullups", "Chin-Up", "Seated_Cable_Rows", "Bent_Over_Barbell_Row",
    "One-Arm_Dumbbell_Row", "x_chest_supported_row", "T-Bar_Row_with_Handle", "Face_Pull",
    "Barbell_Shoulder_Press", "Dumbbell_Shoulder_Press", "Machine_Shoulder_Military_Press",
    "Side_Lateral_Raise", "x_cable_lateral_raise", "Reverse_Machine_Flyes", "Barbell_Curl",
    "Dumbbell_Bicep_Curl", "Hammer_Curls", "Preacher_Curl", "Incline_Dumbbell_Curl",
    "Triceps_Pushdown_-_Rope_Attachment", "Triceps_Pushdown", "Cable_Rope_Overhead_Triceps_Extension",
    "EZ-Bar_Skullcrusher", "Cable_Crunch", "Hanging_Leg_Raise", "Plank", "Thigh_Abductor", "Thigh_Adductor",
]

# Common machines missing from the open DB (no images)
EXTRAS = [
    ("x_bulgarian_split_squat", "Bulgarian Split Squat", ["quadriceps"], ["glutes", "hamstrings"], "dumbbell", "compound", "split squat bulgaro affondi"),
    ("x_chest_supported_row", "Chest-Supported Row (Machine)", ["middle back"], ["lats", "biceps"], "machine", "compound", "rematore petto appoggiato macchina"),
    ("x_seated_machine_row", "Seated Machine Row", ["middle back"], ["lats", "biceps"], "machine", "compound", "rematore macchina seduto"),
    ("x_cable_lateral_raise", "Single-Arm Cable Lateral Raise", ["shoulders"], [], "cable", "isolation", "alzate laterali cavo singolo"),
    ("x_pendulum_squat", "Pendulum Squat", ["quadriceps"], ["glutes"], "machine", "compound", "pendulum squat"),
    ("x_smith_squat", "Smith Machine Squat", ["quadriceps"], ["glutes", "hamstrings"], "machine", "compound", "squat multipower smith"),
    ("x_hip_thrust_machine", "Hip Thrust Machine", ["glutes"], ["hamstrings"], "machine", "compound", "hip thrust macchina"),
    ("x_neutral_lat_pulldown", "Neutral-Grip Lat Pulldown", ["lats"], ["biceps", "middle back"], "cable", "compound", "lat machine presa neutra"),
    ("x_assisted_pullup", "Assisted Pull-Up (Machine)", ["lats"], ["biceps"], "machine", "compound", "trazioni assistite"),
    ("x_incline_machine_press", "Incline Chest Press (Machine)", ["chest"], ["shoulders", "triceps"], "machine", "compound", "panca inclinata macchina"),
    ("x_cable_fly_low_high", "Low-to-High Cable Fly", ["chest"], ["shoulders"], "cable", "isolation", "croci cavi basso alto"),
    ("x_cable_curl_bar", "Cable Curl (Straight Bar)", ["biceps"], ["forearms"], "cable", "isolation", "curl cavo barra"),
    ("x_bayesian_curl", "Bayesian Cable Curl", ["biceps"], [], "cable", "isolation", "curl bayesian cavo"),
    ("x_jm_press", "JM Press", ["triceps"], ["chest"], "barbell", "compound", "jm press tricipiti"),
    ("x_belt_squat", "Belt Squat", ["quadriceps"], ["glutes"], "machine", "compound", "belt squat"),
    ("x_reverse_hack", "Reverse Hack Squat", ["glutes"], ["quadriceps", "hamstrings"], "machine", "compound", "hack inverso glutei"),
    ("x_back_ext_45", "45° Back Extension", ["lower back"], ["glutes", "hamstrings"], "body only", "compound", "iperestensioni 45"),
    ("x_jump_rope", "Jump Rope", ["calves"], ["quadriceps"], "other", None, "salto corda"),
]

# exercises without photos in the open DB: borrow the photos of the closest exercise that has them
IMG_ALT = {
    "x_bulgarian_split_squat": "Split_Squat_with_Dumbbells", "x_chest_supported_row": "Lying_T-Bar_Row",
    "x_seated_machine_row": "Leverage_Iso_Row", "x_cable_lateral_raise": "Cable_Seated_Lateral_Raise",
    "x_pendulum_squat": "Hack_Squat", "x_smith_squat": "Smith_Machine_Squat", "x_hip_thrust_machine": "Barbell_Hip_Thrust",
    "x_neutral_lat_pulldown": "V-Bar_Pulldown", "x_assisted_pullup": "Band_Assisted_Pull-Up",
    "x_incline_machine_press": "Leverage_Incline_Chest_Press", "x_cable_fly_low_high": "Low_Cable_Crossover",
    "x_cable_curl_bar": "Standing_Biceps_Cable_Curl", "x_bayesian_curl": "Standing_One-Arm_Cable_Curl",
    "x_jm_press": "JM_Press", "x_belt_squat": "Weighted_Squat", "x_reverse_hack": "Hack_Squat",
    "x_back_ext_45": "Hyperextensions_Back_Extensions", "x_jump_rope": "Rope_Jumping",
    "Kettlebell_Overhead_Triceps_Extension": "Standing_Dumbbell_Triceps_Extension",
    "Kettlebell_Halo_With_Overhead_Extension": "Standing_Dumbbell_Triceps_Extension",
}

import sys
sys.path.insert(0, str(ROOT / "data"))
from ex_it import translate

def compact(x):
    imgs = len(x.get("images") or [])
    return [
        x["id"], x["name"], x.get("primaryMuscles") or [], x.get("secondaryMuscles") or [],
        x.get("equipment") or "other", x.get("category") or "strength", x.get("mechanic") or "",
        x.get("level") or "", "\n".join(x.get("instructions") or []), imgs, ALIASES.get(x["id"], ""),
        translate(x["id"], x["name"]) or "",
    ]

db = [compact(x) for x in raw]
ids = {x["id"] for x in raw}
for (i, n, p, s, e, m, a) in EXTRAS:
    cat = "cardio" if i == "x_jump_rope" else "strength"
    db.append([i, n, p, s, e, cat, m or "", "", "", 0, a, translate(i, n) or ""])
    ids.add(i)

_imgs = {x["id"]: len(x.get("images") or []) for x in raw}
for row in db:
    alt = IMG_ALT.get(row[0])
    if alt and not row[9]:
        assert _imgs.get(alt), f"image alias without photos: {alt}"
        row[9] = _imgs[alt]; row.append(alt)
print("exercises still without photos:", [r[0] for r in db if not r[9]])

# ---------- languages: Spanish exercise names (column 13), UI dictionary, food names ----------
I18N = ROOT / "i18n"
def _load_outs(prefix):
    d = {}
    for f in sorted(I18N.glob(prefix + "*.json")): d.update(json.loads(f.read_text()))
    return d
ex_es = _load_outs("out_ex_")
for row in db:
    while len(row) < 13: row.append("")
    row.append(ex_es.get(row[0], ""))
_keys = json.loads((I18N / "strings.json").read_text()) if (I18N / "strings.json").exists() else []
_ui = _load_outs("out_ui_")
_extra = json.loads((I18N / "extra.json").read_text()) if (I18N / "extra.json").exists() else {}
tr_keys, tr_en, tr_es = [], [], []
for i, k in enumerate(_keys):
    v = _ui.get(str(i))
    if not v or (v[0] == k["k"] and v[1] == k["k"]): continue
    tr_keys.append(k["k"]); tr_en.append(v[0]); tr_es.append(v[1])
for k, (en, es) in _extra.items():
    if k in tr_keys: j = tr_keys.index(k); tr_en[j] = en; tr_es[j] = es
    else: tr_keys.append(k); tr_en.append(en); tr_es.append(es)
i18n_js = json.dumps({"k": tr_keys, "en": tr_en, "es": tr_es}, ensure_ascii=False, separators=(",", ":"))
food_tr = json.dumps(_load_outs("out_food_"), ensure_ascii=False, separators=(",", ":"))
print("i18n entries:", len(tr_keys), "foods:", len(json.loads(food_tr)), "es exercise names:", sum(1 for r in db if r[13]))

for k in list(ALIASES) + POPULAR:
    assert k in ids, f"missing exercise id {k}"

app_js = "\n".join(f.read_text() for f in sorted((SRC / "js").glob("*.js")))
_dups = [n for n, c in __import__("collections").Counter(re.findall(r"^(?:async )?function ([A-Za-z0-9_]+)", app_js, re.M)).items() if c > 1]
if _dups: raise SystemExit("duplicate function names: " + ", ".join(_dups))
# validate program template ids
for m in re.finditer(r"\['([A-Za-z0-9_\-]+)',\s*\d", (SRC / "js" / "1-core.js").read_text()):
    assert m.group(1) in ids, f"template references unknown id {m.group(1)}"

exdb = json.dumps(db, ensure_ascii=False, separators=(",", ":"))
popular = json.dumps(POPULAR)
supa_cfg = ROOT / "data" / "supabase.json"
supa = json.loads(supa_cfg.read_text()) if supa_cfg.exists() else {"url": "", "key": ""}
_body = (ROOT / "data" / "body.json").read_text() if (ROOT / "data" / "body.json").exists() else "{}"
app_js = app_js.replace("/*__BODY__*/{}", _body)
app_js = app_js.replace("/*__I18N__*/{}", i18n_js).replace("/*__FOODTR__*/{}", food_tr)
app_js = app_js.replace("/*__EXDB__*/[]", exdb).replace("/*__POPULAR__*/[]", popular).replace("/*__SUPA__*/{ url: '', key: '' }", json.dumps({"url": supa.get("url", ""), "key": supa.get("key", "")}))

head = (SRC / "head.html").read_text()
css = (SRC / "style.css").read_text()
body = (SRC / "body.html").read_text()

page = f"{head}\n<style>\n{css}\n</style>\n{body}\n<script>\n{app_js}\n</script>\n"

DIST.mkdir(exist_ok=True)
(DIST / "artifact.html").write_text(page)

# ---------- PWA ----------
# The 9 files are overwritten in place: the repo root also holds .git and sorgente/.
pwa = SITE
pwa_head = """<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#11151b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Forgia">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
<script>window.FORGIA_PWA=true</script>
</head>
<body>
"""
(pwa / "index.html").write_text(pwa_head + page + "</body>\n</html>\n")
(pwa / "manifest.webmanifest").write_text(json.dumps({
    "name": "Forgia", "short_name": "Forgia", "start_url": "./", "scope": "./",
    "display": "standalone", "background_color": "#11151b", "theme_color": "#11151b",
    "lang": "it", "orientation": "portrait",
    "icons": [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"},
              {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
}, indent=1))
(pwa / "sw.js").write_text((SRC / "sw.js").read_text())
shutil.copy(SRC / "zxing.min.js", pwa / "zxing.min.js")
shutil.copy(SRC / "supabase.min.js", pwa / "supabase.min.js")
shutil.copy(SRC / "leaflet.min.js", pwa / "leaflet.min.js")

# icons
from PIL import Image, ImageDraw
def icon(size):
    S = size * 4
    im = Image.new("RGB", (S, S), (17, 21, 27))
    d = ImageDraw.Draw(im)
    # ember gradient disc
    cx = cy = S / 2
    r = S * 0.36
    for i in range(int(r), 0, -1):
        t = i / r
        col = (int(255 * 1), int(107 + (181 - 107) * (1 - t)), int(44 + (71 - 44) * (1 - t)))
        d.ellipse([cx - i, cy - i, cx + i, cy + i], fill=col)
    # dumbbell silhouette (dark)
    dk = (17, 21, 27)
    bw, bh = S * 0.30, S * 0.05
    d.rounded_rectangle([cx - bw, cy - bh, cx + bw, cy + bh], radius=bh, fill=dk)
    for sx in (-1, 1):
        x0 = cx + sx * S * 0.17
        w, h = S * 0.055, S * 0.30
        d.rounded_rectangle([x0 - w, cy - h / 2, x0 + w, cy + h / 2], radius=w * 0.6, fill=dk)
        x1 = cx + sx * S * 0.255
        w2, h2 = S * 0.04, S * 0.20
        d.rounded_rectangle([x1 - w2, cy - h2 / 2, x1 + w2, cy + h2 / 2], radius=w2 * 0.6, fill=dk)
    return im.resize((size, size), Image.LANCZOS)
for s in (180, 192, 512):
    icon(s).save(pwa / f"icon-{s}.png")

SITE_FILES = ["index.html", "manifest.webmanifest", "sw.js", "supabase.min.js", "zxing.min.js",
              "leaflet.min.js", "icon-180.png", "icon-192.png", "icon-512.png"]
missing = [f for f in SITE_FILES if not (SITE / f).exists()]
if missing: raise SystemExit("missing site files: " + ", ".join(missing))
print("site:", SITE, "->", ", ".join(f"{f} {round((SITE / f).stat().st_size / 1024)}KB" for f in SITE_FILES))
print("built:", DIST / "artifact.html", round(len(page) / 1024), "KB;", "exercises:", len(db))
