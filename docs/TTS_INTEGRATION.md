# TTS 통합 기술 명세서

## 1. TTS 솔루션 분석 및 선정

### 1.1 평가 대상 서비스

| 서비스 | 지연시간 | 한국어 품질 | 가격 | 특징 |
|--------|---------|------------|------|------|
| **Naver Clova Voice** | ~200ms | ★★★★★ | ₩4.4/1000자 | 최고의 한국어 품질, 감정 표현 |
| **ElevenLabs Flash v2.5** | 75ms | ★★★☆☆ | $0.18/1000자 | 최저 지연, 다국어 |
| **Cartesia AI** | <250ms | ★★★★☆ | $0.065/1000자 | 한국어 지원, 저렴 |
| **Google Cloud TTS** | ~150ms | ★★★★☆ | $4/100만자 | 안정성, WaveNet |
| **Typecast** | ~300ms | ★★★★☆ | ₩990/분 | 다양한 목소리 |

### 1.2 최종 선정

**Primary**: Google Cloud Text-to-Speech (WaveNet)
- 이유: Google 생태계 통합, 안정성, 다국어 지원, 비용 효율
- 용도: 메인 서비스의 모든 TTS
- 특징: WaveNet 한국어 음성, SSML 지원, 150ms 지연시간

**Fallback**: Naver Clova Voice Premium
- 이유: 한국어 특화, 감정 표현 우수
- 용도: Google TTS 장애 시 백업, 특별 캐릭터용

## 2. Google Cloud Text-to-Speech 통합 구현

### 2.1 Google Cloud TTS 설정

```typescript
// packages/tts-manager/src/providers/google/config.ts
export const GOOGLE_TTS_CONFIG = {
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS!, // 서비스 계정 키

  voices: {
    korean: {
      female: {
        standard: 'ko-KR-Standard-A',  // 표준 여성음
        wavenet: 'ko-KR-Wavenet-A',    // WaveNet 여성음 (고품질)
        neural: 'ko-KR-Neural2-A',      // Neural2 여성음 (최고품질)
      },
      male: {
        standard: 'ko-KR-Standard-C',
        wavenet: 'ko-KR-Wavenet-C',
        neural: 'ko-KR-Neural2-C',
      }
    }
  },

  // SSML 이용한 감정 표현
  ssmlProfiles: {
    happy: '<prosody rate="110%" pitch="+2st">',
    sad: '<prosody rate="90%" pitch="-2st">',
    excited: '<prosody rate="120%" pitch="+3st">',
    calm: '<prosody rate="85%" pitch="-1st">',
  }
};
```

### 2.2 Google TTS Provider 구현

```typescript
// packages/tts-manager/src/providers/google/GoogleTTSProvider.ts
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { google } from '@google-cloud/text-to-speech/build/protos/protos';

export class GoogleTTSProvider implements TTSProvider {
  private client: TextToSpeechClient;

  constructor() {
    this.client = new TextToSpeechClient({
      projectId: GOOGLE_TTS_CONFIG.projectId,
      keyFilename: GOOGLE_TTS_CONFIG.keyFilename,
    });
  }

  async generateStream(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const ssmlText = this.buildSSML(text, options);

    const request: google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
      input: { ssml: ssmlText },
      voice: {
        languageCode: 'ko-KR',
        name: options.voiceId || 'ko-KR-Neural2-A',
        ssmlGender: google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
      },
      audioConfig: {
        audioEncoding: google.cloud.texttospeech.v1.AudioEncoding.MP3,
        speakingRate: options.speed || 1.0,
        pitch: options.pitch || 0,
        volumeGainDb: options.volume || 0,
      },
    };

    try {
      const [response] = await this.client.synthesizeSpeech(request);

      // 바이너리 데이터를 스트림으로 변환
      return new ReadableStream({
        start(controller) {
          if (response.audioContent) {
            const audioData = response.audioContent as Uint8Array;
            // 청크 단위로 스트리밍 (실시간 재생 시뮬레이션)
            const chunkSize = 4096;
            let offset = 0;

            const pushChunk = () => {
              if (offset < audioData.length) {
                const chunk = audioData.slice(offset, offset + chunkSize);
                controller.enqueue(chunk);
                offset += chunkSize;
                setTimeout(pushChunk, 10); // 10ms 간격으로 청크 전송
              } else {
                controller.close();
              }
            };

            pushChunk();
          } else {
            controller.close();
          }
        },
      });
    } catch (error) {
      console.error('Google TTS Error:', error);
      throw new TTSProviderError('Failed to generate TTS with Google', error);
    }
  }

  private buildSSML(text: string, options: TTSOptions): string {
    const emotion = options.emotion || 'neutral';
    const profile = GOOGLE_TTS_CONFIG.ssmlProfiles[emotion];

    // SSML 구조 생성
    let ssml = '<speak>';

    if (profile) {
      ssml += profile + text + '</prosody>';
    } else {
      ssml += text;
    }

    // 한국어 특수 처리 (숫자 읽기 등)
    ssml = ssml
      .replace(/(\d+)살/g, '<say-as interpret-as="cardinal">$1</say-as>살')
      .replace(/(\d{4})년/g, '<say-as interpret-as="date" format="y">$1</say-as>')
      .replace(/♥|❤/g, '<sub alias="하트">♥</sub>');

    ssml += '</speak>';

    return ssml;
  }
}
```

