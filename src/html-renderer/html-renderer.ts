/**
 * Ebook Publishing System — HTML Renderer (v0.2 디자인 개선)
 *
 * LayoutPage 목록 + DesignTokens → CozyBuilder Lab 스타일의 전자책 상품 미리보기 HTML.
 *
 * 기준 문서: docs/04_PIPELINE.md [7], docs/08_DESIGN_SYSTEM.md
 *
 * 디자인 방향(코지 검수 반영):
 *  - 개발자 문서/관리자 화면 느낌 제거, 부드럽고 고급스러운 상품 톤.
 *  - 카드형 인포그래픽 느낌 강화(의미별 시각 차이, 넓은 여백, 연한 테두리, 부드러운 그림자).
 *  - 디자인 토큰 v0.1 값(HEX/크기)은 유지하되 "표현 방식"만 개선.
 *
 * 범위 밖: PDF/DOCX/이미지 파일 생성, HTML→PDF 변환, 페이지 넘김 계산, 외부 라이브러리.
 */

import type { Component } from '../types/component.ts';
import type { DesignTokens, LayoutComponent, LayoutPage } from '../types/design.ts';
import type { StyleRecipe } from '../types/theme.ts';

/**
 * 렌더러의 기본 스타일 레시피 = 현재 승인된 CozyBuilder Lab(v0.2) 표현.
 * 테마 엔진의 CozyBuilderLab 테마가 이 값을 그대로 사용한다.
 * (렌더러는 테마 이름을 모르며, 레시피/토큰이라는 "최종 스타일"만 입력으로 받는다.)
 */
export const BASE_RECIPE: StyleRecipe = {
  pageBackground: 'linear-gradient(180deg, #f1eee7 0%, #ece8df 100%)',
  pageShadow: true,
  pageRadius: 22,
  cardShadow: true,
  cardTint: true,
  cardBorder: 'rgba(31,45,90,.10)',
  accent: true,
  tableHeaderTinted: true,
  checkboxRadius: 7,
  density: 'comfortable',
  cardStyle: 'soft',
  tableStyle: 'lined',
  badgeStyle: 'solid',
};

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

