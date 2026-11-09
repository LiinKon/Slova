import { loadState, saveState, writeNow, askPersistence, uid, normalize } from './store.js';
import * as SRS from './srs.js';
import * as IMP from './importer.js';
import * as D from './dict.js';
import { speak, englishVoices, ttsAvailable } from './tts.js';
import { VERBS } from '../data/verbs.js';

const DAY = 86400000;
let S = null;
const ui = {
  route: 'home', overlay: null, menu: false, expanded: {}, showAllParts: {}, dateFilter: 'all',
  q: '', filter: { pos: 'all', level: 'all', sort: 'date' },
  bigQ: '', bigWord: null, importData: null, session: null, vs: null, partId: null, backTo: 'home',
};

/* ---------- иконки ---------- */
const I = {
  burger: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  back: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  close: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  next: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  chevR: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  down: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  dl: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  dots: '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4"/></svg>',
  filter: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  speaker: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/></svg>',
  plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  file: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13l2 2 4-4"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 8v5M12 16v.5M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/></svg>',
  x: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  nav: {
    home: 'M4 11l8-7 8 7v9h-5v-6H9v6H4z', today: 'M5 12l5 5L20 7',
    dict: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11', big: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
    verbs: 'M4 6h16M4 12h10M4 18h6', imp: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    backup: 'M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8zM12 11v6M9 14l3 3 3-3',
    settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2',
  },
};
const ttsOn = () => S.settings.tts !== false && ttsAvailable();
const navIcon = (k) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${I.nav[k]}"/></svg>`;

/* ---------- утилиты ---------- */
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (ts) => { const d = new Date(ts); return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
const MONTHS = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const monthKey = (ts) => { const d = new Date(ts); return d.getFullYear() + '-' + d.getMonth(); };
const monthLabel = (k) => { const [y, m] = k.split('-'); return MONTHS[+m] + ' ' + y; };
function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}
const slov = (n) => n + ' ' + plural(n, 'слово', 'слова', 'слов');
const save = () => saveState(S);
let toastTimer = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg; el.style.display = 'block'; el.classList.remove('out');
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.add('out'); toastTimer = setTimeout(() => { el.style.display = 'none'; }, 220); }, 2400);
}

/* ---------- данные ---------- */
const words = () => Object.values(S.words);
const wordList = (ids) => ids.map((id) => S.words[id]).filter(Boolean);
const keySet = () => new Set(words().map((w) => w.key));

function answerText(w) {
  if (w.groups && w.groups.length && w.lemma === w.key) return D.shortTranslation(w.groups, 2);
  return w.ru || (w.groups ? D.shortTranslation(w.groups, 2) : '');
}
function posOf(w) {
  if (w.groups && w.groups.length) return w.groups[0][0];
  return w.en.includes(' ') ? 'фраза' : '';
}
function enrich(w) {
  const hit = D.lookup(w.en);
  if (hit) { w.lemma = hit.lemma; w.ipa = hit.ipa; w.groups = hit.groups; }
  else { w.lemma = ''; w.ipa = ''; w.groups = null; }
  return w;
}
function makeWord(en, ru, packId, partId) {
  const w = { id: uid('w'), key: IMP.keyOf(en), en: en.trim(), ru: (ru || '').trim(), packId, partId, added: Date.now(), ...SRS.freshProgress() };
  return enrich(w);
}
function findPart(partId) {
  for (const p of S.packs) for (const pt of p.parts) if (pt.id === partId) return { pack: p, part: pt };
  return null;
}
function partTitle(pack, part) {
  if (!part.name || pack.parts.length === 1) return pack.name;
  return pack.name + ' · ' + part.name;
}
function packWordIds(pack) { return pack.parts.flatMap((p) => p.wordIds); }
function levelCounts(ids) {
  const c = { n: 0, r: 0, y: 0, g: 0, total: 0 };
  for (const w of wordList(ids)) { c[SRS.levelKey(w.level)]++; c.total++; }
  return c;
}
function rollDaily() {
  const k = SRS.todayKey();
  if (S.daily.date !== k) { S.daily = { date: k, newShown: 0 }; }
}
function orderedWordIds() { // в порядке паков (старые сначала) и частей
  return S.packs.slice().sort((a, b) => a.created - b.created).flatMap((p) => packWordIds(p));
}
function todayPlan() {
  rollDaily();
  const now = Date.now();
  const all = words();
  const due = all.filter((w) => SRS.isDue(w, now)).sort((a, b) => a.due - b.due);
  const newLeft = Math.max(0, S.settings.newPerDay - S.daily.newShown);
  const fresh = wordList(orderedWordIds()).filter((w) => w.level === SRS.LEVEL.NEW).slice(0, newLeft);
  return { due, fresh, hard: due.filter((w) => w.level === SRS.LEVEL.RED).length };
}

/* ---------- тема ---------- */
const mq = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = S.settings.theme === 'system' ? (mq.matches ? 'dark' : 'light') : S.settings.theme;
  document.documentElement.dataset.theme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#17120F' : '#F7F1EA');
}
mq.addEventListener && mq.addEventListener('change', () => S && applyTheme());

/* ---------- рендер ---------- */
const DEPTH = { home: 0, dict: 1, big: 1, verbs: 1, settings: 1, import: 1, part: 1, train: 2 };
function go(route, opts = {}) {
  const from = ui.route;
  ui.anim = route === from ? 'fade' : (DEPTH[route] ?? 1) >= (DEPTH[from] ?? 1) ? 'fwd' : 'back';
  ui.route = route; ui.overlay = null; ui.menu = false;
  Object.assign(ui, opts);
  render();
  window.scrollTo(0, 0);
}
function render() {
  const app = document.getElementById('app');
  const fn = SCREENS[ui.route] || SCREENS.home;
  let html = fn();
  if (ui.anim) { html = html.replace('<main class="screen', '<main class="screen enter-' + ui.anim); ui.anim = null; }
  app.innerHTML = html + overlayHtml();
  afterRender();
}
function rerenderOverlay() {
  const app = document.getElementById('app');
  app.querySelectorAll('.backdrop, .sheet, .drawer').forEach((n) => n.remove());
  app.insertAdjacentHTML('beforeend', overlayHtml());
}
function closeOverlay(after) {
  const nodes = document.querySelectorAll('#app .backdrop, #app .sheet, #app .drawer');
  if (!nodes.length || reduceMotion()) { after(); return; }
  nodes.forEach((n) => {
    n.style.transition = n.classList.contains('backdrop') ? 'opacity .2s ease' : 'transform .2s cubic-bezier(.4,0,1,1)';
    if (n.classList.contains('backdrop')) n.style.opacity = '0';
    else n.style.transform = n.classList.contains('drawer') ? 'translateX(105%)' : 'translateY(105%)';
  });
  setTimeout(after, 200);
}
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function afterRender() {
  ui.justExpanded = null; ui.justMore = null;
  const bar = document.querySelector('.progress i[data-to]');
  if (bar) requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = bar.dataset.to + '%'; }));
  if (ui.session) { ui.session.anim = null; if (ui.session.answered) ui.session.answered.fresh = false; }
  if (ui.vs) { ui.vs.anim = null; if (ui.vs.cur) { ui.vs.cur.justFilled = null; ui.vs.cur.justChecked = false; } }
  if (ui.route === 'train' && ui.session && ui.session.speakPending) {
    ui.session.speakPending = false;
    const w = S.words[ui.session.cards[ui.session.idx]];
    if (w) speak(w.en, S.settings);
  }
}

const SCREENS = {};

/* ---------- главный экран ---------- */
SCREENS.home = () => {
  const plan = todayPlan();
  const total = plan.due.length + plan.fresh.length;
  const hasWords = words().length > 0;
  let heroTitle, heroSub;
  if (!hasWords) { heroTitle = 'Пока нет слов'; heroSub = 'Загрузи список из Google Переводчика'; }
  else if (!total) { heroTitle = 'На сегодня всё'; heroSub = 'Новые повторения появятся позже'; }
  else {
    heroTitle = slov(total) + ' к повторению';
    const bits = [];
    if (plan.hard) bits.push(plan.hard + ' ' + plural(plan.hard, 'сложное', 'сложных', 'сложных'));
    if (plan.fresh.length) bits.push(plan.fresh.length + ' ' + plural(plan.fresh.length, 'новое', 'новых', 'новых'));
    const rest = plan.due.length - plan.hard;
    if (rest) bits.push(rest + ' на повторение');
    heroSub = bits.length > 1 ? 'из них ' + bits.join(', ') : (plan.fresh.length === total ? 'все новые' : plan.hard === total ? 'все сложные' : 'повторение выученного');
  }

  const packs = S.packs.slice().sort((a, b) => b.created - a.created)
    .filter((p) => ui.dateFilter === 'all' || monthKey(p.created) === ui.dateFilter);
  const nag = backupNag();
  return `<main class="screen">
    <div class="topbar"><h1 class="title-xl">Мои слова</h1>
      <button class="icon-btn" data-a="drawer" aria-label="Открыть меню">${I.burger}</button></div>
    <div class="hero">
      <div class="hero-card"><small>Сегодня</small><strong>${esc(heroTitle)}</strong><span>${esc(heroSub)}</span></div>
      <button class="start-btn" data-a="start-today" ${total ? '' : 'disabled'}>${I.next}<span>Начать</span></button>
    </div>
    ${nag}
    <button class="import-btn" data-a="import">
      <span class="ico">${I.dl}</span>
      <span><b>Импорт из Google Переводчика</b><span>Новые слова соберутся в отдельный пак</span></span>
    </button>
    <div class="section-head">
      <h2>Паки</h2>
      <div class="row">
        <button class="pill-btn" data-a="date-filter">${ui.dateFilter === 'all' ? 'Все даты' : esc(monthLabel(ui.dateFilter))} ${I.down}</button>
        <button class="dots-btn" data-a="menu" aria-label="Действия с паками" aria-expanded="${ui.menu}">${I.dots}</button>
      </div>
      ${ui.menu ? `<div class="pop" role="menu">
        <button data-a="new-pack" role="menuitem">Создать свой пак</button>
        <button data-a="import" role="menuitem">Импорт из файла</button>
        <button data-a="collapse-all" role="menuitem">Свернуть все паки</button></div>` : ''}
    </div>
    ${packs.length ? packs.map(packHtml).join('') : `<div class="empty"><b>${S.packs.length ? 'Нет паков за этот месяц' : 'Здесь появятся паки'}</b>${S.packs.length ? '' : 'Каждый импорт из Google становится паком с датой, большой пак делится на части.'}</div>`}
  </main>`;
};