### 2.3 Google Cloud Storage 연동

```typescript
// packages/storage/src/GCSManager.ts
import { Storage } from '@google-cloud/storage';

export class GCSManager {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
    this.bucketName = process.env.GCS_BUCKET_NAME!;
  }

  // TTS 오디오 파일 업로드
  async uploadAudio(
    audioBuffer: Buffer,
    path: string
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`tts/${path}`);

    await file.save(audioBuffer, {
      metadata: {
        contentType: 'audio/mpeg',
        cacheControl: 'public, max-age=31536000', // 1년 캐싱
      },
    });

    // Signed URL 생성 (1시간 유효)
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 3600 * 1000,
    });

    return signedUrl;
  }

  // 비디오 스트리밍 URL 생성
  async getVideoStreamUrl(videoPath: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`videos/${videoPath}`);

    // CDN 캐싱을 위한 Public URL (권한 설정 필요)
    return `https://storage.googleapis.com/${this.bucketName}/videos/${videoPath}`;
  }

  // 대용량 파일 스트리밍 업로드
  createUploadStream(path: string): NodeJS.WritableStream {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    return file.createWriteStream({
      resumable: true,
      metadata: {
        cacheControl: 'public, max-age=3600',
      },
    });
  }
}
```

## 3. Clova Voice 통합 구현 (Fallback)

### 2.1 API 설정

```typescript
// packages/tts-manager/src/providers/clova/config.ts
export const CLOVA_CONFIG = {
  baseUrl: 'https://naveropenapi.apigw.ntruss.com/tts-premium/v1',
  headers: {
    'X-NCP-APIGW-API-KEY-ID': process.env.CLOVA_API_KEY_ID!,
    'X-NCP-APIGW-API-KEY': process.env.CLOVA_API_KEY!,
  },
  voices: {
    female: {
      young: 'njiyeon',      // 20대 여성
      mature: 'nsujin',      // 30대 여성
      cute: 'nara',          // 귀여운 목소리
      calm: 'nminseo',       // 차분한 목소리
    },
    male: {
      young: 'njongmin',     // 20대 남성
      mature: 'njunwoo',     // 30대 남성
    }
  },
  emotions: {
    neutral: 0,    // 평범
    happy: 1,      // 기쁨
    sad: 2,        // 슬픔
    angry: 3,      // 화남
  }
};
```

### 2.2 Clova TTS Provider 구현

```typescript
// packages/tts-manager/src/providers/clova/ClovaProvider.ts
import axios from 'axios';
import { Readable } from 'stream';

export class ClovaVoiceProvider implements TTSProvider {
  private client: axios.AxiosInstance;
  private voiceCache: Map<string, VoiceProfile> = new Map();

  constructor() {
    this.client = axios.create({
      baseURL: CLOVA_CONFIG.baseUrl,
      headers: CLOVA_CONFIG.headers,
      timeout: 5000,
    });
  }

