# Nobada 기술 아키텍처 설계서

## 1. 시스템 아키텍처 개요

### 1.1 기술 스택
```yaml
Frontend:
  Web: Next.js 15 + React 19 + TypeScript
  Mobile: React Native + Expo 54
  Styling: Tailwind CSS / NativeWind
  State: Zustand + React Query
  Video: Video.js + HLS.js
  Audio: Web Audio API

Backend:
  API: Next.js API Routes
  Database: PostgreSQL (Neon DB)
  ORM: Prisma
  Cache: Redis (Upstash)
  Storage: Google Cloud Storage (GCS)

AI/ML:
  LLM: Google Gemini Pro / Vertex AI
  TTS: Google Cloud Text-to-Speech (Primary) / Naver Clova (Fallback)
  STT: Google Cloud Speech-to-Text
  Embeddings: Google Vertex AI Embeddings
  Translation: Google Cloud Translation API

Infrastructure:
  Hosting: Vercel (Web) / Google Cloud Run (Services)
  CDN: Google Cloud CDN
  Monitoring: Google Cloud Monitoring + Sentry
  CI/CD: GitHub Actions
```

### 1.2 모노레포 구조
```
nobada/
├── apps/
│   ├── web/              # Next.js 웹 애플리케이션
│   └── mobile/           # React Native 앱
├── packages/
│   ├── api-client/       # API 클라이언트
│   ├── types/           # 공유 타입 정의
│   ├── constants/       # 상수
│   ├── hooks/          # 공유 React 훅
│   ├── store/          # 전역 상태 관리
│   ├── tts-manager/    # TTS 관리 패키지
│   ├── video-sync/     # 영상 동기화 패키지
│   └── utils/          # 유틸리티 함수
└── docs/               # 문서
```

## 2. TTS 시스템 상세 설계

### 2.1 TTS 매니저 아키텍처

```typescript
// packages/tts-manager/src/TTSManager.ts
export class TTSManager {
  private provider: TTSProvider;
  private cache: TTSCache;
  private queue: TTSQueue;
  private preloader: TTSPreloader;

  constructor(config: TTSConfig) {
    this.provider = this.initProvider(config);
    this.cache = new TTSCache(config.cacheSize);
    this.queue = new TTSQueue();
    this.preloader = new TTSPreloader(this.provider);
  }

  // 실시간 TTS 생성 및 스트리밍
  async streamTTS(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>> {
    // 1. 캐시 확인
    const cached = await this.cache.get(text, options);
    if (cached) return cached;

    // 2. TTS 생성 요청
    const stream = await this.provider.generateStream(text, options);

    // 3. 캐시 저장 (백그라운드)
    this.cache.store(text, options, stream.tee()[1]);

    return stream.tee()[0];
  }

  // 프리로드 시스템
  async preloadResponses(
    context: ConversationContext,
    possibleResponses: string[]
  ): Promise<void> {
    const preloadTasks = possibleResponses.map(response =>
      this.preloader.preload(response, context)
    );

    await Promise.allSettled(preloadTasks);
  }
}
```

### 2.2 TTS 프로바이더 추상화

```typescript
// packages/tts-manager/src/providers/base.ts
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

// packages/tts-manager/src/providers/clova.ts
export class ClovaVoiceProvider extends TTSProvider {
  private client: ClovaClient;

  async generateStream(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>> {
    const params = {
      speaker: options.voiceId || 'njiyeon', // 기본 음성
      volume: options.volume || 0,
      speed: options.speed || 0,
      pitch: options.pitch || 0,
      emotion: options.emotion || 'neutral',
      format: 'mp3',
      streaming: true
    };

    return this.client.textToSpeechStream(text, params);
  }
}

// packages/tts-manager/src/providers/elevenlabs.ts
export class ElevenLabsProvider extends TTSProvider {
  private ws: WebSocket;

  async generateStream(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array>> {
    // WebSocket 스트리밍 구현
    return new ReadableStream({
      start: (controller) => {
        this.ws.send(JSON.stringify({
          text,
          voice_id: options.voiceId,
          model_id: 'eleven_flash_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        }));

        this.ws.onmessage = (event) => {
          if (event.data instanceof Blob) {
            controller.enqueue(new Uint8Array(event.data));
          }
        };
      }
    });
  }
}
```