function backupNag() {
  if (!S.settings.backupReminder || !words().length) return '';
  const now = Date.now();
  if (now - (S.lastBackup || S.createdAt) < 7 * DAY || now - (S.lastBackupNag || 0) < DAY) return '';
  return `<div class="card" style="display:flex;align-items:center;gap:10px">
    <span style="flex-grow:1;font-size:13px;font-weight:600">Давно не было резервной копии. Прогресс хранится только на этом телефоне.</span>
    <button class="small-btn" data-a="backup">Сохранить</button>
    <button class="icon-btn ghost" style="width:32px;height:32px" data-a="nag-close" aria-label="Скрыть">${I.x}</button></div>`;
}

function bar(c) {
  if (!c.total) return '<span class="bar"></span>';
  const pct = (n) => (n / c.total * 100).toFixed(2) + '%';
  return `<span class="bar"><i class="g" style="width:${pct(c.g)}"></i><i class="y" style="width:${pct(c.y)}"></i><i class="r" style="width:${pct(c.r)}"></i></span>`;
}

function packHtml(p) {
  const ids = packWordIds(p);
  const c = levelCounts(ids);
  const done = c.total > 0 && c.g === c.total;
  const multi = p.parts.length > 1;
  const open = multi && !!ui.expanded[p.id];
  const sub = slov(c.total) + (multi ? ' · ' + p.parts.length + ' ' + plural(p.parts.length, 'часть', 'части', 'частей') : '') + (done ? ' · всё выучено' : '');
  const main = multi
    ? `<button class="main" data-a="toggle-pack" data-id="${p.id}" aria-expanded="${open}"><span><b>${esc(p.name)}</b><small>${sub}</small></span><span class="chev ${open ? 'open' : ''}">${I.down}</span></button>`
    : `<button class="main" data-a="open-part" data-id="${p.parts[0] ? p.parts[0].id : ''}"><span><b>${esc(p.name)}</b><small>${sub}</small></span><span class="chev">${I.chevR}</span></button>`;
  let parts = '';
  if (open) {
    const all = !!ui.showAllParts[p.id];
    const shown = all ? p.parts : p.parts.slice(0, 4);
    const anim = ui.justExpanded === p.id ? 0 : ui.justMore === p.id ? 4 : -1;
    parts = `<div class="parts ${anim === 0 ? 'parts-in' : ''}"><small>Части</small>${shown.map((pt, i) => partHtml(pt, anim >= 0 && i >= anim ? i - anim : -1)).join('')}
      ${p.parts.length > 4 ? `<button class="more-link" data-a="more-parts" data-id="${p.id}">${all ? 'Скрыть' : 'Показать ещё ' + (p.parts.length - 4) + ' ' + plural(p.parts.length - 4, 'часть', 'части', 'частей')}</button>` : ''}</div>`;
  }
  return `<div class="pack"><div class="pack-card ${done ? 'done' : ''}">${main}
    <button class="icon-btn ghost" style="width:40px" data-a="pack-menu" data-id="${p.id}" aria-label="Действия с паком ${esc(p.name)}">${I.dots}</button></div>${parts}</div>`;
}
function partHtml(pt, delay = -1) {
  const c = levelCounts(pt.wordIds);
  const done = c.total > 0 && c.g === c.total;
  return `<div class="part ${delay >= 0 ? 'part-in' : ''}" ${delay >= 0 ? `style="animation-delay:${delay * 45}ms"` : ''}><div class="part-card ${done ? 'done' : ''}">
    <button class="info" data-a="open-part" data-id="${pt.id}" style="text-align:left">
      <span class="top"><b>${esc(pt.name)}</b><small>${slov(c.total)}</small></span>${bar(c)}</button>
    <button class="icon-btn ghost" style="width:36px" data-a="part-menu" data-id="${pt.id}" aria-label="Действия с частью">${I.dots}</button></div></div>`;
}

/* ---------- экран части ---------- */
SCREENS.part = () => {
  const f = findPart(ui.partId);
  if (!f) { ui.route = 'home'; return SCREENS.home(); }
  const list = wordList(f.part.wordIds);
  return `<main class="screen">
    <div class="topbar"><button class="icon-btn" data-a="home" aria-label="Назад">${I.back}</button>
      <h1>${esc(partTitle(f.pack, f.part))}<span class="sub">${slov(list.length)}</span></h1>
      <button class="icon-btn" data-a="part-menu" data-id="${f.part.id}" aria-label="Действия">${I.dots}</button></div>
    <button class="btn accent" data-a="start-part" data-id="${f.part.id}" ${list.length ? '' : 'disabled'}>Учить ${f.pack.parts.length > 1 ? 'эту часть' : 'этот пак'}</button>
    ${list.length ? `<div class="list">${list.map(rowWord).join('')}</div>` : `<div class="empty"><b>Пока пусто</b>Добавляй слова через «Большой словарь» → «Добавить в пак».</div>`}
  </main>`;
};
function rowWord(w) {
  return `<button class="row-word" data-a="word" data-id="${w.id}">
    <span class="t"><span class="en w-${SRS.levelKey(w.level)}">${esc(w.en)}</span><span class="ru">${esc(answerText(w))}</span></span>
    ${posOf(w) ? `<span class="tag">${esc(posOf(w))}</span>` : ''}</button>`;
}

/* ---------- тренировка ---------- */
function startSession(ids, label) {
  ids = ids.filter((id) => S.words[id]);
  if (!ids.length) { toast('Сейчас нечего повторять'); return; }
  ui.session = { cards: ids, idx: 0, label, correct: 0, wrong: 0, seenWrong: {}, answered: null, card: null, total: ids.length };
  prepareCard();
  go('train');
}
function startToday() {
  const plan = todayPlan();
  const ids = plan.due.slice(0, 30).map((w) => w.id).concat(plan.fresh.map((w) => w.id));
  startSession(SRS.shuffle(ids.slice(0, 40)), 'Сегодня');
}
function startPart(partId) {
  const f = findPart(partId); if (!f) return;
  rollDaily();
  const now = Date.now();
  const list = wordList(f.part.wordIds);
  let pick = list.filter((w) => SRS.isDue(w, now)).concat(list.filter((w) => w.level === SRS.LEVEL.NEW)).slice(0, 20);
  if (!pick.length) pick = SRS.shuffle(list.filter((w) => w.level !== SRS.LEVEL.GREEN)).slice(0, 20);
  if (!pick.length) pick = SRS.shuffle(list).slice(0, 20);
  startSession(SRS.shuffle(pick.map((w) => w.id)), partTitle(f.pack, f.part));
}
function prepareCard() {
  const s = ui.session;
  const w = S.words[s.cards[s.idx]];
  if (!w) return;
  const dirSet = S.settings.direction;
  let dir = 'enru';
  if (dirSet === 'ruen') dir = 'ruen';
  else if (dirSet === 'mixed' && w.level >= SRS.LEVEL.YELLOW && Math.random() < 0.45) dir = 'ruen';
  const correct = dir === 'enru' ? answerText(w) : w.en;
  const pos = posOf(w);
  const pool = words().filter((o) => o.id !== w.id);
  const text = (o) => (dir === 'enru' ? answerText(o) : o.en);
  const seen = new Set([correct.toLowerCase()]);
  const pickFrom = (arr) => {
    const out = [];
    for (const o of SRS.shuffle(arr)) {
      const t = text(o); if (!t || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase()); out.push(t); if (out.length >= 3) break;
    }
    return out;
  };
  let distract = pickFrom(pool.filter((o) => posOf(o) === pos));
  if (distract.length < 3) distract = distract.concat(pickFrom(pool)).slice(0, 3);
  const options = SRS.shuffle([correct, ...distract]);
  s.card = { dir, correct, options, wordId: w.id };
  s.answered = null;
  s.anim = 'card';
  s.speakPending = dir === 'enru' && S.settings.autoSpeak;
}
SCREENS.train = () => {
  const s = ui.session;
  if (!s) return SCREENS.home();
  if (s.idx >= s.cards.length) return trainDone();
  const w = S.words[s.card.wordId];
  const c = s.card;
  const pct = Math.round((s.idx / s.cards.length) * 100);
  const fromPct = s.prevPct == null ? pct : s.prevPct;
  s.prevPct = pct;
  const cardIn = s.anim === 'card';
  const prompt = c.dir === 'enru' ? w.en : answerText(w);
  const long = prompt.length > 16;
  const ans = s.answered;
  const opts = c.options.map((o, i) => {
    let cls = '', mark = '';
    if (ans) {
      if (o === c.correct) { cls = 'ok' + (ans.fresh ? ' pulse' : ''); mark = 'Верно'; }
      else if (i === ans.pick) { cls = 'bad' + (ans.fresh ? ' shake' : ''); mark = 'Ваш ответ'; }
      else cls = 'dim';
    }
    return `<button class="opt ${cls} ${cardIn ? 'opt-in' : ''}" ${cardIn ? `style="animation-delay:${80 + i * 50}ms"` : ''} data-a="pick" data-i="${i}" ${ans ? 'aria-disabled="true"' : ''}><span>${esc(o)}</span>${mark ? `<small>${mark}</small>` : ''}</button>`;
  }).join('');
  const full = w.groups && w.lemma === w.key ? w.groups.map((g) => g[1].slice(0, 3).join(', ')).join('; ') : (w.ru || answerText(w));
  return `<main class="screen train">
    <div class="topbar" style="gap:12px"><button class="icon-btn" data-a="end-train" aria-label="Закончить тренировку">${I.close}</button>
      <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${fromPct}%" data-to="${pct}"></i></div>
      <b style="font-size:14px;font-weight:800">${s.idx + 1} / ${s.cards.length}</b></div>
    <div class="qcard ${cardIn ? 'card-in' : ''}">
      ${posOf(w) ? `<span class="pos">${esc(posFull(posOf(w)))}</span>` : ''}
      <span class="word ${long ? 'long' : ''}" ${c.dir === 'enru' ? 'lang="en"' : ''}>${esc(prompt)}</span>
      ${c.dir === 'enru' && w.ipa && w.lemma === w.key ? `<span class="ipa">[${esc(w.ipa)}]</span>` : ''}
      ${ttsOn() && (c.dir === 'enru' || ans) ? `<button class="speak" data-a="speak" data-id="${w.id}" aria-label="Произнести слово">${I.speaker}</button>` : ''}
    </div>
    <div class="options">${opts}</div>
    ${ans ? `<div class="feedback ${ans.ok ? 'ok' : 'bad'} ${ans.fresh ? 'fb-in' : ''}"><span><b>${ans.ok ? 'Верно!' : 'Не то слово'}</b><span>${esc(w.en)} — ${esc(full)}</span></span>
      <button class="btn dark" data-a="next-card">Дальше</button></div>`
      : `<button class="btn text" data-a="dont-know">Не знаю — показать ответ</button>`}
  </main>`;
};
const POS_FULL = { 'сущ.': 'существительное', 'глаг.': 'глагол', 'прил.': 'прилагательное', 'нареч.': 'наречие', 'местоим.': 'местоимение', 'межд.': 'междометие', 'числ.': 'числительное' };
const posFull = (p) => POS_FULL[p] || p;

