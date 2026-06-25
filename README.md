# Ebook Publishing System

## 빠른 시작 (5분)

1. **원고 작성** — `input/book.md` 에 Markdown 원고를 씁니다. (예제 원고가 이미 들어 있습니다)
2. **이미지 넣기** — `assets/images/<슬롯id>.png` (선택 — 없으면 자리표시자로 처리)
3. **표지 이미지** — `assets/images/cover.png`(또는 `.jpg`) 를 넣으면 PDF/EPUB 표지가 그 이미지로 채워집니다. (선택 — 없으면 텍스트 표지)
4. **빌드** — `npm run build`

끝. → `output/book.pdf` · `output/book.docx` · `output/book.epub`

> 지금 바로 `npm run build` 를 실행하면, 들어 있는 예제 원고로 결과물이 생성됩니다.
> 작성 문법은 예제 `input/book.md` 가 그대로 설명서 역할을 합니다.

## 데스크톱 앱 (GUI)

터미널 없이 버튼으로 쓰고 싶다면:

1. 최초 1회 설치 : `npm install`
2. 실행 : `npm run gui`
3. 화면의 **8단계 Wizard** 를 차례대로 따라간다:
   ① AI로 원고 만들기(AI 원고 작성 프롬프트 복사) → ② 프로젝트 선택/만들기 → ③ 미리보기 생성 → ④ 이미지 만들기(프롬프트 복사)
   → ⑤ 이미지 넣기 → ⑥ 최종 확인 → ⑦ 전자책 만들기 → ⑧ 결과 열기

> **프로젝트별 작업공간**: 책마다 `projects/<이름>/{book.md, images/, output/}` 로 분리되어, 이전 책의 이미지·결과물이 다음 책에 섞이지 않는다(하나의 책 = 하나의 프로젝트). 첫 실행 시 기존 작업은 자동으로 프로젝트로 흡수된다.

> GUI 는 엔진을 재구현하지 않고 빌드 흐름을 실행만 한다(Electron, 데스크톱 환경 필요).
> 원고/이미지를 고르지 않으면 기본값(`input/book.md`, `assets/images/`)을 사용한다.
> **③ 미리보기**는 원고만으로 HTML 을 만들어 구조를 먼저 확인한다(이미지 없으면 자리표시자).
> **④ 이미지 만들기**는 원고의 이미지 블록을 분석해 파일명·권장 크기·생성 프롬프트를 보여주고 복사하게 한다.
> **점검**은 원고가 올바른지, 표지(`cover.png`)·본문 이미지가 준비됐는지 확인한다(CLI: `npm run preflight`).
> **⑦ 전자책 만들기**는 `build:all`(PDF·출판용 PDF·DOCX·EPUB·HTML + 크몽 자료)을 실행하고 산출물 생성 여부를 검증한다.

> 결과물은 `output/` 에 보관된다. (개발용 `npm test` 를 실행하면 비워지니, 배포 파일은 빌드 후 화면에서 바로 확인·복사한다.)

## 제품 목적·방향

Markdown 원고 + 이미지를 입력하면 상품 수준의 전자책(PDF/DOCX/EPUB)으로 **조립·완성**하는 시스템.

- **기본 = Upload Mode** : 사용자가 원고/이미지를 직접 준비. **운영비 0원, API 의존성 없음.**
- **선택 = API Auto Mode** : (추후 Premium) 사용자 API Key 입력 시에만 자동 생성.
- 기준 문서: [GLOBAL_CONSTITUTION.md](GLOBAL_CONSTITUTION.md) · [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md)

## 출력 구조

