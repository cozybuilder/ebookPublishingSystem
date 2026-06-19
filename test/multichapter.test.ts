/**
 * Ebook Publishing System — 다챕터 통합 검수 테스트 (v1)
 *
 * samples/book-multichapter.md(3챕터)로 page scope / blockLimit / componentSelector /
 * chapter detail / preview / canvas selector 가 실제 다챕터 원고에서 동작하는지 검증.
 * 인메모리(파일 미기록 → output/ 영향 없음). 실행: npm run test:multichapter
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { scopePages, limitContent, isStructureComponent } from '../src/page-builder/page-scope.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderCanvas } from '../src/canvas/canvas-renderer.ts';
import { DETAIL_CANVAS } from '../src/canvas/canvas-profiles.ts';
import { previewComponents } from '../src/preview-components.ts';
import { FullBookPDF, KmongPreviewPDF } from '../src/page-builder/profiles.ts';
import { resolveThemeByName } from '../src/theme-engine/theme-engine.ts';
import type { Selector } from '../src/types/output.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, '..', 'samples', 'book-multichapter.md');

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

const book = parseBook(readFileSync(samplePath, 'utf8'));
const bento = resolveThemeByName('Bento');

console.log('다챕터 통합 검수 테스트 실행\n');

// ===== 1) 파서: 3챕터 + 주요 컴포넌트 =====
check('샘플 파일 파싱', book.metadata.title.length > 0);
check('3챕터 이상 인식', book.chapters.length >= 3, `got ${book.chapters.length}`);
const allTypes = new Set(book.chapters.flatMap((c) => c.blocks.map((b) => b.type)));
for (const t of ['quote', 'result', 'checklist', 'steps', 'compare', 'table', 'warning', 'image'] as const) {
  check(`샘플에 ${t} 블록 포함(전체 기준)`, allTypes.has(t));
}

// ===== 2) page scope: ch1/ch2/ch3 분리 =====
const allPages = buildPages(book, FullBookPDF);
function scopedComponentTypes(ordinal: number): { texts: string[]; types: string[] } {
  const sel: Selector = { scope: 'range', from: { chapter: ordinal }, to: { chapter: ordinal } };
  const comps = mapComponents(book, scopePages(allPages, sel)).flatMap((p) => p.components);
  return {
    texts: comps.flatMap((c) => ('text' in c ? [c.text] : [])),
    types: comps.map((c) => c.type),
  };
}
const s1 = scopedComponentTypes(1);
const s2 = scopedComponentTypes(2);
const s3 = scopedComponentTypes(3);
check('ch1 범위: 1장 결과 포함', s1.texts.some((t) => t.includes('1장 결과')));
check('ch1 범위: 2/3장 결과 미포함', !s1.texts.some((t) => t.includes('2장 결과') || t.includes('3장 결과')));
check('ch2 범위: 2장 결과만', s2.texts.some((t) => t.includes('2장 결과')) && !s2.texts.some((t) => t.includes('1장 결과')));
check('ch3 범위: 3장 결과만', s3.texts.some((t) => t.includes('3장 결과')) && !s3.texts.some((t) => t.includes('2장 결과')));

// ===== 3) blockLimit: 첫 챕터 콘텐츠 제한(구조 보존) =====
const ch1Pages = scopePages(allPages, { scope: 'range', from: { chapter: 1 }, to: { chapter: 1 } });
const ch1Comp = mapComponents(book, ch1Pages);
const limited = limitContent(ch1Comp, 2);
const limitedFlat = limited.flatMap((p) => p.components);
const contentCount = limitedFlat.filter((c) => !isStructureComponent(c.type)).length;
check('blockLimit(2): 콘텐츠 2개로 제한', contentCount === 2, `got ${contentCount}`);
check('blockLimit: ChapterHeading 보존', limitedFlat.some((c) => c.type === 'ChapterHeading'));

// ===== 4) preview componentSelector: 첫 챕터 범위 안에서만 =====
const preview = previewComponents(book, KmongPreviewPDF); // KmongPreview = range ch1, blockLimit 6, marketing
const previewTexts = preview.flatMap((c) => ('text' in c ? [c.text] : []));
check('preview: 비어있지 않음', preview.length > 0);
check('preview: 2/3장 결과 미포함(ch1 범위)', !previewTexts.some((t) => t.includes('2장 결과') || t.includes('3장 결과')));
check('preview: marketing prefer 타입만', preview.every((c) => ['ChapterHeading', 'ResultCard', 'QuoteBlock', 'ChecklistCard', 'CompareCard', 'ImageBlock'].includes(c.type)));

// ===== 5) chapter detail 캔버스: 챕터 수만큼 + 교차오염 없음 =====
function chapterDetailHtml(ordinal: number): string {
  const scoped = scopePages(allPages, { scope: 'range', from: { chapter: ordinal }, to: { chapter: ordinal } });
  const all = applyLayout(mapComponents(book, scoped), bento.tokens).flatMap((p) => p.components);
  return renderCanvas(all, bento.tokens, bento.recipe, DETAIL_CANVAS, `ch${ordinal}`);
}
const d1 = chapterDetailHtml(1);
const d2 = chapterDetailHtml(2);
const d3 = chapterDetailHtml(3);
check('chapter detail: 챕터 수만큼 생성 가능(3종 비어있지 않음)', [d1, d2, d3].every((h) => h.includes('<section class="canvas')));
check('chapter1 detail: 2장 내용 미포함', !d1.includes('2장 결과') && !d1.includes('둘째 챕터'));
check('chapter2 detail: 1장 내용 미포함', !d2.includes('1장 결과') && !d2.includes('첫 챕터'));
check('chapter3 detail: 3장 결과 포함', d3.includes('3장 결과'));
check('chapter detail: 서로 다른 결과물', d1 !== d2 && d2 !== d3);

// ===== 요약 =====
console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
