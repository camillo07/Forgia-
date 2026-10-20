/* =========================================================
   ANATOMIA INTERATTIVA
   Body paths: react-native-body-highlighter (MIT © 2022 ELABBASSI Hicham) — data/body-LICENSE.txt
   Each muscle is split in its parts (e.g. chest: upper / middle / lower); tap a muscle to zoom in,
   tap a part to see the best exercises for it. Pinch / drag / wheel to zoom and move.
   ========================================================= */
const BODY = /*__BODY__*/{};
const AN_CX = { front: 362, back: 1086 };
const L3 = o => (o && (o[lang()] || o.it)) || '';

const AN_G = {
  petto: { n: { it: 'Petto', en: 'Chest', es: 'Pecho' }, mk: ['chest'], lib: 'chest' },
  spalle: { n: { it: 'Spalle', en: 'Shoulders', es: 'Hombros' }, mk: ['shoulders'], lib: 'shoulders' },
  bicipiti: { n: { it: 'Bicipiti', en: 'Biceps', es: 'Bíceps' }, mk: ['biceps'], lib: 'biceps' },
  tricipiti: { n: { it: 'Tricipiti', en: 'Triceps', es: 'Tríceps' }, mk: ['triceps'], lib: 'triceps' },
  avambracci: { n: { it: 'Avambracci', en: 'Forearms', es: 'Antebrazos' }, mk: ['forearms'], lib: 'forearms' },
  addome: { n: { it: 'Addome', en: 'Abs', es: 'Abdomen' }, mk: ['abdominals'], lib: 'core' },
  trapezio: { n: { it: 'Trapezio', en: 'Traps', es: 'Trapecio' }, mk: ['traps'], lib: 'back' },
  dorsali: { n: { it: 'Dorsali', en: 'Lats & upper back', es: 'Dorsales' }, mk: ['lats', 'middle back'], lib: 'back' },
  lombari: { n: { it: 'Lombari', en: 'Lower back', es: 'Lumbares' }, mk: ['lower back'], lib: 'back' },
  glutei: { n: { it: 'Glutei', en: 'Glutes', es: 'Glúteos' }, mk: ['glutes', 'abductors'], lib: 'glutes' },
  quadricipiti: { n: { it: 'Quadricipiti', en: 'Quads', es: 'Cuádriceps' }, mk: ['quadriceps'], lib: 'quads' },
  femorali: { n: { it: 'Femorali', en: 'Hamstrings', es: 'Isquios' }, mk: ['hamstrings'], lib: 'hams' },
  adduttori: { n: { it: 'Adduttori', en: 'Adductors', es: 'Aductores' }, mk: ['adductors'], lib: 'glutes' },
  polpacci: { n: { it: 'Polpacci', en: 'Calves', es: 'Gemelos' }, mk: ['calves'], lib: 'calves' },
};
const R_ = (g, it, en, es, dit, den, des, ex) => ({ g, n: { it, en, es }, d: { it: dit, en: den, es: des }, ex });
const AN_R = {
  petto_alto: R_('petto', 'Fascio alto (clavicolare)', 'Upper chest (clavicular)', 'Pecho superior (clavicular)',
    'Parte sotto la clavicola. Si allena con panche e croci inclinate (30–45°) e croci dal basso verso l\'alto.', 'Below the collarbone. Train it with incline presses and flyes (30–45°) and low-to-high cable flyes.', 'Bajo la clavícula. Se entrena con press y aperturas inclinadas (30–45°) y cruces de polea de abajo arriba.',
    ['Incline_Dumbbell_Press', 'Barbell_Incline_Bench_Press_-_Medium_Grip', 'x_cable_fly_low_high', 'x_incline_machine_press', 'Smith_Machine_Incline_Bench_Press', 'Incline_Dumbbell_Flyes']),
  petto_medio: R_('petto', 'Fascio centrale (sternale)', 'Middle chest (sternal)', 'Pecho medio (esternal)',
    'La parte più grande del petto. Panca piana, chest press e croci orizzontali.', 'The largest part of the chest. Flat bench, chest press and horizontal flyes.', 'La parte más grande del pecho. Press plano, press en máquina y aperturas horizontales.',
    ['Dumbbell_Bench_Press', 'Barbell_Bench_Press_-_Medium_Grip', 'Leverage_Chest_Press', 'Cable_Crossover', 'Butterfly', 'Smith_Machine_Bench_Press']),
  petto_basso: R_('petto', 'Fascio basso (costale)', 'Lower chest (costal)', 'Pecho inferior (costal)',
    'Fibre basse, verso l\'addome. Dip, panca declinata e croci dall\'alto verso il basso.', 'Lower fibres towards the abs. Dips, decline press and high-to-low flyes.', 'Fibras bajas, hacia el abdomen. Fondos, press declinado y cruces de arriba abajo.',
    ['Dips_-_Chest_Version', 'Decline_Dumbbell_Bench_Press', 'Decline_Barbell_Bench_Press', 'Decline_Dumbbell_Flyes']),
  delt_ant: R_('spalle', 'Deltoide anteriore', 'Front delt', 'Deltoides anterior',
    'Davanti alla spalla. Lavora già molto con tutte le spinte del petto: spesso basta quello.', 'Front of the shoulder. Already worked hard by every chest press: often that\'s enough.', 'Parte delantera del hombro. Ya trabaja mucho con todos los press de pecho: a menudo basta con eso.',
    ['Dumbbell_Shoulder_Press', 'Machine_Shoulder_Military_Press', 'Barbell_Shoulder_Press', 'Front_Cable_Raise']),
  delt_lat: R_('spalle', 'Deltoide laterale', 'Side delt', 'Deltoides lateral',
    'Il lato della spalla: è quello che allarga le spalle. Alzate laterali, meglio al cavo.', 'Side of the shoulder: it\'s what makes shoulders wider. Lateral raises, best on cables.', 'Lateral del hombro: es lo que ensancha los hombros. Elevaciones laterales, mejor en polea.',
    ['x_cable_lateral_raise', 'Cable_Seated_Lateral_Raise', 'Side_Lateral_Raise', 'Seated_Side_Lateral_Raise', 'Upright_Cable_Row']),
  delt_post: R_('spalle', 'Deltoide posteriore', 'Rear delt', 'Deltoides posterior',
    'Dietro la spalla: dà spessore e postura. Reverse fly, face pull e rematori a gomiti larghi.', 'Back of the shoulder: adds depth and posture. Reverse flyes, face pulls and wide-elbow rows.', 'Parte trasera del hombro: da grosor y postura. Pájaros, face pull y remos con codos abiertos.',
    ['Reverse_Machine_Flyes', 'Face_Pull', 'Cable_Rear_Delt_Fly', 'Bent_Over_Dumbbell_Rear_Delt_Raise_With_Head_On_Bench']),
  bic_lungo: R_('bicipiti', 'Capo lungo', 'Long head', 'Cabeza larga',
    'Capo esterno del bicipite: dà il "picco". Curl con il braccio dietro il corpo (inclinato, Bayesian).', 'Outer head of the biceps: builds the peak. Curls with the arm behind the body (incline, Bayesian).', 'Cabeza externa del bíceps: da el "pico". Curl con el brazo detrás del cuerpo (inclinado, Bayesian).',
    ['x_bayesian_curl', 'Incline_Dumbbell_Curl', 'Dumbbell_Bicep_Curl', 'Barbell_Curl']),
  bic_corto: R_('bicipiti', 'Capo corto', 'Short head', 'Cabeza corta',
    'Capo interno: dà spessore al braccio. Curl con il braccio davanti al corpo (Scott, concentrato).', 'Inner head: adds arm thickness. Curls with the arm in front of the body (preacher, concentration).', 'Cabeza interna: da grosor al brazo. Curl con el brazo delante del cuerpo (Scott, concentrado).',
    ['Machine_Preacher_Curls', 'Preacher_Curl', 'Spider_Curl', 'Concentration_Curls']),
  tri_lungo: R_('tricipiti', 'Capo lungo', 'Long head', 'Cabeza larga',
    'Il capo più grande: si allunga solo con il braccio sopra la testa. Estensioni overhead e french press.', 'The largest head: fully stretched only with the arm overhead. Overhead extensions and skull crushers.', 'La cabeza más grande: solo se estira con el brazo por encima de la cabeza. Extensiones overhead y press francés.',
    ['Cable_Rope_Overhead_Triceps_Extension', 'Standing_Dumbbell_Triceps_Extension', 'EZ-Bar_Skullcrusher']),
  tri_laterale: R_('tricipiti', 'Capo laterale', 'Lateral head', 'Cabeza lateral',
    'La parte esterna del "ferro di cavallo": è quella che si vede di più di lato. Pushdown, dip e panca presa stretta.', 'The outer part of the horseshoe: the one you see most from the side. Pushdowns, dips and close-grip bench.', 'La parte externa de la "herradura": la que más se ve de lado. Extensiones en polea, fondos y press cerrado.',
    ['Triceps_Pushdown', 'Triceps_Pushdown_-_V-Bar_Attachment', 'Dips_-_Triceps_Version', 'Close-Grip_Barbell_Bench_Press']),
  tri_mediale: R_('tricipiti', 'Capo mediale', 'Medial head', 'Cabeza medial',
    'Sotto gli altri due, vicino al gomito. Lavora in tutte le estensioni, di più nell\'ultima parte del movimento e a presa inversa.', 'Under the other two, near the elbow. Works in every extension, more at lockout and with a reverse grip.', 'Bajo las otras dos, cerca del codo. Trabaja en todas las extensiones, más al final del movimiento y con agarre invertido.',
    ['Reverse_Grip_Triceps_Pushdown', 'Tricep_Dumbbell_Kickback', 'Triceps_Pushdown_-_Rope_Attachment', 'Cable_One_Arm_Tricep_Extension']),
  avb_brachio: R_('avambracci', 'Brachioradiale', 'Brachioradialis', 'Braquiorradial',
    'Tra braccio e avambraccio, insieme al brachiale: dà spessore visto di lato. Curl a martello e curl inverso.', 'Between arm and forearm, with the brachialis: thickness seen from the side. Hammer and reverse curls.', 'Entre brazo y antebrazo, junto al braquial: grosor visto de lado. Curl martillo y curl invertido.',
    ['Hammer_Curls', 'Cable_Hammer_Curls_-_Rope_Attachment', 'Reverse_Barbell_Curl']),
  avb_flessori: R_('avambracci', 'Flessori', 'Flexors', 'Flexores',
    'Lato interno dell\'avambraccio: presa e polsi. Wrist curl a palmi in su e farmer walk.', 'Inner forearm: grip and wrists. Palms-up wrist curls and farmer\'s walks.', 'Cara interna del antebrazo: agarre y muñecas. Curl de muñeca palmas arriba y paseo del granjero.',
    ['Seated_Dumbbell_Palms-Up_Wrist_Curl', 'Cable_Wrist_Curl', 'Farmers_Walk']),
  avb_estensori: R_('avambracci', 'Estensori', 'Extensors', 'Extensores',
    'Lato esterno dell\'avambraccio. Wrist curl a palmi in giù e curl inverso.', 'Outer forearm. Palms-down wrist curls and reverse curls.', 'Cara externa del antebrazo. Curl de muñeca palmas abajo y curl invertido.',
    ['Seated_Dumbbell_Palms-Down_Wrist_Curl', 'Reverse_Cable_Curl', 'Reverse_Barbell_Curl']),
  addome_alto: R_('addome', 'Addome alto', 'Upper abs', 'Abdomen superior',
    'Parte alta del retto addominale. Crunch al cavo e alla macchina: arrotola la colonna.', 'Upper rectus abdominis. Cable and machine crunches: curl your spine.', 'Parte alta del recto abdominal. Crunch en polea y en máquina: enrolla la columna.',
    ['Cable_Crunch', 'Ab_Crunch_Machine', 'Crunches']),
  addome_basso: R_('addome', 'Addome basso', 'Lower abs', 'Abdomen inferior',
    'Lavora quando porti il bacino verso il petto. Leg raise e reverse crunch.', 'Works when you bring the pelvis towards the chest. Leg raises and reverse crunches.', 'Trabaja al llevar la pelvis hacia el pecho. Elevaciones de piernas y crunch inverso.',
    ['Hanging_Leg_Raise', 'Reverse_Crunch', 'Cable_Reverse_Crunch', 'Seated_Leg_Tucks']),
  obliqui: R_('addome', 'Obliqui', 'Obliques', 'Oblicuos',
    'Ai lati dell\'addome. Rotazioni e anti-rotazioni al cavo (Pallof, woodchop) e piegamenti laterali.', 'Sides of the waist. Cable rotations and anti-rotations (Pallof, woodchop) and side bends.', 'A los lados del abdomen. Rotaciones y antirrotaciones en polea (Pallof, leñador) e inclinaciones laterales.',
    ['Pallof_Press', 'Standing_Cable_Wood_Chop', 'Dumbbell_Side_Bend', 'Cable_Russian_Twists']),
  serrato: R_('addome', 'Dentato anteriore', 'Serratus anterior', 'Serrato anterior',
    'Sotto il petto, sulle costole. Lavora quando spingi le scapole in avanti.', 'Below the chest, on the ribs. Works when you push your shoulder blades forward.', 'Debajo del pecho, sobre las costillas. Trabaja al llevar las escápulas hacia delante.',
    ['Smith_Incline_Shoulder_Raise', 'Barbell_Incline_Shoulder_Raise', 'Pushups']),
  trap_alto: R_('trapezio', 'Trapezio alto', 'Upper traps', 'Trapecio superior',
    'Dal collo alle spalle. Scrollate. Se vuoi spalle che sembrino più larghe, non esagerare.', 'From neck to shoulders. Shrugs. If you want wider-looking shoulders, don\'t overdo it.', 'Del cuello a los hombros. Encogimientos. Si quieres hombros que parezcan más anchos, no te pases.',
    ['Dumbbell_Shrug', 'Barbell_Shrug', 'Cable_Shrugs']),
  trap_medio: R_('trapezio', 'Trapezio medio', 'Middle traps', 'Trapecio medio',
    'Tra le scapole: spessore della schiena. Rematori a gomiti larghi e face pull, con fermo in contrazione.', 'Between the shoulder blades: back thickness. Wide-elbow rows and face pulls, pausing at the squeeze.', 'Entre las escápulas: grosor de espalda. Remos con codos abiertos y face pull, con pausa en contracción.',
    ['x_chest_supported_row', 'Face_Pull', 'T-Bar_Row_with_Handle', 'Seated_Cable_Rows']),
  trap_basso: R_('trapezio', 'Trapezio basso', 'Lower traps', 'Trapecio inferior',
    'Tiene le scapole basse e protegge le spalle. Scapular pull-up e rematori proni.', 'Keeps the shoulder blades down and protects the shoulders. Scapular pull-ups and prone rows.', 'Mantiene las escápulas abajo y protege los hombros. Dominadas escapulares y remo prono.',
    ['Scapular_Pull-Up', 'Incline_Bench_Pull', 'Face_Pull']),
  dorsali: R_('dorsali', 'Gran dorsale', 'Lats', 'Dorsal ancho',
    'Il muscolo più largo della schiena: crea la forma a V. Trazioni, lat machine e pulldown a braccia tese.', 'The widest back muscle: creates the V-shape. Pull-ups, lat pulldowns and straight-arm pulldowns.', 'El músculo más ancho de la espalda: crea la forma en V. Dominadas, jalón al pecho y pullover en polea.',
    ['Pullups', 'Wide-Grip_Lat_Pulldown', 'x_neutral_lat_pulldown', 'Straight-Arm_Pulldown', 'One_Arm_Lat_Pulldown', 'Weighted_Pull_Ups']),
  grande_rotondo: R_('dorsali', 'Grande rotondo', 'Teres major', 'Redondo mayor',
    'Sotto l\'ascella, aiuta i dorsali. Rematori con gomiti stretti e pulley.', 'Under the armpit, assists the lats. Close-elbow rows and seated cable rows.', 'Bajo la axila, ayuda a los dorsales. Remos con codos pegados y remo en polea.',
    ['Seated_Cable_Rows', 'One-Arm_Dumbbell_Row', 'Close-Grip_Front_Lat_Pulldown', 'x_seated_machine_row']),
  infraspinato: R_('dorsali', 'Infraspinato', 'Infraspinatus', 'Infraespinoso',
    'Sulla scapola, parte della cuffia dei rotatori. Rotazioni esterne e face pull: proteggono la spalla.', 'On the shoulder blade, part of the rotator cuff. External rotations and face pulls protect the shoulder.', 'Sobre la escápula, parte del manguito rotador. Rotaciones externas y face pull: protegen el hombro.',
    ['External_Rotation_with_Cable', 'Face_Pull', 'Reverse_Flyes_With_External_Rotation']),
  lombari: R_('lombari', 'Erettori spinali', 'Spinal erectors', 'Erectores espinales',
    'Lungo la colonna: stabilità e postura. Hyperextension, stacco rumeno e good morning.', 'Along the spine: stability and posture. Back extensions, Romanian deadlifts and good mornings.', 'A lo largo de la columna: estabilidad y postura. Hiperextensiones, peso muerto rumano y buenos días.',
    ['Hyperextensions_Back_Extensions', 'x_back_ext_45', 'Romanian_Deadlift', 'Good_Morning']),
  glu_grande: R_('glutei', 'Grande gluteo', 'Gluteus maximus', 'Glúteo mayor',
    'Il muscolo più forte del corpo. Hip thrust, affondi bulgari e stacco rumeno.', 'The strongest muscle in the body. Hip thrusts, Bulgarian split squats and Romanian deadlifts.', 'El músculo más fuerte del cuerpo. Hip thrust, sentadilla búlgara y peso muerto rumano.',
    ['Barbell_Hip_Thrust', 'x_hip_thrust_machine', 'x_bulgarian_split_squat', 'Romanian_Deadlift', 'x_reverse_hack']),
  glu_medio: R_('glutei', 'Medio gluteo', 'Gluteus medius', 'Glúteo medio',
    'Lato del bacino: stabilità e forma dei fianchi. Abductor alla macchina e slanci laterali.', 'Side of the pelvis: stability and hip shape. Abductor machine and side leg raises.', 'Lateral de la pelvis: estabilidad y forma de la cadera. Máquina de abductores y elevaciones laterales.',
    ['Thigh_Abductor', 'Side_Leg_Raises', 'x_bulgarian_split_squat']),
  quad_retto: R_('quadricipiti', 'Retto femorale', 'Rectus femoris', 'Recto femoral',
    'Al centro della coscia, l\'unico che lavora anche sull\'anca. Leg extension e sissy squat.', 'Centre of the thigh, the only one that also crosses the hip. Leg extensions and sissy squats.', 'En el centro del muslo, el único que también actúa sobre la cadera. Extensión de cuádriceps y sissy squat.',
    ['Leg_Extensions', 'Weighted_Sissy_Squat', 'Front_Squat_Clean_Grip']),
  quad_laterale: R_('quadricipiti', 'Vasto laterale', 'Vastus lateralis', 'Vasto lateral',
    'Lato esterno: dà larghezza alla coscia. Hack squat, pressa e squat.', 'Outer thigh: adds width. Hack squats, leg press and squats.', 'Cara externa: da anchura al muslo. Hack squat, prensa y sentadilla.',
    ['Hack_Squat', 'Leg_Press', 'x_pendulum_squat', 'Barbell_Squat']),
  quad_mediale: R_('quadricipiti', 'Vasto mediale', 'Vastus medialis', 'Vasto medial',
    'La "goccia" sopra il ginocchio. Squat profondi, affondi bulgari e leg extension.', 'The teardrop above the knee. Deep squats, Bulgarian split squats and leg extensions.', 'La "gota" sobre la rodilla. Sentadillas profundas, búlgaras y extensión de cuádriceps.',
    ['x_bulgarian_split_squat', 'Hack_Squat', 'Leg_Extensions', 'Front_Squat_Clean_Grip']),
  fem_bicipite: R_('femorali', 'Bicipite femorale', 'Biceps femoris', 'Bíceps femoral',
    'Lato esterno del femorale. Leg curl (meglio seduto) e stacco rumeno.', 'Outer hamstring. Leg curls (seated is best) and Romanian deadlifts.', 'Isquio externo. Curl femoral (mejor sentado) y peso muerto rumano.',
    ['Seated_Leg_Curl', 'Lying_Leg_Curls', 'Romanian_Deadlift']),
  fem_semi: R_('femorali', 'Semitendinoso e semimembranoso', 'Semitendinosus & semimembranosus', 'Semitendinoso y semimembranoso',
    'Lato interno del femorale. Leg curl seduto, stacco a gambe tese e glute-ham raise.', 'Inner hamstring. Seated leg curls, stiff-legged deadlifts and glute-ham raises.', 'Isquio interno. Curl femoral sentado, peso muerto piernas rígidas y glute-ham raise.',
    ['Seated_Leg_Curl', 'Stiff-Legged_Barbell_Deadlift', 'Glute_Ham_Raise']),
  adduttori: R_('adduttori', 'Adduttori', 'Adductors', 'Aductores',
    'Interno coscia. Macchina degli adduttori e stacco sumo.', 'Inner thigh. Adductor machine and sumo deadlifts.', 'Cara interna del muslo. Máquina de aductores y peso muerto sumo.',
    ['Thigh_Adductor', 'Cable_Hip_Adduction', 'Sumo_Deadlift']),
  pol_gastro: R_('polpacci', 'Gastrocnemio', 'Gastrocnemius', 'Gastrocnemio',
    'Il polpaccio visibile, con due capi. Calf in piedi o alla pressa, a ginocchia tese.', 'The visible calf, two heads. Standing or leg-press calf raises, knees straight.', 'El gemelo visible, dos cabezas. Elevaciones de pie o en prensa, con las rodillas estiradas.',
    ['Standing_Calf_Raises', 'Calf_Press_On_The_Leg_Press_Machine', 'Smith_Machine_Calf_Raise']),
  pol_soleo: R_('polpacci', 'Soleo', 'Soleus', 'Sóleo',
    'Sotto il gastrocnemio: lavora a ginocchia piegate. Calf da seduto.', 'Under the gastrocnemius: works with bent knees. Seated calf raises.', 'Bajo el gemelo: trabaja con las rodillas flexionadas. Elevaciones sentado.',
    ['Seated_Calf_Raise', 'Barbell_Seated_Calf_Raise']),
  pol_tibiale: R_('polpacci', 'Tibiale anteriore', 'Tibialis anterior', 'Tibial anterior',
    'Davanti alla tibia: protegge caviglie e ginocchia nella corsa. Sollevamenti della punta del piede (tibialis raise), anche a corpo libero contro il muro.', 'Front of the shin: protects ankles and knees when running. Toe raises (tibialis raises), even bodyweight against a wall.', 'Delante de la tibia: protege tobillos y rodillas al correr. Elevaciones de puntas (tibialis raise), incluso con el peso corporal contra la pared.',
    []),
};
IC.refresh = '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>';
IC.body = '<circle cx="12" cy="4.5" r="2"/><path d="M5 8.5h14M12 8.5v6M8.5 21l3.5-6.5 3.5 6.5"/>';
LAYER_RENDER.anatomy = layerAnatomy;
const AN_PAL = ['#ff7a2f', '#3ccfb4', '#a98bff', '#ffc15c', '#5aa8ff', '#ff6b9a'];
const AN_BASE = '#3a424e';