function onPick(i) {
  const s = ui.session; if (!s || s.answered) return;
  const c = s.card;
  const ok = i >= 0 && c.options[i] === c.correct;
  const w = S.words[c.wordId];
  const wasNew = w.level === SRS.LEVEL.NEW;
  SRS.answer(w, ok);
  if (wasNew) { rollDaily(); S.daily.newShown++; }
  if (ok) s.correct++; else {
    s.wrong++;
    if (!s.seenWrong[w.id]) { s.seenWrong[w.id] = 1; s.cards.push(w.id); }
  }
  s.answered = { ok, pick: i, fresh: true };
  save();
  if (c.dir === 'ruen' && S.settings.autoSpeak) speak(w.en, S.settings);
  if (ok && S.settings.autoNext) {
    render();
    setTimeout(() => { if (ui.session === s && s.answered) nextCard(); }, 650);
    return;
  }
  render();
}
function nextCard() {
  const s = ui.session; if (!s) return;
  s.idx++;
  if (s.idx < s.cards.length) prepareCard();
  render();
}
function trainDone() {
  const s = ui.session;
  const more = todayPlan();
  const left = more.due.length + more.fresh.length;
  return `<main class="screen done-screen">
    <div class="spacer"></div>
    <div class="big">Готово</div>
    <p style="margin:0;color:var(--muted);font-size:15px">${esc(s.label)}</p>
    <div class="stats3"><div class="acc"><b>${s.correct}</b><small>верно</small></div><div><b>${s.wrong}</b><small>${plural(s.wrong, 'ошибка', 'ошибки', 'ошибок')}</small></div><div><b>${s.total}</b><small>${plural(s.total, 'слово', 'слова', 'слов')}</small></div></div>
    <div class="spacer"></div>
    ${left ? `<button class="btn accent" data-a="start-today">Ещё: ${slov(left)} на сегодня</button>` : ''}
    <button class="btn light" data-a="home">На главную</button>
  </main>`;
}

/* ---------- импорт ---------- */
async function onFileChosen(file) {
  if (!file) return;
  toast('Читаю файл…');
  const data = { fileName: file.name, error: null, result: null, name: fmtDate(Date.now()), split: true, size: S.settings.partSize, custom: '' };
  try {
    const [rows] = await Promise.all([IMP.readFileRows(file), D.loadDict().catch(() => null)]);
    const res = IMP.analyze(rows, keySet());
    if (!res.recognized) data.error = 'Не похоже на выгрузку Google Переводчика: нужны 4 колонки — язык оригинала, язык перевода, текст, перевод.';
    else {
      data.result = res;
      data.rowCount = rows.length;
      if (!S.settings.onlyEnRu && res.skipped.ruen) res.skipped.ruen.include = true;
    }
  } catch (e) {
    data.error = e && e.message ? e.message : 'Не получилось прочитать файл.';
  }
  const t = document.getElementById('toast'); if (t) t.style.display = 'none';
  ui.importData = data;
  go('import');
}
SCREENS.import = () => {
  const d = ui.importData;
  if (!d) return SCREENS.home();
  if (d.error) {
    return `<main class="screen"><div class="topbar"><button class="icon-btn" data-a="home" aria-label="Назад">${I.back}</button><h1>Импорт</h1></div>
      <div class="card file-card err"><span class="ico">${I.warn}</span><span><b>${esc(d.fileName)}</b><small>${esc(d.error)}</small></span></div>
      <p class="hint">Как выгрузить: открой translate.google.com на компьютере → «Сохранённые» → «Экспорт в Google Таблицы». В таблице: Файл → Скачать → Microsoft Excel (.xlsx) или CSV. Этот файл и выбирай.</p>
      <button class="btn accent" data-a="import">Выбрать другой файл</button></main>`;
  }
  const r = d.result;
  const finalList = IMP.finalWords(r, keySet());
  const n = finalList.length;
  const skippedTotal = Object.values(r.skipped).reduce((a, g) => a + g.items.length, 0);
  const size = d.size === 'custom' ? parseInt(d.custom, 10) || 0 : d.size;
  const sizes = d.split && size > 0 ? IMP.splitSizes(n, size) : [n];
  const minS = Math.min(...sizes), maxS = Math.max(...sizes);
  const splitHint = !n ? 'Новых слов нет — все уже в словаре.' : sizes.length === 1 ? 'Получится один пак без частей.' :
    'Получится ' + sizes.length + ' ' + plural(sizes.length, 'часть', 'части', 'частей') + ' по ' + (minS === maxS ? minS : minS + '–' + maxS) + ' ' + plural(maxS, 'слово', 'слова', 'слов') + '. Слова делятся поровну, чтобы последняя часть не оказалась крошечной.';
  const dupes = r.inFileDupes.length + r.already.length;
  const groups = Object.values(r.skipped);
  return `<main class="screen">
    <div class="topbar"><button class="icon-btn" data-a="home" aria-label="Назад">${I.back}</button><h1>Импорт</h1></div>
    <div class="card file-card"><span class="ico">${I.file}</span><span><b>${esc(d.fileName)}</b><small>Формат Google Переводчика распознан · ${r.total} ${plural(r.total, 'запись', 'записи', 'записей')}</small></span></div>
    <div class="stats3"><div class="acc"><b>${n}</b><small>${plural(n, 'новое слово', 'новых слова', 'новых слов')}</small></div>
      <div><b>${dupes}</b><small>${plural(dupes, 'дубль', 'дубля', 'дублей')} убрано</small></div>
      <div><b>${skippedTotal}</b><small>пропущено</small></div></div>
    ${groups.length || dupes ? `<div class="card" style="padding:6px 14px">
      ${groups.length ? `<div style="display:flex;justify-content:space-between;align-items:center;min-height:44px"><b style="font-size:14px;font-weight:800">Что пропущено</b><small class="hint">не англ. → рус.</small></div>` : ''}
      ${groups.map((g) => `<div class="skip-row"><span>${esc(g.label)}</span><span style="display:flex;align-items:center;gap:10px"><small>${g.items.length}</small>
        ${g.canInclude ? `<button class="small-btn ${g.include ? 'on' : ''}" data-a="imp-include" data-id="${g.key}" aria-pressed="${g.include}">${g.include ? 'Включено' : 'Включить'}</button>` : `<small style="font-weight:600">не англ.</small>`}</span></div>`).join('')}
      ${r.inFileDupes.length ? `<div class="skip-row"><small style="font-weight:600">Дубли в файле: ${esc(r.inFileDupes.slice(0, 6).join(', '))}${r.inFileDupes.length > 6 ? '…' : ''}</small></div>` : ''}
      ${r.already.length ? `<div class="skip-row"><small style="font-weight:600">Уже есть в словаре: ${r.already.length}</small></div>` : ''}
    </div>` : ''}
    <div class="card" style="display:flex;flex-direction:column;gap:12px">
      <label for="packname" class="hint" style="font-size:13px;font-weight:700">Название пака</label>
      <input id="packname" class="input" data-in="imp-name" value="${esc(d.name)}" autocomplete="off">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px;font-weight:700">Разбить на части</b>
        <label class="switch"><input type="checkbox" data-in="imp-split" ${d.split ? 'checked' : ''} aria-label="Разбить на части"><span></span></label></div>
      ${d.split ? `<div class="seg">
        <button class="${d.size === 25 ? 'on' : ''}" data-a="imp-size" data-v="25">по 25</button>
        <button class="${d.size === 50 ? 'on' : ''}" data-a="imp-size" data-v="50">по 50</button>
        <button class="${d.size === 'custom' ? 'on' : ''}" data-a="imp-size" data-v="custom">своё <input inputmode="numeric" data-in="imp-custom" value="${esc(d.custom)}" placeholder="—" aria-label="Своё количество слов в части"></button>
      </div>` : ''}
      <span class="hint" id="split-hint">${esc(splitHint)}</span>
    </div>
    <div class="spacer"></div>
    <button class="btn accent" data-a="imp-create" ${n ? '' : 'disabled'}>Создать пак</button>
  </main>`;
};
function createPackFromImport() {
  const d = ui.importData; if (!d || !d.result) return;
  const list = IMP.finalWords(d.result, keySet());
  if (!list.length) return;
  const size = d.size === 'custom' ? parseInt(d.custom, 10) || 0 : d.size;
  const sizes = d.split && size > 0 ? IMP.splitSizes(list.length, size) : [list.length];
  let name = (d.name || '').trim() || fmtDate(Date.now());
  if (S.packs.some((p) => p.name === name)) { let i = 2; while (S.packs.some((p) => p.name === name + ' (' + i + ')')) i++; name += ' (' + i + ')'; }
  const pack = { id: uid('p'), name, created: Date.now(), source: 'import', parts: [] };
  let k = 0;
  sizes.forEach((sz, i) => {
    const part = { id: uid('pt'), name: sizes.length > 1 ? 'Часть ' + (i + 1) : '', wordIds: [] };
    for (let j = 0; j < sz; j++, k++) {
      const w = makeWord(list[k].en, list[k].ru, pack.id, part.id);
      S.words[w.id] = w; part.wordIds.push(w.id);
    }
    pack.parts.push(part);
  });
  S.packs.push(pack);
  ui.expanded[pack.id] = true;
  ui.importData = null;
  save();
  go('home');
  toast('Пак создан: ' + slov(list.length));
}

