/**
 * Ebook Publishing System — DOCX Export 단위 테스트 (v1)
 *
 * 순수 함수(escape / Component→XML / document.xml / 패키지 엔트리 / ZIP 시그니처) 검증.
 * 실제 Word 열기는 수동. 실행: npm run test:docx
 */

import { escXml } from '../src/docx/docx-escape.ts';
import { componentToXml, renderDocumentXml, renderDocx } from '../src/docx/docx-renderer.ts';
import { buildDocxEntries } from '../src/docx/docx-package.ts';
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
check('Image → IMAGE SLOT placeholder + 테두리', (() => { const x = componentToXml({ type: 'ImageBlock', id: 'IMG-1', imageType: 'cover', prompt: 'p' }); return x.includes('IMAGE SLOT') && x.includes('IMG-1') && x.includes('w:pBdr'); })());
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

// ===== ZIP 시그니처 =====
const buf = renderDocx(comps, 'T');
check('renderDocx: PK 시그니처', buf[0] === 0x50 && buf[1] === 0x4b);
check('renderDocx: size > 0', buf.length > 0);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
