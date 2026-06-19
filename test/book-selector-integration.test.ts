/**
 * Ebook Publishing System — Book ComponentSelector Integration 테스트 (v1)
 *
 * 의존성 0, 인메모리(파일 미기록 → output/ 영향 없음).
 * 실행: npm run test:book-selector
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { select } from '../src/selector/selector.ts';
import { scopePages, limitContent, rangeBlockLimit, isStructureComponent, pageScopeLabel } from '../src/page-builder/page-scope.ts';
import { FullBookPDF, KmongPreviewPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
import type { ComponentType, ComponentPage } from '../src/types/component.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, '..', 'samples', 'parser-sample.md');

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

// build-html.render() 와 동일한 로직(인메모리 재현)
function renderProfile(profile: typeof FullBookPDF): { html: string; count: number } {
  if (profile.componentSelector) {
    // build-html.render() 와 동일: Page range → blockLimit → Component Selector
    const scoped = scopePages(buildPages(book, profile), profile.selector);
    const limited = limitContent(mapComponents(book, scoped), rangeBlockLimit(profile.selector));
    const flat = limited.flatMap((p) => p.components);
    const policy = profile.componentSelector;
    const primaryAllow = new Set<ComponentType>([...policy.prefer, ...(policy.require ?? [])]);
    const r = select(flat, (c) => c.type, policy, { cap: flat.length, primaryAllow });
    const page: ComponentPage = { type: 'ContentPage', components: r.items };
    const layout = applyLayout([page], DEFAULT_TOKENS);
    return {
      html: renderHtml(layout, DEFAULT_TOKENS, 'P', undefined, policy.strategy, pageScopeLabel(profile.selector)),
      count: r.items.length,
    };
  }
  const layout = applyLayout(mapComponents(book, buildPages(book, profile)), DEFAULT_TOKENS);
  const count = layout.reduce((n, p) => n + p.components.length, 0);
  return { html: renderHtml(layout, DEFAULT_TOKENS, 'F'), count };
}

console.log('Book ComponentSelector Integration 테스트 실행\n');

const full = renderProfile(FullBookPDF);
const preview = renderProfile(KmongPreviewPDF);

// componentSelector 미지정(FullBook) → 전체 출력 유지
const fullFlat = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components).length;
check('FullBook: componentSelector 미지정 → 전체 컴포넌트 유지', full.count === fullFlat, `count=${full.count}, all=${fullFlat}`);
check('FullBook: data-component-selector 마커 없음', !full.html.includes('data-component-selector'));

// preview → selector 적용
check('preview: data-component-selector="marketing" 존재', preview.html.includes('data-component-selector="marketing"'));
check('preview: full book 보다 컴포넌트 수 적음', preview.count < full.count, `preview=${preview.count}, full=${full.count}`);
check('preview: 컴포넌트 1개 이상(빈 출력 아님)', preview.count >= 1);

// preview 는 marketing prefer 타입만(Paragraph 등 제외)
const allowed = new Set(KmongPreviewPDF.componentSelector!.prefer);
const previewTypes = [...preview.html.matchAll(/<div data-id="cmp-\d+" data-type="([A-Za-z]+)"/g)].map((m) => m[1]);
// 카드 래퍼(.card)도 data-type 보유 → 둘 다 검사: 모든 컴포넌트 타입이 allowed 안
const allComponentTypes = [...preview.html.matchAll(/data-id="cmp-\d+" data-type="([A-Za-z]+)"/g)].map((m) => m[1]);
check('preview: 선별 타입이 marketing prefer 안에만', allComponentTypes.length > 0 && allComponentTypes.every((t) => allowed.has(t as ComponentType)), `types=[${[...new Set(allComponentTypes)].join(',')}]`);
check('preview: ParagraphBlock 제외', !allComponentTypes.includes('ParagraphBlock'));

// 결정론
const preview2 = renderProfile(KmongPreviewPDF);
check('preview: 결정론(동일 출력)', preview.html === preview2.html);

// preview 에 page-scope 마커(blockLimit 포함)도 존재(요청 6·7)
check('preview: data-page-scope(blockLimit 포함)', preview.html.includes('data-page-scope="range:ch1-1:block6"'));

// ===== Page Scope (2챕터 fixture) =====
const book2 = parseBook(readFileSync(resolve(__dirname, '..', 'samples', 'preview-scope.md'), 'utf8'));
const allPages2 = buildPages(book2, FullBookPDF);
const scoped2 = scopePages(allPages2, KmongPreviewPDF.selector); // range ch1-1

const fullComps2 = mapComponents(book2, allPages2).flatMap((p) => p.components);
const scopedComps2 = mapComponents(book2, scoped2).flatMap((p) => p.components);

const fullResults = fullComps2.filter((c) => c.type === 'ResultCard');
const scopedResults = scopedComps2.filter((c) => c.type === 'ResultCard');
check('FullBook(2챕터): ResultCard 2개(전체)', fullResults.length === 2, `got ${fullResults.length}`);
check('PageScope range:ch1: ResultCard 1개(챕터1만)', scopedResults.length === 1, `got ${scopedResults.length}`);
check(
  'PageScope: 챕터1 ResultCard 만 포함(챕터2 제외)',
  scopedResults.length === 1 && scopedResults[0].type === 'ResultCard' && scopedResults[0].text.includes('첫 챕터'),
);
check('PageScope: 소스 컴포넌트가 full 보다 적음', scopedComps2.length < fullComps2.length, `scoped=${scopedComps2.length}, full=${fullComps2.length}`);

// page selector → component selector 순서: 스코프된 소스에서만 큐레이션
const primaryAllow2 = new Set(KmongPreviewPDF.componentSelector!.prefer);
const r2 = select(scopedComps2, (c) => c.type, KmongPreviewPDF.componentSelector!, {
  cap: scopedComps2.length,
  primaryAllow: primaryAllow2 as never,
});
check(
  'Page→Component 순서: 큐레이션 결과가 챕터1 범위 내',
  r2.items.every((c) => c.type !== 'ResultCard' || (c.type === 'ResultCard' && c.text.includes('첫 챕터'))),
);

// scope 'all' 은 전체 페이지 유지(미제한)
const allKept = scopePages(allPages2, { scope: 'all' });
check("PageScope scope:'all' → 전체 페이지 유지", allKept.length === allPages2.length);

// ===== blockLimit v2 =====
// book2 챕터1 콘텐츠: paragraph, result, quote (3개) + ChapterHeading(구조)
const ch1Pages = scopePages(allPages2, { scope: 'range', from: { chapter: 1 }, to: { chapter: 1, blockLimit: 2 } });
const ch1CompPages = mapComponents(book2, ch1Pages);
const limited2 = limitContent(ch1CompPages, 2);
const limitedFlat = limited2.flatMap((p) => p.components);
const contentOnly = limitedFlat.filter((c) => !isStructureComponent(c.type));
check('blockLimit: 콘텐츠 2개로 제한', contentOnly.length === 2, `got ${contentOnly.length}`);
check('blockLimit: ChapterHeading 보존(잘리지 않음)', limitedFlat.some((c) => c.type === 'ChapterHeading'));
check(
  'blockLimit: 메타/구조가 카운트 오염 안 함(콘텐츠만 2)',
  limitedFlat.filter((c) => isStructureComponent(c.type)).length >= 1 && contentOnly.length === 2,
);
// blockLimit 미지정 → 변화 없음
const noLimit = limitContent(ch1CompPages, undefined);
check(
  'blockLimit 미지정 → 콘텐츠 제한 없음(기존 range 동작)',
  noLimit.flatMap((p) => p.components).length === ch1CompPages.flatMap((p) => p.components).length,
);
// blockLimit 이후 componentSelector 적용 순서 확인(결과 ⊆ 제한된 소스)
const limitedTypes = new Set(limitedFlat.map((c) => c.type));
const rLimited = select(limitedFlat, (c) => c.type, KmongPreviewPDF.componentSelector!, {
  cap: limitedFlat.length,
  primaryAllow: new Set(KmongPreviewPDF.componentSelector!.prefer) as never,
});
check('blockLimit → componentSelector 순서(결과가 제한 소스 내)', rLimited.items.every((c) => limitedTypes.has(c.type)));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