/* ---------- geometry: measure every path once, then assign it (or a clipped slice of it) to a part ---------- */
let AN_BB = null; const AN_PARTS = {};
function anMeasure() {
  if (AN_BB) return AN_BB;
  AN_BB = new Map();
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', '10'); svg.setAttribute('height', '10'); svg.style.cssText = 'position:absolute;left:-99px;top:0;visibility:hidden';
  document.body.appendChild(svg);
  const all = [BODY.oF, BODY.oB];
  for (const side of ['front', 'back']) for (const m of BODY[side] || []) all.push(...m.L, ...m.R, ...m.C);
  for (const d of all) { if (!d || AN_BB.has(d)) continue; const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); svg.appendChild(p); let b; try { b = p.getBBox(); } catch (e) { b = { x: 0, y: 0, width: 0, height: 0 }; } AN_BB.set(d, { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2, a: b.width * b.height }); }
  svg.remove();
  return AN_BB;
}
function anParts(side) {
  if (AN_PARTS[side]) return AN_PARTS[side];
  const BB = anMeasure(), cx = AN_CX[side], out = [];
  const outer = d => Math.abs(BB.get(d).cx - cx), area = d => BB.get(d).a, cy = d => BB.get(d).cy;
  const one = (s, d, lr, r) => out.push({ s, d, lr, r, g: r ? AN_R[r].g : null });
  /* split one path in slices with clip polygons; f(bb, outerX, innerX) returns [[region, points], ...] + separator lines */
  const slice = (s, d, lr, f) => {
    const b = BB.get(d), P = 6, xo = lr === 'L' ? b.x - P : b.x + b.w + P, xi = lr === 'L' ? b.x + b.w + P : b.x - P;
    const { parts, seps } = f(b, xo, xi, P);
    parts.forEach(([r, pts], i) => out.push({ s, d, lr, r, g: AN_R[r].g, clip: pts.map(p => p.map(v => Math.round(v * 10) / 10).join(',')).join(' '), k: i }));
  };
  const bandsY = (rs, fr) => (b, xo, xi, P) => {   // horizontal bands, slanted: outer side higher
    const ys = fr.map(([fi, fo]) => [b.y + b.h * fi, b.y + b.h * fo]);
    const top = b.y - P, bot = b.y + b.h + P, parts = [], seps = [];
    let prev = [[xi, top], [xo, top]];
    rs.forEach((r, i) => {
      const next = i < ys.length ? [[xo, ys[i][1]], [xi, ys[i][0]]] : [[xo, bot], [xi, bot]];
      parts.push([r, [...prev, ...next]]);
      if (i < ys.length) seps.push([[xi, ys[i][0]], [xo, ys[i][1]]]);
      prev = [[xi, next[1][1]], [xo, next[0][1]]];
    });
    return { parts, seps };
  };
  const halvesX = (rOuter, rInner, f = 0.5) => (b, xo, xi, P) => {
    const xm = xo < xi ? b.x + b.w * (1 - f) : b.x + b.w * f, top = b.y - P, bot = b.y + b.h + P;
    const xmo = xo < xi ? xm - b.w * 0.06 : xm + b.w * 0.06;   // slight slant
    return { parts: [[rOuter, [[xo, top], [xmo, top], [xm, bot], [xo, bot]]], [rInner, [[xmo, top], [xi, top], [xi, bot], [xm, bot]]]], seps: [[[xmo, b.y], [xm, b.y + b.h]]] };
  };
  for (const m of BODY[side] || []) {
    const s = m.s;
    for (const lr of ['L', 'R']) {
      const ds = m[lr]; if (!ds.length) continue;
      const k = side + ':' + s;
      if (k === 'front:chest') ds.forEach(d => slice(s, d, lr, bandsY(['petto_alto', 'petto_medio', 'petto_basso'], [[0.44, 0.32], [0.8, 0.7]])));
      else if (k === 'front:deltoids') ds.forEach(d => slice(s, d, lr, halvesX('delt_lat', 'delt_ant', 0.48)));
      else if (k === 'front:biceps') ds.forEach(d => slice(s, d, lr, halvesX('bic_lungo', 'bic_corto')));
      else if (k === 'back:trapezius') ds.forEach(d => slice(s, d, lr, bandsY(['trap_alto', 'trap_medio', 'trap_basso'], [[0.3, 0.27], [0.6, 0.6]])));
      else if (k === 'front:triceps') ds.forEach(d => one(s, d, lr, 'tri_lungo'));
      else if (k === 'front:trapezius') ds.forEach(d => one(s, d, lr, 'trap_alto'));
      else if (k === 'back:deltoids') ds.forEach(d => one(s, d, lr, 'delt_post'));
      else if (s === 'adductors') ds.forEach(d => one(s, d, lr, 'adduttori'));
      else if (k === 'front:tibialis') ds.forEach(d => one(s, d, lr, 'pol_tibiale'));
      else if (k === 'front:forearm') { const o = ds.slice().sort((a, b) => outer(b) - outer(a)); o.forEach((d, i) => one(s, d, lr, i === 0 ? 'avb_brachio' : 'avb_flessori')); }
      else if (k === 'back:forearm') { const o = ds.slice().sort((a, b) => cy(a) - cy(b)); o.forEach((d, i) => one(s, d, lr, i === 0 ? 'avb_brachio' : 'avb_estensori')); }
      else if (k === 'front:abs') { const o = ds.slice().sort((a, b) => cy(a) - cy(b)); o.forEach((d, i) => one(s, d, lr, i < 2 ? 'addome_alto' : 'addome_basso')); }
      else if (k === 'front:obliques') { const big = ds.slice().sort((a, b) => area(b) - area(a))[0]; ds.forEach(d => one(s, d, lr, d === big ? 'obliqui' : 'serrato')); }
      else if (k === 'front:quadriceps') { const o = ds.slice().sort((a, b) => outer(a) - outer(b)); o.forEach((d, i) => one(s, d, lr, i === 0 ? 'quad_mediale' : i === o.length - 1 ? 'quad_laterale' : 'quad_retto')); }
      else if (k === 'front:calves') { const o = ds.slice().sort((a, b) => outer(a) - outer(b)); o.forEach((d, i) => one(s, d, lr, i === 0 ? 'pol_gastro' : 'pol_soleo')); }
      else if (k === 'back:calves') { const o = ds.slice().sort((a, b) => cy(a) - cy(b)); o.forEach((d, i) => one(s, d, lr, i < 2 ? 'pol_gastro' : 'pol_soleo')); }
      else if (k === 'back:upper-back') { const o = ds.slice().sort((a, b) => area(b) - area(a)); const rest = o.slice(1).sort((a, b) => cy(a) - cy(b)); one(s, o[0], lr, 'dorsali'); rest.forEach((d, i) => one(s, d, lr, i === 0 ? 'infraspinato' : 'grande_rotondo')); }
      else if (k === 'back:triceps') { const o = ds.slice().sort((a, b) => outer(a) - outer(b)); o.forEach((d, i) => one(s, d, lr, i === 0 ? 'tri_lungo' : i === 1 ? 'tri_laterale' : 'tri_mediale')); }
      else if (k === 'back:lower-back') { const o = ds.slice().sort((a, b) => area(b) - area(a)); o.forEach((d, i) => one(s, d, lr, i === 0 ? 'lombari' : 'obliqui')); }
      else if (k === 'back:gluteal') { const o = ds.slice().sort((a, b) => area(b) - area(a)); o.forEach((d, i) => one(s, d, lr, i === 0 ? 'glu_grande' : 'glu_medio')); }
      else if (k === 'back:hamstring') { const o = ds.slice().sort((a, b) => outer(b) - outer(a)); o.forEach((d, i) => one(s, d, lr, i < 2 ? 'fem_bicipite' : 'fem_semi')); }
      else ds.forEach(d => one(s, d, lr, null));
    }
    m.C.forEach(d => one(s, d, 'C', null));
  }
  return (AN_PARTS[side] = out);
}
function anBodyBox(side) { const b = anMeasure().get(side === 'front' ? BODY.oF : BODY.oB); return [b.x - 18, b.y - 14, b.w + 36, b.h + 28]; }
function anGroupBox(side, g) {
  const BB = anMeasure(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
  for (const p of anParts(side)) if (p.g === g && p.d) { const b = BB.get(p.d); x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); n += b.a; }
  return n ? { box: [x0, y0, x1 - x0, y1 - y0], area: n } : null;
}

