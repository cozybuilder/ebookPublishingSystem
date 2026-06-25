# STATUS — 현재 상태 요약 (Phase 1/2 완료, 안정 버전)

> 새 채팅창에서 바로 개발을 재개하기 위한 핸드오프 요약.
> 권위 문서: [GLOBAL_CONSTITUTION.md](GLOBAL_CONSTITUTION.md) · [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md) · 이력 [DECISIONS.md](DECISIONS.md)

## 역할
- 코지(CEO) · 코비(PM) · 클로(개발). 보고는 하나의 ```text 블록.
- 운영 원칙: 사소한 작업은 자율 진행, 7개 중요 항목(기능 추가/제거·동작 변경·기준정보·데이터 손실·외부비용·보안·방향 선택)만 사전 확인.

## 제품
- **Ebook Publishing System** = Markdown 원고 + 이미지 업로드 → 조립/레이아웃 → PDF/HTML/DOCX/EPUB.
- 기본 Upload Mode(운영비 0, API 무의존). API Auto Mode는 보류(src/studio 보존).
- 엔진 런타임 외부 의존성 0(Node ≥22.6 타입 스트리핑, .ts 직접 실행).

## 완료된 기능 — 컴포넌트 30종 실매핑(가산적, 회귀 0)
Callout · Divider · Highlight(==) · Tag([[tag:]]) · Code · Timeline · Stats ·
Chart(Bar/Donut) · Result variant · Feature · Progress · Stepper · Timeline Card ·
Compare Card · Alert · Process · Rating · Tags · Chips · Tree · Pagination ·
Empty · Search · Tooltip · Popover · Modal · Drawer · Skeleton · File.
- 컴포넌트 쇼케이스 원고: sample-books/component-showcase.md (판매본 분리).

## 판매용 샘플 책(Season 2-2, 완료 · 이미지 입고)
- `input/book.md` = "왕초보를 위한 AI 영상 제작 입문" / 부제 "ChatGPT와 AI를 활용해 누구나 시작하는 영상 제작".
- 8장(Ch1~7 콘텐츠 + Ch8 마무리·요약·실전 체크리스트). 37 블록타입을 쇼케이스가 아니라 실제 책 맥락에 자연스럽게 녹임
  (UI성 컴포넌트는 "소프트웨어 화면에서 보게 될 모습" 프레이밍으로 자연화).
- 이미지 입고 완료: 표지 `cover.png`(full-bleed) + 본문 `IMG-001~004.png`(figure 실임베드). 누락 0.
- 본문 이미지(ImageBlock) HTML/PDF 실임베드 추가(Season 2-2b) → 5종(html/pdf/book-paged.pdf/docx/epub) 전부 이미지 표시.
  크몽 대표 이미지(detail-images/00-cover.png)=실제 표지, 챕터 상세=실제 사진. book-paged.pdf 25면.
- ⚠ 용량: 입고 PNG(1.5~2MB×5) 임베드로 book.pdf 13.8MB·docx/epub 8.5MB. 필요 시 이미지 최적화는 자산 측 결정.

## 출력 형식
- HTML / DOCX / EPUB / PDF 4종. 컴포넌트 전부 4출력 대응(인터랙션은 정적 변환).
- 테스트 53 스위트(컴포넌트별 + 파이프라인 + cover). `npm test` 전부 통과, API Key 없이 동작.

## 표지 이미지(Season 2-1, 완료 · Additive)
- `assets/images/cover.png|jpg|jpeg`(또는 원고 메타 `cover: <id>`) 있으면 표지를 그 이미지로 full-bleed.
  PDF=A4 전면(book.pdf=modern 및 book-paged.pdf), EPUB=cover.xhtml+cover-image 자산(리더 썸네일), DOCX=표지 그림.
  없으면 기존 텍스트 표지(그라데이션) 유지 — 무회귀. 신규 `src/assets/cover-resolver.ts`, `test/cover.test.ts`(28검증).
- 실제 표지 아트는 코비(PM) 생성 대기 — 슬롯만 준비됨.

## PDF 구조
- 두 갈래:
  1) **book.pdf = v6 (Blink, `--print-to-pdf`)** — 대표 산출물. 표지 full-bleed,
     앞부속 compact, 카드 절단 방지, 밀도 튜닝. 인쇄 CSS = src/export/pdf-helpers.ts(PRINT_CSS v6). 쪽번호/러닝헤드 없음.
  2) **book-paged.pdf = Paged.js(pagedjs-cli)** — 추가 산출물(18면). v6 품질 +
     쪽번호 + 러닝헤드(챕터명) + 목차 쪽번호. 경로 = src/build-paged.ts.
- 빌드: `npm run build`(v6 일체) · `npm run build:paged`(paged) · `npm run build:all`(둘 다).
  ⚠ `npm test` 는 output 격리로 산출물을 비움 → 배포물은 항상 마지막에 `build:all`.

## Paged.js 상태
- pagedjs-cli@^0.4.3 (devDependency). 전이 puppeteer@20.9 — Chromium 다운로드 생략,
  시스템 Chrome 재사용(src/export/browser.ts). npm audit high 6건(전이 의존, devDep 한정/배포 미포함).
- 표지는 paged 가 data-page="cover"로 치환하므로 `.pagedjs_cover_page`로 스타일.
- 미정: book-paged.pdf 대표 승격 여부, audit 정리 여부.

## 웹 SaaS 방향
- 현재는 로컬 CLI/Electron GUI(`npm run gui`, 엔진 재실행만). 웹 SaaS는 미착수(향후 방향).
- 엔진이 순수 함수형 파이프라인(parser→pages→component-mapper→layout→renderers)이라
  서버 래핑 용이. 단 PDF는 시스템 Chrome/puppeteer 의존(서버 환경 시 헤드리스 필요).
- 역할 경계(기준정보): 회원가입/로그인/결제/구독/권한은 홈페이지(cozybuilder.co.kr)가 담당.
  프로그램(엔진/GUI)은 **입력→조립→출력→다운로드**만. 초기 전 프로그램 무료.

## GUI / 사용성(Season 2-3, Wizard + 프로젝트 격리)
- **프로젝트별 작업공간**(섞임 방지): `projects/<이름>/{book.md, images/, output/, book.config.json}` — 하나의 책=하나의 프로젝트. `.gitignore` 에 `projects/`, `input/book.config.json`. 동기화 시 표준 이미지/설정 폴더를 비우고 그 프로젝트 것만 채움(누수 차단). **미리보기·최종 산출물 모두 프로젝트 output 에 보관**(미리보기=build:html→projects/<이름>/output/book.html). 새 프로젝트는 원고 없음으로 시작, 원고 불러오기 시 원본 파일명 표시. 첫 실행 시 기존 작업 손실 없이 흡수. 순수 FS=`gui/project-fs.cjs`.
- **책 기본정보 설정**: `book.config.json`(저자/발행자/저작권자/연도/저자소개/면책 등) — GUI STEP2 폼에서 편집. 판권/발행/저작권이 **사용자 값**을 따름(CozyBuilder 고정 아님). 엔진측 `src/front-matter/front-matter-config.ts`→FrontMatterOverrides(build-html/docx/epub). 미설정 시 기존 기본값(무회귀).
- **미리보기 가독성**: 화면 .ty-body line-height 1.85 + 문단 여백 확대 + 챕터 호흡(인쇄 밀도는 PRINT_CSS 별도). Theme 무변경.
- `gui/`(Electron). 엔진 무변경 — 빌드 흐름을 실행만. **9단계 Wizard**(제작 과정 안내형):
  ①AI로 원고 만들기(주제 1개 입력→프롬프트 자동 반영, 컴포넌트 절제 안내, Markdown 규칙 접이식) ②프로젝트 선택/만들기(원고 불러오기=원본 파일명 표시) ③**출판 정보 설정**(저자/발행자/저작권자/저자소개/면책 5개; 제목·부제는 원고, 발행일 자동) ④미리보기 생성(원고만 HTML)
  ④이미지 만들기(블록 분석→파일명/용도/권장 비율·크기/프롬프트 복사) ⑤이미지 넣기(폴더→누락 표시→미리보기 재생성)
  ⑥최종 확인 ⑦전자책 만들기(build:all) ⑧결과(PDF/Paged PDF/output/크몽 폴더 열기).
- 신규 `src/preflight.ts`(+ `npm run preflight`, `--json`): 빌드 전 원고 파싱/표지/본문 이미지 상태 점검. 파싱 실패 시 원인+예시 안내. CLI·GUI 공용. `usageHint` 포함. test/preflight.test.ts(11검증).
- GUI IPC: `preview`(=build:html 만, 미리보기 빠름·Chrome 불필요), `preflight`, `build`(build:all), `copy-text`(프롬프트 복사), `open-path`. 빌드 후 **산출물 존재 검증**(EXPECTED_OUTPUTS 6종) + output 보존 안내.

## 상품성 개선 백로그(충분한 실테스트 후 한꺼번에 개선 — 코비 지시)
- GUI: 테마 선택 UI(빌드 스크립트에 --theme 배관 필요), 출력 형식 선택(PDF만/EPUB만 등), 표지 썸네일 미리보기, 빌드 실패 시 에러 라인 자동 요약, 진행률 막대.
- 배포: Electron 패키징(현재 GUI는 시스템 node + .ts 타입스트리핑 의존 — 패키징 시 번들/런타임 정리 필요).
- 산출물 용량: 고해상도 PNG 임베드로 PDF 10MB+ — 자산 최적화 또는 빌드 단계 리사이즈 옵션 검토.

## 다음 우선순위(지시 대기)
1. 상품성 개선 백로그(위) 일괄 반영 — 충분한 실사용 테스트 후.
2. 크몽 상품화 등록(상세페이지/미리보기 자료 점검).
3. book-paged.pdf 대표 승격 여부 결정.
4. npm audit high 6건(전이 의존) 정리.
5. (Season 3) 웹 SaaS 구조 설계/착수 — 회원/로그인/결제/구독은 홈페이지(cozybuilder.co.kr) 담당, 프로그램은 입력→조립→출력만.
- ✓ 완료: 표지 커버 이미지 지원(Season 2-1) · 판매용 샘플 책 원고(Season 2-2).

## 주의
- 엔진 구조/Parser/AST/Component/Theme 대수정 금지(가산적 원칙).
- 기존 book.pdf(v6) 경로 불변. book-paged.pdf는 별도.
