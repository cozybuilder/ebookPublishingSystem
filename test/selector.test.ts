/**
 * Ebook Publishing System — 범용 Selector 단위 테스트 (v1)
 *
 * 외부 프레임워크 없이 Node 기본 기능만 사용 (의존성 0).
 * 실행: npm run test:selector  (= node test/selector.test.ts)
 */

import { select } from '../src/selector/selector.ts';
import type { SelectorPolicy } from '../src/selector/selector.ts';
import { BOOK_SELECTORS } from '../src/selector/book-selectors.ts';

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

// 간단한 문자열 항목으로 범용 동작 검증
interface Item {
  t: string;
  id: number;
}
const getType = (i: Item) => i.t;
const items: Item[] = [
  { t: 'A', id: 1 },
  { t: 'B', id: 2 },
  { t: 'C', id: 3 },
  { t: 'A', id: 4 },
  { t: 'B', id: 5 },
  { t: 'D', id: 6 },
];

console.log('범용 Selector 단위 테스트 실행\n');

// prefer: B 우선
const r1 = select<Item>(items, getType, { strategy: 'priority', prefer: ['B', 'A'] }, { cap: 2 });
check('prefer 우선(B 먼저 선택)', r1.items.some((i) => i.t === 'B'));
check('cap 준수(2개)', r1.items.length === 2);
check('표시 순서=원고 순서', r1.items[0].id < r1.items[1].id);

// require: D 반드시 포함
const r2 = select<Item>(items, getType, { strategy: 'priority', prefer: ['A'], require: ['D'] }, { cap: 2 });
check('require 포함(D)', r2.items.some((i) => i.t === 'D'));

// avoid: A 제외
const r3 = select<Item>(items, getType, { strategy: 'priority', prefer: ['A', 'B'], avoid: ['A'] }, { cap: 3 });
check('avoid 제외(A 없음)', !r3.items.some((i) => i.t === 'A'));

// maxPerType: A 최대 1
const r4 = select<Item>(items, getType, { strategy: 'priority', prefer: ['A'], maxPerType: { A: 1 } }, { cap: 5 });
check('maxPerType(A 1개)', r4.items.filter((i) => i.t === 'A').length === 1);

// primaryAllow: B/C 만 후보
const r5 = select<Item>(items, getType, { strategy: 'priority', prefer: [] }, { cap: 5, primaryAllow: new Set(['B', 'C']) });
check('primaryAllow 제한(B/C만)', r5.items.every((i) => ['B', 'C'].includes(i.t)));

// fallback: 후보 부족 시 보충
const sparse: Item[] = [{ t: 'X', id: 1 }, { t: 'Y', id: 2 }];
const policyFb: SelectorPolicy = {
  strategy: 'summary',
  prefer: ['Z'], // 없음
  fallback: { minComponents: 2, useFirstAvailable: true },
};
const r6 = select<Item>(sparse, getType, policyFb, { cap: 3, primaryAllow: new Set(['Z']) });
check('fallback=true(후보 부족)', r6.fallback === true);
check('fallback 보충(빈 결과 아님)', r6.items.length >= 1);
check('fallback cap 준수', r6.items.length <= 3);

// fallback 미발동: 충분
const r7 = select<Item>(items, getType, { strategy: 'priority', prefer: ['A', 'B'], fallback: { minComponents: 1 } }, { cap: 3 });
check('fallback=false(충분)', r7.fallback === false);

// require-missing reason
const r8 = select<Item>(
  sparse,
  getType,
  { strategy: 'priority', prefer: [], require: ['Q'], fallback: { minComponents: 2, useFirstAvailable: true } },
  { cap: 3, primaryAllow: new Set(['Q']) },
);
check('require 부재 → reason=require-missing', r8.reason === 'require-missing');

// 결정론
const a = select<Item>(items, getType, { strategy: 'priority', prefer: ['B', 'A'] }, { cap: 3 });
const b = select<Item>(items, getType, { strategy: 'priority', prefer: ['B', 'A'] }, { cap: 3 });
check('결정론(동일 입력 동일 출력)', JSON.stringify(a.items.map((i) => i.id)) === JSON.stringify(b.items.map((i) => i.id)));

// BookSelectorProfile 구조 존재
check('Book selector 4종 등록(summary/workflow/marketing/reading)', ['summary', 'workflow', 'marketing', 'reading'].every((k) => !!BOOK_SELECTORS[k]));
check('Book selector 는 SelectorPolicy 형태', typeof BOOK_SELECTORS.summary.strategy === 'string' && Array.isArray(BOOK_SELECTORS.summary.prefer));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