/* ---------- weekly sets per group (primary muscle 1, secondary 0.5) ---------- */
function anGroupSets(weekStart = startOfWeek(Date.now())) {
  const out = {}; for (const g in AN_G) out[g] = 0;
  for (const w of S.workouts) {
    if (w.start < weekStart || w.start >= weekStart + 7 * DAY) continue;
    for (const e of w.ex) {
      const x = ex(e.id), n = (e.sets || []).filter(isWork).length; if (!n) continue;
      for (const g in AN_G) { const mk = AN_G[g].mk; if ((x.p || []).some(m => mk.includes(m))) out[g] += n; else if ((x.s || []).some(m => mk.includes(m))) out[g] += n * 0.5; }
    }
  }
  return out;
}

/* ---------- SVG ---------- */
function anSVG(side, o = {}) {
  const parts = anParts(side), idp = o.idp || 'an', sets = o.sets || {}, heat = o.heat !== false;
  const vb = (o.vb || anBodyBox(side)).map(v => Math.round(v * 10) / 10).join(' ');
  const defs = [], body = [];
  let ci = 0;
  for (const p of parts) {
    if (p.sep) { body.push(`<polyline class="an-sep" data-g="${p.g}" points="${p.sep}"/>`); continue; }
    let clip = '';
    if (p.clip) { const id = `${idp}c${ci++}`; defs.push(`<clipPath id="${id}"><polygon points="${p.clip}"/></clipPath>`); clip = ` clip-path="url(#${id})"`; }
    if (!p.r) { body.push(`<path class="an-b" d="${p.d}"/>`); continue; }
    const fill = heat ? musCol(sets[p.g] || 0) : AN_BASE;
    body.push(`<path class="an-r" data-r="${p.r}" data-g="${p.g}" d="${p.d}" fill="${fill}" style="--hf:${fill}"${clip}/>`);
  }
  return `<svg class="an-svg ${o.cls || ''}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${side === 'front' ? 'Muscoli davanti' : 'Muscoli dietro'}"><defs>${defs.join('')}</defs><path class="an-out" d="${side === 'front' ? BODY.oF : BODY.oB}"/>${body.join('')}</svg>`;
}
/* small static maps (Progressi → Serie per muscolo) */
function anMiniHTML(weekStart) {
  if (!BODY.front) return '';
  const sets = anGroupSets(weekStart);
  return `<button class="bm-wrap an-mini" data-a="anatOpen" aria-label="Apri la mappa dei muscoli"><div data-nt>${anSVG('front', { sets, idp: 'mf' })}<span>Davanti</span></div><div data-nt>${anSVG('back', { sets, idp: 'mb' })}<span>Dietro</span></div></button>`;
}