  async generateStream(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>> {
    // 텍스트 전처리
    const processedText = this.preprocessText(text);

    // API 요청 파라미터
    const params = new URLSearchParams({
      speaker: options.voiceId || 'njiyeon',
      volume: String(options.volume || 0),
      speed: String(options.speed || 0),
      pitch: String(options.pitch || 0),
      emotion: String(options.emotion || 0),
      format: 'mp3',
    });

    try {
      const response = await this.client.post('/tts', processedText, {
        params,
        responseType: 'stream',
        headers: {
          'Content-Type': 'text/plain',
        },
      });

      // Node.js Stream을 Web Stream으로 변환
      return this.nodeStreamToWebStream(response.data);
    } catch (error) {
      console.error('Clova TTS Error:', error);
      throw new TTSProviderError('Failed to generate TTS', error);
    }
  }

  private preprocessText(text: string): string {
    // 한국어 특수 처리
    return text
      .replace(/(\d+)살/g, (match, num) => {
        // 숫자+살 -> 한글 나이 읽기
        return this.numberToKoreanAge(parseInt(num));
      })
      .replace(/(\d+)년도/g, (match, num) => {
        // 연도 읽기 처리
        return this.numberToKoreanYear(parseInt(num));
      })
      .replace(/♥|❤/g, '하트') // 이모지 처리
      .replace(/\.\.\./g, '...') // 말줄임표 정규화
      .trim();
  }

  private numberToKoreanAge(num: number): string {
    const korean = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'];
    const units = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];

    if (num < 10) return korean[num] + '살';
    if (num < 20) return '열' + korean[num - 10] + '살';

    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return units[tens] + (ones > 0 ? korean[ones] : '') + '살';
  }

  private nodeStreamToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        nodeStream.on('end', () => {
          controller.close();
        });
        nodeStream.on('error', (err) => {
          controller.error(err);
        });
      },
    });
  }
}
```

### 2.3 감정 기반 TTS 파라미터 조정

```typescript
// packages/tts-manager/src/emotion/EmotionMapper.ts
export class EmotionMapper {
  // 감정별 TTS 파라미터 매핑
  private emotionProfiles = {
    happy: {
      speed: 0.1,      // 약간 빠르게
      pitch: 0.2,      // 톤 높게
      volume: 0.1,     // 약간 크게
      emotion: 1,      // Clova 기쁨 감정
    },
    sad: {
      speed: -0.1,     // 약간 느리게
      pitch: -0.2,     // 톤 낮게
      volume: -0.1,    // 약간 작게
      emotion: 2,      // Clova 슬픔 감정
    },
    excited: {
      speed: 0.2,      // 빠르게
      pitch: 0.3,      // 톤 높게
      volume: 0.2,     // 크게
      emotion: 1,      // Clova 기쁨 감정
    },
    angry: {
      speed: 0.05,     // 약간 빠르게
      pitch: -0.1,     // 약간 낮게
      volume: 0.3,     // 크게
      emotion: 3,      // Clova 화남 감정
    },
    romantic: {
      speed: -0.15,    // 느리게
      pitch: -0.05,    // 약간 낮게
      volume: -0.05,   // 부드럽게
      emotion: 0,      // 평범 + 파라미터로 조정
    },
    shy: {
      speed: -0.1,     // 약간 느리게
      pitch: 0.1,      // 약간 높게
      volume: -0.2,    // 작게
      emotion: 0,
    },
    neutral: {
      speed: 0,
      pitch: 0,
      volume: 0,
      emotion: 0,
    }
  };

