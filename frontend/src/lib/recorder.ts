/** Record a page as 16 kHz, 16-bit, mono WAV so a short read stays small. */

function merge(chunks: Float32Array[]): Float32Array {
  const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Float32Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function downsample(buffer: Float32Array, inputRate: number, targetRate: number): Float32Array {
  if (inputRate === targetRate || buffer.length === 0) return buffer;
  const ratio = inputRate / targetRate;
  const length = Math.max(1, Math.round(buffer.length / ratio));
  const result = new Float32Array(length);
  for (let index = 0; index < length; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(buffer.length, Math.floor((index + 1) * ratio));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor += 1) sum += buffer[cursor];
    result[index] = sum / Math.max(1, end - start);
  }
  return result;
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export type Take = { blob: Blob; duration: number; levels: number[] };

export class PageRecorder {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private startedAt = 0;
  private inputRate = 48000;
  levels: number[] = [];
  onLevel: ((levels: number[]) => void) | null = null;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
    });
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.context = new Ctx();
    this.inputRate = this.context.sampleRate;
    const source = this.context.createMediaStreamSource(this.stream);
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    const mute = this.context.createGain();
    mute.gain.value = 0;
    this.chunks = [];
    this.levels = [];
    this.startedAt = performance.now();
    this.processor.onaudioprocess = (event) => {
      const data = event.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(data));
      let sum = 0;
      for (let index = 0; index < data.length; index += 1) sum += data[index] * data[index];
      const level = Math.min(1, Math.sqrt(sum / data.length) * 3.2);
      this.levels.push(level);
      if (this.levels.length > 180) this.levels.shift();
      this.onLevel?.(this.levels.slice());
    };
    source.connect(this.processor);
    this.processor.connect(mute);
    mute.connect(this.context.destination);
  }

  async stop(): Promise<Take> {
    const duration = Math.max(0, (performance.now() - this.startedAt) / 1000);
    this.processor?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    const rate = this.inputRate;
    const chunks = this.chunks;
    const levels = this.levels.slice();
    if (this.context && this.context.state !== "closed") await this.context.close();
    this.context = null;
    this.processor = null;
    this.stream = null;
    const samples = downsample(merge(chunks), rate, 16000);
    return { blob: encodeWav(samples, 16000), duration, levels };
  }
}
