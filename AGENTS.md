<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 시크릿 취급 규칙

## `.env.local`은 사람만 편집한다

에이전트는 `.env.local`(및 `.env*`)을 **읽지도, 쓰지도 않는다.** 새 환경변수가
필요하면 변수 이름과 값 생성 방법만 알리고, 값 입력은 사람이 한다.

이유는 출력 실수를 막기 위해서가 아니다. 에이전트 하네스는 세션 중 파일이
바뀌면 그 diff를 대화 로그에 자동 첨부한다. 즉 에이전트가 `.env.local`에 한 줄
추가하면, 명령을 아무리 조심스럽게 짜도 파일에 있던 **다른 모든 값**(예:
`SUPABASE_SERVICE_ROLE_KEY`)까지 평문으로 로그에 남는다. 이 동작은 끌 수 없다.
2026-08-05에 같은 키가 이 경로로 두 번 노출됐다.

로컬에서 값이 필요한 테스트는 사람이 값을 채워준 뒤에 진행한다.

## 프로덕션 시크릿은 대시보드에 직접 넣는다

Vercel/Supabase 환경변수는 각 대시보드에 사람이 직접 입력한다. 채널 메시지나
`.env.local`을 경유해 전달하지 않는다.

## 값을 옮겨야 할 때

부득이하게 시크릿을 다뤄야 하면 값 자체가 아니라 위치(파일 경로)만 주고받고,
출력할 때는 앞 6자 정도만 남기고 마스킹한다.
