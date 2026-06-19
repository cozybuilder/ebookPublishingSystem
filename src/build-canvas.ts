/**
 * Ebook Publishing System — Canvas 빌드 진입점 (v1)
 *
 * input/book.md → AST → Page → Component → Layout(Bento) → 캔버스 HTML.
 * 실행: npm run build:canvas  (= node src/build-canvas.ts)
 *
 * 산출물:
 *  - output/canvas.detail.html  (상세페이지 세로형)
 *  - output/canvas.square.html  (SNS 정사각 1080×1080)
 *  - output/canvas.story.html   (스토리/릴스 1080×1920)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { applyLayout } from './layout-engine/layout-engine.ts';
import { renderCanvas } from './canvas/canvas-renderer.ts';
import { DETAIL_CANVAS, SQUARE_CANVAS, STORY_CANVAS } from './canvas/canvas-profiles.ts';
import { FullBookPDF } from './page-builder/profiles.ts';
import { resolveThemeByName } from './theme-engine/theme-engine.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const out = (name: string) => resolve(projectRoot, 'output', name);

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const title = book.metadata.title;

  // 캔버스는 Bento 테마 기반
  const bento = resolveThemeByName('Bento');
  const layout = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), bento.tokens);
  const all = layout.flatMap((p) => p.components);

  const targets = [
    { profile: DETAIL_CANVAS, file: 'canvas.detail.html' },
    { profile: SQUARE_CANVAS, file: 'canvas.square.html' },
    { profile: STORY_CANVAS, file: 'canvas.story.html' },
  ];

  mkdirSync(out(''), { recursive: true });
  console.log('✓ Canvas 빌드 완료 (Bento 기반, 캡처용 HTML)');
  console.log(`  입력 : ${inputPath}`);
  for (const { profile, file } of targets) {
    const html = renderCanvas(all, bento.tokens, bento.recipe, profile, title);
    const path = out(file);
    writeFileSync(path, html, 'utf8');
    console.log(`  [canvas:${profile.name} ${profile.width}×${profile.height ?? 'auto'}] → ${path}  (${html.length} bytes)`);
  }
}

main();
