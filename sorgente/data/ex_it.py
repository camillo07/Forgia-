"""Italian names for the exercise library: manual names for the common ones,
rule-based translation (movement + modifiers) for the rest."""
import re

MANUAL = {
    'Barbell_Bench_Press_-_Medium_Grip': 'Panca piana con bilanciere',
    'Dumbbell_Bench_Press': 'Panca piana con manubri',
    'Incline_Dumbbell_Press': 'Panca inclinata con manubri',
    'Barbell_Incline_Bench_Press_-_Medium_Grip': 'Panca inclinata con bilanciere',
    'Decline_Barbell_Bench_Press': 'Panca declinata con bilanciere',
    'Close-Grip_Barbell_Bench_Press': 'Panca presa stretta',
    'Leverage_Chest_Press': 'Chest press',
    'Butterfly': 'Pec deck (croci alla macchina)',
    'Cable_Crossover': 'Croci ai cavi',
    'Dumbbell_Flyes': 'Croci con manubri',
    'Incline_Dumbbell_Flyes': 'Croci su panca inclinata',
    'Dips_-_Chest_Version': 'Dip alle parallele (petto)',
    'Dips_-_Triceps_Version': 'Dip alle parallele (tricipiti)',
    'Pushups': 'Piegamenti',
    'Barbell_Squat': 'Squat con bilanciere',
    'Barbell_Full_Squat': 'Squat completo con bilanciere',
    'Front_Squat_Clean_Grip': 'Front squat',
    'Leg_Press': 'Pressa',
    'Hack_Squat': 'Hack squat',
    'Leg_Extensions': 'Leg extension',
    'Lying_Leg_Curls': 'Leg curl sdraiato',
    'Seated_Leg_Curl': 'Leg curl seduto',
    'Standing_Leg_Curl': 'Leg curl in piedi',
    'Romanian_Deadlift': 'Stacco rumeno',
    'Barbell_Deadlift': 'Stacco da terra',
    'Sumo_Deadlift': 'Stacco sumo',
    'Stiff-Legged_Barbell_Deadlift': 'Stacco a gambe tese',
    'Trap_Bar_Deadlift': 'Stacco con trap bar',
    'Barbell_Hip_Thrust': 'Hip thrust con bilanciere',
    'Barbell_Glute_Bridge': 'Ponte glutei con bilanciere',
    'Barbell_Lunge': 'Affondi con bilanciere',
    'Dumbbell_Lunges': 'Affondi con manubri',
    'Barbell_Walking_Lunge': 'Affondi camminati con bilanciere',
    'Split_Squat_with_Dumbbells': 'Split squat con manubri',
    'Standing_Calf_Raises': 'Calf raise in piedi',
    'Seated_Calf_Raise': 'Calf raise seduto',
    'Calf_Press_On_The_Leg_Press_Machine': 'Calf alla pressa',
    'Thigh_Abductor': 'Abductor machine',
    'Thigh_Adductor': 'Adductor machine',
    'Wide-Grip_Lat_Pulldown': 'Lat machine presa larga',
    'Close-Grip_Front_Lat_Pulldown': 'Lat machine presa stretta',
    'Pullups': 'Trazioni alla sbarra',
    'Chin-Up': 'Trazioni presa supina',
    'Seated_Cable_Rows': 'Pulley basso',
    'Bent_Over_Barbell_Row': 'Rematore con bilanciere',
    'One-Arm_Dumbbell_Row': 'Rematore con manubrio',
    'T-Bar_Row_with_Handle': 'Rematore T-bar',
    'Leverage_Iso_Row': 'Rematore alla macchina',
    'Leverage_High_Row': 'High row alla macchina',
    'Face_Pull': 'Face pull',
    'Hyperextensions_Back_Extensions': 'Iperestensioni',
    'Straight-Arm_Dumbbell_Pullover': 'Pullover con manubrio',
    'Barbell_Shoulder_Press': 'Lento avanti con bilanciere',
    'Standing_Military_Press': 'Military press in piedi',
    'Seated_Barbell_Military_Press': 'Lento avanti seduto',
    'Dumbbell_Shoulder_Press': 'Lento con manubri',
    'Machine_Shoulder_Military_Press': 'Shoulder press alla macchina',
    'Arnold_Dumbbell_Press': 'Arnold press',
    'Side_Lateral_Raise': 'Alzate laterali con manubri',
    'Cable_Seated_Lateral_Raise': 'Alzate laterali ai cavi (seduto)',
    'Front_Dumbbell_Raise': 'Alzate frontali con manubri',
    'Reverse_Machine_Flyes': 'Reverse pec deck (deltoidi posteriori)',
    'Reverse_Flyes': 'Alzate posteriori con manubri',
    'Upright_Barbell_Row': 'Tirate al mento con bilanciere',
    'Barbell_Shrug': 'Scrollate con bilanciere',
    'Dumbbell_Shrug': 'Scrollate con manubri',
    'Barbell_Curl': 'Curl con bilanciere',
    'Dumbbell_Bicep_Curl': 'Curl con manubri',
    'Hammer_Curls': 'Curl a martello',
    'Preacher_Curl': 'Curl alla panca Scott',
    'Incline_Dumbbell_Curl': 'Curl su panca inclinata',
    'Concentration_Curls': 'Curl di concentrazione',
    'Standing_Biceps_Cable_Curl': 'Curl ai cavi',
    'EZ-Bar_Curl': 'Curl con bilanciere EZ',
    'Triceps_Pushdown': 'Pushdown ai cavi',
    'Triceps_Pushdown_-_Rope_Attachment': 'Pushdown con corda',
    'Triceps_Pushdown_-_V-Bar_Attachment': 'Pushdown con barra a V',
    'Cable_Rope_Overhead_Triceps_Extension': 'French press ai cavi sopra la testa',
    'EZ-Bar_Skullcrusher': 'French press con bilanciere EZ',
    'Lying_Triceps_Press': 'French press sdraiato',
    'Tricep_Dumbbell_Kickback': 'Kickback con manubrio',
    'Bench_Dips': 'Dip su panca',
    'Plank': 'Plank',
    'Cable_Crunch': 'Crunch ai cavi',
    'Crunches': 'Crunch',
    'Hanging_Leg_Raise': 'Sollevamento gambe alla sbarra',
    'Ab_Roller': 'Ruota addominale',
    'Russian_Twist': 'Russian twist',
    'Running_Treadmill': 'Corsa sul tapis roulant',
    'Walking_Treadmill': 'Camminata sul tapis roulant',
    'Jogging_Treadmill': 'Jogging sul tapis roulant',
    'Bicycling_Stationary': 'Cyclette',
    'Bicycling': 'Bicicletta',
    'Elliptical_Trainer': 'Ellittica',
    'Rowing_Stationary': 'Vogatore',
    'Stairmaster': 'Stairmaster (scale)',
    'Farmers_Walk': 'Farmer walk',
    'Good_Morning': 'Good morning',
    'One-Arm_Kettlebell_Swings': 'Swing con kettlebell a un braccio',
    'x_bulgarian_split_squat': 'Squat bulgaro',
    'x_chest_supported_row': 'Rematore con petto appoggiato (macchina)',
    'x_seated_machine_row': 'Rematore seduto alla macchina',
    'x_cable_lateral_raise': 'Alzate laterali al cavo (un braccio)',
    'x_pendulum_squat': 'Pendulum squat',
    'x_smith_squat': 'Squat al multipower',
    'x_hip_thrust_machine': 'Hip thrust alla macchina',
    'x_neutral_lat_pulldown': 'Lat machine presa neutra',
    'x_assisted_pullup': 'Trazioni assistite (macchina)',
    'x_incline_machine_press': 'Panca inclinata alla macchina',
    'x_cable_fly_low_high': 'Croci ai cavi dal basso',
    'x_cable_curl_bar': 'Curl ai cavi con barra',
    'x_bayesian_curl': 'Curl Bayesian ai cavi',
    'x_jm_press': 'JM press',
    'x_belt_squat': 'Belt squat',
    'x_reverse_hack': 'Hack squat inverso',
    'x_back_ext_45': 'Iperestensioni a 45°',
    'x_jump_rope': 'Salto della corda',
}

