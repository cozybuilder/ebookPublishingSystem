/** 통합 스프린트 27 — Modal (:::modal → 강조 카드). 실행: npm run test:modal */
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

console.log('Modal 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::modal\ntitle: 확인\ntext: 정말 진행하시겠습니까?\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; title: string; text: string };
check('파서: modal title/text', b.type === 'modal' && b.title === '확인' && b.text.includes('진행'));
const html = toHtml(md);
check('HTML: modal-card (강조 카드)', html.includes('class="modal-card"') && html.includes('class="modal-t"'));
const card = { type: 'ModalCard', title: 'T', text: 't' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('modal-card') && componentToXml(card).includes('T'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
