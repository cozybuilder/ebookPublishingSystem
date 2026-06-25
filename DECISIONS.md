# DECISIONS.md — Ebook Publishing System

> 의사결정 로그 (ADR). **append-only** — 최신 항목을 위에 추가하고, 과거 항목은 수정하지 않는다.
> 항목 형식: 날짜 · 제목 / 결정 / 이유 / status(제안·승인·기각, 승인자).

---

## 2026-06-21 · Season 2-3e — 프로젝트 출력경로 + 책 기본정보 설정 + 미리보기 가독성 (실사용 피드백 2차, 안정 검증 모드)

- **(1) 프로젝트 output 경로** : 미리보기(build:html)는 생성 후 `projects/<이름>/output/book.html` 로 복사해 그걸 연다(자기완결형, 이미지 data URI). 최종 build:all 산출물은 기존 syncProjectOut 로 프로젝트 output 보관(이미 적용). 루트 output/ 은 스크래치.
- **(2)(3) 책 기본정보 설정 + 저작권 사용자값** : `projects/<이름>/book.config.json`(title/subtitle/author/publisher/brand(저작권자)/year/authorBio/disclaimer). GUI STEP2 "책 정보(저작권·발행) 설정" 폼에서 편집/저장. GUI 가 동기화 시 `input/book.config.json` 으로 복사(없으면 제거→섞임 방지). 엔진측 신규 `src/front-matter/front-matter-config.ts`(설정→FrontMatterOverrides, 빈 값 무시) 를 build-html/export-docx/export-epub 가 읽어 override 주입. **엔진 FrontMatter 의 기존 override 계약만 사용 — 코어 무변경.** 판권/발행/저자/저작권자/연도가 사용자 값을 따름(미설정 시 기존 기본값 유지=무회귀).
- **(4) 미리보기 가독성** : 화면 스타일만 보수적 조정(.ty-body line-height 1.85 + 문단 하단 여백 ×1.35, 챕터 제목→본문 호흡, 인용 여백). 인쇄 밀도는 PRINT_CSS 가 별도 제어하므로 PDF 영향 최소. Theme 구조 무변경.
- **검증** : 신규 test/front-matter-config.test.ts(9검증) + 전체 56 스위트 통과. build:html 로 설정→판권 반영 확인(코지북스 표기, "CozyBuilder Lab" 미잔존, 저자소개 사용자값) + line-height 1.85 확인. GUI 스모크/JS 구문/설정폼·새프로젝트 스텁 동작 확인. `.gitignore` 에 input/book.config.json 추가.
- **status** : 실사용 피드백 2차(4항목) 완료.

## 2026-06-21 · Season 2-3d — 프로젝트별 작업공간 분리 + STEP1 컴포넌트 절제 (실사용 피드백 1차)

- **배경(코비 실사용)** : 공용 `assets/images`·`output` 구조 탓에 이전 책 이미지가 다음 책 미리보기에 섞임(예: 명언집 작업 중 AI영상 이미지 노출). + AI 생성 원고가 컴포넌트를 과다 사용해 "책"보다 "쇼케이스" 같음.
- **(1) 프로젝트 격리 — GUI 오케스트레이션(엔진 무변경)** :
  - 모델: `projects/<이름>/{book.md, images/, output/}` — "하나의 책 = 하나의 프로젝트". `.gitignore` 에 `projects/` 추가(사용자 데이터).
  - 핵심: 활성 프로젝트를 엔진 표준 위치로 **동기화 시 표준 이미지 폴더를 비우고 그 프로젝트 이미지만 복사**(syncProjectIn) → 섞임 원천 차단. 빌드 산출물은 프로젝트 output 으로 보관(syncProjectOut). 결과/열기 경로도 프로젝트 output 기준.
  - 첫 실행 시 기존 input/book.md+assets/images 를 제목 기반 프로젝트로 **손실 없이 흡수**(seed).
  - 순수 FS 로직을 `gui/project-fs.cjs`(Electron 비의존)로 분리 → test/project-fs.test.ts(16검증, "B 동기화 후 A 이미지 제거" 누수방지 포함). main.cjs 는 require 만.
  - GUI: STEP2 "원고 선택"→**"프로젝트 선택/만들기"**(목록·선택·원고 불러오기·폴더 열기), STEP5 이미지는 프로젝트 images 폴더 열기/가져오기, 결과는 프로젝트 output. 엔진/Parser/Theme/빌드 스크립트 무변경.
- **(2) STEP1 프롬프트 절제** : "컴포넌트는 꼭 필요할 때만, 한 Chapter 1~2개 이내, 억지로 넣지 말 것, 에세이·명언집·자기계발서는 본문 위주, 목표=읽기 편한 책(≠컴포넌트 쇼케이스)". 컴포넌트 예시는 "형식 참고용"으로 명시.
- **검증** : 전체 55 스위트 통과(project-fs 16 추가). Electron 스모크 정상(첫 실행 시 현재 작업이 프로젝트로 흡수됨 확인). STEP2/STEP1 캡처로 UI 확인.
- **status** : 실사용 피드백 1차 반영 완료. 실제 데스크톱 멀티프로젝트 클릭 e2e 는 코지/코비 환경 확인 권장.

## 2026-06-21 · Season 2-3c — STEP 1 "AI로 원고 만들기" 중심 전환 (gui/index.html)

- **방향(코비)** : 사용자는 거의 100% AI(ChatGPT/Claude)로 원고를 쓴다 → STEP 1의 중심을 Markdown 규칙 설명이 아니라 "AI 활용"으로. 핵심 철학: 이미지는 나중이 아니라 AI가 원고 쓸 때 이미지 프롬프트까지 함께 준비.
- **변경** : STEP 1 메인 = 코비 제공 "AI 원고 작성 프롬프트"(주제만 바꿔 복사) + 단일 버튼 "📋 AI 원고 작성 프롬프트 복사" + 철학 안내(초록 팁 박스). 기존 Markdown 규칙(제목/subtitle/author/Chapter/checklist/faq/timeline/image block 등)은 제거하지 않고 하단 접이식 `<details>` "고급 사용자용 Markdown 규칙 보기"로 이동.
- **보강 판단** : 엔진 파서는 `## Chapter N.`·`:::image`·컴포넌트 fence 형식을 정확히 요구 → AI 출력이 바로 빌드되도록 프롬프트 안에 "정확한 형식" 블록(Chapter/이미지 블록/컴포넌트 예시)을 명시. 코비 원문(주제·조건 1~10·이미지 규칙·판매 수준 목표)은 유지하고 형식만 구체화. (보고에 명시 — 다른 문구 원하면 조정)
- **검증** : Electron 스모크 정상, 전체 54 스위트 통과, STEP 1 캡처 확인(AI 프롬프트 메인 + 접이식 규칙). gui 외 변경 0.
- **status** : 완료.

## 2026-06-21 · Season 2-3b — GUI Wizard(제작 과정 안내형) 전환 (엔진 무변경)

- **목표(코비)** : "파일 넣고 버튼 누르는 도구"가 아니라 "전자책 제작 과정을 안내하는 프로그램". 사용자 작업 순서에 맞춘 8단계 Wizard. UI 미화가 아니라 순서 안내가 핵심. 엔진/Parser/Theme·회원/결제·웹SaaS 금지 유지.
- **8단계 흐름** : ①원고 만들기(규칙·컴포넌트·AI 원고 프롬프트·이미지 규칙·파일명 규칙 안내 + 복사) → ②원고 선택 → ③미리보기 생성(원고만 HTML, 이미지 없으면 자리표시자) → ④이미지 만들기(블록 분석 → 파일명/용도/권장 비율·크기/프롬프트 + 복사) → ⑤이미지 넣기(폴더 선택 → 누락 표시 → 미리보기 재생성) → ⑥최종 확인(표지/목차/이미지/누락/출력형식) → ⑦전자책 만들기(build:all) → ⑧결과(PDF·Paged PDF·output·크몽 폴더 열기).
- **신규 백엔드(gui/, 엔진 무변경)** : IPC `preview`(=`npm run build:html` 만 실행 → output/book.html, Chrome 불필요·빠름. 원고 구조 선확인), IPC `copy-text`(electron clipboard, 프롬프트 복사). preflight 에 `usageHint` 추가(GUI 가 권장 비율/크기 안내). build 는 기존 build:all 유지.
- **index.html** : 단계 레일(완료 ✓ 표시·클릭 이동), 단계별 패널/이전·다음, 1단계 복사용 템플릿 3종(원고 시작/AI 작성/이미지 규칙), 4단계 이미지별 카드(상태·스펙·경로·프롬프트·복사), 5단계 누락 안내, 6단계 점검 요약. UI 는 window.api 없이도 즉시 렌더(견고성).
- **검증** : Electron 스모크 정상. preflight 11검증 + 전체 54 스위트 통과. build:html(미리보기) 동작. 스텁 하니스로 1·4·8단계 레이아웃 캡처 확인(레일/이미지목록/결과 정상). 엔진/외부 런타임 의존성 0 유지.
- **status** : Season 2-3b Wizard 1차 완료. 실제 데스크톱 클릭 e2e 는 코지/코비 환경 최종 확인 권장.

## 2026-06-21 · Season 2-3 — GUI 사용성 안정화 + 사전점검(preflight) (엔진 무변경)

