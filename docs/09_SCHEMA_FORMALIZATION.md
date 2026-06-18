# Ebook Publishing System — 스키마 / 토큰 형식화 v0.1

이 문서는 지금까지(01~08) 정의한 구조를 **구현 계약(implementation contract)** 으로 고정한다.
파서·렌더러·출력기가 합의할 단일 인터페이스를 TypeScript 타입과 JSON 예시로 명세한다.

> **이 문서는 계약 명세 문서다. 아직 실제 코드는 작성하지 않는다.** `src/`에는 손대지 않는다.
> 여기의 타입은 "합의용 명세"이며, 실제 모듈화는 구현 착수 단계에서 진행한다.

> **디자인 관련 값은 모두 "초안(PROPOSAL)"이다.** 색상 HEX, 타이포 크기, 여백, 카드 스타일,
> 테두리/그림자, 이미지 비율, 캔버스 규격 등 디자인 결정은 **코비(PM) 리뷰 → 코지 확인 → 승인**
> 후에만 확정된다. 클로는 디자인을 임의로 확정하지 않는다. (본 문서 말미 "디자인 승인 대기 항목" 참조)

관련 문서: [AST](06_AST_SCHEMA.md) · [출력 프로파일](07_OUTPUT_PROFILES.md) · [디자인 시스템](08_DESIGN_SYSTEM.md)

---

## 1. AST 타입 명세

원칙(06 문서): AST는 디자인·PDF·DOCX를 알지 못하며, 책의 구조와 의미만 표현한다. **Page는 AST에 포함하지 않는다.**

```ts
// ===== Book (단일 원본 최상위) =====
interface Book {
  metadata: Metadata;
  chapters: Chapter[];   // 등장 순서 보존
}

interface Metadata {
  title: string;         // '#'
  subtitle?: string;     // 'subtitle:' (선택)
  author?: string;       // 'author:'   (선택)
}

interface Chapter {
  number: number;        // 챕터 순번
  title: string;         // 챕터 제목
  blocks: Block[];       // 등장 순서 보존
}
```

### Block 타입 (11종, 판별 유니온)

```ts
type Block =
  | ParagraphBlock
  | TableBlock
  | ChecklistBlock
  | CompareBlock
  | BeforeAfterBlock
  | PromptBlock
  | StepsBlock
  | FaqBlock
  | WarningBlock
  | ResultBlock
  | ImageBlock;

interface BlockBase { type: BlockType; }
type BlockType =
  | 'paragraph' | 'table' | 'checklist' | 'compare' | 'before-after'
  | 'prompt' | 'steps' | 'faq' | 'warning' | 'result' | 'image';

interface ParagraphBlock  extends BlockBase { type: 'paragraph';  text: string; }
interface TableBlock      extends BlockBase { type: 'table';      columns: string[]; rows: string[][]; }   // 정보 정리용 표
interface ChecklistBlock  extends BlockBase { type: 'checklist';  items: string[]; }
interface CompareBlock    extends BlockBase { type: 'compare';    columns: string[]; rows: string[][]; }   // 강조 비교(카드형)
interface BeforeAfterBlock extends BlockBase{ type: 'before-after'; before: string; after: string; }
interface PromptBlock     extends BlockBase { type: 'prompt';     text: string; }                          // 여러 줄 허용
interface StepsBlock      extends BlockBase { type: 'steps';      items: string[]; }                       // 순서 → 자동 번호
interface FaqBlock        extends BlockBase { type: 'faq';        pairs: { q: string; a: string }[]; }
interface WarningBlock    extends BlockBase { type: 'warning';    text: string; }
interface ResultBlock     extends BlockBase { type: 'result';     text: string; }
interface ImageBlock      extends BlockBase {
  type: 'image';
  id: string;                                   // 예: 'IMG-001'
  imageType: 'cover' | 'chapter' | 'thumbnail' | string;  // 입력 언어의 type 키
  prompt: string;                               // 이미지 생성용 설명
}
```

> 비고: `table`과 `compare`는 형태가 같아 보이지만 **의미가 다른 별개 블록**이다(정리 vs 강조 비교).
> `image` 블록의 입력 키 `type:`은 타입 판별자 `type`과 충돌하므로 AST에서는 `imageType`으로 저장한다.

---

## 2. Page (AST 외부, 파생 구조)

Page는 AST의 일부가 아니라 **출력 단계([4])에서 AST로부터 파생**된다. 출력 프로파일마다 다르게 구성된다.

```ts
type PageType =
  | 'CoverPage' | 'CopyrightPage' | 'TableOfContentsPage' | 'ChapterPage'
  | 'ContentPage' | 'ChecklistPage' | 'ComparePage' | 'BeforeAfterPage'
  | 'PromptPage' | 'FAQPage' | 'WarningPage' | 'ResultPage' | 'ImagePage';

interface Page {
  type: PageType;
  // AST 블록(또는 메타데이터)에 대한 참조. 원본을 복제하지 않고 참조만 한다.
  blockRefs: BlockRef[];
}

interface BlockRef {
  chapterIndex: number;   // 어느 챕터의
  blockIndex: number;     // 몇 번째 블록인지 (메타데이터 기반 페이지는 별도 표기)
}
```