# movement phrases (longest first). value = Italian head noun
MOVES = [
    ('romanian deadlift', 'Stacco rumeno'), ('stiff-legged deadlift', 'Stacco a gambe tese'), ('sumo deadlift', 'Stacco sumo'), ('deadlift', 'Stacco'),
    ('bench press', 'Panca'), ('chest press', 'Chest press'), ('military press', 'Military press'), ('shoulder press', 'Lento'),
    ('overhead press', 'Lento sopra la testa'), ('floor press', 'Floor press'), ('leg press', 'Pressa'), ('push press', 'Push press'),
    ('lat pulldown', 'Lat machine'), ('pulldown', 'Lat machine'), ('pull-up', 'Trazioni'), ('pullup', 'Trazioni'), ('pullups', 'Trazioni'), ('chin-up', 'Trazioni supine'),
    ('upright row', 'Tirate al mento'), ('row', 'Rematore'), ('rows', 'Rematore'),
    ('lateral raise', 'Alzate laterali'), ('side lateral', 'Alzate laterali'), ('front raise', 'Alzate frontali'), ('rear delt raise', 'Alzate posteriori'), ('rear delt fly', 'Croci inverse'),
    ('calf raise', 'Calf raise'), ('calf raises', 'Calf raise'), ('leg raise', 'Sollevamento gambe'), ('leg raises', 'Sollevamento gambe'), ('raise', 'Alzate'), ('raises', 'Alzate'),
    ('leg extension', 'Leg extension'), ('leg extensions', 'Leg extension'), ('leg curl', 'Leg curl'), ('leg curls', 'Leg curl'),
    ('triceps extension', 'Estensioni tricipiti'), ('tricep extension', 'Estensioni tricipiti'), ('triceps press', 'French press'), ('skullcrusher', 'French press'), ('skull crusher', 'French press'),
    ('pushdown', 'Pushdown'), ('kickback', 'Kickback'), ('kickbacks', 'Kickback'),
    ('hammer curl', 'Curl a martello'), ('hammer curls', 'Curl a martello'), ('preacher curl', 'Curl alla panca Scott'), ('concentration curl', 'Curl di concentrazione'), ('curl', 'Curl'), ('curls', 'Curl'),
    ('flyes', 'Croci'), ('flye', 'Croci'), ('fly', 'Croci'), ('crossover', 'Croci ai cavi'),
    ('hip thrust', 'Hip thrust'), ('glute bridge', 'Ponte glutei'), ('good morning', 'Good morning'), ('good mornings', 'Good morning'),
    ('split squat', 'Split squat'), ('hack squat', 'Hack squat'), ('front squat', 'Front squat'), ('squat', 'Squat'), ('squats', 'Squat'),
    ('walking lunge', 'Affondi camminati'), ('lunge', 'Affondi'), ('lunges', 'Affondi'), ('step-up', 'Step-up'), ('step up', 'Step-up'),
    ('step ups', 'Step-up'), ('deadlifts', 'Stacco'), ('presses', 'Distensioni'), ('rollout', 'Rollout'), ('side bend', 'Flessioni laterali'), ('bridge', 'Ponte'), ('adduction', 'Adduzioni'), ('adductions', 'Adduzioni'), ('abduction', 'Abduzioni'), ('rotation', 'Rotazioni'),
    ('shrug', 'Scrollate'), ('shrugs', 'Scrollate'), ('pullover', 'Pullover'), ('dips', 'Dip'), ('dip', 'Dip'),
    ('push-up', 'Piegamenti'), ('push-ups', 'Piegamenti'), ('pushup', 'Piegamenti'), ('pushups', 'Piegamenti'),
    ('crunch', 'Crunch'), ('crunches', 'Crunch'), ('sit-up', 'Sit-up'), ('plank', 'Plank'), ('twist', 'Torsioni'),
    ('extension', 'Estensioni'), ('extensions', 'Estensioni'), ('press', 'Distensioni'),
    ('clean and jerk', 'Slancio'), ('clean', 'Girata'), ('snatch', 'Strappo'), ('jerk', 'Jerk'),
    ('swing', 'Swing'), ('swings', 'Swing'), ('carry', 'Trasporto'), ('walk', 'Camminata'), ('stretch', 'Allungamento'),
    ('jump', 'Salto'), ('jumps', 'Salti'), ('throw', 'Lancio'), ('slam', 'Slam'), ('sprint', 'Sprint'),
]
MODS = [
    ('barbell', 'con bilanciere'), ('dumbbells', 'con manubri'), ('dumbbell', 'con manubri'), ('kettlebells', 'con kettlebell'), ('kettlebell', 'con kettlebell'),
    ('e-z bar', 'con bilanciere EZ'), ('ez-bar', 'con bilanciere EZ'), ('cable', 'ai cavi'), ('machine', 'alla macchina'), ('leverage', 'alla macchina'),
    ('smith machine', 'al multipower'), ('smith', 'al multipower'), ('bands', 'con elastici'), ('band', 'con elastico'), ('medicine ball', 'con palla medica'),
    ('exercise ball', 'su fitball'), ('rope', 'con corda'), ('v-bar', 'con barra a V'),
    ('incline', 'su panca inclinata'), ('decline', 'su panca declinata'), ('flat bench', 'su panca piana'), ('seated', 'seduto'), ('standing', 'in piedi'),
    ('lying', 'sdraiato'), ('kneeling', 'in ginocchio'), ('bent over', 'a busto flesso'), ('bent-over', 'a busto flesso'), ('hanging', 'alla sbarra'),
    ('one-arm', 'a un braccio'), ('one arm', 'a un braccio'), ('single-arm', 'a un braccio'), ('one-legged', 'a una gamba'), ('single-leg', 'a una gamba'), ('one leg', 'a una gamba'),
    ('alternate', 'alternato'), ('alternating', 'alternato'), ('reverse', 'inverso'), ('weighted', 'zavorrato'), ('assisted', 'assistito'),
    ('wide-grip', 'presa larga'), ('wide grip', 'presa larga'), ('close-grip', 'presa stretta'), ('close grip', 'presa stretta'), ('narrow stance', 'gambe strette'), ('wide stance', 'gambe larghe'),
    ('neutral grip', 'presa neutra'), ('palms in', 'presa neutra'), ('underhand', 'presa supina'), ('overhand', 'presa prona'), ('behind the neck', 'dietro la nuca'), ('behind the back', 'dietro la schiena'),
    ('chest', 'petto'), ('shoulder', 'spalle'), ('triceps', 'tricipiti'), ('tricep', 'tricipiti'), ('biceps', 'bicipiti'), ('bicep', 'bicipiti'), ('hamstring', 'femorali'), ('quad', 'quadricipiti'),
    ('glute', 'glutei'), ('calf', 'polpacci'), ('calves', 'polpacci'), ('lower back', 'lombari'), ('neck', 'collo'), ('hip', 'anca'), ('hips', 'anche'), ('abs', 'addominali'), ('oblique', 'obliqui'),
    ('front', 'frontale'), ('side', 'laterale'), ('rear', 'posteriore'), ('overhead', 'sopra la testa'), ('floor', 'a terra'), ('bench', 'su panca'), ('box', 'con box'), ('dynamic', 'dinamico'),
]

