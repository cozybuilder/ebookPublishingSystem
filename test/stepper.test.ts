/**
 * Ebook Publishing System — Progress Stepper 테스트 (실매핑 13차)
 *
 * :::stepper — current/desc + '- ' 단계. 3상태(완료✓/현재/예정) + 연결선 분리 + desc 박스.
 * current clamp(1~N), 안전 처리. HTML/EPUB/DOCX. 실행: npm run test:stepper
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

console.log('Progress Stepper 블록 테스트 실행\n');

const renderToHtml = (md: string): string =>
  renderHtml(applyLayout(mapComponents(parseBook(md), buildPages(parseBook(md), FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, 'x');

const md =
  '# 책\n\n## Chapter 1. 가\n\n:::stepper\ncurrent: 2\ndesc: 설계 단계 설명.\n\n- 기획\n- 설계\n- 개발\n- 완료\n:::\n';
const book = parseBook(md);
const sb = book.chapters[0].blocks[0] as { type: string; current: number; desc: string; steps: string[] };
check('파서: stepper current/desc/steps', sb.type === 'stepper' && sb.current === 2 && sb.desc === '설계 단계 설명.' && sb.steps.length === 4 && sb.steps[0] === '기획');

// clamp: 범위 초과 → N, 0이하 → 1, 미지정 → 1
const overMd = '# 책\n\n## Chapter 1. 가\n\n:::stepper\ncurrent: 9\n- 가\n- 나\n- 다\n:::\n';
const ob = parseBook(overMd).chapters[0].blocks[0] as { current: number };
check('파서: current 초과 → N clamp', ob.current === 3);
const zeroMd = '# 책\n\n## Chapter 1. 가\n\n:::stepper\ncurrent: 0\n- 가\n- 나\n:::\n';
check('파서: current 0이하 → 1', (parseBook(zeroMd).chapters[0].blocks[0] as { current: number }).current === 1);
const noCurMd = '# 책\n\n## Chapter 1. 가\n\n:::stepper\n- 가\n- 나\n:::\n';
check('파서: current 미지정 → 1', (parseBook(noCurMd).chapters[0].blocks[0] as { current: number }).current === 1);

// HTML: 3상태 + 연결선 분리 + desc
const html = renderToHtml(md);
check('HTML: 완료(✓)/현재(on)/예정(todo) 3상태', html.includes('class="s done"') && html.includes('class="s on"') && html.includes('class="s todo"') && html.includes('>✓</div>'));
check('HTML: 연결선 완료=파랑(line done) + 미완료(line)', html.includes('class="line done"') && html.includes('class="line"'));
check('HTML: desc 박스 + 자동 제목', html.includes('class="stp-desc"') && html.includes('2단계: 설계') && html.includes('설계 단계 설명.'));
const noDescHtml = renderToHtml(noCurMd);
check('HTML: desc 없으면 박스 생략', !noDescHtml.includes('class="stp-desc"'));

// EPUB
const card: Component = { type: 'StepperCard', current: 2, desc: 'D', steps: ['가', '나', '다'] };
const xhtml = componentToXhtml(card, { media: [] } as never);
check('EPUB: stp 3상태 + desc', xhtml.includes('class="s done"') && xhtml.includes('class="s on"') && xhtml.includes('class="stp-desc"'));

// DOCX
const xml = componentToXml(card);
check('DOCX: 번호 목록 + ✓/◀ 현재 + 음영', xml.includes('1. 가 ✓') && xml.includes('2. 나 ◀ 현재') && xml.includes('3. 다') && xml.includes('EAF1FB'));

// 안전: 다단계(8) + 빈 데이터
const many = Array.from({ length: 8 }, (_, i) => `- 단계${i + 1}`).join('\n');
const manyMd = `# 책\n\n## Chapter 1. 가\n\n:::stepper\ncurrent: 5\n${many}\n:::\n`;
const mb = parseBook(manyMd).chapters[0].blocks[0] as { steps: unknown[]; current: number };
check('안전: 8단계 처리 + current 5', mb.steps.length === 8 && mb.current === 5);
const empty: Component = { type: 'StepperCard', current: 1, desc: '', steps: [] };
check('안전: 빈 데이터 — 빌드 실패 없음', componentToXhtml(empty, { media: [] } as never).includes('class="stp"') && componentToXml(empty) === '');

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
