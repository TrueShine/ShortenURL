# j1n.uk URL Shortener

Next.js (App Router) + Supabase 기반 URL 단축 서비스. 익명 사용자는 랜덤 slug로,
로그인한 관리자는 커스텀 alias로 단축 URL을 만들 수 있습니다.

## 스택

- Next.js 16 (App Router, TypeScript, Tailwind CSS v4)
- Supabase (Postgres + Auth)
- Vercel 배포, 리다이렉트는 `src/proxy.ts`(Proxy, 구 Middleware)에서 처리

## 로컬 개발 설정

1. 의존성 설치

   ```bash
   npm install
   ```

2. Supabase 프로젝트를 만들고 `supabase/migrations/0001_init.sql`을 실행해
   `links`, `clicks` 테이블과 RLS 정책을 생성합니다.

3. `.env.example`을 `.env.local`로 복사하고 Supabase 프로젝트 값을 채웁니다.

   ```bash
   cp .env.example .env.local
   ```

4. 관리자 계정은 회원가입 플로우가 없으므로 Supabase 대시보드(Authentication)에서
   직접 1개 생성합니다.

5. 개발 서버 실행

   ```bash
   npm run dev
   ```

## 스키마

- `links(id, slug, target_url, expires_at, password_hash, created_by, created_at)`
- `clicks(id, link_id, created_at, referrer)`

`created_by`가 `null`이면 익명 생성 링크입니다.
