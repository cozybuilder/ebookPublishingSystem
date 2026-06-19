/**
 * Ebook Publishing System — Component → EPUB(XHTML) 렌더러 (v1)
 *
 * Book → Front Matter(표지/판권/저자 소개/면책) + 챕터 단위 XHTML 문서 + 목차(nav) + 이미지 자산.
 * 단순/안정 우선: reflowable XHTML, 최소 클래스. 고급 디자인/캡션/사이징 제외.
 * 이미지 I/O 는 resolver 주입(순수성 유지).
 */

import type { Book } from '../types/ast.ts';
import type { Component } from '../types/component.ts';
import { buildPages } from '../page-builder/page-builder.ts';
import { mapComponents } from '../component-mapper/component-mapper.ts';
import { FullBookPDF } from '../page-builder/profiles.ts';
import { buildFrontMatter } from '../front-matter/front-matter-generator.ts';
import type { FrontMatterOverrides } from '../front-matter/front-matter-types.ts';
import { imageContentType, normalizeExt } from '../docx/docx-image.ts';
import { escXml, nl2brXhtml } from './epub-escape.ts';
import type { EpubDoc, EpubMediaItem, EpubModel } from './epub-package.ts';

/** page-builder 자동 앞페이지(Front Matter 가 대체) */
const AUTO_FRONT_PAGES = new Set(['CoverPage', 'CopyrightPage', 'TableOfContentsPage']);

/** ImageBlock → 실제 이미지 해석기(없으면 null → placeholder). DOCX 와 동일 시그니처. */
export type EpubImageResolver = (block: { id: string; imageType: string; prompt: string }) => {
  data: Buffer;
  ext: string;
} | null;

interface RenderCtx {
  resolver?: EpubImageResolver;
  media: EpubMediaItem[];
  seen: Set<string>;
}

/** 기본 EPUB 스타일(단순). */
export const DEFAULT_EPUB_CSS = `body { font-family: serif; line-height: 1.7; margin: 1em 1.2em; color: #1a1a1a; }
h1 { font-size: 1.6em; line-height: 1.3; margin: 1em 0 0.6em; }
h2 { font-size: 1.3em; margin: 1.4em 0 0.5em; }
h3 { font-size: 1.1em; margin: 1em 0 0.4em; }
p { margin: 0 0 0.8em; }
.book-title { text-align: center; font-size: 2em; margin-top: 2em; }
.subtitle { text-align: center; color: #555; font-size: 1.2em; }
.author { text-align: center; color: #555; margin-bottom: 2em; }
.copyright { color: #555; font-size: 0.9em; border-top: 1px solid #ddd; padding-top: 1em; margin-top: 2em; }
.chapter-title { border-bottom: 2px solid #1f2d5a; padding-bottom: 0.3em; }
blockquote { margin: 1em 0; padding: 0.2em 1em; border-left: 4px solid #c9d2e3; color: #41506e; font-style: italic; }
ul.checklist { list-style: none; padding-left: 0; }
ul.checklist li { margin: 0.3em 0; }
ol.steps li { margin: 0.4em 0; }
table { border-collapse: collapse; width: 100%; margin: 1em 0; }
th, td { border: 1px solid #d8dee9; padding: 0.4em 0.6em; text-align: left; }
th { background: #f2f5fa; }
.box { border-radius: 6px; padding: 0.8em 1em; margin: 1em 0; }
.box.warning { background: #fff1e6; }
.box.result { background: #eaf2fb; }
.before-after { display: block; }
.before-after .before, .before-after .after { border: 1px solid #e0e0e0; border-radius: 6px; padding: 0.6em 0.9em; margin: 0.5em 0; }
pre.prompt { background: #f5f5f5; padding: 0.8em 1em; white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 0.9em; }
dl.faq dt { font-weight: bold; margin-top: 0.8em; }
figure { margin: 1em 0; text-align: center; }
figure img { max-width: 100%; height: auto; }
.image-slot { color: #888; font-style: italic; border: 1px dashed #bbb; padding: 1em; text-align: center; }
.disclaimer p { color: #555; font-size: 0.9em; }`;

