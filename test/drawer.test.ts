/** 통합 스프린트 28 — Drawer (:::drawer → 강조 카드). 실행: npm run test:drawer */
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

console.log('Drawer 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::drawer\ntitle: 메뉴\ntext: 측면에서 열리는 패널 내용입니다.\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; title: string; text: string };
check('파서: drawer title/text', b.type === 'drawer' && b.title === '메뉴' && b.text.includes('패널'));
const html = toHtml(md);
check('HTML: drawer-card (강조 카드)', html.includes('class="drawer-card"') && html.includes('class="drawer-t"'));
const card = { type: 'DrawerCard', title: 'T', text: 't' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('drawer-card') && componentToXml(card).includes('T'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