- **목표(코비)** : 개발자용 엔진이 아니라 "처음 쓰는 사람이 설명 없이 쓸 수 있는" 제작 프로그램으로 다듬기. 기능 추가가 아니라 흐름 단순화 + 친절한 에러 + 결과 확인. 회원/결제/구독/권한·웹 SaaS 구현 금지. 엔진/Parser/Theme 구조 변경 금지.
- **신규(엔진 소유, 가산)** : `src/preflight.ts`(+ `npm run preflight`, `--json`). 빌드 전 원고 파싱/표지/본문 이미지 상태 점검. 파서·image-prompt-manifest·image-asset-resolver **재사용만**. 챕터 0개면 잘못된 헤딩을 찾아 "## Chapter 1. 제목" 형식 예시로 안내. test/preflight.test.ts(11검증). 전체 54 스위트 통과.
- **GUI(gui/, 엔진 무변경)** : index.html/main.cjs/preload.cjs 개선.
  - 흐름: 원고 선택 → 이미지 폴더 → **점검(preflight)** → **전자책 만들기** → 산출물 검증 → 결과 열기.
  - 점검 패널(표지/이미지/챕터 ✓·✗·경고), 단계별 안내문, 버튼명 명확화, 진행 단계 표시(release [k/n]·paged 파싱), 친절한 실패 메시지(파싱 실패 시 빌드 중단+원인).
  - 빌드 = `npm run build:all`(기존 `build`→변경) → 사용자가 대표 PDF + **출판용 book-paged.pdf** 포함 5종 + 크몽 자료 모두 수령.
  - **산출물 존재 검증**(EXPECTED_OUTPUTS 6종) + 파일 경로/열기 버튼 + output 보존 안내(개발용 npm test 시에만 비워짐).
- **검증** : Electron 스모크(SMOKE=1) 정상 기동. preflight CLI/JSON 동작 확인. GUI 레이아웃 캡처로 흐름 명확성 확인. build:all 5종 생성 확인.
- **보류(백로그, "충분한 실테스트 후 한꺼번에" — 코비 지시)** : 테마 선택 UI, 출력 형식 선택, 표지 썸네일, 빌드 실패 에러 요약, 진행률 막대, Electron 패키징(node/.ts 의존 정리), 산출물 용량(이미지 최적화). STATUS.md "상품성 개선 백로그" 에 누적.
- **status** : Season 2-3 GUI 안정화 1차 완료. 엔진/Parser/Theme 불변, 외부 런타임 의존성 0 유지(Electron 은 GUI 전용 devDep).

## 2026-06-21 · Season 2-2b — 본문 이미지(ImageBlock) HTML/PDF 실임베드(Additive)

- **배경** : 표지·본문 이미지 입고(cover + IMG-001~004) 후 검수 중, HTML 렌더러가 ImageBlock 을 placeholder 슬롯("IMAGE SLOT")으로만 렌더해 **book.pdf / book-paged.pdf 에 본문 이미지가 안 보이는** 문제 발견(DOCX/EPUB 는 기존에 실임베드). "이미지 포함 5종 검수"(코비 지시) 충족 위해 HTML/PDF 도 실임베드 필요.
- **결정** : ImageBlock 에 `src?`(data URI, 선택) 추가. 자산이 해석되면 placeholder 대신 `<figure class="fig"><img class="fig-img"><figcaption>` 로 렌더. **자산 없으면 기존 placeholder 슬롯 유지 — 무회귀.** 표지와 동일하게 data URI 임베드(인쇄 시 경로 깨짐 방지).
- **구현(가산)** : `cover-resolver.resolveImageDataUri(projectRoot,id)`(표지 resolver 일반화). build-html `embedImages()` 가 렌더 직전 ImageBlock 자산을 해석해 src 주입(id→dataURI 캐시로 테마별 재인코딩 회피). html-renderer `renderLayoutComponent` 에서 src 있으면 figure. 인쇄 CSS(pdf-helpers PRINT_CSS + build-paged): figure 절단 금지 + 높이 제한(max-height 120mm, 한 면 초과 방지). 컴포넌트 매퍼/파서/AST 본문 무변경, 외부 의존성 0.
- **검증** : test/cover.test.ts 에 본문 이미지 figure/placeholder 분기 검증 추가(31검증), 전체 53 스위트 통과. build:all 로 book.modern.html 에 cover-image 1 + fig-img 4(= data:image 5), "IMAGE SLOT" 0 확인. 5종 산출(book.pdf 13.8MB·book-paged.pdf 25면 13.5MB·docx 8.5MB·epub 8.5MB·html 11MB) — 입고 PNG(1.5~2MB×5) 임베드로 용량 증가(필요 시 이미지 최적화는 자산 측 결정).
- **status** : 완료 — 본문 이미지가 4종 출력(html/pdf/paged/docx/epub) 전부에 실제로 표시.

## 2026-06-21 · Season 2-2 — 실제 판매용 샘플 책 원고 제작(콘텐츠만, 엔진 무변경)

- **결정** : `input/book.md` 를 판매 수준 원고로 교체. "왕초보를 위한 AI 영상 제작 입문" / 부제 "ChatGPT와 AI를 활용해 누구나 시작하는 영상 제작" / 저자 CozyBuilder Lab. **코드/엔진 변경 0 — 원고(콘텐츠)만 작성.**
- **구성** : 8장 — Ch1 AI 영상 제작이란?(들어가며 겸) · Ch2 어떤 AI 도구들이 필요한가? · Ch3 ChatGPT 대본 · Ch4 이미지 생성 · Ch5 영상 제작 · Ch6 음성 및 편집 · Ch7 유튜브 쇼츠 제작 · Ch8 마무리(요약·실전 체크리스트·다음 단계). 표지/판권/목차/저자소개/면책은 엔진 Front Matter 자동.
- **컴포넌트 전략** : 49종 억지 쇼케이스 금지(코비 지시) → 37 블록타입을 실제 책 맥락에 자연스럽게 배치. UI성 컴포넌트(modal/drawer/skeleton/empty/search/pagination/tooltip/popover)는 "AI 소프트웨어 화면에서 보게 될 모습"으로 프레이밍해 자연화. 쇼케이스 원고(sample-books/component-showcase.md)는 별도 유지.
- **엔진 제약 준수** : 파서가 `## Chapter N.` 섹션만 인식(첫 챕터 이전/비-Chapter 헤딩은 버림) → 들어가며=Ch1 도입부, 요약·FAQ·체크리스트=Ch8 로 흡수(파서 변경=구조 변경이라 회피).
- **검증** : 8장 37블록 파싱 OK. npm test 53/53 통과. build:all 로 5종 산출(book.html 75KB · book.pdf 1.8MB · book-paged.pdf 24면 1.4MB · book.docx 51KB · book.epub 44KB) 전부 유효 헤더. Chrome 캡처로 표지/판권/목차(8장)/저자소개/면책/본문 컴포넌트 렌더 육안 확인(깔끔·전문적). 크몽 자료(미리보기/상세 11종) 동반 생성.
- **대기** : 표지 아트 `assets/images/cover.png` + 본문 이미지 `assets/images/IMG-001~004.png`(코비 생성). 없으면 텍스트 표지+이미지 슬롯 placeholder 로 정상 빌드(무회귀).
- **status** : Season 2-2 원고 완료 — 이미지 입고 시 최종 상품화. 기준정보 보강 반영(프로그램=입력→출력만, 회원/결제는 홈페이지; 초기 무료).

## 2026-06-21 · Season 2-1 — 표지 이미지(cover) 지원(Additive)

- **결정** : 표지 이미지 지원을 가산적으로 추가. 자산 규약 `assets/images/cover.png|jpg|jpeg`(원고 메타 `cover: <id>` 로 id 변경 가능), 기존 image-asset-resolver 규약 재사용. 없으면 기존 텍스트 표지(그라데이션) 유지 — 무회귀.
- **이유** : Season 2 우선순위 1 — "실제 판매용 책처럼 보이는 표지". 대표 PDF(book.pdf=modern→Blink print)가 HTML 표지에서 나오므로 HTML 표지에 이미지를 임베드(data URI)하는 것이 핵심.
- **구현(가산)** :
  - 신규 컴포넌트 `CoverImage{src:dataURI, alt}`(component.ts). 파서에 `cover:` 메타(ast.Metadata.cover). 신규 `src/assets/cover-resolver.ts`(자산→data URI, data URI↔버퍼 순수 변환).
  - Front Matter: `FrontMatterMeta.coverImage` override. 있으면 표지 면 맨 앞에 CoverImage(없으면 기존 7-컴포넌트 순서 불변). HTML 표지 면은 이미지 있으면 이미지 전용, 없으면 텍스트 표지.
  - HTML/PDF: `<img class="cover-image">` + CSS(`:has(.cover-image)` full-bleed). PRINT_CSS 에 A4 전면(210×297mm, object-fit:cover) 규칙. 그라데이션 텍스트 표지는 이미지 없을 때만.
  - DOCX: CoverImage→inline drawing(기존 이미지 기계 재사용, data URI 디코드). EPUB: 전용 `text/cover.xhtml`(spine 첫) + `images/cover.*` 자산 `properties="cover-image"` + EPUB2 호환 `<meta name="cover">`. 표지는 nav(목차) 제외.
  - 빌드 스크립트(build-html/export-docx/export-epub)가 `resolveCoverDataUri(projectRoot, metadata.cover ?? 'cover')` 로 해석해 override 주입. **엔진 코어/Parser AST(본문)/Theme 무변경, 외부 의존성 0 유지.**
- **검증** : 신규 `test/cover.test.ts` 28검증(parser/resolver/FM/HTML·PDF CSS/DOCX/EPUB + 무회귀) 통과. 전체 53 스위트 통과. 임시 생성 PNG 로 build-html→book.modern.html(cover-image 임베드)·export-pdf(book.modern.pdf 1.5MB, %PDF)·export-epub(cover.xhtml+cover-image)·export-docx(이미지 1) 실연 확인 후 임시 자산 제거. 실제 표지 아트는 코비(PM) 생성 대기.
- **status** : Season 2-1 완료 — 표지 이미지 슬롯 준비, 디자인 표지 입고 시 즉시 4종 출력 반영.

## 2026-06-21 · Phase 2-B — Paged.js 정식 PDF 경로 구축(book-paged.pdf v1)