```text
input/
  book.md            ← 원고 (사용자 준비)
assets/
  images/
    IMG-001.png      ← 이미지 (사용자 준비, 슬롯 id 기준)
output/
  book.pdf           ← 대표 PDF (= modern 테마 복사본, 최종본)
  book.docx          ← 편집용 Word
  book.epub          ← 전자책(EPUB 3)
  kmong-preview.pdf  ← 크몽 판매용 미리보기 PDF (구매자 샘플)
  detail-images/     ← 크몽 상세페이지용 이미지 묶음 (대표/홍보/챕터별 PNG)
  book.modern.pdf    ← PDF (테마 4종: modern/editorial/dashboard/bento)
  book.editorial.pdf
  book.dashboard.pdf
  book.bento.pdf
  book.preview.pdf   ← 미리보기 PDF 원본
  book.html …        ← HTML 미리보기(테마별)
  missing-images.txt ← 누락 이미지 슬롯 안내 (있을 때)
```

> **크몽 판매 자료** : `npm run build` 한 번에 전자책(book.pdf/docx/epub) + 판매 자료(kmong-preview.pdf, detail-images/)까지 자동 준비된다.

> **대표 PDF** : `book.pdf` 가 최종본이다(= modern 테마 복사본). editorial/dashboard/bento 는 선택 테마로 그대로 유지.
> **누락 이미지** : 빌드 시 `assets/images/` 에 없는 이미지 슬롯을 콘솔 + `output/missing-images.txt` 로 안내한다. 누락이 있어도 빌드는 실패하지 않고 플레이스홀더로 진행된다.

## 명령

- **빌드(전체 출력)** : `npm run build`  (= `npm run build:release`)
- 파싱만(AST 확인) : `npm run parse`
- 테스트 : `npm test`

> API Key 없이 모든 빌드·테스트가 정상 동작한다(기본 Upload Mode는 API 무의존).

## 현재 상태

- **v0.1** — Upload Mode 제품 플로우 정비 단계

## 실행 규칙

빌드 도구 없이 Node 24의 TypeScript 타입 스트리핑으로 `.ts`를 직접 실행한다(의존성 0).

### 운영 흐름
- 개발 검증: `npm test`
- HTML만: `npm run build:html`
- 캔버스+PNG: `npm run build:assets`
- PDF만: `npm run export:pdf`
- **최종 릴리스: `npm run build:release`** — 단일 오케스트레이터(`src/release.ts`)
  - 6단계 순서 실행: `[1/6] Build HTML → [2/6] Build Canvas → [3/6] Export PNG → [4/6] Export PDF → [5/6] Export DOCX → [6/6] Export EPUB`
  - 단계 실패 시 어느 단계인지 출력 후 즉시 종료(exit 1).
  - 성공 시 산출물 **품질 검증**(존재 + 최소 size + HTML 마커 + PNG 규격(1080² / 1080×1920 /
    detail 860×≥1200) + PDF %PDF 헤더·최소 size + DOCX PK(ZIP) 시그니처·최소 size +
    EPUB OCF 구조(PK·mimetype 첫 entry·STORE·`application/epub+zip`·필수 entry 존재)) 후 요약 출력.
    깨진/빈/규격 오류 산출물은 exit 1.
  - sparse 자산(fallback 검증 fixture)은 릴리스에 미포함. 필요 시 `npm run build:release:sparse` 별도 실행.
  - 기존 체인 방식은 `npm run build:release:legacy` 로 보존.
- 마케팅 보조 이미지: `npm run build:marketing-assets` (챕터 상세 PNG + preview PNG)
- sparse 자산(`build:assets:sparse`)은 fallback **검증용 fixture** — 상품/마케팅 산출물 아님.

### 릴리스 산출물 (`npm run build:release`)
- HTML: `book.html` · `book.modern.html` · `book.bento.html` · `book.editorial.html` ·
  `book.dashboard.html` · `book.preview.html` · `canvas.detail.html` · `canvas.square.html` · `canvas.story.html`
  (+ `book.checklist.html`)
- PNG: `canvas.detail.png` · `canvas.square.png` · `canvas.story.png` (git 비추적)
- PDF: `book.preview.pdf` · `book.modern.pdf` · `book.editorial.pdf` · `book.dashboard.pdf` · `book.bento.pdf` (git 비추적)
- DOCX: `book.docx` (편집 가능한 흐름형 Word, git 비추적)
- EPUB: `book.epub` (전자책 리더용 EPUB 3, OCF/ZIP, git 비추적)

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
- `npm run build:chapter-assets` — 챕터 캔버스+PNG 일괄
- `npm run build:canvas:preview` + `npm run export:png:preview-promo` — preview 선별 컴포넌트 기반
  SNS 홍보 이미지: `book.preview.square.png`(1080×1080) · `book.preview.story.png`(1080×1920).