### 2.3 캐싱 전략

```typescript
// packages/tts-manager/src/cache.ts
export class TTSCache {
  private memoryCache: LRUCache<string, ArrayBuffer>;
  private diskCache: DiskCache;

  constructor(maxSize: number) {
    this.memoryCache = new LRUCache({ max: maxSize });
    this.diskCache = new DiskCache();
  }

  async get(
    text: string,
    options: TTSOptions
  ): Promise<ReadableStream<Uint8Array> | null> {
    const key = this.generateKey(text, options);

    // 1. 메모리 캐시 확인
    const memCached = this.memoryCache.get(key);
    if (memCached) {
      return new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(memCached));
          controller.close();
        }
      });
    }

    // 2. 디스크 캐시 확인
    const diskCached = await this.diskCache.get(key);
    if (diskCached) {
      // 메모리 캐시에 승격
      this.memoryCache.set(key, diskCached);
      return this.arrayBufferToStream(diskCached);
    }

    return null;
  }

  private generateKey(text: string, options: TTSOptions): string {
    return crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(
        `${text}-${JSON.stringify(options)}`
      )
    ).then(hash =>
      Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
    );
  }
}
```

## 3. 영상-음성 동기화 시스템

### 3.1 동기화 매니저

```typescript
// packages/video-sync/src/VideoSyncManager.ts
export class VideoSyncManager {
  private videoPlayer: VideoPlayer;
  private audioController: AudioController;
  private syncBuffer: SyncBuffer;

  constructor() {
    this.videoPlayer = new VideoPlayer();
    this.audioController = new AudioController();
    this.syncBuffer = new SyncBuffer();
  }

  async playWithTTS(
    videoUrl: string,
    audioStream: ReadableStream<Uint8Array>
  ): Promise<void> {
    // 1. 비디오 프리로드
    await this.videoPlayer.preload(videoUrl);

    // 2. 오디오 스트림 버퍼링 시작
    const audioBuffer = await this.bufferAudioStream(audioStream);

    // 3. 동기화 재생
    await Promise.all([
      this.videoPlayer.play(),
      this.audioController.playStream(audioBuffer)
    ]);

    // 4. 동기화 모니터링
    this.startSyncMonitoring();
  }

  private async bufferAudioStream(
    stream: ReadableStream<Uint8Array>
  ): Promise<AudioBuffer> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];

    // 최소 버퍼링 (300ms 분량)
    while (chunks.length < 3) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    // Web Audio API AudioBuffer로 변환
    const audioContext = new AudioContext();
    const audioData = this.mergeChunks(chunks);
    return audioContext.decodeAudioData(audioData.buffer);
  }

  private startSyncMonitoring(): void {
    const syncInterval = setInterval(() => {
      const videTime = this.videoPlayer.getCurrentTime();
      const audioTime = this.audioController.getCurrentTime();
      const drift = Math.abs(videTime - audioTime);

      if (drift > 0.05) { // 50ms 이상 차이
        this.resync(videTime, audioTime);
      }
    }, 100);
  }
}
```

### 3.2 적응형 비트레이트 스트리밍

```typescript
// packages/video-sync/src/AdaptiveStreaming.ts
export class AdaptiveStreamingManager {
  private bandwidthEstimator: BandwidthEstimator;
  private qualitySelector: QualitySelector;

  async initializeStream(manifestUrl: string): Promise<void> {
    // HLS 매니페스트 파싱
    const manifest = await this.parseManifest(manifestUrl);

    // 초기 대역폭 측정
    const bandwidth = await this.bandwidthEstimator.estimate();

    // 적절한 품질 선택
    const quality = this.qualitySelector.select(
      manifest.variants,
      bandwidth
    );

    // 스트림 시작
    this.startStreaming(quality.url);
  }

  private startStreaming(url: string): void {
    if (Hls.isSupported()) {
      const hls = new Hls({
        startLevel: -1, // 자동 품질
        maxBufferLength: 30,
        maxBufferSize: 60 * 1000 * 1000,
        enableWorker: true,
        lowLatencyMode: true // 저지연 모드
      });

      hls.loadSource(url);
      hls.attachMedia(this.videoElement);

      // 품질 변경 모니터링
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log(`Quality switched to ${data.level}`);
      });
    }
  }
}
```

