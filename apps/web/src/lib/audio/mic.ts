import { addWorklet } from './worklets';
import { toBase64 } from './pcm';

export type Mic = {
  /** While muted, no chunks are sent. */
  setMuted(muted: boolean): void;
  stop(): void;
};

/**
 * Opens the microphone and calls `onChunk` with base64 PCM16 mono 16 kHz, 40 ms at a time.
 * Echo cancellation and noise suppression are on: the phone's speaker plays the agent's voice.
 */
export async function openMic(onChunk: (base64: string) => void): Promise<Mic> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
  const context = new AudioContext();
  try {
    await addWorklet(context, 'capture');
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    await context.close();
    throw error;
  }
  const source = context.createMediaStreamSource(stream);
  const capture = new AudioWorkletNode(context, 'pcm-capture');
  // A silent sink keeps the graph pulling audio through the worklet.
  const sink = context.createGain();
  sink.gain.value = 0;
  source.connect(capture).connect(sink).connect(context.destination);

  let muted = false;
  capture.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
    if (!muted) onChunk(toBase64(e.data));
  };

  return {
    setMuted(next) {
      muted = next;
      stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    },
    stop() {
      capture.port.onmessage = null;
      stream.getTracks().forEach((t) => t.stop());
      void context.close();
    },
  };
}
