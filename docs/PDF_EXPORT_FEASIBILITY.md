# PDF Export 검토 (Feasibility v1)

`book.*.html` / `book.preview.html` 을 시스템 Chrome/Edge headless 로 PDF 변환할 수 있는지 검토한다.
**이 문서는 설계 검토다 — 이번 단계에서 PDF 를 구현하거나 의존성을 추가하지 않는다.**

관련: [PNG Export 검토](PNG_EXPORT_FEASIBILITY.md) · [출력 전략](07_OUTPUT_PROFILES.md) · [디자인 시스템](08_DESIGN_SYSTEM.md)

---

## 0. 전제 / 재사용 자산

- PNG export(v1/v2)에서 **시스템 브라우저 탐지·headless 호출 구조가 이미 검증됨**:
  - `src/export/browser.ts` (Chrome/Edge 탐지, CHROME_PATH override)
  - `src/export-png.ts` (execFile headless 호출, 임시 user-data-dir)
  - `src/export/args.ts` (--prefix 파싱), `src/export/png-size.ts` (헤더 파싱)
- → PDF 는 같은 브라우저로 `--print-to-pdf` 만 추가하면 되는 **저비용 확장**.
- 환경: Chrome `C:\Program Files\Google\Chrome\Application\chrome.exe`, Edge 설치 확인됨(PNG에서).

---

## 1. 시스템 Chrome/Edge `--print-to-pdf` 검토  ★ 추천

```text
chrome --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf=out.pdf file:///.../book.modern.html
```

- **장점**
  - 외부 라이브러리 0 (PNG 와 동일 엔진 재사용 → 도구 단일화).
  - Chromium 렌더 = 브라우저 미리보기 동일 품질(한글/그라데이션/box-shadow 재현 양호).
  - 한글 폰트: 시스템 폰트(Pretendard 설치 시) 사용. print 시에도 동일.
- **A4/Letter/page size**
  - CLI 직접 지정 옵션은 제한적. **권장: HTML 측 `@page { size: A4; margin: ... }` CSS** 로 제어.
  - 또는 DevTools Protocol(Page.printToPDF)로 paperWidth/Height 지정 가능하나 무라이브러리로는 복잡.
  - v1 은 `@page` CSS 로 A4 지정 권장(가장 단순·안정).
- **배경 그래픽 출력**
  - print 기본은 배경 미출력. **`-webkit-print-color-adjust: exact; print-color-adjust: exact;`** 필요.
  - 또는 Chrome `--print-to-pdf` 는 기본적으로 배경을 포함하는 편이나, CSS 로 명시 권장.
  - 현재 테마는 배경 틴트/그라데이션/카드 색 사용 → 이 설정 없으면 흰 배경으로 빠질 수 있음.
- **page break 안정성**
  - 헤더/이미지 슬롯/카드가 페이지 경계에서 잘릴 수 있음 → `page-break-inside: avoid`(또는
    `break-inside: avoid`) 보정 필요. 특히 카드/표/ChapterHeading.
- **헤더/푸터**: `--no-pdf-header-footer`(신형) 또는 `--print-to-pdf-no-header`(구형)로 날짜/URL 제거.
- **단점/주의**
  - CLI 의 용지/여백 정밀 제어가 약함 → CSS 의존. headless 신/구 옵션명 차이(no-pdf-header-footer).
  - virtual-time-budget 없이 폰트/이미지 로드 전 캡처 위험 → 필요 시 `--virtual-time-budget` 부여.

---

## 2. 현재 HTML 구조의 PDF 적합성

현 HTML 은 화면(브라우저 미리보기) 기준 — 각 페이지를 `.page` 섹션으로 쌓는 흐름형. 인쇄용 페이지 분할은 미설계.

| 파일 | 테마/구성 | PDF 적합성(현 상태) | 비고 |
| --- | --- | --- | --- |
| book.html / book.modern.html | Modern Glass, 전체 | 양호(여백·면 중심) | print 보정 후 안정적 예상 |
| book.editorial.html | Editorial, 읽기형 | 양호 | 본문 흐름형이라 page break 자연스러움 |
| book.preview.html | 미리보기 단일 ContentPage | **가장 적합** | 분량 적음 → break 이슈 최소 |
| book.dashboard.html | Dashboard, 정보 밀도 | 중 | 카드/표 많음 → break-inside 보정 필요 |
| book.bento.html | Bento, 2열 그리드 | **주의** | grid 2열은 인쇄 페이지 분할과 충돌 가능 → 후순위 |

- `.page` 섹션은 화면용 카드(그림자/라운드/큰 여백). 인쇄에선 `@page` 와 정렬 필요.
- Bento 의 `display:grid` 2열은 페이지 경계에서 행 분할 이슈 가능 → v1 제외 권장.

---

## 3. 필요한 CSS 보정 (print 전용, 테마 비파괴)

> 보정은 **print 미디어 한정**(`@media print`)으로 추가해 화면(book.*.html) 표현을 바꾸지 않는 방향 권장.
> 단, "Modern/Bento/... 표현 수정 금지" 원칙상, 별도 print 스타일 주입(임시 HTML) 또는 렌더러
> print 블록 추가 여부는 구현 단계에서 PM 승인 후 결정.

