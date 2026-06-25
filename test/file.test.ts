/** 통합 스프린트 30 — File Uploader (:::file → 파일 정보 카드). 실행: npm run test:file */
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

console.log('File Card 테스트 실행\n');
const md = '# 책\n\n## Chapter 1. 가\n\n:::file\nname: report.pdf\nsize: 1.2MB\ntype: PDF\n:::\n';
const b = parseBook(md).chapters[0].blocks[0] as { type: string; name: string; size: string; fileType: string };
check('파서: file name/size/type', b.type === 'file' && b.name === 'report.pdf' && b.size === '1.2MB' && b.fileType === 'PDF');
const html = toHtml(md);
check('HTML: file-card + 이름/부가정보', html.includes('class="file-card"') && html.includes('report.pdf') && html.includes('PDF · 1.2MB'));
const card = { type: 'FileCard', name: 'a.zip', size: '2MB', fileType: 'ZIP' } as never;
check('EPUB/DOCX: 렌더', componentToXhtml(card, { media: [] } as never).includes('file-card') && componentToXml(card).includes('a.zip'));
check('안전: size/type 없어도 이름만', toHtml('# 책\n\n## Chapter 1. 가\n\n:::file\nname: only.txt\n:::\n').includes('only.txt'));

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
