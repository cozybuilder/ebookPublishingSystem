# Ebook Publishing System — 페이지 타입 정의 v0.1

이 문서는 입력 언어(`book.md`, Markdown + Container Block v0.2)가
출력 단계에서 어떤 **페이지 타입**으로 변환되는지를 정의한다.

> 본 단계는 **출력 구조 정의**다. 파서 / JSON AST / 렌더러 / PDF / DOCX / 템플릿 구현은 포함하지 않는다.

관련 문서: [입력 언어 규약](01_MARKDOWN_RULES.md) · [컴포넌트 정의](03_COMPONENTS.md)

---

## 개념

- **페이지(Page)** : 출력물에서 하나의 화면/지면 단위. 여러 **컴포넌트**를 담는다.
- 페이지 타입은 크게 두 부류다.
  - **시스템 자동 생성 페이지** : 표지, 판권, 목차, 챕터 표지 등 (원고에 직접 쓰지 않음)
  - **콘텐츠 기반 페이지** : 본문과 Container Block에서 파생됨
- 한 페이지에 여러 블록이 함께 흐를 수 있다(예: ContentPage). 강조형 요소는 전용 페이지로 분리될 수 있다.

---

## 1. CoverPage (표지)

- **목적** : 전자책의 첫인상. 제목·부제·저자·표지 이미지를 보여준다.
- **포함 가능한 블록** : TitleBlock, SubtitleBlock, AuthorBlock, ImageBlock(type: cover)
- **배치** : 전체 화면 단일 이미지 위에 제목/부제/저자를 배치. 문서 최상단 1회.

## 2. CopyrightPage (판권)

- **목적** : 저작권·발행 정보 고지.
- **포함 가능한 블록** : ParagraphBlock(저작권 문구), AuthorBlock, 발행 메타데이터
- **배치** : 표지 다음 또는 책 마지막. 텍스트 중심, 여백이 많은 정적인 지면.

## 3. TableOfContentsPage (목차)

- **목적** : 챕터 구조를 한눈에 보여주고 탐색을 돕는다.
- **포함 가능한 블록** : 챕터 제목 목록(번호 + 제목 + 페이지)
- **배치** : 판권 다음. 시스템이 챕터(`## Chapter N.`)를 수집해 자동 생성.

## 4. ChapterPage (챕터 표지)

- **목적** : 챕터의 시작을 시각적으로 구분.
- **포함 가능한 블록** : 챕터 번호, 챕터 제목, ImageBlock(type: chapter)
- **배치** : 각 챕터 시작 시 자동 삽입. 큰 제목 + 대표 이미지 중심.

## 5. ContentPage (일반 본문)

- **목적** : 본문 텍스트와 일반 시각 요소를 흐름대로 담는다.
- **포함 가능한 블록** : ParagraphBlock, 표(TableBlock), 인용문(QuoteBlock),
  그리고 흐름상 함께 배치되는 카드형 블록들(ChecklistCard 등)
- **배치** : 텍스트가 위에서 아래로 흐르며, 분량에 따라 자동 페이지 분할.

## 6. ChecklistPage (체크리스트)

- **목적** : 점검 항목을 강조해 독자가 실행하도록 유도.
- **포함 가능한 블록** : ChecklistCard, (선택) 안내 ParagraphBlock
- **배치** : 카드 강조형. 항목이 많으면 단독 페이지로 분리.

## 7. ComparePage (비교표)

- **목적** : 둘 이상 항목을 표/카드 형태로 비교.
- **포함 가능한 블록** : CompareCard, (선택) 설명 ParagraphBlock
- **배치** : 표 또는 카드 그리드. 열 제목 + 행 데이터.

## 8. BeforeAfterPage (전후 비교)

- **목적** : 변화 전/후를 대비시켜 효과를 강조.
- **포함 가능한 블록** : BeforeAfterCard
- **배치** : 좌(before) / 우(after) 2분할 또는 상하 대비.

## 9. PromptPage (프롬프트)

- **목적** : 복사·활용 가능한 프롬프트를 강조해 제공.
- **포함 가능한 블록** : PromptCard
- **배치** : 코드/박스형 강조 카드. 복사 친화적 모노 스타일.

## 10. FAQPage (자주 묻는 질문)

- **목적** : 질문/답변 쌍을 정리해 의문을 해소.
- **포함 가능한 블록** : FAQCard(복수)
- **배치** : Q/A 반복 리스트. 질문 강조, 답변 들여쓰기.

## 11. WarningPage (주의)

- **목적** : 주의·경고 사항을 눈에 띄게 고지.
- **포함 가능한 블록** : WarningCard, (선택) 보조 ParagraphBlock
- **배치** : 경고색 강조 박스. 본문 흐름 중 단독 강조 또는 전용 페이지.

## 12. ResultPage (결과 요약)

- **목적** : 핵심 결론/요점을 압축해 각인.
- **포함 가능한 블록** : ResultCard
- **배치** : 챕터/섹션 끝. 강조 박스 또는 풀스크린 요약.

## 13. ImagePage (이미지)

- **목적** : 이미지 슬롯을 단독 지면으로 제시.
- **포함 가능한 블록** : ImageBlock(type: cover / chapter / thumbnail / 기타)
- **배치** : 전면 이미지 또는 캡션 동반. AI 이미지 우선 적용 대상.

---

## 페이지 ↔ 입력 블록 매핑 요약

| 페이지 타입 | 생성 방식 | 주요 입력 |
| --- | --- | --- |
| CoverPage | 자동 | `#`, `subtitle:`, `author:`, `:::image(cover)` |
| CopyrightPage | 자동 | 메타데이터 |
| TableOfContentsPage | 자동 | `## Chapter N.` 수집 |
| ChapterPage | 자동 | `## Chapter N.`, `:::image(chapter)` |
| ContentPage | 콘텐츠 | 본문 단락, 표, 인용문 |
| ChecklistPage | 콘텐츠 | `:::checklist` |
| ComparePage | 콘텐츠 | `:::compare` |
| BeforeAfterPage | 콘텐츠 | `:::before-after` |
| PromptPage | 콘텐츠 | `:::prompt` |
| FAQPage | 콘텐츠 | `:::faq` |
| WarningPage | 콘텐츠 | `:::warning` |
| ResultPage | 콘텐츠 | `:::result` |
| ImagePage | 콘텐츠 | `:::image` |

---

본 정의는 v0.1 기준안이며, 렌더링/레이아웃 설계 단계에서 보완될 수 있다.
