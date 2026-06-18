/**
 * Ebook Publishing System — Component Mapper 단위 테스트 (v0.1)
 *
 * 외부 프레임워크 없이 Node 기본 기능만 사용 (의존성 0).
 * 실행: npm run test:components  (= node test/components.test.ts)
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { FullBookPDF, ChecklistPDF } from '../src/page-builder/profiles.ts';
import type { ComponentPage } from '../src/types/component.ts';

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
const full = mapComponents(book, buildPages(book, FullBookPDF));
const checklist = mapComponents(book, buildPages(book, ChecklistPDF));

console.log('Component Mapper 단위 테스트 실행\n');

function page(pages: ComponentPage[], type: string): ComponentPage | undefined {
  return pages.find((p) => p.type === type);
}
function hasComp(p: ComponentPage | undefined, type: string): boolean {
  return !!p && p.components.some((c) => c.type === type);
}
function allComps(pages: ComponentPage[]): string[] {
  return pages.flatMap((p) => p.components.map((c) => c.type));
}

// --- CoverPage 메타데이터 컴포넌트 ---
const cover = page(full, 'CoverPage');
check('CoverPage: TitleBlock 생성', hasComp(cover, 'TitleBlock'));
check('CoverPage: SubtitleBlock 생성', hasComp(cover, 'SubtitleBlock'));
check('CoverPage: AuthorBlock 생성', hasComp(cover, 'AuthorBlock'));

// --- ChapterPage 챕터 제목 컴포넌트 ---
const chapterPage = page(full, 'ChapterPage');
check('ChapterPage: 챕터 제목 컴포넌트(ChapterHeading) 생성', hasComp(chapterPage, 'ChapterHeading'));
const heading = chapterPage?.components.find((c) => c.type === 'ChapterHeading');
check(
  'ChapterPage: 챕터 제목이 AST 와 일치',
  !!heading && heading.type === 'ChapterHeading' && heading.title === '블록 검증 챕터' && heading.number === 2,
);

// --- 블록 → 컴포넌트 매핑 (ContentPage 안) ---
const content = page(full, 'ContentPage');
check('ContentPage: paragraph → ParagraphBlock', hasComp(content, 'ParagraphBlock'));
check('ContentPage: table → TableCard', hasComp(content, 'TableCard'));
check('ContentPage: checklist → ChecklistCard', hasComp(content, 'ChecklistCard'));
check('ContentPage: compare → CompareCard', hasComp(content, 'CompareCard'));
check('ContentPage: before-after → BeforeAfterCard', hasComp(content, 'BeforeAfterCard'));
check('ContentPage: prompt → PromptCard', hasComp(content, 'PromptCard'));
check('ContentPage: faq → FAQCard', hasComp(content, 'FAQCard'));
check('ContentPage: warning → WarningCard', hasComp(content, 'WarningCard'));
check('ContentPage: result → ResultCard', hasComp(content, 'ResultCard'));
check('ContentPage: image → ImageBlock', hasComp(content, 'ImageBlock'));

// --- steps → StepsCard 이며 StepsPage 는 없음 ---
check('ContentPage: steps → StepsCard', hasComp(content, 'StepsCard'));
check('StepsPage 미생성', !full.some((p) => p.type === ('StepsPage' as never)));

// --- 데이터 보존 확인 (예: TableCard) ---
const tableCard = content?.components.find((c) => c.type === 'TableCard');
check(
  'TableCard: 컬럼/행 데이터 보존',
  !!tableCard && tableCard.type === 'TableCard' &&
    JSON.stringify(tableCard.columns) === JSON.stringify(['항목', '값', '비고']) &&
    tableCard.rows.length === 2,
);
const imageComp = content?.components.find((c) => c.type === 'ImageBlock');
check(
  'ImageBlock: imageType 보존(cover)',
  !!imageComp && imageComp.type === 'ImageBlock' && imageComp.imageType === 'cover',
);

// --- ChecklistPDF 결과는 ChecklistCard 만 포함 ---
const checklistComps = allComps(checklist);
check(
  'ChecklistPDF: ChecklistCard 만 포함',
  checklistComps.length > 0 && checklistComps.every((t) => t === 'ChecklistCard'),
  `got [${checklistComps.join(', ')}]`,
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
