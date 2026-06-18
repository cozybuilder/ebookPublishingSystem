/**
 * Ebook Publishing System — Component 타입
 *
 * 기준 문서: docs/03_COMPONENTS.md
 *
 * Component 는 Page 를 구성하는 시각 단위의 "스타일 미적용 인스턴스"다.
 * 이 단계에서는 표시에 필요한 데이터만 담는다. (디자인/레이아웃/렌더링 미포함)
 *
 * 주의: AST 의 ParagraphBlock / ImageBlock 과 이름이 겹치므로,
 *       이 파일의 인터페이스는 컴포넌트용이며 type 리터럴로 구분된다.
 *       (소비 측에서는 AST 를 네임스페이스 별칭으로 import 하여 충돌 회피)
 *
 * 주의: erasable syntax only (Node 타입 스트리핑 호환).
 */

import type { FaqPair } from './ast.ts';
import type { PageType } from './output.ts';

export type ComponentType =
  // --- 메타데이터/구조 기반 ---
  | 'TitleBlock'
  | 'SubtitleBlock'
  | 'AuthorBlock'
  | 'ChapterHeading' // 보조: 챕터 제목 (docs/03 외 구조 컴포넌트)
  | 'TableOfContentsList' // 보조: 목차 항목 목록
  | 'CopyrightNotice' // 보조: 판권 고지(임시 고정 텍스트)
  // --- 블록 기반 ---
  | 'ParagraphBlock'
  | 'TableCard'
  | 'ChecklistCard'
  | 'CompareCard'
  | 'BeforeAfterCard'
  | 'PromptCard'
  | 'StepsCard'
  | 'FAQCard'
  | 'WarningCard'
  | 'ResultCard'
  | 'ImageBlock';

export type Component =
  | TitleBlock
  | SubtitleBlock
  | AuthorBlock
  | ChapterHeading
  | TableOfContentsList
  | CopyrightNotice
  | ParagraphBlock
  | TableCard
  | ChecklistCard
  | CompareCard
  | BeforeAfterCard
  | PromptCard
  | StepsCard
  | FAQCard
  | WarningCard
  | ResultCard
  | ImageBlock;

// ----- 메타데이터/구조 기반 -----
export interface TitleBlock {
  type: 'TitleBlock';
  text: string;
}
export interface SubtitleBlock {
  type: 'SubtitleBlock';
  text: string;
}
export interface AuthorBlock {
  type: 'AuthorBlock';
  text: string;
}
export interface ChapterHeading {
  type: 'ChapterHeading';
  number: number;
  title: string;
}
export interface TocEntry {
  number: number;
  title: string;
}
export interface TableOfContentsList {
  type: 'TableOfContentsList';
  entries: TocEntry[];
}
export interface CopyrightNotice {
  type: 'CopyrightNotice';
  text: string;
}

// ----- 블록 기반 -----
export interface ParagraphBlock {
  type: 'ParagraphBlock';
  text: string;
}
export interface TableCard {
  type: 'TableCard';
  columns: string[];
  rows: string[][];
}
export interface ChecklistCard {
  type: 'ChecklistCard';
  items: string[];
}
export interface CompareCard {
  type: 'CompareCard';
  columns: string[];
  rows: string[][];
}
export interface BeforeAfterCard {
  type: 'BeforeAfterCard';
  before: string;
  after: string;
}
export interface PromptCard {
  type: 'PromptCard';
  text: string;
}
export interface StepsCard {
  type: 'StepsCard';
  items: string[];
}
export interface FAQCard {
  type: 'FAQCard';
  pairs: FaqPair[];
}
export interface WarningCard {
  type: 'WarningCard';
  text: string;
}
export interface ResultCard {
  type: 'ResultCard';
  text: string;
}
export interface ImageBlock {
  type: 'ImageBlock';
  id: string;
  imageType: string;
  prompt: string;
}

// ----- 컴포넌트가 채워진 Page -----
export interface ComponentPage {
  type: PageType;
  chapterIndex?: number;
  components: Component[];
}
