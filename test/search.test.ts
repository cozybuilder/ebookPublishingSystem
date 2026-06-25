/** 통합 스프린트 24 — Search Bar (:::search). 실행: npm run test:search */
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

console.log('Search Bar 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::search\nplaceholder: 검색어를 입력하세요\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; placeholder: string; query: string };
check('파서: search placeholder', b.type === 'search' && b.placeholder.includes('검색어'));
const html = toHtml(md);
check('HTML: srch + placeholder', html.includes('class="srch"') && html.includes('class="srch-ph"'));
check('HTML: query 있으면 srch-q', toHtml('# 책\n\n## Chapter 1. 가\n\n:::search\nquery: AI 영상\n:::\n').includes('class="srch-q"'));
const card = { type: 'SearchBar', placeholder: 'p', query: '' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('srch') && componentToXml(card).includes('검색:'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
