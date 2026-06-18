/**
 * Ebook Publishing System — HTML Renderer (v0.1)
 *
 * LayoutPage 목록 + DesignTokens → 사람이 확인 가능한 HTML 미리보기 문자열.
 *
 * 기준 문서: docs/04_PIPELINE.md [7], docs/08_DESIGN_SYSTEM.md
 *
 * v0.1 범위:
 *  - 의존성 0. 순수 문자열 조립으로 단일 HTML 파일 생성(인라인 <style>).
 *  - 승인된 디자인 토큰을 CSS 변수로 반영(colors/typography/spacing/radius/tone).
 *  - ImageBlock 은 실제 이미지가 아니라 "이미지 슬롯 카드"로 표시.
 *  하지 않는 것: PDF/DOCX/이미지 파일 생성, HTML→PDF 변환, 실제 페이지 넘김 계산.
 */

import type { Component } from '../types/component.ts';
import type { DesignTokens, LayoutComponent, LayoutPage } from '../types/design.ts';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, '<br>');
}

/** 승인 토큰을 CSS 변수 + 기본 스타일로 변환 */
function buildCss(t: DesignTokens): string {
  const c = t.colors;
  const ty = t.typography;
  const sp = t.spacing;
  return `
:root {
  --navy: ${c.navy};
  --orange: ${c.orange};
  --cyan: ${c.cyan};
  --ink: ${c.ink};
  --gray: ${c.gray};
  --paper: ${c.paper};

  --font: ${ty.fontFamily === 'system' ? '-apple-system, "Segoe UI", "Malgun Gothic", sans-serif' : ty.fontFamily};
  --fs-title: ${ty.scale.title}px;
  --fs-chapter: ${ty.scale.chapter}px;
  --fs-body: ${ty.scale.body}px;
  --fs-caption: ${ty.scale.caption}px;
  --fs-emphasis: ${ty.scale.emphasis}px;
  --lh-body: ${ty.lineHeight.body};
  --lh-heading: ${ty.lineHeight.heading};

  --sp-xs: ${sp.xs}px;
  --sp-sm: ${sp.sm}px;
  --sp-md: ${sp.md}px;
  --sp-lg: ${sp.lg}px;
  --sp-xl: ${sp.xl}px;
  --sp-xxl: ${sp.xxl}px;

  --r-card: ${t.radius.card}px;
  --r-image: ${t.radius.image}px;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  background: #e9ecef;
  font-family: var(--font);
  color: var(--ink);
  line-height: var(--lh-body);
}
.book { padding: var(--sp-xl) var(--sp-md); }

/* PDF 한 면처럼 보이는 페이지 컨테이너 */
.page {
  background: var(--paper);
  width: 820px;
  max-width: 100%;
  margin: 0 auto var(--sp-xl);
  padding: var(--sp-xxl) var(--sp-xl);
  box-shadow: 0 2px 12px rgba(0,0,0,.12);
  border-radius: var(--r-image);
}
.page-label {
  font-size: var(--fs-caption);
  color: var(--gray);
  text-transform: uppercase;
  letter-spacing: .08em;
  margin-bottom: var(--sp-md);
}

/* 타이포 역할 */
.ty-title    { font-size: var(--fs-title);    line-height: var(--lh-heading); color: var(--navy); font-weight: 800; margin: 0 0 var(--sp-md); }
.ty-chapter  { font-size: var(--fs-chapter);  line-height: var(--lh-heading); color: var(--navy); font-weight: 700; margin: 0 0 var(--sp-md); }
.ty-body     { font-size: var(--fs-body);     line-height: var(--lh-body); margin: 0 0 var(--sp-md); }
.ty-caption  { font-size: var(--fs-caption);  color: var(--gray); margin: 0 0 var(--sp-sm); }
.ty-emphasis { font-size: var(--fs-emphasis); color: var(--navy); margin: 0 0 var(--sp-sm); }

/* 카드 공통 */
.card {
  border-radius: var(--r-card);
  padding: var(--sp-md);
  margin: 0 0 var(--sp-md);
  border: 1px solid #e1e4e8;
  background: #fff;
}
.card-label {
  font-size: var(--fs-caption);
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
  margin-bottom: var(--sp-sm);
}

/* 톤 (의미 기반 매핑) */
.tone-emphasis { border-left: 4px solid var(--orange); }
.tone-emphasis .card-label { color: var(--orange); }
.tone-info { border-left: 4px solid var(--cyan); }
.tone-info .card-label { color: var(--cyan); }
.tone-neutral { border-left: 4px solid var(--navy); }
.tone-neutral .card-label { color: var(--navy); }

/* 표 */
table { width: 100%; border-collapse: collapse; font-size: var(--fs-body); }
th, td { border: 1px solid #e1e4e8; padding: var(--sp-sm); text-align: left; }
th { background: var(--navy); color: var(--paper); }

/* 리스트류 */
.checklist { list-style: none; padding-left: 0; margin: 0; }
.checklist li { margin: var(--sp-xs) 0; }
.steps { margin: 0; padding-left: var(--sp-lg); }
.toc { list-style: none; padding-left: 0; }
.toc li { padding: var(--sp-xs) 0; border-bottom: 1px dashed #e1e4e8; }

/* before/after */
.before-after { display: flex; gap: var(--sp-md); }
.before-after > div { flex: 1; }
.ba-label { font-weight: 700; font-size: var(--fs-caption); }

/* prompt */
.prompt pre {
  margin: 0; white-space: pre-wrap; font-family: "SFMono-Regular", Consolas, monospace;
  font-size: var(--fs-body);
}

/* faq */
.faq-q { font-weight: 700; color: var(--navy); margin-top: var(--sp-sm); }
.faq-a { margin: var(--sp-xs) 0 var(--sp-sm) var(--sp-md); }

/* image slot */
.image-slot {
  border: 2px dashed var(--cyan);
  border-radius: var(--r-image);
  background: #f1fbfd;
  text-align: center;
}
.image-slot .slot-tag { font-weight: 700; color: var(--cyan); letter-spacing: .08em; }
.image-slot .slot-meta { font-size: var(--fs-caption); color: var(--gray); margin-top: var(--sp-xs); }
.image-slot .slot-prompt { font-size: var(--fs-body); margin-top: var(--sp-sm); }
`.trim();
}

