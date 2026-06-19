/**
 * Ebook Publishing System — EPUB Export (v1)
 *
 * input/book.md → AST → Front Matter + 챕터 단위 XHTML → output/book.epub.
 * 직접 OCF/ZIP 생성(의존성 0, 기존 buildZip 재사용). reflowable EPUB 3 기본 구조.
 * 실행: npm run export:epub
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parseBook } from './parser/parser.ts';
import { resolveImageAsset } from './assets/image-asset-resolver.ts';
import { buildEpubModel, type EpubImageResolver } from './epub/epub-renderer.ts';
import { buildEpub } from './epub/epub-package.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const outPath = resolve(projectRoot, 'output', 'book.epub');

// 이미지 슬롯 id → 표준 자산 규약(assets/images/<id>.*)으로 해석. 없으면 placeholder 문단.
const imageResolver: EpubImageResolver = (block) => {
  const found = resolveImageAsset(block.id, projectRoot);
  return found ? { data: found.data, ext: found.ext } : null;
};

/** 제목 기반 안정적 urn:uuid (재실행 시 동일). */
function stableUuid(seed: string): string {
  const h = createHash('sha1').update(seed).digest('hex');
  return `urn:uuid:${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  const model = buildEpubModel(book, {
    uuid: stableUuid(book.metadata.title || 'Untitled Ebook'),
    modified,
    resolver: imageResolver,
  });
  const epub = buildEpub(model);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, epub);

  console.log('✓ EPUB Export 완료 (OCF/ZIP 직접 생성, 의존성 0)');
  console.log(`  입력 : ${inputPath}`);
  console.log(
    `  출력 : ${outPath}  (${statSync(outPath).size} bytes, 문서 ${model.docs.length}편 · 이미지 ${model.media.length}개)`,
  );
}

main();