  mapEmotionToTTSParams(
    emotion: EmotionType,
    intensity: number = 1
  ): TTSEmotionParams {
    const profile = this.emotionProfiles[emotion] || this.emotionProfiles.neutral;

    // 강도에 따라 파라미터 조정 (0.5 ~ 1.5)
    const adjustedProfile = {
      speed: profile.speed * intensity,
      pitch: profile.pitch * intensity,
      volume: profile.volume * intensity,
      emotion: profile.emotion,
    };

    // 범위 제한 (-0.5 ~ 0.5)
    return {
      speed: Math.max(-0.5, Math.min(0.5, adjustedProfile.speed)),
      pitch: Math.max(-0.5, Math.min(0.5, adjustedProfile.pitch)),
      volume: Math.max(-0.5, Math.min(0.5, adjustedProfile.volume)),
      emotion: adjustedProfile.emotion,
    };
  }
}
```

## 3. 스트리밍 및 버퍼링 시스템

### 3.1 오디오 스트림 매니저

```typescript
// packages/tts-manager/src/streaming/AudioStreamManager.ts
export class AudioStreamManager {
  private audioContext: AudioContext;
  private sourceBuffers: SourceBuffer[] = [];
  private bufferQueue: ArrayBuffer[] = [];
  private isPlaying = false;

  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  async streamAudio(
    stream: ReadableStream<Uint8Array>,
    onStart?: () => void
  ): Promise<void> {
    const reader = stream.getReader();
    let firstChunkReceived = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 첫 청크를 받으면 즉시 재생 시작
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          await this.initializePlayback(value);
          onStart?.();
        } else {
          await this.appendBuffer(value);
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  private async initializePlayback(firstChunk: Uint8Array): Promise<void> {
    // 첫 청크를 디코드하고 즉시 재생
    const audioBuffer = await this.decodeAudioChunk(firstChunk);
    this.playBuffer(audioBuffer);
    this.isPlaying = true;
  }

  private async appendBuffer(chunk: Uint8Array): Promise<void> {
    const audioBuffer = await this.decodeAudioChunk(chunk);

    if (this.isPlaying) {
      // 현재 재생 중이면 큐에 추가
      this.bufferQueue.push(audioBuffer.buffer);
    } else {
      // 재생이 멈췄으면 즉시 재생
      this.playBuffer(audioBuffer);
    }
  }

  private async decodeAudioChunk(chunk: Uint8Array): Promise<AudioBuffer> {
    // MP3 청크를 AudioBuffer로 디코드
    return await this.audioContext.decodeAudioData(chunk.buffer);
  }

  private playBuffer(buffer: AudioBuffer): void {
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    // 재생 완료 시 다음 버퍼 재생
    source.onended = () => {
      if (this.bufferQueue.length > 0) {
        const nextBuffer = this.bufferQueue.shift()!;
        this.audioContext.decodeAudioData(nextBuffer).then(decoded => {
          this.playBuffer(decoded);
        });
      } else {
        this.isPlaying = false;
      }
    };

    source.start(0);
  }

  // 볼륨 조절
  setVolume(volume: number): void {
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;
    // 모든 source를 gainNode에 연결
  }

  // 재생 중지
  stop(): void {
    this.sourceBuffers.forEach(source => source.stop());
    this.bufferQueue = [];
    this.isPlaying = false;
  }
}
```

### 3.2 프리로드 시스템

```typescript
// packages/tts-manager/src/preload/PreloadManager.ts
export class PreloadManager {
  private preloadCache: Map<string, PreloadedAudio> = new Map();
  private maxCacheSize = 50; // 최대 50개 캐시

  async preloadPossibleResponses(
    context: ConversationContext,
    predictedResponses: PredictedResponse[]
  ): Promise<void> {
    // 우선순위 기반 프리로드
    const sortedResponses = predictedResponses.sort(
      (a, b) => b.probability - a.probability
    );

    // 상위 5개만 프리로드
    const toPreload = sortedResponses.slice(0, 5);

    await Promise.all(
      toPreload.map(response =>
        this.preloadSingle(response.text, response.emotion, context)
      )
    );
  }

