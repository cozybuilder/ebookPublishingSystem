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

import type {
  FaqPair,
  TimelineItem,
  StatItem,
  ResultVariant,
  ProgressItem,
  AlertVariant,
  ProcessItem,
  TreeItem,
} from './ast.ts';
import type { PageType } from './output.ts';

export type ComponentType =
  // --- 메타데이터/구조 기반 ---
  | 'TitleBlock'
  | 'SubtitleBlock'
  | 'AuthorBlock'
  | 'CoverImage' // 표지 이미지(실제 이미지 자산을 표지 면에 full-bleed)
  | 'ChapterHeading' // 보조: 챕터 제목 (docs/03 외 구조 컴포넌트)
  | 'TableOfContentsList' // 보조: 목차 항목 목록
  | 'CopyrightNotice' // 보조: 판권 고지(임시 고정 텍스트)
  | 'AuthorBio' // Front Matter: 저자 소개
  | 'Disclaimer' // Front Matter: 면책 조항
  // --- 블록 기반 ---
  | 'ParagraphBlock'
  | 'QuoteBlock'
  | 'TableCard'
  | 'ChecklistCard'
  | 'CompareCard'
  | 'BeforeAfterCard'
  | 'PromptCard'
  | 'StepsCard'
  | 'FAQCard'
  | 'WarningCard'
  | 'ResultCard'
  | 'CalloutCard'
  | 'Divider'
  | 'CodeBlock'
  | 'TimelineCard'
  | 'StatsCard'
  | 'ChartCard'
  | 'FeatureCard'
  | 'ProgressCard'
  | 'StepperCard'
  | 'TimelineCardList'
  | 'ComparisonCard'
  | 'AlertCard'
  | 'ProcessCard'
  | 'RatingCard'
  | 'TagGroup'
  | 'ChipGroup'
  | 'TreeCard'
  | 'PaginationCard'
  | 'EmptyState'
  | 'SearchBar'
  | 'TooltipBox'
  | 'PopoverBox'
  | 'ModalCard'
  | 'DrawerCard'
  | 'SkeletonCard'
  | 'FileCard'
  | 'ImageBlock';

export type Component =
  | TitleBlock
  | SubtitleBlock
  | AuthorBlock
  | CoverImage
  | ChapterHeading
  | TableOfContentsList
  | CopyrightNotice
  | AuthorBio
  | Disclaimer
  | ParagraphBlock
  | QuoteBlock
  | TableCard
  | ChecklistCard
  | CompareCard
  | BeforeAfterCard
  | PromptCard
  | StepsCard
  | FAQCard
  | WarningCard
  | ResultCard
  | CalloutCard
  | Divider
  | CodeBlock
  | TimelineCard
  | StatsCard
  | ChartCard
  | FeatureCard
  | ProgressCard
  | StepperCard
  | TimelineCardList
  | ComparisonCard
  | AlertCard
  | ProcessCard
  | RatingCard
  | TagGroup
  | ChipGroup
  | TreeCard
  | PaginationCard
  | EmptyState
  | SearchBar
  | TooltipBox
  | PopoverBox
  | ModalCard
  | DrawerCard
  | SkeletonCard
  | FileCard
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
/** 표지 이미지 — src 는 data URI(data:image/png|jpeg;base64,...). 출력별로 디코드해 사용. */
export interface CoverImage {
  type: 'CoverImage';
  src: string;
  alt?: string;
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
export interface AuthorBio {
  type: 'AuthorBio';
  heading: string;
  text: string;
}
export interface Disclaimer {
  type: 'Disclaimer';
  heading: string;
  text: string;
}

// ----- 블록 기반 -----
export interface ParagraphBlock {
  type: 'ParagraphBlock';
  text: string;
}
export interface QuoteBlock {
  type: 'QuoteBlock';
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
  variant?: ResultVariant;
}
export interface CalloutCard {
  type: 'CalloutCard';
  variant: 'info' | 'tip' | 'note';
  text: string;
}
export interface Divider {
  type: 'Divider';
}
export interface CodeBlock {
  type: 'CodeBlock';
  lang: string;
  code: string;
}
export interface TimelineCard {
  type: 'TimelineCard';
  items: TimelineItem[];
}
export interface StatsCard {
  type: 'StatsCard';
  items: StatItem[];
}
export interface ChartCard {
  type: 'ChartCard';
  chartType: string;
  title: string;
  unit: string;
  center: string;
  labels: string[];
  values: number[];
}
export interface FeatureCard {
  type: 'FeatureCard';
  icon: string;
  title: string;
  desc: string;
  items: string[];
}
export interface ProgressCard {
  type: 'ProgressCard';
  items: ProgressItem[];
}
export interface StepperCard {
  type: 'StepperCard';
  current: number;
  desc: string;
  steps: string[];
}
export interface TimelineCardList {
  type: 'TimelineCardList';
  items: TimelineItem[];
}
export interface ComparisonCard {
  type: 'ComparisonCard';
  columns: string[];
  highlight: string;
  rows: string[][];
}
export interface AlertCard {
  type: 'AlertCard';
  variant: AlertVariant;
  text: string;
}
export interface ProcessCard {
  type: 'ProcessCard';
  items: ProcessItem[];
}
export interface RatingCard {
  type: 'RatingCard';
  value: number;
  max: number;
  label: string;
}
export interface TagGroup {
  type: 'TagGroup';
  items: string[];
}
export interface ChipGroup {
  type: 'ChipGroup';
  items: string[];
}
export interface TreeCard {
  type: 'TreeCard';
  items: TreeItem[];
}
export interface PaginationCard {
  type: 'PaginationCard';
  current: number;
  total: number;
}
export interface EmptyState {
  type: 'EmptyState';
  icon: string;
  title: string;
  desc: string;
}
export interface SearchBar {
  type: 'SearchBar';
  placeholder: string;
  query: string;
}
export interface TooltipBox {
  type: 'TooltipBox';
  label: string;
  text: string;
}
export interface PopoverBox {
  type: 'PopoverBox';
  title: string;
  text: string;
}
export interface ModalCard {
  type: 'ModalCard';
  title: string;
  text: string;
}
export interface DrawerCard {
  type: 'DrawerCard';
  title: string;
  text: string;
}
export interface SkeletonCard {
  type: 'SkeletonCard';
  lines: number;
}
export interface FileCard {
  type: 'FileCard';
  name: string;
  size: string;
  fileType: string;
}
export interface ImageBlock {
  type: 'ImageBlock';
  id: string;
  imageType: string;
  prompt: string;
  /** 실제 이미지 data URI(자산 해석 성공 시). 없으면 HTML 은 placeholder 슬롯으로 렌더. */
  src?: string;
}

// ----- 컴포넌트가 채워진 Page -----
export interface ComponentPage {
  type: PageType;
  chapterIndex?: number;
  components: Component[];
}
