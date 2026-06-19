# Ebook Publishing System

## 프로젝트 목적

Markdown 원고를 입력하면 PDF, DOCX, 체크리스트, 인포그래픽, 표, Before/After,
판권 페이지, 크몽용 미리보기, 상세페이지 이미지까지 자동 생성하는 **전자책 출판 시스템**을 구축한다.

목표는 전자책 한 권 제작이 아니라, 전자책을 지속적으로 생산할 수 있는 시스템 구축이다.

## 기본 경로

- 기본 입력 파일 : `input/book.md`
- 기본 출력 폴더 : `output`

## 현재 상태

- **v0.1** — 초기 구조 세팅 단계

## 실행 규칙

빌드 도구 없이 Node 24의 TypeScript 타입 스트리핑으로 `.ts`를 직접 실행한다(의존성 0).

### 운영 흐름
- 개발 검증: `npm test`
- HTML만: `npm run build:html`
- 캔버스+PNG: `npm run build:assets`
- PDF만: `npm run export:pdf`
- **최종 릴리스: `npm run build:release`** — 단일 오케스트레이터(`src/release.ts`)
  - 4단계 순서 실행: `[1/4] Build HTML → [2/4] Build Canvas → [3/4] Export PNG → [4/4] Export PDF`
  - 단계 실패 시 어느 단계인지 출력 후 즉시 종료(exit 1).
  - 성공 시 산출물 **품질 검증**(존재 + 최소 size + HTML 마커 + PNG 규격(1080² / 1080×1920 /
    detail 860×≥1200) + PDF %PDF 헤더·최소 size) 후 요약 출력. 깨진/빈/규격 오류 산출물은 exit 1.
  - sparse 자산(fallback 검증 fixture)은 릴리스에 미포함. 필요 시 `npm run build:release:sparse` 별도 실행.
  - 기존 체인 방식은 `npm run build:release:legacy` 로 보존.

### 릴리스 산출물 (`npm run build:release`)
- HTML: `book.html` · `book.modern.html` · `book.bento.html` · `book.editorial.html` ·
  `book.dashboard.html` · `book.preview.html` · `canvas.detail.html` · `canvas.square.html` · `canvas.story.html`
  (+ `book.checklist.html`)
- PNG: `canvas.detail.png` · `canvas.square.png` · `canvas.story.png` (git 비추적)
- PDF: `book.preview.pdf` · `book.modern.pdf` · `book.editorial.pdf` · `book.dashboard.pdf` · `book.bento.pdf` (git 비추적)

### 산출물 생성 (실제 `output/`)
- `npm run build:html` — 책 HTML 5종 + 미리보기(`book.preview.html`)
- `npm run build:canvas` — 캔버스 detail/square/story
- `npm run build:canvas:sparse` — 폴백 검증용 sparse 캔버스
- **`npm run build:assets`** — 캔버스 HTML 생성 + PNG export 일괄(= build:canvas → export:png)
- **`npm run build:assets:sparse`** — sparse 캔버스 + PNG 일괄(= build:canvas:sparse → export:png:sparse)
- `npm run export:png:sparse` — `output/canvas.sparse.*.png` (= `export-png --prefix sparse`)
- `npm run build:canvas:chapters` — 챕터별 상세 캔버스 HTML(`canvas.chapter1.detail.html` …, ordinal 기준)
- `npm run export:png:chapters` — 챕터 상세 PNG(`canvas.chapter1.detail.png` …, detail auto-height)
- `npm run export:png:preview` — `book.preview.html → output/book.preview.png`
  (시스템 Chrome/Edge, width 860, detail auto-height) — 크몽 상세페이지 삽입용 이미지
  - PDF preview(다운로드/미리보기 파일)와 역할 구분: PNG 는 상세페이지에 붙이는 이미지
  - 별도 선택 산출물 — `build:release`/CI 게이트 미포함, git 비추적(`output/*.png`)
- `npm run build:chapter-assets` — 위 둘 일괄
  - 챕터별 상세 이미지는 **별도 선택 산출물** — `build:release` 기본에는 미포함, CI 게이트에도 미포함.
  - 챕터 HTML/PNG 는 git 비추적(`output/canvas.chapter*.html` / `*.png`)
- `npm run export:png` — 캔버스 HTML → PNG (시스템 Chrome/Edge headless, 의존성 0)
  - 사전: `npm run build:canvas` 로 HTML 생성
  - 산출: `output/canvas.detail.png` / `canvas.square.png`(1080×1080) / `canvas.story.png`(1080×1920)
  - 브라우저 탐지: `CHROME_PATH` 환경변수 우선 → Windows 기본 Chrome → Edge
    - override 예: `set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe`
  - detail 은 콘텐츠 높이를 headless 로 측정(2-pass: scrollHeight → `<title>` → 재캡처)해
    자동 높이로 캡처(+40px 여유, 범위 1200–12000px clamp). 측정 실패 시 fallback 2600px + 경고.
  - PNG 는 재생성 가능한 산출물이라 git 추적 제외(`output/*.png`)
- `npm run export:pdf` — book HTML → PDF (시스템 Chrome/Edge `--print-to-pdf`, 의존성 0)
  - 사전: `npm run build:html`
  - 대상 5종: `book.preview.pdf` · `book.modern.pdf` · `book.editorial.pdf` · `book.dashboard.pdf` · `book.bento.pdf`
    (Bento 는 화면은 2열 유지, PDF 는 print 한정 단일컬럼 보정으로 출력)
  - print CSS(@page A4 / 배경·색 출력 / break-inside)는 임시 HTML 에만 주입,
    원본 `book.*.html` 은 변경하지 않음
  - PDF 는 재생성 가능 산출물이라 git 추적 제외(`output/*.pdf`)
- 그 외: `build:pages` / `build:components` / `build:layout`, `parse`

### 테스트
- **개발 중**: 필요한 개별 테스트만 (`npm run test:parser` 등)
- **커밋 전**: `npm test` (= `npm run test:all`) — 전체 일괄 실행
  - 순서: parser → pages → components → layout → html → theme → canvas →
    selector → book-selector → isolation (격리 검증은 항상 마지막)
  - 하나라도 실패하면 전체 실패.
- **출력 격리**: 테스트는 `tmp/test-output/`에만 기록하며 실제 `output/`은 건드리지 않는다.
  (`npm run test:isolation`이 해시로 보증, `npm run clean:test-output`으로 정리)

## CI (GitHub Actions)

- `.github/workflows/ci.yml` — push / pull_request 시 자동 실행(러너: `windows-latest`, Node 24).
- 단계: checkout → setup-node → `npm install` → `npm test` → `npm run build:release`.
- `build:release` 는 브라우저 기반 PNG/PDF 생성 + 산출물 품질 검증까지 수행하는 **릴리스 게이트**.
- 브라우저: windows-latest 에 Chrome/Edge 기본 설치 → 표준 경로 자동 탐지로 동작.
  - 탐지 실패 시 워크플로 `Build release` 스텝에 `env: CHROME_PATH: <경로>` 를 지정(주석 참고).
- 산출물(`output/*.png` / `output/*.pdf`)은 gitignore — v1 은 게이트 목적이라 artifact 업로드 안 함.

## 최상위 기준 문서

- `docs/00_PROJECT_CONSTITUTION.md`
