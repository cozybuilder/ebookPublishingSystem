/** 통합 스프린트 25 — Tooltip (:::tooltip → 설명 박스). 실행: npm run test:tooltip */
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

console.log('Tooltip 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::tooltip\nlabel: 힌트\ntext: 마우스를 올리면 보이는 도움말입니다.\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; label: string; text: string };
check('파서: tooltip label/text', b.type === 'tooltip' && b.label === '힌트' && b.text.includes('도움말'));
const html = toHtml(md);
check('HTML: tip-box (설명 박스)', html.includes('class="tip-box"') && html.includes('class="tip-lb"'));
const card = { type: 'TooltipBox', label: 'L', text: 't' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('tip-box') && componentToXml(card).includes('L:'));
check('안전: label 없어도 text', toHtml('# 책\n\n## Chapter 1. 가\n\n:::tooltip\ntext: 본문만\n:::\n').includes('class="tip-box"'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
