/**
 * Ebook Publishing System — HTML 빌드 진입점 (v0.1)
 *
 * input/book.md → AST → Page → Component → Layout → HTML → 저장.
 * 실행: npm run build:html  (= node src/build-html.ts)
 *
 * 산출물:
 *  - output/book.html            (FullBookPDF)
 *  - output/book.checklist.html  (ChecklistPDF)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { applyLayout } from './layout-engine/layout-engine.ts';
import { renderHtml } from './html-renderer/html-renderer.ts';
import { FullBookPDF, ChecklistPDF } from './page-builder/profiles.ts';
import { DEFAULT_TOKENS } from './design-tokens/default-tokens.ts';
import type { Book } from './types/ast.ts';
import type { OutputProfile } from './types/output.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const inputPath = resolve(projectRoot, 'input', 'book.md');
const fullOutPath = resolve(projectRoot, 'output', 'book.html');
const checklistOutPath = resolve(projectRoot, 'output', 'book.checklist.html');

function renderProfile(book: Book, profile: OutputProfile, docTitle: string): string {
  const layout = applyLayout(mapComponents(book, buildPages(book, profile)), DEFAULT_TOKENS);
  return renderHtml(layout, DEFAULT_TOKENS, docTitle);
}

function main(): void {
  const markdown = readFileSync(inputPath, 'utf8');
  const book = parseBook(markdown);

  const fullHtml = renderProfile(book, FullBookPDF, book.metadata.title);
  const checklistHtml = renderProfile(book, ChecklistPDF, `${book.metadata.title} — 체크리스트`);

  mkdirSync(dirname(fullOutPath), { recursive: true });
  writeFileSync(fullOutPath, fullHtml, 'utf8');
  writeFileSync(checklistOutPath, checklistHtml, 'utf8');

  console.log('✓ HTML 빌드 완료 (디자인 토큰 v0.1 적용)');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  [FullBookPDF]  → ${fullOutPath}  (${fullHtml.length} bytes)`);
  console.log(`  [ChecklistPDF] → ${checklistOutPath}  (${checklistHtml.length} bytes)`);
}

main();
