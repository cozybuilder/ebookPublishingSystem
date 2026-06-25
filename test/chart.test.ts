/**
 * Ebook Publishing System — Chart(Bar) 블록 테스트 (실매핑 8차)
 *
 * :::chart type:bar — 정적 SVG(HTML/EPUB) + DOCX 값 표. 실행: npm run test:chart
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { componentToXml } from '../src/docx/docx-renderer.ts';
import { componentToXhtml } from '../src/epub/epub-renderer.ts';
import { buildBarSvg } from '../src/charts/bar-chart.ts';
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

console.log('Chart(Bar) 블록 테스트 실행\n');

const md = '# 책\n\n## Chapter 1. 가\n\n:::chart\ntype: bar\ntitle: 제작 시간 비교\nlabels: 대본, 이미지, 편집, 업로드\nvalues: 20, 40, 30, 10\nunit: 분\n:::\n';
const book = parseBook(md);
const b = book.chapters[0].blocks;
check('파서: chart 블록', b.length === 1 && b[0].type === 'chart');
const cb = b[0] as { chartType: string; title: string; unit: string; labels: string[]; values: number[] };
check('파서: type/title/unit', cb.chartType === 'bar' && cb.title === '제작 시간 비교' && cb.unit === '분');
check('파서: labels 4 / values 4(숫자)', cb.labels.length === 4 && cb.values.length === 4 && cb.values[1] === 40);

const comps = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
check('매퍼: ChartCard', comps.some((c) => c.type === 'ChartCard'));

const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: <svg> + 막대 4개', html.includes('<svg') && (html.match(/<rect /g) || []).length === 4);
check('HTML: title/unit + 라벨', html.includes('제작 시간 비교') && html.includes('단위: 분') && html.includes('>대본</text>'));
check('HTML: Primary 색 막대', html.includes('fill="#2563EB"'));
check('HTML: .chart CSS(중앙/폭)', html.includes('.chart {') && html.includes('margin: 18px auto'));

const card: Component = { type: 'ChartCard', chartType: 'bar', title: 'T', unit: '분', labels: ['a', 'b'], values: [3, 7] };
check('DOCX: 값 표 대체(항목/값 + 데이터)', componentToXml(card).includes('<w:tbl>') && componentToXml(card).includes('항목') && componentToXml(card).includes('7'));
check('EPUB: svg 렌더', componentToXhtml(card, { media: [] } as never).includes('<svg'));

// y축 자동 + 라벨/값 개수 불일치 안전
check('SVG: 빈 데이터 안전(빈 문자열)', buildBarSvg([], []) === '');
check('SVG: 개수 불일치 → 적은 쪽 기준', (buildBarSvg(['a', 'b', 'c'], [1, 2]).match(/<rect /g) || []).length === 2);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
