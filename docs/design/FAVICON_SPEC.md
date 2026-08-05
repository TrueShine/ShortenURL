---
title: "j1n.uk — Favicon Spec"
tags: [design-spec, j1nuk, favicon]
status: draft
created: 2026-08-06
---

# Favicon 세트 스펙

## 문제
기존 `icons: { icon: "/logo.png" }`가 흰색 잉크+투명 배경 로고를 그대로 가리켜,
브라우저 탭(대부분 밝은 배경)에서 거의 안 보였다. 헤더 로고 작업 때와 동일한 원인.

## 시도했으나 포기한 방법: 글자 단위 크롭
파비콘은 정사각형이 필요한데 전체 워드마크(`j1n.uk`)는 1.95:1 가로형이라 그대로
정사각형에 넣으면 낭비가 크다. "j"만 따로 잘라 모노그램으로 쓰는 방법을 먼저
검토했지만, 브러시 스크립트가 글자 사이 획이 전부 이어져 있어(픽셀 열 밀도 분석
결과 문자 사이 공백 구간이 전혀 없음) 안전하게 잘라낼 경계가 없었다. 임의로
자르면 획이 끊긴 것처럼 보여 폐기했다.

## 채택한 방법: 인디고 배경 칩 + 화이트 워드마크
- 정사각형 자체에 배경을 채워 넣어 브라우저 테마(라이트/다크)에 관계없이 항상
  동일하게 보이도록 함 — 탭 배경에 기대는 투명 아이콘 방식은 라이트/다크 어느
  한쪽에서 반드시 안 보이는 문제가 있어 채택하지 않음.
- 배경: `color-accent` 토큰 `#4F46E5`(인디고), 워드마크: 원본 흰색 잉크를
  워드마크 bbox 기준 크롭 후 캔버스의 72% 폭으로 중앙 배치.
- 브랜드 신규 포인트 컬러를 그대로 노출해 다른 흰 배경 favicon들 사이에서도
  구분되는 효과 있음.

## 파일 (public/ 배치, 첨부)
| 파일 | 용도 |
|---|---|
| `public/favicon.ico` | 멀티 사이즈(16/32/48) 클래식 파비콘 |
| `public/favicon-16x16.png` | |
| `public/favicon-32x32.png` | |
| `public/favicon-48x48.png` | |
| `public/apple-touch-icon.png` (180×180) | iOS 홈 화면 추가 |
| `public/icon-192.png` | PWA/Android manifest |
| `public/icon-512.png` | PWA/Android manifest |

## layout.tsx 반영 가이드 (Web-Bee 작업 시 참고 — 여기서 직접 수정하지 않음)
```ts
export const metadata: Metadata = {
  title: "j1n.uk",
  description: "j1n.uk URL shortener",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};
```
기존 헤더용 `logo.png`/`logo-black.png`는 이 변경과 무관, 그대로 유지.

## 검증 결과 (정직하게 기록)
- 인디고 칩 배경 덕분에 라이트/다크 탭 배경 시뮬레이션(#F1F3F4 라이트, #2B2D31 다크)
  양쪽에서 아이콘 자체 대비는 동일하게 유지됨 — 배경에 묻히는 문제는 해결.
- **다만 16×16 크기에서는 브러시 스크립트가 텍스트로 읽히지 않고 추상적인 흰
  획 모양으로만 보임.** 32×32는 필기체 느낌은 감지되나 여전히 "j1n.uk" 글자로
  읽히진 않음. 48px 이상(PWA 아이콘 등)부터 워드마크가 뚜렷하게 보임. 이는
  이어진 브러시 스크립트 로고 자체의 한계이며, 대부분의 정교한 로고타입이
  16px에서 겪는 일반적인 현상 — "브랜드 색상의 구분되는 탭 아이콘"으로는
  충분히 기능하나 "글자가 읽히는 파비콘"은 아니라는 점을 사용자에게 미리
  안내하는 게 좋겠습니다.
- **검증 방법 한계**: 헤드리스 브라우저 자동화로는 실제 OS/브라우저 탭 바(크롬)
  자체를 캡처할 수 없어(페이지 콘텐츠만 스크린샷 가능), 16px/32px 아이콘을
  실제 탭 배경색과 동일한 색 스와치 위에 합성해 시뮬레이션하는 방식으로
  대체 검증했습니다. 실제 브라우저에서 다시 한번 눈으로 확인 권장합니다.
