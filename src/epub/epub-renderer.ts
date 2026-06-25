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
import { fromDataUri } from '../assets/cover-resolver.ts';
import { escXml, nl2brXhtml } from './epub-escape.ts';
import { buildBarSvg } from '../charts/bar-chart.ts';
import { buildDonutSvg, DONUT_COLORS } from '../charts/donut-chart.ts';
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
.box.result.result-success { background: #f0fdf4; }
.box.result.result-info { background: #eff6ff; }
.box.result.result-warning { background: #fffbeb; }
.box.result.result-error { background: #fef2f2; }
.box.callout.callout-info { background: #eff6ff; }
.box.callout.callout-tip { background: #f0fdf4; }
.box.callout.callout-note { background: #f5f3ff; }
mark { background: #fef08a; color: #111827; }
.tag-inline { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0 0.4em; font-size: 0.85em; }
hr.divider { border: 0; border-top: 1px solid #e5e7eb; margin: 1.2em 0; }
.code { border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin: 1em 0; }
.code-hd { background: #f3f4f6; padding: 0.4em 0.8em; font-size: 0.8em; color: #6b7280; }
.code-pre { background: #f8fafc; margin: 0; padding: 0.8em; font-family: monospace; font-size: 0.85em; white-space: pre-wrap; word-break: break-word; }
.timeline .tl-item { border-left: 2px solid #dbe7fb; padding: 0 0 0.6em 0.8em; margin-left: 0.3em; }
.tl-date { color: #9ca3af; font-size: 0.85em; margin: 0; }
.tl-title { font-weight: bold; margin: 0; }
.tl-desc { color: #6b7280; font-size: 0.9em; margin: 0; }
.stats { display: flex; flex-wrap: wrap; gap: 0.6em; }
.stat { flex: 1 1 30%; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.8em; text-align: center; }
.stat-ic { margin: 0; }
.stat-v { font-size: 1.4em; font-weight: bold; margin: 0.2em 0 0; }
.stat-l { color: #6b7280; font-size: 0.85em; margin: 0; }
.donut-wrap { display: flex; gap: 1em; align-items: center; flex-wrap: wrap; }
.donut-legend { font-size: 0.85em; color: #374151; }
.donut-legend .lg { display: block; margin: 0.2em 0; }
.donut-legend .lg i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
.cmp { width: 100%; border-collapse: collapse; font-size: 0.9em; border: 1px solid #e5e7eb; }
.cmp th, .cmp td { padding: 0.5em 0.6em; text-align: center; border-bottom: 1px solid #e5e7eb; }
.cmp th:first-child, .cmp td:first-child { text-align: left; }
.cmp thead th { background: #f3f4f6; color: #374151; }
.cmp thead th.pro { background: #2563eb; color: #fff; }
.cmp td.pro { color: #1d4ed8; font-weight: bold; background: #f5f9ff; }
.al { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.7em 0.9em; }
.al.al-success { background: #f0fdf4; border-color: #bbf7d0; }
.al.al-info { background: #eff6ff; border-color: #bfdbfe; }
.al.al-warning { background: #fffbeb; border-color: #fde9b5; }
.al.al-error { background: #fef2f2; border-color: #fecaca; }
.al p { margin: 0; }
.proc { display: block; }
.proc-p { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.6em 0.8em; margin: 0 0 0.4em; }
.proc-ic { margin: 0; }
.proc-t { font-weight: bold; margin: 0; }
.proc-d { color: #6b7280; font-size: 0.9em; margin: 0.2em 0 0; }
.rating { font-size: 1.1em; }
.rating .rt-on { color: #f59e0b; }
.rating .rt-off { color: #d1d5db; }
.rating .rt-num { font-size: 0.85em; font-weight: bold; color: #111827; }
.rating .rt-lb { font-size: 0.85em; color: #6b7280; }
.tag-group .tg-tag { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; border-radius: 6px; padding: 0 0.4em; font-size: 0.85em; }
.chip-group .cg-chip { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; border-radius: 999px; padding: 0 0.6em; font-size: 0.85em; }
.tree { font-size: 0.95em; color: #374151; }
.tree-row { margin: 0.15em 0; }
.pgn-dots .pgn-dot { border: 1px solid #e5e7eb; border-radius: 6px; padding: 0 0.4em; font-size: 0.85em; }
.pgn-dots .pgn-dot.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.pgn-meta { font-size: 0.8em; color: #6b7280; margin: 0.3em 0 0; }
.empty { border: 1px dashed #d1d5db; border-radius: 8px; padding: 1.4em 1em; text-align: center; }
.empty-ic { font-size: 1.8em; margin: 0; }
.empty-t { font-weight: bold; margin: 0.3em 0 0; }
.empty-d { color: #6b7280; font-size: 0.9em; margin: 0.2em 0 0; }
.srch { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.6em 0.9em; background: #f9fafb; }
.srch-ph { color: #9ca3af; }
.tip-box, .pop-box { border: 1px solid #e5e7eb; border-left: 3px solid #2563eb; border-radius: 8px; padding: 0.7em 0.9em; background: #f9fafb; }
.tip-lb, .pop-t { font-weight: bold; color: #1d4ed8; margin: 0 0 0.3em; }
.tip-tx, .pop-tx { margin: 0; color: #374151; }
.modal-card, .drawer-card { border: 1px solid #bfdbfe; border-radius: 8px; padding: 0.9em 1em; background: #eff6ff; }
.modal-t, .drawer-t { font-weight: bold; color: #1e3a8a; margin: 0 0 0.3em; }
.modal-tx, .drawer-tx { margin: 0; color: #374151; }
.skel { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.9em; }
.skel-bar { height: 12px; border-radius: 6px; background: #e5e7eb; margin: 0 0 0.6em; }
.file-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.7em 0.9em; }
.file-name { font-weight: bold; color: #111827; }
.file-sub { color: #6b7280; font-size: 0.85em; }
.tlc { border-left: 2px solid #dbe7fb; padding-left: 0.9em; }
.tlc .it { margin: 0 0 0.7em; }
.tlc .ca { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.7em 0.9em; }
.tlc .dt { font-size: 0.8em; color: #9ca3af; margin: 0; }
.tlc .ti { font-weight: bold; margin: 0.1em 0 0; }
.tlc .de { color: #6b7280; font-size: 0.9em; margin: 0.2em 0 0; }
.stp { display: flex; align-items: center; justify-content: space-between; }
.stp .s { display: inline-flex; flex-direction: column; align-items: center; }
.stp .n { width: 28px; height: 28px; line-height: 24px; text-align: center; border-radius: 50%; border: 2px solid #d1d5db; color: #9ca3af; font-weight: bold; font-size: 0.85em; }
.stp .s.done .n, .stp .s.on .n { background: #2563eb; border-color: #2563eb; color: #fff; }
.stp .l { font-size: 0.75em; color: #6b7280; margin-top: 0.3em; }
.stp .s.on .l { color: #111827; font-weight: bold; }
.stp .line { flex: 1; height: 2px; background: #e5e7eb; margin: 0 0.3em; }
.stp .line.done { background: #2563eb; }
.stp-desc { margin-top: 0.9em; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.8em 1em; }
.stp-desc .t { font-weight: bold; font-size: 0.9em; margin: 0; }
.stp-desc .d { color: #6b7280; font-size: 0.85em; margin: 0.2em 0 0; }
.pg .pg-row { margin: 0 0 0.7em; }
.pg .pg-top { display: flex; justify-content: space-between; font-size: 0.9em; margin: 0 0 0.3em; color: #374151; }
.pg .pg-done { color: #16a34a; font-weight: bold; }
.pg .pg-bar { display: block; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
.pg .pg-fill { display: block; height: 8px; background: #2563eb; border-radius: 999px; }
.pg .pg-fill-done { background: #16a34a; }
.pg .pg-overall .pg-bar, .pg .pg-overall .pg-fill { height: 12px; }
.pg .pg-overall .pg-top { font-weight: bold; color: #111827; }
.feat { display: flex; gap: 0.7em; align-items: flex-start; border: 1px solid #e5e7eb; border-radius: 6px; padding: 0.8em 1em; }
.feat-ic { width: 1.8em; height: 1.8em; line-height: 1.8em; text-align: center; border-radius: 50%; background: #eff6ff; color: #2563eb; margin: 0; flex: none; }
.feat-t { font-weight: bold; margin: 0 0 0.2em; }
.feat-d { color: #6b7280; font-size: 0.9em; margin: 0 0 0.5em; }
.feat-ck { list-style: none; padding: 0; margin: 0; }
.feat-ck li { margin: 0.4em 0; }
.feat-ck li::before { content: "\\2713 "; color: #2563eb; font-weight: bold; }
.before-after { display: block; }
.before-after .before, .before-after .after { border: 1px solid #e0e0e0; border-radius: 6px; padding: 0.6em 0.9em; margin: 0.5em 0; }
pre.prompt { background: #f5f5f5; padding: 0.8em 1em; white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 0.9em; }
dl.faq dt { font-weight: bold; margin-top: 0.8em; }
figure { margin: 1em 0; text-align: center; }
figure img { max-width: 100%; height: auto; }
.image-slot { color: #888; font-style: italic; border: 1px dashed #bbb; padding: 1em; text-align: center; }
.disclaimer p { color: #555; font-size: 0.9em; }
.cover-page { margin: 0; padding: 0; text-align: center; }
.cover-page img { max-width: 100%; height: auto; }`;

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
      return `<p>${nl2brXhtml(c.text)
        .replace(/==([^=]+?)==/g, '<mark>$1</mark>')
        .replace(/\[\[tag:\s*([^\]]+?)\s*\]\]/g, '<span class="tag-inline">$1</span>')}</p>`;
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
    case 'ResultCard': {
      const rL: Record<string, string> = { success: '성공', info: '정보', warning: '주의', error: '오류' };
      const rLabel = c.variant ? rL[c.variant] : '핵심 결과';
      const rCls = c.variant ? ` result-${c.variant}` : '';
      return `<div class="box result${rCls}"><p><strong>${rLabel}</strong> ${nl2brXhtml(c.text)}</p></div>`;
    }
    case 'CalloutCard': {
      const L: Record<string, string> = { info: '정보', tip: '팁', note: '노트' };
      return `<div class="box callout callout-${c.variant}"><p><strong>${L[c.variant] ?? '정보'}</strong> ${nl2brXhtml(c.text)}</p></div>`;
    }
    case 'Divider':
      return '<hr class="divider" />';
    case 'CodeBlock':
      return `<div class="code"><div class="code-hd">${escXml(c.lang || 'CODE')}</div><pre class="code-pre">${escXml(c.code)}</pre></div>`;
    case 'ChartCard': {
      const head =
        (c.title ? `<div class="chart-title">${escXml(c.title)}</div>` : '') +
        (c.unit ? `<div class="chart-unit">단위: ${escXml(c.unit)}</div>` : '');
      if (c.chartType === 'donut') {
        const dn = Math.min(c.labels.length, c.values.length);
        const legend = c.labels
          .slice(0, dn)
          .map((l, i) => `<span class="lg"><i style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></i> ${escXml(l)} <b>${escXml(String(c.values[i]))}${c.unit ? escXml(c.unit) : ''}</b></span>`)
          .join('');
        return `<div class="chart">${head}<div class="donut-wrap">${buildDonutSvg(c.labels, c.values, c.center, c.unit)}<div class="donut-legend">${legend}</div></div></div>`;
      }
      return `<div class="chart">${head}${buildBarSvg(c.labels, c.values)}</div>`;
    }
    case 'StatsCard':
      return (
        '<div class="stats">' +
        c.items
          .map(
            (it) =>
              `<div class="stat">${it.icon ? `<p class="stat-ic">${escXml(it.icon)}</p>` : ''}<p class="stat-v">${escXml(it.value)}</p><p class="stat-l">${escXml(it.label)}</p></div>`,
          )
          .join('') +
        '</div>'
      );
    case 'TimelineCard':
      return (
        '<div class="timeline">' +
        c.items
          .map(
            (it) =>
              `<div class="tl-item"><p class="tl-date">${escXml(it.date)}</p><p class="tl-title">${escXml(it.title)}</p>${it.desc ? `<p class="tl-desc">${escXml(it.desc)}</p>` : ''}</div>`,
          )
          .join('') +
        '</div>'
      );
    case 'FeatureCard': {
      const ficon = c.icon ? `<p class="feat-ic">${escXml(c.icon)}</p>` : '';
      const fdesc = c.desc ? `<p class="feat-d">${escXml(c.desc)}</p>` : '';
      const fitems = c.items.length
        ? `<ul class="feat-ck">${c.items.map((it) => `<li>${escXml(it)}</li>`).join('')}</ul>`
        : '';
      return `<div class="feat">${ficon}<div class="feat-body"><p class="feat-t">${escXml(c.title)}</p>${fdesc}${fitems}</div></div>`;
    }
    case 'ProgressCard': {
      const rows = c.items
        .map((it, i) => {
          const done = it.percent >= 100;
          const valTxt = done ? '완료 ✓' : `${it.percent}%`;
          const overall = i === 0 ? ' pg-overall' : '';
          const fill = `<span class="pg-fill${done ? ' pg-fill-done' : ''}" style="width:${it.percent}%"></span>`;
          return `<div class="pg-row${overall}"><p class="pg-top"><span>${escXml(it.label)}</span><span class="${done ? 'pg-done' : 'pg-val'}">${valTxt}</span></p><span class="pg-bar">${fill}</span></div>`;
        })
        .join('');
      return `<div class="pg">${rows}</div>`;
    }
    case 'StepperCard': {
      const n = c.steps.length;
      if (n === 0) return '<div class="stp"></div>';
      const cur = c.current;
      let row = '';
      c.steps.forEach((label, idx) => {
        const s = idx + 1;
        const state = s < cur ? 'done' : s === cur ? 'on' : 'todo';
        const mark = state === 'done' ? '✓' : String(s);
        row += `<span class="s ${state}"><span class="n">${mark}</span><span class="l">${escXml(label)}</span></span>`;
        if (idx < n - 1) row += `<span class="line${s < cur ? ' done' : ''}"></span>`;
      });
      const curLabel = c.steps[cur - 1] ?? '';
      const descBox = c.desc
        ? `<div class="stp-desc"><p class="t">${cur}단계: ${escXml(curLabel)}</p><p class="d">${escXml(c.desc)}</p></div>`
        : '';
      return `<div class="stp">${row}</div>${descBox}`;
    }
    case 'TimelineCardList': {
      if (c.items.length === 0) return '<div class="tlc"></div>';
      const items = c.items
        .map(
          (it) =>
            `<div class="it"><div class="ca">${it.date ? `<p class="dt">${escXml(it.date)}</p>` : ''}<p class="ti">${escXml(it.title)}</p>${it.desc ? `<p class="de">${escXml(it.desc)}</p>` : ''}</div></div>`,
        )
        .join('');
      return `<div class="tlc">${items}</div>`;
    }
    case 'ComparisonCard': {
      const hi = c.columns.indexOf(c.highlight);
      const head = c.columns.map((col, i) => `<th${i === hi ? ' class="pro"' : ''}>${escXml(col)}</th>`).join('');
      const bodyRows = c.rows
        .map((r) => `<tr>${r.map((cell, i) => `<td${i === hi ? ' class="pro"' : ''}>${escXml(cell)}</td>`).join('')}</tr>`)
        .join('');
      return `<table class="cmp"><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }
    case 'AlertCard': {
      const L: Record<string, string> = { success: '성공', info: '정보', warning: '경고', error: '오류' };
      return `<div class="al al-${c.variant}"><p><strong>${L[c.variant] ?? '정보'}</strong> ${nl2brXhtml(c.text)}</p></div>`;
    }
    case 'ProcessCard': {
      if (c.items.length === 0) return '<div class="proc"></div>';
      const cells = c.items
        .map(
          (it) =>
            `<div class="proc-p">${it.icon ? `<p class="proc-ic">${escXml(it.icon)}</p>` : ''}<p class="proc-t">${escXml(it.title)}</p>${it.desc ? `<p class="proc-d">${escXml(it.desc)}</p>` : ''}</div>`,
        )
        .join('');
      return `<div class="proc">${cells}</div>`;
    }
    case 'RatingCard': {
      const filled = Math.round(c.value);
      const on = '★'.repeat(Math.max(0, filled));
      const off = '☆'.repeat(Math.max(0, c.max - filled));
      return `<p class="rating"><span class="rt-on">${on}</span><span class="rt-off">${off}</span> <span class="rt-num">${escXml(`${c.value} / ${c.max}`)}</span>${c.label ? ` <span class="rt-lb">${escXml(c.label)}</span>` : ''}</p>`;
    }
    case 'TagGroup':
      return `<p class="tag-group">${c.items.map((t) => `<span class="tg-tag">${escXml(t)}</span>`).join(' ')}</p>`;
    case 'ChipGroup':
      return `<p class="chip-group">${c.items.map((t) => `<span class="cg-chip">${escXml(t)}</span>`).join(' ')}</p>`;
    case 'TreeCard':
      return `<div class="tree">${c.items
        .map((it) => `<p class="tree-row" style="padding-left:${it.depth * 18}px">└ ${escXml(it.label)}</p>`)
        .join('')}</div>`;
    case 'PaginationCard': {
      const dots = Array.from({ length: c.total }, (_, i) => `<span class="pgn-dot${i + 1 === c.current ? ' on' : ''}">${i + 1}</span>`).join(' ');
      return `<div class="pgn"><p class="pgn-dots">${dots}</p><p class="pgn-meta">${c.current} / ${c.total} 페이지</p></div>`;
    }
    case 'EmptyState':
      return `<div class="empty">${c.icon ? `<p class="empty-ic">${escXml(c.icon)}</p>` : ''}<p class="empty-t">${escXml(c.title)}</p>${c.desc ? `<p class="empty-d">${escXml(c.desc)}</p>` : ''}</div>`;
    case 'SearchBar': {
      const shown = c.query || c.placeholder;
      return `<p class="srch"><span class="srch-ic">🔍</span> <span class="${c.query ? 'srch-q' : 'srch-ph'}">${escXml(shown)}</span></p>`;
    }
    case 'TooltipBox':
      return `<div class="tip-box">${c.label ? `<p class="tip-lb">${escXml(c.label)}</p>` : ''}<p class="tip-tx">${nl2brXhtml(c.text)}</p></div>`;
    case 'PopoverBox':
      return `<div class="pop-box">${c.title ? `<p class="pop-t">${escXml(c.title)}</p>` : ''}<p class="pop-tx">${nl2brXhtml(c.text)}</p></div>`;
    case 'ModalCard':
      return `<div class="modal-card"><p class="modal-t">${escXml(c.title)}</p><p class="modal-tx">${nl2brXhtml(c.text)}</p></div>`;
    case 'DrawerCard':
      return `<div class="drawer-card"><p class="drawer-t">${escXml(c.title)}</p><p class="drawer-tx">${nl2brXhtml(c.text)}</p></div>`;
    case 'SkeletonCard':
      return `<div class="skel">${Array.from({ length: c.lines }, (_, i) => `<p class="skel-bar"${i === c.lines - 1 ? ' style="width:60%"' : ''}></p>`).join('')}</div>`;
    case 'FileCard': {
      const sub = [c.fileType, c.size].filter((s) => s !== '').join(' · ');
      return `<div class="file-card"><span class="file-ic">📄</span><span class="file-meta"><span class="file-name">${escXml(c.name)}</span>${sub ? `<span class="file-sub">${escXml(sub)}</span>` : ''}</span></div>`;
    }
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

  // 표지 이미지(있으면): 전용 cover.xhtml + cover-image 자산. 표지는 nav(목차)에서 제외.
  const coverComp = fm.components.find((c) => c.type === 'CoverImage');
  let coverDoc: EpubDoc | undefined;
  let coverImageId: string | undefined;
  if (coverComp && coverComp.type === 'CoverImage') {
    const decoded = fromDataUri(coverComp.src);
    if (decoded) {
      const ext = normalizeExt(decoded.ext);
      const file = `images/cover.${ext}`;
      coverImageId = 'cover-image';
      ctx.media.push({ id: coverImageId, file, mediaType: imageContentType(ext), data: decoded.data, properties: 'cover-image' });
      coverDoc = {
        id: 'cover',
        file: 'text/cover.xhtml',
        title: fm.meta.title,
        body: `<div class="cover-page"><img src="../${file}" alt="${escXml(coverComp.alt ?? fm.meta.title)}"/></div>`,
      };
    }
  }

  // Front Matter 문서: 목차(TableOfContentsList)는 nav.xhtml 로 분리, 표지 이미지는 cover.xhtml 로 분리
  const frontComponents = fm.components.filter(
    (c) => c.type !== 'TableOfContentsList' && c.type !== 'CoverImage',
  );
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

  // 표지(cover.xhtml)가 있으면 spine 맨 앞. nav(목차)에는 표지를 넣지 않는다.
  const docs = coverDoc ? [coverDoc, frontDoc, ...chapterDocs] : [frontDoc, ...chapterDocs];
  const nav = [frontDoc, ...chapterDocs].map((d) => ({ href: d.file, label: d.title }));

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
    coverImageId,
  };
}
