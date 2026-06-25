/**
 * Ebook Publishing System — Feature Card 테스트 (실매핑 11차)
 *
 * :::feature — icon/title/desc(key-value) + '- ' 체크리스트(불릿). title 외 모두 선택.
 * 1블록=1카드, chevron 없음. HTML/EPUB/DOCX 전 출력. 실행: npm run test:feature
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

console.log('Feature Card 블록 테스트 실행\n');

const renderToHtml = (md: string): string =>
  renderHtml(applyLayout(mapComponents(parseBook(md), buildPages(parseBook(md), FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, 'x');

// 파서: icon/title/desc + 체크리스트
const md =
  '# 책\n\n## Chapter 1. 가\n\n:::feature\nicon: 🚀\ntitle: 빠른 성능\ndesc: 최적화된 조립 엔진으로 빠른 출력.\n\n- 초고속 렌더링\n- 메모리 최적화\n- 안정성 보장\n:::\n';
const book = parseBook(md);
const fb = book.chapters[0].blocks[0] as { type: string; icon: string; title: string; desc: string; items: string[] };
check('파서: feature + key-value + 체크리스트 3', fb.type === 'feature' && fb.icon === '🚀' && fb.title === '빠른 성능' && fb.desc.includes('빠른 출력') && fb.items.length === 3 && fb.items[0] === '초고속 렌더링');

// 파서: 최소(title 만) — icon/desc/items 모두 선택
const minMd = '# 책\n\n## Chapter 1. 가\n\n:::feature\ntitle: 간편한 시작\n:::\n';
const mb = parseBook(minMd).chapters[0].blocks[0] as { type: string; icon: string; desc: string; items: string[]; title: string };
check('파서: 최소(title 만) 안전', mb.type === 'feature' && mb.title === '간편한 시작' && mb.icon === '' && mb.desc === '' && mb.items.length === 0);

// HTML
const html = renderToHtml(md);
check('HTML: feature 카드 구조', html.includes('class="feat"') && html.includes('class="feat-ic"') && html.includes('class="feat-t"'));
check('HTML: 제목/설명 출력', html.includes('빠른 성능') && html.includes('최적화된 조립 엔진'));
check('HTML: 체크리스트 ul/li 3', html.includes('class="feat-ck"') && (html.match(/<li>/g) || []).length >= 3);
check('HTML: chevron(›) 없음', !html.includes('›'));
const minHtml = renderToHtml(minMd);
check('HTML: 최소 카드 — 아이콘/리스트 생략', minHtml.includes('간편한 시작') && !minHtml.includes('class="feat-ic"') && !minHtml.includes('class="feat-ck"'));

// EPUB
const card: Component = { type: 'FeatureCard', icon: '💡', title: 'T', desc: 'D', items: ['a', 'b'] };
const xhtml = componentToXhtml(card, { media: [] } as never);
check('EPUB: feat 구조 + 체크리스트', xhtml.includes('class="feat"') && xhtml.includes('class="feat-ck"') && xhtml.includes('<li>a</li>'));

// DOCX
const xml = componentToXml(card);
check('DOCX: 아이콘+제목 bold + 체크 항목', xml.includes('💡 T') && xml.includes('✓ a') && xml.includes('<w:b/>'));

// 안전: 빈 items / 빈 icon
const empty: Component = { type: 'FeatureCard', icon: '', title: '제목', desc: '', items: [] };
check('안전: 빈 구성도 제목만 렌더', componentToXhtml(empty, { media: [] } as never).includes('제목') && !componentToXml(empty).includes('✓'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
