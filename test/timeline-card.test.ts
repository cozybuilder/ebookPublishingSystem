/**
 * Ebook Publishing System — Timeline Card 테스트 (실매핑 14차)
 *
 * :::timeline-card (DS 04/04 #42) — date(선택)/title(필수)/desc(선택), 빈 줄 구분.
 * 수직선 + 포인트 + 카드형 항목. 기존 :::timeline(6차)과 공존. 실행: npm run test:timeline-card
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

console.log('Timeline Card 블록 테스트 실행\n');

const renderToHtml = (md: string): string =>
  renderHtml(applyLayout(mapComponents(parseBook(md), buildPages(parseBook(md), FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, 'x');

const md =
  '# 책\n\n## Chapter 1. 가\n\n:::timeline-card\ndate: 2024-05-01 09:00\ntitle: 주문 접수\ndesc: 고객 주문이 접수되었습니다.\n\ndate: 2024-05-01 14:30\ntitle: 결제 완료\ndesc: 결제가 완료되었습니다.\n\ntitle: 배송 시작\ndesc: 날짜를 생략한 항목입니다.\n:::\n';
const book = parseBook(md);
const tb = book.chapters[0].blocks[0] as { type: string; items: { date: string; title: string; desc: string }[] };
check('파서: timeline-card 3항목 + date/title/desc', tb.type === 'timeline-card' && tb.items.length === 3 && tb.items[0].date === '2024-05-01 09:00' && tb.items[0].title === '주문 접수');
check('파서: date 선택(3번째 항목 date 빈값)', tb.items[2].date === '' && tb.items[2].title === '배송 시작');

// title 없는 항목은 무시(안전)
const noTitleMd = '# 책\n\n## Chapter 1. 가\n\n:::timeline-card\ndate: 2024-01-01\ndesc: 제목 없는 항목\n\ntitle: 정상\n:::\n';
const nt = parseBook(noTitleMd).chapters[0].blocks[0] as { items: unknown[] };
check('파서: title 없는 항목 무시', nt.items.length === 1);

// 기존 6차 :::timeline 공존 확인
const coexistMd = '# 책\n\n## Chapter 1. 가\n\n:::timeline\n2024-05\n시작\n첫 영상 완성\n:::\n';
const co = parseBook(coexistMd).chapters[0].blocks[0] as { type: string };
check('공존: 기존 :::timeline 은 그대로 timeline 타입', co.type === 'timeline');

// HTML
const html = renderToHtml(md);
check('HTML: tlc 구조 + 카드 + 날짜/제목/설명', html.includes('class="tlc"') && html.includes('class="ca"') && html.includes('class="dt"') && html.includes('class="ti"'));
check('HTML: 날짜 없는 항목은 dt 없이 제목만', html.includes('>배송 시작</div>'));
check('HTML: 기존 timeline CSS(.timeline)와 구분(.tlc 사용)', html.includes('class="tlc"'));

// EPUB
const card: Component = { type: 'TimelineCardList', items: [{ date: 'D', title: 'T', desc: 'X' }, { date: '', title: 'T2', desc: '' }] };
const xhtml = componentToXhtml(card, { media: [] } as never);
check('EPUB: tlc 카드 항목', xhtml.includes('class="tlc"') && xhtml.includes('class="ca"') && xhtml.includes('class="ti"'));

// DOCX
const xml = componentToXml(card);
check('DOCX: 날짜 caption + 제목 bold + 설명', xml.includes('Caption') && xml.includes('<w:b/>') && xml.includes('T2'));

// 안전: 다항목(20) + 빈 데이터
const many = Array.from({ length: 20 }, (_, i) => `title: 항목${i + 1}`).join('\n\n');
const manyMd = `# 책\n\n## Chapter 1. 가\n\n:::timeline-card\n${many}\n:::\n`;
const mb = parseBook(manyMd).chapters[0].blocks[0] as { items: unknown[] };
check('안전: 20항목 처리', mb.items.length === 20);
const empty: Component = { type: 'TimelineCardList', items: [] };
check('안전: 빈 데이터 — 빌드 실패 없음', componentToXhtml(empty, { media: [] } as never).includes('class="tlc"') && componentToXml(empty) === '');

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
