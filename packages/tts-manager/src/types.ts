import type { EmotionType } from '@nobada/types';

export interface TTSOptions {
  voiceId?: string;
  emotion?: EmotionType;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSEmotionParams {
  speed: number;
  pitch: number;
  volume: number;
  emotion: number;
}

export interface TTSConfig {
  provider: 'google' | 'clova';
  cacheSize?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface CachedAudio {
  data: ArrayBuffer;
  timestamp: number;
  ttl: number;
  hitCount: number;
}

export interface PreloadedAudio {
  audioData: ArrayBuffer;
  text: string;
  emotion: EmotionType;
  timestamp: number;
}

export abstract class TTSProvider {
  abstract generateStream(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>>;

  abstract generateAudio(
    text: string,
    options: TTSOptions
  ): Promise<ArrayBuffer>;
}

export class TTSProviderError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'TTSProviderError';
  }
}