/** 승인 토큰 + 스타일 레시피를 CSS 변수 + 상품형 스타일로 변환 */
function buildCss(t: DesignTokens, r: StyleRecipe): string {
  const c = t.colors;
  const ty = t.typography;
  const sp = t.spacing;
  const softStack =
    'Pretendard, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", system-ui, sans-serif';

  // 레시피 다이얼 → CSS 값
  const pageShadow = r.pageShadow ? '0 18px 50px rgba(31,45,90,.10), 0 2px 6px rgba(31,45,90,.05)' : 'none';
  const cardShadow = r.cardShadow ? '0 6px 18px rgba(31,45,90,.05)' : 'none';
  const emphasisBg = r.cardTint ? '#fff6ee' : '#fff';
  const emphasisLine = r.cardTint ? '#fbe0c8' : r.cardBorder;
  const infoBg = r.cardTint ? '#ecfafc' : '#fff';
  const infoLine = r.cardTint ? '#cdeef3' : r.cardBorder;
  const thBg = r.tableHeaderTinted ? 'var(--neutral-bg)' : '#fff';
  const subtitleAccentDisplay = r.accent ? 'block' : 'none';
  const stepsBadgeShadow = r.accent ? '0 4px 10px rgba(31,182,201,.35)' : 'none';
  const rowHover = r.accent ? '#fafbfe' : 'transparent';

  // v3 다이얼
  const spacious = r.density === 'spacious';
  const pagePadding = spacious ? '96px 80px' : '64px 56px';
  const pageBorder = r.pageShadow ? 'none' : `1px solid ${r.cardBorder}`;
  const cardPadding = spacious ? 'var(--sp-xl)' : 'var(--sp-lg)';
  const blockGap = spacious ? 'var(--sp-xl)' : 'var(--sp-lg)';
  const cardBg = r.cardStyle === 'glass' ? '#fcfdff' : '#fff';
  const cellPad = r.tableStyle === 'open' ? '18px 22px' : '14px 18px';
  const tblBorder = r.tableStyle === 'open' ? 'transparent' : 'var(--neutral-line)';
  const badgeBg = r.badgeStyle === 'outline' ? '#fff' : 'var(--cyan)';
  const badgeColor = r.badgeStyle === 'outline' ? 'var(--cyan)' : '#fff';
  const badgeBorder = r.badgeStyle === 'outline' ? '2px solid var(--cyan)' : '0';

  return `
:root {
  --navy: ${c.navy};
  --orange: ${c.orange};
  --cyan: ${c.cyan};
  --ink: ${c.ink};
  --gray: ${c.gray};
  --paper: ${c.paper};

  /* 의미 톤별 배경/포인트 (레시피가 틴트 on/off 결정) */
  --emphasis-bg: ${emphasisBg};
  --emphasis-line: ${emphasisLine};
  --info-bg: ${infoBg};
  --info-line: ${infoLine};
  --neutral-bg: #f6f8fc;
  --neutral-line: #e7ecf5;
  --hairline: ${r.cardBorder};

  --font: ${ty.fontFamily === 'system' ? softStack : ty.fontFamily};
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
html { -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
body {
  margin: 0;
  background: ${r.pageBackground};
  font-family: var(--font);
  color: var(--ink);
  line-height: var(--lh-body);
  letter-spacing: -0.01em;
}
.book { padding: var(--sp-xxl) var(--sp-lg); }

/* 전자책 한 면 */
.page {
  position: relative;
  background: var(--paper);
  width: 840px;
  max-width: 100%;
  margin: 0 auto var(--sp-xl);
  padding: ${pagePadding};
  border-radius: ${r.pageRadius}px;
  box-shadow: ${pageShadow};
  border: ${pageBorder};
}
.page-label {
  position: absolute;
  top: 22px;
  right: 28px;
  font-size: 10px;
  color: var(--gray);
  letter-spacing: .18em;
  text-transform: uppercase;
  opacity: .65;
}

/* 타이포 위계 */
.ty-title {
  font-size: var(--fs-title); line-height: var(--lh-heading);
  color: var(--navy); font-weight: 800; letter-spacing: -0.02em;
  margin: 0 0 var(--sp-md);
}
.ty-chapter {
  font-size: var(--fs-chapter); line-height: var(--lh-heading);
  color: var(--navy); font-weight: 750; letter-spacing: -0.02em;
  margin: 0 0 var(--sp-sm);
}
.ty-body { font-size: var(--fs-body); line-height: var(--lh-body); margin: 0 0 var(--sp-md); color: #2b3346; }
.ty-caption { font-size: var(--fs-caption); color: var(--gray); margin: 0 0 var(--sp-sm); }
.ty-emphasis { font-size: var(--fs-emphasis); color: #41506e; font-weight: 600; margin: 0 0 var(--sp-md); }

.subtitle-accent { display: ${subtitleAccentDisplay}; width: 44px; height: 4px; border-radius: 4px; background: var(--orange); margin: var(--sp-md) 0 var(--sp-lg); }

/* 카드 공통 — 연한 테두리, 부드러운 그림자, 넓은 여백 */
.card {
  border-radius: var(--r-card);
  padding: ${cardPadding};
  margin: ${blockGap} 0;
  background: ${cardBg};
  border: 1px solid var(--hairline);
  box-shadow: ${cardShadow};
}
.card-label {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 700; letter-spacing: .02em;
  color: var(--navy);
  margin: 0 0 var(--sp-md);
}
.card-label::before {
  content: ""; width: 9px; height: 9px; border-radius: 3px; background: var(--navy);
}

/* 의미 톤 — 좌측 굵은 선 대신 연한 배경 + 포인트 */
.tone-emphasis { background: var(--emphasis-bg); border-color: var(--emphasis-line); }
.tone-emphasis .card-label { color: var(--orange); }
.tone-emphasis .card-label::before { background: var(--orange); }
.tone-info { background: var(--info-bg); border-color: var(--info-line); }
.tone-info .card-label { color: #128799; }
.tone-info .card-label::before { background: var(--cyan); }
.tone-neutral { background: #fff; }
.tone-neutral .card-label { color: var(--navy); }

/* 표 — 인포그래픽형 */
.tbl { border: 1px solid ${tblBorder}; border-radius: 14px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: var(--fs-body); }
th, td { padding: ${cellPad}; text-align: left; }
th {
  background: ${thBg}; color: var(--navy);
  font-weight: 700; font-size: 13px; letter-spacing: .02em;
  border-bottom: 1px solid var(--neutral-line);
}
td { border-bottom: 1px solid #f0f2f7; color: #38415a; }
tr:last-child td { border-bottom: none; }
tbody tr:hover { background: ${rowHover}; }
td:first-child { font-weight: 650; color: var(--navy); }

/* 체크리스트 — 실천 카드 */
.checklist { list-style: none; padding-left: 0; margin: 0; }
.checklist li { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px dashed #eef1f6; font-size: var(--fs-body); color: #2f384d; }
.checklist li:last-child { border-bottom: none; }
.cbox { flex: 0 0 auto; width: 22px; height: 22px; border-radius: ${r.checkboxRadius}px; border: 2px solid var(--cyan); background: #f3fcfd; }

/* Steps — 단계 플로우 */
.steps { list-style: none; counter-reset: step; margin: 0; padding: 0; }
.steps li { counter-increment: step; position: relative; padding: 0 0 var(--sp-lg) 52px; }
.steps li:not(:last-child)::after {
  content: ""; position: absolute; left: 17px; top: 36px; bottom: 4px; width: 2px; background: var(--info-line);
}
.steps li::before {
  content: counter(step); position: absolute; left: 0; top: 0;
  width: 36px; height: 36px; border-radius: 50%; box-sizing: border-box;
  background: ${badgeBg}; color: ${badgeColor}; border: ${badgeBorder}; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: ${stepsBadgeShadow};
}
.steps li > span { display: inline-block; padding-top: 7px; }

/* 목차 */
.toc { list-style: none; padding-left: 0; margin: 0; }
.toc li { display: flex; gap: 14px; padding: 14px 4px; border-bottom: 1px solid #f0f2f7; font-size: var(--fs-body); }
.toc .toc-num { color: var(--orange); font-weight: 800; min-width: 28px; }

/* Before / After */
.before-after { display: flex; gap: var(--sp-md); }
.before-after > div { flex: 1; border-radius: 12px; padding: var(--sp-md); background: #fff; border: 1px solid var(--neutral-line); }
.ba-before { border-top: 3px solid var(--gray); }
.ba-after { border-top: 3px solid var(--cyan); }
.ba-label { font-weight: 700; font-size: 12px; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 6px; }
.ba-before .ba-label { color: var(--gray); }
.ba-after .ba-label { color: #128799; }

/* Prompt */
.prompt { background: #0f1830; border-radius: 12px; padding: var(--sp-md) var(--sp-lg); }
.prompt pre { margin: 0; white-space: pre-wrap; font-family: "SFMono-Regular", Consolas, monospace; font-size: 14px; color: #d9e2f3; line-height: 1.6; }

/* FAQ */
.faq-item { padding: var(--sp-sm) 0; border-bottom: 1px solid #eef1f6; }
.faq-item:last-child { border-bottom: none; }
.faq-q { font-weight: 700; color: var(--navy); }
.faq-a { margin: 6px 0 0; color: #475068; }

/* Warning / Result */
.tone-emphasis[data-type="WarningCard"] .card-label::before { border-radius: 50%; }
.result-badge { display:inline-flex; align-items:center; gap:8px; }
.result-badge::before { content: "✓"; display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background: var(--orange); color:#fff; font-size:13px; font-weight:800; }

/* 이미지 슬롯 — 표지/챕터 이미지 자리 */
.image-slot { padding: 0; overflow: hidden; border: none; background: transparent; box-shadow: none; }
.slot-frame {
  border-radius: 16px;
  background: linear-gradient(135deg, #eef6f8 0%, #f4f0ff 100%);
  border: 1px solid var(--info-line);
  min-height: 180px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; text-align: center; padding: var(--sp-xl);
}
.slot-icon { width: 46px; height: 46px; border-radius: 12px; background: #fff; box-shadow: 0 6px 16px rgba(31,45,90,.10); display:flex; align-items:center; justify-content:center; }
.slot-icon::before { content:""; width: 22px; height: 16px; border-radius: 3px; border: 2px solid var(--cyan); }
.slot-tag { font-size: 11px; letter-spacing: .18em; color: #128799; font-weight: 700; }
.slot-meta { font-size: var(--fs-caption); color: var(--gray); margin-top: 2px; }
.slot-prompt { font-size: var(--fs-body); color: #41506e; margin-top: 8px; max-width: 80%; }
`.trim();
}