> 핵심: Page는 AST를 **참조**할 뿐 AST를 바꾸지 않는다 → 단일 원본 불변(immutable) 원칙 유지.

---

## 3. Output Profile 타입 명세

출력 프로파일은 반드시 **format · selector · layoutVariant** 3요소를 포함한다(07 문서).

```ts
interface OutputProfile {
  name: ProfileName;
  format: OutputFormat;
  selector: Selector;          // AST에서 무엇을 고를지
  layoutVariant: LayoutVariant;// 어떻게 배치/구성할지
}

type ProfileName =
  | 'FullBookPDF' | 'EditableDOCX' | 'KmongPreviewPDF'
  | 'DetailPageImages' | 'SNSPromoImages' | 'ChecklistPDF';

type OutputFormat = 'pdf' | 'docx' | 'image';

// 페이지 선택 규칙 (07 설계 메모의 4패턴을 일반화)
type Selector =
  | { scope: 'all' }                                   // 전체
  | { scope: 'range'; from: ChapterCursor; to: ChapterCursor } // 앞부분 N
  | { scope: 'filter'; blockTypes: BlockType[] }       // 특정 블록 타입만
  | { scope: 'excerpt'; pick: ExcerptPick };           // 발췌(키비주얼)

interface ChapterCursor { chapter: number; blockLimit?: number; } // 예: ch1의 앞 N블록
interface ExcerptPick {
  metadata?: boolean;                  // 제목/부제/저자
  coverImage?: boolean;                // image(cover)
  blockTypes?: BlockType[];            // 대표 블록(checklist/result 등)
}

type LayoutVariant = 'fixed' | 'flow' | 'imageCanvas';
```

### 6개 프로파일의 명세 (초안 — 디자인 변형은 PM 승인 대상)

```ts
const PROFILES: OutputProfile[] = [
  { name: 'FullBookPDF',     format: 'pdf',   selector: { scope: 'all' },                                   layoutVariant: 'fixed' },
  { name: 'EditableDOCX',    format: 'docx',  selector: { scope: 'all' },                                   layoutVariant: 'flow' },
  { name: 'KmongPreviewPDF', format: 'pdf',   selector: { scope: 'range', from: { chapter: 1 }, to: { chapter: 1, blockLimit: 6 } }, layoutVariant: 'fixed' },
  { name: 'ChecklistPDF',    format: 'pdf',   selector: { scope: 'filter', blockTypes: ['checklist'] },     layoutVariant: 'fixed' },
  { name: 'DetailPageImages',format: 'image', selector: { scope: 'excerpt', pick: { metadata: true, coverImage: true, blockTypes: ['checklist','result'] } }, layoutVariant: 'imageCanvas' },
  { name: 'SNSPromoImages',  format: 'image', selector: { scope: 'excerpt', pick: { metadata: true, coverImage: true, blockTypes: ['result'] } },             layoutVariant: 'imageCanvas' },
];
```

> `KmongPreviewPDF`의 `blockLimit: 6`, 발췌 프로파일의 `blockTypes` 선택 등 **구체 수치/선택은 초안**이다.
> 미리보기 노출 분량·발췌 대상은 코비(PM) 검토 후 확정.

---

## 4. Design Token 타입 명세

> ⚠️ **아래 값은 전부 초안(PROPOSAL)이며 디자인 결정이다. 코비 리뷰·코지 확인·승인 전에는 미확정.**

```ts
interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingScale;
  radius: RadiusTokens;
  cardTone: CardToneMap;
  canvasRatio: CanvasRatioTokens;
}

interface ColorTokens {
  navy: string;     // 기본/구조
  orange: string;   // 강조
  cyan: string;     // 보조/정보
  ink: string;      // 본문 텍스트(거의 검정)
  gray: string;     // 보조선/캡션
  paper: string;    // 배경(흰색 계열)
}

interface TypographyTokens {
  // 폰트 파일은 미지정 — 시스템 폰트 또는 추후 확정
  fontFamily: 'system' | string;   // 'system' = 추후 확정 전까지 시스템 폰트
  scale: {                          // 상대 스케일(단계). 실제 px는 초안.
    bookTitle: number;
    chapterTitle: number;
    body: number;
    caption: number;
    emphasis: number;
  };
  lineHeight: { body: number; heading: number; };
}

type SpacingScale = {              // 고정 단계 집합 (임의 여백 금지)
  xs: number; sm: number; md: number; lg: number; xl: number; xxl: number;
};

interface RadiusTokens { card: number; image: number; }

// 카드 의미 톤 (08 문서의 3군)
type Tone = 'emphasis' | 'info' | 'neutral';
type CardToneMap = Record<
  'checklist'|'table'|'compare'|'before-after'|'prompt'|'steps'|'faq'|'warning'|'result',
  Tone
>;

interface CanvasRatioTokens {
  square: '1:1';
  story: '9:16';
  detailBanner: 'verticalLong';   // 폭 고정, 세로 가변
}
```