- **승인** : A안. pagedjs-cli devDep 허용, book-paged.pdf 추가 산출물(기존 book.pdf=v6 Blink 불변).
- **devDep** : `pagedjs-cli@^0.4.3`(+ 전이 puppeteer@20.9). Chromium 다운로드는 PUPPETEER_SKIP_DOWNLOAD 로 생략, 시스템 Chrome(findBrowser) 재사용. ⚠ npm audit high 6건(전이 의존 core-js/puppeteer 구버전) — devDep 한정, 엔진 런타임/배포물 미포함.
- **신규 경로** : src/build-paged.ts + `npm run build:paged`(+ 편의 `build:all`=build && build:paged). output/book.modern.html 을 인쇄용으로 후처리 → pagedjs-cli 로 book-paged.pdf 생성. 엔진/Parser/AST/Component/Theme/기존 PDF 경로 무변경(문자열 후처리만).
- **후처리(컴포넌트 미변경)** : ①섹션 재구성 — 표지=단독, 앞부속(판권·목차·저자소개·면책)=1섹션 병합, 챕터=제목+본문 1섹션 병합(제목 단독 면 제거, 밀도 복원). ②챕터 id + 목차 li 링크화 → target-counter 목차 쪽번호. ③paged 전용 CSS(@page 쪽번호/러닝헤드 마진박스 + v6 표지/판권/밀도/절단방지). 표지는 paged 가 data-page 를 "cover"로 치환하므로 `.pagedjs_cover_page` 로 타겟.
- **결과(성공 기준 충족)** : book-paged.pdf 18면(v6 ~16-18면과 동등 밀도). 쪽번호 ✓ · 러닝헤드(챕터명) ✓ · 목차 쪽번호 7개 전부 정확(1→3…7→15) ✓ · 표지 full-bleed 흰 제목 ✓ · 판권 compact+앞부속 1면 ✓ · 카드 절단 없음 ✓ · 말미 Ch7(도넛+Result) 정상 종료 ✓.
- **운영 메모** : `npm test` 가 output 격리로 산출물을 비우므로, 배포물은 항상 `npm run build:all` 로 마지막에 생성. 빌드 중 Windows FS/Chrome 일시 락으로 1회 실패할 수 있으나 재실행 정상.
- **검증** : npm test 52 통과(엔진 무변경). book.pdf=v6 불변. 캡처 output/review/PAGED-B-*.png(표지/목차쪽번호/챕터러닝헤드), 비교 PDF4-AFTER-*(v6).
- **status** : Phase 2-B 완료 — book-paged.pdf v1 = "v6 품질 + 쪽번호/러닝헤드/목차번호" 달성.

## 2026-06-21 · Phase 2-A — Paged.js 정식화 검증(v6 품질 + 쪽번호 공존)

- **목표** : v6 인쇄 규칙을 paged.js 에 이식해 "책다움(쪽번호/러닝헤드) + v6 품질" 공존 가능한지 검증. 엔진/PDF경로 무변경, 별도 book-paged.pdf.
- **확인됨(공존 가능)** : 표지 full-bleed(그라데이션+흰 제목, .pagedjs_area 그라데이션+콘텐츠 투명) ✓, 쪽번호(@bottom-center counter) ✓, 러닝헤드(string-set rhead→@top-center, 본문면 상단 "Chapter N") ✓, compact 판권 ✓, 절단방지 규칙 호환 ✓.
- **미달/한계** :
  1) v6의 "앞부속 1흐름"이 paged.js 에서 유지 안 됨 — 판권/목차/저자소개가 별개 면으로 분리(=현 시점 v6 대비 밀도 퇴행). paged.js 전용 추가 튜닝 필요.
  2) 폴리필+헤드리스로는 전체 분면이 결정적으로 완료되지 않음(30초에도 ~3면). 완전한 book-paged.pdf 신뢰 생성은 **pagedjs-cli 필요**(현재 보류 지시).
  → 미완성 2면 book-paged.pdf 는 폐기.
- **판정** : "공존 원리"는 입증(쪽번호/러닝헤드/표지). 그러나 **현 폴리필 라우트로는 v6 동등 완성본을 신뢰성 있게 생성 불가** → pagedjs-cli + 앞부속 튜닝이 동반돼야 "v6 품질 + 쪽번호" 완전 충족. 도입 가부는 코비/코지 결정.
- **무변경** : src/ paged 흔적 없음, 산출물 book.pdf=v6 유지, npm test 52 통과. 캡처 output/review/PAGED-A-쪽번호러닝헤드공존.png.
- **status** : Phase 2-A 검증 완료(부분 성공) — pagedjs-cli 결정 대기.

## 2026-06-21 · Phase 2 PoC — Paged.js (도입 여부 검토)

- **방식** : 엔진/Parser/AST/Component/Theme 무수정. 인쇄 시점에만 paged.polyfill.js(MIT v0.4.3) + @page 마진박스 CSS + PagedConfig.before 훅(챕터 id/목차 링크 주입)로 PoC.
- **결과** : ① 쪽번호 = @page @bottom-center counter(page) 작동 ✓ ② 러닝헤드 = string-set(rhead)+@top-center 로 챕터 제목 표시 ✓ ③ 목차 쪽번호 = target-counter 부분 작동(1장=정확, 2~7장=0, anchor/id 해석 보강 필요) △ ④ 컴포넌트 충돌 = 없음(19면 정상 분면) ✓ ⑤ MIT ✓.
- **비용/리스크** : 표지 full-bleed·앞부속 1흐름·밀도(v6 인쇄규칙)를 paged.js 컨텍스트로 재이식 필요(현 PoC는 미이식이라 표지 흰배경·앞부속 빈면 = 일시 퇴행). 목차 쪽번호 정식화 = 챕터 id/목차 a 링크(경미한 컴포넌트/HTML 훅) 필요. 신뢰성 있는 PDF 바이너리 = pagedjs-cli(npm devDep) 권장(브라우저 폴리필+print-to-pdf 타이밍 불안정).
- **판단** : 쪽번호·러닝헤드·목차 쪽번호는 Blink 단독 불가한 "책다움" 기능이며 PoC로 실현 가능 확인. 단 드롭인 아님 — v6 인쇄 품질 재이식 + 목차 anchor + pagedjs-cli 가 동반되는 정식 Phase 2 작업 필요. 채택 여부는 코비/코지 결정(캡처 output/review/PAGED-PoC-*.png).
- **흔적** : PoC 스크래치/라이브러리는 정리(재다운로드 가능). 엔진/테스트 무변경(52 통과). 산출물 book.pdf 는 여전히 v6(Blink).
- **status** : PoC 완료 — 도입 결정 대기.

## 2026-06-21 · PDF 조판 4차 — Phase 1 마무리 미세조정 (PRINT_CSS v6)

- **요구(코비 4차)** : Phase 1 범위 내 미세조정(장 시작 여백·컴포넌트 margin·카드 padding·슬롯 높이·제목 단독 방지·widow/orphan). Paged.js/표지이미지 보류.
- **수정(인쇄 CSS만)** : @page 상하 18→16mm. 블록 여백 압축(.card margin 12/ padding 18·20, stats/timeline/tlc/pg/stp/proc/before-after/checklist/steps margin 13, .ty-body/.ty-chapter margin 9, quote 14/14·18). 장 시작 padding-top 1mm. 제목/라벨 break-after: avoid-page(말미 고립 방지). orphans/widows 3. 이미지 슬롯 84/14, slot-prompt margin 6.
- **검증** : npm test 52스위트 통과(export 마커 v6). npm run build exit 0(직전 1회 실패는 수동 headless Chrome 동시실행 충돌 — 재실행 정상). 충실 에뮬레이션(실 PRINT_CSS 화면 적용)으로 앞부속 비과밀·챕터 진입 자연·본문 밀도·장끝/말미 점검. output/review/ PDF4 캡처.
- **남은 한계** : 쪽번호/러닝헤드(Phase 2 Paged.js), 표지 이미지(Phase 1 종료 후), 장=새 면 시작에 따른 장끝 부분채움(표준), 실 PDF 래스터라이저 부재(에뮬 검증).
- **변경 파일** : src/export/pdf-helpers.ts(v6), test/export.test.ts(v6).
- **status** : PDF 조판 4차(v6) 완료 — Phase 1 마무리.

## 2026-06-21 · PDF 페이지네이션 3차 — 절단/빈면/판권 (PRINT_CSS v5 + 부록 분리)

- **요구(코비 3차)** : ①판권 compact imprint ②컴포넌트 중간 절단 금지 ③말미 단독 카드 면 제거.
- **수정** :
  1) 판권 = compact imprint(폰트 10.5px·muted·tight) → 표지 다음 작은 판권 영역으로, 목차·저자소개·면책과 한 면.
  2) break 정책 전환 — "크기별 auto"(v4) 폐지. **모든 카드/컴포넌트를 원자 블록(break-inside:avoid)** 으로 보호(checklist·card·before-after·faq·result·file·alert·feature·chart·stats·timeline·progress·stepper 및 내부 항목 li/tr/stat/item). 예외는 길어질 수 있는 표/목차만 행 단위 분할(tr 보호). orphans/widows 3.
  3) 부록(컴포넌트 쇼케이스)을 판매용 본문에서 분리 → sample-books/component-showcase.md 로 이동, master-test-book·input/book.md 에서 제거. 책이 Ch7(도넛+결과)로 정상 종료 → 말미 단독 file 카드 면 제거.
  4) 이미지 슬롯 min-height 96 유지(단독 면 방지).
- **회귀 0** : HTML/EPUB/DOCX 동작 불변(인쇄 CSS만), 컴포넌트 로직 불변. input/book.md 7장(부록 제거)로도 chapter-canvas 테스트 통과.
- **검증** : npm test 52스위트 통과(export 마커 v5). npm run build exit 0. 부록 산출물 미포함 확인. A4 분면 에뮬레이션으로 판권 compact·앞부속 1면·챕터 연결·본문 밀도·말미(부록 없는 종료) 확인. output/review/ PDF3 캡처.
- **남은 한계** : 쪽번호/러닝헤드 없음(Blink CSS counter 미지원 → 필요 시 Paged.js). 장은 새 면에서 시작(표준) → 장 끝 면은 부분 채움 가능(정상). 실 PDF 래스터라이저 부재로 에뮬레이션 검증.
- **변경 파일** : src/export/pdf-helpers.ts(v5), test/export.test.ts(v5), sample-books/component-showcase.md(신규), sample-books/master-test-book-v1.md·input/book.md(부록 제거).
- **status** : PDF 페이지네이션 3차(v5) 완료.

## 2026-06-21 · PDF 페이지네이션 2차 — 빈공간 제거 (PRINT_CSS v3→v4)