  private async preloadSingle(
    text: string,
    emotion: EmotionType,
    context: ConversationContext
  ): Promise<void> {
    const key = this.generateKey(text, emotion, context.character.voiceId);

    // 이미 캐시에 있으면 스킵
    if (this.preloadCache.has(key)) return;

    try {
      // TTS 생성 (백그라운드)
      const audioData = await this.generateTTS(text, {
        voiceId: context.character.voiceId,
        emotion,
      });

      // 캐시 저장
      this.addToCache(key, {
        audioData,
        text,
        emotion,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.warn('Preload failed:', error);
    }
  }

  private addToCache(key: string, data: PreloadedAudio): void {
    // 캐시 크기 제한
    if (this.preloadCache.size >= this.maxCacheSize) {
      // LRU: 가장 오래된 항목 제거
      const oldestKey = Array.from(this.preloadCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.preloadCache.delete(oldestKey);
    }

    this.preloadCache.set(key, data);
  }

  getPreloaded(
    text: string,
    emotion: EmotionType,
    voiceId: string
  ): PreloadedAudio | null {
    const key = this.generateKey(text, emotion, voiceId);
    const cached = this.preloadCache.get(key);

    if (cached) {
      // 타임스탬프 업데이트 (LRU)
      cached.timestamp = Date.now();
      return cached;
    }

    return null;
  }

  private generateKey(text: string, emotion: EmotionType, voiceId: string): string {
    return `${voiceId}:${emotion}:${text.substring(0, 100)}`;
  }
}
```

## 4. 영상-음성 동기화

### 4.1 동기화 컨트롤러

```typescript
// packages/video-sync/src/SyncController.ts
export class VideoAudioSyncController {
  private videoElement: HTMLVideoElement;
  private audioManager: AudioStreamManager;
  private syncOffset = 0; // 밀리초 단위 오프셋
  private syncCheckInterval: number | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
    this.audioManager = new AudioStreamManager();
  }

  async startSynchronizedPlayback(
    videoUrl: string,
    audioStream: ReadableStream<Uint8Array>
  ): Promise<void> {
    // 1. 비디오 로드
    this.videoElement.src = videoUrl;
    await this.waitForVideoReady();

    // 2. 오디오 스트리밍 시작 (콜백으로 비디오 시작)
    await this.audioManager.streamAudio(audioStream, () => {
      // 첫 오디오 청크가 도착하면 비디오 재생
      this.videoElement.play();
      this.startSyncMonitoring();
    });
  }

  private waitForVideoReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.videoElement.readyState >= 3) {
        resolve();
      } else {
        this.videoElement.addEventListener('canplay', () => resolve(), { once: true });
      }
    });
  }

  private startSyncMonitoring(): void {
    // 100ms마다 동기화 체크
    this.syncCheckInterval = window.setInterval(() => {
      this.checkAndAdjustSync();
    }, 100);
  }

  private checkAndAdjustSync(): void {
    const videoTime = this.videoElement.currentTime * 1000; // ms 변환
    const audioTime = this.audioManager.getCurrentTime();
    const drift = videoTime - audioTime;

    // 50ms 이상 차이나면 조정
    if (Math.abs(drift) > 50) {
      console.log(`Sync drift detected: ${drift}ms`);
      this.adjustSync(drift);
    }
  }

  private adjustSync(drift: number): void {
    if (drift > 0) {
      // 비디오가 앞서면 비디오 일시정지
      this.videoElement.pause();
      setTimeout(() => {
        this.videoElement.play();
      }, Math.abs(drift));
    } else {
      // 오디오가 앞서면 비디오 스킵
      this.videoElement.currentTime += Math.abs(drift) / 1000;
    }
  }

  stop(): void {
    if (this.syncCheckInterval) {
      clearInterval(this.syncCheckInterval);
    }
    this.videoElement.pause();
    this.audioManager.stop();
  }
}
```

### 4.2 비디오 풀 매칭 시스템

```typescript
// packages/video-sync/src/VideoMatcher.ts
export class VideoMatcher {
  private videoPool: VideoClip[];

  constructor(videoPool: VideoClip[]) {
    this.videoPool = videoPool;
  }

  findBestMatch(
    emotion: EmotionType,
    intensity: number,
    tags: string[] = []
  ): VideoClip | null {
    // 1. 감정으로 필터링
    let candidates = this.videoPool.filter(
      clip => clip.emotion === emotion
    );

    // 2. 강도로 필터링
    candidates = candidates.filter(
      clip => Math.abs(clip.intensity - intensity) <= 1
    );

    // 3. 태그 매칭 점수 계산
    if (tags.length > 0) {
      candidates.sort((a, b) => {
        const scoreA = this.calculateTagScore(a.tags, tags);
        const scoreB = this.calculateTagScore(b.tags, tags);
        return scoreB - scoreA;
      });
    }

    // 4. 랜덤 선택 (상위 3개 중)
    const topCandidates = candidates.slice(0, 3);
    if (topCandidates.length === 0) {
      // 폴백: 중립 감정 영상
      return this.getDefaultVideo();
    }

    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    return topCandidates[randomIndex];
  }

