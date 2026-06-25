/**
 * Ebook Publishing System — Chart(Donut) 테스트 (실매핑 9차)
 *
 * :::chart type:donut — 정적 SVG(HTML/EPUB) + 범례 + 중앙 라벨/합계, DOCX 값 표. 실행: npm run test:donut
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { componentToXml } from '../src/docx/docx-renderer.ts';
import { componentToXhtml } from '../src/epub/epub-renderer.ts';
import { buildDonutSvg, DONUT_COLORS } from '../src/charts/donut-chart.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
import type { Component } from '../src/types/component.ts';

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

console.log('Chart(Donut) 블록 테스트 실행\n');

const md = '# 책\n\n## Chapter 1. 가\n\n:::chart\ntype: donut\ntitle: 수익화 채널 비중\nlabels: 전자책, 강의, 제휴, 광고\nvalues: 40, 30, 20, 10\nunit: %\ncenter: 총 비중\n:::\n';
const book = parseBook(md);
const cb = book.chapters[0].blocks[0] as { type: string; chartType: string; center: string };
check('파서: chart/donut + center', cb.type === 'chart' && cb.chartType === 'donut' && cb.center === '총 비중');

const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: donut svg circle 4개', (html.match(/<circle /g) || []).length === 4);
check('HTML: 범례 4개', (html.match(/class="lg"/g) || []).length === 4);
check('HTML: 중앙 라벨 + 합계(100%)', html.includes('총 비중') && html.includes('>100%</text>'));
check('HTML: 4색 사용', html.includes('#2563EB') && html.includes('#16A34A') && html.includes('#F59E0B') && html.includes('#9CA3AF'));
check('HTML: 범례 값+단위', html.includes('전자책') && html.includes('>40%</b>'));

const card: Component = { type: 'ChartCard', chartType: 'donut', title: 'T', unit: '%', center: '합계', labels: ['a', 'b'], values: [60, 40] };
check('DOCX: 값 표 대체', componentToXml(card).includes('<w:tbl>') && componentToXml(card).includes('60'));
check('EPUB: donut svg + 범례', componentToXhtml(card, { media: [] } as never).includes('<svg') && componentToXhtml(card, { media: [] } as never).includes('class="lg"'));

// 안전: 5색 이상 순환, 빈/합계0
check('SVG: 5개 → 5번째 색 순환(=1번째)', DONUT_COLORS[4 % DONUT_COLORS.length] === DONUT_COLORS[0]);
check('SVG: 합계 0 → 빈 문자열', buildDonutSvg(['a'], [0], '', '') === '');
check('SVG: 빈 → 빈 문자열', buildDonutSvg([], [], 'x', '%') === '');

// 회귀: bar 는 여전히 막대(rect)
const barMd = '# 책\n\n## Chapter 1. 가\n\n:::chart\ntype: bar\nlabels: a, b\nvalues: 1, 2\n:::\n';
const barHtml = renderHtml(applyLayout(mapComponents(parseBook(barMd), buildPages(parseBook(barMd), FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, 'x');
check('회귀: bar 는 rect(막대) 유지', (barHtml.match(/<rect /g) || []).length === 2 && !barHtml.includes('class="donut-wrap"'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
