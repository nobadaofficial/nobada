# Vercel Blob Storage 설정 가이드

이 프로젝트는 이미지 업로드를 위해 **Vercel Blob Storage**를 사용합니다.

## 무료 티어 제공량
- 1GB 스토리지
- 10GB 데이터 전송/월
- 10,000 읽기 작업/월
- 2,000 업로드 작업/월

## Vercel 프로젝트에서 설정하기

### 1. Vercel Dashboard에서 Blob Storage 활성화

1. [Vercel Dashboard](https://vercel.com/dashboard)로 이동
2. 프로젝트 선택 (nobada)
3. **Storage** 탭 클릭
4. **Create Database** → **Blob Storage** 선택
5. **Create** 클릭

### 2. 자동 환경 변수 설정

Blob Storage를 생성하면 Vercel이 자동으로 환경 변수를 설정합니다:
- `BLOB_READ_WRITE_TOKEN`

추가 설정 불필요!

### 3. 로컬 개발 환경 설정

로컬에서 개발하려면 Vercel CLI를 사용하여 환경 변수를 가져옵니다:

```bash
# Vercel CLI 설치 (아직 안 했다면)
npm install -g vercel

# 프로젝트 연결
cd apps/web
vercel link

# 환경 변수 다운로드
vercel env pull
```

이제 `.env.local` 파일이 생성되고 `BLOB_READ_WRITE_TOKEN`이 포함됩니다.

## 사용 방법

### 관리자 페이지에서 이미지 업로드

1. https://www.nobada.com/ko/admin/characters/new 이동
2. 프로필 이미지 / 썸네일 이미지 섹션에서 "이미지 선택" 버튼 클릭
3. 이미지 파일 선택 (JPEG, PNG, WebP, GIF 지원, 최대 5MB)
4. 자동으로 Vercel Blob에 업로드되고 URL이 생성됩니다

### 지원 파일 형식
- JPEG/JPG
- PNG
- WebP
- GIF

### 제한사항
- 최대 파일 크기: 5MB
- 파일은 `characters/` 폴더에 저장됩니다

## 가격 정보

무료 티어 초과 시:
- 스토리지: $0.023/GB/월
- 데이터 전송: $0.05/GB
- 읽기 작업: $0.40/100만 작업
- 업로드 작업: $5.00/100만 작업

자세한 내용: https://vercel.com/docs/storage/vercel-blob/usage-and-pricing

## 대안 비교

이미지 호스팅 솔루션 중 Vercel Blob를 선택한 이유:

1. **Vercel Blob Storage** (선택됨)
   - ✅ Vercel과 완벽한 통합
   - ✅ 1GB 무료 스토리지
   - ✅ 설정이 매우 간단

2. Cloudinary
   - 25 크레딧 무료 (유연하지만 복잡)
   - 10MB 파일 크기 제한

3. Supabase Storage
   - 1GB 무료
   - 7일 비활동 시 중지됨

Vercel에 이미 배포 중이므로 Vercel Blob이 가장 효율적입니다.
