/** 통합 스프린트 26 — Popover (:::popover → 설명 박스). 실행: npm run test:popover */
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

console.log('Popover 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::popover\ntitle: 안내\ntext: 클릭하면 나타나는 추가 설명입니다.\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; title: string; text: string };
check('파서: popover title/text', b.type === 'popover' && b.title === '안내' && b.text.includes('추가 설명'));
const html = toHtml(md);
check('HTML: pop-box (설명 박스)', html.includes('class="pop-box"') && html.includes('class="pop-t"'));
const card = { type: 'PopoverBox', title: 'T', text: 't' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('pop-box') && componentToXml(card).includes('T'));
check('안전: title 없어도 text', toHtml('# 책\n\n## Chapter 1. 가\n\n:::popover\ntext: 본문만\n:::\n').includes('class="pop-box"'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
