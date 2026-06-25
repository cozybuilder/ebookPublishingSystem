/** 통합 스프린트 17 — Process (:::process). 실행: npm run test:process */
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { componentToXml } from '../src/docx/docx-renderer.ts';
import { componentToXhtml } from '../src/epub/epub-renderer.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';

let passed = 0;
const failures: string[] = [];
const check = (name: string, cond: boolean): void => {
  if (cond) { passed++; console.log(`  ✓ ${name}`); } else { failures.push(name); console.log(`  ✗ ${name}`); }
};
const toHtml = (md: string): string => renderHtml(applyLayout(mapComponents(parseBook(md), buildPages(parseBook(md), FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, 'x');

console.log('Process 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::process\nicon: 🔍\ntitle: 분석\ndesc: 요구 분석\n\ntitle: 개발\ndesc: 구현\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; items: { icon: string; title: string; desc: string }[] };
check('파서: process 2항목 (icon 선택)', b.type === 'process' && b.items.length === 2 && b.items[0].icon === '🔍' && b.items[1].icon === '');
const html = toHtml(md);
check('HTML: proc 카드 + 화살표', html.includes('class="proc"') && html.includes('class="proc-p"') && html.includes('class="proc-arr"'));
check('파서: title 없는 항목 무시', (parseBook('# 책\n\n## Chapter 1. 가\n\n:::process\ndesc: no title\n\ntitle: ok\n:::\n').chapters[0].blocks[0] as { items: unknown[] }).items.length === 1);
const card = { type: 'ProcessCard', items: [{ icon: '🔍', title: 'A', desc: 'd' }, { icon: '', title: 'B', desc: '' }] } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('proc-p') && componentToXml(card).includes('<w:b/>'));
check('안전: 빈 데이터', toHtml('# 책\n\n## Chapter 1. 가\n\n:::process\n:::\n').includes('class="proc"'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
