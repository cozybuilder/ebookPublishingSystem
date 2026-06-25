/** 통합 스프린트 16 — Alert (:::alert). 실행: npm run test:alert */
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

console.log('Alert 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::alert\nvariant: warning\n저장하지 않은 변경사항이 있습니다.\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; variant: string; text: string };
check('파서: alert variant/text', b.type === 'alert' && b.variant === 'warning' && b.text.includes('변경사항'));
const html = toHtml(md);
check('HTML: al-warning + 라벨', html.includes('class="al al-warning"') && html.includes('경고'));
check('HTML: 4색 variant', toHtml('# 책\n\n## Chapter 1. 가\n\n:::alert\nvariant: error\nx\n:::\n').includes('al-error'));
check('파서: 미지정 variant → info', (parseBook('# 책\n\n## Chapter 1. 가\n\n:::alert\nx\n:::\n').chapters[0].blocks[0] as { variant: string }).variant === 'info');
const card = { type: 'AlertCard', variant: 'success', text: 't' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('al-success') && componentToXml(card).includes('성공:'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
