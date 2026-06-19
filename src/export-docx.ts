/**
 * Ebook Publishing System — DOCX Export (v1)
 *
 * input/book.md → AST → Components → output/book.docx (편집 가능한 흐름형 Word).
 * 직접 OpenXML 생성(의존성 0). HTML/PDF 테마와 무관한 별도 트랙.
 * 실행: npm run export:docx
 */

import { readFileSync, writeFileSync, mkdirSync, statSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { renderDocx, type ImageResolver } from './docx/docx-renderer.ts';
import { FullBookPDF } from './page-builder/profiles.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const outPath = resolve(projectRoot, 'output', 'book.docx');

// 이미지 슬롯 id → assets/<id>.{png,jpg,jpeg} 파일이 있으면 실삽입, 없으면 placeholder.
const assetsDir = resolve(projectRoot, 'assets');
const imageResolver: ImageResolver = (block) => {
  for (const ext of ['png', 'jpg', 'jpeg'] as const) {
    const p = resolve(assetsDir, `${block.id}.${ext}`);
    if (existsSync(p)) return { data: readFileSync(p), ext };
  }
  return null;
};

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const components = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
  const docx = renderDocx(components, book.metadata.title, imageResolver);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, docx);

  console.log('✓ DOCX Export 완료 (직접 OpenXML, 의존성 0)');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  출력 : ${outPath}  (${statSync(outPath).size} bytes, 컴포넌트 ${components.length}개)`);
}

main();
