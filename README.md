# FE-assignment – Discover Influencer

## 프로젝트 구조

'''
src/
app/
page.tsx # 메인 페이지 (Discover)
components/
Sidebar.tsx # 좌측 네비게이션
Pagination.tsx # 페이지네이션
FilterModal.tsx # 고급 필터 모달
lib/
url.ts # URL 쿼리 파싱/문자열화
storage.ts # LocalStorage 헬퍼 (나중에 보기 기능)
'''

---

## 주요 기술 스택 및 선택 이유

- **Next.js (App Router) + TypeScript**  
  → 파일 기반 라우팅과 타입 안정성을 동시에 확보
- **React Hooks (useState, useEffect, useMemo)**  
  → 상태 관리 및 데이터 동기화 단순화
- **LocalStorage**  
  → “나중에 볼 인플루언서” 기능을 브라우저에 영구 저장
- **환경 변수 기반 API 연동**  
  → `NEXT_PUBLIC_API_BASE_URL` 설정으로 Mock / 실제 서버 전환 가능

---

## 실행 방법

```bash
# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 수정:
# NEXT_PUBLIC_API_BASE_URL=https://featuring-front-onboarding-1.vercel.app
# NEXT_PUBLIC_USE_MOCK=0   # (실제 API 사용 시 0, Mock 모드 시 1)

# 개발 서버 실행
npm run dev
# → http://localhost:3000
```
