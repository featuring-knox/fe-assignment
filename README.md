# FE-assignment – Discover Influencer

## 프로젝트 구조

```
fe-assignment/
└─ src/
   ├─ app/
   │  └─ page.tsx                # 메인 페이지 (Discover)
   ├─ components/
   │  ├─ Sidebar.tsx             # 좌측 네비게이션
   │  ├─ Pagination.tsx          # 페이지네이션
   │  └─ FilterModal.tsx         # 고급 필터 모달
   └─ lib/
      ├─ url.ts                  # URL 쿼리 파싱/문자열화
      └─ storage.ts              # LocalStorage 헬퍼 (나중에 보기 기능)
```

## 주요 기술 스택 및 선택 이유

- **Next.js (App Router) + TypeScript**  
  → 파일 기반 라우팅 + 타입 안정성
- **React Hooks (useState, useEffect, useMemo)**  
  → 가벼운 상태/동기화에 충분, 학습곡선 낮음
- **LocalStorage**  
  → “나중에 볼 인플루언서”를 브라우저에 영구 저장
- **환경 변수 기반 API 연동**  
  → `NEXT_PUBLIC_API_BASE_URL`로 Mock/실서버 전환 가능

## 실행 방법

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 수정:
# NEXT_PUBLIC_API_BASE_URL=https://featuring-front-onboarding-1.vercel.app
# NEXT_PUBLIC_USE_MOCK=0   # 실제 API 사용=0, Mock 모드=1

# 개발 서버 실행
npm run dev
# → http://localhost:3000
```
