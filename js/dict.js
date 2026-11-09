// Большой офлайн-словарь: англ. слово -> [транскрипция, [[часть речи, [переводы]], ...]]
let data = null;
let keys = null;
let loading = null;

export function loadDict() {
  if (data) return Promise.resolve(data);
  if (!loading) {
    loading = fetch('data/dict.json')
      .then((r) => r.json())
      .then((j) => { data = j; keys = Object.keys(j).sort(); return j; })
      .catch((e) => { loading = null; throw e; });
  }
  return loading;
}

export function dictReady() { return !!data; }

const IRR = { sought: 'seek', caught: 'catch', ridden: 'ride', foreseen: 'foresee', wisest: 'wise', wiser: 'wise', lesser: 'less', hast: 'have', thee: 'thee' };

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
