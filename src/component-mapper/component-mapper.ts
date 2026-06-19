/**
 * Ebook Publishing System — Component Mapper (v0.1)
 *
 * Book AST + Page 목록 → Component 가 채워진 Page(ComponentPage) 목록.
 *
 * 기준 문서: docs/03_COMPONENTS.md, docs/04_PIPELINE.md [5]
 *
 * 원칙:
 *  - 스타일 / 레이아웃 / 렌더링은 다루지 않는다. 데이터만 담는다.
 *  - Page 의 blockRef 를 실제 AST 블록으로 역참조해 컴포넌트로 변환한다.
 *  - StepsPage 는 만들지 않으며, steps 는 ContentPage 안에서 StepsCard 로 매핑된다.
 */

import type * as AST from '../types/ast.ts';
import type { Page } from '../types/output.ts';
import type { Component, ComponentPage } from '../types/component.ts';

/** Page 목록을 ComponentPage 목록으로 변환한다. */
export function mapComponents(book: AST.Book, pages: Page[]): ComponentPage[] {
  return pages.map((page) => ({
    type: page.type,
    chapterIndex: page.chapterIndex,
    components: componentsForPage(book, page),
  }));
}

function componentsForPage(book: AST.Book, page: Page): Component[] {
  switch (page.type) {
    case 'CoverPage':
      return coverComponents(book);
    case 'CopyrightPage':
      return copyrightComponents(book);
    case 'TableOfContentsPage':
      return tocComponents(book);
    case 'ChapterPage':
      return chapterHeadingComponents(book, page);
    default:
      // 블록 기반 페이지: blockRef 를 역참조해 컴포넌트로 매핑
      return page.blockRefs.map((ref) => {
        const block = book.chapters[ref.chapterIndex]?.blocks[ref.blockIndex];
        if (!block) throw new Error(`잘못된 blockRef: ch${ref.chapterIndex}/block${ref.blockIndex}`);
        return blockToComponent(block);
      });
  }
}

// ----- 메타데이터/구조 기반 -----

function coverComponents(book: AST.Book): Component[] {
  const out: Component[] = [{ type: 'TitleBlock', text: book.metadata.title }];
  if (book.metadata.subtitle) out.push({ type: 'SubtitleBlock', text: book.metadata.subtitle });
  if (book.metadata.author) out.push({ type: 'AuthorBlock', text: book.metadata.author });
  return out;
}

function copyrightComponents(book: AST.Book): Component[] {
  // 임시 고정 텍스트 (실제 발행 정보는 추후 단계에서 확장)
  const author = book.metadata.author ?? '';
  const title = book.metadata.title;
  const text = `《${title}》\n© ${author}\nAll rights reserved.`;
  return [{ type: 'CopyrightNotice', text }];
}

function tocComponents(book: AST.Book): Component[] {
  return [
    {
      type: 'TableOfContentsList',
      entries: book.chapters.map((c) => ({ number: c.number, title: c.title })),
    },
  ];
}

function chapterHeadingComponents(book: AST.Book, page: Page): Component[] {
  const ci = page.chapterIndex ?? -1;
  const chapter = book.chapters[ci];
  if (!chapter) throw new Error(`ChapterPage 의 chapterIndex 가 잘못됨: ${ci}`);
  return [{ type: 'ChapterHeading', number: chapter.number, title: chapter.title }];
}

// ----- 블록 기반 매핑 -----

function blockToComponent(block: AST.Block): Component {
  switch (block.type) {
    case 'paragraph':
      return { type: 'ParagraphBlock', text: block.text };
    case 'quote':
      return { type: 'QuoteBlock', text: block.text };
    case 'table':
      return { type: 'TableCard', columns: block.columns, rows: block.rows };
    case 'checklist':
      return { type: 'ChecklistCard', items: block.items };
    case 'compare':
      return { type: 'CompareCard', columns: block.columns, rows: block.rows };
    case 'before-after':
      return { type: 'BeforeAfterCard', before: block.before, after: block.after };
    case 'prompt':
      return { type: 'PromptCard', text: block.text };
    case 'steps':
      return { type: 'StepsCard', items: block.items };
    case 'faq':
      return { type: 'FAQCard', pairs: block.pairs };
    case 'warning':
      return { type: 'WarningCard', text: block.text };
    case 'result':
      return { type: 'ResultCard', text: block.text };
    case 'image':
      return { type: 'ImageBlock', id: block.id, imageType: block.imageType, prompt: block.prompt };
  }
}
