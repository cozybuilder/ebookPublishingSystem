/**
 * Ebook Publishing System — Layout Engine 단위 테스트 (v0.1)
 *
 * 외부 프레임워크 없이 Node 기본 기능만 사용 (의존성 0).
 * 실행: npm run test:layout  (= node test/layout.test.ts)
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
import type { LayoutComponent, LayoutPage } from '../src/types/design.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, '..', 'samples', 'parser-sample.md');

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const book = parseBook(readFileSync(samplePath, 'utf8'));
const layout: LayoutPage[] = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS);

const allComponents: LayoutComponent[] = layout.flatMap((p) => p.components);
function find(ct: string): LayoutComponent | undefined {
  return allComponents.find((c) => c.componentType === ct);
}

console.log('Layout Engine 단위 테스트 실행\n');

// --- LayoutPage 생성 ---
check('LayoutPage 가 생성됨', layout.length > 0);
check('LayoutPage 에 pageType 유지', layout.every((p) => typeof p.pageType === 'string'));

// --- componentId ---
check('모든 LayoutComponent 가 componentId 보유', allComponents.length > 0 && allComponents.every((c) => typeof c.componentId === 'string' && c.componentId.length > 0));
const ids = allComponents.map((c) => c.componentId);
check('componentId 가 유일함', new Set(ids).size === ids.length, `${new Set(ids).size}/${ids.length}`);

// --- tone ---
check('warning → emphasis tone', find('WarningCard')?.tone === 'emphasis');
check('result → emphasis tone', find('ResultCard')?.tone === 'emphasis');
check('prompt → info tone', find('PromptCard')?.tone === 'info');
check('steps → info tone', find('StepsCard')?.tone === 'info');
check('faq → info tone', find('FAQCard')?.tone === 'info');
check('checklist → neutral tone', find('ChecklistCard')?.tone === 'neutral');
check('table → neutral tone', find('TableCard')?.tone === 'neutral');
check('compare → neutral tone', find('CompareCard')?.tone === 'neutral');
check('before-after → neutral tone', find('BeforeAfterCard')?.tone === 'neutral');

// --- typography role ---
check('TitleBlock → title typography role', find('TitleBlock')?.typographyRole === 'title');
check('ParagraphBlock → body typography role', find('ParagraphBlock')?.typographyRole === 'body');
check('ChapterHeading → chapter typography role', find('ChapterHeading')?.typographyRole === 'chapter');

// --- radius ---
check('ImageBlock → image radius', find('ImageBlock')?.radius === 'image');
check('TableCard → card radius', find('TableCard')?.radius === 'card');
check('TitleBlock → radius 없음(null)', find('TitleBlock')?.radius === null);

// --- canvas 토큰 존재 ---
check('canvas: square 토큰 존재(1080x1080)', DEFAULT_TOKENS.canvas.square.width === 1080 && DEFAULT_TOKENS.canvas.square.height === 1080);
check('canvas: vertical 토큰 존재(1080x1920)', DEFAULT_TOKENS.canvas.vertical.width === 1080 && DEFAULT_TOKENS.canvas.vertical.height === 1920);
check('canvas: detailBanner 토큰 존재(1080x3240)', DEFAULT_TOKENS.canvas.detailBanner.width === 1080 && DEFAULT_TOKENS.canvas.detailBanner.height === 3240);

// --- 요약 ---
console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
