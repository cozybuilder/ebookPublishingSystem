/**
 * Ebook Publishing System — EPUB Export 테스트 (v1)
 *
 * in-memory(파일 미기록). 실행: npm run test:epub
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildEpubModel, type EpubImageResolver } from '../src/epub/epub-renderer.ts';
import { buildEpub, buildEpubEntries, contentOpf, navXhtml } from '../src/epub/epub-package.ts';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('EPUB Export 테스트 실행\n');

const MD =
  '# 제목 <특수>\n\nauthor: 저자\n\n' +
  '## Chapter 1. 첫장\n\n본문가나다\n\n:::result\n결과요약\n:::\n\n' +
  ':::image\nid: IMG-001\ntype: chapter\nprompt: 표지 이미지\n:::\n\n' +
  '## Chapter 2. 둘째장\n\n둘째본문\n';

const book = parseBook(MD);
const OPTS = { uuid: 'urn:uuid:test-0000', modified: '2026-06-19T00:00:00Z' };

// ── resolver 없음(placeholder 경로) ──
const model = buildEpubModel(book, OPTS);
const entries = buildEpubEntries(model);
const names = entries.map((e) => e.name);
const epub = buildEpub(model);

// 1) PK 시그니처
check('EPUB: PK 시그니처', epub[0] === 0x50 && epub[1] === 0x4b);

// 2) mimetype 첫 entry & STORE & 정확한 내용
check('EPUB: mimetype 이 첫 entry', names[0] === 'mimetype');
check('EPUB: mimetype 내용', entries[0].data.toString('ascii') === 'application/epub+zip');
// ZIP 첫 로컬헤더의 compression method(offset 8)가 0(STORE)
check('EPUB: mimetype STORE(method=0)', epub.readUInt16LE(8) === 0);
// ZIP 첫 로컬헤더 파일명이 mimetype
const firstNameLen = epub.readUInt16LE(26);
check('EPUB: ZIP 첫 파일명이 mimetype', epub.subarray(30, 30 + firstNameLen).toString('ascii') === 'mimetype');

// 3~7) 필수 파트 존재
check('EPUB: container.xml 존재', names.includes('META-INF/container.xml'));
check('EPUB: content.opf 존재', names.includes('OEBPS/content.opf'));
check('EPUB: nav.xhtml 존재', names.includes('OEBPS/nav.xhtml'));
check('EPUB: styles/book.css 존재', names.includes('OEBPS/styles/book.css'));
check('EPUB: front-matter.xhtml 존재', names.includes('OEBPS/text/front-matter.xhtml'));

// 8) 챕터 xhtml 생성(2챕터)
check('EPUB: chapter-001.xhtml 생성', names.includes('OEBPS/text/chapter-001.xhtml'));
check('EPUB: chapter-002.xhtml 생성', names.includes('OEBPS/text/chapter-002.xhtml'));

// 9) spine/manifest 등록
const opf = contentOpf(model);
check('OPF: manifest 에 nav/css 등록', opf.includes('properties="nav"') && opf.includes('href="styles/book.css"'));
check('OPF: manifest 에 챕터 등록', opf.includes('href="text/chapter-001.xhtml"') && opf.includes('href="text/chapter-002.xhtml"'));
check('OPF: spine 에 front/챕터 itemref', opf.includes('idref="front"') && opf.includes('idref="ch001"') && opf.includes('idref="ch002"'));
check('OPF: dcterms:modified 포함', opf.includes('dcterms:modified') && opf.includes('2026-06-19T00:00:00Z'));

// nav 목차
const nav = navXhtml(model);
check('nav: 챕터 링크 포함', nav.includes('href="text/chapter-001.xhtml"') && nav.includes('둘째장'));

// 10) XML escape (제목의 < > 가 escape)
check('OPF: 제목 XML escape', opf.includes('제목 &lt;특수&gt;') && !opf.includes('제목 <특수>'));
const frontDoc = entries.find((e) => e.name === 'OEBPS/text/front-matter.xhtml')!.data.toString('utf8');
check('XHTML: front-matter 에 제목/저자/면책', frontDoc.includes('제목 &lt;특수&gt;') && frontDoc.includes('저자') && frontDoc.includes('면책 조항'));
const ch1 = entries.find((e) => e.name === 'OEBPS/text/chapter-001.xhtml')!.data.toString('utf8');
check('XHTML: chapter-001 에 본문/결과', ch1.includes('본문가나다') && ch1.includes('결과요약'));

// 11) ImageBlock placeholder (resolver 없음)
check('XHTML: 이미지 placeholder', ch1.includes('image-slot') && ch1.includes('IMG-001'));
check('EPUB: resolver 없을 때 images/ 미포함', !names.some((n) => n.startsWith('OEBPS/images/')));

// 12) 이미지 있을 때 OEBPS/images 포함
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG 시그니처(내용은 단순)
const resolver: EpubImageResolver = (b) => (b.id === 'IMG-001' ? { data: PNG, ext: 'png' } : null);
const model2 = buildEpubModel(book, { ...OPTS, resolver });
const names2 = buildEpubEntries(model2).map((e) => e.name);
const ch1img = buildEpubEntries(model2).find((e) => e.name === 'OEBPS/text/chapter-001.xhtml')!.data.toString('utf8');
check('EPUB: 이미지 있을 때 OEBPS/images 포함', names2.includes('OEBPS/images/IMG-001.png'));
check('XHTML: 이미지 있을 때 <img> src', ch1img.includes('src="../images/IMG-001.png"') && !ch1img.includes('image-slot'));
check('OPF: 이미지 manifest 등록(image/png)', contentOpf(model2).includes('href="images/IMG-001.png"') && contentOpf(model2).includes('media-type="image/png"'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