## 4. AI 에이전트 시스템

### 4.1 대화 엔진

```typescript
// apps/web/lib/ai/conversation-engine.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { VertexAI } from '@google-cloud/vertexai';

export class ConversationEngine {
  private gemini: GoogleGenerativeAI;
  private vertexAI: VertexAI;
  private memoryManager: MemoryManager;
  private emotionTracker: EmotionTracker;

  constructor() {
    // Gemini Pro for general conversation
    this.gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

    // Vertex AI for advanced features
    this.vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: 'asia-northeast3', // Seoul region
    });
  }

  async generateResponse(
    userInput: string,
    context: ConversationContext
  ): Promise<AIResponse> {
    // 1. 컨텍스트 준비
    const enrichedContext = await this.enrichContext(context);

    // 2. 감정 분석 (Vertex AI)
    const userEmotion = await this.analyzeEmotionWithVertex(userInput);

    // 3. 응답 생성 (Gemini Pro)
    const model = this.gemini.getGenerativeModel({ model: 'gemini-pro' });
    const chat = model.startChat({
      history: enrichedContext.messages.map(msg => ({
        role: msg.role === 'AI' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      generationConfig: {
        temperature: this.getTemperature(context.relationshipLevel),
        maxOutputTokens: 150,
        topK: 40,
        topP: 0.95,
      },
    });

    const result = await chat.sendMessage(userInput);

    // 4. 응답 후처리
    const processed = await this.postProcess(response, context);

    // 5. 영상 매칭
    const videoClip = await this.matchVideo(
      processed.emotion,
      processed.intensity
    );

    // 6. TTS 옵션 설정
    const ttsOptions = this.getTTSOptions(
      processed.emotion,
      context.character
    );

    return {
      text: processed.text,
      emotion: processed.emotion,
      videoClipId: videoClip.id,
      ttsOptions,
      relationshipDelta: processed.relationshipDelta,
      nextBranch: processed.nextBranch
    };
  }

  private buildSystemPrompt(context: ConversationContext): string {
    return `
    당신은 ${context.character.name}입니다.

    성격:
    - ${context.character.personality}

    현재 관계도: ${context.relationshipLevel}/100
    현재 감정: ${context.emotionalState}

    대화 규칙:
    1. 캐릭터의 성격에 맞게 자연스럽게 대화
    2. 관계도에 따라 적절한 거리감 유지
    3. 200자 이내로 응답
    4. 이모티콘 사용 금지

    관계도별 말투:
    - 0-20: 정중하고 거리감 있게
    - 21-40: 조금 편하게
    - 41-60: 친근하게
    - 61-80: 매우 가깝게
    - 81-100: 연인처럼 다정하게
    `;
  }
}
```

### 4.2 메모리 관리 시스템

```typescript
// apps/web/lib/ai/memory-manager.ts
export class MemoryManager {
  private shortTermMemory: Message[]; // 최근 20개
  private longTermMemory: ImportantMemory[]; // 중요 기억
  private workingMemory: WorkingMemory; // 현재 대화 컨텍스트

  async addMemory(message: Message, importance: number): Promise<void> {
    // 단기 기억에 추가
    this.shortTermMemory.push(message);
    if (this.shortTermMemory.length > 20) {
      this.shortTermMemory.shift();
    }

    // 중요도가 높으면 장기 기억으로
    if (importance > 0.7) {
      const embedding = await this.generateEmbedding(message.content);
      this.longTermMemory.push({
        message,
        embedding,
        importance,
        timestamp: new Date()
      });
    }
  }

  async retrieveRelevantMemories(
    query: string,
    k: number = 5
  ): Promise<Message[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    // 코사인 유사도로 관련 기억 검색
    const similarities = this.longTermMemory.map(memory => ({
      memory,
      similarity: this.cosineSimilarity(queryEmbedding, memory.embedding)
    }));

    // 상위 k개 반환
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, k)
      .map(s => s.memory.message);
  }
}
```

## 5. 데이터베이스 설계

