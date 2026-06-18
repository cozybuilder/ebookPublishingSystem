# Ebook Publishing System — 변환 파이프라인 정의 v0.1

이 문서는 `input/book.md` 한 개의 입력이 최종 출력물(PDF, DOCX, 크몽 미리보기, 상세페이지 이미지)까지
변환되는 **전체 흐름과 각 단계의 책임·산출물**을 정의한다.

> 본 단계는 **파이프라인 구조 정의**다.
> 파서 구현 / AST 타입 설계 / PDF·DOCX 생성 / 템플릿 엔진 / 디자인 시스템 세부 스타일은 포함하지 않는다.
> 산출물은 자연어 수준으로만 기술한다(구체 JSON/TypeScript 스키마는 이후 단계에서 확정).

관련 문서: [입력 언어 규약](01_MARKDOWN_RULES.md) · [페이지 타입](02_PAGE_TYPES.md) · [컴포넌트](03_COMPONENTS.md)

---

## 전체 흐름

```text
book.md 입력
   ↓
[1] Markdown 분석
   ↓
[2] Block 추출
   ↓
[3] 중간 데이터 구조 생성
   ↓
[4] Page 구성
   ↓
[5] Component 매핑
   ↓
[6] Layout 적용 (CozyBuilder Lab 디자인 시스템)
   ↓
[7] Output
       ├─ PDF
       ├─ DOCX
       ├─ 크몽 미리보기 PDF
       └─ 상세페이지 이미지
```

파이프라인은 **단방향**이다. 각 단계는 앞 단계의 산출물만 입력으로 받고,
자기 책임 범위만 처리한 뒤 다음 단계로 넘긴다(관심사 분리).

---

## 단계별 책임과 산출물

### [입력] book.md

- **내용** : Markdown + Container Block(v0.2) 규약으로 작성된 원고 1개.
- **다음 단계로 넘기는 것** : 원고 전체 텍스트.

### [1] Markdown 분석

- **책임** : 원고를 줄/구문 단위로 훑어 **구조적 요소**를 인식한다.
  - 책 제목(`#`)
  - 메타데이터(`subtitle:`, `author:`)
  - 챕터 경계(`## Chapter N.`)
  - Container Block 경계(`:::블록이름` … `:::`)
  - 표준 Markdown(단락, 표, 인용문, 리스트)
- **산출물** : 원고를 위에서 아래로 나열한 **요소 시퀀스**.
  각 요소는 "무엇인지(종류)"와 "원본 내용"을 가진다.
  - 예: [제목] → [메타: subtitle] → [메타: author] → [챕터: 1, "시작하기 전에"]
    → [본문 단락] → [블록: image, 원본] → [블록: checklist, 원본] → …

### [2] Block 추출

- **책임** : 1단계가 식별한 Container Block의 **내부를 종류별로 해석**한다.
  - 9종 구분: `checklist`, `compare`, `before-after`, `prompt`, `steps`, `faq`, `warning`, `result`, `image`
  - 내부 형식 3패턴으로 파싱:
    - 리스트형(checklist, steps) → 항목 배열
    - key:value형(image, before-after, faq, compare) → 키별 값
    - 자유텍스트형(prompt, warning, result) → 본문 텍스트
- **산출물** : 의미가 부여된 **블록 객체 시퀀스**.
  각 블록은 "타입 + 정리된 내용 필드"를 가진다.
  - 예: checklist → { type: checklist, items: [...] }
        image → { type: image, id, type(이미지유형), prompt }

### [3] 중간 데이터 구조 생성

- **책임** : 1·2단계 결과를 **하나의 책 문서 모델**로 합친다.
  - 책 메타데이터(제목/부제/저자)를 한곳에 모은다.
  - 챕터별로 소속 블록·본문을 묶어 **순서가 보존된 트리/목록** 구조를 만든다.
- **산출물** : "책 = 메타데이터 + 챕터들, 챕터 = 제목 + 콘텐츠 블록 순서열"
  형태의 **중간 데이터 구조**(구조만 정의, 스키마는 이후 확정).
  이 구조가 이후 모든 출력의 단일 원본(Single Source)이 된다.

### [4] Page 구성

