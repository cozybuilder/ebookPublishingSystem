/**
 * Ebook Publishing System — Page Builder (v0.1)
 *
 * Book AST + OutputProfile → Page 목록.
 *
 * 기준 문서:
 *  - docs/02_PAGE_TYPES.md      (페이지 타입)
 *  - docs/04_PIPELINE.md [4]    (Page 구성 단계)
 *  - docs/07_OUTPUT_PROFILES.md (프로파일)
 *
 * 원칙:
 *  - Page 는 AST 를 복사하지 않고 BlockReference 로 참조만 한다.
 *  - StepsPage 는 만들지 않는다. steps 블록은 ContentPage 안에 남긴다. (PM 확정)
 *  - 이 단계는 디자인/레이아웃/렌더링을 다루지 않는다.
 */

import type { Book } from '../types/ast.ts';
import type { OutputProfile, Page } from '../types/output.ts';

/** 프로파일에 따라 Book AST 를 Page 목록으로 변환한다. */
export function buildPages(book: Book, profile: OutputProfile): Page[] {
  switch (profile.name) {
    case 'FullBookPDF':
      return buildFullBookPages(book);
    case 'ChecklistPDF':
      return buildChecklistPages(book);
    default:
      throw new Error(`아직 지원하지 않는 프로파일입니다: ${profile.name}`);
  }
}

/**
 * FullBookPDF: 전체 책을 Page 목록으로.
 *  Cover → Copyright → TOC → (Chapter마다) ChapterPage + ContentPage
 */
function buildFullBookPages(book: Book): Page[] {
  const pages: Page[] = [];

  // 메타데이터 기반 자동 페이지 (blockRefs 없음 — 메타데이터에서 파생)
  pages.push({ type: 'CoverPage', blockRefs: [] });
  pages.push({ type: 'CopyrightPage', blockRefs: [] });
  pages.push({ type: 'TableOfContentsPage', blockRefs: [] });

  book.chapters.forEach((chapter, chapterIndex) => {
    // 챕터 표지
    pages.push({ type: 'ChapterPage', chapterIndex, blockRefs: [] });

    // 챕터 본문: 모든 블록을 하나의 ContentPage 에 참조로 담는다.
    // (steps 도 여기에 포함 → 별도 StepsPage 를 만들지 않음)
    if (chapter.blocks.length > 0) {
      pages.push({
        type: 'ContentPage',
        chapterIndex,
        blockRefs: chapter.blocks.map((_block, blockIndex) => ({
          chapterIndex,
          blockIndex,
        })),
      });
    }
  });

  return pages;
}

/**
 * ChecklistPDF: checklist 블록만 수집해 ChecklistPage 목록으로.
 *  각 checklist 블록 1개당 ChecklistPage 1개. 원본 챕터/블록 위치를 참조로 유지.
 */
function buildChecklistPages(book: Book): Page[] {
  const pages: Page[] = [];

  book.chapters.forEach((chapter, chapterIndex) => {
    chapter.blocks.forEach((block, blockIndex) => {
      if (block.type === 'checklist') {
        pages.push({
          type: 'ChecklistPage',
          chapterIndex,
          blockRefs: [{ chapterIndex, blockIndex }],
        });
      }
    });
  });

  return pages;
}