- `@page { size: A4; margin: 16mm; }` — 용지/여백.
- `@media print { html, body { background: #fff; } }` — 회색 배경 제거(지면 낭비 방지).
- `* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }` — 배경/카드 색 출력.
- `.page { box-shadow: none; border: none; margin: 0; border-radius: 0; }` — 화면용 카드 장식 제거.
- `.card, table, [data-type="ChapterHeading"], .image-slot { break-inside: avoid; }` — 분리 방지.
- `.page { break-after: page; }`(선택) — 논리 페이지마다 새 지면.
- (Bento) `@media print { .grid-bento { grid-template-columns: 1fr; } }` — 인쇄 시 단일 컬럼화(후순위).

---

## 4. PDF v1 구현 범위 제안

- **1순위**: `book.preview.html → output/book.preview.pdf` (분량 적음, break 리스크 최소).
- **2순위**: `book.modern.html → output/book.modern.pdf` (대표 본편 테마).
- **후순위**: Editorial(읽기형, 비교적 안전) → Dashboard → Bento(grid, print 보정 필요).
- 공통: print CSS 보정 적용 후 단계적 확대.

### CLI 옵션 후보 (요청 5)
```text
--headless=new --disable-gpu --no-pdf-header-footer
--print-to-pdf=output/<name>.pdf
[--virtual-time-budget=3000]  (폰트/레이아웃 안정화 필요 시)
file:///<abs>/output/<name>.html
```

---

## 5. PNG export 와 공유 가능한 코드

- `findBrowser()` / `browserNotFoundMessage()` — 그대로 재사용.
- 임시 user-data-dir 생성·정리 패턴 — 재사용.
- `--prefix` 류 인자 파싱(args.ts) — 출력 세트 확장에 재사용 가능.
- 신규 필요: `src/export/pdf-size.ts`(또는 헤더 검증), `src/export-pdf.ts`(진입점), npm `export:pdf`.
- 즉 PDF 는 export 레이어에 **export-pdf.ts 추가 + print CSS 주입**만으로 구현 가능(엔진 공유).

---

## 6. 산출물 정책 (요청 6)

- `output/*.pdf` 는 **재생성 가능 바이너리 → gitignore 권장**(PNG 와 동일 정책: `output/*.png` 이미 무시).
- HTML canonical(book.*.html)은 **추적 유지**(현행).
- 구현 시 `.gitignore` 에 `output/*.pdf` 추가.

---

## 7. 테스트 전략 (요청 7)

- PDF 실제 변환은 **환경 의존 → npm test 강제 포함하지 않음**(PNG 와 동일 방침).
- 순수 함수 테스트 가능 영역:
  - 출력 파일명 매핑(`book.modern.html → book.modern.pdf`)
  - `--prefix`/대상 선택 파싱
  - **PDF 헤더 검사**: 파일 선두 `%PDF-` 시그니처 확인(무라이브러리, 간단).
- → export-pdf 도입 시 `test:export` 에 순수 함수 + `%PDF` 검사 헬퍼 추가.

---

## 8. 리스크

- print 배경/색 출력 누락(print-color-adjust 미설정 시 흰 배경) → CSS 보정 필수.
- page break 로 카드/표/헤더 잘림 → break-inside 보정 필요.
- Bento grid 인쇄 깨짐 → v1 제외.
- 용지 규격 정밀 제어가 CLI 만으로 약함 → `@page` CSS 의존.
- "테마 표현 수정 금지" 와 print CSS 추가의 경계 → print 한정 스타일로 화면 무영향 설계 + PM 승인.

---

## 9. 추천 / 결론

- **추천 방식**: 시스템 Chrome/Edge `--print-to-pdf` (PNG 와 동일 엔진 재사용, 의존성 0).
- **v1 대상**: book.preview.html → PDF (1순위), book.modern.html → PDF (2순위).
- **필요 CSS 보정**: @page(A4/margin), print 배경 출력, .page 장식 제거, break-inside:avoid.
- **구현 단계**:
  1. print CSS 주입 방식 결정(임시 HTML 합성 vs 렌더러 print 블록) — PM 승인.
  2. `src/export-pdf.ts` + `npm run export:pdf`(browser.ts 재사용, --print-to-pdf).
  3. preview → modern 순으로 검증, %PDF 헤더 + 파일 크기 확인.
  4. Editorial → Dashboard → Bento 순 확대(Bento 는 단일 컬럼 print 보정).
- **PNG 와 공유**: 브라우저 탐지/임시 디렉터리/인자 파싱 재사용 → 신규는 export-pdf + print CSS.

---

## 10. PDF / DOCX 분리 이유

- **PDF**: 고정 레이아웃(fixed). 브라우저 print 엔진으로 화면 충실 재현 → 현 HTML/테마 자산 직접 재사용.
- **DOCX**: 흐름형(flow) 편집 문서. 워드 스타일·문단 모델이 달라 HTML→DOCX 는 별도 매핑/도구 필요
  (브라우저 print 로 불가). 자산 재사용성이 낮고 구현 경로가 완전히 다름.
- → PDF 는 현 파이프라인의 자연스러운 확장(이번 검토 대상), DOCX 는 별도 트랙으로 분리(후속 단계).

---

본 검토는 v1 기준이며, 실제 PDF export 구현은 별도 단계(승인 후)에서 진행한다.
