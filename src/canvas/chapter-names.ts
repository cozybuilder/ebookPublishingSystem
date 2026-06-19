/**
 * Ebook Publishing System — 챕터별 상세 이미지 파일명 규칙 (순수)
 *
 * ordinal(등장 순서, 1-based) 기준. 원고의 "Chapter N." 번호가 아니라 몇 번째 챕터인지.
 *   canvas.chapter1.detail.html / .png ...
 */

export function chapterDetailHtmlName(ordinal: number): string {
  return `canvas.chapter${ordinal}.detail.html`;
}

export function chapterDetailPngName(ordinal: number): string {
  return `canvas.chapter${ordinal}.detail.png`;
}

/** 챕터 상세 HTML 파일명 매칭(export 시 발견용) */
export const CHAPTER_DETAIL_HTML_RE = /^canvas\.chapter(\d+)\.detail\.html$/;

/** 파일명에서 ordinal 추출(매칭 안 되면 null) */
export function chapterOrdinalFromHtml(file: string): number | null {
  const m = file.match(CHAPTER_DETAIL_HTML_RE);
  return m ? Number(m[1]) : null;
}
