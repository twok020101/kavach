import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Modality } from '@google/genai';
import { env } from '../env';
import { appRoot } from '../paths';
import { genai, models } from './gemini';

export type Pcm = { data: Buffer; sampleRate: number };

/**
 * Speaks a line with Gemini TTS (`KAVACH_MODEL_TTS`, voice `KAVACH_LIVE_VOICE`) and returns
 * 16-bit mono PCM. With FAKE_LLM=1 it returns `fixtures/<fixture>.pcm` (24 kHz).
 */
export async function synthesizeSpeech(
  text: string,
  { fixture }: { fixture: string },
): Promise<Pcm> {
  if (env.FAKE_LLM) {
    return {
      data: await readFile(resolve(appRoot, 'fixtures', `${fixture}.pcm`)),
      sampleRate: 24000,
    };
  }
  const response = await genai().models.generateContent({
    model: models.tts,
    contents: [{ role: 'user', parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: env.KAVACH_LIVE_VOICE } } },
    },
  });
  const audio = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
  if (!audio?.data) throw new Error(`No audio from ${models.tts}`);
  // e.g. "audio/L16;codec=pcm;rate=24000"
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType ?? '')?.[1] ?? 24000);
  return { data: Buffer.from(audio.data, 'base64'), sampleRate: rate };
}

/** PCM → OGG/Opus with ffmpeg: the format WhatsApp plays as a voice note. */
export function pcmToOggOpus({ data, sampleRate }: Pcm): Promise<Buffer> {
  return new Promise((done, fail) => {
    const ffmpeg = spawn('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-f',
      's16le',
      '-ar',
      String(sampleRate),
      '-ac',
      '1',
      '-i',
      'pipe:0',
      '-c:a',
      'libopus',
      '-b:a',
      '32k',
      '-application',
      'voip',
      '-f',
      'ogg',
      'pipe:1',
    ]);
    const out: Buffer[] = [];
    const err: Buffer[] = [];
    ffmpeg.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    ffmpeg.stderr.on('data', (chunk: Buffer) => err.push(chunk));
    ffmpeg.on('error', fail);
    ffmpeg.on('close', (code) =>
      code === 0
        ? done(Buffer.concat(out))
        : fail(new Error(`ffmpeg exited ${code}: ${Buffer.concat(err).toString()}`)),
    );
    ffmpeg.stdin.end(data);
  });
}
