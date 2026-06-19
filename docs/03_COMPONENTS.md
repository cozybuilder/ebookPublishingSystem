# Ebook Publishing System — 컴포넌트 정의 v0.1

이 문서는 페이지를 구성하는 **컴포넌트**(재사용 가능한 시각 단위)를 정의한다.
각 컴포넌트는 입력 블록 데이터를 받아 일정한 출력 형태로 렌더링된다.

> 본 단계는 **컴포넌트 구조 정의**다. 파서 / JSON AST / 렌더러 / PDF / DOCX / 템플릿 구현은 포함하지 않는다.

관련 문서: [입력 언어 규약](01_MARKDOWN_RULES.md) · [페이지 타입 정의](02_PAGE_TYPES.md)

---

## 개념

- **컴포넌트(Component)** : 페이지를 구성하는 최소 시각 단위.
- 입력 블록 → 컴포넌트 → 페이지 배치 순으로 변환된다.
- "입력 데이터"는 파싱 후 컴포넌트에 전달될 **논리적 필드**를 의미한다(구체 스키마는 AST 단계에서 확정).

---

## 1. TitleBlock

- **역할** : 책 제목을 표시.
- **입력 데이터** : `text` (책 제목, `#`)
- **예상 출력** : 표지 대형 타이틀 텍스트. 최상위 위계.

## 2. SubtitleBlock

- **역할** : 부제를 표시.
- **입력 데이터** : `text` (`subtitle:`)
- **예상 출력** : 제목 아래 보조 타이틀. 중간 위계.

## 3. AuthorBlock

- **역할** : 저자/브랜드명을 표시.
- **입력 데이터** : `text` (`author:`)
- **예상 출력** : 표지·판권의 저자 표기. 소형 텍스트.

## 4. ParagraphBlock

- **역할** : 일반 본문 단락을 표시.
- **입력 데이터** : `text` (단락 텍스트, 인라인 강조 포함 가능)
- **예상 출력** : 가독성 위주의 본문 단락.

## 4-1. QuoteBlock

- **역할** : 인용문(Markdown `>`)을 표시. 본문 강조 문장 / 상세페이지 문구 / 후기.
- **입력 데이터** : `text` (여러 줄 `>` 는 하나로 병합)
- **예상 출력** : blockquote. 테마별 표현 차이
  (Modern=차분한 인용 카드 / Bento=강한 메시지 카드 / Editorial=매거진 인용문).

## 5. TableCard

- **역할** : 일반 정보 표(표준 Markdown 표 = `table` 블록)를 시각적으로 정리해 표시.
- **입력 데이터** : `columns: string[]`, `rows: string[][]`
- **예상 출력** : 헤더 행 + 데이터 행으로 구성된 정돈된 표.
- **CompareCard와의 구분** : TableCard는 **정보 정리**가 목적인 일반 표다.
  여러 항목·속성을 행/열로 나열해 읽기 좋게 보여준다(강조보다 정리).
  대상 간 우열·차이를 강조하는 비교는 CompareCard가 담당한다.

## 6. ChecklistCard

- **역할** : 체크리스트(`:::checklist`)를 카드로 표시.
- **입력 데이터** : `items: string[]`
- **예상 출력** : 체크박스(☐) + 항목 텍스트 리스트 카드.

## 7. CompareCard

- **역할** : 비교표(`:::compare`)를 카드형 비교 컴포넌트로 표시.
- **입력 데이터** : `columns: string[]`, `rows: string[][]`
- **예상 출력** : 선택지/대상별 비교 카드 그리드(또는 강조형 비교 표).
- **TableCard와의 구분** : CompareCard는 **두 대상이나 여러 선택지를 비교**해
  차이·우열을 부각하는 것이 목적이다. 단순 정보 나열용 표는 TableCard를 쓴다.

## 8. BeforeAfterCard

- **역할** : 전후 비교(`:::before-after`)를 대비 표시.
- **입력 데이터** : `before: string`, `after: string`
- **예상 출력** : 좌/우(또는 상/하) 2분할 대비 카드.

