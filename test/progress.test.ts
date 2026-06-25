/**
 * Ebook Publishing System — Progress 테스트 (실매핑 12차)
 *
 * :::progress — `라벨: 퍼센트`. 첫 항목=전체 진행률(굵은 막대), 100%=초록 완료 ✓,
 * 0~100 clamp, 잘못된 값/빈 데이터 안전. HTML/EPUB/DOCX. 실행: npm run test:progress
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

console.log('Progress 블록 테스트 실행\n');

const renderToHtml = (md: string): string =>
  renderHtml(applyLayout(mapComponents(parseBook(md), buildPages(parseBook(md), FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, 'x');

const md =
  '# 책\n\n## Chapter 1. 가\n\n:::progress\n전체 진행률: 78\n기획: 100\n개발: 78\n테스트: 45\n:::\n';
const book = parseBook(md);
const pb = book.chapters[0].blocks[0] as { type: string; items: { label: string; percent: number }[] };
check('파서: progress 4행 + 라벨/퍼센트', pb.type === 'progress' && pb.items.length === 4 && pb.items[0].label === '전체 진행률' && pb.items[0].percent === 78 && pb.items[1].percent === 100);

// clamp + 잘못된 값 무시
const clampMd = '# 책\n\n## Chapter 1. 가\n\n:::progress\n초과: 130\n음수: -20\n퍼센트표기: 60%\n잘못된값: abc\n:::\n';
const cp = parseBook(clampMd).chapters[0].blocks[0] as { items: { label: string; percent: number }[] };
check('파서: clamp(130→100, -20→0) + % 표기 + 잘못된 값 무시', cp.items.length === 3 && cp.items[0].percent === 100 && cp.items[1].percent === 0 && cp.items[2].percent === 60);

// HTML
const html = renderToHtml(md);
check('HTML: pg 구조 + 막대 width', html.includes('class="pg"') && html.includes('class="pg-fill"') && html.includes('width:78%'));
check('HTML: 첫 행=전체 진행률(pg-overall)', html.includes('class="pg-row pg-overall"'));
check('HTML: 100% = 완료 ✓ + 초록 채움', html.includes('완료 ✓') && html.includes('pg-fill pg-fill-done') && html.includes('pg-val pg-done'));
check('HTML: 0~99% = 퍼센트 숫자', html.includes('>45%</span>'));

// EPUB
const card: Component = { type: 'ProgressCard', items: [{ label: '전체', percent: 80 }, { label: '완료항목', percent: 100 }] };
const xhtml = componentToXhtml(card, { media: [] } as never);
check('EPUB: pg + 완료 처리', xhtml.includes('class="pg"') && xhtml.includes('class="pg-fill') && xhtml.includes('완료 ✓'));

// DOCX
const xml = componentToXml(card);
check('DOCX: 텍스트 + 음영(완료/퍼센트)', xml.includes('완료항목 — 완료 ✓') && xml.includes('전체 — 80%') && xml.includes('E6F4EA'));

// 안전: 행 많음(10개) + 빈 데이터
const many = Array.from({ length: 10 }, (_, i) => `항목${i}: ${i * 10}`).join('\n');
const manyMd = `# 책\n\n## Chapter 1. 가\n\n:::progress\n${many}\n:::\n`;
const mp = parseBook(manyMd).chapters[0].blocks[0] as { items: unknown[] };
check('안전: 10행 처리', mp.items.length === 10);
const empty: Component = { type: 'ProgressCard', items: [] };
check('안전: 빈 데이터 렌더 — 빌드 실패 없음', componentToXhtml(empty, { media: [] } as never).includes('class="pg"') && componentToXml(empty) === '');

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
