/**
 * Ebook Publishing System — Metric/Stats 블록 테스트 (실매핑 7차)
 *
 * :::stats (icon/value/label key-value, 빈 줄 구분, icon 생략 가능, 1~4개). 실행: npm run test:stats
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { componentToXml } from '../src/docx/docx-renderer.ts';
import { componentToXhtml } from '../src/epub/epub-renderer.ts';
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

console.log('Metric/Stats 블록 테스트 실행\n');

const md = '# 책\n\n## Chapter 1. 가\n\n:::stats\nicon: 👤\nvalue: 1인\nlabel: 운영 인원\n\nvalue: 1~3일\nlabel: 제작 기간\n\nicon: 💰\nvalue: 0원~\nlabel: 초기 비용\n:::\n';
const book = parseBook(md);
const b = book.chapters[0].blocks;
check('파서: stats 블록 1개', b.length === 1 && b[0].type === 'stats');
const items = (b[0] as { items: { icon: string; value: string; label: string }[] }).items;
check('파서: 항목 3개', items.length === 3);
check('파서: key-value 분리', items[0].icon === '👤' && items[0].value === '1인' && items[0].label === '운영 인원');
check('파서: icon 생략 항목', items[1].icon === '' && items[1].value === '1~3일' && items[1].label === '제작 기간');

const comps = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
check('매퍼: StatsCard', comps.some((c) => c.type === 'StatsCard'));

const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: stat 카드 3개', (html.match(/class="stat"/g) || []).length === 3);
check('HTML: 큰 숫자/라벨', html.includes('class="stat-v">1인<') && html.includes('class="stat-l">운영 인원<'));
check('HTML: icon 생략 시 stat-ic 2개만', (html.match(/class="stat-ic"/g) || []).length === 2);
check('HTML: .stat CSS 존재', html.includes('.stat {') || html.includes('.stats {'));

const card: Component = { type: 'StatsCard', items: [{ icon: '⏱', value: '2시간', label: '제작 시간' }] };
check('DOCX: 값(bold)+라벨', componentToXml(card).includes('2시간') && componentToXml(card).includes('제작 시간'));
check('EPUB: stat-v/stat-l', componentToXhtml(card, { media: [] } as never).includes('stat-v') && componentToXhtml(card, { media: [] } as never).includes('2시간'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
