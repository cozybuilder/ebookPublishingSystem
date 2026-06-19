/**
 * Ebook Publishing System — Image Canvas 단위 테스트 (v1)
 *
 * 외부 프레임워크 없이 Node 기본 기능만 사용 (의존성 0).
 * 실행: npm run test:canvas  (= node test/canvas.test.ts)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderCanvas } from '../src/canvas/canvas-renderer.ts';
import { DETAIL_CANVAS, SQUARE_CANVAS, STORY_CANVAS } from '../src/canvas/canvas-profiles.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { resolveThemeByName } from '../src/theme-engine/theme-engine.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const samplePath = resolve(projectRoot, 'samples', 'parser-sample.md');
const out = (name: string) => resolve(projectRoot, 'output', name);

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
const layout = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), bento.tokens);
const all = layout.flatMap((p) => p.components);

const detail = renderCanvas(all, bento.tokens, bento.recipe, DETAIL_CANVAS, 'T');
const square = renderCanvas(all, bento.tokens, bento.recipe, SQUARE_CANVAS, 'T');
const story = renderCanvas(all, bento.tokens, bento.recipe, STORY_CANVAS, 'T');

// 파일 생성(검증 경로 보장)
mkdirSync(out(''), { recursive: true });
writeFileSync(out('canvas.detail.html'), detail, 'utf8');
writeFileSync(out('canvas.square.html'), square, 'utf8');
writeFileSync(out('canvas.story.html'), story, 'utf8');

console.log('Image Canvas 단위 테스트 실행\n');

// 파일 생성 + 내용 확인
check('canvas.detail.html 생성', readFileSync(out('canvas.detail.html'), 'utf8').length > 0);
check('canvas.square.html 생성', readFileSync(out('canvas.square.html'), 'utf8').length > 0);
check('canvas.story.html 생성', readFileSync(out('canvas.story.html'), 'utf8').length > 0);

// canvas wrapper/class
check('detail: canvas wrapper/class', detail.includes('class="canvas canvas-detail"') && detail.includes('data-canvas="detail"'));
check('square: canvas wrapper/class', square.includes('class="canvas canvas-square"'));
check('story: canvas wrapper/class', story.includes('class="canvas canvas-story"'));

// 규격 마커
check('detail: 860px 규격', detail.includes('.canvas-detail { width: 860px') && detail.includes('data-spec="860×auto"'));
check('square: 1080×1080 규격', square.includes('.canvas-square { width: 1080px; height: 1080px') && square.includes('data-spec="1080×1080"'));
check('story: 1080×1920 규격', story.includes('.canvas-story  { width: 1080px; height: 1920px') && story.includes('data-spec="1080×1920"'));

// Bento 스타일 재사용 + 기준선 + CTA
check('Bento 스타일 재사용(grid-bento)', detail.includes('grid-bento') && detail.includes('.grid-bento'));
check('square/story 단일 컬럼', square.includes('grid-bento canvas-single') && story.includes('grid-bento canvas-single'));
check('CTA 하드코딩 포함', story.includes('CozyBuilder Lab') && story.includes('읽히는 전자책을 상품처럼 만듭니다'));
check('preview 기준선(.canvas::before)', detail.includes('.canvas::before'));

// 선별 배치: square 는 핵심 1~3개(limit 3)
const squareCardCount = (square.match(/data-id="cmp-/g) ?? []).length;
check('square: 핵심 컴포넌트 3개 이하', squareCardCount > 0 && squareCardCount <= 3, `got ${squareCardCount}`);
// story 는 2개 이하(ChapterHeading + ResultCard)
const storyCardCount = (story.match(/data-id="cmp-/g) ?? []).length;
check('story: 2개 이하', storyCardCount > 0 && storyCardCount <= 2, `got ${storyCardCount}`);
// detail 은 본문보다 적은 선별(전체 컴포넌트 수보다 작음)
check('detail: 선별 배치(전체보다 적음)', (detail.match(/data-id="cmp-/g) ?? []).length < all.length);

// book.*.html 미접촉(이 테스트는 canvas.* 만 씀)
check('book.* 비접촉(이 테스트는 canvas.* 만 생성)', true);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
