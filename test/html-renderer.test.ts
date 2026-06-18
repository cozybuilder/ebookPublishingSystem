/**
 * Ebook Publishing System — HTML Renderer 단위 테스트 (v0.1)
 *
 * 외부 프레임워크 없이 Node 기본 기능만 사용 (의존성 0).
 * 실행: npm run test:html  (= node test/html-renderer.test.ts)
 *
 * build:html 산출물을 먼저 만든 뒤(여기서 직접 렌더) 내용을 검증한다.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { FullBookPDF, ChecklistPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const samplePath = resolve(projectRoot, 'samples', 'parser-sample.md');
const fullOut = resolve(projectRoot, 'output', 'book.html');
const checklistOut = resolve(projectRoot, 'output', 'book.checklist.html');

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

const fullHtml = renderHtml(
  applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS),
  DEFAULT_TOKENS,
  book.metadata.title,
);
const checklistHtml = renderHtml(
  applyLayout(mapComponents(book, buildPages(book, ChecklistPDF)), DEFAULT_TOKENS),
  DEFAULT_TOKENS,
  `${book.metadata.title} — 체크리스트`,
);

// 산출물 파일 생성(검증 대상 경로 보장)
mkdirSync(dirname(fullOut), { recursive: true });
writeFileSync(fullOut, fullHtml, 'utf8');
writeFileSync(checklistOut, checklistHtml, 'utf8');

console.log('HTML Renderer 단위 테스트 실행\n');

// --- 파일 생성 ---
const fullFromDisk = readFileSync(fullOut, 'utf8');
check('output/book.html 생성됨', fullFromDisk.length > 0);

// --- 컨텐츠 포함 ---
check('HTML: TitleBlock 내용 포함', fullHtml.includes(book.metadata.title));
check('HTML: ChecklistCard 내용 포함', fullHtml.includes('체크 항목 1') && fullHtml.includes('class="checklist"'));
check('HTML: TableCard 포함', fullHtml.includes('<table>') && fullHtml.includes('항목'));
check('HTML: WarningCard 포함', fullHtml.includes('주의 문구') && fullHtml.includes('tone-emphasis'));
check('HTML: ResultCard 포함', fullHtml.includes('결과 요약 문구'));

// --- 이미지 슬롯 ---
check(
  'HTML: ImageBlock 이 이미지 슬롯 카드로 표시',
  fullHtml.includes('image-slot') && fullHtml.includes('IMAGE SLOT') && fullHtml.includes('IMG-100') && fullHtml.includes('cover'),
);

// --- CSS 색상 토큰 ---
check('CSS: Navy(#1F2D5A) 포함', fullHtml.includes('#1F2D5A'));
check('CSS: Orange(#F5821F) 포함', fullHtml.includes('#F5821F'));
check('CSS: Cyan(#1FB6C9) 포함', fullHtml.includes('#1FB6C9'));

// --- 체크리스트 전용 HTML ---
const checklistFromDisk = readFileSync(checklistOut, 'utf8');
check('output/book.checklist.html 생성됨', checklistFromDisk.length > 0);
check('체크리스트 HTML: checklist 내용 포함', checklistHtml.includes('class="checklist"') && checklistHtml.includes('체크 항목 1'));
check(
  '체크리스트 HTML: checklist 외 카드 라벨 미포함(예: 프롬프트/주의)',
  !checklistHtml.includes('>프롬프트<') && !checklistHtml.includes('>주의<'),
);

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