- **목표** : PDF 가 "웹출력물"이 아니라 전자책처럼. 인쇄 전용 CSS 만 수정(HTML/EPUB/DOCX 불변).
- **v3(1차)** : `.page` 일괄 break-after 제거 → 챕터에서만 새 면. 챕터-본문 연결. 표지 full-bleed. → 챕터 단독 빈 면 제거됨.
- **v4(2차)** :
  1) 앞부속 1흐름화 — 판권/목차/저자소개/면책의 개별 break 제거 → 표지 다음 한 흐름으로 연속(판권 단독 빈 면 제거).
  2) 크기별 break-inside — 무조건 avoid 폐지. 작은 원자 블록(stat/callout/result/alert/tl-item/proc-p/pg-row/tr/slot 등)만 통째 유지, 큰 컨테이너(table/timeline/tlc/stats/pg/stepper/feature/code/checklist 등)는 면 넘겨 흐르도록 허용 → 면 끝 카드 밀림·억지 공백 감소. 차트(도형)는 분할 금지 유지.
  3) 이미지 슬롯 min-height 180→96, 흐름 내 배치(단독 면 점유 방지).
  4) orphans/widows 2, 제목 break-after:avoid(다음 내용과 붙임).
- **부록(showcase)** : 판매본 제외/compact 는 동작 변경이라 미적용, 보고서에서 방향 확인 요청(부록은 마스터 테스트북 산출물).
- **검증** : npm test 52스위트 통과(export print 마커 v4 갱신). npm run build exit 0. A4 분면 에뮬레이션으로 before(v3)/after(v4) 비교 — 앞부속 1면화·챕터 연결·슬롯 인라인 확인. output/review/ 에 캡처 저장.
- **변경 파일** : src/export/pdf-helpers.ts(PRINT_CSS v4), test/export.test.ts(v4 마커). (엔진/컴포넌트 로직 불변)
- **한계** : 쪽번호/러닝헤드 없음(Blink CSS counter 미지원 → 필요 시 Paged.js 중기). 환경에 PDF 래스터라이저 없어 실제 PDF 직접 캡처 불가, A4 에뮬레이션으로 검증.
- **status** : PDF 페이지네이션 2차(v4) 완료.

## 2026-06-21 · PDF 상품형 레이아웃 재설계 (긴급)

- **문제** : book.pdf 가 표지/챕터가 렌더 테스트처럼 보임(표지 같지 않음, 제목 줄바꿈 어색, 과도한 여백, COVER/CONTENT/CHAPTER PAGE 라벨 노출, 챕터 단독 빈 페이지).
- **수정(가산적, 출력 품질)** :
  - 테스트용 페이지 라벨 div 제거(renderPage) — HTML/PDF 공통. (의존 테스트 없음 확인)
  - 제목/챕터 `word-break: keep-all` — 한글 줄바꿈 자연화.
  - 표지: CoverPage 세로 중앙 정렬(base) + **PDF print 전용 full-bleed 그라데이션 커버**(@page cover margin:0, 네이비→블루, 흰 제목 42px, amber 액센트).
  - 챕터 오프너: PDF print 에서 `break-after: avoid` → 챕터 제목이 다음 본문과 같은 페이지로 연결(빈 페이지 제거).
  - 여백: @page 18/17mm, .page print padding 0 정리.
  - print CSS 버전 v1→v2.
- **회귀 0** : 컴포넌트/HTML/EPUB/DOCX 동작 불변(표지·여백·라벨은 화면 base + print 한정). 화면 HTML 은 표지 중앙정렬·라벨 제거만 반영(나머지 print 전용).
- **검증** : npm test **52스위트** 통과(export.test 의 print 마커 v2 갱신 포함). npm run build exit 0. print CSS 화면 적용·A4 폭 캡처로 표지/챕터연결/본문밀도 육안 확인. API Key 없이 동작.
- **변경 파일** : src/html-renderer/html-renderer.ts(라벨 div 제거 + 표지/챕터 CSS + keep-all), src/export/pdf-helpers.ts(PRINT_CSS v2), test/export.test.ts(v2 마커).
- **status** : PDF 상품형 재설계 완료.

## 2026-06-21 · 통합 스프린트 15~30 — 잔여 핵심 16종 일괄 구현

- **방식** : 샘플 단계 종료, 16종 한 번에 가산적 구현(ast→parser→component→mapper→html→epub→docx + 컴포넌트별 test). 정적 변환 원칙(인터랙션 제거).
- **신규 블록(16)** : 15 :::compare-card(추천 열 highlight) · 16 :::alert(success/info/warning/error) · 17 :::process(단계 흐름+화살표) · 18 :::rating(value/max 별점) · 19 :::tags · 20 :::chips · 21 :::tree(들여쓰기 깊이) · 22 :::pagination(페이지 정보) · 23 :::empty · 24 :::search(검색 예시) · 25 :::tooltip→설명박스 · 26 :::popover→설명박스 · 27 :::modal→강조카드 · 28 :::drawer→강조카드 · 29 :::skeleton→placeholder · 30 :::file→파일정보카드.
- **공존/충돌 회피** : 기존 :::compare(범용표) 유지, 신규는 :::compare-card. 컴포넌트명 ComparisonCard 등 신규 식별자 사용. 이 16종은 자체 컨테이너 렌더(.card 래퍼 미사용, StatsCard 선례).
- **안전** : 모든 블록 빈 데이터/잘못된 값에도 빌드 실패 없음. rating·pagination clamp, tree depth, skeleton lines 상한.
- **검증** : 신규 test 16개(각 3~5 검증). npm test **52스위트** 전부 통과(회귀 0). npm run build exit 0. master-test-book 부록 챕터에 16종 전부 추가 → book.modern.html 16종 실렌더 확인. API Key 없이 동작.
- **status** : 통합 스프린트(15~30) 완료. 49종 중 30종 실매핑.

## 2026-06-21 · 실매핑 14차 — Timeline Card (:::timeline-card)

