/**
 * Ebook Publishing System — AST 타입
 *
 * 기준 문서: docs/09_SCHEMA_FORMALIZATION.md
 *
 * 원칙(docs/06_AST_SCHEMA.md):
 *  - AST는 디자인 / PDF / DOCX 를 알지 못한다.
 *  - AST는 책의 구조와 의미만 표현한다.
 *  - Page 는 AST 에 포함하지 않는다 (출력 단계 파생 구조).
 *
 * 주의: erasable syntax only (Node 타입 스트리핑 호환) — enum/namespace 사용 안 함.
 */

// ===== Book (단일 원본 최상위) =====
export interface Book {
  metadata: Metadata;
  chapters: Chapter[]; // 등장 순서 보존
}

export interface Metadata {
  title: string; // '#'
  subtitle?: string; // 'subtitle:' (선택)
  author?: string; // 'author:'   (선택)
  cover?: string; // 'cover:' (선택) — 표지 이미지 자산 id (기본 'cover' → assets/images/cover.png|jpg)
}

export interface Chapter {
  number: number; // 챕터 순번
  title: string; // 챕터 제목
  blocks: Block[]; // 등장 순서 보존
}

// ===== Block (11종, 판별 유니온) =====
export type BlockType =
  | 'paragraph'
  | 'quote'
  | 'table'
  | 'checklist'
  | 'compare'
  | 'before-after'
  | 'prompt'
  | 'steps'
  | 'faq'
  | 'warning'
  | 'result'
  | 'callout'
  | 'divider'
  | 'code'
  | 'timeline'
  | 'stats'
  | 'chart'
  | 'feature'
  | 'progress'
  | 'stepper'
  | 'timeline-card'
  | 'compare-card'
  | 'alert'
  | 'process'
  | 'rating'
  | 'tags'
  | 'chips'
  | 'tree'
  | 'pagination'
  | 'empty'
  | 'search'
  | 'tooltip'
  | 'popover'
  | 'modal'
  | 'drawer'
  | 'skeleton'
  | 'file'
  | 'image';

export type Block =
  | ParagraphBlock
  | QuoteBlock
  | TableBlock
  | ChecklistBlock
  | CompareBlock
  | BeforeAfterBlock
  | PromptBlock
  | StepsBlock
  | FaqBlock
  | WarningBlock
  | ResultBlock
  | CalloutBlock
  | DividerBlock
  | CodeBlock
  | TimelineBlock
  | StatsBlock
  | ChartBlock
  | FeatureBlock
  | ProgressBlock
  | StepperBlock
  | TimelineCardBlock
  | CompareCardBlock
  | AlertBlock
  | ProcessBlock
  | RatingBlock
  | TagsBlock
  | ChipsBlock
  | TreeBlock
  | PaginationBlock
  | EmptyStateBlock
  | SearchBlock
  | TooltipBlock
  | PopoverBlock
  | ModalBlock
  | DrawerBlock
  | SkeletonBlock
  | FileBlock
  | ImageBlock;

export interface ParagraphBlock {
  type: 'paragraph';
  text: string;
}

/** 인용문 (Markdown blockquote `>`). 여러 줄은 하나로 묶인다. */
export interface QuoteBlock {
  type: 'quote';
  text: string;
}

/** 정보 정리용 표 (표준 Markdown 표 문법) */
export interface TableBlock {
  type: 'table';
  columns: string[];
  rows: string[][];
}

export interface ChecklistBlock {
  type: 'checklist';
  items: string[];
}

/** 강조 비교(카드형). table 과 의미가 다른 별개 블록. */
export interface CompareBlock {
  type: 'compare';
  columns: string[];
  rows: string[][];
}

export interface BeforeAfterBlock {
  type: 'before-after';
  before: string;
  after: string;
}

export interface PromptBlock {
  type: 'prompt';
  text: string; // 여러 줄 허용
}

export interface StepsBlock {
  type: 'steps';
  items: string[]; // 순서 → 자동 번호
}

export interface FaqPair {
  q: string;
  a: string;
}

export interface FaqBlock {
  type: 'faq';
  pairs: FaqPair[];
}

export interface WarningBlock {
  type: 'warning';
  text: string;
}

/** 리절트 박스 변형 — :::result variant: success|info|warning|error (없으면 기본) */
export type ResultVariant = 'success' | 'info' | 'warning' | 'error';
export interface ResultBlock {
  type: 'result';
  text: string;
  variant?: ResultVariant;
}

/** 콜아웃(정보/팁/노트) — :::info / :::tip / :::note */
export type CalloutVariant = 'info' | 'tip' | 'note';
export interface CalloutBlock {
  type: 'callout';
  variant: CalloutVariant;
  text: string;
}

/** 구분선 — :::divider 또는 단독 `---` / `***` / `___` 줄 */
export interface DividerBlock {
  type: 'divider';
}

/** 코드 블록 — 표준 ``` 펜스(언어 선택) */
export interface CodeBlock {
  type: 'code';
  lang: string;
  code: string;
}

/** 타임라인 — :::timeline (항목: 날짜/제목/설명, 빈 줄로 구분) */
export interface TimelineItem {
  date: string;
  title: string;
  desc: string;
}
export interface TimelineBlock {
  type: 'timeline';
  items: TimelineItem[];
}

