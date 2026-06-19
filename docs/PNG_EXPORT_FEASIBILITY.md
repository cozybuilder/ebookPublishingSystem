# PNG Export 검토 (Feasibility v1)

Canvas HTML(`canvas.detail/square/story.html`)을 실제 PNG 이미지로 변환하는 경로를 검토한다.
**이 문서는 설계 검토다 — 이번 단계에서 변환을 구현하거나 의존성을 추가하지 않는다.**

관련: [출력 전략](07_OUTPUT_PROFILES.md) · [디자인 시스템](08_DESIGN_SYSTEM.md)

---

## 0. 전제 / 환경 확인 (실측)

- 런타임: Node v24.16, npm 11 (의존성 0, `.ts` 직접 실행 컨벤션).
- 캔버스 규격: detail = 860×가변, square = 1080×1080, story = 1080×1920 (px 고정).
- 캔버스 특성: 한글 폰트(Pretendard fallback), CSS 그라데이션, box-shadow, 라운드, ✓/★ 글리프.
- **개발 환경에 시스템 브라우저 설치 확인됨**:
  - Chrome: `C:\Program Files\Google\Chrome\Application\chrome.exe` ✅
  - Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` ✅
- → 헤드리스 캡처에 필요한 Chromium 엔진이 **이미 시스템에 존재**(추가 다운로드 불필요).

---

## 1. 옵션별 검토

### A. 시스템 브라우저 Headless CLI (Chrome/Edge `--headless --screenshot`)  ★ 1순위

설치된 Chrome/Edge를 headless로 호출해 HTML→PNG 캡처.

```text
chrome --headless --screenshot=out.png --window-size=1080,1080 --force-device-scale-factor=1 file:///.../canvas.square.html
```

- **설치 비용**: 0 (시스템 브라우저 재사용, npm 의존성 없음).
- **구현 난이도**: 하 — Node `child_process`로 exe 호출(내장 모듈). 빌드 컨벤션 유지.
- **결과 품질**: 상 — 실제 Chromium 렌더 = 브라우저 미리보기와 동일. 한글/이모지/그라데이션/
  box-shadow 모두 정확.
- **크기 정확도**: 상 — `--window-size` + `--force-device-scale-factor=1`로 1080×1080 정확 캡처.
  (세로 가변 detail은 전체 페이지 캡처 옵션 또는 높이 측정 필요 — 아래 5 참고)
- **Windows 적합성**: 상 — Chrome/Edge 모두 설치 확인. exe 경로만 탐지하면 됨.
- **CI 가능성**: 중 — 로컬은 즉시 가능. CI는 러너에 Chrome 설치 필요(GitHub Actions는
  ubuntu/windows 이미지에 Chrome 기본 포함 → 가능).
- **단점**: exe 경로 탐지/플랫폼 분기 필요. headless 스크린샷의 "전체 페이지 높이" 처리는
  버전별 차이 있음(신형 `--headless=new` 권장).

### B. Playwright

- **설치 비용**: 중~상 — `@playwright/test` + 브라우저 바이너리 다운로드(수백 MB).
- **구현 난이도**: 하 — `page.screenshot({ clip })` API 명확, 크기 제어 쉬움.
- **결과 품질**: 상 — Chromium 동일 품질.
- **크기 정확도**: 상 — viewport/clip/deviceScaleFactor 정밀 제어.
- **Windows/CI**: 상 — 크로스플랫폼, CI 친화(공식 액션 존재).
- **단점**: **의존성 0 원칙 위배**(npm 패키지 + 바이너리). 저장소/설치 용량 큼.
  현 단계 정책(외부 라이브러리 금지)과 충돌.

### C. Puppeteer

- **설치 비용**: 중~상 — `puppeteer`가 Chromium 동봉(~150–300MB), 또는 `puppeteer-core`로
  시스템 브라우저 재사용 가능.
- **구현 난이도**: 하 — `page.screenshot` API.
- **결과 품질/크기 정확도**: 상 (Chromium).
- **Playwright 대비**: API 유사, Playwright가 멀티브라우저/CI 도구가 더 풍부. 단일 Chromium
  캡처 목적이면 차이 작음.
- **단점**: A와 비교 시 npm 의존성 추가가 유일한 차별점(품질 동일). `puppeteer-core`라도
  패키지 의존이 생김.

### D. SVG `<foreignObject>` 방식

HTML을 SVG foreignObject로 감싸 이미지화(`<svg><foreignObject>…HTML…</foreignObject></svg>`).

- **설치 비용**: 0 (이론상).
- **구현 난이도**: 중 — 직렬화는 쉬우나, SVG→PNG 래스터화에 결국 브라우저/캔버스가 필요.
- **결과 품질**: **하~중(불안정)** — 외부 CSS/웹폰트 인라인 필요, box-shadow/일부 CSS 미지원,
  한글 폰트 임베드 까다로움, 보안 제약(taint)으로 toDataURL 실패 사례.
- **결론**: 캔버스의 그라데이션/그림자/한글 의존도가 높아 **비추천**(렌더 충실도 위험).

### E. 수동 캡처 유지 (현행)

브라우저로 canvas HTML을 열고 캔버스 영역을 캡처(현재 운영 방식).

- **설치 비용/난이도**: 0.
- **품질**: 상(실제 브라우저). 단 **수동** → 자동화 출판 엔진 목표와 배치, 규격 오차 가능.
- **결론**: v1 잠정 허용 가능하나, 시스템 브라우저 headless(A)로 곧 자동화 권장.

---

## 2. 비교 요약

| 옵션 | 설치 비용 | 난이도 | 품질 | 크기 정확 | 한글/그라데/그림자 | 의존성 0 | CI | 종합 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. 시스템 Chrome/Edge headless | 0 | 하 | 상 | 상 | 상 | ✅ 유지 | 중~상 | ★ 추천 |
| B. Playwright | 상 | 하 | 상 | 상 | 상 | ❌ 위배 | 상 | 보류 |
| C. Puppeteer(core) | 중 | 하 | 상 | 상 | 상 | ❌ 위배 | 상 | 보류 |
| D. SVG foreignObject | 0 | 중 | 하 | 중 | 불안정 | ✅ | - | 비추천 |
| E. 수동 캡처 | 0 | 0 | 상 | 중(수동) | 상 | ✅ | ✗ | v1 잠정 |

---

## 3. 결론

- **추천 1순위**: **A. 시스템 브라우저(Chrome/Edge) Headless CLI 캡처.**
  - 의존성 0 원칙 유지, 시스템에 브라우저 이미 설치됨, Chromium 품질로 한글/그라데/그림자
    안정, 규격 정확. 빌드 컨벤션(Node `.ts` + 내장 `child_process`)과 자연스럽게 맞음.
- **보류**: B/C(Playwright/Puppeteer) — 품질은 동일하나 외부 의존성·바이너리 용량으로 현
  정책과 충돌. 멀티브라우저/대규모 CI가 필요해지면 재검토.
- **비추천**: D(SVG foreignObject) — 렌더 충실도(그림자/한글/그라데) 위험.
- **v1 잠정**: E(수동 캡처)는 자동화 도입 전까지만.

---

## 4. v1 구현 제안 (다음 단계, 승인 시)

- 새 스크립트 `src/export-png.ts` + `npm run export:png` (의존성 0, 내장 모듈만):
  1. Chrome/Edge exe 경로 탐지(설치 후보 경로 순회 → 첫 발견 사용, 환경변수 override 허용).
  2. `child_process.execFile`로 headless 호출:
     `--headless=new --hide-scrollbars --force-device-scale-factor=1 --window-size=W,H
      --screenshot=output/canvas.<name>.png file:///<abs>/output/canvas.<name>.html`
  3. square=1080×1080, story=1080×1920 고정. detail(가변)은 `--screenshot` 전체 페이지 또는
     높이 측정 후 지정(별도 처리).
  4. 산출물은 `output/`에 PNG, 테스트는 기존대로 `tmp/test-output/`만 사용(격리 유지).
