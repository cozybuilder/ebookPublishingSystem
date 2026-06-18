/**
 * Ebook Publishing System — CLI 진입점 (v0.1)
 *
 * input/book.md 를 읽어 Book AST 로 변환하고
 * output/book.ast.json 으로 저장한다.
 *
 * 실행: npm run parse   (= node src/main.ts)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

const inputPath = resolve(projectRoot, 'input', 'book.md');
const outputPath = resolve(projectRoot, 'output', 'book.ast.json');

function main(): void {
  const markdown = readFileSync(inputPath, 'utf8');
  const book = parseBook(markdown);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(book, null, 2) + '\n', 'utf8');

  const chapterCount = book.chapters.length;
  const blockCount = book.chapters.reduce((n, c) => n + c.blocks.length, 0);

  console.log('✓ 파싱 완료');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  출력 : ${outputPath}`);
  console.log(`  제목 : ${book.metadata.title}`);
  console.log(`  챕터 : ${chapterCount}개 / 블록 : ${blockCount}개`);
}

main();