### 5.1 Prisma 스키마

```prisma
// apps/web/prisma/schema.prisma

model User {
  id            String         @id @default(cuid())
  clerkId       String         @unique
  email         String?        @unique
  username      String?
  profileImage  String?

  hearts        Int            @default(100)
  diamonds      Int            @default(10)

  sessions      ChatSession[]
  purchases     Purchase[]
  achievements  Achievement[]
  gallery       GalleryItem[]

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model Character {
  id            String         @id @default(cuid())
  name          String
  description   String         @db.Text
  profileImage  String

  personality   Json           // PersonalityTraits
  backstory     String         @db.Text
  voiceId       String         // TTS 음성 ID

  episodes      Episode[]
  createdAt     DateTime       @default(now())
}

model Episode {
  id            String         @id @default(cuid())
  title         String
  description   String         @db.Text

  characterId   String
  character     Character      @relation(fields: [characterId], references: [id])

  category      Category
  difficulty    Difficulty

  introVideoUrl String
  videoPoolIds  String[]       // 영상 풀 ID 목록

  baseStory     String         @db.Text
  branchPoints  Json           // BranchPoint[]

  sessions      ChatSession[]

  playCount     Int            @default(0)
  avgRating     Float?

  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model ChatSession {
  id                String         @id @default(cuid())

  userId            String
  user              User           @relation(fields: [userId], references: [id])

  episodeId         String
  episode           Episode        @relation(fields: [episodeId], references: [id])

  messages          Json           @default("[]") // Message[]
  relationshipScore Int            @default(0)
  emotionalState    Json           // EmotionState
  storyProgress     Int            @default(0)

  unlockedGallery   String[]
  currentBranch     String?

  status            SessionStatus  @default(ACTIVE)

  createdAt         DateTime       @default(now())
  lastPlayedAt      DateTime       @default(now())
  completedAt       DateTime?
}

model VideoClip {
  id            String         @id @default(cuid())
  url           String
  thumbnailUrl  String

  emotion       String         // EmotionType
  intensity     Int            // 1-3
  tags          String[]
  duration      Int            // seconds

  characterId   String?

  createdAt     DateTime       @default(now())
}

model TTSCache {
  id            String         @id @default(cuid())
  textHash      String         @unique

  text          String         @db.Text
  voiceId       String
  emotion       String

  audioUrl      String
  duration      Int            // milliseconds

  usageCount    Int            @default(1)
  lastUsedAt    DateTime       @default(now())
  createdAt     DateTime       @default(now())

  @@index([textHash])
  @@index([lastUsedAt])
}

enum Category {
  FIRST_LOVE
  OFFICE
  FANTASY
  DAILY
  MYSTERY
}

enum Difficulty {
  EASY
  NORMAL
  HARD
}

enum SessionStatus {
  ACTIVE
  PAUSED
  COMPLETED
  ABANDONED
}
```

## 6. API 설계

### 6.1 RESTful API 엔드포인트

```typescript
// API Routes
POST   /api/chat/send          // 메시지 전송
GET    /api/chat/session/:id   // 세션 조회
POST   /api/chat/session/new   // 새 세션 시작

GET    /api/episodes            // 에피소드 목록
GET    /api/episodes/:id       // 에피소드 상세

POST   /api/tts/generate       // TTS 생성
GET    /api/tts/stream/:id     // TTS 스트리밍

POST   /api/purchase/hearts    // 하트 구매
POST   /api/purchase/diamonds  // 다이아 구매

GET    /api/user/profile       // 프로필 조회
PUT    /api/user/profile       // 프로필 수정
```

### 6.2 WebSocket 이벤트

```typescript
// WebSocket Events
interface WebSocketEvents {
  // Client -> Server
  'chat:send': { sessionId: string; content: string };
  'chat:typing': { sessionId: string };
  'video:ready': { sessionId: string };

  // Server -> Client
  'chat:receive': { message: Message; videoClipUrl: string };
  'chat:streaming': { chunk: string };
  'tts:chunk': { audioData: ArrayBuffer };
  'sync:video': { timestamp: number };
  'relationship:update': { delta: number; current: number };
}
```

## 7. 성능 최적화 전략