  private calculateTagScore(clipTags: string[], targetTags: string[]): number {
    let score = 0;
    for (const tag of targetTags) {
      if (clipTags.includes(tag)) {
        score += 1;
      }
    }
    return score;
  }

  private getDefaultVideo(): VideoClip {
    return this.videoPool.find(clip => clip.emotion === 'neutral') || this.videoPool[0];
  }
}
```

## 5. 성능 최적화

### 5.1 지연시간 최소화 전략

```typescript
// packages/tts-manager/src/optimization/LatencyOptimizer.ts
export class LatencyOptimizer {
  // 병렬 처리 매니저
  async processWithMinimalLatency(
    text: string,
    context: ConversationContext
  ): Promise<{
    audioStream: ReadableStream<Uint8Array>;
    videoUrl: string;
    totalLatency: number;
  }> {
    const startTime = performance.now();

    // 병렬 작업 실행
    const [audioStream, videoClip] = await Promise.all([
      // TTS 생성
      this.generateTTSStream(text, context),
      // 비디오 선택
      this.selectVideo(context.emotion, context.intensity),
    ]);

    const totalLatency = performance.now() - startTime;

    return {
      audioStream,
      videoUrl: videoClip.url,
      totalLatency,
    };
  }

  // 청크 단위 처리
  private async generateTTSStream(
    text: string,
    context: ConversationContext
  ): Promise<ReadableStream<Uint8Array>> {
    // 텍스트를 작은 청크로 분할 (문장 단위)
    const chunks = this.splitTextIntoChunks(text);

    return new ReadableStream({
      async start(controller) {
        for (const chunk of chunks) {
          const audio = await ttsProvider.generate(chunk, context);
          controller.enqueue(audio);
        }
        controller.close();
      }
    });
  }

  private splitTextIntoChunks(text: string): string[] {
    // 문장 단위로 분할 (마침표, 느낌표, 물음표 기준)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    // 너무 긴 문장은 추가 분할
    return sentences.flatMap(sentence => {
      if (sentence.length > 100) {
        // 쉼표나 접속사로 추가 분할
        return sentence.split(/[,，、]/).filter(s => s.trim());
      }
      return [sentence];
    });
  }
}
```

### 5.2 캐싱 전략

```typescript
// packages/tts-manager/src/cache/CacheStrategy.ts
export class HybridCache {
  private memoryCache: LRUCache<string, CachedAudio>;
  private diskCache: IndexedDBCache;
  private cdnCache: CDNCache;

  constructor() {
    // 메모리: 최근 50개
    this.memoryCache = new LRUCache({ max: 50 });

    // 디스크: IndexedDB 사용 (최대 100MB)
    this.diskCache = new IndexedDBCache('tts-cache', 100 * 1024 * 1024);

    // CDN: 자주 사용되는 공통 대사
    this.cdnCache = new CDNCache();
  }

  async get(key: string): Promise<ArrayBuffer | null> {
    // L1: 메모리 캐시
    const memCached = this.memoryCache.get(key);
    if (memCached) {
      console.log('Cache hit: Memory');
      return memCached.data;
    }

    // L2: 디스크 캐시
    const diskCached = await this.diskCache.get(key);
    if (diskCached) {
      console.log('Cache hit: Disk');
      // 메모리로 승격
      this.memoryCache.set(key, diskCached);
      return diskCached.data;
    }

    // L3: CDN 캐시
    const cdnCached = await this.cdnCache.get(key);
    if (cdnCached) {
      console.log('Cache hit: CDN');
      // 메모리와 디스크에 저장
      await this.promote(key, cdnCached);
      return cdnCached;
    }

    return null;
  }

