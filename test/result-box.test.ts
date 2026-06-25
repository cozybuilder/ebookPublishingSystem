/**
 * Ebook Publishing System — Result Box 변형 테스트 (실매핑 10차)
 *
 * :::result variant: success|info|warning|error — 기존 :::result 는 그대로,
 * variant 선언 시에만 색/라벨 분기. HTML/EPUB/DOCX 전 출력. 실행: npm run test:result
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

console.log('Result Box 변형 테스트 실행\n');

const renderToHtml = (md: string): string =>
  renderHtml(applyLayout(mapComponents(parseBook(md), buildPages(parseBook(md), FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, 'x');

// 파서: variant 선언 인식
const sMd = '# 책\n\n## Chapter 1. 가\n\n:::result\nvariant: success\n해냈습니다.\n:::\n';
const sBook = parseBook(sMd);
const sBlk = sBook.chapters[0].blocks[0] as { type: string; variant?: string; text: string };
check('파서: variant: success 인식', sBlk.type === 'result' && sBlk.variant === 'success' && sBlk.text === '해냈습니다.');

// 파서: 잘못된 variant 는 무시(기본 처리), 텍스트 보존
const badMd = '# 책\n\n## Chapter 1. 가\n\n:::result\nvariant: purple\n본문.\n:::\n';
const badBlk = parseBook(badMd).chapters[0].blocks[0] as { variant?: string; text: string };
check('파서: 미지원 variant 는 무시 + 텍스트 보존', badBlk.variant === undefined && badBlk.text.includes('본문.'));

// HTML: 4종 variant 데이터 속성 + 라벨
const sHtml = renderToHtml(sMd);
check('HTML: data-variant=success + 라벨 성공', sHtml.includes('data-variant="success"') && sHtml.includes('>성공</div>'));
const eHtml = renderToHtml('# 책\n\n## Chapter 1. 가\n\n:::result\nvariant: error\n실패했습니다.\n:::\n');
check('HTML: error 색/라벨', eHtml.includes('data-variant="error"') && eHtml.includes('>오류</div>') && eHtml.includes('#EF4444'));

// EPUB: variant 클래스 + 라벨
const wCard: Component = { type: 'ResultCard', text: 't', variant: 'warning' };
const wXhtml = componentToXhtml(wCard, { media: [] } as never);
check('EPUB: result-warning 클래스 + 라벨', wXhtml.includes('box result result-warning') && wXhtml.includes('<strong>주의</strong>'));

// DOCX: variant 라벨 + 음영
const iCard: Component = { type: 'ResultCard', text: 't', variant: 'info' };
const iXml = componentToXml(iCard);
check('DOCX: info 라벨 + 음영', iXml.includes('정보:') && iXml.includes('EFF6FF'));

// 회귀: variant 없는 :::result 는 기존 동작(핵심 결과/파랑 ★) 유지
const plainMd = '# 책\n\n## Chapter 1. 가\n\n:::result\n중요한 한 문장.\n:::\n';
const plainHtml = renderToHtml(plainMd);
const plainBlk = parseBook(plainMd).chapters[0].blocks[0] as { variant?: string; text: string };
check('회귀: 기본 result 텍스트 보존', plainBlk.variant === undefined && plainBlk.text === '중요한 한 문장.');
check('회귀: 기본 result 라벨(핵심 결과) 유지', plainHtml.includes('>핵심 결과</div>') && !plainHtml.includes('data-type="ResultCard" data-variant='));
const plainCard: Component = { type: 'ResultCard', text: 't' };
check('회귀: 기본 DOCX 라벨/음영 유지', componentToXml(plainCard).includes('핵심 결과:') && componentToXml(plainCard).includes('EAF2FB'));
check('회귀: 기본 EPUB 클래스(box result) 유지', componentToXhtml(plainCard, { media: [] } as never).includes('box result"') === true);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
