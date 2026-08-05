---
title: "j1n.uk URL Shortener — Design Tokens"
tags: [design-tokens, j1nuk, url-shortener]
status: draft
created: 2026-08-05
---

# j1n.uk URL Shortener — 디자인 토큰

**대상**: 웹(Next.js) / 모바일웹 / (필요 시) Flutter 앱 — 동일 토큰·용어 공유
**톤**: 미니멀/심플. 기존 j1n.uk(다크·블랙 프라이머리) 정체성을 라이트 베이스로 재해석하고,
포인트 컬러 하나로 절제된 인상을 준다. 브랜드 레퍼런스가 없어 자유 제안한 방향이며,
PM-Bee 확정 전 협의 가능.

---

## 1. Color

| Token | Value | 용도 |
|---|---|---|
| `color-bg` | `#FAFAFA` | 페이지 배경 |
| `color-surface` | `#FFFFFF` | 카드/모달/인풋 배경 |
| `color-surface-dim` | `#F2F2F4` | 스켈레톤, 비활성 영역 |
| `color-text-primary` | `#111113` | 본문/제목 |
| `color-text-secondary` | `#6B7280` | 보조 텍스트, 메타 정보 |
| `color-text-disabled` | `#B0B0B6` | 비활성 텍스트 |
| `color-border` | `#E5E7EB` | 인풋/카드 기본 보더 |
| `color-border-strong` | `#D1D5DB` | 구분선, hover 보더 |
| `color-accent` | `#4F46E5` | 프라이머리 버튼, 링크, 포커스 링, 선택 상태 |
| `color-accent-hover` | `#4338CA` | 프라이머리 버튼 hover/active |
| `color-accent-subtle` | `#EEF0FF` | 아이콘 배경, 배지, 선택 항목 배경 |
| `color-success` | `#16A34A` | 복사됨, 활성 링크 상태 |
| `color-warning` | `#D97706` | 만료 임박, 비번보호 배지 |
| `color-danger` | `#DC2626` | 에러, 삭제, 만료됨 |
| `color-danger-subtle` | `#FEF2F2` | 에러 배너 배경 |
| `color-code-bg` | `#111113` | 단축 URL 강조 칩(다크 chip) — 기존 브랜드 블랙 계승 |
| `color-code-text` | `#F5F5F7` | 단축 URL 칩 텍스트 |

라이트/화이트 베이스가 기본이며, `color-code-bg`(단축 URL 표시 칩)에만 기존 다크 정체성을 남겨
브랜드 연속성을 준다.

---

## 2. Typography

**서체**: `Pretendard, Inter, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif`
(한글 UI는 Pretendard, 영문/숫자·모노스페이스 코드는 Inter 우선 — 무료·오픈소스, 국문 미니멀 UI에 표준적으로 쓰임)

**모노스페이스**(단축 URL, 통계 숫자): `"JetBrains Mono", "SFMono-Regular", monospace`

| Token | Size / Line-height | Weight | 용도 |
|---|---|---|---|
| `text-display` | 28px / 1.25 | 700 | 생성 결과 큰 숫자·강조 문구 |
| `text-h1` | 24px / 1.3 | 700 | 페이지 타이틀 |
| `text-h2` | 18px / 1.4 | 600 | 섹션 타이틀, 카드 헤더 |
| `text-body` | 15px / 1.55 | 400 | 본문 |
| `text-body-strong` | 15px / 1.55 | 600 | 강조 본문, 버튼 라벨 |
| `text-small` | 13px / 1.5 | 400 | 메타 정보, 헬퍼 텍스트 |
| `text-caption` | 12px / 1.4 | 500, letter-spacing 0.02em, uppercase | 라벨/배지 |
| `text-code` | 16–20px / 1.3 | 600, monospace | 단축 URL |

Base root: `16px`, rem 기반.

---

## 3. Spacing (4px 기준 스케일)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` — 토큰명 `space-1`(4px) ~ `space-8`(64px)

- 카드 내부 패딩: `space-6`(24px) 모바일 / `space-7`(32px) 데스크톱
- 폼 요소 간 간격: `space-4`(16px)
- 섹션 간 간격: `space-7`(32px)~`space-8`(64px)

---

## 4. Radius & Elevation

| Token | Value | 용도 |
|---|---|---|
| `radius-sm` | 8px | 인풋, 버튼 |
| `radius-md` | 12px | 카드 |
| `radius-lg` | 16px | 모달, 큰 결과 카드 |
| `radius-pill` | 999px | 배지, 토글, 칩 |
| `shadow-sm` | `0 1px 2px rgba(17,17,19,.04)` | 기본 카드 |
| `shadow-md` | `0 4px 16px rgba(17,17,19,.08)` | 모달, 드롭다운, hover 카드 |

---

## 5. 공통 컴포넌트

### 버튼
- **Primary**: bg `color-accent` / text `#fff` / height 44px / radius `radius-sm` / padding 0 20px / `text-body-strong`. hover→`color-accent-hover`, disabled→`color-surface-dim` bg + `color-text-disabled` text.
- **Secondary**: bg transparent / border 1px `color-border-strong` / text `color-text-primary`. hover: border `color-text-primary`.
- **Danger**: bg transparent / text `color-danger`. hover: bg `color-danger-subtle`.
- **Ghost/Link**: bg 없음, text `color-accent`, hover underline.
- 모바일 터치 타깃 최소 44px 유지.

### 인풋
- height 44px / border 1px `color-border` / radius `radius-sm` / padding 0 14px / `text-body`
- focus: border `color-accent` + `box-shadow 0 0 0 3px rgba(79,70,229,.12)`
- error: border `color-danger`, 하단 헬퍼 텍스트 `text-small` + `color-danger`

### 배지(상태 표시)
- pill 형태, `text-caption`, padding 2px 10px
- 활성: bg `color-accent-subtle` / text `color-accent`
- 만료: bg `#F3F4F6` / text `color-text-secondary`
- 비번보호: bg `#FFF7ED` / text `color-warning`
- 에러/삭제 대상: bg `color-danger-subtle` / text `color-danger`

### 카드
- bg `color-surface`, border 1px `color-border`, radius `radius-md`, `shadow-sm`

### 단축 URL 칩
- bg `color-code-bg`, text `color-code-text`, `text-code`, radius `radius-sm`, padding 12px 16px, 복사 아이콘 버튼 내장

---

## 6. Breakpoints & Layout

| Breakpoint | Range | 비고 |
|---|---|---|
| mobile | `< 640px` | 기본 스타일 (mobile-first) |
| tablet | `640–1023px` | 폼 2단 배치 시작 |
| desktop | `≥ 1024px` | 대시보드 테이블 전환 |

- 폼 중심 화면(생성/결과/로그인/게이트/에러) 최대 폭: **480px**, 중앙 정렬
- 대시보드 최대 폭: **960px**

---

## 7. 톤 & 카피 가이드

- 문장은 짧고 담백하게, 해요체 유지 (예: "링크를 짧게", "생성 완료", "다시 시도해주세요")
- 에러/빈 화면도 딱딱하지 않게, 원인+다음 행동을 함께 제시
- 아이콘은 outline 스타일 1.5px stroke 통일 (예: Lucide/Feather 계열)

---

## Flutter/모바일앱 매핑 노트

- 토큰명은 camelCase로 1:1 매핑 가능 (`colorAccent`, `radiusSm` 등)
- 웹 전용 hover 상태는 앱에서 pressed/ripple 상태로 대체
- 폰트: Pretendard는 Flutter에서도 동일 패밀리 사용 가능(TTF 임베드)
