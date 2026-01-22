# Nobada - AI 연애 시뮬레이션 챗 서비스 기획서

## 1. 서비스 개요

### 1.1 핵심 컨셉
**Nobada(노바다)**는 숏폼 영상과 AI 채팅을 결합한 차세대 연애 시뮬레이션 서비스입니다.
- **장르**: AI 기반 연애 시뮬레이션 챗
- **핵심 차별점**: 매 대화마다 실사 기반 영상과 실시간 TTS가 결합된 몰입형 경험
- **타겟**: 20-30대 연애 시뮬레이션 콘텐츠 소비층

### 1.2 핵심 가치
1. **몰입감**: 실사 영상과 음성이 결합된 생동감 있는 대화
2. **개인화**: AI가 사용자 대화 패턴을 학습하여 맞춤형 스토리 전개
3. **접근성**: 웹/앱 모두에서 끊김 없는 경험

## 2. 서비스 구조

### 2.1 메인 탭 구성

| 탭 이름 | 기능 | 설명 |
|--------|------|-----|
| **홈** | 피드 탐색 | 숏폼 영상 형태로 에피소드 시작 영상 탐색 (세로 스와이프) |
| **기록** | 플레이 히스토리 | 진행 중/완료된 대화 세션 목록 및 재진입 |
| **발견** | 에피소드 브라우징 | 카테고리별 에피소드 그리드 뷰 탐색 |
| **프로필** | 개인 설정 | 사용자 정보, 구매 이력, 설정 |

### 2.2 인게임 구조

#### 대화 플로우
1. **에피소드 시작**: 캐릭터 소개 영상 재생
2. **대화 진행**:
   - 사용자 텍스트 입력
   - AI 응답 + 맞춤 영상 + 실시간 TTS 재생
3. **선택지 제공**: 중요 분기점에서 선택지 UI 제공
4. **관계도 변화**: 대화 내용에 따른 호감도/친밀도 변화
5. **엔딩 분기**: 누적된 선택과 관계도에 따른 멀티 엔딩

## 3. 핵심 기술 아키텍처

### 3.1 TTS 시스템 설계

#### 최적 솔루션 선정
**1차 선택: Naver Clova Voice (한국어 최적화)**
- 가장 자연스러운 한국어 음성 품질
- 문맥 인식 기반 발음 (예: "25살" → "스물다섯 살")
- 감정 표현 가능 (기쁨, 슬픔, 평범 등)
- API 응답 속도: ~200ms

**2차 선택: ElevenLabs (글로벌 확장 고려)**
- Flash v2.5: 75ms 초저지연
- 다국어 지원으로 글로벌 확장 용이
- WebSocket 스트리밍 지원

#### 구현 전략
```javascript
// TTS 매니저 아키텍처
class TTSManager {
  // 1. 프리로드 시스템
  - 예상 응답 미리 생성 (선택지 기반)
  - 캐싱을 통한 반복 재생 최적화

  // 2. 스트리밍 처리
  - WebSocket 기반 청크 단위 전송
  - 버퍼링 최소화 (첫 음성 재생: <300ms)

  // 3. 동기화
  - 영상 타임라인과 음성 싱크
  - Web Audio API 활용 정밀 제어
}
```

### 3.2 영상-음성 동기화 시스템

#### 기술 스택
- **영상 처리**: Video.js + HLS.js (적응형 스트리밍)
- **음성 동기화**: Web Audio API + MediaStream API
- **실시간 통신**: WebRTC (낮은 지연시간 보장)

#### 동기화 플로우
1. AI 응답 생성 (50-100ms)
2. TTS 생성 시작 + 영상 선택 (병렬 처리)
3. 첫 음성 청크 도착 시 영상 재생 시작
4. 버퍼 관리로 끊김 없는 재생

### 3.3 AI 에이전트 설계

#### 캐릭터 페르소나 시스템
```typescript
interface CharacterPersona {
  id: string;
  name: string;
  personality: PersonalityTraits;
  backstory: string;
  speechPattern: SpeechStyle;
  emotionalState: EmotionState;
  relationshipLevel: number; // 0-100
}

interface PersonalityTraits {
  openness: number;      // 개방성
  warmth: number;        // 따뜻함
  playfulness: number;   // 장난기
  mysteriousness: number; // 신비로움
}
```

#### 대화 관리 시스템
- **컨텍스트 유지**: 최근 20개 대화 기억
- **감정 추적**: 대화별 감정 상태 변화
- **관계도 계산**: 사용자 반응 기반 호감도 조정

## 4. 데이터 모델

### 4.1 핵심 엔티티

```typescript
// 에피소드
interface Episode {
  id: string;
  title: string;
  character: Character;
  category: 'first_love' | 'office' | 'fantasy' | 'daily';
  difficulty: 'easy' | 'normal' | 'hard';

  introVideoUrl: string;      // 시작 영상
  videoPool: VideoClip[];     // 대화용 영상 풀
  endingVideos: EndingVideo[]; // 멀티 엔딩 영상

  baseStory: string;          // 기본 스토리라인
  branchPoints: BranchPoint[]; // 분기점 정의
}

// 영상 클립
interface VideoClip {
  id: string;
  url: string;
  emotion: EmotionType;
  intensity: 1 | 2 | 3;  // 감정 강도
  duration: number;
  tags: string[];        // 상황 태그
}

// 대화 세션
interface ChatSession {
  id: string;
  userId: string;
  episodeId: string;

  messages: Message[];
  relationshipScore: number;
  emotionalState: EmotionState;
  storyProgress: number; // 0-100

  unlockedGallery: string[]; // 해금된 갤러리 아이템
  achievements: Achievement[];

  createdAt: Date;
  lastPlayedAt: Date;
}

// 메시지
interface Message {
  id: string;
  role: 'USER' | 'AI';
  content: string;

  // AI 메시지 전용
  videoClipId?: string;
  audioUrl?: string;     // TTS 생성 음성
  emotion?: EmotionType;
  relationshipDelta?: number;

  timestamp: Date;
}
```

