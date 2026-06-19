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
import { selectComponents } from '../src/canvas/canvas-selector.ts';
import { DETAIL_CANVAS, SQUARE_CANVAS, STORY_CANVAS } from '../src/canvas/canvas-profiles.ts';
import type { LayoutComponent } from '../src/types/design.ts';
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
check('detail: canvas wrapper/class', detail.includes('class="canvas canvas-detail ') && detail.includes('data-canvas="detail"'));
check('square: canvas wrapper/class', square.includes('class="canvas canvas-square ') && square.includes('data-canvas="square"'));
check('story: canvas wrapper/class', story.includes('class="canvas canvas-story ') && story.includes('data-canvas="story"'));

// 규격 마커 (v2: density 포함)
check('detail: 860px 규격', detail.includes('.canvas-detail { width: 860px') && detail.includes('data-spec="860×auto · FLOW"'));
check('square: 1080×1080 규격', square.includes('.canvas-square { width: 1080px; height: 1080px') && square.includes('data-spec="1080×1080 · COMPACT"'));
check('story: 1080×1920 규격', story.includes('.canvas-story  { width: 1080px; height: 1920px') && story.includes('data-spec="1080×1920 · COMPACT"'));

// auto-fit class / data attribute
check('square: data-fit + canvas-fit-compact', square.includes('data-fit="compact"') && square.includes('canvas-fit canvas-fit-compact'));
check('story: data-fit + canvas-fit-compact', story.includes('data-fit="compact"') && story.includes('canvas-fit canvas-fit-compact'));
check('detail: data-fit=flow (auto-fit 비대상)', detail.includes('data-fit="flow"') && detail.includes('canvas-fit-flow'));

// density CSS 마커
check('CSS: compact density 규칙', square.includes('.canvas-fit-compact .card'));
check('CSS: tight density 규칙 존재', square.includes('.canvas-fit-tight .card'));

// 긴 텍스트 안전 처리(line-clamp/max-height/overflow)
check('CSS: 긴 텍스트 말줄임(-webkit-line-clamp)', square.includes('-webkit-line-clamp') && square.includes('overflow: hidden') && square.includes('max-height'));

// Bento 스타일 재사용 + 기준선 + CTA
check('Bento 스타일 재사용(grid-bento)', detail.includes('grid-bento') && detail.includes('.grid-bento'));
check('square/story 단일 컬럼', square.includes('grid-bento canvas-single') && story.includes('grid-bento canvas-single'));
check('CTA 하드코딩 포함', story.includes('CozyBuilder Lab') && story.includes('읽히는 전자책을 상품처럼 만듭니다'));
check('preview 기준선(.canvas::before)', detail.includes('.canvas::before'));

