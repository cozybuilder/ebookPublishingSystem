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
import { buildBarSvg } from '../charts/bar-chart.ts';
import { buildDonutSvg, DONUT_COLORS } from '../charts/donut-chart.ts';

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
  gridStyle: 'stack',
  variant: 'none',
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

/** 단락 인라인 변환: ==강조== → <mark>, [[tag:라벨]] → 태그 칩. esc 후 치환(안전). */
function inlineHtml(s: string): string {
  return esc(s)
    .replace(/==([^=]+?)==/g, '<mark class="hl">$1</mark>')
    .replace(/\[\[tag:\s*([^\]]+?)\s*\]\]/g, '<span class="tag-inline">$1</span>');
}

/** 승인 토큰 + 스타일 레시피를 CSS 변수 + 상품형 스타일로 변환 (캔버스에서도 재사용) */
export function buildCss(t: DesignTokens, r: StyleRecipe): string {
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

  /* Design System v3 팔레트 */
  --v3-primary: #0D1B3D;
  --v3-blue: #2563EB;
  --v3-purple: #7C3AED;
  --v3-green: #10B981;
  --v3-amber: #F59E0B;
  --v3-red: #EF4444;
  --v3-g900: #111827;
  --v3-g700: #374151;
  --v3-g500: #6B7280;
  --v3-g300: #D1D5DB;
  --v3-g100: #F3F4F6;
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
/* 표지(CoverPage) — 상품형 커버: 세로 중앙 정렬 + 큰 제목 */
.page[data-page="CoverPage"] {
  display: flex; flex-direction: column; justify-content: center;
  min-height: 70vh; text-align: center;
}
.page[data-page="CoverPage"] .ty-title {
  font-size: calc(var(--fs-title) * 1.28); margin: 0 0 var(--sp-lg);
}
.page[data-page="CoverPage"] .subtitle-accent { margin-left: auto; margin-right: auto; }
.page[data-page="CoverPage"] .ty-emphasis { color: var(--gray); font-weight: 500; }
.page[data-page="CoverPage"] .ty-caption { margin-top: var(--sp-xl); font-size: var(--fs-body); }
/* 표지 이미지(상품형 커버) — 이미지(배경) + 그라데이션 스크림 + 제목/부제/저자 오버레이 */
.page[data-page="CoverPage"]:has(.cover-image) { padding: 0; min-height: 70vh; overflow: hidden; }
.page[data-page="CoverPage"]:has(.cover-image) .page-body {
  position: relative; min-height: 70vh; overflow: hidden;
  display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
  text-align: center; padding: var(--sp-xl);
}
.page[data-page="CoverPage"] .cover-image {
  position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; border-radius: inherit;
}
.page[data-page="CoverPage"]:has(.cover-image) .page-body::before {
  content: ''; position: absolute; inset: 0; z-index: 1;
  background: linear-gradient(180deg, rgba(12,18,38,.10) 25%, rgba(12,18,38,.55) 65%, rgba(12,18,38,.85) 100%);
}
.page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="TitleBlock"],
.page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="SubtitleBlock"],
.page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="AuthorBlock"] { position: relative; z-index: 2; }
.page[data-page="CoverPage"]:has(.cover-image) .ty-title { color: #fff; text-shadow: 0 2px 12px rgba(0,0,0,.6); }
.page[data-page="CoverPage"]:has(.cover-image) .ty-emphasis,
.page[data-page="CoverPage"]:has(.cover-image) .ty-caption { color: rgba(255,255,255,.95); text-shadow: 0 2px 10px rgba(0,0,0,.55); }
.page[data-page="CoverPage"]:has(.cover-image) .subtitle-accent { background: #fff; }
/* 본문 이미지(ImageBlock 실해석) — 중앙 정렬, 과도한 높이 제한, 캡션 */
.fig { margin: var(--sp-lg) 0; text-align: center; }
.fig-img { display: block; max-width: 100%; max-height: 460px; width: auto; margin: 0 auto; border-radius: 14px; box-shadow: 0 8px 28px rgba(16,24,40,.12); }
.fig-cap { margin-top: var(--sp-sm); font-size: var(--fs-caption); color: var(--gray); }

/* 챕터 오프너(ChapterPage) — 본문과 자연스럽게 연결(인쇄 시 break 보정) */
.page[data-page="ChapterPage"] .ty-chapter { font-size: calc(var(--fs-chapter) * 1.08); }

/* 타이포 위계 */
.ty-title {
  font-size: var(--fs-title); line-height: var(--lh-heading);
  color: var(--navy); font-weight: 800; letter-spacing: -0.02em;
  margin: 0 0 var(--sp-md);
  word-break: keep-all; overflow-wrap: break-word;
}
.ty-chapter {
  font-size: var(--fs-chapter); line-height: var(--lh-heading);
  color: var(--navy); font-weight: 750; letter-spacing: -0.02em;
  margin: 0 0 var(--sp-sm);
  word-break: keep-all; overflow-wrap: break-word;
}
/* 본문 가독성(미리보기/에세이·명언집): 줄 간격·문단 리듬 확대(인쇄 밀도는 PRINT_CSS 가 별도 제어) */
.ty-body { font-size: var(--fs-body); line-height: 1.85; margin: 0 0 calc(var(--sp-md) * 1.35); color: #2b3346; }
.ty-caption { font-size: var(--fs-caption); color: var(--gray); margin: 0 0 var(--sp-sm); }
.ty-emphasis { font-size: var(--fs-emphasis); color: #41506e; font-weight: 600; margin: 0 0 var(--sp-md); }
/* 챕터 제목과 본문 사이 호흡 + 인용/강조 구분 강화 */
.page[data-page="ChapterPage"] .ty-chapter { margin-bottom: var(--sp-md); }
.quote { margin: calc(var(--sp-lg)) 0; }

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

/* 구분선 (Divider) */
.divider { border: 0; border-top: 1px solid #E5E7EB; margin: 24px 0; }

/* 인라인 강조 (Highlight) */
mark.hl { background: #FEF08A; color: #111827; padding: 0 2px; border-radius: 3px; }

/* 인라인 태그 (Tag) — DS 03/04 */
.tag-inline { display: inline-block; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 6px; padding: 1px 8px; font-size: .85em; font-weight: 600; line-height: 1.5; }

/* 코드 블록 (Code Block) — DS 04/04 */
.code { border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin: 16px 0; }
.code-hd { background: #F3F4F6; padding: 8px 14px; font-size: 12px; color: #6B7280; font-weight: 600; }
.code-pre { background: #F8FAFC; margin: 0; padding: 14px; font-family: "SF Mono", Consolas, monospace; font-size: 13px; line-height: 1.6; color: #334155; white-space: pre-wrap; word-break: break-word; }

/* 차트 (Chart) — DS 04/04, 콘텐츠 폭·중앙 정렬 */
.chart { max-width: 520px; margin: 18px auto; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px; }
.chart-title { font-size: 15px; font-weight: 700; color: #111827; }
.chart-unit { font-size: 12px; color: #6B7280; margin: 2px 0 8px; }
.donut-wrap { display: flex; gap: 20px; align-items: center; justify-content: center; flex-wrap: wrap; }
.donut-legend { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #374151; }
.donut-legend .lg i { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 7px; }

/* 수치 카드 (Metric/Stats) — DS 02/04 */
.stats { display: flex; flex-wrap: wrap; gap: 14px; margin: 16px 0; }
.stat { flex: 1 1 0; min-width: 120px; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px; text-align: center; }
.stat-ic { width: 40px; height: 40px; border-radius: 10px; background: #EFF6FF; color: #2563EB; display: inline-flex; align-items: center; justify-content: center; font-size: 18px; margin-bottom: 8px; }
.stat-v { font-size: 26px; font-weight: 800; color: #111827; margin-bottom: 2px; }
.stat-l { font-size: 12px; color: #6B7280; }

/* 타임라인 (Timeline) — DS 02/04 */
.timeline { position: relative; padding-left: 22px; }
.timeline::before { content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 2px; background: #DBE7FB; }
.tl-item { position: relative; padding: 0 0 16px; }
.tl-item:last-child { padding-bottom: 0; }
.tl-item::before { content: ""; position: absolute; left: -22px; top: 3px; width: 11px; height: 11px; border-radius: 50%; background: #fff; border: 2px solid #2563EB; }
.tl-date { font-size: 12px; color: #9CA3AF; }
.tl-title { font-weight: 700; font-size: 15px; color: #111827; }
.tl-desc { color: #6B7280; font-size: 14px; line-height: 1.6; }

/* 표 — 출판형(헤더 강조 · 밀도 · 가독성) */
.tbl { border: 1px solid ${tblBorder}; border-radius: 12px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.5; }
th, td { padding: 12px 16px; text-align: left; vertical-align: top; word-break: keep-all; overflow-wrap: anywhere; }
th {
  background: ${thBg}; color: var(--navy);
  font-weight: 800; font-size: 13.5px; letter-spacing: .01em; white-space: nowrap;
  border-bottom: 2px solid var(--navy);
}
td { border-bottom: 1px solid #eef1f7; color: #333b50; }
tbody tr:nth-child(even) td { background: #f8fafc; }
tbody tr:hover td { background: ${rowHover}; }
tr:last-child td { border-bottom: none; }
td:first-child { font-weight: 700; color: var(--navy); white-space: nowrap; }

/* ===== Table (DS 01/04) — 연회색 헤더 · border · radius 8 · soft shadow ===== */
[data-type="TableCard"].card, [data-type="CompareCard"].card {
  background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 24px; margin: 24px 0;
}
[data-type="TableCard"] .card-label, [data-type="CompareCard"] .card-label {
  font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 16px;
}
[data-type="TableCard"] .card-label::before, [data-type="CompareCard"] .card-label::before { display: none; }
[data-type="TableCard"] .tbl, [data-type="CompareCard"] .tbl {
  border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden;
}
[data-type="TableCard"] table, [data-type="CompareCard"] table {
  width: 100%; border-collapse: collapse; font-size: 15px; line-height: 1.5;
}
[data-type="TableCard"] th, [data-type="CompareCard"] th {
  background: #F3F4F6; color: #374151; font-weight: 600; font-size: 14px;
  padding: 14px 16px; text-align: left; border-bottom: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB;
}
[data-type="TableCard"] th:last-child, [data-type="CompareCard"] th:last-child { border-right: 0; }
[data-type="TableCard"] td, [data-type="CompareCard"] td {
  padding: 14px 16px; color: #111827; border-bottom: 1px solid #E5E7EB; border-right: 1px solid #E5E7EB;
  vertical-align: top; word-break: keep-all; overflow-wrap: anywhere;
}
[data-type="TableCard"] td:last-child, [data-type="CompareCard"] td:last-child { border-right: 0; }
[data-type="TableCard"] tbody tr:last-child td, [data-type="CompareCard"] tbody tr:last-child td { border-bottom: 0; }
[data-type="TableCard"] td:first-child, [data-type="CompareCard"] td:first-child { font-weight: 600; color: #111827; }

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

/* Quote — 기본(Modern Glass 포함 stack 테마): 차분한 인용 카드 */
.quote { margin: var(--sp-lg) 0; padding: var(--sp-lg) var(--sp-xl); background: #f7f8fb; border: 1px solid var(--hairline); border-left: 3px solid var(--cyan); border-radius: 12px; }
.quote p { margin: 0; font-size: var(--fs-emphasis); line-height: 1.6; color: #2f3a52; }

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

${V3_CSS}

/* ===== 페이지 본문 컨테이너 ===== */
.page-body.grid-stack { display: block; }
${r.gridStyle === 'bento' ? BENTO_V2_CSS : ''}
${r.variant === 'editorial' ? EDITORIAL_CSS : ''}
${r.variant === 'dashboard' ? DASHBOARD_CSS : ''}
`.trim();
}

/**
 * Bento v2 — Apple WWDC / OpenAI / Nothing 인포그래픽 스타일.
 * 모든 규칙은 .grid-bento 스코프로 격리 → 다른 테마(stack)에는 출력조차 되지 않는다.
 * (gridStyle === 'bento' 일 때만 buildCss 가 이 블록을 포함)
 */
const BENTO_V2_CSS = `
/* ===== Bento Grid ===== */
.page-body.grid-bento {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sp-lg);
  align-items: stretch;
}
.grid-bento > div { margin: 0; }
.grid-bento > .card { height: 100%; }
/* 큰 카드(2열 span) */
.grid-bento > [data-type="TitleBlock"],
.grid-bento > [data-type="SubtitleBlock"],
.grid-bento > [data-type="AuthorBlock"],
.grid-bento > [data-type="ChapterHeading"],
.grid-bento > [data-type="ParagraphBlock"],
.grid-bento > [data-type="CopyrightNotice"],
.grid-bento > [data-type="TableOfContentsList"],
.grid-bento > [data-type="TableCard"],
.grid-bento > [data-type="CompareCard"],
.grid-bento > [data-type="ResultCard"],
.grid-bento > [data-type="ImageBlock"] { grid-column: 1 / -1; }
/* 작은 카드(1열 타일): Checklist / Steps / Prompt / FAQ / BeforeAfter / Warning */

/* (1) ChapterHeading — Hero Card */
.grid-bento [data-type="ChapterHeading"] {
  position: relative;
  background: radial-gradient(120% 140% at 0% 0%, #eaf0ff 0%, #ffffff 60%);
  border: 1px solid #e4e9f5;
  border-radius: var(--r-card);
  padding: 64px var(--sp-xl) 56px;
}
.grid-bento [data-type="ChapterHeading"]::before {
  content: "CHAPTER"; display: inline-block;
  font-size: 12px; font-weight: 800; letter-spacing: .22em; color: var(--cyan);
  margin-bottom: var(--sp-md);
}
.grid-bento [data-type="ChapterHeading"] .ty-chapter {
  font-size: 44px; line-height: 1.1; letter-spacing: -0.03em; margin: 0;
}

/* (2) ResultCard — 가장 강한 하이라이트 카드 */
.grid-bento [data-type="ResultCard"].card {
  background: linear-gradient(135deg, #fff3e8 0%, #ffe7d2 100%);
  border: 1px solid #f7d3b1; border-radius: var(--r-card);
  padding: var(--sp-xl) var(--sp-xl);
}
.grid-bento [data-type="ResultCard"] .card-label {
  font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--orange);
}
.grid-bento [data-type="ResultCard"] .card-label::before {
  content: "★"; width: 26px; height: 26px; border-radius: 50%;
  background: var(--orange); color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 13px;
}
.grid-bento [data-type="ResultCard"] .ty-body {
  font-size: 26px; line-height: 1.35; font-weight: 750; color: #6a3410; margin-top: var(--sp-sm);
}

/* (3) ChecklistCard — 실천 카드 묶음 */
.grid-bento [data-type="ChecklistCard"] .checklist { display: flex; flex-direction: column; gap: 10px; }
.grid-bento [data-type="ChecklistCard"] .checklist li {
  border: 1px solid #e7ecf4; border-radius: 12px; background: #fff;
  padding: 14px 16px; gap: 14px; border-bottom: 1px solid #e7ecf4;
}
.grid-bento [data-type="ChecklistCard"] .cbox {
  width: 26px; height: 26px; border-radius: 8px; border: 0;
  background: var(--cyan); position: relative;
}
.grid-bento [data-type="ChecklistCard"] .cbox::after {
  content: "✓"; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 15px; font-weight: 800;
}

/* (4) StepsCard — 플로우 카드 */
.grid-bento [data-type="StepsCard"] .steps li { padding-left: 60px; padding-bottom: var(--sp-lg); }
.grid-bento [data-type="StepsCard"] .steps li::before {
  width: 42px; height: 42px; font-size: 16px;
  background: linear-gradient(135deg, var(--cyan), #128799); color: #fff; border: 0;
  box-shadow: 0 6px 14px rgba(31,182,201,.4);
}
.grid-bento [data-type="StepsCard"] .steps li:not(:last-child)::after {
  left: 20px; top: 44px; width: 2px; background: linear-gradient(var(--cyan), transparent);
}
.grid-bento [data-type="StepsCard"] .steps li > span {
  display: block; background: #f7fbfc; border: 1px solid #e1f1f4; border-radius: 12px;
  padding: 12px 14px; padding-top: 12px;
}

/* (5) CompareCard — VS 비교 구조 (표를 컬럼형으로 재해석) */
.grid-bento [data-type="CompareCard"] .tbl { border: 0; }
.grid-bento [data-type="CompareCard"] table { border-spacing: 10px 0; border-collapse: separate; }
.grid-bento [data-type="CompareCard"] th {
  background: #11182b; color: #fff; border-radius: 12px 12px 0 0; text-align: center; font-size: 13px;
}
.grid-bento [data-type="CompareCard"] td {
  background: #fff; border: 1px solid #e7ecf4; text-align: center; border-bottom: 1px solid #e7ecf4;
}
.grid-bento [data-type="CompareCard"] td:first-child { font-weight: 800; color: var(--navy); background: #f6f8fc; }

/* (6) TableCard — row card (엑셀 느낌 제거) */
.grid-bento [data-type="TableCard"] .tbl { border: 0; overflow: visible; }
.grid-bento [data-type="TableCard"] thead { display: none; }
.grid-bento [data-type="TableCard"] table,
.grid-bento [data-type="TableCard"] tbody,
.grid-bento [data-type="TableCard"] tr,
.grid-bento [data-type="TableCard"] td { display: block; }
.grid-bento [data-type="TableCard"] tbody { display: flex; flex-direction: column; gap: 10px; }
.grid-bento [data-type="TableCard"] tr {
  border: 1px solid #e7ecf4; border-radius: 12px; background: #fff; padding: 14px 16px;
  display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: baseline;
}
.grid-bento [data-type="TableCard"] td { border: 0; padding: 0; color: #4a5468; }
.grid-bento [data-type="TableCard"] td:first-child { font-weight: 800; color: var(--navy); font-size: var(--fs-emphasis); width: 100%; }

/* (7) WarningCard — 인사이트 카드(부드럽게) */
.grid-bento [data-type="WarningCard"].card {
  background: #fbf6ee; border: 1px solid #efe2cc; border-radius: var(--r-card);
}
.grid-bento [data-type="WarningCard"] .card-label { color: #b9772a; }
.grid-bento [data-type="WarningCard"] .card-label::before {
  content: "i"; width: 22px; height: 22px; border-radius: 50%;
  background: #e7a14e; color: #fff; display: inline-flex; align-items: center; justify-content: center;
  font-style: italic; font-weight: 800; font-size: 13px;
}

/* (8) ImageBlock — 대표 비주얼 자리 */
.grid-bento [data-type="ImageBlock"] .slot-frame {
  min-height: 240px;
  background: linear-gradient(135deg, #e9f2ff 0%, #f3ecff 50%, #ffeef4 100%);
  border: 1px solid #e2e6f0; border-radius: var(--r-card);
}
.grid-bento [data-type="ImageBlock"] .slot-icon { width: 56px; height: 56px; border-radius: 16px; }
.grid-bento [data-type="ImageBlock"] .slot-tag { font-size: 12px; color: var(--navy); }

/* (9b) QuoteBlock — 강한 메시지 / SNS 문구 카드 */
.grid-bento > [data-type="QuoteBlock"] { grid-column: 1 / -1; }
.grid-bento [data-type="QuoteBlock"] .quote {
  background: linear-gradient(135deg, #11182b 0%, #1f2d5a 100%);
  border: 0; border-radius: var(--r-card); padding: var(--sp-xl); text-align: center;
}
.grid-bento [data-type="QuoteBlock"] .quote p {
  color: #fff; font-size: 28px; font-weight: 750; line-height: 1.4; letter-spacing: -0.01em;
}
`.trim();

/**
 * Editorial — 프리미엄 매거진 / 디지털 리포트 스타일.
 * 모든 규칙은 .var-editorial 스코프로 격리 → 다른 테마에는 출력조차 되지 않는다.
 * (variant === 'editorial' 일 때만 buildCss 가 이 블록을 포함)
 */
const EDITORIAL_CSS = `
/* ===== Editorial 읽기 컬럼 ===== */
.page-body.var-editorial { max-width: 680px; margin: 0 auto; }
.var-editorial > div { margin-bottom: var(--sp-lg); }

/* 매거진 세리프 제목 */
.var-editorial .ty-title,
.var-editorial .ty-chapter {
  font-family: Georgia, "Noto Serif KR", "Apple SD Gothic Neo", serif; letter-spacing: -0.01em;
}

/* (7) 본문 가독성 강화 */
.var-editorial [data-type="ParagraphBlock"] .ty-body {
  font-size: 18px; line-height: 1.95; color: #2c2a26; letter-spacing: .01em; margin: 0 0 var(--sp-lg);
}

/* (6) ChapterHeading — 매거진 특집 시작 */
.var-editorial [data-type="ChapterHeading"] {
  text-align: center; padding: var(--sp-xxl) 0 var(--sp-xl); border-bottom: 1px solid #e3ded5;
}
.var-editorial [data-type="ChapterHeading"]::before {
  content: "FEATURE"; display: block; font-size: 11px; letter-spacing: .34em; color: #b0855a;
  font-weight: 700; margin-bottom: var(--sp-md);
}
.var-editorial [data-type="ChapterHeading"] .ty-chapter { font-size: 46px; line-height: 1.15; margin: 0; }

/* (8) QuoteBlock — 잡지 인용문 */
.var-editorial [data-type="QuoteBlock"] .quote {
  background: transparent; border: 0; border-left: 3px solid var(--orange); border-radius: 0;
  padding: var(--sp-md) 0 var(--sp-md) var(--sp-lg); margin: var(--sp-xl) 0;
}
.var-editorial [data-type="QuoteBlock"] .quote p {
  font-family: Georgia, "Noto Serif KR", serif; font-size: 28px; line-height: 1.5; font-style: italic; color: var(--navy);
}

/* (9) ResultCard — 기사 하단 핵심 요약 박스 */
.var-editorial [data-type="ResultCard"].card {
  background: #fbfaf7; border: 1px solid #e3ded5; border-top: 3px solid var(--navy);
  border-radius: 4px; padding: var(--sp-lg) var(--sp-xl);
}
.var-editorial [data-type="ResultCard"] .card-label {
  letter-spacing: .18em; text-transform: uppercase; color: var(--navy); font-size: 12px;
}
.var-editorial [data-type="ResultCard"] .card-label::before { display: none; }
.var-editorial [data-type="ResultCard"] .ty-body {
  font-family: Georgia, "Noto Serif KR", serif; font-size: 20px; line-height: 1.6; color: #2c2a26;
}

/* (10) Checklist / Steps — 차분한 실행 가이드 */
.var-editorial [data-type="ChecklistCard"].card,
.var-editorial [data-type="StepsCard"].card {
  border: 0; border-top: 1px solid #e3ded5; border-radius: 0; background: transparent; padding: var(--sp-lg) 0;
}
.var-editorial [data-type="ChecklistCard"] .cbox { border-color: #b0855a; background: transparent; border-radius: 3px; }
.var-editorial [data-type="StepsCard"] .steps li::before {
  background: transparent; color: var(--navy); border: 1px solid #c9c2b4; box-shadow: none;
}
.var-editorial [data-type="StepsCard"] .steps li:not(:last-child)::after { background: #e3ded5; }

/* (11) Table / Compare — 리포트 표 */
.var-editorial .tbl { border: 0; border-top: 2px solid var(--navy); border-bottom: 1px solid #d8d2c6; border-radius: 0; }
.var-editorial th {
  background: transparent; color: var(--navy); border-bottom: 1px solid #c9c2b4;
  text-transform: uppercase; font-size: 12px; letter-spacing: .06em;
}
.var-editorial td { border-bottom: 1px solid #ece7dd; }

/* (12) WarningCard — 편집자 주 / 주의 메모 */
.var-editorial [data-type="WarningCard"].card {
  background: transparent; border: 0; border-left: 2px solid #b0855a; border-radius: 0;
  padding: 4px 0 4px var(--sp-lg); font-style: italic; color: #5a5347;
}
.var-editorial [data-type="WarningCard"] .card-label { color: #b0855a; font-style: normal; }
.var-editorial [data-type="WarningCard"] .card-label::before { display: none; }

/* (13) ImageBlock — 잡지 이미지 캡션 영역 */
.var-editorial [data-type="ImageBlock"] .slot-frame { background: #efece5; border: 0; border-radius: 4px; min-height: 220px; }
.var-editorial [data-type="ImageBlock"] .slot-prompt { font-style: italic; color: #6a6356; font-size: 14px; }
.var-editorial [data-type="ImageBlock"] .slot-tag { color: #b0855a; }
`.trim();

/**
 * Dashboard — SaaS dashboard / Notion database / Linear board 방향.
 * 체크리스트·표·단계·결과·비교 중심의 운영 문서. 차분하지만 정보 밀도 높음.
 * 모든 규칙은 .var-dashboard 스코프로 격리 → 다른 테마엔 출력조차 되지 않는다.
 * (variant === 'dashboard' 일 때만 buildCss 가 이 블록을 포함)
 */
const DASHBOARD_CSS = `
/* ===== Dashboard 기본 면 ===== */
.var-dashboard { --panel: #ffffff; --line: #e7eaef; --muted: #6b7280; --ok: #1f9d57; }
.var-dashboard > div { margin-bottom: var(--sp-md); }
.var-dashboard .card { box-shadow: 0 1px 2px rgba(16,24,40,.04); border-color: var(--line); }
.var-dashboard .card-label { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }

/* (1) ChapterHeading — 대시보드 페이지 헤더 */
.var-dashboard [data-type="ChapterHeading"] {
  border-bottom: 1px solid var(--line); padding: 0 0 var(--sp-md); margin-bottom: var(--sp-md);
}
.var-dashboard [data-type="ChapterHeading"]::before {
  content: "SECTION"; display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .14em;
  color: #fff; background: var(--navy); border-radius: 5px; padding: 3px 8px; margin-bottom: 10px;
}
.var-dashboard [data-type="ChapterHeading"] .ty-chapter { font-size: 26px; margin: 0; }

/* (2) ResultCard — KPI 카드 */
.var-dashboard [data-type="ResultCard"].card {
  background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid #d8e6f7; border-left: 4px solid var(--cyan); border-radius: 12px;
}
.var-dashboard [data-type="ResultCard"] .card-label { color: var(--cyan); }
.var-dashboard [data-type="ResultCard"] .card-label::before { content: "KPI"; background: var(--cyan); color:#fff; width:auto; height:auto; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:800; }
.var-dashboard [data-type="ResultCard"] .ty-body { font-size: 22px; font-weight: 750; color: var(--navy); margin-top: 6px; }

/* (3) ChecklistCard — task / todo 패널 */
.var-dashboard [data-type="ChecklistCard"] .card-label::after { content: " · TODO"; color: var(--muted); }
.var-dashboard [data-type="ChecklistCard"] .checklist { display: flex; flex-direction: column; gap: 6px; }
.var-dashboard [data-type="ChecklistCard"] .checklist li {
  border: 1px solid var(--line); border-radius: 8px; background: #fbfcfe; padding: 10px 12px; gap: 12px;
}
.var-dashboard [data-type="ChecklistCard"] .cbox { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #c4ccd6; background: #fff; }

/* (4) StepsCard — workflow / pipeline */
.var-dashboard [data-type="StepsCard"] .steps li::before {
  border-radius: 7px; width: 34px; height: 34px; background: var(--navy); color: #fff; border: 0; box-shadow: none; font-size: 14px;
}
.var-dashboard [data-type="StepsCard"] .steps li:not(:last-child)::after { left: 16px; background: #cdd5e0; }
.var-dashboard [data-type="StepsCard"] .steps li > span {
  display: block; background: #f7f9fc; border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px;
}

/* (5) CompareCard — decision matrix */
.var-dashboard [data-type="CompareCard"] .card-label::after { content: " · DECISION MATRIX"; color: var(--muted); }
.var-dashboard [data-type="CompareCard"] .tbl { border: 1px solid var(--line); border-radius: 10px; }
.var-dashboard [data-type="CompareCard"] th { background: #eef2f8; color: var(--navy); border-bottom: 1px solid var(--line); }
.var-dashboard [data-type="CompareCard"] td { border-bottom: 1px solid #eef1f5; }
.var-dashboard [data-type="CompareCard"] td:first-child { font-weight: 700; color: var(--navy); background: #f8fafc; }

/* (6) TableCard — database table */
.var-dashboard [data-type="TableCard"] .tbl { border: 1px solid var(--line); border-radius: 10px; }
.var-dashboard [data-type="TableCard"] th { background: #f3f5f9; color: var(--muted); text-transform: uppercase; font-size: 11px; letter-spacing: .06em; border-bottom: 1px solid var(--line); }
.var-dashboard [data-type="TableCard"] td { border-bottom: 1px solid #eef1f5; }
.var-dashboard [data-type="TableCard"] tbody tr:nth-child(even) td { background: #fafbfd; }

/* (7) WarningCard — risk / alert 패널 */
.var-dashboard [data-type="WarningCard"].card {
  background: #fff8f1; border: 1px solid #f3dcc2; border-left: 4px solid var(--orange); border-radius: 10px;
}
.var-dashboard [data-type="WarningCard"] .card-label { color: var(--orange); }
.var-dashboard [data-type="WarningCard"] .card-label::before { content: "!"; background: var(--orange); color: #fff; width: 18px; height: 18px; border-radius: 5px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; }

/* (8) QuoteBlock — insight / note 패널 */
.var-dashboard [data-type="QuoteBlock"] .quote {
  background: #f6f8fb; border: 1px solid var(--line); border-left: 4px solid var(--navy); border-radius: 10px; padding: var(--sp-md) var(--sp-lg);
}
.var-dashboard [data-type="QuoteBlock"] .quote::before {
  content: "NOTE"; display: block; font-size: 10px; font-weight: 800; letter-spacing: .14em; color: var(--muted); margin-bottom: 6px;
}
.var-dashboard [data-type="QuoteBlock"] .quote p { font-size: var(--fs-body); font-style: normal; color: #374151; }

/* (9) ImageBlock — dashboard widget / preview */
.var-dashboard [data-type="ImageBlock"] .slot-frame {
  background: repeating-linear-gradient(45deg, #f4f6fa, #f4f6fa 12px, #eef1f6 12px, #eef1f6 24px);
  border: 1px solid var(--line); border-radius: 10px; min-height: 200px;
}
.var-dashboard [data-type="ImageBlock"] .slot-tag { content: ""; color: var(--muted); }
.var-dashboard [data-type="ImageBlock"] .slot-tag::after { content: " · WIDGET"; }
`.trim();

/**
 * Engine Design System v3 — modern/stack(=book.pdf, kmong) 적용.
 * 비스코프 [data-type] 선택자라 modern 에만 적용되고, editorial/dashboard/bento 의 scoped CSS 는
 * 더 높은 명시도로 그대로 우선한다(타 PDF 영향 없음).
 */
const V3_CSS = `
/* 본문 타이포 (Body 16 / 1.7) */
.grid-stack .ty-body { font-size: 16px; line-height: 1.7; color: var(--v3-g900); }

/* 공통 — 카드 크게(여백·라운드), 섹션 라벨(eyebrow) */
.grid-stack [data-type="ChecklistCard"].card,
.grid-stack [data-type="FAQCard"].card,
.grid-stack [data-type="BeforeAfterCard"].card,
.grid-stack [data-type="StepsCard"].card,
.grid-stack [data-type="ResultCard"].card,
.grid-stack [data-type="WarningCard"].card { padding: 28px; border-radius: 20px; margin: 24px 0; box-shadow: 0 1px 3px rgba(13,27,61,.04); }
.grid-stack [data-type="BeforeAfterCard"].card::before,
.grid-stack [data-type="StepsCard"].card::before,
.grid-stack [data-type="ResultCard"].card::before { display: block; font-size: 11px; letter-spacing: .2em; font-weight: 800; margin-bottom: 10px; }

/* Checklist (DS 01/04) — 세로 나열 + 좌측 체크박스 */
[data-type="ChecklistCard"].card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 24px; }
[data-type="ChecklistCard"] .card-label { color: #111827; font-size: 18px; font-weight: 700; margin-bottom: 16px; }
[data-type="ChecklistCard"] .card-label::before { display: none; }
[data-type="ChecklistCard"] .checklist { display: flex; flex-direction: column; gap: 14px; }
[data-type="ChecklistCard"] .checklist li { background: transparent; border: 0; border-radius: 0; padding: 0; gap: 12px; align-items: center; font-size: 16px; line-height: 1.5; color: #111827; }
[data-type="ChecklistCard"] .cbox { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #D1D5DB; background: #fff; }

/* FAQ (DS 01/04) — Accordion 카드(border, radius 8) */
[data-type="FAQCard"].card { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 24px; }
[data-type="FAQCard"] .card-label { color: #111827; font-size: 18px; font-weight: 700; margin-bottom: 16px; }
[data-type="FAQCard"] .card-label::before { display: none; }
[data-type="FAQCard"] .faq-item { background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 18px; margin-bottom: 12px; position: relative; }
[data-type="FAQCard"] .faq-item:last-child { margin-bottom: 0; }
[data-type="FAQCard"] .faq-item::after { content: "⌄"; position: absolute; right: 18px; top: 14px; color: #6B7280; font-size: 16px; }
[data-type="FAQCard"] .faq-q { color: #111827; font-weight: 600; font-size: 16px; padding-right: 28px; line-height: 1.5; }
[data-type="FAQCard"] .faq-a { color: #6B7280; font-size: 15px; line-height: 1.6; margin-top: 10px; }

/* Before / After — BEFORE/AFTER 카드 + 중앙 화살표 */
[data-type="BeforeAfterCard"].card { background: #fff; border: 1px solid #E6E9EF; }
[data-type="BeforeAfterCard"].card::before { content: "BEFORE / AFTER"; color: var(--v3-blue); }
[data-type="BeforeAfterCard"] .card-label { color: var(--v3-primary); font-size: 21px; font-weight: 800; margin-bottom: 20px; }
[data-type="BeforeAfterCard"] .card-label::before { display: none; }
[data-type="BeforeAfterCard"] .before-after { gap: 22px; position: relative; align-items: stretch; }
[data-type="BeforeAfterCard"] .before-after > div { border: 1px solid #E6E9EF; border-radius: 16px; padding: 18px; overflow: hidden; background: #fff; font-size: 16px; line-height: 1.7; color: #374151; }
[data-type="BeforeAfterCard"] .ba-label { margin: -18px -18px 16px; padding: 14px 18px; font-size: 13px; color: #fff; text-transform: uppercase; letter-spacing: .08em; font-weight: 800; }
[data-type="BeforeAfterCard"] .ba-before .ba-label { background: var(--v3-g500); }
[data-type="BeforeAfterCard"] .ba-after .ba-label { background: var(--v3-blue); }
[data-type="BeforeAfterCard"] .before-after::after { content: "→"; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 38px; height: 38px; border-radius: 50%; background: #fff; border: 1px solid #D7DEEA; color: var(--v3-blue); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; z-index: 2; }

/* Steps — 원형 번호 + 연결선 + 단계 카드 */
[data-type="StepsCard"].card { background: #fff; border: 1px solid #E6E9EF; }
[data-type="StepsCard"].card::before { content: "STEP / PROCESS"; color: var(--v3-blue); }
[data-type="StepsCard"] .card-label { color: var(--v3-primary); font-size: 21px; font-weight: 800; margin-bottom: 20px; }
[data-type="StepsCard"] .card-label::before { display: none; }
[data-type="StepsCard"] .steps li { padding: 0 0 24px 64px; }
[data-type="StepsCard"] .steps li::before { width: 44px; height: 44px; font-size: 17px; background: var(--v3-blue); color: #fff; border: 0; box-shadow: none; }
[data-type="StepsCard"] .steps li:not(:last-child)::after { left: 21px; top: 48px; width: 2px; background: #BBD3FB; }
[data-type="StepsCard"] .steps li > span { display: block; background: #F7FAFF; border: 1px solid #E2EAF6; border-radius: 12px; padding: 14px 16px; font-size: 16px; line-height: 1.6; color: #1f2937; }

/* Quote (DS 01/04) — 좌측 파란 세로선 + blue tint + 따옴표 아이콘 */
[data-type="QuoteBlock"] .quote { background: #EFF5FF; border: 1px solid #DBE7FB; border-left: 4px solid #2563EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 22px 28px 22px 30px; position: relative; margin: 24px 0; }
[data-type="QuoteBlock"] .quote::before { content: "\\201C"; position: absolute; left: 18px; top: 8px; font-family: Georgia, serif; font-size: 44px; line-height: 1; color: #2563EB; }
[data-type="QuoteBlock"] .quote p { font-size: 17px; line-height: 1.6; color: #111827; font-weight: 500; margin: 6px 0 0; padding-left: 18px; }

/* Warning Box (DS 01/04) — 연노랑 배경 + 경고 아이콘 */
[data-type="WarningCard"].card { background: #FFFBEB; border: 1px solid #FDE9B5; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px 22px; }
[data-type="WarningCard"].card::before { display: none; }
[data-type="WarningCard"] .card-label { color: #B45309; font-size: 16px; font-weight: 700; margin-bottom: 8px; }
[data-type="WarningCard"] .card-label::before { content: "⚠"; background: transparent; color: #F59E0B; width: auto; height: auto; border-radius: 0; font-size: 18px; }

/* Result — 큰 ★ 아이콘 + 핵심 문장 */
[data-type="ResultCard"].card { background: #EFF5FF; border: 1px solid #CFE0FB; }
[data-type="ResultCard"].card::before { content: "KEY RESULT"; color: #1D4ED8; }
[data-type="ResultCard"] .card-label { color: #1D4ED8; font-size: 15px; font-weight: 800; letter-spacing: .04em; align-items: center; gap: 12px; }
[data-type="ResultCard"] .result-badge::before { content: "★"; width: 40px; height: 40px; font-size: 20px; border-radius: 12px; background: var(--v3-blue); }
[data-type="ResultCard"] .ty-body { font-size: 20px; line-height: 1.55; color: var(--v3-primary); font-weight: 700; margin-top: 14px; }

/* Result Box 변형 (DS 10차) — Success / Info / Warning / Error. variant 없으면 위 기본(파랑 ★) 유지 */
[data-type="ResultCard"][data-variant="success"].card { background: #F0FDF4; border-color: #BBF7D0; }
[data-type="ResultCard"][data-variant="success"].card::before { content: "SUCCESS"; color: #15803D; }
[data-type="ResultCard"][data-variant="success"] .card-label { color: #15803D; }
[data-type="ResultCard"][data-variant="success"] .result-badge::before { content: "✓"; background: #16A34A; }
[data-type="ResultCard"][data-variant="success"] .ty-body { color: #14532D; }
[data-type="ResultCard"][data-variant="info"].card { background: #EFF6FF; border-color: #BFDBFE; }
[data-type="ResultCard"][data-variant="info"].card::before { content: "INFO"; color: #1D4ED8; }
[data-type="ResultCard"][data-variant="info"] .card-label { color: #1D4ED8; }
[data-type="ResultCard"][data-variant="info"] .result-badge::before { content: "ℹ"; background: #3B82F6; }
[data-type="ResultCard"][data-variant="info"] .ty-body { color: #1E3A8A; }
[data-type="ResultCard"][data-variant="warning"].card { background: #FFFBEB; border-color: #FDE9B5; }
[data-type="ResultCard"][data-variant="warning"].card::before { content: "WARNING"; color: #B45309; }
[data-type="ResultCard"][data-variant="warning"] .card-label { color: #B45309; }
[data-type="ResultCard"][data-variant="warning"] .result-badge::before { content: "!"; background: #F59E0B; }
[data-type="ResultCard"][data-variant="warning"] .ty-body { color: #78350F; }
[data-type="ResultCard"][data-variant="error"].card { background: #FEF2F2; border-color: #FECACA; }
[data-type="ResultCard"][data-variant="error"].card::before { content: "ERROR"; color: #B91C1C; }
[data-type="ResultCard"][data-variant="error"] .card-label { color: #B91C1C; }
[data-type="ResultCard"][data-variant="error"] .result-badge::before { content: "✕"; background: #EF4444; }
[data-type="ResultCard"][data-variant="error"] .ty-body { color: #7F1D1D; }

/* === 통합 스프린트 15~30 (정적 변환) === */
.cmp { width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; margin: 4px 0; }
.cmp th, .cmp td { padding: 10px 12px; text-align: center; border-bottom: 1px solid #E5E7EB; }
.cmp th:first-child, .cmp td:first-child { text-align: left; }
.cmp thead th { background: #F3F4F6; color: #374151; font-weight: 700; }
.cmp thead th.pro { background: #2563EB; color: #fff; }
.cmp td.pro { color: #1D4ED8; font-weight: 700; background: #F5F9FF; }
.cmp tbody tr:last-child td { border-bottom: 0; }
.al { display: flex; gap: 10px; align-items: flex-start; border: 1px solid; border-radius: 8px; padding: 12px 14px; font-size: 14px; }
.al-ic { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; color: #fff; flex: none; }
.al-success { background: #F0FDF4; border-color: #BBF7D0; color: #14532D; } .al-success .al-ic { background: #16A34A; }
.al-info { background: #EFF6FF; border-color: #BFDBFE; color: #1E3A8A; } .al-info .al-ic { background: #3B82F6; }
.al-warning { background: #FFFBEB; border-color: #FDE9B5; color: #78350F; } .al-warning .al-ic { background: #F59E0B; }
.al-error { background: #FEF2F2; border-color: #FECACA; color: #7F1D1D; } .al-error .al-ic { background: #EF4444; }
.proc { display: flex; align-items: stretch; gap: 8px; }
.proc-p { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 10px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.proc-ic { width: 44px; height: 44px; border-radius: 10px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 10px; }
.proc-t { font-weight: 700; font-size: 13px; color: #111827; }
.proc-d { color: #6B7280; font-size: 11px; margin-top: 4px; line-height: 1.4; }
.proc-arr { display: flex; align-items: center; color: #2563EB; font-weight: 800; font-size: 20px; }
.rating { display: flex; align-items: center; gap: 8px; font-size: 18px; }
.rating .rt-on { color: #F59E0B; letter-spacing: 2px; }
.rating .rt-off { color: #D1D5DB; letter-spacing: 2px; }
.rating .rt-num { font-size: 14px; font-weight: 700; color: #111827; }
.rating .rt-lb { font-size: 13px; color: #6B7280; }
.tag-group, .chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.tg-tag { background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; border-radius: 6px; padding: 3px 10px; font-size: 13px; }
.cg-chip { background: #F3F4F6; color: #374151; border: 1px solid #E5E7EB; border-radius: 999px; padding: 4px 12px; font-size: 13px; }
.tree { font-size: 14px; color: #374151; }
.tree-row { padding: 3px 0; }
.tree-row .tree-mk { color: #9CA3AF; margin-right: 6px; }
.pgn { display: flex; flex-direction: column; gap: 8px; }
.pgn-dots { display: flex; flex-wrap: wrap; gap: 6px; }
.pgn-dot { min-width: 28px; height: 28px; padding: 0 6px; border: 1px solid #E5E7EB; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: #374151; box-sizing: border-box; }
.pgn-dot.on { background: #2563EB; border-color: #2563EB; color: #fff; font-weight: 700; }
.pgn-meta { font-size: 12px; color: #6B7280; }
.empty { border: 1px dashed #D1D5DB; border-radius: 8px; padding: 28px 20px; text-align: center; }
.empty-ic { font-size: 32px; margin-bottom: 8px; }
.empty-t { font-weight: 700; font-size: 15px; color: #111827; }
.empty-d { color: #6B7280; font-size: 13px; margin-top: 4px; }
.srch { display: flex; align-items: center; gap: 8px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 14px; background: #F9FAFB; }
.srch-ic { color: #9CA3AF; }
.srch-q { color: #111827; font-size: 14px; }
.srch-ph { color: #9CA3AF; font-size: 14px; }
.tip-box, .pop-box { border: 1px solid #E5E7EB; border-left: 3px solid #2563EB; border-radius: 8px; padding: 12px 14px; background: #F9FAFB; }
.tip-lb, .pop-t { font-weight: 700; font-size: 13px; color: #1D4ED8; margin-bottom: 4px; }
.tip-tx, .pop-tx { font-size: 14px; color: #374151; line-height: 1.6; }
.modal-card, .drawer-card { border: 1px solid #BFDBFE; border-radius: 8px; padding: 18px 20px; background: #EFF6FF; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.modal-t, .drawer-t { font-weight: 700; font-size: 15px; color: #1E3A8A; margin-bottom: 6px; }
.modal-tx, .drawer-tx { font-size: 14px; color: #374151; line-height: 1.6; }
.skel { display: flex; flex-direction: column; gap: 10px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; }
.skel-bar { height: 12px; border-radius: 6px; background: #E5E7EB; }
.file-card { display: flex; align-items: center; gap: 12px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
.file-ic { font-size: 24px; }
.file-name { font-weight: 700; font-size: 14px; color: #111827; }
.file-sub { font-size: 12px; color: #6B7280; margin-top: 2px; }

/* Timeline Card (DS 04/04, 42) — 좌측 수직선 + 원형 포인트 + 카드형 항목(아이콘 없음) */
[data-type="TimelineCardList"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 22px; }
[data-type="TimelineCardList"].card::before { display: none; }
.tlc { position: relative; padding-left: 22px; }
.tlc::before { content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 2px; background: #DBE7FB; }
.tlc .it { position: relative; margin-bottom: 12px; }
.tlc .it:last-child { margin-bottom: 0; }
.tlc .it::before { content: ""; position: absolute; left: -22px; top: 14px; width: 11px; height: 11px; border-radius: 50%; background: #2563EB; border: 2px solid #fff; box-shadow: 0 0 0 1px #2563EB; }
.tlc .ca { border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 12px 14px; }
.tlc .dt { font-size: 11px; color: #9CA3AF; }
.tlc .ti { font-weight: 700; font-size: 14px; color: #111827; margin-top: 2px; }
.tlc .de { color: #6B7280; font-size: 12px; line-height: 1.5; margin-top: 3px; }

/* Progress Stepper (DS 02/04, 15) — 완료 ✓ / 현재 / 예정 3상태 + 연결선 + desc */
[data-type="StepperCard"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 22px 22px 18px; }
[data-type="StepperCard"].card::before { display: none; }
.stp { display: flex; align-items: center; justify-content: space-between; }
.stp .s { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: none; }
.stp .n { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #D1D5DB; color: #9CA3AF; background: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.stp .s.done .n, .stp .s.on .n { background: #2563EB; border-color: #2563EB; color: #fff; }
.stp .l { font-size: 11px; color: #6B7280; }
.stp .s.done .l { color: #374151; }
.stp .s.on .l { color: #111827; font-weight: 700; }
.stp .line { flex: 1; height: 2px; background: #E5E7EB; margin: 0 4px 18px; }
.stp .line.done { background: #2563EB; }
.stp-desc { margin-top: 14px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 18px; }
.stp-desc .t { font-weight: 700; font-size: 13px; color: #111827; }
.stp-desc .d { color: #6B7280; font-size: 12px; margin-top: 2px; }

/* Progress (DS 02/04, 20) — 전체(굵은 막대) + 세부 행, 100% = 초록 완료 ✓ */
[data-type="ProgressCard"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px 22px; }
[data-type="ProgressCard"].card::before { display: none; }
.pg .pg-row { margin-bottom: 14px; }
.pg .pg-row:last-child { margin-bottom: 0; }
.pg .pg-top { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; color: #374151; }
.pg .pg-val { color: #374151; }
.pg .pg-val.pg-done { color: #16A34A; font-weight: 700; }
.pg .pg-bar { height: 8px; background: #E5E7EB; border-radius: 999px; overflow: hidden; }
.pg .pg-fill { display: block; height: 100%; background: #2563EB; border-radius: 999px; }
.pg .pg-fill.pg-fill-done { background: #16A34A; }
.pg .pg-overall .pg-bar { height: 12px; }
.pg .pg-overall .pg-top { font-size: 14px; }
.pg .pg-overall .pg-label { font-weight: 700; color: #111827; }
.pg .pg-overall .pg-val { font-weight: 700; color: #111827; }
.pg .pg-overall .pg-val.pg-done { color: #16A34A; }

/* Feature Card (DS 02/04, 17) — 아이콘 + 제목 + 설명 + ✓ 체크리스트 */
[data-type="FeatureCard"].card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px 22px; }
[data-type="FeatureCard"].card::before { display: none; }
.feat { display: flex; gap: 14px; align-items: flex-start; }
.feat-ic { width: 44px; height: 44px; border-radius: 999px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 20px; flex: none; }
.feat-body { flex: 1; }
.feat-t { font-weight: 700; font-size: 16px; color: #111827; margin-bottom: 4px; }
.feat-d { color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0 0 10px; }
.feat-ck { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: #374151; }
.feat-ck li::before { content: "✓ "; color: #2563EB; font-weight: 700; }

/* Callout — Info / Tip / Note (DS 01/04) */
[data-type="CalloutCard"].card { border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px 20px; border-left-width: 4px; border-left-style: solid; }
[data-type="CalloutCard"] .card-label { font-size: 15px; font-weight: 800; margin-bottom: 8px; }
[data-type="CalloutCard"] .card-label::before { display: none; }
[data-type="CalloutCard"] .ty-body { font-size: 15px; line-height: 1.6; }
[data-type="CalloutCard"][data-variant="info"] { background: #EFF6FF; border-color: #BFDBFE; border-left-color: var(--v3-blue); }
[data-type="CalloutCard"][data-variant="info"] .card-label { color: #1D4ED8; }
[data-type="CalloutCard"][data-variant="tip"] { background: #F0FDF4; border-color: #BBF7D0; border-left-color: var(--v3-green); }
[data-type="CalloutCard"][data-variant="tip"] .card-label { color: #15803D; }
[data-type="CalloutCard"][data-variant="note"] { background: #F5F3FF; border-color: #DDD6FE; border-left-color: var(--v3-purple); }
[data-type="CalloutCard"][data-variant="note"] .card-label { color: #6D28D9; }
`.trim();

function renderComponentInner(c: Component): string {
  switch (c.type) {
    case 'TitleBlock':
      return `<h1 class="ty-title">${esc(c.text)}</h1>`;
    case 'SubtitleBlock':
      return `<div class="subtitle-accent"></div><p class="ty-emphasis">${esc(c.text)}</p>`;
    case 'AuthorBlock':
      return `<p class="ty-caption">${esc(c.text)}</p>`;
    case 'CoverImage':
      return `<img class="cover-image" src="${c.src}" alt="${esc(c.alt ?? '')}" />`;
    case 'ChapterHeading':
      return `<h2 class="ty-chapter">Chapter ${c.number}. ${esc(c.title)}</h2>`;
    case 'TableOfContentsList':
      return `<ul class="toc">${c.entries
        .map((e) => `<li><span class="toc-num">${e.number}</span><span>${esc(e.title)}</span></li>`)
        .join('')}</ul>`;
    case 'CopyrightNotice':
      return `<div class="ty-caption">${nl2br(c.text)}</div>`;
    case 'AuthorBio':
      return `<h2 class="ty-chapter">${esc(c.heading)}</h2><p class="ty-body">${nl2br(c.text)}</p>`;
    case 'Disclaimer':
      return `<h2 class="ty-chapter">${esc(c.heading)}</h2><p class="ty-caption">${nl2br(c.text)}</p>`;
    case 'ParagraphBlock':
      return `<p class="ty-body">${inlineHtml(c.text)}</p>`;
    case 'QuoteBlock':
      return `<blockquote class="quote"><p>${esc(c.text)}</p></blockquote>`;
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
    case 'ResultCard': {
      const rLabels: Record<string, string> = { success: '성공', info: '정보', warning: '주의', error: '오류' };
      const rLabel = c.variant ? rLabels[c.variant] : '핵심 결과';
      return `<div class="card-label result-badge">${rLabel}</div><div class="ty-body" style="margin:0">${esc(c.text)}</div>`;
    }
    case 'CalloutCard': {
      const labels: Record<string, string> = { info: '정보', tip: '팁', note: '노트' };
      return `<div class="card-label">${labels[c.variant] ?? '정보'}</div><div class="ty-body" style="margin:0">${esc(c.text)}</div>`;
    }
    case 'Divider':
      return `<hr class="divider" />`;
    case 'CodeBlock':
      return `<div class="code"><div class="code-hd">${esc(c.lang || 'CODE')}</div><pre class="code-pre">${esc(c.code)}</pre></div>`;
    case 'ChartCard': {
      const head = `${c.title ? `<div class="chart-title">${esc(c.title)}</div>` : ''}${c.unit ? `<div class="chart-unit">단위: ${esc(c.unit)}</div>` : ''}`;
      if (c.chartType === 'donut') {
        const dn = Math.min(c.labels.length, c.values.length);
        const legend = c.labels
          .slice(0, dn)
          .map((l, i) => `<span class="lg"><i style="background:${DONUT_COLORS[i % DONUT_COLORS.length]}"></i>${esc(l)} <b>${esc(String(c.values[i]))}${c.unit ? esc(c.unit) : ''}</b></span>`)
          .join('');
        return `<div class="chart">${head}<div class="donut-wrap">${buildDonutSvg(c.labels, c.values, c.center, c.unit)}<div class="donut-legend">${legend}</div></div></div>`;
      }
      return `<div class="chart">${head}${buildBarSvg(c.labels, c.values)}</div>`;
    }
    case 'StatsCard':
      return `<div class="stats">${c.items
        .map(
          (it) =>
            `<div class="stat">${it.icon ? `<div class="stat-ic">${esc(it.icon)}</div>` : ''}<div class="stat-v">${esc(it.value)}</div><div class="stat-l">${esc(it.label)}</div></div>`,
        )
        .join('')}</div>`;
    case 'TimelineCard':
      return `<div class="card-label">타임라인</div><div class="timeline">${c.items
        .map(
          (it) =>
            `<div class="tl-item"><div class="tl-date">${esc(it.date)}</div><div class="tl-title">${esc(it.title)}</div>${it.desc ? `<div class="tl-desc">${esc(it.desc)}</div>` : ''}</div>`,
        )
        .join('')}</div>`;
    case 'FeatureCard': {
      const ficon = c.icon ? `<div class="feat-ic">${esc(c.icon)}</div>` : '';
      const fitems = c.items.length
        ? `<ul class="feat-ck">${c.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>`
        : '';
      const fdesc = c.desc ? `<div class="feat-d">${esc(c.desc)}</div>` : '';
      return `<div class="feat">${ficon}<div class="feat-body"><div class="feat-t">${esc(c.title)}</div>${fdesc}${fitems}</div></div>`;
    }
    case 'ProgressCard': {
      const rows = c.items
        .map((it, i) => {
          const done = it.percent >= 100;
          const valTxt = done ? '완료 ✓' : `${it.percent}%`;
          const valCls = done ? ' pg-done' : '';
          const fillCls = done ? ' pg-fill-done' : '';
          const overall = i === 0 ? ' pg-overall' : '';
          return `<div class="pg-row${overall}"><div class="pg-top"><span class="pg-label">${esc(it.label)}</span><span class="pg-val${valCls}">${valTxt}</span></div><div class="pg-bar"><i class="pg-fill${fillCls}" style="width:${it.percent}%"></i></div></div>`;
        })
        .join('');
      return `<div class="pg">${rows}</div>`;
    }
    case 'StepperCard': {
      const n = c.steps.length;
      if (n === 0) return `<div class="stp"></div>`;
      const cur = c.current;
      let row = '';
      c.steps.forEach((label, idx) => {
        const s = idx + 1;
        const state = s < cur ? 'done' : s === cur ? 'on' : 'todo';
        const mark = state === 'done' ? '✓' : String(s);
        row += `<div class="s ${state}"><div class="n">${mark}</div><div class="l">${esc(label)}</div></div>`;
        if (idx < n - 1) row += `<div class="line${s < cur ? ' done' : ''}"></div>`;
      });
      const curLabel = c.steps[cur - 1] ?? '';
      const descBox = c.desc
        ? `<div class="stp-desc"><div class="t">${cur}단계: ${esc(curLabel)}</div><div class="d">${esc(c.desc)}</div></div>`
        : '';
      return `<div class="stp">${row}</div>${descBox}`;
    }
    case 'TimelineCardList': {
      if (c.items.length === 0) return `<div class="tlc"></div>`;
      const items = c.items
        .map(
          (it) =>
            `<div class="it"><div class="ca">${it.date ? `<div class="dt">${esc(it.date)}</div>` : ''}<div class="ti">${esc(it.title)}</div>${it.desc ? `<div class="de">${esc(it.desc)}</div>` : ''}</div></div>`,
        )
        .join('');
      return `<div class="tlc">${items}</div>`;
    }
    case 'ComparisonCard': {
      const hi = c.columns.indexOf(c.highlight);
      const head = c.columns.map((col, i) => `<th${i === hi ? ' class="pro"' : ''}>${esc(col)}</th>`).join('');
      const bodyRows = c.rows
        .map((r) => `<tr>${r.map((cell, i) => `<td${i === hi ? ' class="pro"' : ''}>${esc(cell)}</td>`).join('')}</tr>`)
        .join('');
      return `<table class="cmp"><thead><tr>${head}</tr></thead><tbody>${bodyRows}</tbody></table>`;
    }
    case 'AlertCard': {
      const L: Record<string, string> = { success: '성공', info: '정보', warning: '경고', error: '오류' };
      const I: Record<string, string> = { success: '✓', info: 'i', warning: '!', error: '✕' };
      return `<div class="al al-${c.variant}"><span class="al-ic">${I[c.variant] ?? 'i'}</span><span class="al-tx"><b>${L[c.variant] ?? '정보'}</b> ${esc(c.text)}</span></div>`;
    }
    case 'ProcessCard': {
      if (c.items.length === 0) return `<div class="proc"></div>`;
      const cells = c.items
        .map((it, i) => {
          const ic = it.icon ? `<div class="proc-ic">${esc(it.icon)}</div>` : '';
          const card = `<div class="proc-p">${ic}<div class="proc-t">${esc(it.title)}</div>${it.desc ? `<div class="proc-d">${esc(it.desc)}</div>` : ''}</div>`;
          return i < c.items.length - 1 ? `${card}<div class="proc-arr">›</div>` : card;
        })
        .join('');
      return `<div class="proc">${cells}</div>`;
    }
    case 'RatingCard': {
      const filled = Math.round(c.value);
      const on = '★'.repeat(Math.max(0, filled));
      const off = '★'.repeat(Math.max(0, c.max - filled));
      return `<div class="rating"><span class="rt-on">${on}</span><span class="rt-off">${off}</span><span class="rt-num">${esc(`${c.value} / ${c.max}`)}</span>${c.label ? `<span class="rt-lb">${esc(c.label)}</span>` : ''}</div>`;
    }
    case 'TagGroup':
      return `<div class="tag-group">${c.items.map((t) => `<span class="tg-tag">${esc(t)}</span>`).join('')}</div>`;
    case 'ChipGroup':
      return `<div class="chip-group">${c.items.map((t) => `<span class="cg-chip">${esc(t)}</span>`).join('')}</div>`;
    case 'TreeCard':
      return `<div class="tree">${c.items
        .map((it) => `<div class="tree-row" style="padding-left:${it.depth * 18}px"><span class="tree-mk">└</span>${esc(it.label)}</div>`)
        .join('')}</div>`;
    case 'PaginationCard': {
      const dots = Array.from({ length: c.total }, (_, i) => `<span class="pgn-dot${i + 1 === c.current ? ' on' : ''}">${i + 1}</span>`).join('');
      return `<div class="pgn"><div class="pgn-dots">${dots}</div><div class="pgn-meta">${c.current} / ${c.total} 페이지</div></div>`;
    }
    case 'EmptyState':
      return `<div class="empty">${c.icon ? `<div class="empty-ic">${esc(c.icon)}</div>` : ''}<div class="empty-t">${esc(c.title)}</div>${c.desc ? `<div class="empty-d">${esc(c.desc)}</div>` : ''}</div>`;
    case 'SearchBar': {
      const shown = c.query || c.placeholder;
      const cls = c.query ? 'srch-q' : 'srch-ph';
      return `<div class="srch"><span class="srch-ic">🔍</span><span class="${cls}">${esc(shown)}</span></div>`;
    }
    case 'TooltipBox':
      return `<div class="tip-box">${c.label ? `<div class="tip-lb">${esc(c.label)}</div>` : ''}<div class="tip-tx">${esc(c.text)}</div></div>`;
    case 'PopoverBox':
      return `<div class="pop-box">${c.title ? `<div class="pop-t">${esc(c.title)}</div>` : ''}<div class="pop-tx">${esc(c.text)}</div></div>`;
    case 'ModalCard':
      return `<div class="modal-card"><div class="modal-t">${esc(c.title)}</div><div class="modal-tx">${esc(c.text)}</div></div>`;
    case 'DrawerCard':
      return `<div class="drawer-card"><div class="drawer-t">${esc(c.title)}</div><div class="drawer-tx">${esc(c.text)}</div></div>`;
    case 'SkeletonCard':
      return `<div class="skel">${Array.from({ length: c.lines }, (_, i) => `<div class="skel-bar"${i === c.lines - 1 ? ' style="width:60%"' : ''}></div>`).join('')}</div>`;
    case 'FileCard': {
      const sub = [c.fileType, c.size].filter((s) => s !== '').join(' · ');
      return `<div class="file-card"><div class="file-ic">📄</div><div class="file-meta"><div class="file-name">${esc(c.name)}</div>${sub ? `<div class="file-sub">${esc(sub)}</div>` : ''}</div></div>`;
    }
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
  'CalloutCard',
  'TimelineCard',
  'FeatureCard',
  'ProgressCard',
  'StepperCard',
  'TimelineCardList',
  'ImageBlock',
]);

export function renderLayoutComponent(lc: LayoutComponent): string {
  // ImageBlock 에 실제 이미지(src=data URI)가 해석돼 있으면 placeholder 대신 figure 로 렌더.
  if (lc.componentType === 'ImageBlock') {
    const img = lc.component as { src?: string; prompt?: string };
    if (img.src) {
      return `<figure class="fig" data-id="${lc.componentId}" data-type="ImageBlock"><img class="fig-img" src="${img.src}" alt="${esc(img.prompt ?? '')}" />${img.prompt ? `<figcaption class="fig-cap">${esc(img.prompt)}</figcaption>` : ''}</figure>`;
    }
  }
  const inner = renderComponentInner(lc.component);
  if (CARD_COMPONENTS.has(lc.componentType)) {
    const imageCls = lc.componentType === 'ImageBlock' ? ' image-slot' : '';
    const variant = (lc.component as { variant?: string }).variant;
    const variantAttr = variant ? ` data-variant="${variant}"` : '';
    return `<div class="card tone-${lc.tone}${imageCls}" data-id="${lc.componentId}" data-type="${lc.componentType}"${variantAttr}>${inner}</div>`;
  }
  return `<div data-id="${lc.componentId}" data-type="${lc.componentType}">${inner}</div>`;
}

function renderPage(page: LayoutPage, recipe: StyleRecipe): string {
  const body = page.components.map(renderLayoutComponent).join('\n  ');
  const variantCls = recipe.variant && recipe.variant !== 'none' ? ` var-${recipe.variant}` : '';
  return `<section class="page" data-page="${page.pageType}">
  <div class="page-body grid-${recipe.gridStyle}${variantCls}">
  ${body}
  </div>
</section>`;
}

export function renderHtml(
  pages: LayoutPage[],
  tokens: DesignTokens,
  docTitle: string,
  recipe: StyleRecipe = BASE_RECIPE,
  componentSelectorName?: string,
  pageScopeName?: string,
): string {
  const css = buildCss(tokens, recipe);
  const pagesHtml = pages.map((p) => renderPage(p, recipe)).join('\n');
  // selector 가 적용된 출력에만 마커를 남긴다(full book 에는 없음).
  const selAttr = componentSelectorName ? ` data-component-selector="${componentSelectorName}"` : '';
  const scopeAttr = pageScopeName ? ` data-page-scope="${pageScopeName}"` : '';
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
<body${selAttr}${scopeAttr}>
<main class="book">
${pagesHtml}
</main>
</body>
</html>
`;
}