/** 수치 카드(Metric/Stats) — :::stats (icon/value/label, 항목당 빈 줄 구분) */
export interface StatItem {
  icon: string;
  value: string;
  label: string;
}
export interface StatsBlock {
  type: 'stats';
  items: StatItem[];
}

/** 차트 — :::chart (현재 type: bar 지원) */
export interface ChartBlock {
  type: 'chart';
  chartType: string;
  title: string;
  unit: string;
  center: string;
  labels: string[];
  values: number[];
}

/** 피처 카드 — :::feature (icon/title/desc + 체크리스트 불릿, title 외 모두 선택) */
export interface FeatureBlock {
  type: 'feature';
  icon: string;
  title: string;
  desc: string;
  items: string[];
}

/** 진행률 — :::progress (라벨: 퍼센트, 첫 항목=전체 진행률). percent 는 0~100 clamp */
export interface ProgressItem {
  label: string;
  percent: number;
}
export interface ProgressBlock {
  type: 'progress';
  items: ProgressItem[];
}

/** 진행 단계 — :::stepper (current=현재 1-base, desc=현재 설명(선택), 불릿=단계 목록) */
export interface StepperBlock {
  type: 'stepper';
  current: number;
  desc: string;
  steps: string[];
}

/** 타임라인 카드 — :::timeline-card (DS 04/04 #42). 항목=TimelineItem(date 선택/title 필수/desc 선택) */
export interface TimelineCardBlock {
  type: 'timeline-card';
  items: TimelineItem[];
}

// ===== 통합 스프린트 15~30 (DS 잔여 핵심 컴포넌트, 정적 변환) =====

/** 15 Compare Card — :::compare-card (DS 02/04 #18). highlight=강조 열(선택) */
export interface CompareCardBlock {
  type: 'compare-card';
  columns: string[];
  highlight: string;
  rows: string[][];
}

/** 16 Alert — :::alert (DS 02/04 #23). variant 별 색/라벨 */
export type AlertVariant = 'success' | 'info' | 'warning' | 'error';
export interface AlertBlock {
  type: 'alert';
  variant: AlertVariant;
  text: string;
}

/** 17 Process — :::process (DS 02/04 #16). 단계 흐름(아이콘 선택) */
export interface ProcessItem {
  icon: string;
  title: string;
  desc: string;
}
export interface ProcessBlock {
  type: 'process';
  items: ProcessItem[];
}

/** 18 Rating — :::rating (DS 03/04 #31). value/max 별점 */
export interface RatingBlock {
  type: 'rating';
  value: number;
  max: number;
  label: string;
}

/** 19 Tag Group — :::tags (DS 03/04 #34) */
export interface TagsBlock {
  type: 'tags';
  items: string[];
}

/** 20 Chip Group — :::chips (DS 03/04 #35) */
export interface ChipsBlock {
  type: 'chips';
  items: string[];
}

/** 21 Tree — :::tree (DS 04/04 #43). depth=들여쓰기 깊이 */
export interface TreeItem {
  depth: number;
  label: string;
}
export interface TreeBlock {
  type: 'tree';
  items: TreeItem[];
}

/** 22 Pagination — :::pagination (DS 02/04 #24 + 03/04 #33). 페이지 정보 블록 */
export interface PaginationBlock {
  type: 'pagination';
  current: number;
  total: number;
}

/** 23 Empty State — :::empty (DS 04/04 #47) */
export interface EmptyStateBlock {
  type: 'empty';
  icon: string;
  title: string;
  desc: string;
}

/** 24 Search Bar — :::search (DS 04/04 #46). 검색 예시 블록 */
export interface SearchBlock {
  type: 'search';
  placeholder: string;
  query: string;
}

/** 25 Tooltip — :::tooltip (DS 04/04 #37) → 설명 박스 */
export interface TooltipBlock {
  type: 'tooltip';
  label: string;
  text: string;
}

/** 26 Popover — :::popover (DS 04/04 #38) → 설명 박스 */
export interface PopoverBlock {
  type: 'popover';
  title: string;
  text: string;
}

/** 27 Modal — :::modal (DS 04/04 #39) → 강조 카드 */
export interface ModalBlock {
  type: 'modal';
  title: string;
  text: string;
}

/** 28 Drawer — :::drawer (DS 04/04 #40) → 강조 카드 */
export interface DrawerBlock {
  type: 'drawer';
  title: string;
  text: string;
}

/** 29 Skeleton — :::skeleton (DS 04/04 #48) → placeholder 카드 */
export interface SkeletonBlock {
  type: 'skeleton';
  lines: number;
}

/** 30 File Uploader — :::file (DS 04/04 #45) → 파일 정보 카드 */
export interface FileBlock {
  type: 'file';
  name: string;
  size: string;
  fileType: string;
}

/**
 * 이미지 슬롯.
 * 주의: 입력 언어의 키는 `type:` 이지만, AST 판별자 `type` 과 충돌하므로
 *       AST 에서는 `imageType` 으로 저장한다 (docs/09 §1).
 */
export interface ImageBlock {
  type: 'image';
  id: string; // 예: 'IMG-001'
  imageType: string; // 'cover' | 'chapter' | 'thumbnail' | ...
  prompt: string; // 이미지 생성용 설명
}
