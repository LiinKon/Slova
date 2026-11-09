// Большой офлайн-словарь: англ. слово -> [транскрипция, [[часть речи, [переводы]], ...]]
// и обратный индекс: русское слово -> [английские слова].
import { VERBS } from '../data/verbs.js';

let data = null, keys = null;
let ru = null, ruKeys = null, ruNorm = null;
let loading = null;

const normRu = (w) => String(w || '').toLowerCase().replace(/ё/g, 'е').trim();

export function loadDict() {
  if (data && ru) return Promise.resolve(data);
  if (!loading) {
    loading = Promise.all([
      fetch('data/dict.json').then((r) => r.json()),
      fetch('data/ru.json').then((r) => r.json()),
    ]).then(([en, r]) => {
      data = en; keys = Object.keys(en).sort();
      ru = r;
      const pairs = Object.keys(r).map((k) => [normRu(k), k]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      ruNorm = pairs.map((p) => p[0]); ruKeys = pairs.map((p) => p[1]);
      return data;
    }).catch((e) => { loading = null; throw e; });
  }
  return loading;
}

export function dictReady() { return !!(data && ru); }

// Неправильные формы -> основное слово.
const IRR = { sought: 'seek', caught: 'catch', ridden: 'ride', foreseen: 'foresee', wisest: 'wise', wiser: 'wise', lesser: 'less', hast: 'have',
  children: 'child', men: 'man', women: 'woman', feet: 'foot', teeth: 'tooth', mice: 'mouse', geese: 'goose', people: 'person',
  better: 'good', best: 'good', worse: 'bad', worst: 'bad', lives: 'life', wives: 'wife', knives: 'knife', leaves: 'leaf', wolves: 'wolf',
  halves: 'half', selves: 'self', shelves: 'shelf', thieves: 'thief', analyses: 'analysis', crises: 'crisis', phenomena: 'phenomenon', criteria: 'criterion' };
for (const [base, past, pp] of VERBS) {
  for (const f of [...past.split('/'), ...pp.split('/')]) {
    const x = f.trim().toLowerCase();
    if (x && x !== base && !IRR[x]) IRR[x] = base;
  }
}
export const isCyr = (s) => /[а-яё]/i.test(s || '');

export function candidates(word) {
  const w = String(word || '').toLowerCase().replace(/[’`]/g, "'").trim();
  const out = [w];
  const add = (x) => { if (x && !out.includes(x)) out.push(x); };
  if (IRR[w]) add(IRR[w]);
  if (w.endsWith('ies') || w.endsWith('ied')) add(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) add(w.slice(0, -2));
  if (w.endsWith('s') && !w.endsWith('ss')) add(w.slice(0, -1));
  if (w.endsWith('ed')) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (w.length > 4 && w[w.length - 3] === w[w.length - 4]) add(w.slice(0, -3)); }
  if (w.endsWith('ing')) { add(w.slice(0, -3)); add(w.slice(0, -3) + 'e'); if (w.length > 5 && w[w.length - 4] === w[w.length - 5]) add(w.slice(0, -4)); }
  if (w.endsWith('est')) { add(w.slice(0, -3)); add(w.slice(0, -2)); }
  if (w.endsWith('er')) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith('ly')) { add(w.slice(0, -2)); if (w.endsWith('ily')) add(w.slice(0, -3) + 'y'); }
  for (const x of out.slice()) {
    if (x.endsWith('or')) add(x.slice(0, -2) + 'our');
    if (x.includes('ize')) add(x.replace('ize', 'ise'));
  }
  return out;
}

// Возвращает {word, lemma, ipa, groups} или null.
export function lookup(word) {
  if (!data) return null;
  for (const c of candidates(word)) {
    if (data[c]) return { word: c, lemma: c, ipa: data[c][0], groups: data[c][1], exact: c === String(word).toLowerCase().trim() };
  }
  return null;
}

export function exact(word) {
  if (!data) return null;
  const w = String(word || '').toLowerCase().trim();
  return data[w] ? { word: w, ipa: data[w][0], groups: data[w][1] } : null;
}

// Если введена форма слова (kept, children, studied) — основное слово.
export function baseForm(word) {
  if (!data) return null;
  const w = String(word || '').toLowerCase().trim();
  if (!w || data[w]) return null;
  const hit = lookup(w);
  return hit && hit.word !== w ? hit.word : null;
}

// Поиск по-русски: [{ru, en:[...]}]
export function searchRu(prefix, limit = 40) {
  if (!ruKeys) return [];
  const p = normRu(prefix);
  if (!p) return [];
  let lo = 0, hi = ruNorm.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ruNorm[m] < p) lo = m + 1; else hi = m; }
  const res = [];
  for (let i = lo; i < ruNorm.length && res.length < 400; i++) {
    if (!ruNorm[i].startsWith(p)) break;
    res.push(ruKeys[i]);
  }
  res.sort((a, b) => (normRu(a) === p ? -1 : normRu(b) === p ? 1 : a.length - b.length || (a < b ? -1 : 1)));
  return res.slice(0, limit).map((k) => ({ ru: k, en: ru[k] }));
}
export function ruEntry(word) {
  if (!ru) return null;
  if (ru[word]) return { ru: word, en: ru[word] };
  const p = normRu(word);
  const i = ruNorm ? ruNorm.indexOf(p) : -1;
  return i >= 0 ? { ru: ruKeys[i], en: ru[ruKeys[i]] } : null;
}

// Похожие по смыслу английские слова: те, что переводятся теми же русскими словами.
export function similar(word, limit = 8) {
  if (!data || !ru) return [];
  const e = data[word]; if (!e) return [];
  const score = new Map();
  e[1].slice(0, 2).forEach((g, gi) => g[1].slice(0, 3).forEach((r, ri) => {
    const list = ru[r] || [];
    const weight = 1 / Math.log2(2 + list.length); // многозначные русские слова дают меньше веса
    list.forEach((en, ei) => {
      if (en === word || en.includes(word) || word.includes(en)) return;
      const add = (3 - gi * 0.8 - ri * 0.6 - Math.min(ei, 9) * 0.2) * weight;
      if (add > 0) score.set(en, (score.get(en) || 0) + add);
    });
  }));
  const sorted = [...score.entries()].sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return [];
  const top = sorted[0][1];
  return sorted.filter((x) => x[1] >= top * 0.45).slice(0, limit).map((x) => x[0]);
}

// Поиск по началу слова.
export function search(prefix, limit = 40) {
  if (!keys) return [];
  const p = String(prefix || '').toLowerCase().trim();
  if (!p) return [];
  let lo = 0, hi = keys.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (keys[m] < p) lo = m + 1; else hi = m; }
  const res = [];
  for (let i = lo; i < keys.length && res.length < 400; i++) {
    if (!keys[i].startsWith(p)) break;
    res.push(keys[i]);
  }
  res.sort((a, b) => (a === p ? -1 : b === p ? 1 : a.length - b.length || (a < b ? -1 : 1)));
  return res.slice(0, limit);
}

// Короткий перевод для карточки: первые значения первой части речи.
export function shortTranslation(groups, max = 2) {
  if (!groups || !groups.length) return '';
  return groups[0][1].slice(0, max).join(', ');
}
