# CLAUDE.md — Ebook Publishing System

## 최상위 기준

작업 전 두 문서를 읽는다. 기억보다 문서를 우선한다.

1. [GLOBAL_CONSTITUTION.md](GLOBAL_CONSTITUTION.md)
2. [PROJECT_CONSTITUTION.md](PROJECT_CONSTITUTION.md)

## 현재 목표

- **방향 : Hybrid Publishing/Shorts Engine** — 기본은 Content Assembly Engine, 선택적으로 API Auto Mode.
- **기본(Upload Mode)** : 사용자가 Markdown 원고 + 이미지 업로드 → 챕터 구성 / 표 / 체크리스트 / 인포그래픽 / 이미지 배치 / 레이아웃·테마 → PDF / DOCX / EPUB / 미리보기 / 크몽 샘플. **운영비 0원, API 의존성 없음.**
- **선택(API Auto Mode)** : 사용자가 자기 API Key 입력 시에만 자동 생성. **키 없으면 호출 안 함, 키 없어도 모든 테스트/빌드 통과.** UI/코드/테스트에서 기본 모드와 분리.
- **Engine v1.0** : 기존 조립 파이프라인이 곧 기본 제품 (버그 수정만).
- **src/studio** : 삭제 금지. 기존 생성기 코드는 **API Auto Mode 후보로 보존**(메인 플로우 즉시 연결 금지).

## 빌드 / 실행

- 빌드 도구 없음. Node ≥ 22.6 타입 스트리핑으로 `.ts` 직접 실행. erasable syntax only.
- 상대 import 는 `.ts` 확장자. `package.json` 은 `"type": "module"`. 외부 의존성 0.
- **Upload Mode 플로우** : `input/book.md` + `assets/images/<슬롯id>.png` → `npm run build` → `output/` (전자책: book.pdf(대표=modern)·book.docx·book.epub + 판매 자료: kmong-preview.pdf·detail-images/ + book.<theme>.pdf·HTML·missing-images.txt)
- `npm run build` = `src/build-upload.ts`(비-엔진 래퍼) : build:release → modern→book.pdf 복사 → book.preview.pdf→kmong-preview.pdf → build:marketing-assets 재사용해 detail-images/ 묶음 → 누락 이미지 안내 → 요약 출력. **엔진 코어/테마 미변경**.
- 명령 : 빌드 `npm run build` · 엔진 파이프라인만 `npm run build:release` · 파싱 `npm run parse` · 테스트 `npm test` · **데스크톱 GUI `npm run gui`**
- 기본 플로우는 **API 무의존** — API Key 없이 빌드·테스트 전부 통과해야 한다.
- **GUI** : `gui/`(Electron, .cjs main/preload). 엔진 재구현 없이 `npm run build` 를 실행만 한다. Electron 은 GUI 전용 devDependency — **엔진(src/) 런타임은 여전히 외부 의존성 0**.

## 소통

- 클로 → 코비 보고는 하나의 ```text 블록으로 작성한다. (블록 전달 원칙)
