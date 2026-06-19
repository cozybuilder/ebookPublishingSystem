/**
 * Ebook Publishing System — 이미지 프롬프트 매니페스트 빌드 (v1)
 *
 * input/book.md → AST → Components → ImageBlock 수집 → output/image-prompts.{json,md}.
 * 실제 AI 이미지 생성 없음(생성 전 prompt manifest). 자산 존재 여부는 표준 규약으로 판정.
 * 실행: npm run build:image-prompts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildImagePromptManifest } from './image-prompts/image-prompt-manifest.ts';
import { renderManifestJson, renderManifestMarkdown } from './image-prompts/image-prompt-renderer.ts';
import { resolveImageAsset } from './assets/image-asset-resolver.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const out = (name: string) => resolve(projectRoot, 'output', name);

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const manifest = buildImagePromptManifest(book, (id) => {
    const r = resolveImageAsset(id, projectRoot);
    return r ? { path: r.path, ext: r.ext } : null;
  });

  mkdirSync(resolve(projectRoot, 'output'), { recursive: true });
  writeFileSync(out('image-prompts.json'), renderManifestJson(manifest), 'utf8');
  writeFileSync(out('image-prompts.md'), renderManifestMarkdown(manifest), 'utf8');

  console.log('✓ 이미지 프롬프트 매니페스트 생성');
  console.log(`  입력 : ${inputPath}`);
  console.log(`  슬롯 ${manifest.total}개 (생성 필요 ${manifest.missingCount}개)`);
  console.log(`  → ${out('image-prompts.json')}`);
  console.log(`  → ${out('image-prompts.md')}`);
}

main();
