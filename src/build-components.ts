/**
 * Ebook Publishing System — Component 빌드 진입점 (v0.1)
 *
 * input/book.md → AST → Page 목록 → ComponentPage 목록 → JSON 저장.
 * 실행: npm run build:components  (= node src/build-components.ts)
 *
 * 산출물:
 *  - output/book.components.json            (FullBookPDF)
 *  - output/book.checklist.components.json  (ChecklistPDF)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { FullBookPDF, ChecklistPDF } from './page-builder/profiles.ts';
import type { ComponentPage } from './types/component.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const inputPath = resolve(projectRoot, 'input', 'book.md');
const fullOutPath = resolve(projectRoot, 'output', 'book.components.json');
const checklistOutPath = resolve(projectRoot, 'output', 'book.checklist.components.json');

function writeComponents(path: string, profileName: string, pages: ComponentPage[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const componentCount = pages.reduce((n, p) => n + p.components.length, 0);
  const payload = { profile: profileName, pageCount: pages.length, componentCount, pages };
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return;
}

function summarize(pages: ComponentPage[]): string {
  const counts: Record<string, number> = {};
  for (const p of pages) for (const c of p.components) counts[c.type] = (counts[c.type] ?? 0) + 1;
  return Object.entries(counts)
    .map(([t, n]) => `${t}×${n}`)
    .join(', ');
}

function main(): void {
  const markdown = readFileSync(inputPath, 'utf8');
  const book = parseBook(markdown);

  const fullPages = mapComponents(book, buildPages(book, FullBookPDF));
  const checklistPages = mapComponents(book, buildPages(book, ChecklistPDF));

  writeComponents(fullOutPath, FullBookPDF.name, fullPages);
  writeComponents(checklistOutPath, ChecklistPDF.name, checklistPages);

  console.log('✓ Component 빌드 완료');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  [FullBookPDF]  ${fullPages.length} pages  (${summarize(fullPages)})`);
  console.log(`                 → ${fullOutPath}`);
  console.log(`  [ChecklistPDF] ${checklistPages.length} pages  (${summarize(checklistPages)})`);
  console.log(`                 → ${checklistOutPath}`);
}

main();
