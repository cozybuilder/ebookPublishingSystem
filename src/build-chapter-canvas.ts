/**
 * Ebook Publishing System — 챕터별 상세 캔버스 빌드 (v1)
 *
 * input/book.md 의 각 챕터(등장 순서)를 범위로 잡아 detail 캔버스 HTML 을 생성한다.
 * 실행: npm run build:canvas:chapters
 *   - output/canvas.chapter1.detail.html
 *   - output/canvas.chapter2.detail.html ...
 *
 * 기존 canvas.detail/square/story 출력은 건드리지 않는다. (별도 산출)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { scopePages } from './page-builder/page-scope.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { applyLayout } from './layout-engine/layout-engine.ts';
import { renderCanvas } from './canvas/canvas-renderer.ts';
import { DETAIL_CANVAS } from './canvas/canvas-profiles.ts';
import { chapterDetailHtmlName } from './canvas/chapter-names.ts';
import { FullBookPDF } from './page-builder/profiles.ts';
import { resolveThemeByName } from './theme-engine/theme-engine.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const out = (name: string) => resolve(projectRoot, 'output', name);

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const title = book.metadata.title;
  const bento = resolveThemeByName('Bento');
  const allPages = buildPages(book, FullBookPDF);

  mkdirSync(resolve(projectRoot, 'output'), { recursive: true });
  console.log(`✓ 챕터별 상세 캔버스 빌드 (${book.chapters.length}개 챕터)`);
  console.log(`  입력 : ${inputPath}`);

  book.chapters.forEach((_chapter, ci) => {
    const ordinal = ci + 1;
    // 챕터 ordinal 범위로 페이지 제한 → detail selector 로 큐레이션
    const scoped = scopePages(allPages, { scope: 'range', from: { chapter: ordinal }, to: { chapter: ordinal } });
    const layout = applyLayout(mapComponents(book, scoped), bento.tokens);
    const all = layout.flatMap((p) => p.components);
    const html = renderCanvas(all, bento.tokens, bento.recipe, DETAIL_CANVAS, `${title} — Chapter ${ordinal}`);
    const file = chapterDetailHtmlName(ordinal);
    writeFileSync(out(file), html, 'utf8');
    console.log(`  [chapter ${ordinal}] → ${out(file)}  (${html.length} bytes)`);
  });
}

main();
