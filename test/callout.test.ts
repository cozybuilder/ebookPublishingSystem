/**
 * Ebook Publishing System — Callout(info/tip/note) 블록 테스트 (실매핑 1차)
 *
 * 파서 → AST → 컴포넌트 → HTML/DOCX/EPUB 전 경로 검증. 실행: npm run test:callout
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { componentToXml } from '../src/docx/docx-renderer.ts';
import { componentToXhtml } from '../src/epub/epub-renderer.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
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

console.log('Callout 블록 테스트 실행\n');

const md = `# 책\n\n## Chapter 1. 가\n\n:::info\n정보 내용\n:::\n\n:::tip\n팁 내용\n:::\n\n:::note\n노트 내용\n:::\n`;
const book = parseBook(md);
const blocks = book.chapters[0].blocks;

check('파서: 3개 블록', blocks.length === 3);
check('파서: 전부 callout', blocks.every((b) => b.type === 'callout'));
check('파서: variant info/tip/note', JSON.stringify(blocks.map((b) => (b as { variant?: string }).variant)) === JSON.stringify(['info', 'tip', 'note']));
check('파서: text 보존', (blocks[0] as { text: string }).text === '정보 내용');

// AST → 컴포넌트
const comps = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
const callouts = comps.filter((c) => c.type === 'CalloutCard');
check('매퍼: CalloutCard 3개', callouts.length === 3);
check('매퍼: variant 매핑', JSON.stringify(callouts.map((c) => (c as { variant?: string }).variant)) === JSON.stringify(['info', 'tip', 'note']));

// HTML
const layout = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS);
const html = renderHtml(layout, DEFAULT_TOKENS, '책');
check('HTML: data-type CalloutCard', html.includes('data-type="CalloutCard"'));
check('HTML: data-variant info/tip/note', html.includes('data-variant="info"') && html.includes('data-variant="tip"') && html.includes('data-variant="note"'));
check('HTML: 라벨 정보/팁/노트', html.includes('>정보<') && html.includes('>팁<') && html.includes('>노트<'));
check('HTML: callout CSS 존재', html.includes('[data-type="CalloutCard"][data-variant="info"]'));

// DOCX / EPUB
const info: Component = { type: 'CalloutCard', variant: 'info', text: '정보 내용' };
const tip: Component = { type: 'CalloutCard', variant: 'tip', text: '팁 내용' };
check('DOCX: 라벨 + 본문', componentToXml(info).includes('정보:') && componentToXml(info).includes('정보 내용'));
check('EPUB: callout 클래스 + 본문', componentToXhtml(tip, { media: [] } as never).includes('callout-tip') && componentToXhtml(tip, { media: [] } as never).includes('팁 내용'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