- 캔버스 wrapper의 고정 px 규격(이미 적용됨) 덕분에 clip/scale 1:1 변환이 단순.

### 설치 전 확인사항 (의존성을 쓰게 될 경우에만)
- 외부 라이브러리(B/C) 도입은 "외부 라이브러리 설치 금지" 정책 해제가 선행 조건 → PM 승인 필요.
- A 방식은 설치 불필요하나, exe 경로가 다른 PC/CI에서 다를 수 있어 탐지 로직 + 환경변수
  (`CHROME_PATH` 등) override 를 둘 것.
- headless 신/구 모드 차이: `--headless=new` 권장(렌더 일관성).

---

## 5. 향후 PDF 변환과의 연결

- 동일 헤드리스 브라우저로 `--print-to-pdf` 사용 가능 → **PNG와 PDF가 같은 캡처 엔진 재사용**.
  - 크몽 미리보기 PDF / 본편 PDF는 book.*.html 을 `--print-to-pdf`로 변환하는 경로로 확장.
- 즉 A(시스템 브라우저) 채택은 PNG뿐 아니라 추후 PDF까지 단일 도구로 커버 → 재사용성 최상.
- 정확한 페이지 규격(px/mm)·페이지 넘김은 PDF 단계에서 `@page` CSS + print 미디어로 별도 설계.

---

## 6. 자동화 출판 엔진 적합성

- A 방식: CLI 1회 호출로 HTML→PNG 일괄 변환 → `build:html`/`build:canvas` 다음 단계로 자연 연결.
- 입력(book.md) → 산출(HTML) → 캡처(PNG/PDF) 전 과정 무인 자동화 가능.
- 의존성 0 유지로 환경 구성 비용 최소 → "지속 생산 시스템" 목표에 부합.

---

본 검토는 v1 기준이며, 실제 export 구현은 별도 단계(승인 후)에서 진행한다.
