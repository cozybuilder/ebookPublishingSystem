/**
 * Ebook Publishing System — Front Matter 출력 적용 테스트 (v1)
 *
 * in-memory(파일 미기록). 실행: npm run test:front-matter-apply
 */

import { parseBook } from '../src/parser/parser.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { renderDocumentXml } from '../src/docx/docx-renderer.ts';
import { withFrontMatterPages, withFrontMatterComponents } from '../src/front-matter/front-matter-apply.ts';
import { previewComponents } from '../src/preview-components.ts';
import { KmongPreviewPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';

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

console.log('Front Matter 출력 적용 테스트 실행\n');

const book = parseBook('# 책제목\n\nauthor: 저자\n\n## Chapter 1. 첫장\n\n본문가나다\n\n:::result\n결과요약\n:::');

// ===== HTML 적용 =====
const pages = withFrontMatterPages(book);
const pageTypes = pages.map((p) => p.type);
check('HTML: FM 페이지가 앞(Cover→Copyright→TOC→Content(FM extras))', pageTypes[0] === 'CoverPage' && pageTypes[1] === 'CopyrightPage' && pageTypes[2] === 'TableOfContentsPage');
check('HTML: 본문(ChapterPage)이 FM 뒤', pageTypes.includes('ChapterPage') && pageTypes.indexOf('ChapterPage') > pageTypes.indexOf('TableOfContentsPage'));
// 자동 앞페이지 중복 없음: CoverPage 1개만
check('HTML: CoverPage 중복 없음(1개)', pageTypes.filter((t) => t === 'CoverPage').length === 1);
check('HTML: CopyrightPage/TOCPage 1개씩', pageTypes.filter((t) => t === 'CopyrightPage').length === 1 && pageTypes.filter((t) => t === 'TableOfContentsPage').length === 1);

const html = renderHtml(applyLayout(pages, DEFAULT_TOKENS), DEFAULT_TOKENS, 'book');
for (const s of ['책제목', 'All rights reserved', '저자 소개', '면책 조항', '첫장', '본문가나다']) {
  check(`HTML: "${s}" 포함`, html.includes(s));
}
check('HTML: 표지(제목)가 면책보다 앞', html.indexOf('책제목') < html.indexOf('면책 조항'));
check('HTML: 면책이 본문(본문가나다)보다 앞', html.indexOf('면책 조항') < html.indexOf('본문가나다'));

// ===== DOCX 적용 =====
const comps = withFrontMatterComponents(book);
const ctypes = comps.map((c) => c.type);
check('DOCX: 첫 컴포넌트 TitleBlock', ctypes[0] === 'TitleBlock');
check('DOCX: FM 순서 포함', ['TitleBlock', 'AuthorBlock', 'CopyrightNotice', 'TableOfContentsList', 'AuthorBio', 'Disclaimer'].every((t) => ctypes.includes(t)));
check('DOCX: 본문(ChapterHeading/ResultCard)이 FM 뒤', ctypes.indexOf('ChapterHeading') > ctypes.indexOf('Disclaimer'));
check('DOCX: 표지/판권/목차 중복 없음', ctypes.filter((t) => t === 'TitleBlock').length === 1 && ctypes.filter((t) => t === 'CopyrightNotice').length === 1 && ctypes.filter((t) => t === 'TableOfContentsList').length === 1);
const docXml = renderDocumentXml(comps);
check('DOCX XML: 저자 소개/면책 포함', docXml.includes('저자 소개') && docXml.includes('면책 조항'));
check('DOCX XML: 본문 포함', docXml.includes('본문가나다') && docXml.includes('결과요약'));

// ===== preview/marketing 미적용 =====
const prev = previewComponents(book, KmongPreviewPDF);
check('preview: Front Matter(AuthorBio/Disclaimer) 미포함', !prev.some((c) => c.type === 'AuthorBio' || c.type === 'Disclaimer'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
