/**
 * Ebook Publishing System — Front Matter 빌드 (v1)
 *
 * input/book.md → 메타데이터 → Front Matter 매니페스트(output/front-matter.{json,md}).
 * 기존 build:html/export:* 파이프라인은 변경하지 않는다(무회귀). 본 산출은 검수/EPUB 연계용.
 * 실행: npm run build:front-matter
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildFrontMatter } from './front-matter/front-matter-generator.ts';
import { renderFrontMatterJson, renderFrontMatterMarkdown } from './front-matter/front-matter-renderer.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const out = (name: string) => resolve(projectRoot, 'output', name);

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const doc = buildFrontMatter(book);

  mkdirSync(resolve(projectRoot, 'output'), { recursive: true });
  writeFileSync(out('front-matter.json'), renderFrontMatterJson(doc), 'utf8');
  writeFileSync(out('front-matter.md'), renderFrontMatterMarkdown(doc), 'utf8');

  console.log('✓ Front Matter 매니페스트 생성');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  제목 : ${doc.meta.title} / 저자 ${doc.meta.author} / ${doc.meta.year}`);
  console.log(`  Front Matter 컴포넌트 ${doc.components.length}개, 목차 ${doc.toc.length}장`);
  console.log(`  → ${out('front-matter.json')}`);
  console.log(`  → ${out('front-matter.md')}`);
}

main();
