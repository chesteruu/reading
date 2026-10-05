let voice: SpeechSynthesisVoice | null = null;

export function prepareVoices(): void {
  if (!("speechSynthesis" in window)) return;
  const pick = () => {
    const voices = window.speechSynthesis.getVoices();
    voice =
      voices.find((item) => item.lang === "en-US" && /samantha|google|natural|aria/i.test(item.name)) ||
      voices.find((item) => item.lang === "en-US") ||
      voices.find((item) => item.lang.startsWith("en")) ||
      null;
  };
  pick();
  window.speechSynthesis.addEventListener("voiceschanged", pick);
}

let speechGeneration = 0;
let speechTimer = 0;

function say(text: string, rate: number): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  if (voice) utterance.voice = voice;
  return utterance;
}

function spokenWord(word: string): string {
  const cleaned = word.replace(/[^a-zA-Z']/g, "");
  return cleaned || word;
}

export function speak(text: string, rate = 1): void {
  if (!("speechSynthesis" in window) || !text.trim()) return;
  const run = ++speechGeneration;
  window.clearTimeout(speechTimer);
  window.speechSynthesis.cancel();
  speechTimer = window.setTimeout(() => {
    if (run !== speechGeneration) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.speak(say(text, rate));
  }, 40);
}

/**
 * Highlight follows the voice. Each word is spoken on its own, and the gold
 * word changes only when that word actually starts, at whatever rate is set.
 */
export function speakAligned(
  words: { word: string }[],
  rate: number,
  onWord: (index: number) => void,
  onEnd: () => void,
): void {
  if (!("speechSynthesis" in window)) {
    onEnd();
    return;
  }
  const run = ++speechGeneration;
  window.clearTimeout(speechTimer);
  window.speechSynthesis.cancel();
  speechTimer = window.setTimeout(() => {
    if (run !== speechGeneration) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    if (words.length === 0) {
      onEnd();
      return;
    }
    let ended = false;
    const finish = () => {
      if (ended || run !== speechGeneration) return;
      ended = true;
      onEnd();
    };
    words.forEach((word, index) => {
      const utterance = say(spokenWord(word.word), rate);
      utterance.onstart = () => {
        if (run === speechGeneration) onWord(index);
      };
      utterance.onend = () => {
        if (index === words.length - 1) finish();
      };
      utterance.onerror = (event) => {
        if (event.error === "interrupted" || event.error === "canceled") return;
        if (index === words.length - 1) finish();
      };
      window.speechSynthesis.speak(utterance);
    });
  }, 40);
}

export function stopSpeaking(): void {
  speechGeneration += 1;
  window.clearTimeout(speechTimer);
  window.speechSynthesis?.cancel();
}

export function pageText(words: { word: string }[]): string {
  return words.map((item) => item.word).join(" ");
}

export function glossKey(word: string): string {
  return word.toLowerCase().replace(/[^a-z']/g, "");
}

export function softTick(): void {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const context = new Ctx();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 520;
  gain.gain.setValueAtTime(0.03, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.07);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.08);
  oscillator.onended = () => void context.close();
}
