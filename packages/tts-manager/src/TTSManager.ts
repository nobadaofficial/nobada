import { TTSProvider, TTSConfig, TTSOptions, CachedAudio } from './types';
import { GoogleTTSProvider } from './providers';
import type { ConversationContext } from '@nobada/types';
import { hashString } from '@nobada/utils';

export class TTSManager {
  private provider: TTSProvider;
  private cache: Map<string, CachedAudio>;
  private maxCacheSize: number;

  constructor(config: TTSConfig = { provider: 'google' }) {
    this.provider = this.initProvider(config);
    this.cache = new Map();
    this.maxCacheSize = config.cacheSize || 50;
  }

  private initProvider(config: TTSConfig): TTSProvider {
    switch (config.provider) {
      case 'google':
        return new GoogleTTSProvider();
      default:
        throw new Error(`Unknown TTS provider: ${config.provider}`);
    }
  }

  // 실시간 TTS 생성 및 스트리밍
  async streamTTS(
    text: string,
    options: TTSOptions = {}
  ): Promise<ReadableStream<Uint8Array>> {
    // 1. 캐시 확인
    const cacheKey = await this.generateCacheKey(text, options);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      // 캐시된 데이터를 스트림으로 변환
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(cached.data));
          controller.close();
        }
      });
    }

    // 2. TTS 생성 요청
    const stream = await this.provider.generateStream(text, options);

    // 3. 캐시 저장을 위해 스트림 복제
    const [stream1, stream2] = stream.tee();

    // 백그라운드로 캐시 저장
    this.cacheStream(cacheKey, stream2);

    return stream1;
  }

  // 오디오 생성 (전체 버퍼)
  async generateAudio(
    text: string,
    options: TTSOptions = {}
  ): Promise<ArrayBuffer> {
    const cacheKey = await this.generateCacheKey(text, options);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached.data;
    }

    const audioData = await this.provider.generateAudio(text, options);
    this.addToCache(cacheKey, audioData);

    return audioData;
  }

  // 프리로드 시스템
  async preloadResponses(
    context: ConversationContext,
    possibleResponses: string[]
  ): Promise<void> {
    const preloadTasks = possibleResponses.map(response =>
      this.generateAudio(response, {
        voiceId: context.character.voiceId,
        emotion: context.emotionalState.current,
      })
    );

    await Promise.allSettled(preloadTasks);
  }

  private async generateCacheKey(text: string, options: TTSOptions): Promise<string> {
    const keyString = `${text}-${JSON.stringify(options)}`;
    return await hashString(keyString);
  }

  private getFromCache(key: string): CachedAudio | null {
    const cached = this.cache.get(key);

    if (cached) {
      // TTL 체크
      if (Date.now() - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
        return null;
      }

      // 히트 카운트 증가
      cached.hitCount++;
      return cached;
    }

    return null;
  }

  private addToCache(key: string, data: ArrayBuffer): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxCacheSize) {
      // LRU: 가장 적게 사용된 항목 제거
      const leastUsed = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hitCount - b[1].hitCount)[0];

      if (leastUsed) {
        this.cache.delete(leastUsed[0]);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: 3600000, // 1시간
      hitCount: 0,
    });
  }

  private async cacheStream(key: string, stream: ReadableStream<Uint8Array>): Promise<void> {
    try {
      const reader = stream.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }

      // 모든 청크를 하나의 버퍼로 합치기
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;

      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      this.addToCache(key, buffer.buffer);
    } catch (error) {
      console.error('Failed to cache TTS stream:', error);
    }
  }

  // 캐시 통계
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      totalHits: 0,
      items: [] as { key: string; hitCount: number; age: number }[],
    };

    this.cache.forEach((value, key) => {
      stats.totalHits += value.hitCount;
      stats.items.push({
        key: key.substring(0, 8) + '...',
        hitCount: value.hitCount,
        age: Date.now() - value.timestamp,
      });
    });

    return stats;
  }

  // 캐시 초기화
  clearCache(): void {
    this.cache.clear();
  }
}