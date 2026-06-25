/**
 * Ebook Publishing System — Code Block 테스트 (실매핑 5차)
 *
 * ``` 펜스(언어 선택), 원문 보존, 전 렌더 경로. 실행: npm run test:codeblock
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { componentToXml } from '../src/docx/docx-renderer.ts';
import { componentToXhtml } from '../src/epub/epub-renderer.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
import type { Component } from '../src/types/component.ts';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('Code Block 테스트 실행\n');

const md = '# 책\n\n## Chapter 1. 가\n\n```js\nconst a = 1 < 2;\nconsole.log(a);\n```\n';
const book = parseBook(md);
const b = book.chapters[0].blocks;
check('파서: code 블록 1개', b.length === 1 && b[0].type === 'code');
check('파서: lang js', (b[0] as { lang: string }).lang === 'js');
check('파서: 원문 보존(2줄, < 보존)', (b[0] as { code: string }).code === 'const a = 1 < 2;\nconsole.log(a);');

const comps = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
check('매퍼: CodeBlock', comps.some((c) => c.type === 'CodeBlock'));

const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: code-hd 언어 + pre', html.includes('class="code-hd">js<') && html.includes('class="code-pre">'));
check('HTML: < 이스케이프', html.includes('1 &lt; 2'));
check('HTML: .code CSS 존재', html.includes('.code-pre {'));

const c: Component = { type: 'CodeBlock', lang: 'bash', code: 'echo "hi"\nls -la' };
const dx = componentToXml(c);
check('DOCX: monospace(Consolas) + 코드', dx.includes('Consolas') && dx.includes('echo'));
const ex = componentToXhtml(c, { media: [] } as never);
check('EPUB: code-pre + 코드', ex.includes('class="code-pre"') && ex.includes('ls -la'));

// 언어 없는 펜스
const md2 = '# 책\n\n## Chapter 1. 가\n\n```\nplain\n```\n';
const b2 = parseBook(md2).chapters[0].blocks;
check('파서: 언어 없는 펜스 → lang 빈 문자열', b2[0].type === 'code' && (b2[0] as { lang: string }).lang === '');

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