function renderComponentInner(c: Component): string {
  switch (c.type) {
    case 'TitleBlock':
      return `<h1 class="ty-title">${esc(c.text)}</h1>`;
    case 'SubtitleBlock':
      return `<div class="subtitle-accent"></div><p class="ty-emphasis">${esc(c.text)}</p>`;
    case 'AuthorBlock':
      return `<p class="ty-caption">${esc(c.text)}</p>`;
    case 'ChapterHeading':
      return `<h2 class="ty-chapter">Chapter ${c.number}. ${esc(c.title)}</h2>`;
    case 'TableOfContentsList':
      return `<ul class="toc">${c.entries
        .map((e) => `<li><span class="toc-num">${e.number}</span><span>${esc(e.title)}</span></li>`)
        .join('')}</ul>`;
    case 'CopyrightNotice':
      return `<div class="ty-caption">${nl2br(c.text)}</div>`;
    case 'ParagraphBlock':
      return `<p class="ty-body">${esc(c.text)}</p>`;
    case 'TableCard':
      return `<div class="card-label">표</div><div class="tbl">${renderTable(c.columns, c.rows)}</div>`;
    case 'ChecklistCard':
      return `<div class="card-label">체크리스트</div><ul class="checklist">${c.items
        .map((i) => `<li><span class="cbox"></span><span>${esc(i)}</span></li>`)
        .join('')}</ul>`;
    case 'CompareCard':
      return `<div class="card-label">비교</div><div class="tbl">${renderTable(c.columns, c.rows)}</div>`;
    case 'BeforeAfterCard':
      return `<div class="card-label">Before / After</div><div class="before-after"><div class="ba-before"><div class="ba-label">Before</div>${esc(
        c.before,
      )}</div><div class="ba-after"><div class="ba-label">After</div>${esc(c.after)}</div></div>`;
    case 'PromptCard':
      return `<div class="card-label">프롬프트</div><div class="prompt"><pre>${esc(c.text)}</pre></div>`;
    case 'StepsCard':
      return `<div class="card-label">단계</div><ol class="steps">${c.items
        .map((i) => `<li><span>${esc(i)}</span></li>`)
        .join('')}</ol>`;
    case 'FAQCard':
      return `<div class="card-label">FAQ</div>${c.pairs
        .map((p) => `<div class="faq-item"><div class="faq-q">Q. ${esc(p.q)}</div><div class="faq-a">A. ${esc(p.a)}</div></div>`)
        .join('')}`;
    case 'WarningCard':
      return `<div class="card-label">알아두기</div><div class="ty-body" style="margin:0">${esc(c.text)}</div>`;
    case 'ResultCard':
      return `<div class="card-label result-badge">핵심 결과</div><div class="ty-body" style="margin:0">${esc(c.text)}</div>`;
    case 'ImageBlock':
      return `<div class="slot-frame"><div class="slot-icon"></div><div class="slot-tag">IMAGE SLOT</div><div class="slot-meta">id: ${esc(
        c.id,
      )} · type: ${esc(c.imageType)}</div><div class="slot-prompt">${esc(c.prompt)}</div></div>`;
  }
}

function renderTable(columns: string[], rows: string[][]): string {
  const head = `<tr>${columns.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((cell) => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('');
  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

/** 카드 래퍼를 쓰는 컴포넌트(의미 톤 적용) */
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
  const body = page.components.map(renderLayoutComponent).join('\n  ');
  return `<section class="page" data-page="${page.pageType}">
  <div class="page-label">${page.pageType}</div>
  ${body}
</section>`;
}

export function renderHtml(
  pages: LayoutPage[],
  tokens: DesignTokens,
  docTitle: string,
  recipe: StyleRecipe = BASE_RECIPE,
): string {
  const css = buildCss(tokens, recipe);
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
