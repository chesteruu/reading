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
let clip: HTMLAudioElement | null = null;

function speechRate(rate: number): number {
  // Chrome speaks rate 1 slower than 0.8. Step off that broken value.
  if (Math.abs(rate - 1) < 0.001) return 1.15;
  return rate;
}

function say(text: string, rate: number): SpeechSynthesisUtterance {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = speechRate(rate);
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

/** One sentence, one voice, so the intonation stays natural. */
export function speakNaturally(
  words: { word: string }[],
  rate: number,
  onWord: (index: number) => void,
  onEnd: () => void,
): void {
  if (!("speechSynthesis" in window) || words.length === 0) {
    onEnd();
    return;
  }
  const text = words.map((item) => item.word).join(" ");
  const spans: { start: number; end: number }[] = [];
  let cursor = 0;
  for (const item of words) {
    spans.push({ start: cursor, end: cursor + item.word.length });
    cursor += item.word.length + 1;
  }
  const run = ++speechGeneration;
  window.clearTimeout(speechTimer);
  window.speechSynthesis.cancel();
  clip?.pause();
  speechTimer = window.setTimeout(() => {
    if (run !== speechGeneration) return;
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    const utterance = say(text, rate);
    utterance.onboundary = (event) => {
      if (run !== speechGeneration) return;
      if (event.name && event.name !== "word") return;
      const at = event.charIndex ?? 0;
      let index = spans.findIndex((span) => at >= span.start && at < span.end);
      if (index < 0) index = spans.findIndex((span) => at <= span.start);
      if (index < 0) index = spans.length - 1;
      onWord(index);
    };
    utterance.onend = () => {
      if (run === speechGeneration) onEnd();
    };
    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") return;
      if (run === speechGeneration) onEnd();
    };
    window.speechSynthesis.speak(utterance);
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

export type SoundCue = { audio: string | null; say: string | null };

export function playSounds(cues: SoundCue[], rate: number, onCue: (index: number) => void, onEnd: () => void): void {
  if (cues.length === 0) {
    onEnd();
    return;
  }
  const run = ++speechGeneration;
  window.clearTimeout(speechTimer);
  window.speechSynthesis?.cancel();
  clip?.pause();
  let index = 0;
  let ended = false;
  const finish = () => {
    if (ended || run !== speechGeneration) return;
    ended = true;
    onEnd();
  };
  const step = () => {
    if (run !== speechGeneration) return;
    if (index >= cues.length) {
      finish();
      return;
    }
    const cue = cues[index];
    onCue(index);
    if (cue.audio) {
      const audio = new Audio(cue.audio);
      clip = audio;
      audio.preservesPitch = true;
      const safari = audio as HTMLAudioElement & { webkitPreservesPitch?: boolean };
      safari.webkitPreservesPitch = true;
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      const advance = () => {
        if (run !== speechGeneration) return;
        index += 1;
        step();
      };
      audio.onended = advance;
      audio.onerror = advance;
      void audio.play().catch(advance);
      return;
    }
    const utterance = say(cue.say || "", rate);
    const advance = () => {
      if (run !== speechGeneration) return;
      index += 1;
      step();
    };
    utterance.onend = advance;
    utterance.onerror = (event) => {
      if (event.error === "interrupted" || event.error === "canceled") return;
      advance();
    };
    window.speechSynthesis.speak(utterance);
  };
  speechTimer = window.setTimeout(step, 30);
}

export function stopSpeaking(): void {
  speechGeneration += 1;
  window.clearTimeout(speechTimer);
  window.speechSynthesis?.cancel();
  if (clip) {
    clip.onended = null;
    clip.onerror = null;
    clip.pause();
    clip = null;
  }
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
