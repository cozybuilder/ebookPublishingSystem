/**
 * Ebook Publishing System — DOCX Export 단위 테스트 (v1)
 *
 * 순수 함수(escape / Component→XML / document.xml / 패키지 엔트리 / ZIP 시그니처) 검증.
 * 실제 Word 열기는 수동. 실행: npm run test:docx
 */

import { escXml } from '../src/docx/docx-escape.ts';
import { componentToXml, renderDocumentXml, renderDocx, renderDocument, type ImageResolver } from '../src/docx/docx-renderer.ts';
import { buildDocxEntries } from '../src/docx/docx-package.ts';
import { jpegDimensions, emuExtent, normalizeExt, imageContentType } from '../src/docx/docx-image.ts';
import type { Component } from '../src/types/component.ts';

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

console.log('DOCX Export 단위 테스트 실행\n');

// ===== XML escape =====
check('escXml: & < > " \'', escXml(`a&b<c>d"e'f`) === 'a&amp;b&lt;c&gt;d&quot;e&apos;f');
check('escXml: 한글/이모지 보존', escXml('루틴 ✓ 결과') === '루틴 ✓ 결과');

// ===== Component → XML =====
check('Title → Heading1', componentToXml({ type: 'TitleBlock', text: '제목' }).includes('w:pStyle w:val="Heading1"'));
check('ChapterHeading → Heading1 + Chapter N', componentToXml({ type: 'ChapterHeading', number: 2, title: 'X' }).includes('Chapter 2. X'));
check('Paragraph → 일반 문단(pStyle 없음)', !componentToXml({ type: 'ParagraphBlock', text: 'p' }).includes('w:pStyle'));
check('Quote → Quote 스타일', componentToXml({ type: 'QuoteBlock', text: 'q' }).includes('w:pStyle w:val="Quote"'));
check('Checklist → ☐ 항목', componentToXml({ type: 'ChecklistCard', items: ['a', 'b'] }).includes('☐ a'));
check('Steps → numId 번호목록', componentToXml({ type: 'StepsCard', items: ['s1'] }).includes('<w:numId w:val="1"/>'));
const tbl = componentToXml({ type: 'TableCard', columns: ['A', 'B'], rows: [['1', '2']] });
check('Table → w:tbl + 헤더/데이터', tbl.includes('<w:tbl>') && tbl.includes('A') && tbl.includes('<w:tr>'));
check('Compare → w:tbl', componentToXml({ type: 'CompareCard', columns: ['x'], rows: [['y']] }).includes('<w:tbl>'));
check('Warning → 주의 라벨 + 음영', componentToXml({ type: 'WarningCard', text: 'w' }).includes('주의:') && componentToXml({ type: 'WarningCard', text: 'w' }).includes('w:shd'));
check('Result → 핵심 결과 라벨', componentToXml({ type: 'ResultCard', text: 'r' }).includes('핵심 결과:'));
check('Image(미해석) → IMAGE SLOT placeholder + 테두리', (() => { const x = componentToXml({ type: 'ImageBlock', id: 'IMG-1', imageType: 'cover', prompt: 'p' }); return x.includes('IMAGE SLOT') && x.includes('IMG-1') && x.includes('w:pBdr'); })());
check('FAQ → Q./A.', componentToXml({ type: 'FAQCard', pairs: [{ q: 'q1', a: 'a1' }] }).includes('Q.'));
// escape 통합
check('XML escape 적용(본문 < > &)', componentToXml({ type: 'ParagraphBlock', text: '<b>&' }).includes('&lt;b&gt;&amp;'));
// 멀티라인 → w:br
check('멀티라인 → w:br', componentToXml({ type: 'ParagraphBlock', text: 'a\nb' }).includes('<w:br/>'));

// ===== document.xml =====
const comps: Component[] = [
  { type: 'TitleBlock', text: 'T' },
  { type: 'ParagraphBlock', text: 'body' },
  { type: 'TableCard', columns: ['c'], rows: [['v']] },
];
const doc = renderDocumentXml(comps);
check('document.xml: 선언 + w:document', doc.startsWith('<?xml') && doc.includes('<w:document'));
check('document.xml: w:body + sectPr', doc.includes('<w:body>') && doc.includes('<w:sectPr>'));
check('document.xml: 컴포넌트 반영', doc.includes('Heading1') && doc.includes('<w:tbl>'));

// ===== 패키지 엔트리 =====
const entries = buildDocxEntries(doc, 'Title&<>');
const names = entries.map((e) => e.name).sort();
const expected = [
  '[Content_Types].xml',
  '_rels/.rels',
  'docProps/app.xml',
  'docProps/core.xml',
  'word/_rels/document.xml.rels',
  'word/document.xml',
  'word/numbering.xml',
  'word/styles.xml',
].sort();
check('패키지: 8개 필수 파트', JSON.stringify(names) === JSON.stringify(expected), names.join(','));
check('core.xml: 제목 escape', entries.find((e) => e.name === 'docProps/core.xml')!.data.toString('utf8').includes('Title&amp;&lt;&gt;'));

