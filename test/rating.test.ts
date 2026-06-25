/** 통합 스프린트 18 — Rating (:::rating). 실행: npm run test:rating */
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

console.log('Rating 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::rating\nvalue: 4.5\nmax: 5\nlabel: 추천\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; value: number; max: number; label: string };
check('파서: rating value/max/label', b.type === 'rating' && b.value === 4.5 && b.max === 5 && b.label === '추천');
check('파서: value clamp(>max → max)', (parseBook('# 책\n\n## Chapter 1. 가\n\n:::rating\nvalue: 9\nmax: 5\n:::\n').chapters[0].blocks[0] as { value: number }).value === 5);
const html = toHtml(md);
check('HTML: 별점 + 수치', html.includes('class="rating"') && html.includes('★') && html.includes('4.5 / 5'));
const card = { type: 'RatingCard', value: 3, max: 5, label: 'L' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('rating') && componentToXml(card).includes('/ 5'));
check('안전: 빈/기본 max=5', (parseBook('# 책\n\n## Chapter 1. 가\n\n:::rating\n:::\n').chapters[0].blocks[0] as { max: number; value: number }).max === 5);

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
