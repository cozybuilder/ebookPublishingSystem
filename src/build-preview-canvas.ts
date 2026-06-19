/**
 * Ebook Publishing System — Preview Promo 캔버스 빌드 (v1)
 *
 * book.preview 의 선별 컴포넌트(KmongPreviewPDF)를 소스로 square/story SNS 홍보 캔버스 HTML 생성.
 * 실행: npm run build:canvas:preview
 *   - output/book.preview.square.html (1080×1080)
 *   - output/book.preview.story.html  (1080×1920)
 *
 * 기존 canvas.square/story (전체 원고 기반)·book.preview.html/png/pdf 출력은 건드리지 않는다.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { applyLayout } from './layout-engine/layout-engine.ts';
import { renderCanvas } from './canvas/canvas-renderer.ts';
import { SQUARE_CANVAS, STORY_CANVAS } from './canvas/canvas-profiles.ts';
import { PREVIEW_PROMO_SPECS, previewPromoHtmlName } from './canvas/preview-promo-names.ts';
import { previewComponents } from './preview-components.ts';
import { KmongPreviewPDF } from './page-builder/profiles.ts';
import { resolveThemeByName } from './theme-engine/theme-engine.ts';
import type { ComponentPage } from './types/component.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const out = (name: string) => resolve(projectRoot, 'output', name);

const CANVAS_BY_KIND = { square: SQUARE_CANVAS, story: STORY_CANVAS } as const;

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const title = book.metadata.title;
  const bento = resolveThemeByName('Bento');

  // preview 선별 컴포넌트(= book.preview 와 동일 소스) → 레이아웃
  const items = previewComponents(book, KmongPreviewPDF);
  const page: ComponentPage = { type: 'ContentPage', components: items };
  const all = applyLayout([page], bento.tokens).flatMap((p) => p.components);

  mkdirSync(resolve(projectRoot, 'output'), { recursive: true });
  console.log('✓ Preview Promo 캔버스 빌드 (preview 선별 컴포넌트 기반)');
  console.log(`  입력 : ${inputPath}`);
  for (const spec of PREVIEW_PROMO_SPECS) {
    const profile = CANVAS_BY_KIND[spec.kind];
    const html = renderCanvas(all, bento.tokens, bento.recipe, profile, `${title} — 미리보기 ${spec.kind}`);
    const file = previewPromoHtmlName(spec.kind);
    writeFileSync(out(file), html, 'utf8');
    console.log(`  [preview ${spec.kind} ${spec.width}×${spec.height}] → ${out(file)}  (${html.length} bytes)`);
  }
}

main();