## 9. PromptCard

- **역할** : 프롬프트(`:::prompt`)를 복사 친화적 박스로 표시.
- **입력 데이터** : `text` (여러 줄 허용)
- **예상 출력** : 모노/박스 스타일 강조 카드.

## 10. StepsCard

- **역할** : 단계 설명(`:::steps`)을 순서형으로 표시.
- **입력 데이터** : `items: string[]`
- **예상 출력** : 자동 번호(1, 2, 3 …) + 단계 텍스트 리스트.

## 11. FAQCard

- **역할** : FAQ(`:::faq`)의 질문/답변 쌍을 표시.
- **입력 데이터** : `pairs: { q: string, a: string }[]`
- **예상 출력** : 질문 강조 + 답변 들여쓰기 반복 블록.

## 12. WarningCard

- **역할** : 주의(`:::warning`) 사항을 강조 표시.
- **입력 데이터** : `text`
- **예상 출력** : 경고색 + 아이콘 강조 박스.

## 13. ResultCard

- **역할** : 결과 요약(`:::result`)을 강조 표시.
- **입력 데이터** : `text`
- **예상 출력** : 핵심 요약 강조 박스.

## 14. ImageBlock

- **역할** : 이미지 슬롯(`:::image`)을 표시/예약.
- **입력 데이터** : `id`, `type`(cover/chapter/thumbnail 등), `prompt`
- **예상 출력** : 이미지 영역(또는 생성 전 자리표시). 캡션 동반 가능.

---

## 구조 컴포넌트 (자동 페이지용)

> 아래 3종은 입력 블록이 아니라 **메타데이터/챕터 구조에서 파생되는 자동 페이지**
> (Cover/Chapter/TOC/Copyright)를 구성하기 위한 구조 컴포넌트다. PM 승인으로 정식 반영.

## 15. ChapterHeading

- **역할** : ChapterPage 의 챕터 제목 표시.
- **입력 데이터** : `number`, `title` (Chapter 에서 파생)
- **예상 출력** : 챕터 번호 + 제목의 큰 헤딩.

## 16. TableOfContentsList

- **역할** : TableOfContentsPage 의 목차 항목 목록.
- **입력 데이터** : `entries: { number, title }[]` (전체 Chapter 에서 파생)
- **예상 출력** : 챕터 번호 + 제목(+ 추후 페이지 번호) 목록.

## 17. CopyrightNotice

- **역할** : CopyrightPage 의 판권 고지.
- **입력 데이터** : `text` (v0.1 임시 고정 텍스트 — 발행일/ISBN 등 세부 규약은 v0.2)
- **예상 출력** : 저작권/발행 정보 텍스트 블록.

---

## 블록 ↔ 컴포넌트 매핑 요약

| 입력 요소 | 컴포넌트 | 입력 데이터 형태 |
| --- | --- | --- |
| `#` | TitleBlock | text |
| `subtitle:` | SubtitleBlock | text |
| `author:` | AuthorBlock | text |
| 일반 단락 | ParagraphBlock | text |
| 인용문 (`>`) | QuoteBlock | text |
| Markdown 표 (table) | TableCard | columns[], rows[][] |
| `:::checklist` | ChecklistCard | items[] |
| `:::compare` | CompareCard | columns[], rows[][] |
| `:::before-after` | BeforeAfterCard | before, after |
| `:::prompt` | PromptCard | text |
| `:::steps` | StepsCard | items[] |
| `:::faq` | FAQCard | pairs[] |
| `:::warning` | WarningCard | text |
| `:::result` | ResultCard | text |
| `:::image` | ImageBlock | id, type, prompt |
| (Chapter 파생) | ChapterHeading | number, title |
| (Chapters 파생) | TableOfContentsList | entries[] |
| (Metadata 파생) | CopyrightNotice | text |

---

본 정의는 v0.1 기준안이며, 렌더링/디자인 시스템 설계 단계에서 보완될 수 있다.