### 7.1 프론트엔드 최적화

```typescript
// 1. 동적 임포트 및 코드 스플리팅
const ChatScreen = dynamic(() => import('./ChatScreen'), {
  loading: () => <ChatSkeleton />,
  ssr: false
});

// 2. 이미지/비디오 최적화
const optimizedVideoUrl = generateOptimizedUrl(originalUrl, {
  width: deviceWidth,
  quality: networkQuality,
  format: 'webm' // 또는 'mp4'
});

// 3. React Query로 데이터 캐싱
const { data: episodes } = useQuery({
  queryKey: ['episodes', category],
  queryFn: fetchEpisodes,
  staleTime: 5 * 60 * 1000, // 5분
  cacheTime: 10 * 60 * 1000 // 10분
});

// 4. 가상 스크롤링
<VirtualList
  height={600}
  itemCount={messages.length}
  itemSize={80}
  renderItem={({ index, style }) => (
    <MessageBubble style={style} message={messages[index]} />
  )}
/>
```

### 7.2 백엔드 최적화

```typescript
// 1. DB 쿼리 최적화
const session = await prisma.chatSession.findUnique({
  where: { id: sessionId },
  include: {
    episode: {
      include: {
        character: true // N+1 문제 방지
      }
    }
  }
});

// 2. Redis 캐싱
const cached = await redis.get(`session:${sessionId}`);
if (cached) return JSON.parse(cached);

// 3. 배치 처리
const batchProcessor = new BatchProcessor({
  batchSize: 100,
  interval: 1000,
  processor: async (items) => {
    await prisma.tTSCache.createMany({ data: items });
  }
});

// 4. 스트리밍 응답
return new Response(
  new ReadableStream({
    async start(controller) {
      for await (const chunk of generateStreamResponse()) {
        controller.enqueue(chunk);
      }
      controller.close();
    }
  }),
  { headers: { 'Content-Type': 'text/event-stream' } }
);
```

## 8. 모니터링 및 분석

### 8.1 핵심 메트릭

```typescript
// 성능 메트릭
interface PerformanceMetrics {
  tts: {
    latency: number;       // TTS 생성 지연
    cacheHitRate: number;  // 캐시 히트율
  };
  video: {
    bufferRatio: number;   // 버퍼링 비율
    qualitySwitches: number; // 품질 변경 횟수
  };
  api: {
    responseTime: number;  // API 응답 시간
    errorRate: number;     // 에러율
  };
}

// 비즈니스 메트릭
interface BusinessMetrics {
  users: {
    dau: number;           // 일일 활성 사용자
    retention: {
      d1: number;
      d7: number;
      d30: number;
    };
  };
  engagement: {
    avgSessionTime: number; // 평균 세션 시간
    msgsPerSession: number; // 세션당 메시지 수
  };
  monetization: {
    arpu: number;          // 사용자당 평균 수익
    conversionRate: number; // 결제 전환율
  };
}
```

## 9. 보안 고려사항

### 9.1 보안 체크리스트

- [ ] API Rate Limiting
- [ ] Input Validation & Sanitization
- [ ] SQL Injection 방지 (Prisma 사용)
- [ ] XSS 방지 (React 기본 제공)
- [ ] CSRF 토큰
- [ ] 민감 정보 암호화
- [ ] HTTPS 전용
- [ ] WebSocket 인증
- [ ] 콘텐츠 필터링 (부적절한 대화)
- [ ] DDoS 방어 (Cloudflare)

## 10. 확장성 계획

### 10.1 스케일링 전략

```yaml
단계별 확장:
  Phase1_MVP:
    users: ~1,000
    infrastructure: "Vercel + Neon DB"

  Phase2_Growth:
    users: ~10,000
    infrastructure: "Vercel + Neon DB + Redis"
    optimization: "CDN + 캐싱 강화"

  Phase3_Scale:
    users: ~100,000
    infrastructure: "AWS ECS + RDS + ElastiCache"
    optimization: "마이크로서비스 전환"

  Phase4_Enterprise:
    users: 1,000,000+
    infrastructure: "K8s + Multi-Region"
    optimization: "엣지 컴퓨팅 + 글로벌 CDN"
```