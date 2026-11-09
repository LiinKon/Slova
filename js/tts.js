// Озвучка встроенным синтезатором речи iPhone (Web Speech API). Работает без интернета.
let voices = [];

function refresh() {
  try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; }
}
if ('speechSynthesis' in window) {
  refresh();
  speechSynthesis.onvoiceschanged = refresh;
}

// «Игрушечные» голоса Apple — звучат как роботы или эффекты, для учёбы не годятся.
const NOVELTY = ['albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news', 'jester', 'organ',
  'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox', 'fred', 'junior', 'kathy', 'ralph', 'grandma', 'grandpa',
  'eddy', 'flo', 'reed', 'rocko', 'sandy', 'shelley', 'deranged', 'hysterical', 'pipe organ'];
// Нормальные человеческие голоса.
const GOOD = ['daniel', 'arthur', 'martha', 'serena', 'kate', 'oliver', 'stephanie', 'samantha', 'alex', 'ava', 'allison',
  'susan', 'tom', 'evan', 'nathan', 'joelle', 'noelle', 'zoe', 'nicky', 'aaron', 'karen', 'moira', 'tessa', 'rishi', 'google'];

const baseName = (v) => v.name.toLowerCase().replace(/\s*\(.*\)\s*/g, '').trim();
const isNovelty = (v) => NOVELTY.includes(baseName(v));
function rank(v) {
  const n = v.name.toLowerCase();
  if (/premium|улучш.*высок/.test(n)) return 0;
  if (/enhanced|улучш/.test(n)) return 1;
  if (GOOD.includes(baseName(v))) return 2;
  return 3;
}

export function ttsAvailable() { return 'speechSynthesis' in window; }

export function englishVoices(accent) {
  refresh();
  const all = voices.filter((v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith('en'));
  const human = all.filter((v) => !isNovelty(v));
  const list = human.length ? human : all;
  const pref = list.filter((v) => v.lang.replace('_', '-').toLowerCase() === accent.toLowerCase());
  return (pref.length ? pref : list).slice().sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function pickVoice(settings) {
  const list = englishVoices(settings.accent);
  return list.find((v) => v.voiceURI === settings.voiceURI) || list[0] || null;
}

export function speak(text, settings) {
  if (!ttsAvailable() || !text || settings.tts === false) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(settings);
    if (v) u.voice = v;
    u.lang = v ? v.lang : settings.accent;
    u.rate = settings.rate || 0.9;
    speechSynthesis.speak(u);
  } catch (e) { /* ignore */ }
}