/* ---------- личный словарь ---------- */
const POS_FILTERS = [['all', 'Все'], ['сущ.', 'Сущ.'], ['глаг.', 'Глаг.'], ['прил.', 'Прил.'], ['нареч.', 'Нареч.'], ['фраза', 'Фразы'], ['other', 'Другое']];
const LVL_FILTERS = [['all', 'Все'], ['0', 'Новые'], ['1', 'Сложные'], ['2', 'Учу'], ['3', 'Знаю']];
const SORTS = [['date', 'По дате добавления'], ['alpha', 'По алфавиту'], ['hard', 'Сначала сложные'], ['learned', 'Сначала выученные']];
function filteredWords() {
  const f = ui.filter;
  const q = ui.q.trim().toLowerCase();
  let list = words().filter((w) => {
    const p = posOf(w);
    if (f.pos !== 'all') {
      if (f.pos === 'other') { if (['сущ.', 'глаг.', 'прил.', 'нареч.', 'фраза'].includes(p)) return false; }
      else if (p !== f.pos) return false;
    }
    if (f.level !== 'all' && String(w.level) !== f.level) return false;
    if (q && !w.en.toLowerCase().includes(q) && !answerText(w).toLowerCase().includes(q) && !(w.ru || '').toLowerCase().includes(q)) return false;
    return true;
  });
  const lvlHard = (w) => (w.level === 0 ? 1.5 : w.level);
  if (f.sort === 'alpha') list.sort((a, b) => a.en.localeCompare(b.en, 'en'));
  else if (f.sort === 'hard') list.sort((a, b) => lvlHard(a) - lvlHard(b) || a.en.localeCompare(b.en));
  else if (f.sort === 'learned') list.sort((a, b) => b.level - a.level || a.en.localeCompare(b.en));
  else list.sort((a, b) => b.added - a.added);
  return list;
}
const filtersActive = () => ui.filter.pos !== 'all' || ui.filter.level !== 'all' || ui.filter.sort !== 'date';
SCREENS.dict = () => {
  const all = words().length;
  const f = ui.filter;
  const chips = [];
  if (f.pos !== 'all') chips.push(`<span class="f">${esc(POS_FILTERS.find((x) => x[0] === f.pos)[1].toLowerCase())}</span>`);
  if (f.level !== 'all') { const k = SRS.levelKey(+f.level); chips.push(`<span class="f w-${k}" style="margin-left:0;padding:4px 10px">${esc(LVL_FILTERS.find((x) => x[0] === f.level)[1].toLowerCase())}</span>`); }
  if (f.sort !== 'date') chips.push(`<span class="f">${esc(SORTS.find((x) => x[0] === f.sort)[1].toLowerCase())}</span>`);
  return `<main class="screen">
    <div class="topbar"><button class="icon-btn" data-a="home" aria-label="Назад">${I.back}</button>
      <h1>Личный словарь<span class="sub">${slov(all)}</span></h1></div>
    <div style="display:flex;gap:8px">
      <label class="search">${I.search}<span class="sr">Поиск по словарю</span><input data-in="dict-q" value="${esc(ui.q)}" placeholder="Найти слово или перевод" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
      <button class="icon-btn dark" style="width:48px;height:48px;border-radius:16px" data-a="filters" aria-label="Фильтр и сортировка">${I.filter}</button>
    </div>
    ${filtersActive() ? `<div class="shown"><small>Показано:</small>${chips.join('')}<button class="reset-all" data-a="reset-filters">${I.x} Сбросить всё</button></div>` : ''}
    <div id="dlist">${dictListHtml()}</div>
  </main>`;
};
function dictListHtml() {
  const list = filteredWords();
  const all = words().length;
  if (!all) return `<div class="empty"><b>Словарь пуст</b>Импортируй слова из Google или добавь их из большого словаря.</div>`;
  const head = list.length !== all ? `<div class="counter">Найдено ${list.length} из ${all}</div>` : '';
  if (!list.length) return head + `<div class="empty"><b>Ничего не нашлось</b>Попробуй другое слово или сбрось фильтры.</div>`;
  const max = 300;
  return head + `<div class="list" style="margin-top:8px">${list.slice(0, max).map(rowWord).join('')}</div>` + (list.length > max ? `<p class="hint" style="text-align:center">Показаны первые ${max}. Уточни поиск.</p>` : '');
}

/* ---------- большой словарь ---------- */
SCREENS.big = () => {
  const ready = D.dictReady();
  if (!ready) D.loadDict().then(() => { if (ui.route === 'big') render(); }).catch(() => toast('Словарь не загрузился'));
  const head = `<div class="big-head">
      <div style="display:flex;align-items:center;gap:12px"><button class="icon-btn" data-a="${ui.bigWord ? 'big-back' : 'home'}" aria-label="Назад">${I.back}</button>
        <div><h1>Большой словарь</h1><div class="sub">Системный · англо-русский · работает офлайн</div></div></div>
      <label class="search">${I.search}<span class="sr">Поиск в большом словаре</span><input data-in="big-q" value="${esc(ui.bigQ)}" placeholder="Английское слово" autocomplete="off" autocapitalize="off" spellcheck="false" lang="en"></label>
    </div>`;
  if (!ready) return `<main class="screen">${head}<p class="hint" style="text-align:center">Загружаю словарь…</p></main>`;
  if (ui.bigWord) return `<main class="screen">${head}${entryHtml(ui.bigWord)}</main>`;
  return `<main class="screen">${head}<div id="bigres">${bigResultsHtml()}</div></main>`;
};
function bigResultsHtml() {
  const q = ui.bigQ.trim();
  if (!q) return `<p class="hint" style="text-align:center;padding:24px 10px">Начни вводить английское слово. Найденное можно сразу добавить в любой пак.</p>`;
  const res = D.search(q, 40);
  if (!res.length) {
    const hit = D.lookup(q);
    if (hit) return `<div class="sugg"><button data-a="big-open" data-w="${esc(hit.word)}"><span lang="en">${esc(hit.word)}</span><small>${esc(D.shortTranslation(hit.groups, 3))}</small></button></div><p class="hint">Похоже на форму слова «${esc(hit.word)}».</p>`;
    return `<p class="hint" style="text-align:center;padding:24px 10px">Такого слова в словаре нет.</p>`;
  }
  return `<div class="sugg">${res.map((k) => { const e = D.exact(k); return `<button data-a="big-open" data-w="${esc(k)}"><span lang="en">${esc(k)}</span><small>${esc(e ? D.shortTranslation(e.groups, 3) : '')}</small></button>`; }).join('')}</div>`;
}
function entryHtml(word) {
  const e = D.exact(word);
  if (!e) return '<p class="hint">Слово не найдено.</p>';
  const mine = words().find((w) => w.key === word);
  let where = '';
  if (mine) { const f = findPart(mine.partId); where = f ? partTitle(f.pack, f.part) : ''; }
  return `<div class="entry">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
      <div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span class="w" lang="en">${esc(word)}</span>${e.ipa ? `<span class="ipa">[${esc(e.ipa)}]</span>` : ''}</div>
      ${ttsOn() ? `<button class="speak" data-a="speak-text" data-w="${esc(word)}" aria-label="Произнести слово">${I.speaker}</button>` : ''}</div>
    ${e.groups.map((g) => `<div class="grp"><small>${esc(posFull(g[0]))}</small>${g[1].map((t) => `<span>${esc(t)}</span>`).join('')}</div>`).join('')}
  </div>
  <div class="spacer"></div>
  ${mine ? `<p class="note-in" style="text-align:center">Уже в твоём словаре${where ? ': ' + esc(where) : ''}</p><button class="btn light" data-a="word" data-id="${mine.id}">Открыть карточку слова</button>`
    : `<button class="btn accent" data-a="add-to-pack" data-w="${esc(word)}">${I.plus} Добавить в пак</button>`}`;
}
function addWordToPart(word, partId) {
  const f = findPart(partId); if (!f) return;
  const k = IMP.keyOf(word);
  if (words().some((w) => w.key === k)) { toast('Это слово уже есть'); return; }
  const e = D.exact(word);
  const w = makeWord(word, e ? D.shortTranslation(e.groups, 2) : '', f.pack.id, partId);
  S.words[w.id] = w; f.part.wordIds.push(w.id);
  save();
  ui.overlay = { type: 'add', word, added: partId };
  render();
  toast('Добавлено: ' + partTitle(f.pack, f.part));
}

