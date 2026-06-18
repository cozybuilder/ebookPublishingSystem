/**
 * Ebook Publishing System — Page Builder 단위 테스트 (v0.1)
 *
 * 외부 프레임워크 없이 Node 기본 기능만 사용한다 (의존성 0).
 * 실행: npm run test:pages  (= node test/pages.test.ts)
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { FullBookPDF, ChecklistPDF } from '../src/page-builder/profiles.ts';

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

const book = parseBook(readFileSync(samplePath, 'utf8'));

console.log('Page Builder 단위 테스트 실행\n');

// ===== FullBookPDF =====
const full = buildPages(book, FullBookPDF);
const types = full.map((p) => p.type);

check('FullBookPDF: CoverPage 생성', types.includes('CoverPage'));
check('FullBookPDF: CopyrightPage 생성', types.includes('CopyrightPage'));
check('FullBookPDF: TableOfContentsPage 생성', types.includes('TableOfContentsPage'));
check('FullBookPDF: ChapterPage 생성', types.includes('ChapterPage'));
check('FullBookPDF: ContentPage 생성', types.includes('ContentPage'));

// StepsPage 는 만들지 않는다 (steps 는 ContentPage 안에 남음)
check('FullBookPDF: StepsPage 미생성', !types.includes('StepsPage' as never));

// 순서: Cover → Copyright → TOC 가 앞부분에 순서대로
check(
  'FullBookPDF: 앞부분 순서 Cover→Copyright→TOC',
  types[0] === 'CoverPage' && types[1] === 'CopyrightPage' && types[2] === 'TableOfContentsPage',
  `got [${types.slice(0, 3).join(', ')}]`,
);

// ContentPage 가 steps 블록 참조를 포함하는지 (steps 가 별도 페이지로 빠지지 않음)
const contentPage = full.find((p) => p.type === 'ContentPage');
const stepsBlockIndex = book.chapters[0].blocks.findIndex((b) => b.type === 'steps');
check(
  'FullBookPDF: steps 블록이 ContentPage 참조에 포함',
  !!contentPage && contentPage.blockRefs.some((r) => r.blockIndex === stepsBlockIndex),
);

// ===== Page 가 Block 을 복사하지 않고 참조만 유지 =====
const refKeys = contentPage ? Object.keys(contentPage.blockRefs[0] ?? {}).sort() : [];
check(
  'Page: blockRef 는 {chapterIndex, blockIndex} 참조만 (내용 복사 없음)',
  JSON.stringify(refKeys) === JSON.stringify(['blockIndex', 'chapterIndex']),
  `got keys [${refKeys.join(', ')}]`,
);
// Page 객체에 block 내용 필드(items/text/columns 등)가 직접 들어있지 않은지
const pageHasNoBlockContent = full.every((p) => {
  const keys = Object.keys(p);
  return keys.every((k) => ['type', 'chapterIndex', 'blockRefs'].includes(k));
});
check('Page: Page 객체에 Block 내용 필드 미포함', pageHasNoBlockContent);

// 참조가 실제 AST 블록을 가리키는지(역참조 검증)
const refResolves =
  !!contentPage &&
  contentPage.blockRefs.every((r) => {
    const ch = book.chapters[r.chapterIndex];
    return !!ch && !!ch.blocks[r.blockIndex];
  });
check('Page: blockRef 가 실제 AST 블록으로 역참조됨', refResolves);

// ===== ChecklistPDF =====
const checklistPages = buildPages(book, ChecklistPDF);
check('ChecklistPDF: 페이지 모두 ChecklistPage', checklistPages.length > 0 && checklistPages.every((p) => p.type === 'ChecklistPage'));

const allRefsAreChecklist = checklistPages.every((p) =>
  p.blockRefs.every((r) => book.chapters[r.chapterIndex]?.blocks[r.blockIndex]?.type === 'checklist'),
);
check('ChecklistPDF: 참조 블록이 전부 checklist 타입', allRefsAreChecklist);

const checklistCountInAst = book.chapters.reduce(
  (n, c) => n + c.blocks.filter((b) => b.type === 'checklist').length,
  0,
);
check(
  'ChecklistPDF: checklist 블록 개수와 페이지 수 일치',
  checklistPages.length === checklistCountInAst,
  `pages=${checklistPages.length}, checklist=${checklistCountInAst}`,
);
check('ChecklistPDF: 원본 챕터 정보(chapterIndex) 유지', checklistPages.every((p) => typeof p.chapterIndex === 'number'));

// ===== 요약 =====
console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
