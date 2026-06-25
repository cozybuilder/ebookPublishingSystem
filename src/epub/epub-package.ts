/**
 * Ebook Publishing System — EPUB(OCF) 패키징 (의존성 0)
 *
 * .epub = ZIP(OCF 컨테이너). 기존 STORE ZIP 작성기(docx-package.buildZip)를 재사용한다.
 * 필수 규칙:
 *  - mimetype 파일은 ZIP 의 첫 번째 entry (STORE/무압축) — buildZip 은 모든 entry 를 STORE 로 쓰며 순서 보존.
 *  - container.xml 이 OEBPS/content.opf(rootfile)를 가리킨다.
 *  - content.opf 의 manifest/spine, nav.xhtml 의 목차.
 *
 * 단순/안정 우선(EPUB 3 reflowable). 고급 디자인/인터랙션 제외.
 */

import { buildZip, type ZipEntry } from '../docx/docx-package.ts';
import { escXml } from './epub-escape.ts';

const XML_DECL = '<?xml version="1.0" encoding="UTF-8"?>\n';

/** spine 에 들어가는 XHTML 문서 (file 은 OEBPS 기준 상대경로, 예: text/chapter-001.xhtml) */
export interface EpubDoc {
  id: string;
  file: string;
  title: string;
  /** <body> 내부 XHTML 조각 */
  body: string;
}

/** OEBPS/ 안에 포함되는 이미지 자산 (file 은 OEBPS 기준, 예: images/IMG-001.png) */
export interface EpubMediaItem {
  id: string;
  file: string;
  mediaType: string;
  data: Buffer;
  /** OPF manifest properties (예: 'cover-image'). 표지 이미지에만 지정. */
  properties?: string;
}

export interface EpubModel {
  title: string;
  author: string;
  lang: string;
  /** dc:identifier (예: urn:uuid:...) */
  uuid: string;
  /** dcterms:modified (UTC, 예: 2026-06-19T00:00:00Z) */
  modified: string;
  css: string;
  /** spine 순서(첫 항목이 Front Matter) */
  docs: EpubDoc[];
  media: EpubMediaItem[];
  /** nav 목차 (href 는 OEBPS 기준 상대경로) */
  nav: { href: string; label: string }[];
  /** 표지 이미지 media id (있으면 OPF 에 EPUB2 호환 <meta name="cover"> 추가). */
  coverImageId?: string;
}

/** XHTML 문서 한 편을 감싼다(text/ 폴더 기준 → CSS 는 ../styles/book.css). */
export function xhtmlDoc(title: string, bodyInner: string, lang: string, cssHref = '../styles/book.css'): string {
  return (
    XML_DECL +
    '<!DOCTYPE html>\n' +
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escXml(lang)}" lang="${escXml(lang)}">\n` +
    `<head><meta charset="utf-8"/><title>${escXml(title)}</title>` +
    `<link rel="stylesheet" type="text/css" href="${cssHref}"/></head>\n` +
    `<body>\n${bodyInner}\n</body>\n</html>\n`
  );
}

/** META-INF/container.xml */
export function containerXml(): string {
  return (
    XML_DECL +
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
    '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>' +
    '</container>'
  );
}

/** OEBPS/content.opf (EPUB 3, manifest + spine) */
export function contentOpf(model: EpubModel): string {
  const manifest: string[] = [
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
    '<item id="css" href="styles/book.css" media-type="text/css"/>',
  ];
  for (const d of model.docs) {
    manifest.push(`<item id="${escXml(d.id)}" href="${escXml(d.file)}" media-type="application/xhtml+xml"/>`);
  }
  for (const m of model.media) {
    const props = m.properties ? ` properties="${escXml(m.properties)}"` : '';
    manifest.push(`<item id="${escXml(m.id)}" href="${escXml(m.file)}" media-type="${escXml(m.mediaType)}"${props}/>`);
  }
  const spine = model.docs.map((d) => `<itemref idref="${escXml(d.id)}"/>`).join('');
  return (
    XML_DECL +
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="' +
    escXml(model.lang) +
    '">' +
    '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
    `<dc:identifier id="bookid">${escXml(model.uuid)}</dc:identifier>` +
    `<dc:title>${escXml(model.title)}</dc:title>` +
    `<dc:language>${escXml(model.lang)}</dc:language>` +
    `<dc:creator>${escXml(model.author)}</dc:creator>` +
    `<meta property="dcterms:modified">${escXml(model.modified)}</meta>` +
    (model.coverImageId ? `<meta name="cover" content="${escXml(model.coverImageId)}"/>` : '') +
    '</metadata>' +
    `<manifest>${manifest.join('')}</manifest>` +
    `<spine>${spine}</spine>` +
    '</package>'
  );
}

/** OEBPS/nav.xhtml (EPUB 3 navigation document) */
export function navXhtml(model: EpubModel): string {
  const items = model.nav
    .map((n) => `<li><a href="${escXml(n.href)}">${escXml(n.label)}</a></li>`)
    .join('');
  const body =
    '<nav epub:type="toc" id="toc">\n' +
    '<h1>목차</h1>\n' +
    `<ol>${items}</ol>\n` +
    '</nav>';
  return (
    XML_DECL +
    '<!DOCTYPE html>\n' +
    `<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${escXml(model.lang)}" lang="${escXml(model.lang)}">\n` +
    `<head><meta charset="utf-8"/><title>목차</title>` +
    '<link rel="stylesheet" type="text/css" href="styles/book.css"/></head>\n' +
    `<body>\n${body}\n</body>\n</html>\n`
  );
}

/** EPUB 의 모든 ZIP 엔트리 — mimetype 이 반드시 첫 번째. */
export function buildEpubEntries(model: EpubModel): ZipEntry[] {
  const entries: ZipEntry[] = [
    // 반드시 첫 entry, STORE(buildZip 이 모든 entry 를 STORE 로 기록)
    { name: 'mimetype', data: Buffer.from('application/epub+zip', 'ascii') },
    { name: 'META-INF/container.xml', data: Buffer.from(containerXml(), 'utf8') },
    { name: 'OEBPS/content.opf', data: Buffer.from(contentOpf(model), 'utf8') },
    { name: 'OEBPS/nav.xhtml', data: Buffer.from(navXhtml(model), 'utf8') },
    { name: 'OEBPS/styles/book.css', data: Buffer.from(model.css, 'utf8') },
  ];
  for (const d of model.docs) {
    entries.push({ name: `OEBPS/${d.file}`, data: Buffer.from(xhtmlDoc(d.title, d.body, model.lang), 'utf8') });
  }
  for (const m of model.media) {
    entries.push({ name: `OEBPS/${m.file}`, data: m.data });
  }
  return entries;
}

/** 최종 .epub Buffer */
export function buildEpub(model: EpubModel): Buffer {
  return buildZip(buildEpubEntries(model));
}
