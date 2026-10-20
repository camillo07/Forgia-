const acorn = require('acorn'), walk = require('acorn-walk'), fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '../src/js');
const SKIP = new Set(['1b-foods.js', '1c-fooddb.js']);
const out = new Map(); // key -> {n, files}
const PH = '\u0001';
function looksText(s) {
  if (!/[A-Za-zÀ-ÿ]{2}/.test(s)) return false;
  if (/^[\w.$#\-\/:]+$/.test(s) && !/[A-ZÀ-ÿ]/.test(s[0]) && !/[àèéìòù]/.test(s)) return false; // identifier-ish
  if (/^(https?:|data:|#|\.|\/)/.test(s)) return false;
  { const t = s.replace(/\{\d+\}/g, ''); if (/[{}]|=>|\(\)|&&|\|\||===|!==|\w=\S|\w;\S|^[a-z-]+:/.test(t)) return false; if (/;/.test(t) && !/\s/.test(t)) return false; }
  if (/^[a-z-]+:\s*[^ ]+;?$/.test(s)) return false; // css
  if (/^(var\(|rgba?\(|translate|cubic)/.test(s)) return false;
  return true;
}
function add(k, f) {
  k = k.replace(/\s+/g, ' ').trim();
  if (!k || !looksText(k.replace(/\{\d+\}/g, ''))) return;
  if (/^[\{\}\d\s.,:;·\-–—+×%()\/|!?…'"]+$/.test(k.replace(/\{\d+\}/g, ''))) return;
  const e = out.get(k) || { n: 0, f: new Set() }; e.n++; e.f.add(f); out.set(k, e);
}
function processHTML(str, f) {
  // attributes
  for (const m of str.matchAll(/\b(placeholder|aria-label|title|alt)="([^"]*)"/g)) add(numberPH(m[2]), f);
  const noTags = str.replace(/<[^>]*>/g, '\u0002');
  for (const run of noTags.split('\u0002')) add(numberPH(run), f);
}
function numberPH(s) { let i = 0; return s.replace(new RegExp(PH, 'g'), () => '{' + (i++) + '}'); }
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !SKIP.has(f))) {
  const src = fs.readFileSync(path.join(dir, file), 'utf8');
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true });
  walk.full(ast, node => {
    if (node.type === 'TemplateLiteral') {
      const s = node.quasis.map((q, i) => { if (i >= node.expressions.length) return q.value.cooked; const ex = node.expressions[i], code = src.slice(ex.start, ex.end); const htmlish = /^(icon|thumbHTML|gradeChip|favBtn|favChip|head|ring|lineChart|\w+HTML|\w+Html|\w+Chip|\w+Btn|\w+Card|\w+Row|\w+Rows|\w+List|amountOut|macroBar|foodRow)\(/.test(code) || /`[^`]*</.test(code) || /'<|"</.test(code); return q.value.cooked + (htmlish ? '<x>' : PH); }).join('');
      processHTML(s, file);
    } else if (node.type === 'Literal' && typeof node.value === 'string') {
      const v = node.value;
      if (v.includes('<')) processHTML(v, file);
      else if (/\s/.test(v.trim()) || /^[A-ZÀ-Ý]/.test(v) || /[àèéìòù]/.test(v)) add(v, file);
    }
  });
}
const arr = [...out.entries()].map(([k, e]) => ({ k, n: e.n, f: [...e.f].join(',') }));
fs.writeFileSync(path.join(__dirname, process.argv[2] || 'strings.json'), JSON.stringify(arr, null, 0));
console.log('unique', arr.length, 'patterns', arr.filter(a => /\{\d\}/.test(a.k)).length, 'chars', arr.reduce((a, b) => a + b.k.length, 0));
