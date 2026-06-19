/**
 * Ebook Publishing System — 출력(Page / OutputProfile) 타입
 *
 * 기준 문서: docs/07_OUTPUT_PROFILES.md, docs/09_SCHEMA_FORMALIZATION.md
 *
 * 중요: Page 는 AST 가 아니다. AST(Book→Chapter→Block)에서 출력 단계([4])에
 *       파생되는 구조다. Page 는 Block 전체 내용을 복사하지 않고
 *       BlockReference(참조)만 보유한다 → 단일 원본 불변 유지.
 *
 * 주의: erasable syntax only (Node 타입 스트리핑 호환).
 */

import type { BlockType } from './ast.ts';
import type { ComponentType } from './component.ts';
import type { SelectorPolicy } from '../selector/selector.ts';

// ===== Output Profile =====
export type ProfileName =
  | 'FullBookPDF'
  | 'EditableDOCX'
  | 'KmongPreviewPDF'
  | 'DetailPageImages'
  | 'SNSPromoImages'
  | 'ChecklistPDF';

export type OutputFormat = 'pdf' | 'docx' | 'image';

export type LayoutVariant = 'fixed' | 'flow' | 'imageCanvas';

/** 페이지 선택 규칙 (07 설계 메모의 4패턴 일반화) */
export type Selector =
  | { scope: 'all' }
  | { scope: 'range'; from: ChapterCursor; to: ChapterCursor }
  | { scope: 'filter'; blockTypes: BlockType[] }
  | { scope: 'excerpt'; pick: ExcerptPick };

export interface ChapterCursor {
  chapter: number;
  blockLimit?: number;
}

export interface ExcerptPick {
  metadata?: boolean;
  coverImage?: boolean;
  blockTypes?: BlockType[];
}

export interface OutputProfile {
  name: ProfileName;
  format: OutputFormat;
  selector: Selector;
  layoutVariant: LayoutVariant;
  /**
   * 컴포넌트 큐레이션 정책(선택). 미지정 시 "전체 컴포넌트 사용"(현재 동작 유지).
   * v1: 구조만 마련. 실제 Book 출력 제한에는 아직 사용하지 않는다.
   */
  componentSelector?: SelectorPolicy<ComponentType>;
}

// ===== Page (AST 외부 파생 구조) =====
export type PageType =
  | 'CoverPage'
  | 'CopyrightPage'
  | 'TableOfContentsPage'
  | 'ChapterPage'
  | 'ContentPage'
  | 'ChecklistPage'
  | 'ComparePage'
  | 'BeforeAfterPage'
  | 'PromptPage'
  | 'FAQPage'
  | 'WarningPage'
  | 'ResultPage'
  | 'ImagePage';

/**
 * AST 블록에 대한 참조. 블록 내용을 복제하지 않고 위치만 가리킨다.
 * (메타데이터 기반 페이지 — Cover/Copyright/TOC — 는 blockRefs 가 비어 있다.)
 */
export interface BlockReference {
  chapterIndex: number; // 어느 챕터의 (book.chapters[chapterIndex])
  blockIndex: number; // 몇 번째 블록인지 (chapter.blocks[blockIndex])
}

export interface Page {
  type: PageType;
  /** ChapterPage 등 특정 챕터에 귀속되는 페이지의 챕터 인덱스 (선택) */
  chapterIndex?: number;
  /** 이 페이지가 표현하는 AST 블록들에 대한 참조 (복사가 아님) */
  blockRefs: BlockReference[];
}