- **절차** : 시각 샘플 제출 → 코비 A 승인(블록명/문법/아이콘제외/DOCX 텍스트 + 추가요구 8).
- **공존** : 기존 6차 `:::timeline`(DS 02/04 #14, 선+점+텍스트, 컴포넌트 TimelineCard) 그대로 유지. 신규 `:::timeline-card`(DS 04/04 #42, 선+점+테두리 카드, 컴포넌트 TimelineCardList) 별도 추가. 이름 충돌 회피 위해 컴포넌트명 TimelineCardList 사용.
- **구현(가산적)** : `:::timeline-card` 빈 줄로 항목 구분, 항목 내부 date(선택)/title(필수)/desc(선택) 키-값(순서 무관). title 없는 항목 무시. 아이콘 미사용(코비 6번). 좌측 수직선 + 원형 포인트 + radius 8 + soft shadow 카드. ast(TimelineCardBlock, TimelineItem 재사용)·parser·component(TimelineCardList)·mapper·layout(radius card)·html(.tlc, DS 04/04 42)·epub(.tlc, border-left 선 + 카드)·docx(날짜 caption + 제목 bold + 설명).
- **검증** : test/timeline-card.test.ts(11) — 파서(3항목/date선택/title무시)·6차 공존·HTML .tlc·EPUB·DOCX·20항목·빈 데이터 안전. npm test **36스위트** 통과(회귀 0). input/book.md Ch7 에 사용.
- **다음** : 미정(코비 지정).
- **status** : 14차(Timeline Card) 완료 (승인 대기).

## 2026-06-21 · 실매핑 13차 — Progress Stepper (:::stepper)

- **절차** : 시각 샘플 제출 → 코비 A 승인(문법/완료✓상태/desc박스/DOCX 텍스트목록 + 추가요구 8).
- **구현(가산적)** : `:::stepper` current(현재 1-base)/desc(선택) + `- ` 단계 목록. 3상태 — 완료(현재 이전, 파랑 원+✓, 진입 연결선 파랑)/현재(파랑 원+번호, 라벨 bold)/예정(회색 테두리 원+회색 연결선). desc 존재 시 하단 박스(자동 제목 "N단계: <현재라벨>", radius·padding Feature 수준), 없으면 박스 생략. current 1~N clamp(0이하→1, 초과→N, 미지정→1), 단계 무제한, 빈 데이터 안전. ast(StepperBlock)·parser·component(StepperCard)·mapper·layout(radius card)·html(.stp, DS 02/04 15)·epub(.stp + CSS)·docx(번호목록 "N. 라벨 ✓/◀ 현재" + 현재만 음영).
- **검증** : test/stepper.test.ts(12) — 파서/clamp(초과·0·미지정)·HTML 3상태/연결선분리/desc박스/생략·EPUB·DOCX·8단계·빈 데이터 안전. npm test **35스위트** 통과(회귀 0). input/book.md Ch3 에 사용.
- **다음** : 14차 Timeline Card(복잡 → 샘플 먼저).
- **status** : 13차(Progress Stepper) 완료 (승인 대기).

## 2026-06-21 · 실매핑 12차 — Progress (:::progress)

- **절차** : 시각 샘플 제출 → 코비 A 승인(문법/100%처리/1블록=1카드/DOCX 텍스트대체 + 추가 요구 6).
- **구현(가산적)** : `:::progress` 각 줄 `라벨: 퍼센트`. 첫 항목=전체 진행률(굵은 12px 막대), 나머지=세부 행(8px). 100%=초록(#16A34A)+"완료 ✓", 0~99%=파랑(#2563EB)+숫자. 라벨 한글 가능(splitKeyValue 대신 첫 콜론 직접 분리). 0~100 clamp, 숫자 아님/빈 데이터 안전(빌드 실패 없음), 행 무제한. ast(progress/ProgressItem/ProgressBlock)·parser·component(ProgressCard)·mapper·layout(radius card)·html(.pg 막대, DS 02/04 20)·epub(.pg + CSS)·docx(라벨—NN%/완료 텍스트 + 음영, 전체=굵게).
- **검증** : test/progress.test.ts(10) — 파서·clamp/잘못된값/% 표기·HTML 막대/전체행/완료/숫자·EPUB·DOCX·10행·빈 데이터 안전. npm test **34스위트** 통과(회귀 0). input/book.md Ch7 에 사용.
- **다음** : 13차 Progress Stepper(복잡 → 샘플 먼저).
- **status** : 12차(Progress) 완료 (승인 대기).

## 2026-06-21 · 실매핑 11차 — Feature Card (:::feature)

- **절차** : 시각 샘플 제출 → 코비 A+ 승인(문법/chevron 제거/1블록=1카드/체크리스트 간격↑) → 전체 구현.
- **구현(가산적)** : `:::feature` icon/title/desc(key-value) + `- ` 체크리스트 불릿. title 외 모두 선택. 1블록=1카드(그리드는 추후). chevron 미사용(정적 오해 방지). 체크리스트 gap 6→8px(보완). ast(feature/FeatureBlock)·parser·component(FeatureCard)·mapper·layout(tone info/radius card)·html(.feat 원형 아이콘+✓리스트, DS 02/04 17)·epub(.feat + CSS)·docx(아이콘+제목 bold+설명+✓항목).
- **검증** : test/feature.test.ts(10) — 파서(풀/최소)·HTML 구조/체크리스트/chevron 없음/최소 카드·EPUB·DOCX·빈 구성 안전. npm test **33스위트** 통과(회귀 0). input/book.md Ch4 에 사용.
- **다음** : 12차 Progress(복잡 → 샘플 먼저).
- **status** : 11차(Feature Card) 완료 (승인 대기).

## 2026-06-21 · 실매핑 10차 — Result Box 확장 (:::result variant:)

- **구현(가산적, 선택형 변형)** : `:::result` 첫 줄 `variant: success|info|warning|error` 선언 시에만 색/라벨 분기. 선언 없으면 기존 동작(핵심 결과/파랑 ★) 완전 보존. 미지원 값은 무시하고 텍스트 보존. ast(ResultVariant, ResultBlock.variant?)·parser(첫 줄만 인식)·component(ResultCard.variant?)·mapper·html(data-variant 자동 + 변형 CSS 4종 + 라벨)·epub(box result-<variant> 클래스+CSS)·docx(변형 라벨+음영).
- **검증** : test/result-box.test.ts(10) — 파서·미지원값 무시·HTML/EPUB/DOCX 변형·기본 회귀 4종. npm test **32스위트** 통과(회귀 0). input/book.md Ch5 에 success 예시.
- **다음** : 11차 Feature Card(복잡 → 샘플 먼저).
- **status** : 10차(Result Box 확장) 완료 (승인 대기).

## 2026-06-21 · 실매핑 9차 — Chart(Donut) (:::chart type:donut)

- **구현(가산적)** : `:::chart type:donut` + `center:` 라벨. 공유 모듈 `src/charts/donut-chart.ts`(정적 SVG, 누적 stroke-dasharray, 4색 #2563EB·#16A34A·#F59E0B·#9CA3AF 순환, 중앙 라벨+합계). ast/component 에 center 추가, parser·mapper. HTML·EPUB = SVG+범례, DOCX = 값 표. bar/donut 은 type 으로 분기(bar 불변). 합계0/빈 데이터 안전.
- **검증** : test/donut.test.ts(12) — 파서·SVG circle4·범례·중앙 합계·4색·DOCX 표·EPUB·5색 순환·안전·bar 회귀. npm test **31스위트** 통과(회귀 0). input/book.md Ch7 에 도넛.
- **status** : 9차(Donut Chart) 완료 · 코비 A+ 승인.

## 2026-06-21 · 실매핑 8차 — Chart(Bar) (:::chart type:bar)

- **절차** : 샘플 먼저 제출 → 코비 A 승인 → 전체 구현(규칙 적용).
- **구현(가산적)** : `:::chart` (type/title/labels/values/unit). 공유 모듈 `src/charts/bar-chart.ts`(정적 SVG, y축 자동 nice 상한, Primary #2563EB, 값/축/라벨). HTML·EPUB = SVG, DOCX = 값 표 대체. ast(chart/ChartBlock)·parser·component(ChartCard)·mapper. 차트 카드 max-width 520 + 중앙 정렬(보완 반영). labels/values 개수 min 안전 처리, 빈 데이터 안전.
- **검증** : test/chart.test.ts(12) — 파서·HTML SVG(막대4)·DOCX 표·EPUB svg·안전(빈/불일치). npm test **30스위트** 통과(회귀 0). input/book.md Ch4 에 차트 사용.
- **다음** : Donut Chart — 별도 샘플 먼저.
- **status** : 8차(Bar Chart) 완료.

## 2026-06-21 · 실매핑 7차 — Metric/Stats (:::stats)

- **구현(가산적, 명시형 key-value)** : `:::stats` 항목 빈 줄 구분, `icon:`(선택)/`value:`/`label:`. ast(stats/StatItem)·parser·component(StatsCard)·mapper·html(.stats 카드 그리드, 큰 숫자, DS 02/04)·docx(값 bold+라벨 caption)·epub(.stat). 1~4개 안전, icon 생략 가능. 카드 그리드(비-단일카드).
- **검증** : test/stats.test.ts(11) — key-value 분리·icon 생략·HTML/DOCX/EPUB. npm test **29스위트** 통과(회귀 0). input/book.md Ch1 에 3카드.
- **다음** : Chart(마지막) — "샘플 먼저" 규칙 적용 예정.
- **status** : 7차(Metric/Stats) 완료.

## 2026-06-21 · 작업 절차 — 복잡 컴포넌트 "샘플 먼저"

- **규칙** : Timeline/Metric/Chart 등 복잡 컴포넌트는 **구현 전 시각 샘플(HTML/인라인) 1장 제출 → 코비 확인 → 전체 파이프라인 구현 → 테스트 → 최종 승인** 순서. 수정 비용 절감 목적. (단순 블록은 종전대로 구현 후 제출 가능)
- **status** : 절차 채택. Metric/Stats 부터 적용.

## 2026-06-21 · 실매핑 6차 — Timeline (:::timeline)

- **구현(가산적)** : `:::timeline` 컨테이너, 빈 줄로 항목 구분(1줄 날짜·2줄 제목·이후 설명). ast(timeline/TimelineItem/TimelineBlock)·parser·component(TimelineCard)·mapper·layout(radius card)·html(수직선+점, DS 02/04)·docx(날짜 caption+제목 bold+설명)·epub(.timeline). 카드 컴포넌트.
- **검증** : test/timeline.test.ts(9) — 항목 분리/HTML·DOCX·EPUB. npm test **28스위트** 통과(회귀 0). input/book.md Ch1 에 3항목 사용.
- **다음** : Metric/Stats → Chart.
- **status** : 6차(Timeline) 완료.

## 2026-06-20 · 실매핑 5차 — Code Block (``` 펜스)

- **구현(가산적)** : 표준 ``` 펜스(언어 선택), 내부 원문 보존. ast(code/CodeBlock)·parser(FENCE_OPEN/CLOSE)·component(CodeBlock)·mapper·html(.code 헤더+pre, DS 04/04)·docx(Consolas 음영 단락+언어 라벨)·epub(.code pre+CSS). 이스케이프 안전, 인라인 변환 미적용(원문).
- **검증** : test/codeblock.test.ts(10) — 파싱/원문보존/언어옵션/HTML·DOCX·EPUB/이스케이프. npm test **27스위트** 통과(회귀 0). input/book.md 에 ffmpeg 예시.
- **다음** : Timeline → Metric/Stats → Chart.
- **status** : 5차(Code Block) 완료.

## 2026-06-20 · 실매핑 4차 — Tag 인라인 태그 (1차 스프린트 마감)

- **구현(가산적, ParagraphBlock 한정)** : `[[tag:라벨]]` → HTML `.tag-inline` 칩(DS 03/04 블루) · DOCX 색+음영 런 · EPUB span. 연속 사용·Highlight 공존(통합 토크나이저). `[[tag:]]` 미포함 단락은 기존과 동일.
- **검증** : test/tag.test.ts(7) — HTML/DOCX/EPUB·다중 태그·==강조== 공존·회귀. npm test **26스위트** 통과(회귀 0). input/book.md 키워드 줄에 4태그 사용.
- **마일스톤** : 실매핑 1차 스프린트(Callout·Divider·Highlight·Tag) 완료. 신규 입력 문법 6종 도입(:::info/tip/note, :::divider+`---`, ==강조==, [[tag:..]]) 전부 HTML/DOCX/EPUB 반영, 기존 동작 불변.
- **status** : 4차(Tag) 완료 · 1차 스프린트 종료.

## 2026-06-20 · 실매핑 3차 — Highlight 인라인 강조

- **구현(가산적, ParagraphBlock 한정)** : `==강조==` → HTML `<mark class="hl">`(노랑) · DOCX `<w:highlight w:val="yellow"/>` 런 분할 · EPUB `<mark>`. esc 후 치환(안전). `==` 미포함 단락은 기존 출력과 100% 동일.
- **검증** : test/highlight.test.ts(6) — HTML/DOCX/EPUB·회귀(일반 단락 mark 없음)·이스케이프(`<` + 강조 동시). npm test **25스위트** 통과(회귀 0). input/book.md 에 1개 사용.
- **다음** : Tag(인라인 `[[tag:..]]`).
- **status** : 3차(Highlight) 완료.

## 2026-06-20 · 실매핑 2차 — Divider 신규 블록

- **구현(가산적, 전 파이프라인)** : `:::divider` + 단독 수평선(`---`/`***`/`___`) → divider 블록. ast/parser(HR_RE)/component(Divider)/mapper/html(<hr class="divider">+CSS)/docx(pBdr 수평선)/epub(<hr>). 카드 아님(비-카드 렌더).
- **검증** : test/divider.test.ts(8) — 두 입력 형태·순서 보존·단락 오인 방지·HTML/DOCX/EPUB. npm test **24스위트** 통과(회귀 0). input/book.md(마스터)에 `---` 1개 사용, book.pdf 렌더 확인.
- **다음** : Highlight(인라인 `==강조==`) → Tag(인라인 `[[tag:..]]`). 인라인 파서라 더 작은 단위로.
- **status** : 2차(Divider) 완료.

## 2026-06-20 · 실매핑 1차 스프린트 — Callout(Info/Tip/Note) 신규 블록

- **결정** : Master Test Book v1 을 input/book.md 공식 샘플로 채택. 49 실매핑 1차 = 신규 블록 **콜아웃 3종**(:::info / :::tip / :::note) 도입(엔진 동결 해제, 추가 변경만).
- **구현(전 파이프라인, 가산적)** : ast(callout/CalloutVariant) · parser(:::info/tip/note) · component(CalloutCard) · component-mapper · layout-engine(tone info/radius card) · html-renderer(렌더+data-variant+DS 01/04 CSS: info 파랑/tip 초록/note 보라) · docx(라벨+틴트) · epub(callout div). 기존 동작 불변(default fallback 유지).
- **검증** : test/callout.test.ts(12) 추가 — 파서→AST→매퍼→HTML/DOCX/EPUB 전 경로. npm test **23스위트** 통과(API Key 없이). input/book.md(마스터 북)에 3종 사용, book.pdf 렌더 확인.
- **다음** : Divider → Highlight → Tag(인라인) 순으로 micro-step 확장 예정.
- **status** : 1차(Callout) 완료.

## 2026-06-20 · Master Test Book v1 — 엔진 검증용 원고

- **목적** : 출간용이 아닌 엔진 검증용. 주제 "AI 영상 제작 입문"(난이도 하), 약 20p, 49 시스템 중 전자책 렌더 블록을 최대 활용.
- **파일** : sample-books/master-test-book-v1.md (input/book.md 미변경, 검증은 임시 swap→복원).
- **커버리지** : 7챕터 / 40블록 / **엔진 블록 12종 전부**(paragraph·quote·image·table·checklist·compare·before-after·prompt·steps·faq·warning·result).
- **이미지 규칙 검증** : IMG-001(cover)·IMG-002~004(chapter)·IMG-005(thumbnail), assets/images/<id>.png. 누락 5개 안내 정상(빌드 성공).
- **출력 검증** : HTML/PDF/DOCX/EPUB 4종 생성·검증 통과(book.pdf≈1.19MB). npm test 22 통과.
- **status** : 검증 완료. 권장 원고 구조 도출(보고). 입력 기본값 채택 여부는 코비 결정.

## 2026-06-20 · Component Design System v1 — 최종 승인 · FREEZE

- **판정** : A+ APPROVED. 01~04/04 49종 전부 PASS. **Component Design System v1 동결(FREEZE)** — 특별 승인 없이는 변경하지 않음.
- **산출물** : output/component-gallery-0{1,2,3,4}.pdf (+ .html), src/showcase/component-gallery-0{1..4}.ts + build-gallery-0{1..4}.ts, npm `demo:components(:02/03/04)`.
- **다음 단계** : "49종 컴포넌트의 전자책 엔진 실매핑" 착수. 선결 결정 = 신규 입력 블록/문법 허용 여부(파서/AST 확장). 매핑 분류·계획은 보고로 제출.
- **status** : v1 FREEZE. 실매핑 단계 진입(계획 수립).

## 2026-06-20 · Component Design System 04/04 — 검수 데모(37~49) · 49종 완료

- **구현** : src/showcase/component-gallery-04.ts(13종) + build-gallery-04.ts. `npm run demo:components:04` → output/component-gallery-04.html + .pdf(약 544KB). 01~03/04 동일 테마.
- **컴포넌트** : 37 Tooltip · 38 Popover · 39 Modal · 40 Drawer · 41 Progress Stepper · 42 Timeline Card · 43 Tree · 44 Code Block · 45 File Uploader · 46 Search Bar · 47 Empty State · 48 Skeleton · 49 Chart(SVG 라인+도넛).
- **마일스톤** : 4개 배치(01~04)로 49종 디자인 시스템 데모 전부 시각 구현 완료.
- **분리** : 데모 갤러리(엔진 밖). 전자책 출력 미변경. npm test 22 통과.
- **status** : 04/04 시각 구현 완료(데모). QA 대기.

## 2026-06-20 · Component Design System 03/04 — 검수 데모(25~36)

- **구현** : src/showcase/component-gallery-03.ts(12종) + build-gallery-03.ts. `npm run demo:components:03` → output/component-gallery-03.html + .pdf(약 398KB). 01·02/04 동일 테마.
- **컴포넌트** : 25 Tab Content · 26 Dropdown · 27 Select · 28 Toggle · 29 Switch · 30 Slider · 31 Rating · 32 Breadcrumb · 33 Pagination · 34 Tag · 35 Chip · 36 Avatar. (Tag/Chip/Avatar gap·wrap, Dropdown/Select 높이 일치, Slider 눈금, Avatar 동일 크기 반영)
- **분리** : 데모 갤러리(엔진 밖). 전자책 출력 미변경. npm test 22 통과.
- **status** : 03/04 시각 구현 완료(데모). QA 대기.

## 2026-06-20 · Component Design System 02/04 — 검수 데모(13~24)

- **구현** : src/showcase/component-gallery-02.ts(12종) + build-gallery-02.ts. `npm run demo:components:02` → output/component-gallery-02.html + .pdf(약 533KB). 01/04 와 동일 테마(색·폰트·8px·soft shadow·flat).
- **컴포넌트** : 13 Before/After · 14 Timeline · 15 Stepper · 16 Process · 17 Feature Card · 18 Comparison · 19 Metric · 20 Progress Bar · 21 Tabs · 22 Accordion · 23 Alert · 24 Pagination.
- **분리** : 데모 갤러리(엔진 밖). 전자책 출력(book.pdf) 미변경. npm test 22 통과.
- **status** : 02/04 시각 구현 완료(데모). QA 대기.

## 2026-06-20 · Component Design System 01/04 — 검수용 데모 갤러리(12종 전체)

- **요청** : 12종이 모두 한 화면에 보이는 검수 화면(매핑 안 된 것도 샘플로 표시). 전자책 출력 로직 미변경, 별도 demo 분리 허용.
- **구현** : src/showcase/component-gallery.ts(12종 HTML) + build-gallery.ts(Chrome→PDF). `npm run demo:components` → output/component-gallery.html + .pdf(약 450KB). 12종 전부 01/04 플랫 스펙으로 샘플 데이터 시각화.
- **분리 원칙** : 데모 갤러리는 엔진 밖. 실제 전자책(book.pdf)에는 매핑된 5종(Table/Checklist/FAQ/Quote/Warning)만 반영(직전 작업).
- **검증** : 갤러리 PDF 생성, npm test 22 통과(데모는 빌드/테스트 무영향).
- **status** : 12종 시각 구현 완료(데모). 전자책 실매핑 확장(신규 블록/문법)은 코비 결정 대기.

## 2026-06-20 · Component Design System 01/04 (플랫 대시보드) — 매핑 5종 구현

- **스펙** : 플랫 대시보드, Primary #2563EB, Border #E5E7EB, radius 8, shadow 0 2px 8px rgba(0,0,0,.06), 연회색 표 헤더. (이전 v3 navy/18~24 를 이 5종에 한해 대체)
- **구현(원고 블록 매핑 5종)** : 01 Table(연회색 헤더·border·8px) · 02 Checklist(세로+좌측 체크박스) · 03 FAQ(아코디언형 bordered 카드+⌄) · 04 Quote(좌측 파란 바+blue tint+따옴표) · 07 Warning Box(연노랑+⚠). Steps/Before-After/Result 는 12개 목록에 없어 미변경(v3 유지).
- **구조적 미스매치(중요·플래그)** : 01/04 는 웹 UI 키트, 본 엔진은 정적 전자책(MD→PDF/DOCX/EPUB). 12개 중 7개는 원고 블록/문법 없음 또는 정적 전자책에 부적합 → 미구현: 05 Info Card, 06 Tip Box, 08 Note Box, 09 Divider, 10 Highlight, 11 Badge, 12 Button(PDF에 버튼 동작 불가).
- **데이터 갭(플래그)** : 표 상태 Badge(셀 의미 없음), 체크리스트 완료/취소선(완료상태 데이터 없음), FAQ 아코디언 접힘(정적 PDF 비대화형), Quote 출처(author 데이터 없음).
- **검증** : npm run build → 5종 적용 확인, book.pdf 재생성(약 1.01MB). npm test 22 통과(API Key 없이).
- **status** : 매핑 5종 구현. 미구현 7종은 "신규 블록/문법 허용" 또는 "별도 웹 컴포넌트 라이브러리" 결정 대기.

## 2026-06-20 · Engine Design System v3 재구현 (불합격 → 구조 재설계)

- **사유** : 1차 "색만 입힘" 판정 불합격. 첨부 이미지 기준 구조/밀도/타이포 재설계.
- **재구현(ModernGlass=book.pdf base)** : 컴포넌트 공통 구조 = 섹션 라벨(eyebrow) + 타이틀(21px) + 큰 카드(패딩28·radius20) + 아이콘/시각요소 + 본문.
  - Checklist: 연녹색 카드 + 항목 카드(흰 카드+체크박스).
  - FAQ: 연보라 질문 카드 + Q/A 계층(상단 구분선) + ⊕ 아이콘.
  - Before/After: BEFORE(회색)/AFTER(파랑) 헤더 카드 + 중앙 화살표(→).
  - Steps: 파란 원형 번호 + 연결선 + 단계 카드.
  - Quote: 큰 따옴표 + 본문(출처 자리).
  - Warning(NOTE): 주황 노트 + ! 아이콘.
  - Result: 큰 ★ 아이콘 + KEY RESULT 라벨 + 큰 핵심 문장.
  - Table: v2(네이비 헤더/zebra/카드) 유지 + 섹션 라벨.
- **데이터 갭(신규 문법 금지로 미충족 — 플래그)** : 체크리스트 Tip 영역, Steps 설명줄, Quote 출처, 표 행 아이콘, Before/After 하단 핵심결과 통합(현재는 별도 ResultCard 블록). 이미지 06~10(Graph/Stats/Note 4종/Component Palette)은 신규 블록 필요로 이번 범위 제외.
- **검증** : npm run build → 전 컴포넌트 구조 CSS 반영, book.pdf 재생성(약 1.04MB). npm test 22 통과(API Key 없이).
- **status** : v3 재구현 1차 제출. 데이터 갭(Tip/설명/출처 등)은 소규모 입력 문법 허용 여부 코비 결정 대기.

## 2026-06-20 · Engine Design System v3 구현 (한 번에 적용)

- **구현(ModernGlass=book.pdf/kmong base, 비스코프 [data-type] → editorial/dashboard/bento 는 scoped 우선이라 영향 없음):**
  - v3 색상 토큰 추가(navy/blue/purple/green/amber/red/gray). 본문 16/1.7.
  - Table v2(기존 유지) · Checklist(연녹색 카드) · FAQ(연보라 Q/A) · Before/After(회색·파랑 헤더 카드) · Steps(파란 번호 원+연결선) · Quote(큰 따옴표 카드) · Warning(주황 노트) · Result(연파랑+별).
- **미구현(원고 블록/데이터 없음 → 추가 필요, 플래그):** Graph(차트 블록 없음), Info 3분할 카드(운영인원/제작기간/초기비용 — 블록 없음), Note 4종(현재 Warning 1종만 존재 / Note·Tip·Success 블록 없음), Component Palette(Badge/Status/Progress/Callout/Divider/Button — 콘텐츠 블록 아님), 표 행 아이콘·Before/After 화살표·Quote 저자·FAQ +버튼(데이터/아이콘 시스템 없음).
- **제약 준수** : Theme v4 보류, API 보류, GUI 미변경. 마크업 변경 없음(테스트 호환).
- **검증** : npm run build → 전 컴포넌트 CSS 반영, book.pdf 재생성(848KB). npm test 22 통과(API Key 없이).
- **status** : v3 1차 적용 완료. 미구현 항목(신규 블록 필요)은 코비 결정 대기.

## 2026-06-20 · Table v2 (코비 디자인 스펙 구현)

- **방식 전환** : 이후 코비가 디자인 스펙을 정하고 클로가 구현. ("예쁘게" 판단 금지, 스펙대로.)
- **구현** : TableCard/CompareCard 를 "정보 카드형"으로. 카드 컨테이너(흰 배경/#E6E9EF/ radius 18/약한 그림자/패딩 24/마진 20·28), 타이틀 24·800·#0D1B3D, 헤더 #0D1B3D 배경+흰 글씨 15·800·패딩16, 본문 15·lh1.6·#111827, 첫 열 700·#0D1B3D, zebra #F5F7FA. 비교표: 라벨 열 #F5F7FA, 마지막(추천) 열 #EAF2FB+네이비, 마지막 헤더 #14233B. ModernGlass(=book.pdf/kmong-preview) 적용, editorial/dashboard/bento 는 scoped 라 영향 없음.
- **알려진 갭** : "Table Title" 텍스트 소스 없음(마크다운 표에 제목 문법 없음) → 현재 블록 라벨(표/비교)을 타이틀로 표시. 표별 실제 제목은 입력 문법 추가(파서) 필요 — 별도 단계 제안.
- **검증** : npm run build → 적용 확인, book.pdf 재생성(772KB). npm test 22 통과(API Key 없이).
- **status** : Table v2 완료, 다음 Checklist 대기.

## 2026-06-20 · Engine Quality Improvement 착수 — (1) Table

- **전제(중요)** : 기존 "Engine 동결(버그 수정만)" → **품질 개선을 위해 Engine(layout/component/renderer) 수정 허용**으로 전환. 컴포넌트 단위·PDF 확인 방식, Table→Checklist→FAQ→Before/After→Card→본문 순.
- **(1) Table** : base 표 CSS(html-renderer, ModernGlass=stack=book.pdf/kmong-preview 적용) 개선 — 헤더 강조(800·2px navy underline·nowrap), zebra(짝수행 #f8fafc), 본문 15px·line-height 1.5, 셀 패딩 12/16(밀도↑), 줄바꿈 keep-all+overflow-wrap, vertical-align top, 첫 열 navy bold·nowrap. table-layout auto 유지(열 폭 자동). 카드형 테이블은 bento 테마에 이미 존재 — modern 은 정제된 표준 표 유지.
- **제약 준수** : Theme v4 보류, API 보류, src/studio·GUI 미변경. 마크업은 `<table>` 유지(테스트 호환). editorial/dashboard/bento 표는 각자 scoped CSS라 영향 없음.
- **검증** : npm run build → book.modern.html 에 신규 CSS 반영, book.pdf 재생성(708KB). npm test 22스위트 통과(API Key 없이).
- **status** : 1단계(Table) 완료, 다음 Checklist 대기.

## 2026-06-20 · First Usable Product — Electron GUI 착수

- **결정/조치** : 코지가 직접 쓸 수 있도록 데스크톱 GUI 추가. `gui/`(Electron, main.cjs/preload.cjs/index.html). **엔진 재개발 없음** — GUI 는 기존 `npm run build`(build-upload) 를 spawn 해 실행만 함. 흐름: 원고(.md) 선택 → 이미지 폴더 선택 → Build → 결과(book.pdf/docx/epub/kmong-preview.pdf + detail-images) 표시·열기. 미선택 시 기본값(input/book.md, assets/images/) 사용.
- **의존성** : electron 을 **devDependency** 로 추가(^42.4.1). 엔진(src/) 런타임은 여전히 외부 의존성 0 — electron 은 GUI 전용. node_modules 는 .gitignore 처리됨.
- **제약 준수** : Theme v4 중단(시안 보존), API Auto Mode 보류, src/studio 미변경, theme-engine 동결, Productization 재작업 없음.
- **검증** : electron v42.4.1 동작, GUI 스모크(SMOKE=1, 창 생성 후 자동 종료) exit 0, `npm run build` API Key 없이 정상, `npm test` 22스위트 통과. 실제 창 사용은 데스크톱 세션에서 `npm run gui`.
- **status** : 승인 (코지)

## 2026-06-20 · Theme v4 — 2차 시안 (방향 재설정: 매거진/이미지 주도)

- **배경** : 1차(editorial/luxury) 판정 D(수정) — "우…" 느낌, 둘 다 미채택. Gold/Emerald/블랙+금색 럭셔리 제거.
- **재설정** : 컬러 White·Warm Gray·Charcoal + Accent **Deep Navy 단독**. 레퍼런스 Apple/Notion/Stripe/Kinfolk/Monocle. **이미지 주도**(텍스트 중심 금지)·대담한 헤드라인·여백·카드형·그림자 최소. 전자책 표지 느낌 금지.
- **조치** : src/showcase/showcase-theme.ts 재작성, 시안 2종 변경 — `magazine`(페이퍼·세리프·에디토리얼) / `brand`(화이트·산세리프·모던). 실사진 부재 시 이미지 존을 미니멀 편집 그래픽(인라인 SVG, navy/warm/charcoal)으로 채움 → 실제 사진 들어오면 대체. build-showcase 가 output/showcase 정리 후 재생성.
- **제약 준수** : theme-engine v3 동결, build 파이프라인 미연결(kmong/detail 연결 금지), API/Electron 미착수, src/studio 미변경, Productization 재작업 없음. `npm test` 22 통과.
- **status** : 2차 시안 제출, 방향 확정 대기.

## 2026-06-20 · Theme v4 — Preview/Showcase Layer 착수 (시안 2종, 작게 시작)

- **결정/조치** : 엔진 밖 분리 레이어 `src/showcase/` 신설. **theme-engine(v3) 코어 동결 유지**(수정 0). 시안 2종 생성 — `editorial`(크림/세리프/네이비·골드), `luxury`(블랙/골드·에메랄드). `npm run showcase` → `output/showcase/showcase-*.pdf`. 렌더는 시스템 Chrome `--print-to-pdf` 재사용(엔진 export 와 동일 방식, 코어 미변경).
- **범위(승인 (B))** : 적용 우선순위 kmong-preview > detail-images > book.pdf. 단, "작게 시작 — 시안 먼저" 원칙대로 **현재는 시안만**, build 파이프라인에는 아직 미연결. 방향(어느 시안) 확정 후 연결.
- **디자인** : 고급 매거진/미니멀 럭셔리. White/Black/Warm Gray + Deep Navy/Gold/Emerald. 표지·목차·쇼케이스 3p. book.pdf/본문 PDF 는 Theme v3 그대로.
- **제약 준수** : Theme Engine 코어 동결, API 미구현, src/studio 미변경. `npm test` 22스위트 통과(시안은 빌드/테스트 무영향).
- **status** : 착수 승인(코지). 시안 방향 확정 대기.

## 2026-06-20 · STEP2 마감 — kmong-preview 페이지 수 현행 유지 (결정 C)

- **결정** : kmong-preview.pdf 페이지 수는 엔진 preview 프로파일 그대로 유지. 엔진 preview 프로파일 변경 금지, PDF 페이지 추출 미구현. Preview Theme 강화는 보류(Theme 작업 해제 시 별도 진행).
- **status** : 승인 (코지)

## 2026-06-20 · Productization STEP2 — 크몽 판매 자료 자동 준비

- **결정/조치** (전부 build-upload 래퍼, 엔진/테마 미변경, 기존 산출물 재사용):
  - (1) 크몽 미리보기: `output/book.preview.pdf` → `output/kmong-preview.pdf` 복사(엔진 preview profile 산출물 사용).
  - (2) 상세 이미지: `npm run build:marketing-assets` 재사용 → `output/detail-images/` 에 보기 좋은 이름으로 묶음(00-cover/01-promo-square/02-promo-story/chapter-NN). 렌더 실패해도 빌드 계속.
  - (3) Preview Theme: 별도 신규 테마(Theme v4)는 금지라 미착수. 미리보기/홍보 시각은 엔진의 canvas·preview-promo 마케팅 자산(과장된 상세/홍보 비주얼)으로 충당, 엔진 기본 PDF와 분리. 전용 강화 테마는 향후 Theme 작업으로 보류.
  - (4) UX: 빌드 완료 시 "Created: book.pdf/docx/epub/kmong-preview.pdf + Detail Images: N files" 요약 출력.
- **제약 준수** : Engine 코어 미변경, Theme v4 미착수, API Auto Mode 미구현, src/studio 미변경.
- **검증** : `npm run build` → book.pdf·docx·epub·kmong-preview.pdf + detail-images 6개(샘플 3챕터) + 요약 출력 확인. `npm test` 22스위트 통과(API Key 없이). detail-images/ 는 test 정리 대상 아님(유지).
- **status** : 승인 (코지)

## 2026-06-20 · Productization STEP1 — 샘플/문서/구조/오류 정비

- **결정/조치** :
  - (1) Sample Book: input/book.md 를 모든 요소(제목·챕터·이미지·표·체크리스트·FAQ·경고·Before/After·카드형 요약+steps/compare/prompt/quote)를 담은 **자기설명형 예제**로 교체. 원고 자체가 사용 설명서.
  - (2) Getting Started: README 최상단을 3단계(원고→이미지→`npm run build`)로 단순화.
  - (3) sample/ 폴더 구조 준비: `sample/README.md` + `sample/detail-images/.gitkeep`. (kmong-preview.pdf/detail-images는 구조만, 생성 기능 미구현)
  - (4) 오류 메시지 개선: build-upload 에 첫 사용자용 preflight 추가 — input/book.md 없으면 친절 안내 후 종료(엔진 스택 노출 방지). 이미지 누락 안내는 기존 유지.
- **제약 준수** : Engine 코어/Theme 미변경, API Auto Mode 미구현, src/studio 미삭제.
- **완료 기준** : 처음 보는 사람이 README→5분 내 book.pdf/docx/epub 생성. (예제 원고 내장 + `npm run build` 한 줄)
- **검증** : `npm run build` → 샘플로 PDF/DOCX/EPUB + book.pdf + missing-images(IMG-001~003) 생성. preflight 친절 안내 동작. `npm test` 22스위트 통과(API Key 없이).
- **status** : 승인 (코지)

## 2026-06-20 · Upload Mode 사용성 — 대표 PDF + 누락 이미지 안내

- **결정** : 비-엔진 래퍼 `src/build-upload.ts` 추가, `npm run build` 를 여기로 연결. (1) **대표 PDF = modern** → build:release 후 `output/book.modern.pdf` 를 `output/book.pdf` 로 복사(테마별 PDF는 그대로 유지). (2) **누락 이미지 안내** : 빌드 시 `assets/images/` 에 없는 이미지 슬롯 id 를 콘솔 + `output/missing-images.txt` 로 출력. 누락이 있어도 **빌드 실패 안 함**, 플레이스홀더 유지.
- **제약 준수** : 엔진 코어/렌더링 미변경(동결), API 미구현, src/studio 미삭제. 재사용: parseBook + buildImagePromptManifest + resolveImageAsset.
- **검증** : `npm run build` → book.pdf 생성 + 누락 2개(IMG-001/002) 안내 확인. `npm test` 22스위트 통과(API Key 없이).
- **status** : 승인 (코지)

## 2026-06-20 · Upload Mode 제품 플로우 정비

- **결정** : 기본 제품(Upload Mode) 사용 흐름을 정비. 입력 `input/book.md` + `assets/images/<슬롯id>.png` → `npm run build`(= build:release) → `output/`. `build` 스크립트 별칭 추가. README/CLAUDE.md 를 Upload Mode 중심으로 갱신. Engine 코드는 미변경(동결 유지) — 스크립트 별칭·문서만.
- **PDF** : 엔진 동결 사양상 단일 book.pdf 가 아니라 테마 4종(modern/editorial/dashboard/bento) + preview 1종. 판매용 대표 PDF 테마 확정은 코비(디자인) 결정 대기 — 확정 시 비-엔진 복사 스텝으로 `output/book.pdf` 제공 가능.
- **검증** : npm test 전체 통과, build:release 로 PDF/DOCX/EPUB 생성 확인, API Key 없이 정상 동작.
- **이유** : "팔 수 있는 Upload Mode 제품" 완성. API 구현 금지·src/studio 삭제 금지·Hybrid 유지.
- **status** : 승인 (코지)

## 2026-06-20 · 방향 보완 — Hybrid (Content Assembly 기본 + API Auto Mode 선택)

- **결정** : Content Assembly Engine 을 기본으로 유지하되, AI API 기능을 **완전 제거하지 않고 선택형 API Auto Mode** 로 분리 제공. → Hybrid Publishing/Shorts Engine. 직전 "AI 생성기 폐기/AI API 전면 제거" 결정을 이 결정으로 보완(완전 제거 아님).
- **모드** : (1) Upload Mode(기본, 운영비 0, API 무의존) (2) API Auto Mode(선택, 사용자 API Key, 비용 사용자 부담). UI/코드/테스트에서 분리. **키 없으면 호출 안 함 + 키 없어도 모든 테스트/빌드 통과.**
- **조치** : **src/studio 삭제 금지** — 기존 생성기 코드는 API Auto Mode 후보로 보존, 메인 플로우 즉시 연결 금지. 직전 결정의 "src/studio 제거 후보"는 **철회**. 현재 코드는 이미 scaffold 전용(API 무의존)이라 키 없이 전부 통과.
- **이유** : 기본 무료/무의존을 지키면서 고급 사용자에게 자동 생성 선택지 제공.
- **status** : 승인 (코지)

## 2026-06-20 · 방향 최종 확정 — Content Assembly Engine (AI 생성기 폐기) [위 결정으로 보완됨]

- **결정** : "AI 생성기" 방향 폐기. **Content Assembly Engine**(콘텐츠 조립 엔진)으로 확정. 모든 AI API 자동 호출 제거, 원고·이미지는 사용자가 직접 준비, 프로그램은 조립(Assembly)·완성(Finishing)에 집중, 운영비 0원. PROJECT_CONSTITUTION.md 를 최신 공통 기준정보로 덮어씀. "주제 입력→원고 생성→이미지 생성" 흐름 폐기.
- **조치(이번 커밋)** : src/studio 의 Claude API 자동 호출(claude 모드, fetch 기반) 전부 제거 — body-generator/generate-manuscript scaffold 전용으로 환원, GenerationMode 타입 제거, 관련 테스트 정리.
- **미결(승인 대기)** : src/studio 의 "원고 생성기"(chapter-planner + scaffold body) 자체가 폐기된 생성 방향이라 제거 후보. 대규모 삭제는 글로벌 §9 따라 승인 후 진행.
- **이유** : AI API 의존성·운영비 제거, 외부 서비스 변화 영향 최소화, 엔진 재사용·상품화.
- **status** : 승인 (코지)

## 2026-06-20 · claude 모드 기본 모델 저비용화 (위 결정으로 폐기됨)

- **결정** : claude 모드 기본 모델을 claude-opus-4-8 → **claude-haiku-4-5**(저비용)로 변경. 고품질은 사용자가 `--model claude-opus-4-8` 로 지정. thinking/effort 옵션은 아직 미추가.
- **이유** : 기본 실행 비용 절감. 고품질은 필요 시 명시적으로 선택.
- **status** : 승인 (코지)

## 2026-06-20 · 본문 생성 — scaffold(기본) + claude API 옵션

- **결정** : 본문 생성에 두 방식 지원. `scaffold`(기본, 비용 0·오프라인·키 불필요) + `claude`(Claude API, 판매용 품질). 기본값 scaffold 유지, claude 는 옵션(`--mode claude`). 외부 의존성 0 원칙 유지 위해 SDK 대신 Node 내장 fetch 로 호출. 모델 기본값 claude-opus-4-8. API 키(ANTHROPIC_API_KEY) 없으면 claude 모드는 명확한 에러 후 미실행.
- **이유** : 코지가 직접 쓰는 내부 제작 시스템이라 API 사용 허용. 테스트/구조 검증은 키 없이 가능해야 함.
- **status** : 승인 (코지)

## 2026-06-20 · 헌법 간소화 — 운영/형식 규칙 정리

- **결정** : 글로벌·프로젝트 헌법을 간소화 버전으로 교체. 관료적 운영 규칙·과도한 형식 규칙·복잡한 문서 구조 폐기. 통신은 "블록 전달 원칙"만 유지. CLAUDE.md 에서 완료 보고 양식/변경 표시 규칙 제거.
- **이유** : 개발 속도 우선, 사람 병목 제거, 단순화(글로벌 §11·§12).
- **status** : 승인 (코지)

## 2026-06-20 · v2 방향 전환 — 생산 시스템 + 원고 생성기 우선

- **결정** : 목표를 "전자책 한 권"에서 "주제 입력 → 판매 가능 전자책을 지속 생산하는 시스템"으로 전환. 첫 개발 범위(STEP 1)는 **원고 생성기**(주제→챕터 구성→본문 생성→원고 승인). 대본·이미지·전자책 생성·출간 자동화는 이후 단계.
- **이유** : 1인 기업 · 자동화 · 수익화 방향(글로벌 §13·§17). 작게 시작해 실사용 후 확장(글로벌 §10·§11).
- **status** : 승인 (코지)

## 2026-06-20 · Living Document 문서 체계 도입

- **결정** : 루트 최상위에 `00_GLOBAL_CONSTITUTION.md`(회사 공통) + `00_PROJECT_CONSTITUTION.md`(프로젝트 기준정보) 배치. 내부 문서는 `CLAUDE.md` + `DECISIONS.md` 로 시작하고 필요 시 README · BACKLOG 추가. ROADMAP · IDEAS 는 사용하지 않음. 기존 설계 문서(`docs/00~11`, `*_FEASIBILITY.md`)는 향후 아카이브 대상으로 분류.
- **이유** : 문서-구현 드리프트 방지. 새 세션/채팅에서도 동일 기준으로 작업. 문서 관리 비용 최소화.
- **status** : 승인 (코지)

## 2026-06-20 · Engine v1.0 동결

- **결정** : Engine(파서 → AST → 페이지 → 컴포넌트 → 레이아웃 → HTML/PDF/DOCX/EPUB/미리보기/마케팅) 기능 동결. **버그 수정만 허용**. 신규 기능은 상위 생산 시스템에서 구현하고 Engine 은 백엔드로 사용.
- **이유** : 20 스위트 / 636 체크 통과로 안정화 완료. 추가 기능으로 인한 회귀 위험 차단.
- **status** : 승인 (코지)
