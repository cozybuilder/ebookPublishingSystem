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
  const compPages = mapComponents(book, buildPages(book, profile));
  if (profile.componentSelector) {
    const policy = profile.componentSelector;
    const flat = compPages.flatMap((p) => p.components);
    const primaryAllow = new Set<ComponentType>([...policy.prefer, ...(policy.require ?? [])]);
    const r = select(flat, (c) => c.type, policy, { cap: flat.length, primaryAllow });
    const page: ComponentPage = { type: 'ContentPage', components: r.items };
    const layout = applyLayout([page], DEFAULT_TOKENS);
    return { html: renderHtml(layout, DEFAULT_TOKENS, 'P', undefined, policy.strategy), count: r.items.length };
  }
  const layout = applyLayout(compPages, DEFAULT_TOKENS);
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

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