/* ---------- LAYER ---------- */
function anRegionsOf(g) { return Object.keys(AN_R).filter(r => AN_R[r].g === g); }
function anColorOf(g, r) { return AN_PAL[anRegionsOf(g).indexOf(r) % AN_PAL.length]; }
function anPanelHTML(l) {
  const sets = l.sets || {};
  if (!l.g) {
    return `<div class="an-p-in"><div class="row" style="align-items:flex-start"><div class="grow"><b class="an-t">Tocca un muscolo</b><div class="small muted">Si ingrandisce e vedi come è diviso. Poi tocca una parte per gli esercizi migliori. Con due dita ingrandisci e sposti.</div></div></div>
      <div class="bm-leg" style="margin:10px 0 6px"><span><i style="background:#2a313c"></i>0</span><span><i style="background:#6b3a22"></i>1–4</span><span><i style="background:#c4561f"></i>5–9</span><span><i style="background:#ff7a2f"></i>10–20</span><span><i style="background:#ffc15c"></i>oltre 20</span></div>
      <div class="small faint" style="margin-bottom:8px">Colori: serie allenanti di questa settimana</div>
      <div class="chips an-chips">${Object.keys(AN_G).map(g => `<button class="chip" data-a="anatGroup" data-g="${g}">${esc(L3(AN_G[g].n))} <small class="tnum">${fmtN(sets[g] || 0, 1)}</small></button>`).join('')}</div></div>`;
  }
  const G = AN_G[l.g], regs = anRegionsOf(l.g);
  const head = `<div class="row" style="align-items:center;gap:8px"><button class="icon-btn" data-a="anatBack" aria-label="Indietro">${icon('back', 20)}</button><div class="grow"><b class="an-t" data-nt>${esc(L3(G.n))}</b><div class="small muted"><span class="tnum">${fmtN(sets[l.g] || 0, 1)}</span> serie questa settimana</div></div></div>
    <div class="chips an-chips" style="margin-top:8px">${regs.map(r => `<button class="chip an-rc ${l.r === r ? 'on' : ''}" data-a="anatRegion" data-r="${r}" style="--rc:${anColorOf(l.g, r)}"><i></i><span data-nt>${esc(L3(AN_R[r].n))}</span></button>`).join('')}</div>`;
  if (!l.r) return `<div class="an-p-in">${head}<div class="small muted" style="margin-top:10px">Tocca una parte del muscolo (o un colore qui sopra) per vedere a cosa serve e gli esercizi migliori.</div>
    <button class="btn sm ghost" data-a="anatLib" data-g="${l.g}" style="margin-top:8px">${icon('search', 15)} Tutti gli esercizi</button></div>`;
  const R = AN_R[l.r], inRt = new Set(S.routines.flatMap(rt => rt.ex.map(e => e.id)));
  const list = R.ex.filter(id => EXMAP.has(id) || (S.customEx || []).some(x => x.id === id));
  return `<div class="an-p-in">${head}
    <div class="an-reg" style="--rc:${anColorOf(l.g, l.r)}"><b data-nt>${esc(L3(R.n))}</b><p data-nt>${esc(L3(R.d))}</p></div>
    ${list.length ? `<div class="eyebrow" style="margin:12px 0 6px">Esercizi migliori</div><div class="list">${list.map((id, i) => { const x = ex(id); return `<button class="li" data-a="openEx" data-id="${esc(id)}">${thumbHTML(x)}<div class="grow" style="min-width:0"><div class="t">${esc(x.n)}</div><div class="s">${i === 0 ? '<b style="color:var(--gold)">Il più efficace</b> · ' : ''}${EQUIP_IT[x.e] || ''}${inRt.has(id) ? ' · <span style="color:var(--good)">già in scheda</span>' : ''}</div></div>${icon('chev', 16)}</button>`; }).join('')}</div>` : ''}
    <button class="btn sm ghost" data-a="anatLib" data-g="${l.g}" style="margin-top:8px">${icon('search', 15)} Tutti gli esercizi</button></div>`;
}
function layerAnatomy(l) {
  l.sets = l.sets || anGroupSets();
  const vb = l.vb || anBodyBox(l.side);
  return `<div class="layer anat">${head('Muscoli', 'back', `<div class="seg an-seg" style="width:150px"><button class="${l.side === 'front' ? 'on' : ''}" data-a="anatSide" data-v="front">Davanti</button><button class="${l.side === 'back' ? 'on' : ''}" data-a="anatSide" data-v="back">Dietro</button></div>`)}
    <div class="an-stage ${l.g ? 'focus' : ''}" id="an-stage" data-nt><div class="an-flip" id="an-flip">${anSVG(l.side, { sets: l.sets, vb, idp: 'al', cls: 'an-big' })}</div>
      <div class="an-ctl"><button class="icon-btn" data-a="anatZoom" data-d="1" aria-label="Ingrandisci">${icon('plus', 18)}</button><button class="icon-btn" data-a="anatZoom" data-d="-1" aria-label="Riduci">${icon('minus', 18)}</button><button class="icon-btn" data-a="anatReset" aria-label="Vista intera">${icon('refresh', 17)}</button></div></div>
    <div class="layer-body an-panel" id="an-panel" data-scroll-key="anat">${anPanelHTML(l)}</div>
  </div>`;
}

