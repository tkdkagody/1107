# 결혼 준비 프로젝트 보드 (Next.js + Supabase)

결혼 준비 항목을 우선순위/담당/목표 시점/메모/예상비용으로 관리하는 웹앱입니다.
데이터는 브라우저 `localStorage`가 아니라 Supabase 테이블에 저장됩니다.

## 기능

- 기본 항목(초기 결혼 준비 리스트) 자동 시드
- 항목 추가, 수정, 삭제
- 완료 체크
- 우선순위/담당/상태/검색 필터
- 예상 총비용 합계 표시
- Supabase 실시간 DB 저장

## 1) 환경 변수 설정

`.env.local.example`을 참고해 루트에 `.env.local` 파일 생성:

```bash
cp .env.local.example .env.local
```

`.env.local` 예시:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

## 2) Supabase 테이블 생성

Supabase SQL Editor에서 [schema.sql](/Users/dahee/Desktop/11월7일13시/supabase/schema.sql) 내용을 실행하세요.

## 3) 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 참고

- 현재 정책은 빠른 테스트를 위해 공개 접근(anon key + RLS policy `true`) 형태입니다.
- 실제 운영에서는 사용자 인증(Auth) 기반으로 RLS 정책을 사용자별로 제한하는 것을 권장합니다.
# 1107
