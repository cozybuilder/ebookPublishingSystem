/**
 * Ebook Publishing System — DOCX Export (v1)
 *
 * input/book.md → AST → Components → output/book.docx (편집 가능한 흐름형 Word).
 * 직접 OpenXML 생성(의존성 0). HTML/PDF 테마와 무관한 별도 트랙.
 * 실행: npm run export:docx
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { renderDocx, type ImageResolver } from './docx/docx-renderer.ts';
import { resolveImageAsset } from './assets/image-asset-resolver.ts';
import { resolveCoverDataUri } from './assets/cover-resolver.ts';
import { loadConfigOverrides } from './front-matter/front-matter-config.ts';
import { withFrontMatterComponents } from './front-matter/front-matter-apply.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const outPath = resolve(projectRoot, 'output', 'book.docx');

// 이미지 슬롯 id → 표준 자산 규약(assets/images/<id>.* 우선, assets/<id>.* 호환)으로 해석.
// 파일 있으면 실삽입, 없으면 placeholder.
const imageResolver: ImageResolver = (block) => {
  const found = resolveImageAsset(block.id, projectRoot);
  return found ? { data: found.data, ext: found.ext } : null;
};

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  // 표지 이미지(있으면 표지 면) — assets/images/cover.* 또는 cover: 메타의 id.
  const coverImage = resolveCoverDataUri(projectRoot, book.metadata.cover ?? 'cover') ?? undefined;
  const config = loadConfigOverrides(resolve(projectRoot, 'input', 'book.config.json'));
  // Front Matter(표지/판권/목차/저자 소개/면책) + 본문 (기본 ON)
  const components = withFrontMatterComponents(book, { ...config, coverImage });
  const docx = renderDocx(components, book.metadata.title, imageResolver);

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, docx);

  console.log('✓ DOCX Export 완료 (직접 OpenXML, 의존성 0)');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  출력 : ${outPath}  (${statSync(outPath).size} bytes, 컴포넌트 ${components.length}개)`);
}

main();
