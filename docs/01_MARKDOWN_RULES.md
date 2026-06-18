# Ebook Publishing System — Markdown 작성 규약 v0.2

이 문서는 `input/book.md` 원고를 시스템이 자동 인식하기 위해 사용하는 전자책 전용 Markdown 규칙을 정의한다.

> 본 단계는 **입력 언어 확정**이다. 파서 / JSON AST / 렌더러 / PDF / DOCX / 템플릿 구현은 포함하지 않는다.

> **v0.2 변경점:** 기존 code fence(```` ```블록이름 ````) 방식을 폐기하고
> **Markdown + Container Block** 방식으로 통일한다.
> 사람이 읽기 쉽고, 중첩 구조·컴포넌트 확장에 유리하며, 이미지 슬롯 시스템과 잘 맞기 때문이다.

---

## 1. 기본 원칙

1. Markdown 원고는 **사람이 쓰기 쉽고 읽기 쉬워야** 한다.
2. 동시에 시스템이 **자동 인식할 수 있을 만큼 규칙적**이어야 한다.
3. 가능한 한 **표준 Markdown 문법을 그대로 유지**한다. (제목, 본문, 표, 인용문, 리스트 등)
4. 표준 문법으로 표현하기 어려운 **특수 시각 요소**만 **Container Block**으로 작성한다.
5. 메타데이터(부제·저자 등)는 본문 상단에 `key: value` 형식으로 적는다.

---

## 2. Container Block 표기법

특수 시각 요소는 **콜론 3개(`:::`)** 로 감싸는 컨테이너 블록으로 표기한다.

```text
:::블록이름
내용
:::
```

- **시작 줄**: `:::` + 블록 이름 (예: `:::checklist`)
- **종료 줄**: `:::` (단독)
- 블록 내부는 블록 종류에 따라 **리스트** 또는 **`key: value`** 형식을 사용한다.
- 블록은 **중첩**할 수 있다. 중첩 시 안쪽 블록을 먼저 닫는다.

```text
:::warning
주의할 내용
  :::checklist
  - 중첩된 항목
  :::
:::
```

> Container Block은 사람이 읽었을 때 시작과 끝이 명확하고,
> 콜론 펜스 안에 다른 블록을 넣을 수 있어 향후 컴포넌트 확장에 유리하다.

---

## 3. 페이지 / 요소 타입 규약

| 타입 | 분류 | 표기 방법 |
| --- | --- | --- |
| 제목 (title) | 표준 | `# 책 제목` (문서 최상단 1개) |
| 부제 (subtitle) | 메타 | `subtitle: 부제목` |
| 저자 (author) | 메타 | `author: 저자명` |
| 챕터 (chapter) | 표준 | `## Chapter 1. 챕터 제목` |
| 일반 본문 (body) | 표준 | 일반 단락 텍스트 |
| 표 (table) | 표준 → table 블록 | Markdown 표 문법 (`|` 구분). 별도 Container Block 없이 표준 표 문법으로 작성하며, 시스템은 이를 `table` 블록으로 인식한다. |
| 인용문 (quote) | 표준 | `> 인용 내용` |
| 체크리스트 (checklist) | Container Block | `:::checklist` |
| 비교표 (compare) | Container Block | `:::compare` |
| Before / After | Container Block | `:::before-after` |
| 프롬프트 박스 (prompt) | Container Block | `:::prompt` |
| 단계 설명 (steps) | Container Block | `:::steps` |
| FAQ | Container Block | `:::faq` |
| 주의 박스 (warning) | Container Block | `:::warning` |
| 결과 요약 (result) | Container Block | `:::result` |
| 이미지 슬롯 (image) | Container Block | `:::image` |

---

## 4. 기본 규약 상세

### 4.1 메타데이터 (문서 상단)

```text
# 책 제목

subtitle: 부제목
author: CozyBuilder Lab
```

- `# 책 제목` : 문서 전체에서 **1개**, 최상단.
- `subtitle:` , `author:` : 제목 바로 아래에 한 줄씩.

### 4.2 챕터

```text
## Chapter 1. 챕터 제목
```

- 형식: `## Chapter {번호}. {제목}`
- 챕터 시작 페이지는 시스템이 자동 생성한다.

### 4.3 표 — `table`

```text
| 유형 | 소요 시간 | 난이도 |
| --- | --- | --- |
| 아침 루틴 | 20분 | 중 |
| 저녁 루틴 | 15분 | 하 |
```

- 표는 **별도 Container Block을 쓰지 않고 표준 Markdown 표 문법**으로 작성한다.
- 시스템은 표준 표를 `table` 블록으로 인식한다.
- 첫 행은 헤더(열 제목), 둘째 행은 구분선(`---`), 이후가 데이터 행.
- **`table` vs `compare`** : `table`은 정보를 정리하는 일반 표,
  `compare`는 두 대상이나 여러 선택지를 강조해 비교하는 카드형 요소다. 용도가 다르다.

---

## 5. 표준 Container Block 정의

### 5.1 체크리스트 — `checklist`

```text
:::checklist
- 체크 항목 1
- 체크 항목 2
:::
```

- 내부는 `-` 리스트 항목.

### 5.2 비교표 — `compare`

```text
:::compare
columns: 유형, 소요 시간, 난이도
- 아침 루틴, 20분, 중
- 저녁 루틴, 15분, 하
:::
```

- 첫 줄 `columns:` 에 열 제목을 쉼표로 구분.
- 이후 각 행을 `-` 리스트로, 셀을 쉼표로 구분.

### 5.3 Before / After — `before-after`

```text
:::before-after
before: 이전 상태
after: 이후 상태
:::
```

- `before:` , `after:` 두 키를 포함.

### 5.4 프롬프트 박스 — `prompt`

```text
:::prompt
프롬프트 내용을 여기에 작성
:::
```

- 내부는 자유 텍스트. 여러 줄 허용.

### 5.5 단계 설명 — `steps`

```text
:::steps
- 1단계 내용
- 2단계 내용
- 3단계 내용
:::
```

- 내부는 `-` 리스트. 순서가 자동으로 번호로 변환된다.

### 5.6 FAQ — `faq`

```text
:::faq
q: 질문 내용
a: 답변 내용
q: 두 번째 질문
a: 두 번째 답변
:::
```

- `q:` / `a:` 쌍을 반복.

### 5.7 주의 박스 — `warning`

```text
:::warning
주의할 내용을 작성
:::
```

### 5.8 결과 요약 — `result`

```text
:::result
핵심 결과 요약
:::
```

### 5.9 이미지 슬롯 — `image`

```text
:::image
id: IMG-001
type: cover
prompt: 표지 이미지 설명
:::
```

- 필수 키: `id`, `type`, `prompt`
- `id` : 고유 식별자 (예: `IMG-001`)
- `type` : `cover` / `chapter` / `thumbnail` 등 (AI 이미지 우선 적용 대상)
- `prompt` : 이미지 생성용 설명

---

## 6. 인식 우선순위 (요약)

1. 문서 최상단 `#` → 책 제목
2. `subtitle:` / `author:` → 메타데이터
3. `## Chapter N.` → 챕터 경계
4. `:::블록이름` … `:::` → Container Block (특수 시각 요소)
5. 그 외 표준 Markdown → 본문 / 표 / 인용문 / 리스트

---

## 7. 표준 블록 목록

`checklist` · `compare` · `before-after` · `prompt` · `steps` · `faq` · `warning` · `result` · `image`

---

본 규약은 v0.2 기준안이며, 렌더링 엔진 설계 단계에서 보완될 수 있다.
