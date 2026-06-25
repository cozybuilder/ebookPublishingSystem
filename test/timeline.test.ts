/**
 * Ebook Publishing System — Timeline 블록 테스트 (실매핑 6차)
 *
 * :::timeline (날짜/제목/설명, 빈 줄로 항목 구분) + 전 렌더 경로. 실행: npm run test:timeline
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

console.log('Timeline 블록 테스트 실행\n');

const md = '# 책\n\n## Chapter 1. 가\n\n:::timeline\n\n2024-05\nAI 영상 제작 시작\n처음으로 쇼츠 제작\n\n2024-06\n첫 수익 발생\n광고 수익 달성\n\n:::\n';
const book = parseBook(md);
const b = book.chapters[0].blocks;
check('파서: timeline 블록 1개', b.length === 1 && b[0].type === 'timeline');
const items = (b[0] as { items: { date: string; title: string; desc: string }[] }).items;
check('파서: 항목 2개', items.length === 2);
check('파서: 날짜/제목/설명 분리', items[0].date === '2024-05' && items[0].title === 'AI 영상 제작 시작' && items[0].desc === '처음으로 쇼츠 제작');

const comps = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
check('매퍼: TimelineCard', comps.some((c) => c.type === 'TimelineCard'));

const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: timeline + 항목 2개', html.includes('class="timeline"') && (html.match(/class="tl-item"/g) || []).length === 2);
check('HTML: 날짜/제목 렌더', html.includes('>2024-05<') && html.includes('>AI 영상 제작 시작<'));
check('HTML: .timeline CSS 존재', html.includes('.timeline {') || html.includes('.timeline::before'));

const card: Component = { type: 'TimelineCard', items: [{ date: '2024-05', title: '시작', desc: '쇼츠' }] };
check('DOCX: 날짜+제목+설명', componentToXml(card).includes('2024-05') && componentToXml(card).includes('시작') && componentToXml(card).includes('쇼츠'));
check('EPUB: tl-item + 내용', componentToXhtml(card, { media: [] } as never).includes('tl-item') && componentToXhtml(card, { media: [] } as never).includes('2024-05'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
