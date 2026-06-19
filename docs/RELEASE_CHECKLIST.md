# Release Checklist — Ebook Publishing System v1.0

전자책을 **상품으로 업로드하기 전** 따라야 하는 검수 절차다.
이 시스템은 디자인 품질의 최종 판단을 자동화하지 않는다 — 자동 검증(`build:release`)은
"깨진/빈/규격 오류"를 막는 게이트일 뿐이며, **상품성·디자인·문구는 사람이 육안 검수**한다.

> 사용법: 새 원고를 낼 때 이 문서를 복사해 체크박스를 채우며 진행한다.
> 자동 게이트(`npm test`, `npm run build:release`)를 먼저 통과시킨 뒤, 아래 육안 항목을 확인한다.

---

## 0. 사전 — 자동 게이트 (필수)

- [ ] `npm test` 통과 (전체 스위트 / EXIT=0)
- [ ] `npm run build:release` 통과 (6단계 + 산출물 검증, "✓ 릴리스 완료" / EXIT=0)
  - 단계: `[1/6] Build HTML → [2/6] Build Canvas → [3/6] Export PNG → [4/6] Export PDF → [5/6] Export DOCX → [6/6] Export EPUB`
- [ ] 검증 요약에 HTML/PNG/PDF/DOCX/EPUB 전 종류 "OK" 표시 확인

> 게이트 실패 시: 출력된 단계/사유를 보고 원인을 고친 뒤 재실행한다. 게이트가 통과하기 전에는
> 아래 육안 검수로 넘어가지 않는다.

---

## 1. 원고 입력 검수 (`input/book.md`)

- [ ] 제목(`#`), `subtitle:`, `author:` 메타가 의도대로 채워졌는가
- [ ] 챕터(`##`)가 등장 순서대로 빠짐없이 있는가
- [ ] 컨테이너 블록(`:::checklist` / `:::compare` / `:::steps` / `:::faq` / `:::warning` / `:::result` /
      `:::before-after` / `:::prompt` / `:::image`)의 여닫음(`:::`)이 정확한가
- [ ] 표(표준 Markdown `| … |`)와 인용(`>`)이 의도대로 변환되는가
- [ ] 이미지 슬롯(`:::image` → `id` / `type` / `prompt`)의 `id` 가 자산 규약과 일치하는가
- [ ] `npm run parse` → `output/book.ast.json` 으로 구조가 기대와 같은지 확인

## 2. Front Matter 검수

- [ ] 표지: 제목 / 부제 / 저자가 정확한가
- [ ] 판권(Copyright): 저자 · 발행처(CozyBuilder Lab) · 연도 · "All rights reserved" 문구
- [ ] 목차(TOC): 챕터 **순서·번호·제목**이 본문과 일치하는가
- [ ] 저자 소개(AuthorBio) 문구 확인
- [ ] 면책(Disclaimer) 문구 확인
- [ ] **Front Matter 중복 없음**: 표지/판권/목차가 본문에서 **한 번만** 나타나는가
      (page-builder 자동 앞페이지 ↔ Front Matter 시스템 중복 방지)
- [ ] Front Matter 가 HTML/PDF/DOCX/EPUB **본문 앞**에 위치하는가
- [ ] (선택) `npm run build:front-matter` → `output/front-matter.{json,md}` 매니페스트로 문구 재확인

## 3. HTML 검수 (`output/*.html`)

- [ ] `book.html`(기본 ModernGlass) 열림 / 레이아웃 정상
- [ ] `book.modern.html` / `book.bento.html` / `book.editorial.html` / `book.dashboard.html` 4테마 정상
- [ ] `book.preview.html`(크몽 미리보기, 선별 컴포넌트) 정상
- [ ] 표 / 체크리스트 / 인용(QuoteBlock) / 주의박스(WarningCard) / 결과박스(ResultCard) 렌더 정상
- [ ] 한글 폰트(Pretendard 스택) 깨짐 없음 · 이미지 슬롯 자리 정상

## 4. PDF 검수 (`output/*.pdf`)

- [ ] `book.modern.pdf` 열림 / 페이지 넘김·여백 정상
- [ ] `book.editorial.pdf` 열림 / 정상
- [ ] `book.dashboard.pdf` 열림 / 정상
- [ ] `book.bento.pdf` 열림 (print 단일컬럼 보정 적용 상태) / 정상
- [ ] `book.preview.pdf`(미리보기/다운로드용) 열림 / 정상
- [ ] 공통: 페이지 깨짐·잘림·빈 페이지 없음, 표/박스가 페이지 경계에서 깨지지 않는가

## 5. DOCX 검수 (`output/book.docx`)

