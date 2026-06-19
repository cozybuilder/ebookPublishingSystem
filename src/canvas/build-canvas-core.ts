/**
 * Ebook Publishing System — Canvas 빌드 공용 코어
 *
 * 입력 원고 1개로 detail/square/story 캔버스 HTML 3종을 생성한다.
 * rich(input/book.md)와 sparse(samples/canvas-sparse.md) 빌드가 공유한다.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../parser/parser.ts';
import { buildPages } from '../page-builder/page-builder.ts';
import { mapComponents } from '../component-mapper/component-mapper.ts';
import { applyLayout } from '../layout-engine/layout-engine.ts';
import { renderCanvas } from './canvas-renderer.ts';
import { DETAIL_CANVAS, SQUARE_CANVAS, STORY_CANVAS } from './canvas-profiles.ts';
import { FullBookPDF } from '../page-builder/profiles.ts';
import { resolveThemeByName } from '../theme-engine/theme-engine.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

/**
 * @param inputPath 원고 절대경로
 * @param prefix    출력 파일 접두(예: '' → canvas.detail.html / 'sparse.' → canvas.sparse.detail.html)
 */
export function buildCanvasFiles(inputPath: string, prefix: string): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const title = book.metadata.title;

  const bento = resolveThemeByName('Bento');
  const layout = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), bento.tokens);
  const all = layout.flatMap((p) => p.components);

  const targets = [
    { profile: DETAIL_CANVAS, file: `canvas.${prefix}detail.html` },
    { profile: SQUARE_CANVAS, file: `canvas.${prefix}square.html` },
    { profile: STORY_CANVAS, file: `canvas.${prefix}story.html` },
  ];

  const outDir = resolve(projectRoot, 'output');
  mkdirSync(outDir, { recursive: true });
  console.log(`✓ Canvas 빌드 (prefix="${prefix || '(none)'}", Bento 기반)`);
  console.log(`  입력 : ${inputPath}`);
  for (const { profile, file } of targets) {
    const html = renderCanvas(all, bento.tokens, bento.recipe, profile, title);
    const path = resolve(outDir, file);
    writeFileSync(path, html, 'utf8');
    console.log(`  [canvas:${profile.name} ${profile.width}×${profile.height ?? 'auto'}] → ${path}  (${html.length} bytes)`);
  }
}
