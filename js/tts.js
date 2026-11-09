// Озвучка встроенным синтезатором речи iPhone (Web Speech API). Работает без интернета.
let voices = [];

function refresh() {
  try { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; } catch (e) { voices = []; }
}
if ('speechSynthesis' in window) {
  refresh();
  speechSynthesis.onvoiceschanged = refresh;
}

export function ttsAvailable() { return 'speechSynthesis' in window; }

export function englishVoices(accent) {
  refresh();
  const list = voices.filter((v) => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith('en'));
  const pref = list.filter((v) => v.lang.replace('_', '-').toLowerCase() === accent.toLowerCase());
  const rank = (v) => (/premium|enhanced|улучш/i.test(v.name) ? 0 : 1);
  return (pref.length ? pref : list).slice().sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function pickVoice(settings) {
  const list = englishVoices(settings.accent);
  return list.find((v) => v.voiceURI === settings.voiceURI) || list[0] || null;
}

export function speak(text, settings) {
  if (!ttsAvailable() || !text) return;
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