function tableXhtml(columns: string[], rows: string[][]): string {
  const head = `<thead><tr>${columns.map((c) => `<th>${escXml(c)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${escXml(c)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<table>${head}${body}</table>`;
}

function imageXhtml(c: { id: string; imageType: string; prompt: string }, ctx: RenderCtx): string {
  const resolved = ctx.resolver?.(c);
  if (!resolved) {
    return `<p class="image-slot">[이미지: ${escXml(c.id)} — ${escXml(c.prompt)}]</p>`;
  }
  const ext = normalizeExt(resolved.ext);
  const file = `images/${c.id}.${ext}`;
  if (!ctx.seen.has(c.id)) {
    ctx.seen.add(c.id);
    ctx.media.push({ id: `img-${c.id}`, file, mediaType: imageContentType(ext), data: resolved.data });
  }
  return `<figure><img src="../${file}" alt="${escXml(c.prompt)}"/></figure>`;
}

/** 단일 Component → XHTML 조각 */
export function componentToXhtml(c: Component, ctx: RenderCtx): string {
  switch (c.type) {
    case 'TitleBlock':
      return `<h1 class="book-title">${escXml(c.text)}</h1>`;
    case 'SubtitleBlock':
      return `<p class="subtitle">${escXml(c.text)}</p>`;
    case 'AuthorBlock':
      return `<p class="author">${escXml(c.text)}</p>`;
    case 'ChapterHeading':
      return `<h1 class="chapter-title">Chapter ${c.number}. ${escXml(c.title)}</h1>`;
    case 'TableOfContentsList':
      return (
        '<nav epub:type="toc"><h2>목차</h2><ol>' +
        c.entries.map((e) => `<li>${e.number}. ${escXml(e.title)}</li>`).join('') +
        '</ol></nav>'
      );
    case 'CopyrightNotice':
      return `<div class="copyright"><p>${nl2brXhtml(c.text)}</p></div>`;
    case 'AuthorBio':
      return `<section class="author-bio"><h2>${escXml(c.heading)}</h2><p>${nl2brXhtml(c.text)}</p></section>`;
    case 'Disclaimer':
      return `<section class="disclaimer"><h2>${escXml(c.heading)}</h2><p>${nl2brXhtml(c.text)}</p></section>`;
    case 'ParagraphBlock':
      return `<p>${nl2brXhtml(c.text)}</p>`;
    case 'QuoteBlock':
      return `<blockquote><p>${nl2brXhtml(c.text)}</p></blockquote>`;
    case 'ChecklistCard':
      return (
        '<ul class="checklist">' +
        c.items.map((it) => `<li>☐ ${escXml(it)}</li>`).join('') +
        '</ul>'
      );
    case 'StepsCard':
      return '<ol class="steps">' + c.items.map((it) => `<li>${escXml(it)}</li>`).join('') + '</ol>';
    case 'TableCard':
    case 'CompareCard':
      return tableXhtml(c.columns, c.rows);
    case 'BeforeAfterCard':
      return (
        '<div class="before-after">' +
        `<div class="before"><h3>Before</h3><p>${nl2brXhtml(c.before)}</p></div>` +
        `<div class="after"><h3>After</h3><p>${nl2brXhtml(c.after)}</p></div>` +
        '</div>'
      );
    case 'PromptCard':
      return `<pre class="prompt">${escXml(c.text)}</pre>`;
    case 'FAQCard':
      return (
        '<dl class="faq">' +
        c.pairs.map((p) => `<dt>Q. ${escXml(p.q)}</dt><dd>A. ${nl2brXhtml(p.a)}</dd>`).join('') +
        '</dl>'
      );
    case 'WarningCard':
      return `<div class="box warning"><p><strong>주의</strong> ${nl2brXhtml(c.text)}</p></div>`;
    case 'ResultCard':
      return `<div class="box result"><p><strong>핵심 결과</strong> ${nl2brXhtml(c.text)}</p></div>`;
    case 'ImageBlock':
      return imageXhtml(c, ctx);
    default:
      return `<p>${escXml(String((c as { type?: string }).type ?? ''))}</p>`;
  }
}

function renderBody(components: Component[], ctx: RenderCtx): string {
  return components.map((c) => componentToXhtml(c, ctx)).join('\n');
}

function pad3(n: number): string {
  return String(n).padStart(3, '0');
}

/** Book → EPUB 모델(Front Matter + 챕터 분할 + nav + media). */
export function buildEpubModel(
  book: Book,
  opts: { uuid: string; modified: string; resolver?: EpubImageResolver; overrides?: FrontMatterOverrides },
): EpubModel {
  const fm = buildFrontMatter(book, opts.overrides);
  const ctx: RenderCtx = { resolver: opts.resolver, media: [], seen: new Set() };

  // Front Matter 문서: 목차(TableOfContentsList)는 nav.xhtml 로 분리하므로 본문에서 제외
  const frontComponents = fm.components.filter((c) => c.type !== 'TableOfContentsList');
  const frontDoc: EpubDoc = {
    id: 'front',
    file: 'text/front-matter.xhtml',
    title: fm.meta.title,
    body: renderBody(frontComponents, ctx),
  };

  // 본문: 자동 앞페이지 제외 후 챕터 단위로 묶음
  const bodyPages = buildPages(book, FullBookPDF).filter((p) => !AUTO_FRONT_PAGES.has(p.type));
  const compPages = mapComponents(book, bodyPages);
  const byChapter = new Map<number, Component[]>();
  const order: number[] = [];
  for (const p of compPages) {
    const ci = p.chapterIndex ?? -1;
    if (!byChapter.has(ci)) {
      byChapter.set(ci, []);
      order.push(ci);
    }
    byChapter.get(ci)!.push(...p.components);
  }

  const chapterDocs: EpubDoc[] = order.map((ci) => {
    const chapter = book.chapters[ci];
    const number = chapter?.number ?? ci + 1;
    const title = chapter?.title ?? `Chapter ${number}`;
    return {
      id: `ch${pad3(number)}`,
      file: `text/chapter-${pad3(number)}.xhtml`,
      title: `${number}. ${title}`,
      body: renderBody(byChapter.get(ci)!, ctx),
    };
  });

  const docs = [frontDoc, ...chapterDocs];
  const nav = docs.map((d) => ({ href: d.file, label: d.title }));

  return {
    title: fm.meta.title,
    author: fm.meta.author,
    lang: 'ko',
    uuid: opts.uuid,
    modified: opts.modified,
    css: DEFAULT_EPUB_CSS,
    docs,
    media: ctx.media,
    nav,
  };
}