def translate(eid, name):
    if eid in MANUAL:
        return MANUAL[eid]
    s = name.lower().replace('–', '-')
    s = re.sub(r'\s*-\s*(medium|wide|close|narrow) grip', r' \1-grip', s)
    head = None
    for en, it in MOVES:
        m = re.search(r'(?<![a-z])' + re.escape(en) + r'(?![a-z])', s)
        if m:
            head = it; s = s[:m.start()] + ' ' + s[m.end():]; break
    if not head:
        return None
    mods = []
    for en, it in MODS:
        m = re.search(r'(?<![a-z])' + re.escape(en) + r'(?![a-z])', s)
        if m and it not in mods:
            mods.append(it); s = s[:m.start()] + ' ' + s[m.end():]
    rest = [w for w in re.split(r'[\s\-_/,()]+', s) if w and w not in ('with', 'on', 'the', 'a', 'to', 'and', 'grip', 'version', 'medium', 'of', 'from', 'in', 'up', 'down', 'attachment')]
    if head == 'Panca' and not any(m.startswith('su panca') for m in mods):
        head = 'Panca piana'
    mods = [m for m in mods if not (head.startswith('Panca') and m.startswith('su panca') and m.endswith(('piana',)))]
    if head == 'Panca' or head.startswith('Panca'):
        mods = [m.replace('su panca inclinata', 'inclinata').replace('su panca declinata', 'declinata') for m in mods]
        if any(m in ('inclinata', 'declinata') for m in mods):
            head = 'Panca'; mods = sorted(mods, key=lambda m: 0 if m in ('inclinata', 'declinata') else 1)
    mods = [m for m in mods if m not in head]
    out = head + (' ' + ' '.join(mods) if mods else '')
    if rest:
        out += ' (' + ' '.join(rest) + ')'
    return out[0].upper() + out[1:]
