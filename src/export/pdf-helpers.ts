/**
 * Ebook Publishing System — PDF export 순수 헬퍼 (v1)
 *
 * print CSS 주입 / html→pdf 파일명 매핑 / %PDF 헤더 검사.
 * 외부 의존성 없음 — 단위 테스트 가능. 원본 HTML 은 변경하지 않는다(주입은 임시 HTML 대상).
 */

import { readFileSync } from 'node:fs';

/**
 * PDF 변환 대상(preview → modern → editorial → dashboard → bento 순).
 * Bento 는 인쇄 시 단일컬럼 print 보정으로 처리(아래 PRINT_CSS).
 */
export const PDF_TARGETS: string[] = [
  'book.preview.html',
  'book.modern.html',
  'book.editorial.html',
  'book.dashboard.html',
  'book.bento.html',
];

/**
 * PDF 변환용 print CSS (v1).
 * - @page: A4 / 16mm 여백
 * - 화면용 카드 장식(그림자/라운드/회색 배경) 제거, 배경/색 출력, break-inside 보호
 * 화면(book.*.html)에는 반영하지 않고 임시 HTML 에만 주입한다.
 */
export const PRINT_CSS = `
<style data-pdf-print="v6">
@page { size: A4; margin: 16mm 17mm; }
@page cover { size: A4; margin: 0; }
@media print {
  html, body { background: #ffffff !important; }
  body { margin: 0 !important; }
  .book { padding: 0 !important; }
  .page {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 auto !important;
    width: auto !important;
    min-height: 0 !important;
    padding: 0 !important;
  }
  .page-label { display: none !important; }

  /* ── 페이지네이션 핵심 ──
     표지만 개별 면. 판권/목차/저자소개/면책은 한 흐름으로 연속(빈 면 제거).
     챕터에서만 새 면 시작, 본문은 자연 흐름. */
  .page[data-page="CoverPage"] { break-after: page; }
  .page[data-page="ChapterPage"] { break-before: page; break-after: avoid !important; padding-bottom: 2mm !important; }
  .page[data-page="CopyrightPage"],
  .page[data-page="TableOfContentsPage"],
  .page[data-page="ContentPage"] { break-before: auto !important; break-after: auto !important; break-inside: auto; }
  /* 앞부속 블록 사이 간격만 살짝 확보(빈 면은 만들지 않음) */
  .page[data-page="CopyrightPage"], .page[data-page="TableOfContentsPage"] { margin-bottom: 6mm !important; }

  /* ── 표지: 전체 출혈(full-bleed) 상품형 커버 ── */
  .page[data-page="CoverPage"] {
    page: cover;
    min-height: 297mm !important;
    padding: 54mm 24mm !important;
    display: flex; flex-direction: column; justify-content: center;
    text-align: center;
    background: linear-gradient(160deg, #0D1B3D 0%, #1E3A8A 100%) !important;
    color: #ffffff !important;
  }
  .page[data-page="CoverPage"] .ty-title { color: #ffffff !important; font-size: 42px !important; line-height: 1.25 !important; }
  .page[data-page="CoverPage"] .ty-emphasis,
  .page[data-page="CoverPage"] .ty-caption { color: rgba(255,255,255,.82) !important; }
  .page[data-page="CoverPage"] .subtitle-accent { background: #F59E0B !important; }

  /* ── 표지 이미지가 있으면: A4 전면 이미지(배경) + 제목/부제/저자 오버레이 ── */
  .page[data-page="CoverPage"]:has(.cover-image) {
    padding: 0 !important;
    background: #ffffff !important;
    min-height: 297mm !important;
  }
  .page[data-page="CoverPage"]:has(.cover-image) .page-body {
    position: relative !important;
    min-height: 297mm !important;
    overflow: hidden !important;
    display: flex !important; flex-direction: column !important; justify-content: flex-end !important; align-items: center !important;
    text-align: center !important; padding: 22mm 18mm !important;
  }
  .page[data-page="CoverPage"] .cover-image {
    position: absolute !important; inset: 0 !important;
    width: 210mm !important; height: 297mm !important;
    object-fit: cover !important; border-radius: 0 !important; margin: 0 !important; z-index: 0 !important;
  }
  .page[data-page="CoverPage"]:has(.cover-image) .page-body::before {
    content: '' !important; position: absolute !important; inset: 0 !important; z-index: 1 !important;
    background: linear-gradient(180deg, rgba(12,18,38,.10) 25%, rgba(12,18,38,.55) 65%, rgba(12,18,38,.85) 100%) !important;
  }
  .page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="TitleBlock"],
  .page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="SubtitleBlock"],
  .page[data-page="CoverPage"]:has(.cover-image) .page-body > [data-type="AuthorBlock"] { position: relative !important; z-index: 2 !important; }
  .page[data-page="CoverPage"]:has(.cover-image) .ty-title { color: #fff !important; text-shadow: 0 2px 12px rgba(0,0,0,.6) !important; }
  .page[data-page="CoverPage"]:has(.cover-image) .ty-emphasis,
  .page[data-page="CoverPage"]:has(.cover-image) .ty-caption { color: rgba(255,255,255,.95) !important; text-shadow: 0 2px 10px rgba(0,0,0,.55) !important; }
  .page[data-page="CoverPage"]:has(.cover-image) .subtitle-accent { background: #fff !important; }

  /* ── 판권: compact imprint(표지 다음 작은 판권 영역) ── */
  [data-type="CopyrightNotice"] { font-size: 10.5px !important; line-height: 1.5 !important; color: #6B7280 !important; }
  [data-type="CopyrightNotice"] * { font-size: 10.5px !important; color: #6B7280 !important; margin: 0 !important; }
  .page[data-page="CopyrightPage"] { padding-top: 0 !important; margin-bottom: 8mm !important; }

  /* ── break 정책: 카드/컴포넌트는 "원자 블록" — 면 중간에서 절대 절단 금지 ──
     (코비 3차: 체크리스트/카드/Before-After/FAQ/Result/File 등 내부 단위 보호) */
  .card, .feat, .al, .file-card, .empty, .skel, .modal-card, .drawer-card,
  .tip-box, .pop-box, .before-after, .before-after > div, .faq-item, .quote, blockquote,
  .chart, .donut-wrap, .slot-frame, .checklist, .stats, .timeline, .tlc,
  .pg, .pgn, .stp, .proc, .steps, .rating, .tag-group, .chip-group, .tree,
  .stat, .tl-item, .tlc .it, .proc-p, .pg-row, .stp .s, .checklist li, .steps li, tr,
  [data-type="ChapterHeading"], [data-type="ResultCard"], [data-type="WarningCard"],
  [data-type="CalloutCard"], [data-type="FeatureCard"], [data-type="StatsCard"],
  [data-type="TimelineCard"], [data-type="TimelineCardList"], [data-type="ProgressCard"],
  [data-type="StepperCard"], [data-type="ComparisonCard"], [data-type="AlertCard"] {
    break-inside: avoid; page-break-inside: avoid;
  }
  /* 유일한 예외 — 길어질 수 있는 표/목차만 "행 단위"로 분할 허용(행 tr 은 위에서 보호) */
  table, .tbl, .toc, [data-type="TableCard"], [data-type="CompareCard"] {
    break-inside: auto; page-break-inside: auto;
  }
  /* 고아/과부 줄 방지 + 제목·라벨은 다음 내용과 붙임(말미 단독 방지) */
  p, li { orphans: 3; widows: 3; }
  .ty-chapter, .ty-title, .card-label, .chart-title, .feat-t, .proc-t,
  [data-type="ChapterHeading"] { break-after: avoid; }

  /* ── 4차 조판 미세 조정: 밀도·여백·단독 방지(Phase 1) ── */
  /* 블록 간 여백 압축(웹용 넉넉한 간격 → 인쇄 밀도) */
  .card { margin: 12px 0 !important; padding: 18px 20px !important; }
  .stats, .timeline, .tlc, .pg, .pgn, .stp, .proc,
  .before-after, .checklist, .steps, .tree, .tag-group, .chip-group { margin: 13px 0 !important; }
  .ty-body { margin-bottom: 9px !important; }
  .ty-chapter { margin-bottom: 9px !important; }
  .quote { margin: 13px 0 !important; padding: 14px 18px !important; }
  /* 장 시작: 상단에 약간의 호흡만(과한 상단 여백 방지) */
  .page[data-page="ChapterPage"] { padding-top: 1mm !important; }
  /* 제목/라벨 단독(말미 고립) 방지: 다음 내용과 최소 2줄 동반 */
  .ty-chapter, .ty-title, .card-label, .chart-title, .feat-t, .proc-t,
  [data-type="ChapterHeading"] { break-after: avoid-page; }
  p, li { orphans: 3; widows: 3; }

  /* ── 이미지 슬롯: 한 면 독점 방지(높이 축소 + 흐름 안에 배치) ── */
  .slot-frame { min-height: 84px !important; padding: 14px !important; }
  .slot-prompt { margin-top: 6px !important; }

  /* ── 본문 이미지(실해석 figure): 한 면 안에 들어오도록 높이 제한 + 절단 금지 ── */
  .fig { break-inside: avoid; page-break-inside: avoid; margin: 8px 0 !important; }
  .fig-img { max-height: 120mm !important; max-width: 100% !important; box-shadow: none !important; border-radius: 8px !important; }
  .fig-cap { font-size: 10px !important; color: #6B7280 !important; }

  .page:last-child { break-after: auto; }
  /* Bento: 인쇄 시 2열 grid → 단일 컬럼(화면용 .grid-bento 는 불변, print 한정) */
  .grid-bento {
    display: block !important;
    gap: 0 !important;
  }
  .grid-bento > * {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 0 12px 0 !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>`;

/** </head> 직전에 print CSS 를 주입한다. </head> 가 없으면 맨 앞에 붙인다. */
export function injectPrintCss(html: string, css: string = PRINT_CSS): string {
  if (html.includes('</head>')) return html.replace('</head>', `${css}\n</head>`);
  return css + html;
}

/** book.modern.html → book.modern.pdf (경로/확장자 매핑) */
export function htmlToPdfName(htmlFile: string): string {
  return htmlFile.replace(/\.html$/i, '.pdf');
}

/** PDF 시그니처(%PDF-) 검사 */
export function isPdfBuffer(buf: Buffer): boolean {
  return buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-';
}

export function isPdfFile(path: string): boolean {
  try {
    return isPdfBuffer(readFileSync(path).subarray(0, 8));
  } catch {
    return false;
  }
}
