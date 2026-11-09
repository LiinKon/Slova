// Уровни запоминания и интервалы повторения.
// level: 0 — новое, 1 — сложное (красный), 2 — учу (жёлтый), 3 — знаю (зелёный)
export const LEVEL = { NEW: 0, RED: 1, YELLOW: 2, GREEN: 3 };
export const TO_YELLOW = 5;  // верных подряд из красного в жёлтый
export const TO_GREEN = 3;   // верных подряд из жёлтого в зелёный

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const RED_STEPS = [10 * MIN, 1 * HOUR, 8 * HOUR, 1 * DAY, 2 * DAY];
const YELLOW_STEPS = [2 * DAY, 4 * DAY, 7 * DAY];

export function freshProgress() {
  return { level: LEVEL.NEW, streak: 0, due: 0, interval: 0, reps: 0, lapses: 0, last: 0 };
}

// Ответ: true — верно, false — ошибка. Меняет объект p и возвращает его.
export function answer(p, correct, now = Date.now()) {
  p.reps = (p.reps || 0) + 1;
  p.last = now;
  if (correct) {
    if (p.level === LEVEL.NEW) {
      p.level = LEVEL.RED; p.streak = 1;
    } else if (p.level === LEVEL.RED) {
      p.streak += 1;
      if (p.streak >= TO_YELLOW) { p.level = LEVEL.YELLOW; p.streak = 0; }
    } else if (p.level === LEVEL.YELLOW) {
      p.streak += 1;
      if (p.streak >= TO_GREEN) { p.level = LEVEL.GREEN; p.streak = 0; }
    } else {
      p.streak += 1;
    }
    p.due = now + nextInterval(p);
  } else {
    p.lapses = (p.lapses || 0) + 1;
    if (p.level === LEVEL.NEW) p.level = LEVEL.RED;
    else if (p.level > LEVEL.RED) p.level -= 1;
    p.streak = 0;
    p.interval = 0;
    p.due = now + 5 * MIN;
  }
  return p;
}

function nextInterval(p) {
  if (p.level === LEVEL.RED) {
    p.interval = RED_STEPS[Math.min(p.streak - 1, RED_STEPS.length - 1)];
  } else if (p.level === LEVEL.YELLOW) {
    p.interval = YELLOW_STEPS[Math.min(p.streak, YELLOW_STEPS.length - 1)];
  } else {
    const prev = p.interval || 7 * DAY;
    p.interval = Math.min(Math.max(prev * 2.2, 10 * DAY), 120 * DAY);
  }
  return p.interval;
}

export function isDue(p, now = Date.now()) {
  return p.level !== LEVEL.NEW && p.due <= now;
}

// Сколько ещё верных ответов до следующего уровня (для словаря).
export function toNextText(p) {
  if (p.level === LEVEL.NEW) return 'Новое слово';
  if (p.level === LEVEL.RED) return 'Сложное · ещё ' + (TO_YELLOW - p.streak) + ' до «Учу»';
  if (p.level === LEVEL.YELLOW) return 'Учу · ещё ' + (TO_GREEN - p.streak) + ' до «Знаю»';
  return 'Знаю';
}

export function levelKey(level) {
  return ['n', 'r', 'y', 'g'][level] || 'n';
}

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function todayKey(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
