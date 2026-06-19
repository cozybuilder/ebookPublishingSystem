/**
 * Ebook Publishing System — 파서 단위 테스트 (v0.1)
 *
 * 외부 테스트 프레임워크 없이 Node 기본 기능만 사용한다 (의존성 0 원칙).
 * 실행: npm run test:parser  (= node test/parser.test.ts)
 *
 * 검증 대상:
 *  - 11종 블록이 올바른 type 으로 변환되는가
 *  - 표준 Markdown 표 → table 블록
 *  - image 입력 키 type → AST imageType 저장
 *  - 블록 순서가 원고 순서대로 유지되는가
 *  - 챕터 번호/제목 분리
 *  - (검증 기준) 파이프 포함 일반 문장이 표로 오인되지 않는가
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import type { Block } from '../src/types/ast.ts';

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

const md = readFileSync(samplePath, 'utf8');
const book = parseBook(md);

console.log('파서 단위 테스트 실행\n');

// --- 메타데이터 ---
check('메타데이터: title', book.metadata.title === '파서 검증용 통합 샘플', `got "${book.metadata.title}"`);
check('메타데이터: subtitle', book.metadata.subtitle === '11종 블록 + 표 오인 케이스 검증');
check('메타데이터: author', book.metadata.author === 'CozyBuilder Lab');

// --- 챕터 번호/제목 분리 ---
check('챕터 개수 = 1', book.chapters.length === 1, `got ${book.chapters.length}`);
const ch = book.chapters[0];
check('챕터 번호 = 2', ch?.number === 2, `got ${ch?.number}`);
check('챕터 제목 = "블록 검증 챕터"', ch?.title === '블록 검증 챕터', `got "${ch?.title}"`);

const blocks: Block[] = ch?.blocks ?? [];

// --- 블록 순서 (원고 순서대로 유지되는가) ---
const expectedOrder = [
  'paragraph', // 본문
  'quote', // 인용문(여러 줄 → 하나)
  'table',
  'checklist',
  'compare',
  'before-after',
  'prompt',
  'steps',
  'faq',
  'warning',
  'result',
  'image',
  'paragraph', // 표 오인 방지 케이스 (파이프 포함 일반 문장)
];
const actualOrder = blocks.map((b) => b.type);
check(
  '블록 순서가 원고 순서대로 유지',
  JSON.stringify(actualOrder) === JSON.stringify(expectedOrder),
  `got [${actualOrder.join(', ')}]`,
);

// --- 11종 블록 type 검증 ---
function findOne<T extends Block['type']>(t: T) {
  return blocks.find((b) => b.type === t);
}
for (const t of ['paragraph', 'quote', 'table', 'checklist', 'compare', 'before-after', 'prompt', 'steps', 'faq', 'warning', 'result', 'image'] as const) {
  check(`블록 존재: ${t}`, findOne(t) !== undefined);
}

// --- quote: 여러 줄 blockquote 가 하나로 묶이고 '>' 제거 ---
const quote = findOne('quote');
if (quote && quote.type === 'quote') {
  check('quote: 여러 줄 → 하나로 병합', quote.text === '인용문 첫 줄입니다. 인용문 둘째 줄입니다.', `got "${quote.text}"`);
  check("quote: '>' 기호 제거됨", !quote.text.includes('>'));
} else {
  check('quote: 블록 확보', false, 'quote 블록 없음');
}

// --- table: 표준 Markdown 표가 table 블록으로 인식 ---
const table = findOne('table');
if (table && table.type === 'table') {
  check('table: 헤더 컬럼', JSON.stringify(table.columns) === JSON.stringify(['항목', '값', '비고']));
  check('table: 데이터 행 수 = 2 (구분선 제외)', table.rows.length === 2, `got ${table.rows.length}`);
  check('table: 첫 데이터 행', JSON.stringify(table.rows[0]) === JSON.stringify(['A', '1', '가']));
} else {
  check('table: 블록 확보', false, 'table 블록 없음');
}

// --- image: 입력 type → imageType 저장 ---
const image = findOne('image');
if (image && image.type === 'image') {
  check('image: imageType = "cover"', image.imageType === 'cover', `got "${image.imageType}"`);
  check('image: id = "IMG-100"', image.id === 'IMG-100');
  check('image: AST에 raw "type" 입력키 누출 없음 (type은 판별자 image)', image.type === 'image');
} else {
  check('image: 블록 확보', false, 'image 블록 없음');
}

// --- 내부 형식 상세 ---
const compare = findOne('compare');
if (compare && compare.type === 'compare') {
  check('compare: columns', JSON.stringify(compare.columns) === JSON.stringify(['대상', '점수']));
  check('compare: rows 수 = 2', compare.rows.length === 2);
}
const faq = findOne('faq');
if (faq && faq.type === 'faq') {
  check('faq: pair 수 = 2', faq.pairs.length === 2, `got ${faq.pairs.length}`);
  check('faq: 첫 q/a', faq.pairs[0]?.q === '질문 1' && faq.pairs[0]?.a === '답변 1');
}
const prompt = findOne('prompt');
if (prompt && prompt.type === 'prompt') {
  check('prompt: 여러 줄 보존', prompt.text.includes('\n'));
}
const beforeAfter = findOne('before-after');
if (beforeAfter && beforeAfter.type === 'before-after') {
  check('before-after: before/after', beforeAfter.before === '이전 상태' && beforeAfter.after === '이후 상태');
}

// --- 표 오인 방지: 마지막 블록은 paragraph 여야 한다 ---
const last = blocks[blocks.length - 1];
check(
  '표 오인 방지: 파이프 포함 문장이 paragraph로 유지',
  last?.type === 'paragraph',
  `got ${last?.type}`,
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
