/** 통합 스프린트 15 — Compare Card (:::compare-card). 실행: npm run test:compare-card */
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

console.log('Compare Card 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::compare-card\ncolumns: 기능, 무료, Pro\nhighlight: Pro\n- 편집, ○, ✓\n- 비용, 0원, 월구독\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; columns: string[]; highlight: string; rows: string[][] };
check('파서: compare-card columns/highlight/rows', b.type === 'compare-card' && b.columns.length === 3 && b.highlight === 'Pro' && b.rows.length === 2);
const html = toHtml(md);
check('HTML: cmp 표 + 강조 열(pro)', html.includes('class="cmp"') && html.includes('class="pro"'));
check('HTML: 비강조(highlight 불일치 안전)', !toHtml('# 책\n\n## Chapter 1. 가\n\n:::compare-card\ncolumns: a, b\nhighlight: zzz\n- x, y\n:::\n').includes('class="pro"'));
const card = { type: 'ComparisonCard', columns: ['a', 'b', 'P'], highlight: 'P', rows: [['x', '○', '✓']] } as never;
check('EPUB/DOCX: 표 렌더', componentToXhtml(card, { media: [] } as never).includes('class="cmp"') && componentToXml(card).includes('<w:tbl>'));
check('안전: 빈 행/열', toHtml('# 책\n\n## Chapter 1. 가\n\n:::compare-card\n:::\n').includes('class="cmp"'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
