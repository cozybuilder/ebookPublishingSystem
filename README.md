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

### 산출물 생성 (실제 `output/`)
- `npm run build:html` — 책 HTML 5종 + 미리보기(`book.preview.html`)
- `npm run build:canvas` — 캔버스 detail/square/story
- `npm run build:canvas:sparse` — 폴백 검증용 sparse 캔버스
- `npm run export:png` — 캔버스 HTML → PNG (시스템 Chrome/Edge headless, 의존성 0)
  - 사전: `npm run build:canvas` 로 HTML 생성
  - 산출: `output/canvas.detail.png` / `canvas.square.png`(1080×1080) / `canvas.story.png`(1080×1920)
  - 브라우저 탐지: `CHROME_PATH` 환경변수 우선 → Windows 기본 Chrome → Edge
    - override 예: `set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe`
  - detail 은 v1에서 전체 페이지(가변 높이)를 window 높이 기준으로 캡처(아래 한계 참고)
  - PNG 는 재생성 가능한 산출물이라 git 추적 제외(`output/*.png`)
- 그 외: `build:pages` / `build:components` / `build:layout`, `parse`

### 테스트
- **개발 중**: 필요한 개별 테스트만 (`npm run test:parser` 등)
- **커밋 전**: `npm test` (= `npm run test:all`) — 전체 일괄 실행
  - 순서: parser → pages → components → layout → html → theme → canvas →
    selector → book-selector → isolation (격리 검증은 항상 마지막)
  - 하나라도 실패하면 전체 실패.
- **출력 격리**: 테스트는 `tmp/test-output/`에만 기록하며 실제 `output/`은 건드리지 않는다.
  (`npm run test:isolation`이 해시로 보증, `npm run clean:test-output`으로 정리)

## 최상위 기준 문서

- `docs/00_PROJECT_CONSTITUTION.md`
