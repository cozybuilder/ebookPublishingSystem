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
export interface EpubRule {
  file: string;
  minBytes: number;
  /** ZIP 안에 반드시 존재해야 하는 entry 이름 */
  requiredEntries: string[];
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

export const EPUB_RULES: EpubRule[] = [
  {
    file: 'book.epub',
    minBytes: 2 * KB,
    requiredEntries: [
      'mimetype',
      'META-INF/container.xml',
      'OEBPS/content.opf',
      'OEBPS/nav.xhtml',
      'OEBPS/styles/book.css',
      'OEBPS/text/front-matter.xhtml',
      'OEBPS/text/chapter-001.xhtml',
    ],
  },
];

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

// ===== EPUB(OCF) 구조 검증 =====

/** ZIP local file header 들을 순서대로 훑어 얻은 EPUB 사실(facts) */
export interface EpubFacts {
  isZip: boolean;
  /** local header 등장 순서의 entry 이름 목록 */
  entryNames: string[];
  /** 첫 번째 entry 이름(없으면 null) */
  firstEntry: string | null;
  /** 첫 entry 이름이 mimetype 일 때 그 내용(아니면 null) */
  mimetypeContent: string | null;
  /** 첫 entry 가 STORE(무압축, method=0) 인지 */
  mimetypeStored: boolean;
}

/**
 * .epub(=STORE ZIP) 버퍼의 local file header 를 순회해 EpubFacts 추출.
 * 순수 함수(I/O 없음) — release.ts 가 파일을 읽어 전달한다.
 * buildZip 산출(STORE, data descriptor 없음, 연속 local header) 형식을 전제로 한다.
 */
export function readEpubFacts(buf: Buffer): EpubFacts {
  const facts: EpubFacts = { isZip: isZipBuffer(buf), entryNames: [], firstEntry: null, mimetypeContent: null, mimetypeStored: false };
  if (!facts.isZip) return facts;

  let off = 0;
  let first = true;
  while (off + 30 <= buf.length && buf.readUInt32LE(off) === 0x04034b50) {
    const method = buf.readUInt16LE(off + 8);
    const compSize = buf.readUInt32LE(off + 18);
    const nameLen = buf.readUInt16LE(off + 26);
    const extraLen = buf.readUInt16LE(off + 28);
    const nameStart = off + 30;
    const name = buf.subarray(nameStart, nameStart + nameLen).toString('utf8');
    const dataStart = nameStart + nameLen + extraLen;
    facts.entryNames.push(name);
    if (first) {
      facts.firstEntry = name;
      facts.mimetypeStored = method === 0;
      if (name === 'mimetype') facts.mimetypeContent = buf.subarray(dataStart, dataStart + compSize).toString('utf8');
      first = false;
    }
    off = dataStart + compSize;
  }
  return facts;
}

/** EPUB 구조 검증(순수): 존재/크기/PK/mimetype 첫 entry·STORE·내용/필수 entry */
export function checkEpub(rule: EpubRule, fact: FileFact, facts: EpubFacts): string[] {
  const r: string[] = [];
  if (!fact.exists) return ['없음'];
  if (fact.size < rule.minBytes) r.push(`size<${rule.minBytes}(${fact.size})`);
  if (!facts.isZip) {
    r.push('PK(ZIP) 시그니처 아님');
    return r;
  }
  if (facts.firstEntry !== 'mimetype') r.push('mimetype 이 첫 entry 아님');
  else {
    if (!facts.mimetypeStored) r.push('mimetype 비STORE(압축됨)');
    if (facts.mimetypeContent !== 'application/epub+zip') r.push('mimetype 내용 불일치');
  }
  for (const e of rule.requiredEntries) {
    if (!facts.entryNames.includes(e)) r.push(`entry 누락: ${e}`);
  }
  return r;
}
