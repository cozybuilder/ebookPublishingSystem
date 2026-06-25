/** 통합 스프린트 20 — Chip Group (:::chips). 실행: npm run test:chips */
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

console.log('Chip Group 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::chips\n초보, 입문, 무료\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; items: string[] };
check('파서: chips 쉼표 3개', b.type === 'chips' && b.items.length === 3 && b.items[2] === '무료');
const html = toHtml(md);
check('HTML: chip-group + 칩', html.includes('class="chip-group"') && html.includes('class="cg-chip"'));
const card = { type: 'ChipGroup', items: ['a', 'b'] } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('cg-chip') && componentToXml(card).includes('a'));
check('안전: 빈 데이터', toHtml('# 책\n\n## Chapter 1. 가\n\n:::chips\n:::\n').includes('class="chip-group"'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
