/**
 * Ebook Publishing System — Page 빌드 진입점 (v0.1)
 *
 * input/book.md → AST → Page 목록 → JSON 저장.
 * 실행: npm run build:pages  (= node src/build-pages.ts)
 *
 * 산출물:
 *  - output/book.pages.json            (FullBookPDF)
 *  - output/book.checklist.pages.json  (ChecklistPDF)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { FullBookPDF, ChecklistPDF } from './page-builder/profiles.ts';
import type { Page } from './types/output.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const inputPath = resolve(projectRoot, 'input', 'book.md');
const fullOutPath = resolve(projectRoot, 'output', 'book.pages.json');
const checklistOutPath = resolve(projectRoot, 'output', 'book.checklist.pages.json');

function writePages(path: string, profileName: string, pages: Page[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const payload = { profile: profileName, pageCount: pages.length, pages };
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function summarize(pages: Page[]): string {
  const counts: Record<string, number> = {};
  for (const p of pages) counts[p.type] = (counts[p.type] ?? 0) + 1;
  return Object.entries(counts)
    .map(([t, n]) => `${t}×${n}`)
    .join(', ');
}

function main(): void {
  const markdown = readFileSync(inputPath, 'utf8');
  const book = parseBook(markdown);

  const fullPages = buildPages(book, FullBookPDF);
  const checklistPages = buildPages(book, ChecklistPDF);

  writePages(fullOutPath, FullBookPDF.name, fullPages);
  writePages(checklistOutPath, ChecklistPDF.name, checklistPages);

  console.log('✓ Page 빌드 완료');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  [FullBookPDF]  ${fullPages.length} pages  (${summarize(fullPages)})`);
  console.log(`                 → ${fullOutPath}`);
  console.log(`  [ChecklistPDF] ${checklistPages.length} pages  (${summarize(checklistPages)})`);
  console.log(`                 → ${checklistOutPath}`);
}

main();
