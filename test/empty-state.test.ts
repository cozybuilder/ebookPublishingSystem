/** 통합 스프린트 23 — Empty State (:::empty). 실행: npm run test:empty */
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

console.log('Empty State 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::empty\nicon: 📭\ntitle: 항목 없음\ndesc: 아직 없습니다\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; icon: string; title: string; desc: string };
check('파서: empty icon/title/desc', b.type === 'empty' && b.title === '항목 없음' && b.desc === '아직 없습니다');
const html = toHtml(md);
check('HTML: empty placeholder', html.includes('class="empty"') && html.includes('class="empty-t"'));
const card = { type: 'EmptyState', icon: '📭', title: 'T', desc: 'd' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('empty-t') && componentToXml(card).includes('T'));
check('안전: icon 없어도 제목만', toHtml('# 책\n\n## Chapter 1. 가\n\n:::empty\ntitle: 빈\n:::\n').includes('class="empty"'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
