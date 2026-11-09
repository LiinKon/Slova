// Анимации переходов: сравнивает экран до и после перерисовки.
// Элементы с data-key: новые — плавно появляются, пропавшие — растворяются на месте,
// сдвинувшиеся — доезжают до нового места (техника FLIP).
const EASE = 'cubic-bezier(.22, 1, .36, 1)';

export const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const onScreen = (r) => r.bottom > -80 && r.top < window.innerHeight + 80 && r.width > 0;

export function snapshot(root) {
  const map = new Map();
  if (!root) return map;
  root.querySelectorAll('[data-key]').forEach((el) => {
    map.set(el.dataset.key, { el, r: el.getBoundingClientRect(), cls: el.className });
  });
  return map;
}

// Призрак: старый элемент на прежнем месте поверх нового экрана, который плавно исчезает.
export function ghost(el, rect, { z = 3, to, from = 'none', duration = 200, fadeTo = 0, easing = 'ease-in' } = {}) {
  if (!el || !rect || !rect.width) return;
  // Восстанавливаем цепочку предков-обёрток без собственной разметки, чтобы стили вида «.list .row» продолжали работать.
  let outer = null, inner = null;
  let p = el.parentElement;
  const chain = [];
  while (p && p.id !== 'app' && chain.length < 12) { chain.unshift(p); p = p.parentElement; }
  for (const a of chain) {
    const c = a.cloneNode(false);
    c.removeAttribute('id'); c.removeAttribute('data-key');
    c.style.cssText = 'all: unset; display: block;';
    if (!outer) outer = c; else inner.appendChild(c);
    inner = c;
  }
  const holder = document.createElement('div');
  holder.className = 'ghost';
  holder.style.cssText = `position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;z-index:${z};pointer-events:none;margin:0;`;
  el.style.margin = '0';
  el.style.width = rect.width + 'px';
  el.style.height = rect.height + 'px';
  el.style.animation = 'none';
  el.style.boxSizing = 'border-box';
  el.style.pointerEvents = 'none';
  el.removeAttribute('data-key');
  if (outer) { inner.appendChild(el); holder.appendChild(outer); } else holder.appendChild(el);
  document.body.appendChild(holder);
  el.style.transform = '';
  const anim = el.animate([
    { opacity: 1, transform: from },
    { opacity: fadeTo, transform: to || 'translateY(-4px) scale(.98)' },
  ], { duration, easing, fill: 'forwards' });
  anim.onfinish = () => holder.remove();
  setTimeout(() => holder.remove(), duration + 200);
}

// Замер шторок/меню до перерисовки (без учёта текущего сдвига пальцем).
export function measureOverlays(nodes) {
  return nodes.map((n) => {
    const tr = n.style.transform || '';
    n.style.transform = '';
    const r = n.getBoundingClientRect();
    return { n, r, tr };
  });
}
// Плавно уводит старые шторки/меню.
export function ghostOverlays(list) {
  for (const { n, r, tr } of list) {
    const isDrawer = n.classList.contains('drawer');
    const isSheet = n.classList.contains('sheet');
    const isBack = n.classList.contains('backdrop');
    ghost(n, r, {
      z: isBack ? 39 : 42,
      duration: isBack ? 220 : 240,
      from: tr || 'none',
      to: isBack ? 'none' : isDrawer ? 'translateX(100%)' : isSheet ? 'translateY(100%)' : 'scale(.96)',
      fadeTo: isBack ? 0 : 1,
      easing: 'cubic-bezier(.4, 0, 1, 1)',
    });
  }
}

// Уводит старый экран при переходе между экранами.
export function ghostScreen(main, rect, dir) {
  if (!main || !rect) return;
  const to = dir === 'back' ? 'translateX(24px)' : dir === 'fwd' ? 'translateX(-24px)' : 'none';
  ghost(main, rect, { z: 0, duration: 140, to, easing: 'cubic-bezier(0, 0, .2, 1)' });
}

export function flip(root, before) {
  if (!root || !before || reduced()) return;
  const now = new Map();
  root.querySelectorAll('[data-key]').forEach((el) => now.set(el.dataset.key, el));
  const nearestKeyed = (el) => { const a = el.parentElement && el.parentElement.closest('[data-key]'); return a && root.contains(a) ? a : null; };

  // Сдвиги
  const delta = new Map();
  now.forEach((el, k) => {
    const b = before.get(k); if (!b) return;
    const r = el.getBoundingClientRect();
    delta.set(el, { dx: b.r.left - r.left, dy: b.r.top - r.top, r });
  });
  now.forEach((el, k) => {
    const b = before.get(k); if (!b) return;
    const d = delta.get(el);
    const parent = nearestKeyed(el);
    const pd = parent && delta.get(parent) ? delta.get(parent) : { dx: 0, dy: 0 };
    const dx = d.dx - pd.dx, dy = d.dy - pd.dy;
    if ((Math.abs(dx) > 1 || Math.abs(dy) > 1) && (onScreen(d.r) || onScreen(b.r))) {
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 320, easing: EASE });
    }
    // Поворот стрелок раскрытия
    if (el.classList.contains('chev')) {
      const was = /\bopen\b/.test(b.cls), is = el.classList.contains('open');
      if (was !== is) el.animate([{ transform: `rotate(${was ? 180 : 0}deg)` }, { transform: `rotate(${is ? 180 : 0}deg)` }], { duration: 260, easing: EASE });
    }
  });

  // Что исчезает
  const gone = [];
  before.forEach((b, k) => {
    if (now.has(k)) return;
    const p = b.el.parentElement && b.el.parentElement.closest('[data-key]');
    if (p && !now.has(p.dataset.key) && before.has(p.dataset.key)) return; // уйдёт вместе с родителем
    if (!onScreen(b.r)) return;
    gone.push(b);
  });
  const base = gone.length ? 70 : 0;

  // Появление (только самые внешние новые элементы, лесенкой внутри общего родителя)
  const groups = new Map();
  now.forEach((el, k) => {
    if (before.has(k)) return;
    const parent = nearestKeyed(el);
    if (parent && !before.has(parent.dataset.key)) return;
    const r = el.getBoundingClientRect();
    if (!onScreen(r)) return;
    const g = groups.get(el.parentElement) || [];
    g.push(el); groups.set(el.parentElement, g);
  });
  groups.forEach((list) => list.forEach((el, i) => {
    const kind = el.dataset.appear || 'down';
    const from = kind === 'pop' ? 'scale(.92) translateY(-6px)' : kind === 'up' ? 'translateY(10px)' : kind === 'fade' ? 'none' : 'translateY(-8px)';
    el.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }],
      { duration: 280, delay: base + Math.min(i, 8) * 35, easing: EASE, fill: 'backwards' });
  }));

  // Исчезновение: при массовой замене (поиск) старое убирается сразу, чтобы текст не двоился
  if (gone.length <= 8) {
    for (const g of gone) ghost(g.el, g.r, { z: g.el.closest('.sheet, .drawer') ? 43 : 3, duration: 150 });
  }
}

// Перерисовать содержимое контейнера с анимацией.
export function morph(container, html) {
  if (!container) return;
  const before = snapshot(container);
  container.innerHTML = html;
  flip(container, before);
}
