/**
 * Ebook Publishing System — Highlight 인라인 강조 테스트 (실매핑 3차)
 *
 * ==강조== → 단락 내부 하이라이트. ParagraphBlock 한정, 기존 동작 불변. 실행: npm run test:highlight
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

console.log('Highlight 인라인 테스트 실행\n');

const book = parseBook('# 책\n\n## Chapter 1. 가\n\n이것은 ==중요한 부분== 입니다.\n');
const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: <mark class="hl"> 강조', html.includes('<mark class="hl">중요한 부분</mark>'));
check('HTML: mark.hl CSS 존재', html.includes('mark.hl {'));

// DOCX / EPUB 직접
const para: Component = { type: 'ParagraphBlock', text: '이것은 ==중요한 부분== 입니다.' };
const dx = componentToXml(para);
check('DOCX: highlight 런 + 텍스트', dx.includes('<w:highlight w:val="yellow"/>') && dx.includes('중요한 부분'));
const ex = componentToXhtml(para, { media: [] } as never);
check('EPUB: <mark> 강조', ex.includes('<mark>중요한 부분</mark>'));

// 회귀: ==없는 단락은 mark 없음
const plain: Component = { type: 'ParagraphBlock', text: '강조 없는 일반 문장.' };
check('회귀: 일반 단락에 mark 없음', !componentToXml(plain).includes('w:highlight') && !componentToXhtml(plain, { media: [] } as never).includes('<mark>'));

// 안전: HTML 이스케이프 유지
const esc: Component = { type: 'ParagraphBlock', text: 'a < b 그리고 ==강조==' };
const layoutEsc = applyLayout([{ type: 'ContentPage', components: [esc] }], DEFAULT_TOKENS);
const htmlEsc = renderHtml(layoutEsc, DEFAULT_TOKENS, 'x');
check('안전: < 이스케이프 + 강조 동시', htmlEsc.includes('a &lt; b') && htmlEsc.includes('<mark class="hl">강조</mark>'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
