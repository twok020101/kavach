/**
 * AudioWorklet processors, loaded from Blob URLs so they ship with the bundle.
 * They run on the audio thread, so they are plain JavaScript strings.
 */

/** Mic → PCM16 mono 16 kHz, posted as 40 ms (640-sample) ArrayBuffers. */
const captureSource = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000;
    this.pos = 0;
    this.chunk = new Int16Array(640);
    this.filled = 0;
  }
  process(inputs) {
    const input = inputs[0] && inputs[0][0];
    if (!input) return true;
    // Linear-interpolation resampling to 16 kHz.
    for (; this.pos < input.length; this.pos += this.step) {
      const i = Math.floor(this.pos);
      const a = input[i];
      const b = i + 1 < input.length ? input[i + 1] : a;
      const s = Math.max(-1, Math.min(1, a + (b - a) * (this.pos - i)));
      this.chunk[this.filled++] = s * 0x7fff;
      if (this.filled === this.chunk.length) {
        this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
        this.chunk = new Int16Array(640);
        this.filled = 0;
      }
    }
    this.pos -= input.length;
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
`;

/** PCM16 chunks in → a ring buffer → speakers. 'flush' drops what is queued (barge-in). */
const playerSource = `
class PcmPlayer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ring = new Float32Array(sampleRate * 60);
    this.read = 0;
    this.write = 0;
    this.playing = false;
    this.port.onmessage = (e) => {
      if (e.data === 'flush') { this.read = this.write; return; }
      const pcm = new Int16Array(e.data);
      for (let i = 0; i < pcm.length; i++) {
        this.ring[this.write] = pcm[i] / 32768;
        this.write = (this.write + 1) % this.ring.length;
      }
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0][0];
    let played = false;
    for (let i = 0; i < out.length; i++) {
      if (this.read === this.write) { out[i] = 0; continue; }
      out[i] = this.ring[this.read];
      this.read = (this.read + 1) % this.ring.length;
      played = true;
    }
    if (played !== this.playing) { this.playing = played; this.port.postMessage(played); }
    return true;
  }
}
registerProcessor('pcm-player', PcmPlayer);
`;

const urls = new Map<string, string>();

/** Adds a processor to a context once per page. */
export async function addWorklet(context: AudioContext, name: 'capture' | 'player') {
  let url = urls.get(name);
  if (!url) {
    const source = name === 'capture' ? captureSource : playerSource;
    url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
    urls.set(name, url);
  }
  await context.audioWorklet.addModule(url);
}