- [ ] **MS Word 에서 열림** / 흐름형 편집 가능
- [ ] **한글(HWP) 에서 열림** 확인
- [ ] 제목/본문/인용/체크리스트/표/단계/주의/결과 스타일 정상
- [ ] 이미지: 자산이 있으면 실삽입, 없으면 placeholder 로 표시되는가
- [ ] Front Matter(표지/판권/목차/저자 소개/면책) 포함·순서 정상

## 6. EPUB 검수 (`output/book.epub`)

- [ ] **전자책 리더 앱에서 열림** (예: Apple Books / Google Play Books / Calibre 등)
- [ ] 목차(nav)에서 챕터로 이동 가능
- [ ] Front Matter(표지·판권·저자 소개·면책) 표시 정상
- [ ] 챕터 본문 / 표 / 체크리스트 / 인용 / 박스 렌더 정상 (reflowable)
- [ ] 이미지: 자산이 있으면 표시, 없으면 placeholder 문단
- [ ] (자동 게이트가 이미 확인) mimetype 첫 entry·STORE / container.xml / content.opf / nav.xhtml / CSS /
      front-matter.xhtml / chapter-001.xhtml 구조

## 7. PNG / 마케팅 이미지 검수

- [ ] `canvas.detail.png` (860×auto) — 크몽 상세페이지 삽입용, 잘림/여백 정상
- [ ] `canvas.square.png` (1080×1080) — SNS 정사각
- [ ] `canvas.story.png` (1080×1920) — 스토리 세로
- [ ] (선택) `npm run build:marketing-assets` 산출:
      `book.preview.png` / `book.preview.square.png` / `book.preview.story.png` / 챕터별 `canvas.chapter{N}.detail.png`
- [ ] 텍스트 가독성 / 브랜드 톤 / 핵심 메시지가 한눈에 들어오는가

## 8. Image Prompt Manifest 검수

- [ ] `npm run build:image-prompts` → `output/image-prompts.{json,md}` 생성
- [ ] **`missingCount` 확인** — 누락 이미지 수가 의도한 범위인가 (상품 필수 이미지는 0 목표)
- [ ] 누락 항목의 `recommendedPath`(`assets/images/<id>.png`)에 실제 자산을 넣었는가
- [ ] **`assets/images/<id>.png` 자산 누락 여부** 최종 확인 (필수 슬롯 전부 존재)
- [ ] 자산 추가 후 `export:docx` / `export:epub` 재실행 시 placeholder → 실삽입으로 바뀌는가

## 9. clean / release / test 명령 검수

- [ ] `npm run clean:assets` 가 재생성 산출물(*.png/*.pdf/*.docx/*.epub/sparse/chapter)만 지우고
      canonical HTML·`book.ast.json` 은 보존하는가
- [ ] `npm run clean:all`(assets + test-output) 후 `npm run build:release` 재생성이 정상인가
- [ ] `npm test` 재실행 통과
- [ ] CI(`.github/workflows/ci.yml`) 게이트: `npm test` + `npm run build:release` green

## 10. 실제 상품 업로드 전 최종 검수

- [ ] **최종 업로드 파일 목록** 확정:
  - 본편(다운로드): `book.modern.pdf` (또는 선택 테마) · `book.docx` · `book.epub`
  - 미리보기: `book.preview.pdf`
  - 상세페이지/마케팅 이미지: `canvas.detail.png` · `canvas.square.png` · `canvas.story.png`
    (+ 필요 시 `book.preview.png` / preview promo / 챕터 상세 PNG)
- [ ] 파일명·확장자·용량이 판매 채널(크몽 등) 업로드 규격에 맞는가
- [ ] 저작권/면책/브랜드 표기가 상품 설명과 일치하는가
- [ ] 가격/패키지 구성(본편 + 보너스 자산)과 실제 산출물이 일치하는가
- [ ] 최종본을 **다른 기기/뷰어**에서 한 번 더 열어 교차 확인했는가

---

### 산출물 위치 요약

| 종류 | 파일 | 비고 |
|---|---|---|
| HTML | `output/book.html` 외 4테마 + `book.preview.html` | 화면 확인용 |
| PDF | `output/book.{modern,editorial,dashboard,bento,preview}.pdf` | 본편/미리보기 |
| DOCX | `output/book.docx` | 편집 가능 Word |
| EPUB | `output/book.epub` | 전자책 리더 |
| PNG | `output/canvas.{detail,square,story}.png` | 상세/마케팅 |
| 매니페스트 | `output/image-prompts.{json,md}` · `output/front-matter.{json,md}` | 검수 보조 |

> `output/*.png|*.pdf|*.docx|*.epub` 및 일부 보조 HTML/매니페스트는 git 비추적(재생성 가능).
> 명령 상세는 [README](../README.md) 참조.