// ===== 이미지 헬퍼(순수) =====
check('normalizeExt: jpeg/jpg/png', normalizeExt('JPEG') === 'jpeg' && normalizeExt('.jpg') === 'jpg' && normalizeExt('PNG') === 'png');
check('imageContentType', imageContentType('png') === 'image/png' && imageContentType('jpg') === 'image/jpeg');
check('emuExtent: 비율 유지 + 폭 clamp', (() => { const e = emuExtent({ width: 2000, height: 1000 }); return e.cx === 5486400 && e.cy === Math.round((5486400 * 1000) / 2000); })());
check('emuExtent: 작은 이미지 px×9525', (() => { const e = emuExtent({ width: 100, height: 50 }); return e.cx === 100 * 9525 && e.cy === 50 * 9525; })());
// 합성 JPEG(SOF0) 헤더로 크기 파싱
function fakeJpeg(w: number, h: number): Buffer {
  const head = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08]);
  const hh = Buffer.alloc(2); hh.writeUInt16BE(h);
  const ww = Buffer.alloc(2); ww.writeUInt16BE(w);
  return Buffer.concat([head, hh, ww, Buffer.alloc(8)]);
}
const jd = jpegDimensions(fakeJpeg(640, 480));
check('jpegDimensions: 640×480', !!jd && jd.width === 640 && jd.height === 480);
check('jpegDimensions: 비-JPEG → null', jpegDimensions(Buffer.from('not jpg')) === null);

// ===== 이미지 실삽입(resolver) =====
function fakePng(w: number, h: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const len = Buffer.from([0x00, 0x00, 0x00, 0x0d]);
  const type = Buffer.from('IHDR', 'ascii');
  const ww = Buffer.alloc(4); ww.writeUInt32BE(w);
  const hh = Buffer.alloc(4); hh.writeUInt32BE(h);
  return Buffer.concat([sig, len, type, ww, hh, Buffer.alloc(5)]);
}
const imgComps: Component[] = [
  { type: 'ImageBlock', id: 'IMG-A', imageType: 'cover', prompt: 'a' },
  { type: 'ParagraphBlock', text: '사이 문단' },
  { type: 'ImageBlock', id: 'IMG-B', imageType: 'chapter', prompt: 'b' },
];
const resolver: ImageResolver = (b) =>
  b.id === 'IMG-A' ? { data: fakePng(1200, 800), ext: 'png' } : b.id === 'IMG-B' ? { data: fakeJpeg(640, 480), ext: 'jpg' } : null;
const rd = renderDocument(imgComps, resolver);
check('이미지 해석 시 placeholder 제거', !rd.xml.includes('IMAGE SLOT'));
check('이미지 → w:drawing 삽입', (rd.xml.match(/<w:drawing>/g) ?? []).length === 2);
check('media: image1/image2 증가', rd.media.map((m) => m.fileName).join(',') === 'image1.png,image2.jpg');
check('rel id 증가(서로 다름)', rd.media[0].relId !== rd.media[1].relId && rd.xml.includes(`r:embed="${rd.media[0].relId}"`) && rd.xml.includes(`r:embed="${rd.media[1].relId}"`));
check('document 루트에 r 네임스페이스', rd.xml.includes('xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'));

// 패키지: Content_Types 확장자 등록 + media 파트 + image rels
const imgEntries = buildDocxEntries(rd.xml, 'T', rd.media);
const ct = imgEntries.find((e) => e.name === '[Content_Types].xml')!.data.toString('utf8');
check('Content_Types: png/jpg Default 등록', ct.includes('Extension="png"') && ct.includes('Extension="jpg"'));
const drels = imgEntries.find((e) => e.name === 'word/_rels/document.xml.rels')!.data.toString('utf8');
check('document.xml.rels: image 관계 2개', (drels.match(/relationships\/image/g) ?? []).length === 2);
check('media 파트 존재', imgEntries.some((e) => e.name === 'word/media/image1.png') && imgEntries.some((e) => e.name === 'word/media/image2.jpg'));

// ===== ZIP 시그니처 =====
const buf = renderDocx(comps, 'T');
check('renderDocx: PK 시그니처', buf[0] === 0x50 && buf[1] === 0x4b);
check('renderDocx: size > 0', buf.length > 0);
const bufImg = renderDocx(imgComps, 'T', resolver);
check('renderDocx(이미지 포함): PK 시그니처 유지', bufImg[0] === 0x50 && bufImg[1] === 0x4b);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
