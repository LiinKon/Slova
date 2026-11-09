// Разбор выгрузки «Сохранённых переводов» Google Переводчика (.xlsx из Google Таблиц или .csv/.tsv).
import { unzipSync, strFromU8 } from '../vendor/fflate.js';

const LANGS = {
  en: ['английский', 'english', 'англ', 'en', 'inglés', 'englisch'],
  ru: ['русский', 'russian', 'рус', 'ru', 'russisch'],
};
const LANG_NAMES = {
  en: 'английский', ru: 'русский', de: 'немецкий', fr: 'французский', es: 'испанский', it: 'итальянский',
  ja: 'японский', zh: 'китайский', ko: 'корейский', uk: 'украинский', pl: 'польский', tr: 'турецкий',
};

export function langCode(name) {
  const n = String(name || '').trim().toLowerCase();
  for (const [code, list] of Object.entries(LANGS)) if (list.includes(n)) return code;
  for (const [code, ru] of Object.entries(LANG_NAMES)) if (n === ru) return code;
  if (/japan|япон/.test(n)) return 'ja';
  if (/german|немец/.test(n)) return 'de';
  return n || '?';
}
export function langName(code, raw) {
  return LANG_NAMES[code] || raw || code;
}

export async function readFileRows(file) {
  const name = (file.name || '').toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b;
  if (isZip || name.endsWith('.xlsx')) return parseXlsx(buf);
  const text = new TextDecoder('utf-8').decode(buf).replace(/^﻿/, '');
  return parseDelimited(text, name.endsWith('.tsv') || (text.split('\n')[0].includes('\t') && !text.split('\n')[0].includes(',')) ? '\t' : ',');
}

function parseXlsx(buf) {
  let files;
  try { files = unzipSync(buf); } catch (e) { throw new Error('Файл повреждён или это не таблица Excel.'); }
  const xml = (p) => (files[p] ? strFromU8(files[p]) : null);
  const parser = new DOMParser();
  const shared = [];
  const ss = xml('xl/sharedStrings.xml');
  if (ss) {
    const doc = parser.parseFromString(ss, 'application/xml');
    for (const si of Array.from(doc.getElementsByTagName('si'))) {
      shared.push(Array.from(si.getElementsByTagName('t')).map((t) => t.textContent).join(''));
    }
  }
  const sheetPath = Object.keys(files).filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p)).sort()[0];
  if (!sheetPath) throw new Error('В файле не нашлось листа с данными.');
  const doc = parser.parseFromString(xml(sheetPath), 'application/xml');
  const rows = [];
  for (const row of Array.from(doc.getElementsByTagName('row'))) {
    const out = [];
    for (const c of Array.from(row.getElementsByTagName('c'))) {
      const ref = c.getAttribute('r') || '';
      const col = colIndex(ref.replace(/\d+/g, ''));
      const t = c.getAttribute('t');
      let v = '';
      if (t === 's') {
        const vEl = c.getElementsByTagName('v')[0];
        v = vEl ? shared[parseInt(vEl.textContent, 10)] || '' : '';
      } else if (t === 'inlineStr') {
        v = Array.from(c.getElementsByTagName('t')).map((x) => x.textContent).join('');
      } else {
        const vEl = c.getElementsByTagName('v')[0];
        v = vEl ? vEl.textContent : '';
      }
      out[col >= 0 ? col : out.length] = v;
    }
    rows.push(Array.from(out, (x) => (x == null ? '' : String(x))));
  }
  return rows;
}

function colIndex(letters) {
  if (!letters) return -1;
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseDelimited(text, sep) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
export const keyOf = (en) => clean(en).toLowerCase().replace(/[’`]/g, "'");

// Разбирает строки в группы. existingKeys — Set уже загруженных слов.
export function analyze(rows, existingKeys) {
  const result = {
    total: 0,
    fresh: [],          // {en, ru}
    inFileDupes: [],    // en
    already: [],        // en
    skipped: {},        // groupKey -> {label, items:[{en,ru}], canInclude, include}
    recognized: false,
  };
  const seen = new Set();
  const addSkip = (key, label, item, canInclude) => {
    if (!result.skipped[key]) result.skipped[key] = { key, label, items: [], canInclude, include: false };
    result.skipped[key].items.push(item);
  };
  for (const r of rows) {
    if (!r || r.length < 4) continue;
    const [l1, l2, t1, t2] = r.map(clean);
    if (!t1 || !t2) continue;
    const c1 = langCode(l1), c2 = langCode(l2);
    if (c1 === '?' || c2 === '?') continue;
    if (/^(source|текст|оригинал)/i.test(t1)) continue;
    result.recognized = true;
    result.total++;
    let en, ru;
    if (c1 === 'en' && c2 === 'ru') { en = t1; ru = t2; }
    else if (c1 === 'ru' && c2 === 'en') {
      addSkip('ruen', 'Русский → английский', { en: t2, ru: t1 }, true);
      continue;
    } else {
      addSkip(c1 + c2, cap(langName(c1, l1)) + ' → ' + langName(c2, l2), { en: t1, ru: t2 }, false);
      continue;
    }
    if (en.split(' ').length > 6) {
      addSkip('long', 'Длинные предложения (больше 6 слов)', { en, ru }, true);
      continue;
    }
    pushWord(result, seen, existingKeys, en, ru);
  }
  return result;
}

function pushWord(result, seen, existingKeys, en, ru) {
  const k = keyOf(en);
  if (seen.has(k)) { result.inFileDupes.push(en); return; }
  seen.add(k);
  if (existingKeys.has(k)) { result.already.push(en); return; }
  result.fresh.push({ en, ru });
}

// Итоговый список слов с учётом включённых пропущенных групп.
export function finalWords(result, existingKeys) {
  const seen = new Set(result.fresh.map((w) => keyOf(w.en)));
  const out = result.fresh.slice();
  for (const g of Object.values(result.skipped)) {
    if (!g.include) continue;
    for (const it of g.items) {
      const k = keyOf(it.en);
      if (seen.has(k) || existingKeys.has(k)) continue;
      seen.add(k); out.push(it);
    }
  }
  return out;
}

// Делит n слов на части примерно по size, поровну.
export function splitSizes(n, size) {
  if (!size || size <= 0 || n <= size) return [n];
  const parts = Math.ceil(n / size);
  const base = Math.floor(n / parts), extra = n % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
