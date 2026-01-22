# Nobada - AI 연애 시뮬레이션 챗 서비스

## 🎯 프로젝트 개요

**Nobada(노바다)**는 실사 기반 숏폼 영상과 실시간 TTS를 결합한 차세대 AI 연애 시뮬레이션 서비스입니다.

## ✨ 핵심 특징

- 🎬 **실사 영상**: 매 대화마다 캐릭터의 실사 영상 재생
- 🎙️ **실시간 음성**: Google Cloud TTS를 통한 실시간 음성 합성
- 💕 **관계도 시스템**: 대화에 따른 호감도 변화와 멀티엔딩
- 🎭 **감정 표현**: 캐릭터의 감정에 맞춘 영상과 음성 매칭
- ☁️ **Google Cloud 통합**: GCS, Vertex AI, Cloud TTS 활용

## 🛠 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma, PostgreSQL
- **AI/ML**: Google Gemini Pro, Vertex AI, Cloud TTS
- **Storage**: Google Cloud Storage
- **Monorepo**: pnpm + Turborepo

## 📁 프로젝트 구조

```
nobada/
├── apps/
│   ├── web/              # Next.js 웹 애플리케이션
│   └── mobile/           # React Native 모바일 앱 (예정)
├── packages/
│   ├── types/            # TypeScript 타입 정의
│   ├── constants/        # 상수 정의
│   ├── utils/            # 유틸리티 함수
│   ├── tts-manager/      # TTS 관리 모듈
│   ├── storage/          # GCS 스토리지 관리
│   └── tsconfig/         # 공유 TypeScript 설정
└── docs/                 # 프로젝트 문서
```

## 🚀 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경변수 설정

`.env.example`을 참고하여 `.env.local` 파일 생성:

```bash
cp .env.example apps/web/.env.local
# 필요한 환경변수 입력
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
pnpm db:push

# Prisma Studio 실행 (선택)
pnpm db:studio
```

### 4. 개발 서버 실행

```bash
# 전체 실행
pnpm dev

# 웹만 실행
pnpm dev:web
```

## 📋 주요 명령어

```bash
pnpm dev          # 개발 서버 실행
pnpm build        # 프로덕션 빌드
pnpm lint         # 린트 검사
pnpm type-check   # 타입 검사
pnpm clean        # 빌드 캐시 삭제
```

## 📚 문서

- [제품 기획서](./docs/PRODUCT_SPEC.md)
- [기술 아키텍처](./docs/ARCHITECTURE.md)
- [TTS 통합 명세](./docs/TTS_INTEGRATION.md)
- [UX 디자인 가이드](./docs/UX_DESIGN.md)

## 🔑 Google Cloud 설정

1. **GCP 프로젝트 생성**
2. **필요한 API 활성화**:
   - Cloud Text-to-Speech API
   - Cloud Storage API
   - Vertex AI API
3. **서비스 계정 생성 및 키 다운로드**
4. **GCS 버킷 생성**

## 🚧 개발 현황

### 완료 ✅
- 모노레포 구조 설정
- 공유 패키지 구현
- Google Cloud TTS 통합
- GCS 스토리지 매니저
- Prisma 데이터베이스 스키마
- 기본 채팅 UI 컴포넌트
- 비디오 플레이어 구현

### 진행 예정 ⏳
- React Native 모바일 앱
- AI 대화 엔진 구현
- 실시간 TTS 스트리밍
- 영상-음성 동기화
- 결제 시스템
- 관리자 대시보드

## 💡 핵심 차별화

1. **초저지연 TTS**: < 300ms 응답 시간
2. **영상-음성 완벽 동기화**: WebRTC + MediaStream API
3. **AI 개인화**: Google Gemini Pro 기반 맞춤형 대화

## 📝 라이선스

Private - All Rights Reserved

---

*개발: Nobada Team*
*문의: contact@nobada.com*