/* ---------- interaction (pinch, drag, wheel, tap) on the live SVG ---------- */
const AN = { anim: 0 };
function anLayer() { const t = topLayer(); return t && t.type === 'anatomy' ? t : null; }
function anSvgEl() { return document.querySelector('#an-stage .an-big'); }
function anGetVB() { const s = anSvgEl(); return s ? s.getAttribute('viewBox').split(/\s+/).map(Number) : null; }
function anSetVB(v) { const s = anSvgEl(); if (!s) return; s.setAttribute('viewBox', v.map(x => Math.round(x * 10) / 10).join(' ')); const l = anLayer(); if (l) l.vb = v.slice(); }
function anFit(box, pad = 0.18) {   // grow the box to the stage aspect ratio, with padding
  const st = $('#an-stage'); const ar = st ? st.clientWidth / Math.max(1, st.clientHeight) : 0.6;
  let [x, y, w, h] = box; const px = w * pad, py = h * pad; x -= px; y -= py; w += 2 * px; h += 2 * py;
  if (w / h < ar) { const nw = h * ar; x -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y -= (nh - h) / 2; h = nh; }
  return [x, y, w, h];
}
function anAnimTo(to, ms = 520) {
  const from = anGetVB(); if (!from) return;
  cancelAnimationFrame(AN.anim);
  if (!motionOK()) { anSetVB(to); return; }
  const t0 = performance.now(), ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => { const k = Math.min(1, (now - t0) / ms), e = ease(k); anSetVB(from.map((v, i) => v + (to[i] - v) * e)); if (k < 1) AN.anim = requestAnimationFrame(step); };
  AN.anim = requestAnimationFrame(step);
}
function anApplyFocus(l) {
  const st = $('#an-stage'); if (!st) return;
  st.classList.toggle('focus', !!l.g);
  st.querySelectorAll('.an-r').forEach(p => {
    const inG = l.g && p.dataset.g === l.g;
    p.classList.toggle('in', !!inG); p.classList.toggle('sel', !!(inG && l.r && p.dataset.r === l.r)); p.classList.toggle('dimr', !!(inG && l.r && p.dataset.r !== l.r));
    p.style.fill = inG ? anColorOf(l.g, p.dataset.r) : '';
  });
  st.querySelectorAll('.an-sep').forEach(s => s.classList.toggle('in', !!(l.g && s.dataset.g === l.g)));
}
function anPanelSwap(l) {
  const p = $('#an-panel'); if (!p) return;
  p.innerHTML = anPanelHTML(l); p.scrollTop = 0;
  if (motionOK()) { p.classList.remove('swap'); void p.offsetWidth; p.classList.add('swap'); }
}
function anFocus(g, r) {
  const l = anLayer(); if (!l) return;
  if (g) {
    const here = anGroupBox(l.side, g), other = anGroupBox(l.side === 'front' ? 'back' : 'front', g);
    if (!here || (other && other.area > here.area * 2.2)) { anFlip(l.side === 'front' ? 'back' : 'front', () => anFocus(g, r)); return; }
    l.g = g; l.r = r || null; anApplyFocus(l); anPanelSwap(l); anAnimTo(anFit(here.box, 0.22));
    if (l.r) anPulse(l.r);
  } else { l.g = null; l.r = null; anApplyFocus(l); anPanelSwap(l); anAnimTo(anBodyBox(l.side)); }
}
function anPulse(r) {
  if (!motionOK()) return;
  document.querySelectorAll(`#an-stage .an-r[data-r="${r}"]`).forEach(p => { p.classList.remove('pulse'); void p.getBoundingClientRect(); p.classList.add('pulse'); });
}
function anFlip(side, then) {
  const l = anLayer(), f = $('#an-flip'); if (!l || !f) return;
  const swap = () => { l.side = side; l.vb = null; f.innerHTML = anSVG(side, { sets: l.sets, idp: 'al', cls: 'an-big' }); document.querySelectorAll('.an-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === side)); anApplyFocus(l); };
  if (!motionOK()) { swap(); if (then) then(); return; }
  f.classList.add('out');
  setTimeout(() => { swap(); f.classList.remove('out'); f.classList.add('in'); requestAnimationFrame(() => requestAnimationFrame(() => f.classList.remove('in'))); setTimeout(() => { if (then) then(); }, 200); }, 190);
}
function anTap(target) {
  const l = anLayer(); if (!l) return;
  const p = target && target.closest && target.closest('.an-r');
  if (!p) { if (l.g) anFocus(null); return; }
  haptic(10);
  if (l.g !== p.dataset.g) anFocus(p.dataset.g);
  else { l.r = p.dataset.r; anApplyFocus(l); anPanelSwap(l); anPulse(l.r); }
}
function anZoomBy(f, cx, cy) {   // f > 1 zooms in, around the svg point (cx, cy)
  const v = anGetVB(), l = anLayer(); if (!v || !l) return;
  const full = anBodyBox(l.side), nw = Math.min(full[2] * 1.15, Math.max(90, v[2] / f)), k = nw / v[2], nh = v[3] * k;
  if (cx == null) { cx = v[0] + v[2] / 2; cy = v[1] + v[3] / 2; }
  anSetVB([cx - (cx - v[0]) * k, cy - (cy - v[1]) * k, nw, nh]);
}
function anClientToSvg(x, y) { const s = anSvgEl(); if (!s) return [0, 0]; const pt = s.createSVGPoint(); pt.x = x; pt.y = y; const m = s.getScreenCTM(); if (!m) return [0, 0]; const r = pt.matrixTransform(m.inverse()); return [r.x, r.y]; }
function anatAfterRender() {
  const st = $('#an-stage'); if (!st || st.dataset.bound) { if (st) { const l = anLayer(); if (l) anApplyFocus(l); } return; }
  st.dataset.bound = '1';
  const l0 = anLayer(); if (l0) { anApplyFocus(l0); if (!l0.vb) anSetVB(anFit(anBodyBox(l0.side), 0.02)); }
  const P = new Map(); let G = null, lastTap = 0;
  st.addEventListener('pointerdown', ev => {
    if (ev.target.closest('.an-ctl')) return;
    st.setPointerCapture?.(ev.pointerId); P.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    cancelAnimationFrame(AN.anim);
    if (P.size === 1) G = { x0: ev.clientX, y0: ev.clientY, t0: Date.now(), moved: false, vb: anGetVB(), target: ev.target };
    else if (P.size === 2) { const [a, b] = [...P.values()]; G = { pinch: true, d0: Math.hypot(a.x - b.x, a.y - b.y), vb: anGetVB(), mid: anClientToSvg((a.x + b.x) / 2, (a.y + b.y) / 2), moved: true }; }
  });
  st.addEventListener('pointermove', ev => {
    if (!P.has(ev.pointerId) || !G) return; P.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const s = anSvgEl(); if (!s) return;
    if (G.pinch && P.size >= 2) {
      const [a, b] = [...P.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (!G.d0) return;
      const l = anLayer(), full = anBodyBox(l.side), f = d / G.d0, v = G.vb;
      const nw = Math.min(full[2] * 1.15, Math.max(90, v[2] / f)), k = nw / v[2];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, r = s.getBoundingClientRect();
      const sx = (mx - r.left) / r.width, sy = (my - r.top) / r.height;   // keep the pinch midpoint under the fingers
      anSetVB([G.mid[0] - sx * nw, G.mid[1] - sy * v[3] * k, nw, v[3] * k]);
    } else if (!G.pinch) {
      const dx = ev.clientX - G.x0, dy = ev.clientY - G.y0;
      if (!G.moved && Math.hypot(dx, dy) < 7) return;
      G.moved = true; const r = s.getBoundingClientRect(), v = G.vb, kx = v[2] / r.width, ky = v[3] / r.height, k = Math.max(kx, ky);
      anSetVB([v[0] - dx * k, v[1] - dy * k, v[2], v[3]]);
    }
  });
  const up = ev => {
    if (!P.has(ev.pointerId)) return; P.delete(ev.pointerId);
    if (G && !G.pinch && !G.moved && P.size === 0 && Date.now() - G.t0 < 500) {
      const now = Date.now();
      if (now - lastTap < 300 && !(G.target && G.target.closest && G.target.closest('.an-r'))) { lastTap = 0; A.anatReset(); }
      else { lastTap = now; anTap(G.target); }
    }
    if (P.size === 0) G = null; else if (P.size === 1 && G && G.pinch) { const [a] = [...P.values()]; G = { x0: a.x, y0: a.y, t0: 0, moved: true, vb: anGetVB() }; }
  };
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('wheel', ev => { ev.preventDefault(); const [x, y] = anClientToSvg(ev.clientX, ev.clientY); anZoomBy(ev.deltaY < 0 ? 1.15 : 1 / 1.15, x, y); }, { passive: false });
  st.addEventListener('gesturestart', ev => ev.preventDefault());
}

Object.assign(A, {
  anatOpen(el) { pushLayer({ type: 'anatomy', side: (el && el.dataset && el.dataset.side) || 'front', g: null, r: null }); },
  anatSide(el) { const l = anLayer(); if (!l || l.side === el.dataset.v) return; const g = l.g; l.g = null; l.r = null; anPanelSwap(l); anFlip(el.dataset.v, () => { if (g && anGroupBox(el.dataset.v, g)) anFocus(g); else anAnimTo(anFit(anBodyBox(el.dataset.v), 0.02)); }); },
  anatGroup(el) { anFocus(el.dataset.g); },
  anatRegion(el) { const l = anLayer(); if (!l) return; l.r = el.dataset.r; anApplyFocus(l); anPanelSwap(l); anPulse(l.r); },
  anatBack() { anFocus(null); },
  anatZoom(el) { anZoomBy(+el.dataset.d > 0 ? 1.4 : 1 / 1.4); },
  anatReset() { const l = anLayer(); if (!l) return; if (l.g) anFocus(null); else anAnimTo(anFit(anBodyBox(l.side), 0.02)); },
  anatLib(el) { pushLayer({ type: 'picker', mode: 'browse', q: '', g: AN_G[el.dataset.g]?.lib || '', eq: '', sel: [] }); },
});
