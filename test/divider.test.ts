/**
 * Ebook Publishing System — Divider 블록 테스트 (실매핑 2차)
 *
 * :::divider 와 단독 수평선(---/***\/___) 두 형태 + 전 렌더 경로. 실행: npm run test:divider
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
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

console.log('Divider 블록 테스트 실행\n');

const md = `# 책\n\n## Chapter 1. 가\n\n앞 단락\n\n:::divider\n:::\n\n중간 단락\n\n---\n\n뒤 단락\n\n***\n`;
const book = parseBook(md);
const blocks = book.chapters[0].blocks;
const dividers = blocks.filter((b) => b.type === 'divider');

check('파서: :::divider + --- + *** = 3개 divider', dividers.length === 3);
check('파서: 단락은 구분선으로 오인되지 않음', blocks.filter((b) => b.type === 'paragraph').length === 3);
check('파서: 순서 보존(단락,divider,단락,divider,단락,divider)', JSON.stringify(blocks.map((b) => b.type)) === JSON.stringify(['paragraph', 'divider', 'paragraph', 'divider', 'paragraph', 'divider']));

const comps = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
check('매퍼: Divider 3개', comps.filter((c) => c.type === 'Divider').length === 3);

const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: hr.divider 렌더', html.includes('<hr class="divider"'));
check('HTML: .divider CSS 존재', html.includes('.divider {'));

const d: Component = { type: 'Divider' };
check('DOCX: 수평선(pBdr bottom)', componentToXml(d).includes('w:pBdr') && componentToXml(d).includes('w:bottom'));
check('EPUB: hr', componentToXhtml(d, { media: [] } as never).includes('<hr'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