/* ---------- неправильные глаголы ---------- */
const altOf = (s) => s.split('/').map((x) => x.trim().toLowerCase());
function regular(base) {
  if (base.endsWith('e')) return base + 'd';
  if (/[^aeiou]y$/.test(base)) return base.slice(0, -1) + 'ied';
  return base + 'ed';
}
function fakeForms(v) {
  const [base, past, pp] = v;
  const set = new Set();
  const add = (x) => { if (x && /^[a-z]+$/.test(x)) set.add(x); };
  add(regular(base)); add(base + 'en'); add(altOf(past)[0] + 'ed'); add(altOf(pp)[0] === altOf(past)[0] ? altOf(past)[0] + 'en' : altOf(past)[0] + 'n');
  const swaps = [['i', 'a'], ['i', 'u'], ['a', 'u'], ['ee', 'e'], ['ea', 'o'], ['ow', 'ew'], ['o', 'a'], ['ea', 'e'], ['ight', 'aught'], ['ought', 'aught'], ['ink', 'ank'], ['ing', 'ung'], ['ear', 'ore']];
  for (const [a, b] of swaps) {
    if (base.includes(a)) add(base.replace(a, b));
    const p0 = altOf(past)[0];
    if (p0.includes(a)) add(p0.replace(a, b));
  }
  const correct = new Set([...altOf(past), ...altOf(pp)]);
  return SRS.shuffle([...set].filter((x) => !correct.has(x) && x !== base));
}
function startVerbs() {
  const now = Date.now();
  const st = (b) => S.verbs[b] || SRS.freshProgress();
  const due = VERBS.filter((v) => { const p = st(v[0]); return p.level !== 0 && p.due <= now; });
  const fresh = VERBS.filter((v) => st(v[0]).level === 0);
  let pick = due.concat(fresh.slice(0, 8));
  if (pick.length < 15) pick = pick.concat(SRS.shuffle(VERBS.filter((v) => !pick.includes(v))).slice(0, 15 - pick.length));
  pick = SRS.shuffle(pick.slice(0, 15));
  ui.vs = { list: pick, idx: 0, mode: ui.vs ? ui.vs.mode : 'choose', correct: 0, wrong: 0 };
  prepVerb();
  go('verbs');
}
function prepVerb() {
  const vs = ui.vs; const v = vs.list[vs.idx]; if (!v) return;
  const chips = SRS.shuffle([altOf(v[1])[0], altOf(v[2])[0], ...fakeForms(v).slice(0, 4)]);
  vs.cur = { chips: [...new Set(chips)], v2: '', v3: '', checked: false };
  vs.anim = 'card';
}
SCREENS.verbs = () => {
  const vs = ui.vs;
  if (!vs) return SCREENS.home();
  if (vs.idx >= vs.list.length) {
    return `<main class="screen done-screen"><div class="spacer"></div><div class="big">Готово</div>
      <p style="margin:0;color:var(--muted);font-size:15px">Неправильные глаголы</p>
      <div class="stats3"><div class="acc"><b>${vs.correct}</b><small>верно</small></div><div><b>${vs.wrong}</b><small>${plural(vs.wrong, 'ошибка', 'ошибки', 'ошибок')}</small></div><div><b>${vs.list.length}</b><small>глаголов</small></div></div>
      <div class="spacer"></div><button class="btn accent" data-a="verbs">Ещё 15 глаголов</button><button class="btn light" data-a="home">На главную</button></main>`;
  }
  const v = vs.list[vs.idx]; const c = vs.cur;
  const p = S.verbs[v[0]] || SRS.freshProgress();
  const ok2 = altOf(v[1]).includes(c.v2.trim().toLowerCase());
  const ok3 = altOf(v[2]).includes(c.v3.trim().toLowerCase());
  const boxCls = (val, ok, active, key) => (c.checked ? (ok ? 'ok' + (c.justChecked ? ' pulse' : '') : 'bad' + (c.justChecked ? ' shake' : '')) : val ? 'filled' + (c.justFilled === key ? ' pop-fill' : '') : active ? 'active' : '');
  const slots = vs.mode === 'choose'
    ? `<div class="slot"><small>Past Simple</small><span class="box ${boxCls(c.v2, ok2, !c.v2, 'v2')}">${esc(c.v2 || '?')}</span></div>
       <div class="slot"><small>Past Participle</small><span class="box ${boxCls(c.v3, ok3, c.v2 && !c.v3, 'v3')}">${esc(c.v3 || '?')}</span></div>`
    : `<div class="slot"><label for="v2" style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase">Past Simple</label><input id="v2" data-in="v2" value="${esc(c.v2)}" class="${c.checked ? (ok2 ? 'ok' : 'bad') : ''}" autocapitalize="off" autocomplete="off" spellcheck="false" ${c.checked ? 'readonly' : ''}></div>
       <div class="slot"><label for="v3" style="font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase">Past Participle</label><input id="v3" data-in="v3" value="${esc(c.v3)}" class="${c.checked ? (ok3 ? 'ok' : 'bad') : ''}" autocapitalize="off" autocomplete="off" spellcheck="false" ${c.checked ? 'readonly' : ''}></div>`;
  return `<main class="screen">
    <div class="topbar"><button class="icon-btn" data-a="home" aria-label="Закончить">${I.close}</button>
      <h1 style="font-size:17px">Неправильные глаголы<span class="sub">${vs.idx + 1} из ${vs.list.length} · <span class="lv w-${SRS.levelKey(p.level)}" style="margin-left:0">${esc(SRS.toNextText(p))}</span></span></h1></div>
    <div class="seg"><button class="${vs.mode === 'choose' ? 'on' : ''}" data-a="vmode" data-v="choose">Выбор форм</button><button class="${vs.mode === 'type' ? 'on' : ''}" data-a="vmode" data-v="type">Ввод с клавиатуры</button></div>
    <div class="vcard ${vs.anim === 'card' ? 'card-in' : ''}"><div style="display:flex;flex-direction:column;align-items:center;gap:4px"><span class="word" lang="en">${esc(v[0])}</span><span class="tr">${esc(v[3])}</span></div>
      <hr><span class="hint" style="font-size:14px;font-weight:700">${c.checked ? (ok2 && ok3 ? 'Верно!' : 'Правильно: ' + esc(v[1]) + ' · ' + esc(v[2])) : 'Заполни две формы глагола'}</span>
      <div class="slots">${slots}</div></div>
    ${vs.mode === 'choose' && !c.checked ? `<span class="hint" style="font-size:13px;font-weight:700;padding-left:4px">Варианты</span>
      <div class="vchips" style="margin-top:-8px">${c.chips.map((t) => `<button class="${t === c.v2 || t === c.v3 ? 'used' : ''}" data-a="vchip" data-v="${esc(t)}" lang="en">${esc(t)}</button>`).join('')}</div>` : ''}
    <div class="spacer"></div>
    <div style="display:flex;gap:10px">
      ${c.checked ? `<button class="btn accent" data-a="vnext" data-a2="speak">Дальше</button>`
        : `<button class="btn light" style="flex:1" data-a="vreset">Заново</button><button class="btn accent" style="flex:2" data-a="vcheck" ${c.v2 && c.v3 ? '' : 'disabled'}>Проверить</button>`}
    </div>
  </main>`;
};
function checkVerb() {
  const vs = ui.vs; const v = vs.list[vs.idx]; const c = vs.cur;
  if (!c.v2 || !c.v3 || c.checked) return;
  c.checked = true; c.justChecked = true;
  const ok = altOf(v[1]).includes(c.v2.trim().toLowerCase()) && altOf(v[2]).includes(c.v3.trim().toLowerCase());
  const p = S.verbs[v[0]] || SRS.freshProgress();
  SRS.answer(p, ok); S.verbs[v[0]] = p;
  if (ok) vs.correct++; else vs.wrong++;
  save();
  speak(v[0] + ', ' + altOf(v[1])[0] + ', ' + altOf(v[2])[0], S.settings);
  render();
}