- **책임** : 중간 데이터 구조를 **페이지 단위**로 묶는다.
  - 자동 페이지 삽입: CoverPage, CopyrightPage, TableOfContentsPage, ChapterPage
  - 콘텐츠를 ContentPage 등으로 배치(본문 흐름 + 카드형 블록 동반)
  - steps는 **별도 페이지로 분리하지 않고** ContentPage 안에 둔다(PM 확정).
  - 강조형 요소(예: 분량 많은 checklist/compare)는 필요 시 전용 페이지로 분리.
- **산출물** : **순서가 확정된 Page 목록**.
  각 Page는 "페이지 타입 + 그 안에 들어갈 블록들의 순서"를 가진다.

### [5] Component 매핑

- **책임** : 각 Page 안의 블록을 **렌더링 가능한 컴포넌트**로 변환한다.
  - checklist → ChecklistCard, compare → CompareCard,
    before-after → BeforeAfterCard, prompt → PromptCard, steps → StepsCard,
    faq → FAQCard, warning → WarningCard, result → ResultCard, image → ImageBlock
  - 제목/부제/저자/본문 → TitleBlock / SubtitleBlock / AuthorBlock / ParagraphBlock
- **산출물** : 각 Page가 **컴포넌트 인스턴스 목록**으로 채워진 구조.
  각 컴포넌트는 "컴포넌트 종류 + 표시에 필요한 입력 데이터"를 가진다(스타일 미적용 상태).

### [6] Layout 적용 (CozyBuilder Lab 디자인 시스템)

- **책임** : 컴포넌트에 **시각 규칙**을 입힌다.
  - 폰트, 컬러, 여백, 카드 스타일, 페이지 마진 등 디자인 시스템 적용
  - 페이지 분할/넘침 처리, 챕터 표지 스타일, 이미지 슬롯 배치
  - (세부 스타일 값은 별도 디자인 시스템 문서에서 정의 — 이번 단계 범위 밖)
- **산출물** : **레이아웃이 확정된 페이지 표현**.
  각 출력 포맷으로 내보낼 수 있도록 위치·크기·스타일이 결정된 상태.

### [7] Output

- **책임** : 레이아웃 결과를 **각 포맷으로 내보낸다**. 단일 원본에서 다중 출력.
  - **PDF** : 최종 전자책 본편.
  - **DOCX** : 편집 가능한 문서 버전.
  - **크몽 미리보기 PDF** : 일부 페이지만 추린 판매용 미리보기.
  - **상세페이지 이미지** : 크몽 상품 상세용 이미지(표지/썸네일/주요 페이지 캡처 등).
- **산출물** : `output/` 폴더에 저장되는 결과 파일들.

---

## 단계별 산출물 요약표

| 단계 | 입력 | 산출물(다음 단계로 넘기는 것) |
| --- | --- | --- |
| 입력 | — | book.md 원문 |
| 1. Markdown 분석 | 원문 | 종류가 표시된 요소 시퀀스 |
| 2. Block 추출 | 요소 시퀀스 | 타입+내용이 정리된 블록 객체 시퀀스 |
| 3. 중간 데이터 구조 | 요소+블록 | 책 문서 모델(메타+챕터+블록 순서) |
| 4. Page 구성 | 책 문서 모델 | 순서 확정된 Page 목록 |
| 5. Component 매핑 | Page 목록 | 컴포넌트로 채워진 Page 구조 |
| 6. Layout 적용 | 컴포넌트 Page | 스타일·배치 확정된 페이지 표현 |
| 7. Output | 레이아웃 페이지 | PDF / DOCX / 미리보기 PDF / 상세 이미지 |

---

## 검증

- **파서 테스트** : [1]~[3]단계(Markdown 분석 → Block 추출 → AST)는
  `npm run test:parser`로 검증한다. `samples/parser-sample.md`를 입력으로 11종 블록의
  타입·순서·내부 형식, 표준 표 → `table` 인식, image 입력 `type:` → `imageType` 저장,
  파이프 포함 문장의 표 오인 방지를 확인한다(의존성 0, Node 기본 기능만 사용).

---

## 설계 원칙

1. **단일 원본, 다중 출력** : 3단계의 중간 데이터 구조가 모든 출력의 기준.
   포맷이 늘어나도 1~6단계는 재사용한다.
2. **관심사 분리** : 의미 해석(1~3) / 지면 구성(4~5) / 시각화(6) / 내보내기(7)를 분리.
3. **순서 보존** : 원고의 등장 순서가 모든 단계에서 유지되어야 한다.

---

본 정의는 v0.1 기준안이며, 구현 착수 단계에서 보완될 수 있다.
