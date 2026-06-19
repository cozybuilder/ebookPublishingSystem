/**
 * Ebook Publishing System — PDF export 순수 헬퍼 (v1)
 *
 * print CSS 주입 / html→pdf 파일명 매핑 / %PDF 헤더 검사.
 * 외부 의존성 없음 — 단위 테스트 가능. 원본 HTML 은 변경하지 않는다(주입은 임시 HTML 대상).
 */

import { readFileSync } from 'node:fs';

/**
 * PDF 변환 대상(preview → modern → editorial → dashboard 순).
 * Bento 는 grid/print 보정 난도가 높아 후순위 — 아직 미포함.
 */
export const PDF_TARGETS: string[] = [
  'book.preview.html',
  'book.modern.html',
  'book.editorial.html',
  'book.dashboard.html',
];

/**
 * PDF 변환용 print CSS (v1).
 * - @page: A4 / 16mm 여백
 * - 화면용 카드 장식(그림자/라운드/회색 배경) 제거, 배경/색 출력, break-inside 보호
 * 화면(book.*.html)에는 반영하지 않고 임시 HTML 에만 주입한다.
 */
export const PRINT_CSS = `
<style data-pdf-print="v1">
@page { size: A4; margin: 16mm; }
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
  }
  .card, table, blockquote, .quote, .slot-frame, .steps li, .faq-item,
  [data-type="ChapterHeading"], [data-type="ResultCard"], [data-type="WarningCard"], [data-type="ImageBlock"] {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .page { break-after: page; }
  .page:last-child { break-after: auto; }
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