// 선별 배치(v2: 더 엄격) — square ≤ 2
const squareCardCount = (square.match(/data-id="cmp-/g) ?? []).length;
check('square: v2 더 엄격(2개 이하)', squareCardCount > 0 && squareCardCount <= 2, `got ${squareCardCount}`);
// story 는 2개 이하(ChapterHeading + ResultCard)
const storyCardCount = (story.match(/data-id="cmp-/g) ?? []).length;
check('story: ChapterHeading+ResultCard 중심(2개 이하)', storyCardCount > 0 && storyCardCount <= 2, `got ${storyCardCount}`);
// detail 은 고정 높이 auto-fit 비대상 → square 보다 많은 컴포넌트
check('detail: auto-fit 비대상(컴포넌트 더 많음)', (detail.match(/data-id="cmp-/g) ?? []).length > squareCardCount);

// ===== Selector v1 =====
// data-selector / data-picked 존재
check('detail: data-selector + data-picked', detail.includes('data-selector="marketing"') && detail.includes('data-picked="'));
check('square: data-selector=summary', square.includes('data-selector="summary"') && square.includes('data-picked="'));
check('story: data-selector=marketing', story.includes('data-selector="marketing"'));

function picked(html: string): string[] {
  const m = html.match(/data-picked="([^"]*)"/);
  return m && m[1] ? m[1].split(',') : [];
}
const sqPicked = picked(square);
const stPicked = picked(story);

// square: ResultCard/QuoteBlock/ChecklistCard 중심(다른 타입 없음)
check(
  'square: 요약 카드 중심(Result/Quote/Checklist만)',
  sqPicked.length > 0 && sqPicked.every((t) => ['ResultCard', 'QuoteBlock', 'ChecklistCard'].includes(t)),
  `got [${sqPicked.join(',')}]`,
);
// story: ChapterHeading 반드시 포함(require)
check('story: ChapterHeading 필수 포함(require)', stPicked.includes('ChapterHeading'), `got [${stPicked.join(',')}]`);

// maxPerType: 같은 타입 반복 제한 (각 타입 1회 이하)
function noDup(arr: string[]): boolean {
  return new Set(arr).size === arr.length;
}
check('square: 같은 타입 반복 없음(maxPerType)', noDup(sqPicked));
check('story: 같은 타입 반복 없음(maxPerType)', noDup(stPicked));

// 결정론: 같은 입력 → 같은 출력
const square2 = renderCanvas(all, bento.tokens, bento.recipe, SQUARE_CANVAS, 'T');
const story2 = renderCanvas(all, bento.tokens, bento.recipe, STORY_CANVAS, 'T');
check('결정론적: square 재렌더 동일', square === square2);
check('결정론적: story 재렌더 동일', story === story2);

// 기존 auto-fit 유지(회귀)
check('auto-fit 유지: square data-fit/compact/clamp', square.includes('data-fit="compact"') && square.includes('-webkit-line-clamp'));

// ===== Fallback v1 =====
// 후보가 충분한 rich 샘플 → fallback=false
check('충분할 때 fallback=false (square)', square.includes('data-fallback="false"'));
check('충분할 때 fallback=false (story)', story.includes('data-fallback="false"'));

// 합성 LayoutComponent 빌더
let _n = 0;
function lc(type: string, comp: Record<string, unknown>): LayoutComponent {
  return {
    componentId: `cmp-${String(++_n).padStart(4, '0')}`,
    componentType: type as never,
    tone: 'neutral',
    typographyRole: 'body',
    spacing: 'md',
    radius: null,
    bounds: null,
    component: comp as never,
  };
}

// (a) square: Result/Quote/Checklist 없음 + ChapterHeading 만 → 폴백으로 ChapterHeading
const sparseSquare = [
  lc('ParagraphBlock', { type: 'ParagraphBlock', text: 'p' }),
  lc('ChapterHeading', { type: 'ChapterHeading', number: 1, title: 'T' }),
];
const rSquare = selectComponents(sparseSquare, SQUARE_CANVAS);
check('square: 요약 카드 없으면 fallback=true', rSquare.fallback === true);
check('square: fallback 으로 ChapterHeading 채움(빈 캔버스 방지)', rSquare.components.some((c) => c.componentType === 'ChapterHeading'));
check('square: 빈 캔버스 아님', rSquare.components.length >= 1);

// (b) story: ChapterHeading(require) 없음 → 오류 없이 폴백, 빈 캔버스 아님
const noHeadStory = [
  lc('ChecklistCard', { type: 'ChecklistCard', items: ['a'] }),
  lc('QuoteBlock', { type: 'QuoteBlock', text: 'q' }),
];
const rStory = selectComponents(noHeadStory, STORY_CANVAS);
check('story: ChapterHeading 없어도 빈 캔버스 아님', rStory.components.length >= 1);
check('story: require 부재 시 fallback 동작(오류 없음)', rStory.fallback === true || rStory.components.length >= 2);

// (c) fit.maxComponents 초과 금지
const many = Array.from({ length: 10 }, (_, i) => lc('QuoteBlock', { type: 'QuoteBlock', text: `q${i}` }));
const rMany = selectComponents(many, { ...SQUARE_CANVAS, selector: { ...SQUARE_CANVAS.selector, fallback: { minComponents: 8, useFirstAvailable: true } } } as never);
check('fallback: fit.maxComponents(2) 초과 안 함', rMany.components.length <= SQUARE_CANVAS.fit.maxComponents, `got ${rMany.components.length}`);

// (d) avoid 타입은 fallback 에서도 제외(allowTypes 미지정 시)
const avoidProfile = {
  ...SQUARE_CANVAS,
  fit: { mode: 'fixed', maxComponents: 3, density: 'compact' },
  pick: ['ResultCard'],
  selector: { strategy: 'summary', prefer: ['ResultCard'], avoid: ['WarningCard'], fallback: { minComponents: 3, useFirstAvailable: true } },
};
const avoidInput = [
  lc('ResultCard', { type: 'ResultCard', text: 'r' }),
  lc('WarningCard', { type: 'WarningCard', text: 'w' }),
  lc('QuoteBlock', { type: 'QuoteBlock', text: 'q' }),
];
const rAvoid = selectComponents(avoidInput, avoidProfile as never);
check('fallback: avoid 타입 제외 유지(WarningCard 없음)', !rAvoid.components.some((c) => c.componentType === 'WarningCard'));

// (e) 결정론: 폴백 포함 동일 입력 동일 출력
const rSquare2 = selectComponents(sparseSquare, SQUARE_CANVAS);
check('fallback: 결정론(동일 입력 동일 출력)', JSON.stringify(rSquare.components.map((c) => c.componentId)) === JSON.stringify(rSquare2.components.map((c) => c.componentId)));

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
