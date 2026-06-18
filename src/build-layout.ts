/**
 * Ebook Publishing System — Layout 빌드 진입점 (v0.1)
 *
 * input/book.md → AST → Page → Component → Layout(디자인 토큰 적용) → JSON 저장.
 * 실행: npm run build:layout  (= node src/build-layout.ts)
 *
 * 산출물:
 *  - output/book.layout.json            (FullBookPDF)
 *  - output/book.checklist.layout.json  (ChecklistPDF)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { applyLayout } from './layout-engine/layout-engine.ts';
import { FullBookPDF, ChecklistPDF } from './page-builder/profiles.ts';
import { DEFAULT_TOKENS } from './design-tokens/default-tokens.ts';
import type { LayoutPage } from './types/design.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const inputPath = resolve(projectRoot, 'input', 'book.md');
const fullOutPath = resolve(projectRoot, 'output', 'book.layout.json');
const checklistOutPath = resolve(projectRoot, 'output', 'book.checklist.layout.json');

function writeLayout(path: string, profileName: string, pages: LayoutPage[]): void {
  mkdirSync(dirname(path), { recursive: true });
  const componentCount = pages.reduce((n, p) => n + p.components.length, 0);
  const payload = {
    profile: profileName,
    tokensVersion: 'v0.1',
    canvas: DEFAULT_TOKENS.canvas,
    pageCount: pages.length,
    componentCount,
    pages,
  };
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function main(): void {
  const markdown = readFileSync(inputPath, 'utf8');
  const book = parseBook(markdown);

  const full = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS);
  const checklist = applyLayout(mapComponents(book, buildPages(book, ChecklistPDF)), DEFAULT_TOKENS);

  writeLayout(fullOutPath, FullBookPDF.name, full);
  writeLayout(checklistOutPath, ChecklistPDF.name, checklist);

  const fullCmp = full.reduce((n, p) => n + p.components.length, 0);
  console.log('✓ Layout 빌드 완료 (디자인 토큰 v0.1 적용)');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  [FullBookPDF]  ${full.length} pages / ${fullCmp} components → ${fullOutPath}`);
  console.log(`  [ChecklistPDF] ${checklist.length} pages → ${checklistOutPath}`);
}

main();