/* ---------- настройки ---------- */
SCREENS.settings = () => {
  const st = S.settings;
  const voices = ttsAvailable() ? englishVoices(st.accent) : [];
  const curVoice = voices.find((v) => v.voiceURI === st.voiceURI) || voices[0];
  const seg = (key, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(st[key]) === String(v) ? 'on' : ''}" data-a="set" data-k="${key}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const sw = (key, label) => `<label class="switch"><input type="checkbox" data-in="set-bool" data-k="${key}" ${st[key] ? 'checked' : ''} aria-label="${esc(label)}"><span></span></label>`;
  const ago = S.lastBackup ? agoText(S.lastBackup) : 'ещё не было';
  return `<main class="screen" style="gap:22px">
    <div class="topbar"><button class="icon-btn" data-a="home" aria-label="Назад">${I.back}</button><h1>Настройки</h1></div>
    <section class="group"><h2>Тренировка</h2><div class="box">
      <div class="set-row"><span><b>Новых слов в день</b><small>Повторения не ограничены</small></span>
        <span class="stepper"><button data-a="step" data-k="newPerDay" data-v="-2" aria-label="Меньше">−</button><span>${st.newPerDay}</span><button data-a="step" data-k="newPerDay" data-v="2" aria-label="Больше">+</button></span></div>
      <div class="set-row col"><b>Направление карточек</b>${seg('direction', [['enru', 'EN → RU'], ['ruen', 'RU → EN'], ['mixed', 'Вперемешку']])}
        <small>«Вперемешку»: выученные слова иногда спрашиваются с русского.</small></div>
      <div class="set-row"><span><b>Сразу следующая карточка</b><small>Без кнопки «Дальше», если ответ верный</small></span>${sw('autoNext', 'Сразу следующая карточка')}</div>
    </div></section>
    <section class="group"><h2>Уровни запоминания</h2><div class="box">
      <div class="set-row"><b><span class="lv w-r" style="margin-left:0">Сложное</span> → <span class="lv w-y" style="margin-left:0">Учу</span></b><span class="val">${SRS.TO_YELLOW} верных подряд</span></div>
      <div class="set-row"><b><span class="lv w-y" style="margin-left:0">Учу</span> → <span class="lv w-g" style="margin-left:0">Знаю</span></b><span class="val">${SRS.TO_GREEN} верных подряд</span></div>
      <div class="set-row"><b>Ошибка</b><span class="val">минус 1 уровень</span></div>
    </div></section>
    <section class="group"><h2>Озвучка</h2><div class="box">
      <div class="set-row"><span><b>Озвучка слов</b><small>${ttsAvailable() ? 'Встроенный голос iPhone, работает без интернета' : 'Этот браузер не умеет озвучивать текст'}</small></span>${sw('tts', 'Озвучка слов')}</div>
      ${st.tts !== false ? `
      <div class="set-row"><b>Произносить слово автоматически</b>${sw('autoSpeak', 'Произносить автоматически')}</div>
      <div class="set-row col"><b>Произношение</b>${seg('accent', [['en-GB', 'Британское'], ['en-US', 'Американское']])}</div>
      <div class="set-row col"><span style="display:flex;justify-content:space-between"><b>Скорость речи</b><span class="val">${String(st.rate).replace('.', ',')}×</span></span>
        <input class="range" type="range" min="0.5" max="1.3" step="0.1" value="${st.rate}" data-in="rate" aria-label="Скорость речи"></div>
      <div class="set-row col"><label for="voice"><b>Голос</b><small>Голоса получше: Настройки iPhone → Универсальный доступ → Устный контент → Голоса → English</small></label>
        ${voices.length ? `<select id="voice" class="input" data-in="voice">${voices.map((v) => `<option value="${esc(v.voiceURI)}" ${curVoice && v.voiceURI === curVoice.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select>` : '<small>Голоса появятся после первого запуска озвучки.</small>'}
        <button class="btn light small" data-a="speak-text" data-w="Hello! Let's learn some new words today.">Проверить голос</button></div>` : ''}
    </div></section>
    <section class="group"><h2>Импорт</h2><div class="box">
      <div class="set-row"><b>Размер части по умолчанию</b><span class="stepper"><button data-a="step" data-k="partSize" data-v="-5" aria-label="Меньше">−</button><span>${st.partSize}</span><button data-a="step" data-k="partSize" data-v="5" aria-label="Больше">+</button></span></div>
      <div class="set-row"><span><b>Брать только англ. → рус.</b><small>Остальное — списком «пропущено»</small></span>${sw('onlyEnRu', 'Брать только английский-русский')}</div>
    </div></section>
    <section class="group"><h2>Оформление</h2><div class="box"><div class="set-row col"><b>Тема</b>${seg('theme', [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Как в iPhone']])}</div></div></section>
    <section class="group"><h2>Данные</h2><div class="box">
      <button class="set-row" data-a="backup"><span><b>Сохранить резервную копию</b><small>Файл в «Файлы» / iCloud Drive · последняя: ${esc(ago)}</small></span>${I.chevR}</button>
      <button class="set-row" data-a="restore"><b>Восстановить из копии</b>${I.chevR}</button>
      <div class="set-row"><span><b>Напоминать о копии</b><small>Раз в неделю на главном экране</small></span>${sw('backupReminder', 'Напоминать о копии')}</div>
      <button class="set-row danger" data-a="reset-progress"><b>Сбросить весь прогресс</b></button>
      <button class="set-row danger" data-a="wipe"><b>Удалить все слова и паки</b></button>
    </div></section>
    <p class="foot">Версия 0.1 · Все данные хранятся только на этом телефоне<br>Словарь: Викисловарь (CC BY-SA), произношения: CMUdict</p>
  </main>`;
};
function agoText(ts) {
  const d = Math.floor((Date.now() - ts) / DAY);
  if (d <= 0) return 'сегодня';
  if (d === 1) return 'вчера';
  return d + ' ' + plural(d, 'день', 'дня', 'дней') + ' назад';
}
async function doBackup() {
  const payload = JSON.stringify({ app: 'slova', version: 1, exported: Date.now(), state: S });
  const name = 'slova-backup-' + SRS.todayKey() + '.json';
  const file = new File([payload], name, { type: 'application/json' });
  let done = false;
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Резервная копия слов' });
      done = true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  if (!done) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  S.lastBackup = Date.now(); save(); render();
  toast('Копия сохранена');
}
async function doRestore(file) {
  try {
    const j = JSON.parse(await file.text());
    if (!j || j.app !== 'slova' || !j.state) throw new Error('bad');
    const n = Object.keys(j.state.words || {}).length;
    if (!confirm('Заменить текущие данные копией от ' + fmtDate(j.exported) + ' (' + slov(n) + ')?')) return;
    S = normalize(j.state);
    await writeNow(S); applyTheme(); go('home'); toast('Копия восстановлена');
  } catch (e) { toast('Это не файл резервной копии'); }
}

/* ---------- оверлеи ---------- */
let lastOv = null;
function overlayHtml() {
  const o = ui.overlay; if (!o) { lastOv = null; return ''; }
  const still = lastOv === o.type;
  lastOv = o.type;
  const back = `<div class="backdrop ${still ? 'still' : ''}" data-a="close-ov"></div>`;
  if (o.type === 'drawer') {
    const plan = todayPlan();
    const item = (a, ic, label, badge, on, muted) => `<button class="nav-item ${on ? 'on' : ''}" data-a="${a}"><span class="l"><span class="ic ${muted ? 'muted' : ''}">${navIcon(ic)}</span>${label}</span><small>${badge || ''}</small></button>`;
    return back + `<nav class="drawer ${still ? 'still' : ''}" aria-label="Главное меню">
      <div class="head"><b>Меню</b><button class="icon-btn" style="background:var(--bg)" data-a="close-ov" aria-label="Закрыть меню">${I.close}</button></div>
      ${item('home', 'home', 'Главная', '', ui.route === 'home')}
      ${item('start-today', 'today', 'Учить сегодня', plan.due.length + plan.fresh.length || '', false)}
      ${item('dict', 'dict', 'Личный словарь', words().length || '', ui.route === 'dict')}
      ${item('big', 'big', 'Большой словарь', '', ui.route === 'big')}
      ${item('verbs', 'verbs', 'Неправильные глаголы', '', ui.route === 'verbs')}
      ${item('import', 'imp', 'Импорт из Google', '', false)}
      <hr>
      ${item('backup', 'backup', 'Резервная копия', '', false, true)}
      ${item('settings', 'settings', 'Настройки', '', ui.route === 'settings', true)}
      <div class="note">Все слова и прогресс хранятся только на этом телефоне. Резервную копию можно сохранить в iCloud Drive.</div></nav>`;
  }
  const sheet = (inner, label) => back + `<div class="sheet ${still ? 'still' : ''}" role="dialog" aria-label="${esc(label)}"><span class="grab" aria-hidden="true"></span>${inner}</div>`;
  if (o.type === 'filters') {
    const f = ui.filter;
    return sheet(`<div style="display:flex;justify-content:space-between;align-items:center"><h3>Фильтр и сортировка</h3><button class="small-btn" style="border:none" data-a="reset-filters">Сбросить</button></div>
      <div style="display:flex;flex-direction:column;gap:8px"><span class="label">Часть речи</span><div class="chips">${POS_FILTERS.map(([v, l]) => `<button class="chip ${f.pos === v ? 'on' : ''}" data-a="fpos" data-v="${v}">${l}</button>`).join('')}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px"><span class="label">Уровень</span><div class="chips">${LVL_FILTERS.map(([v, l]) => `<button class="chip ${f.level === v ? 'on' : ''}" data-a="flvl" data-v="${v}">${v === 'all' ? l : `<span class="w-${SRS.levelKey(+v)}" style="margin-left:0">${l}</span>`}</button>`).join('')}</div></div>
      <div style="display:flex;flex-direction:column"><span class="label" style="padding-bottom:6px">Сортировка</span>${SORTS.map(([v, l]) => `<button class="sheet-row" data-a="fsort" data-v="${v}"><b>${l}</b><span class="radio ${f.sort === v ? 'on' : ''}"></span></button>`).join('')}</div>
      <button class="btn accent" data-a="close-ov">Показать ${slov(filteredWords().length)}</button>`, 'Фильтр и сортировка');
  }
  if (o.type === 'add') {
    const targets = [];
    for (const p of S.packs.slice().sort((a, b) => (a.source === 'custom') === (b.source === 'custom') ? b.created - a.created : a.source === 'custom' ? -1 : 1)) {
      for (const pt of p.parts) targets.push({ id: pt.id, name: partTitle(p, pt), sub: (p.source === 'custom' ? 'Свой пак · ' : '') + slov(pt.wordIds.length) });
    }
    return sheet(`<h3>Добавить «${esc(o.word)}» в пак</h3><div style="display:flex;flex-direction:column">
      ${targets.map((t) => `<button class="sheet-row" data-a="add-here" data-id="${t.id}" ${o.added ? 'disabled' : ''}><span><b>${esc(t.name)}</b><small>${esc(t.sub)}</small></span>${o.added === t.id ? '<span class="added">Добавлено</span>' : '<span class="radio"></span>'}</button>`).join('')}
      ${!o.added ? `<button class="sheet-row" data-a="add-new-pack" style="color:var(--link);justify-content:flex-start;gap:10px;font-weight:800;font-size:16px">${I.plus} Новый пак</button>` : ''}</div>
      ${o.added ? '<button class="btn dark" data-a="close-ov">Готово</button>' : ''}`, 'Добавить в пак');
  }
  if (o.type === 'pack-menu') {
    const p = S.packs.find((x) => x.id === o.id); if (!p) return '';
    return sheet(`<h3>${esc(p.name)}</h3><div style="display:flex;flex-direction:column">
      <button class="sheet-row" data-a="study-pack" data-id="${p.id}"><b>Учить весь пак</b>${I.chevR}</button>
      <button class="sheet-row" data-a="rename-pack" data-id="${p.id}"><b>Переименовать</b>${I.chevR}</button>
      ${p.source === 'import' ? `<button class="sheet-row" data-a="resplit" data-id="${p.id}"><span><b>Разбить заново</b><small>Сейчас: ${p.parts.length} ${plural(p.parts.length, 'часть', 'части', 'частей')}</small></span>${I.chevR}</button>` : ''}
      <button class="sheet-row" data-a="reset-pack" data-id="${p.id}"><b>Сбросить прогресс пака</b>${I.chevR}</button>
      <button class="sheet-row" data-a="delete-pack" data-id="${p.id}"><b style="color:var(--bad-fg)">Удалить пак со словами</b></button></div>`, 'Действия с паком');
  }
  if (o.type === 'part-menu') {
    const f = findPart(o.id); if (!f) return '';
    return sheet(`<h3>${esc(partTitle(f.pack, f.part))}</h3><div style="display:flex;flex-direction:column">
      <button class="sheet-row" data-a="start-part" data-id="${f.part.id}"><b>Учить</b>${I.chevR}</button>
      <button class="sheet-row" data-a="open-part" data-id="${f.part.id}"><b>Список слов</b>${I.chevR}</button>
      ${f.pack.parts.length > 1 ? `<button class="sheet-row" data-a="rename-part" data-id="${f.part.id}"><b>Переименовать часть</b>${I.chevR}</button>
      <button class="sheet-row" data-a="delete-part" data-id="${f.part.id}"><b style="color:var(--bad-fg)">Удалить часть со словами</b></button>` : `<button class="sheet-row" data-a="rename-pack" data-id="${f.pack.id}"><b>Переименовать</b>${I.chevR}</button>`}</div>`, 'Действия с частью');
  }
  if (o.type === 'date') {
    const months = [...new Set(S.packs.map((p) => monthKey(p.created)))].sort().reverse();
    return sheet(`<h3>Показать паки</h3><div style="display:flex;flex-direction:column">
      <button class="sheet-row" data-a="set-date" data-v="all"><b>Все даты</b><span class="radio ${ui.dateFilter === 'all' ? 'on' : ''}"></span></button>
      ${months.map((m) => `<button class="sheet-row" data-a="set-date" data-v="${m}"><b>${esc(monthLabel(m))}</b><span class="radio ${ui.dateFilter === m ? 'on' : ''}"></span></button>`).join('')}</div>`, 'Фильтр по дате');
  }
  if (o.type === 'word') {
    const w = S.words[o.id]; if (!w) return '';
    const f = findPart(w.partId);
    const exact = w.groups && w.lemma === w.key;
    return sheet(`<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span style="font-size:32px;font-weight:800;word-break:break-word" lang="en">${esc(w.en)}</span>${w.ipa && exact ? `<span class="ipa" style="color:var(--muted)">[${esc(w.ipa)}]</span>` : ''}</div>
        ${ttsOn() ? `<button class="speak" data-a="speak" data-id="${w.id}" aria-label="Произнести слово">${I.speaker}</button>` : ''}</div>
      <span class="w-${SRS.levelKey(w.level)}" style="font-size:14px;font-weight:800;align-self:flex-start;${w.level ? '' : 'color:var(--muted)'}">${esc(SRS.toNextText(w))}</span>
      ${w.groups ? `<div class="entry" style="padding:0;gap:14px">${!exact ? `<p class="note-in" style="margin:0">Форма слова «${esc(w.lemma)}»</p>` : ''}${w.groups.map((g) => `<div class="grp"><small>${esc(posFull(g[0]))}</small><span style="font-size:16px">${esc(g[1].join(', '))}</span></div>`).join('')}</div>` : ''}
      ${w.ru ? `<p class="note-in" style="margin:0">Перевод из Google: ${esc(w.ru)}</p>` : ''}
      ${f ? `<p class="note-in" style="margin:0">Пак: ${esc(partTitle(f.pack, f.part))}</p>` : ''}
      <div style="display:flex;flex-direction:column">
        <button class="sheet-row" data-a="reset-word" data-id="${w.id}"><b>Сбросить прогресс слова</b>${I.chevR}</button>
        <button class="sheet-row" data-a="delete-word" data-id="${w.id}"><b style="color:var(--bad-fg)">Удалить слово</b></button></div>`, 'Карточка слова');
  }
  return '';
}

/* ---------- действия ---------- */
let fileInput = null;
function pickFile(accept, cb) {
  if (fileInput) fileInput.remove();
  fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = accept; fileInput.style.display = 'none';
  fileInput.addEventListener('change', () => { const f = fileInput.files && fileInput.files[0]; if (f) cb(f); });
  document.body.appendChild(fileInput);
  fileInput.click();
}
function deleteWords(ids) {
  for (const id of ids) delete S.words[id];
  for (const p of S.packs) for (const pt of p.parts) pt.wordIds = pt.wordIds.filter((id) => S.words[id]);
}
function resetProgress(w) { Object.assign(w, SRS.freshProgress()); }

const ACTIONS = {
  home: () => go('home'),
  drawer: () => { ui.overlay = { type: 'drawer' }; rerenderOverlay(); },
  'close-ov': () => closeOverlay(() => { const wasFilters = ui.overlay && ui.overlay.type === 'filters'; ui.overlay = null; if (wasFilters || ui.route === 'big') render(); else rerenderOverlay(); }),
  menu: () => { ui.menu = !ui.menu; render(); },
  'collapse-all': () => { ui.expanded = {}; ui.menu = false; render(); },
  'toggle-pack': (el) => {
    const id = el.dataset.id;
    if (ui.expanded[id]) {
      const parts = el.closest('.pack').querySelector('.parts');
      el.querySelector('.chev') && el.querySelector('.chev').classList.remove('open');
      if (parts && !reduceMotion()) { parts.classList.add('parts-out'); setTimeout(() => { ui.expanded[id] = false; render(); }, 170); return; }
      ui.expanded[id] = false; render(); return;
    }
    ui.expanded[id] = true; ui.justExpanded = id; render();
  },
  'more-parts': (el) => { ui.showAllParts[el.dataset.id] = !ui.showAllParts[el.dataset.id]; ui.justMore = el.dataset.id; render(); },
  'open-part': (el) => go('part', { partId: el.dataset.id }),
  'pack-menu': (el) => { ui.overlay = { type: 'pack-menu', id: el.dataset.id }; rerenderOverlay(); },
  'part-menu': (el) => { ui.overlay = { type: 'part-menu', id: el.dataset.id }; rerenderOverlay(); },
  'date-filter': () => { ui.overlay = { type: 'date' }; rerenderOverlay(); },
  'set-date': (el) => { ui.dateFilter = el.dataset.v; closeOverlay(() => { ui.overlay = null; render(); }); },
  'nag-close': () => { S.lastBackupNag = Date.now(); save(); render(); },
  'start-today': () => startToday(),
  'start-part': (el) => startPart(el.dataset.id),
  'study-pack': (el) => {
    const p = S.packs.find((x) => x.id === el.dataset.id); if (!p) return;
    const now = Date.now(); const list = wordList(packWordIds(p));
    let pick = list.filter((w) => SRS.isDue(w, now)).concat(list.filter((w) => w.level === 0)).slice(0, 30);
    if (!pick.length) pick = SRS.shuffle(list).slice(0, 20);
    startSession(SRS.shuffle(pick.map((w) => w.id)), p.name);
  },
  'new-pack': () => {
    ui.menu = false;
    const name = prompt('Название нового пака', 'Мои слова');
    if (!name || !name.trim()) { render(); return; }
    S.packs.push({ id: uid('p'), name: name.trim(), created: Date.now(), source: 'custom', parts: [{ id: uid('pt'), name: '', wordIds: [] }] });
    save(); render(); toast('Пак создан. Слова добавляются из большого словаря');
  },
  'rename-pack': (el) => {
    const p = S.packs.find((x) => x.id === el.dataset.id); if (!p) return;
    const name = prompt('Новое название', p.name);
    if (name && name.trim()) { p.name = name.trim(); save(); }
    ui.overlay = null; render();
  },
  'rename-part': (el) => {
    const f = findPart(el.dataset.id); if (!f) return;
    const name = prompt('Название части', f.part.name);
    if (name && name.trim()) { f.part.name = name.trim(); save(); }
    ui.overlay = null; render();
  },
  resplit: (el) => {
    const p = S.packs.find((x) => x.id === el.dataset.id); if (!p) return;
    const v = prompt('Сколько слов примерно в одной части?', String(S.settings.partSize));
    const size = parseInt(v, 10); if (!size || size < 1) return;
    const ids = packWordIds(p);
    const sizes = IMP.splitSizes(ids.length, size);
    let k = 0;
    p.parts = sizes.map((sz, i) => {
      const part = { id: uid('pt'), name: sizes.length > 1 ? 'Часть ' + (i + 1) : '', wordIds: ids.slice(k, k + sz) };
      k += sz; part.wordIds.forEach((id) => { S.words[id].partId = part.id; });
      return part;
    });
    save(); ui.overlay = null; ui.expanded[p.id] = true; render();
    toast(sizes.length + ' ' + plural(sizes.length, 'часть', 'части', 'частей'));
  },
  'reset-pack': (el) => {
    const p = S.packs.find((x) => x.id === el.dataset.id); if (!p) return;
    if (!confirm('Сбросить прогресс всех слов пака «' + p.name + '»?')) return;
    wordList(packWordIds(p)).forEach(resetProgress); save(); ui.overlay = null; render();
  },
  'delete-pack': (el) => {
    const p = S.packs.find((x) => x.id === el.dataset.id); if (!p) return;
    if (!confirm('Удалить пак «' + p.name + '» и все его слова (' + packWordIds(p).length + ')?')) return;
    deleteWords(packWordIds(p)); S.packs = S.packs.filter((x) => x !== p); save(); ui.overlay = null; go('home');
  },
  'delete-part': (el) => {
    const f = findPart(el.dataset.id); if (!f) return;
    if (!confirm('Удалить часть и её слова (' + f.part.wordIds.length + ')?')) return;
    deleteWords(f.part.wordIds); f.pack.parts = f.pack.parts.filter((x) => x !== f.part);
    if (!f.pack.parts.length) S.packs = S.packs.filter((x) => x !== f.pack);
    save(); ui.overlay = null; go('home');
  },
  import: () => { ui.menu = false; ui.overlay = null; pickFile('.xlsx,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', onFileChosen); },
  'imp-include': (el) => { const g = ui.importData.result.skipped[el.dataset.id]; g.include = !g.include; render(); },
  'imp-size': (el, ev) => { if (ev.target.tagName === 'INPUT') { ui.importData.size = 'custom'; return; } const v = el.dataset.v; ui.importData.size = v === 'custom' ? 'custom' : +v; render(); if (v === 'custom') { const i = document.querySelector('[data-in="imp-custom"]'); if (i) i.focus(); } },
  'imp-create': () => createPackFromImport(),
  pick: (el) => onPick(+el.dataset.i),
  'dont-know': () => onPick(-1),
  'next-card': () => nextCard(),
  'end-train': () => { ui.session = null; go('home'); },
  speak: (el) => { const w = S.words[el.dataset.id]; if (w) speak(w.en, S.settings); },
  'speak-text': (el) => speak(el.dataset.w, S.settings),
  dict: () => go('dict'),
  filters: () => { ui.overlay = { type: 'filters' }; rerenderOverlay(); },
  fpos: (el) => { ui.filter.pos = el.dataset.v; render(); },
  flvl: (el) => { ui.filter.level = el.dataset.v; render(); },
  fsort: (el) => { ui.filter.sort = el.dataset.v; render(); },
  'reset-filters': () => { ui.filter = { pos: 'all', level: 'all', sort: 'date' }; render(); },
  word: (el) => { ui.overlay = { type: 'word', id: el.dataset.id }; rerenderOverlay(); },
  'reset-word': (el) => { const w = S.words[el.dataset.id]; if (w) { resetProgress(w); save(); } render(); },
  'delete-word': (el) => {
    const w = S.words[el.dataset.id]; if (!w) return;
    if (!confirm('Удалить «' + w.en + '»?')) return;
    deleteWords([w.id]); ui.overlay = null; save(); render();
  },
  big: () => go('big', { bigWord: null }),
  'big-open': (el) => { ui.bigWord = el.dataset.w; ui.anim = 'fwd'; render(); window.scrollTo(0, 0); },
  'big-back': () => { ui.bigWord = null; ui.anim = 'back'; render(); },
  'add-to-pack': (el) => {
    if (!S.packs.length) {
      const name = prompt('Паков пока нет. Название нового пака:', 'Мои слова');
      if (!name || !name.trim()) return;
      S.packs.push({ id: uid('p'), name: name.trim(), created: Date.now(), source: 'custom', parts: [{ id: uid('pt'), name: '', wordIds: [] }] });
    }
    ui.overlay = { type: 'add', word: el.dataset.w, added: null }; rerenderOverlay();
  },
  'add-here': (el) => addWordToPart(ui.overlay.word, el.dataset.id),
  'add-new-pack': () => {
    const name = prompt('Название нового пака', 'Мои слова'); if (!name || !name.trim()) return;
    const p = { id: uid('p'), name: name.trim(), created: Date.now(), source: 'custom', parts: [{ id: uid('pt'), name: '', wordIds: [] }] };
    S.packs.push(p); addWordToPart(ui.overlay.word, p.parts[0].id);
  },
  verbs: () => startVerbs(),
  vmode: (el) => { ui.vs.mode = el.dataset.v; ui.vs.cur.v2 = ''; ui.vs.cur.v3 = ''; render(); if (el.dataset.v === 'type') { const i = document.getElementById('v2'); if (i) i.focus(); } },
  vchip: (el) => { const c = ui.vs.cur; if (c.checked) return; const t = el.dataset.v; if (t === c.v2 || t === c.v3) return; if (!c.v2) { c.v2 = t; c.justFilled = 'v2'; } else if (!c.v3) { c.v3 = t; c.justFilled = 'v3'; } render(); if (c.v2 && c.v3) setTimeout(() => { if (ui.vs && ui.vs.cur === c) { c.justFilled = null; checkVerb(); } }, 260); },
  vreset: () => { ui.vs.cur.v2 = ''; ui.vs.cur.v3 = ''; render(); },
  vcheck: () => checkVerb(),
  vnext: () => { ui.vs.idx++; prepVerb(); render(); },
  settings: () => go('settings'),
  set: (el) => {
    const k = el.dataset.k; const v = el.dataset.v; S.settings[k] = v; save();
    if (k === 'theme') { document.documentElement.classList.add('theme-anim'); applyTheme(); setTimeout(() => document.documentElement.classList.remove('theme-anim'), 450); }
    render();
  },
  step: (el) => {
    const k = el.dataset.k; const lim = { newPerDay: [2, 60], partSize: [10, 200] }[k];
    S.settings[k] = Math.min(lim[1], Math.max(lim[0], S.settings[k] + +el.dataset.v)); save(); render();
  },
  backup: () => { ui.overlay = null; doBackup(); },
  restore: () => pickFile('.json,application/json', doRestore),
  'reset-progress': () => {
    if (!confirm('Сбросить прогресс всех слов и глаголов? Слова останутся.')) return;
    words().forEach(resetProgress); S.verbs = {}; save(); render(); toast('Прогресс сброшен');
  },
  wipe: () => {
    if (!confirm('Удалить все слова и паки? Это нельзя отменить.')) return;
    if (!confirm('Точно удалить? Лучше сначала сохрани резервную копию.')) return;
    S.words = {}; S.packs = []; S.verbs = {}; save(); go('home'); toast('Все данные удалены');
  },
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') {
    if (ui.menu && !ev.target.closest('.pop') && !ev.target.closest('[data-a="menu"]')) { ui.menu = false; render(); }
    return;
  }
  const fn = ACTIONS[el.dataset.a];
  if (ui.menu && el.dataset.a !== 'menu' && !el.closest('.pop')) ui.menu = false;
  if (fn) fn(el, ev);
});

document.addEventListener('input', (ev) => {
  const el = ev.target; const k = el.dataset && el.dataset.in; if (!k) return;
  if (k === 'dict-q') { ui.q = el.value; const box = document.getElementById('dlist'); if (box) box.innerHTML = dictListHtml(); }
  else if (k === 'big-q') { ui.bigQ = el.value; if (ui.bigWord) { ui.bigWord = null; render(); const i = document.querySelector('[data-in="big-q"]'); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } return; } const box = document.getElementById('bigres'); if (box) box.innerHTML = bigResultsHtml(); }
  else if (k === 'imp-name') ui.importData.name = el.value;
  else if (k === 'imp-custom') {
    ui.importData.custom = el.value.replace(/\D/g, ''); ui.importData.size = 'custom';
    const r = ui.importData.result; const n = IMP.finalWords(r, keySet()).length; const size = parseInt(ui.importData.custom, 10) || 0;
    const sizes = size > 0 ? IMP.splitSizes(n, size) : [n]; const mn = Math.min(...sizes), mx = Math.max(...sizes);
    const h = document.getElementById('split-hint');
    if (h) h.textContent = sizes.length === 1 ? 'Получится один пак без частей.' : 'Получится ' + sizes.length + ' ' + plural(sizes.length, 'часть', 'части', 'частей') + ' по ' + (mn === mx ? mn : mn + '–' + mx) + ' ' + plural(mx, 'слово', 'слова', 'слов') + '. Слова делятся поровну, чтобы последняя часть не оказалась крошечной.';
    document.querySelectorAll('[data-a="imp-size"]').forEach((b) => b.classList.toggle('on', b.dataset.v === 'custom'));
  }
  else if (k === 'v2' || k === 'v3') {
    ui.vs.cur[k] = el.value;
    const btn = document.querySelector('[data-a="vcheck"]'); if (btn) btn.disabled = !(ui.vs.cur.v2 && ui.vs.cur.v3);
  }
  else if (k === 'rate') { S.settings.rate = +el.value; save(); const v = el.closest('.set-row').querySelector('.val'); if (v) v.textContent = String(el.value).replace('.', ',') + '×'; }
});
document.addEventListener('change', (ev) => {
  const el = ev.target; const k = el.dataset && el.dataset.in; if (!k) return;
  if (k === 'imp-split') { ui.importData.split = el.checked; render(); }
  else if (k === 'set-bool') { S.settings[el.dataset.k] = el.checked; save(); if (el.dataset.k === 'tts') { if (!el.checked && window.speechSynthesis) speechSynthesis.cancel(); render(); } }
  else if (k === 'voice') { S.settings.voiceURI = el.value; save(); speak('Hello!', S.settings); }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ui.route === 'verbs' && ui.vs && ui.vs.mode === 'type') {
    if (ev.target.id === 'v2') { const n = document.getElementById('v3'); if (n) n.focus(); }
    else if (ev.target.id === 'v3') { if (ui.vs.cur.checked) ACTIONS.vnext(); else checkVerb(); }
  }
});

/* ---------- свайп для закрытия шторок ---------- */
let drag = null;
document.addEventListener('touchstart', (ev) => {
  const el = ev.target.closest('.sheet, .drawer');
  if (!el || ev.touches.length !== 1) return;
  if (el.classList.contains('sheet') && el.scrollTop > 0) return;
  if (ev.target.closest('input, select, .range')) return;
  drag = { el, x: ev.touches[0].clientX, y: ev.touches[0].clientY, d: 0, sheet: el.classList.contains('sheet'), axis: null };
}, { passive: true });
document.addEventListener('touchmove', (ev) => {
  if (!drag) return;
  const dx = ev.touches[0].clientX - drag.x, dy = ev.touches[0].clientY - drag.y;
  if (!drag.axis) { if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; drag.axis = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x'; }
  const d = drag.sheet ? (drag.axis === 'y' ? dy : 0) : (drag.axis === 'x' ? dx : 0);
  if (d <= 0) { drag.el.style.transform = ''; drag.d = 0; return; }
  drag.d = d;
  drag.el.style.transition = 'none';
  drag.el.style.transform = drag.sheet ? `translateY(${d}px)` : `translateX(${d}px)`;
  ev.preventDefault();
}, { passive: false });
document.addEventListener('touchend', () => {
  if (!drag) return;
  const { el, d } = drag; drag = null;
  el.style.transition = '';
  if (d > 90) ACTIONS['close-ov']();
  else el.style.transform = '';
});

/* ---------- запуск ---------- */
async function boot() {
  S = await loadState();
  applyTheme();
  rollDaily();
  render();
  askPersistence();
  D.loadDict().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !navigator.serviceWorker.controller) return;
      if (ui.route === 'home' && !ui.overlay) { reloaded = true; location.reload(); }
      else toast('Приложение обновлено — перезапусти его');
    });
  }
  window.__slova = { get state() { return S; }, ui };
}
boot();
