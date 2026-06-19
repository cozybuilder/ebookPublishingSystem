/**
 * Ebook Publishing System — 릴리스 산출물 검증 규칙 (v2)
 *
 * 깨진 산출물/빈 파일/잘못된 규격을 잡는 최소 품질 기준.
 * 디자인 품질 판단은 코지 육안 검수 영역(여기서 강제하지 않음).
 *
 * 검증 함수는 "사실(facts)"을 인자로 받는 순수 함수 → I/O 없이 단위 테스트 가능.
 * release.ts 가 파일을 읽어 facts 를 만들어 호출한다.
 */

const KB = 1024;

// ===== 규칙 정의 =====
export interface HtmlRule {
  file: string;
  minBytes: number;
  markers: string[]; // 모두 포함되어야 함
}
export interface PngRule {
  file: string;
  minBytes: number;
  width: number;
  height?: number; // 정확 일치
  minHeight?: number; // 최소(가변 detail)
}
export interface PdfRule {
  file: string;
  minBytes: number;
}
export interface DocxRule {
  file: string;
  minBytes: number;
}

export const HTML_RULES: HtmlRule[] = [
  { file: 'book.html', minBytes: 1 * KB, markers: ['grid-stack'] },
  { file: 'book.modern.html', minBytes: 1 * KB, markers: ['grid-stack'] },
  { file: 'book.bento.html', minBytes: 1 * KB, markers: ['grid-bento'] },
  { file: 'book.editorial.html', minBytes: 1 * KB, markers: ['var-editorial'] },
  { file: 'book.dashboard.html', minBytes: 1 * KB, markers: ['var-dashboard'] },
  { file: 'book.preview.html', minBytes: 1 * KB, markers: ['data-component-selector'] },
  { file: 'canvas.detail.html', minBytes: 1 * KB, markers: ['class="canvas canvas-detail'] },
  { file: 'canvas.square.html', minBytes: 1 * KB, markers: ['class="canvas canvas-square'] },
  { file: 'canvas.story.html', minBytes: 1 * KB, markers: ['class="canvas canvas-story'] },
];

export const PNG_RULES: PngRule[] = [
  { file: 'canvas.detail.png', minBytes: 5 * KB, width: 860, minHeight: 1200 },
  { file: 'canvas.square.png', minBytes: 5 * KB, width: 1080, height: 1080 },
  { file: 'canvas.story.png', minBytes: 5 * KB, width: 1080, height: 1920 },
];

export const PDF_RULES: PdfRule[] = [
  { file: 'book.preview.pdf', minBytes: 50 * KB },
  { file: 'book.modern.pdf', minBytes: 100 * KB },
  { file: 'book.editorial.pdf', minBytes: 100 * KB },
  { file: 'book.dashboard.pdf', minBytes: 100 * KB },
  { file: 'book.bento.pdf', minBytes: 100 * KB },
];

export const DOCX_RULES: DocxRule[] = [{ file: 'book.docx', minBytes: 2 * KB }];

// ===== 순수 검증 함수 (facts → reasons[]) =====

export interface FileFact {
  exists: boolean;
  size: number;
}

export function checkHtml(rule: HtmlRule, fact: FileFact, content: string): string[] {
  const r: string[] = [];
  if (!fact.exists) return ['없음'];
  if (fact.size < rule.minBytes) r.push(`size<${rule.minBytes}(${fact.size})`);
  for (const m of rule.markers) {
    if (!content.includes(m)) r.push(`마커 누락: ${m}`);
  }
  return r;
}

export function checkPng(rule: PngRule, fact: FileFact, png: { width: number; height: number } | null): string[] {
  const r: string[] = [];
  if (!fact.exists) return ['없음'];
  if (fact.size < rule.minBytes) r.push(`size<${rule.minBytes}(${fact.size})`);
  if (!png) {
    r.push('PNG 헤더 아님');
    return r;
  }
  if (png.width !== rule.width) r.push(`width≠${rule.width}(${png.width})`);
  if (rule.height !== undefined && png.height !== rule.height) r.push(`height≠${rule.height}(${png.height})`);
  if (rule.minHeight !== undefined && png.height < rule.minHeight) r.push(`height<${rule.minHeight}(${png.height})`);
  return r;
}

export function checkPdf(rule: PdfRule, fact: FileFact, isPdf: boolean): string[] {
  const r: string[] = [];
  if (!fact.exists) return ['없음'];
  if (fact.size < rule.minBytes) r.push(`size<${rule.minBytes}(${fact.size})`);
  if (!isPdf) r.push('%PDF 헤더 아님');
  return r;
}

/** DOCX = ZIP(PK) 시그니처 검사용 순수 함수 */
export function checkDocx(rule: DocxRule, fact: FileFact, isZip: boolean): string[] {
  const r: string[] = [];
  if (!fact.exists) return ['없음'];
  if (fact.size < rule.minBytes) r.push(`size<${rule.minBytes}(${fact.size})`);
  if (!isZip) r.push('PK(ZIP) 시그니처 아님');
  return r;
}

/** 버퍼 선두가 ZIP(PK\x03\x04) 인지 */
export function isZipBuffer(buf: Buffer): boolean {
  return buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;
}