### 토큰 초안값 (PROPOSAL — 미확정)

```ts
const DRAFT_TOKENS: DesignTokens = {
  colors: {
    navy:   '#1F2D5A',   // 초안
    orange: '#F5821F',   // 초안
    cyan:   '#1FB6C9',   // 초안
    ink:    '#1A1A1A',   // 초안
    gray:   '#9AA0A6',   // 초안
    paper:  '#FFFFFF',   // 초안
  },
  typography: {
    fontFamily: 'system',                       // 폰트 파일 미지정(추후 확정)
    scale: { bookTitle: 40, chapterTitle: 28, body: 16, caption: 12, emphasis: 18 }, // 초안(상대 단계)
    lineHeight: { body: 1.7, heading: 1.3 },    // 초안
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 },  // 초안(단계 집합)
  radius: { card: 12, image: 8 },               // 초안
  cardTone: {
    warning: 'emphasis', result: 'emphasis',
    prompt: 'info', steps: 'info', faq: 'info',
    checklist: 'neutral', table: 'neutral', compare: 'neutral', 'before-after': 'neutral',
  },
  canvasRatio: { square: '1:1', story: '9:16', detailBanner: 'verticalLong' },
};
```

---

## 5. JSON 예시

### 5.1 AST 인스턴스 (book.md 일부를 AST로 표현한 예)

```json
{
  "metadata": {
    "title": "하루 30분, 나만의 루틴 만들기",
    "subtitle": "작은 습관으로 하루의 밀도를 바꾸는 법",
    "author": "CozyBuilder Lab"
  },
  "chapters": [
    {
      "number": 1,
      "title": "시작하기 전에",
      "blocks": [
        { "type": "paragraph", "text": "루틴은 의지가 아니라 설계의 문제다 ..." },
        { "type": "image", "id": "IMG-001", "imageType": "chapter", "prompt": "아침 햇살이 드는 책상 ..." },
        { "type": "checklist", "items": ["매일 같은 시간에 할 수 있는가", "5분 안에 시작할 수 있을 만큼 작은가", "실패해도 다음 날 다시 할 수 있는가"] },
        { "type": "table", "columns": ["루틴 단계", "권장 시간", "비고"], "rows": [["준비", "5분", "전날 밤 미리 정해두기"], ["실행", "20분", "정해진 순서대로"], ["기록", "5분", "한 줄 메모로 충분"]] },
        { "type": "compare", "columns": ["유형", "소요 시간", "난이도"], "rows": [["아침 루틴", "20분", "중"], ["저녁 루틴", "15분", "하"]] },
        { "type": "before-after", "before": "일어나자마자 휴대폰을 확인하며 ...", "after": "기상 후 정해진 3가지 행동을 ..." },
        { "type": "result", "text": "루틴의 핵심은 완벽함이 아니라 다시 시작할 수 있는 구조다." }
      ]
    }
  ]
}
```

### 5.2 Output Profile 인스턴스 (ChecklistPDF)

```json
{
  "name": "ChecklistPDF",
  "format": "pdf",
  "selector": { "scope": "filter", "blockTypes": ["checklist"] },
  "layoutVariant": "fixed"
}
```

---

## 6. 디자인 승인 대기 항목 (코비 리뷰 → 코지 확인 → 승인 필요)

아래 값/규칙은 **본 문서에 초안으로만 기재**되어 있으며, 승인 전 구현 금지.

- 색상 HEX: navy/orange/cyan/ink/gray/paper 초안값
- 폰트: 현재 미지정('system') — 확정 필요
- 타이포 크기: scale 5단계 px 초안, lineHeight 초안
- 여백 규칙: spacing 6단계 초안
- 카드 스타일·테두리·그림자: radius 초안 + 톤 매핑(시각 표현은 미정)
- 아이콘: 미정
- 이미지 비율·캔버스 규격: 1:1 / 9:16 / 세로 배너(픽셀 미정)
- 컴포넌트 배치 / 챕터 페이지 스타일 / 표지·상세·SNS 디자인: 미정
- 디자인 토큰 값 변경: 모두 승인 대상

> 디자인 프로세스: **문서 작성 → 코비 리뷰 → 코지 확인 → 승인 → 구현.**
> 구조 계약(1~3장: AST/Page/Profile 타입)은 디자인이 아니므로 형식화 대상이지만,
> 4장(토큰)·디자인 관련 수치는 승인 전까지 초안 상태로 둔다.

---

본 정의는 v0.1 기준안이며, 구현 착수 단계에서 실제 모듈로 옮겨진다.
