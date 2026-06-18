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
}

export interface Chapter {
  number: number; // 챕터 순번
  title: string; // 챕터 제목
  blocks: Block[]; // 등장 순서 보존
}

// ===== Block (11종, 판별 유니온) =====
export type BlockType =
  | 'paragraph'
  | 'table'
  | 'checklist'
  | 'compare'
  | 'before-after'
  | 'prompt'
  | 'steps'
  | 'faq'
  | 'warning'
  | 'result'
  | 'image';

export type Block =
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

export interface ParagraphBlock {
  type: 'paragraph';
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

export interface ResultBlock {
  type: 'result';
  text: string;
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