function renderComponentInner(c: Component): string {
  switch (c.type) {
    case 'TitleBlock':
      return `<h1 class="ty-title">${esc(c.text)}</h1>`;
    case 'SubtitleBlock':
      return `<p class="ty-emphasis">${esc(c.text)}</p>`;
    case 'AuthorBlock':
      return `<p class="ty-caption">${esc(c.text)}</p>`;
    case 'ChapterHeading':
      return `<h2 class="ty-chapter">Chapter ${c.number}. ${esc(c.title)}</h2>`;
    case 'TableOfContentsList':
      return `<ul class="toc">${c.entries
        .map((e) => `<li><strong>${e.number}.</strong> ${esc(e.title)}</li>`)
        .join('')}</ul>`;
    case 'CopyrightNotice':
      return `<div class="ty-caption">${nl2br(c.text)}</div>`;
    case 'ParagraphBlock':
      return `<p class="ty-body">${esc(c.text)}</p>`;
    case 'TableCard':
      return `<div class="card-label">표</div>${renderTable(c.columns, c.rows)}`;
    case 'ChecklistCard':
      return `<div class="card-label">체크리스트</div><ul class="checklist">${c.items
        .map((i) => `<li>☐ ${esc(i)}</li>`)
        .join('')}</ul>`;
    case 'CompareCard':
      return `<div class="card-label">비교</div>${renderTable(c.columns, c.rows)}`;
    case 'BeforeAfterCard':
      return `<div class="card-label">Before / After</div><div class="before-after"><div><div class="ba-label">Before</div>${esc(
        c.before,
      )}</div><div><div class="ba-label">After</div>${esc(c.after)}</div></div>`;
    case 'PromptCard':
      return `<div class="card-label">프롬프트</div><div class="prompt"><pre>${esc(c.text)}</pre></div>`;
    case 'StepsCard':
      return `<div class="card-label">단계</div><ol class="steps">${c.items
        .map((i) => `<li>${esc(i)}</li>`)
        .join('')}</ol>`;
    case 'FAQCard':
      return `<div class="card-label">FAQ</div>${c.pairs
        .map((p) => `<div class="faq-q">Q. ${esc(p.q)}</div><div class="faq-a">A. ${esc(p.a)}</div>`)
        .join('')}`;
    case 'WarningCard':
      return `<div class="card-label">주의</div><div class="ty-body">${esc(c.text)}</div>`;
    case 'ResultCard':
      return `<div class="card-label">결과</div><div class="ty-body">${esc(c.text)}</div>`;
    case 'ImageBlock':
      return `<div class="slot-tag">IMAGE SLOT</div><div class="slot-meta">id: ${esc(c.id)} · type: ${esc(
        c.imageType,
      )}</div><div class="slot-prompt">${esc(c.prompt)}</div>`;
  }
}

function renderTable(columns: string[], rows: string[][]): string {
  const head = `<tr>${columns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/** 카드형 컴포넌트는 .card 래퍼 + 톤 클래스. 텍스트/구조형은 그대로. */
const CARD_COMPONENTS = new Set<Component['type']>([
  'TableCard',
  'ChecklistCard',
  'CompareCard',
  'BeforeAfterCard',
  'PromptCard',
  'StepsCard',
  'FAQCard',
  'WarningCard',
  'ResultCard',
  'ImageBlock',
]);

function renderLayoutComponent(lc: LayoutComponent): string {
  const inner = renderComponentInner(lc.component);
  if (CARD_COMPONENTS.has(lc.componentType)) {
    const imageCls = lc.componentType === 'ImageBlock' ? ' image-slot' : '';
    return `<div class="card tone-${lc.tone}${imageCls}" data-id="${lc.componentId}" data-type="${lc.componentType}">${inner}</div>`;
  }
  return `<div data-id="${lc.componentId}" data-type="${lc.componentType}">${inner}</div>`;
}

function renderPage(page: LayoutPage): string {
  const body = page.components.map(renderLayoutComponent).join('\n');
  return `<section class="page" data-page="${page.pageType}">
  <div class="page-label">${page.pageType}</div>
  ${body}
</section>`;
}

export function renderHtml(pages: LayoutPage[], tokens: DesignTokens, docTitle: string): string {
  const css = buildCss(tokens);
  const pagesHtml = pages.map(renderPage).join('\n');
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(docTitle)}</title>
<style>
${css}
</style>
</head>
<body>
<main class="book">
${pagesHtml}
</main>
</body>
</html>
`;
}
