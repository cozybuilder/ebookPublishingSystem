/** 통합 스프린트 29 — Skeleton (:::skeleton → placeholder 카드). 실행: npm run test:skeleton */
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

console.log('Skeleton 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::skeleton\nlines: 4\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; lines: number };
check('파서: skeleton lines', b.type === 'skeleton' && b.lines === 4);
const html = toHtml(md);
check('HTML: skel + bar 4개', html.includes('class="skel"') && (html.match(/class="skel-bar"/g) || []).length === 4);
check('파서: 기본 lines=3', (parseBook('# 책\n\n## Chapter 1. 가\n\n:::skeleton\n:::\n').chapters[0].blocks[0] as { lines: number }).lines === 3);
const card = { type: 'SkeletonCard', lines: 3 } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('skel-bar') && componentToXml(card).includes('자리'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