### 4.2 관계도 시스템

```typescript
interface RelationshipSystem {
  // 호감도 레벨
  levels: {
    stranger: 0-20,
    acquaintance: 21-40,
    friend: 41-60,
    closeFriend: 61-80,
    romantic: 81-100
  };

  // 레벨별 해금 요소
  unlocks: {
    20: '일상 대화 해금',
    40: '개인적 질문 가능',
    60: '과거 이야기 공유',
    80: '로맨틱 대화 가능',
    100: '특별 엔딩 해금'
  };
}
```

## 5. 수익 모델

### 5.1 재화 시스템
- **하트**: 대화 진행용 기본 재화
- **다이아**: 프리미엄 선택지, 특별 영상 해금용

### 5.2 과금 구조
| 상품 | 가격 | 내용 |
|------|------|------|
| 하트 100개 | ₩3,300 | 일반 대화 약 100회 |
| 하트 300개 | ₩9,900 | 보너스 하트 30개 |
| 다이아 50개 | ₩5,500 | 특별 선택지 50회 |
| 월간 패스 | ₩19,900 | 매일 하트 50개 + 다이아 10개 |

### 5.3 소비 구조
- 일반 대화: 하트 1개
- 프리미엄 선택지: 다이아 1개
- 갤러리 영상 해금: 다이아 3개
- 다시보기: 하트 2개

## 6. UI/UX 디자인 가이드

### 6.1 디자인 원칙
1. **영상 중심**: 영상이 주인공, UI는 최소화
2. **몰입감**: 대화 중 불필요한 UI 요소 제거
3. **직관성**: 원탭으로 모든 주요 기능 접근

### 6.2 컬러 시스템
```scss
// 브랜드 컬러
$primary: #FF6B9D;     // 노바다 핑크
$secondary: #C44569;   // 딥 로즈
$accent: #FFC0CB;      // 라이트 핑크

// 감정 컬러
$love: #FF1744;        // 사랑
$happy: #FFD54F;       // 기쁨
$sad: #7986CB;         // 슬픔
$neutral: #90A4AE;     // 중립

// 시스템 컬러
$background: #1A1A1A;  // 다크 배경
$surface: #2D2D2D;     // 카드 배경
$text-primary: #FFFFFF;
$text-secondary: #B0B0B0;
```

### 6.3 인터랙션 디자인
- **영상 전환**: 크로스페이드 0.3초
- **메시지 등장**: 슬라이드업 + 페이드인
- **선택지**: 하단 슬라이드업 모달
- **이펙트**: 호감도 상승 시 하트 파티클

## 7. 차별화 전략

### 7.1 경쟁 서비스 대비 우위
| 요소 | 기존 서비스 | Nobada |
|------|-----------|---------|
| 영상 | 정적 이미지/일러스트 | 실사 영상 매 대화마다 |
| 음성 | 미리 녹음된 음성 | 실시간 TTS 커스텀 대사 |
| 몰입감 | 텍스트 중심 | 영상+음성 시너지 |
| 개인화 | 고정 스토리 | AI 기반 적응형 스토리 |

### 7.2 핵심 경쟁력
1. **기술적 우위**: 초저지연 TTS + 영상 동기화
2. **콘텐츠 우위**: 실사 기반 고품질 영상 DB
3. **사용자 경험**: 끊김 없는 몰입형 대화 경험

## 8. 개발 로드맵

### Phase 1: MVP (2개월)
- [ ] 기본 채팅 시스템
- [ ] TTS 통합 (Clova Voice)
- [ ] 영상 재생 시스템
- [ ] 1개 테스트 에피소드
- [ ] 웹 버전 출시

### Phase 2: 확장 (2개월)
- [ ] 모바일 앱 (React Native)
- [ ] 5개 정식 에피소드
- [ ] 재화/결제 시스템
- [ ] 갤러리 기능

### Phase 3: 고도화 (2개월)
- [ ] 멀티엔딩 시스템
- [ ] 프리미엄 선택지
- [ ] 업적 시스템
- [ ] 소셜 기능 (공유, 랭킹)

## 9. 성공 지표 (KPI)

### 핵심 지표
- **DAU**: 일일 활성 사용자
- **리텐션**: D1, D7, D30 재방문율
- **ARPU**: 사용자당 평균 수익
- **세션 시간**: 평균 플레이 시간

### 목표 (6개월)
- DAU: 50,000명
- D7 리텐션: 40%
- 월 매출: 5억원
- 평균 세션: 25분

## 10. 리스크 및 대응

### 기술적 리스크
| 리스크 | 영향도 | 대응 방안 |
|--------|-------|----------|
| TTS 지연 | 높음 | 프리로드 + 캐싱 전략 |
| 영상 대역폭 | 중간 | CDN + 적응형 스트리밍 |
| AI 응답 품질 | 높음 | 파인튜닝 + 품질 모니터링 |

### 사업적 리스크
- **콘텐츠 제작 비용**: 파트너십 + UGC 활용
- **경쟁사 진입**: 기술 장벽 + 독점 콘텐츠
- **규제 이슈**: 연령 인증 + 콘텐츠 가이드라인