- **`npm run build:marketing-assets`** — 크몽 상세페이지/홍보용 보조 이미지 일괄
  (= build:html → 챕터 캔버스/PNG → preview PNG → preview promo 캔버스/PNG)
  - 산출: `canvas.chapter{N}.detail.png` (챕터별) + `book.preview.png`
    + `book.preview.square.png` + `book.preview.story.png`
  - PDF / sparse / release 기본 산출물은 미포함. CI 게이트에도 미포함.
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
  - 단일 대상만: `node src/export-pdf.ts --target book.preview.html` (대상은 위 HTML 중 하나)
- `npm run export:docx` — `output/book.docx` (편집 가능한 흐름형 Word, 직접 OpenXML, 의존성 0)
  - HTML/PDF 테마 복제가 아니라 워드 편집 구조 우선(제목/본문/인용/체크리스트/표/단계/주의/결과).
  - **이미지 자산 규약**: `ImageBlock` 의 `id` 로 이미지 파일을 찾아 실삽입(없으면 placeholder).
    탐색 우선순위: `assets/images/<id>.png` → `.jpg` → `.jpeg` → (호환) `assets/<id>.png` → `.jpg` → `.jpeg`.
    예: `assets/images/IMG-001.png`. 이 규약은 향후 PDF/HTML/EPUB/이미지 프롬프트 엔진이 공유.
- `npm run export:epub` — `output/book.epub` (전자책 리더용 EPUB 3, OCF/ZIP 직접 생성, 의존성 0)
  - 구조: `mimetype`(첫 entry·STORE) · `META-INF/container.xml` · `OEBPS/content.opf`(manifest/spine) ·
    `OEBPS/nav.xhtml`(목차) · `OEBPS/styles/book.css` · `OEBPS/text/front-matter.xhtml` ·
    `OEBPS/text/chapter-00N.xhtml`(챕터 단위 분할).
  - Front Matter(표지/판권/저자 소개/면책) 포함, 목차는 nav.xhtml 로 분리. reflowable·단순 CSS 우선.
  - 이미지: 위 이미지 자산 규약(resolveImageAsset)으로 발견 시 `OEBPS/images/` 포함(`<img>`), 없으면 placeholder 문단.
  - v1 범위: 기본 구조/리더 호환 우선. EPUBCheck 완전 통과는 후속, `build:release` 통합도 다음 단계.
- `npm run build:image-prompts` — 원고의 ImageBlock 을 모아 생성용 프롬프트 매니페스트 출력
  (`output/image-prompts.json` / `output/image-prompts.md`). **실제 AI 생성은 아님**(생성 전 목록).
  - 각 항목: id / type / prompt / recommendedPath(`assets/images/<id>.png`) / exists·missing /
    sourcePath / usageHint(cover·chapter·detail·promo·generic).
  - 자산 존재 여부는 위 이미지 자산 규약(resolveImageAsset)으로 판정 → 매니페스트가 "무엇을 만들어
    어디에 둘지"를 알려줌. 생성 후 assets/images/<id>.* 에 넣으면 DOCX 등에서 자동 실삽입.
  - git 비추적(`output/image-prompts.*`).
  - 별도 export 트랙 — git 비추적(`output/*.docx`).
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
  (`npm run test:isolation`이 해시로 보증)

### 정리(clean)
- `npm run clean:assets` — `output/` 의 재생성 산출물 삭제(*.png / *.pdf / canvas.chapter*.html /
  canvas.sparse.*). 추적 canonical HTML(book.* / canvas.detail·square·story.html)은 보존. output 밖 미접촉.
- `npm run clean:test-output` — `tmp/test-output/` 삭제.
- `npm run clean:all` — 위 둘 일괄.

## 다챕터 통합 샘플

