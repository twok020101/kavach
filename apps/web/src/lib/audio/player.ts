import { fromBase64 } from './pcm';
import { addWorklet } from './worklets';

export type Player = {
  /** Queues base64 PCM16 mono 24 kHz. */
  play(base64: string): void;
  /** Drops everything queued (the person spoke over the agent). */
  flush(): void;
  close(): void;
};

/** Plays the agent's 24 kHz voice through a ring buffer; `onPlaying` follows whether sound is out. */
export async function openPlayer(onPlaying: (playing: boolean) => void): Promise<Player> {
  const context = new AudioContext({ sampleRate: 24_000 });
  await addWorklet(context, 'player');
  const node = new AudioWorkletNode(context, 'pcm-player', { outputChannelCount: [1] });
  node.connect(context.destination);
  node.port.onmessage = (e: MessageEvent<boolean>) => onPlaying(e.data);
  if (context.state === 'suspended') await context.resume();

  return {
    play(base64) {
      const buffer = fromBase64(base64);
      node.port.postMessage(buffer, [buffer]);
    },
    flush: () => node.port.postMessage('flush'),
    close() {
      node.port.onmessage = null;
      void context.close();
    },
  };
}