  async set(key: string, data: ArrayBuffer, ttl?: number): Promise<void> {
    const cached: CachedAudio = {
      data,
      timestamp: Date.now(),
      ttl: ttl || 3600000, // 기본 1시간
      hitCount: 0,
    };

    // 메모리에 저장
    this.memoryCache.set(key, cached);

    // 백그라운드로 디스크에 저장
    this.diskCache.set(key, cached).catch(console.error);

    // 자주 사용되면 CDN에 업로드
    if (cached.hitCount > 10) {
      this.cdnCache.upload(key, data).catch(console.error);
    }
  }

  // 캐시 워밍
  async warmCache(predictions: string[]): Promise<void> {
    const warmingTasks = predictions.map(async (text) => {
      const key = this.generateKey(text);
      const cached = await this.get(key);

      if (!cached) {
        // 백그라운드로 생성 및 캐싱
        this.generateAndCache(text);
      }
    });

    await Promise.allSettled(warmingTasks);
  }
}
```

## 6. 에러 처리 및 폴백

### 6.1 에러 핸들링

```typescript
// packages/tts-manager/src/error/ErrorHandler.ts
export class TTSErrorHandler {
  private fallbackProviders: TTSProvider[] = [];
  private retryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2,
  };

  async executeWithFallback<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperations: (() => Promise<T>)[]
  ): Promise<T> {
    try {
      // Primary 시도
      return await this.withRetry(primaryOperation);
    } catch (primaryError) {
      console.error('Primary TTS failed:', primaryError);

      // Fallback 순차 시도
      for (const fallback of fallbackOperations) {
        try {
          return await this.withRetry(fallback);
        } catch (fallbackError) {
          console.error('Fallback failed:', fallbackError);
          continue;
        }
      }

      // 모든 시도 실패 시 기본 에러 메시지
      throw new TTSError('All TTS providers failed', {
        primaryError,
        fallbackCount: fallbackOperations.length,
      });
    }
  }

  private async withRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.retryConfig.retryDelay;

    for (let i = 0; i < this.retryConfig.maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (i < this.retryConfig.maxRetries - 1) {
          await this.sleep(delay);
          delay *= this.retryConfig.backoffMultiplier;
        }
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 사용 예시
const ttsWithFallback = new TTSErrorHandler();

const audioStream = await ttsWithFallback.executeWithFallback(
  // Primary: Clova
  () => clovaProvider.generateStream(text, options),
  [
    // Fallback 1: ElevenLabs
    () => elevenLabsProvider.generateStream(text, options),
    // Fallback 2: Google TTS
    () => googleTTSProvider.generateStream(text, options),
    // Fallback 3: 미리 녹음된 기본 음성
    () => getDefaultAudio(text),
  ]
);
```

## 7. 모니터링 및 분석

### 7.1 TTS 성능 메트릭

```typescript
// packages/tts-manager/src/monitoring/Metrics.ts
export class TTSMetrics {
  private metrics: {
    latency: number[];
    cacheHitRate: number;
    errorRate: number;
    providerUsage: Record<string, number>;
  } = {
    latency: [],
    cacheHitRate: 0,
    errorRate: 0,
    providerUsage: {},
  };

  async trackTTSGeneration(
    provider: string,
    text: string,
    startTime: number
  ): Promise<void> {
    const duration = performance.now() - startTime;

    // 지연시간 기록
    this.metrics.latency.push(duration);

    // 프로바이더 사용률
    this.metrics.providerUsage[provider] =
      (this.metrics.providerUsage[provider] || 0) + 1;

    // 실시간 리포팅 (1분마다)
    if (this.shouldReport()) {
      await this.reportMetrics();
    }
  }

  private async reportMetrics(): Promise<void> {
    const report = {
      avgLatency: this.calculateAverage(this.metrics.latency),
      p95Latency: this.calculatePercentile(this.metrics.latency, 95),
      cacheHitRate: this.metrics.cacheHitRate,
      errorRate: this.metrics.errorRate,
      providerBreakdown: this.metrics.providerUsage,
      timestamp: new Date(),
    };

    // Analytics 서비스로 전송
    await analytics.track('tts_metrics', report);

    // 메트릭 리셋
    this.resetMetrics();
  }

  private calculatePercentile(arr: number[], percentile: number): number {
    const sorted = arr.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}
```

## 8. 테스트 전략

### 8.1 통합 테스트

```typescript
// packages/tts-manager/src/__tests__/integration.test.ts
describe('TTS Integration Tests', () => {
  describe('Clova Voice Provider', () => {
    it('should generate audio stream within 300ms', async () => {
      const startTime = performance.now();
      const stream = await clovaProvider.generateStream(
        '안녕하세요, 반갑습니다.',
        { voiceId: 'njiyeon', emotion: 'happy' }
      );

      const firstChunkTime = performance.now() - startTime;
      expect(firstChunkTime).toBeLessThan(300);
    });

    it('should handle Korean text preprocessing correctly', async () => {
      const testCases = [
        { input: '25살이에요', expected: '스물다섯살이에요' },
        { input: '2025년도', expected: '이천이십오년도' },
        { input: '♥', expected: '하트' },
      ];

      for (const testCase of testCases) {
        const processed = clovaProvider.preprocessText(testCase.input);
        expect(processed).toBe(testCase.expected);
      }
    });
  });

  describe('Video Sync', () => {
    it('should maintain sync within 50ms drift', async () => {
      const videoUrl = 'test-video.mp4';
      const audioStream = await generateTestAudioStream();

      const syncController = new VideoAudioSyncController(videoElement);
      await syncController.startSynchronizedPlayback(videoUrl, audioStream);

      // 5초 후 동기화 확인
      await sleep(5000);
      const drift = syncController.getCurrentDrift();
      expect(Math.abs(drift)).toBeLessThan(50);
    });
  });
});
```

## 9. 배포 및 운영

### 9.1 환경변수 설정

```bash
# .env.production
# Clova Voice
CLOVA_API_KEY_ID=your_api_key_id
CLOVA_API_KEY=your_api_key

# ElevenLabs (Fallback)
ELEVENLABS_API_KEY=your_elevenlabs_key

# Google Cloud TTS (Fallback)
GOOGLE_TTS_CREDENTIALS=base64_encoded_json

# Cache
REDIS_URL=redis://your-redis-url
CDN_UPLOAD_URL=https://cdn.nobada.com/upload

# Monitoring
SENTRY_DSN=your_sentry_dsn
ANALYTICS_API_KEY=your_analytics_key
```

### 9.2 스케일링 고려사항

```yaml
scaling_strategy:
  traffic_levels:
    low: # < 1000 req/min
      providers: ["clova"]
      cache: ["memory", "disk"]

    medium: # 1000-10000 req/min
      providers: ["clova", "elevenlabs"]
      cache: ["memory", "disk", "redis"]
      preload: true

    high: # > 10000 req/min
      providers: ["clova", "elevenlabs", "google"]
      cache: ["memory", "redis", "cdn"]
      preload: true
      load_balancing: true

  cost_optimization:
    - Use cache aggressively (90%+ hit rate target)
    - Batch API requests where possible
    - Preload common responses during off-peak
    - CDN for frequently used audio files
```

## 10. 비용 최적화

### 10.1 비용 계산

```typescript
// 월간 예상 비용 (MAU 10,000 기준)
const costCalculator = {
  assumptions: {
    mau: 10000,
    avgSessionsPerUser: 5,
    avgMessagesPerSession: 20,
    avgCharsPerMessage: 50,
    cacheHitRate: 0.7,
  },

  calculate(): CostBreakdown {
    const totalMessages =
      this.assumptions.mau *
      this.assumptions.avgSessionsPerUser *
      this.assumptions.avgMessagesPerSession;

    const uncachedMessages = totalMessages * (1 - this.assumptions.cacheHitRate);
    const totalChars = uncachedMessages * this.assumptions.avgCharsPerMessage;

    return {
      clova: (totalChars / 1000) * 4.4, // ₩4.4 per 1000 chars
      elevenlabs: (totalChars / 1000) * 0.18 * 1300, // $0.18 per 1000 chars
      storage: 100000, // ₩100,000 for CDN/Storage
      total: null, // Calculate based on provider mix
    };
  }
};
```

이 TTS 통합 명세서는 Nobada 서비스의 핵심 차별화 요소인 실시간 TTS 시스템의 완전한 구현 가이드를 제공합니다.