- `samples/book-multichapter.md` — 3챕터 + 주요 컴포넌트(Quote/Result/Checklist/Steps/Compare/
  Table/Warning/Image) 전체를 담은 통합 검수용 원고. **실제 상품 원고 검수 전** 파이프라인
  (page scope / blockLimit / componentSelector / chapter detail / preview / canvas selector)을
  다챕터 조건에서 확인하는 용도.
- 자동 검증: `npm run test:multichapter` (in-memory, output/ 미접촉) — `npm test` 에 포함.
- 수동 챕터 이미지 빌드: `npm run build:sample:multi`
  (= `build-chapter-canvas --input samples/book-multichapter.md` → `output/canvas.chapter1~3.detail.html`).
  - input/book.md / canonical output 은 변경하지 않음. 챕터 HTML/PNG 는 git 비추적.

## CI (GitHub Actions)

- `.github/workflows/ci.yml` — push / pull_request 시 자동 실행(러너: `windows-latest`, Node 24).
- 단계: checkout → setup-node → `npm install` → `npm test` → `npm run build:release`.
- `build:release` 는 브라우저 기반 PNG/PDF 생성 + 산출물 품질 검증까지 수행하는 **릴리스 게이트**.
- 브라우저: windows-latest 에 Chrome/Edge 기본 설치 → 표준 경로 자동 탐지로 동작.
  - 탐지 실패 시 워크플로 `Build release` 스텝에 `env: CHROME_PATH: <경로>` 를 지정(주석 참고).
- 산출물(`output/*.png` / `output/*.pdf`)은 gitignore — v1 은 게이트 목적이라 artifact 업로드 안 함.

## Front Matter (자동 생성)

전자책 앞부분(표지·판권·목차·저자 소개·면책 조항)을 메타데이터로 자동 생성한다.

- `npm run build:front-matter` → `output/front-matter.json` / `output/front-matter.md`(매니페스트, git 비추적).
- 기본값(미지정 시):
  - title: book.md 첫 `#` 또는 `Untitled Ebook`
  - author: `CozyBuilder` (원고 author 우선) / publisher·brand: `CozyBuilder Lab` / year: 현재 연도
  - disclaimer / authorBio: 기본 문구
- **기본 출력에 포함(기본 ON)**: `book.html` 및 테마별 HTML(modern/bento/editorial/dashboard),
  이들로부터 만드는 PDF, 그리고 `book.docx` 는 앞에 표지→판권→목차→저자 소개→면책이 붙고 본문이 이어진다.
  (page-builder 자동 앞페이지를 Front Matter 산출로 대체 — 중복 없음.)
- **표지 이미지(선택)**: `assets/images/cover.png|jpg|jpeg`(또는 원고 메타 `cover: <id>` 로 다른 자산 id 지정)가 있으면
  표지 면을 그 이미지로 full-bleed 채운다(PDF는 A4 전면, EPUB은 `cover.xhtml` + `cover-image` 자산으로 리더 썸네일 연동, DOCX는 표지 그림). 없으면 기존 텍스트 표지(그라데이션) 유지 — 무회귀.
- **제외**: 캔버스/마케팅 이미지(canvas.*, preview promo), `book.preview.*`(요약 미리보기),
  `book.checklist.*`, Image Prompt 매니페스트 — 본문/요약 중심 유지.
- 목차(toc)는 EPUB 연계를 위해 구조로 보존. 향후 frontmatter YAML(`---` 메타블록) 도입 시
  resolveFrontMatterMeta override 로 확장 가능.

## 출시 전 검수

- **v1.0 릴리스(상품 업로드) 전에는 반드시 [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) 를 따라 검수한다.**
  자동 게이트(`npm test` + `npm run build:release`)로 깨진/빈/규격 오류를 막은 뒤, 체크리스트의
  원고·Front Matter·HTML·PDF·DOCX·EPUB·이미지·매니페스트·최종 업로드 항목을 육안으로 확인한다.

## 최상위 기준 문서

- `docs/00_PROJECT_CONSTITUTION.md`
