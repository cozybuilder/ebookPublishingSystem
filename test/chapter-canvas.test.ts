/**
 * Ebook Publishing System — 챕터별 상세 캔버스 테스트 (v1)
 *
 * 의존성 0, 인메모리(파일 미기록 → output/ 영향 없음).
 * 실행: npm run test:chapter-canvas
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { scopePages } from '../src/page-builder/page-scope.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderCanvas } from '../src/canvas/canvas-renderer.ts';
import { DETAIL_CANVAS } from '../src/canvas/canvas-profiles.ts';
import {
  chapterDetailHtmlName,
  chapterDetailPngName,
  chapterOrdinalFromHtml,
} from '../src/canvas/chapter-names.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { resolveThemeByName } from '../src/theme-engine/theme-engine.ts';
import type { Book } from '../src/types/ast.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const samples = (f: string) => resolve(__dirname, '..', 'samples', f);

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('챕터별 상세 캔버스 테스트 실행\n');

// ===== 파일명 규칙 =====
check('chapterDetailHtmlName(1)', chapterDetailHtmlName(1) === 'canvas.chapter1.detail.html');
check('chapterDetailPngName(2)', chapterDetailPngName(2) === 'canvas.chapter2.detail.png');
check('chapterOrdinalFromHtml: 매칭', chapterOrdinalFromHtml('canvas.chapter3.detail.html') === 3);
check('chapterOrdinalFromHtml: 비매칭 → null', chapterOrdinalFromHtml('canvas.detail.html') === null);
check('chapterOrdinalFromHtml: square 비매칭', chapterOrdinalFromHtml('canvas.chapter1.square.html') === null);

// 챕터 ordinal 캔버스 HTML 생성(인메모리, build-chapter-canvas 와 동일 경로)
const bento = resolveThemeByName('Bento');
function chapterCanvas(book: Book, ordinal: number): string {
  const scoped = scopePages(buildPages(book, FullBookPDF), {
    scope: 'range',
    from: { chapter: ordinal },
    to: { chapter: ordinal },
  });
  const layout = applyLayout(mapComponents(book, scoped), bento.tokens);
  const all = layout.flatMap((p) => p.components);
  return renderCanvas(all, bento.tokens, bento.recipe, DETAIL_CANVAS, `ch${ordinal}`);
}

// ===== 1챕터 원고(book.md) → chapter1 생성 가능 =====
const book1 = parseBook(readFileSync(resolve(__dirname, '..', 'input', 'book.md'), 'utf8'));
check('input/book.md: 최소 1챕터', book1.chapters.length >= 1);
const c1 = chapterCanvas(book1, 1);
check('chapter1 캔버스 생성(비어있지 않음)', c1.includes('<section class="canvas'));

// ===== 2챕터 fixture → chapter1/chapter2 분리 =====
const book2 = parseBook(readFileSync(samples('preview-scope.md'), 'utf8'));
check('preview-scope.md: 2챕터', book2.chapters.length === 2);
const ch1 = chapterCanvas(book2, 1);
const ch2 = chapterCanvas(book2, 2);
check('chapter1: 첫 챕터 결과 포함', ch1.includes('첫 챕터'));
check('chapter1: 둘째 챕터 결과 미포함', !ch1.includes('둘째 챕터'));
check('chapter2: 둘째 챕터 결과 포함', ch2.includes('둘째 챕터'));
check('chapter2: 첫 챕터 결과 미포함', !ch2.includes('첫 챕터'));
check('chapter1 ≠ chapter2', ch1 !== ch2);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
