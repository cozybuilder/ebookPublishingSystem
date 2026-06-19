/**
 * Ebook Publishing System — Front Matter 테스트 (v1)
 *
 * in-memory(파일 미기록). 실행: npm run test:front-matter
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { renderDocx, componentToXml } from '../src/docx/docx-renderer.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
import {
  buildFrontMatter,
  resolveFrontMatterMeta,
  prependFrontMatter,
  DEFAULT_DISCLAIMER,
  DEFAULT_AUTHOR_BIO,
} from '../src/front-matter/front-matter-generator.ts';
import { renderFrontMatterJson, renderFrontMatterMarkdown } from '../src/front-matter/front-matter-renderer.ts';
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

console.log('Front Matter 테스트 실행\n');

const book = parseBook('# 내 책\n\nsubtitle: 부제\nauthor: 홍길동\n\n## Chapter 1. 가\n\n본문1\n\n## Chapter 2. 나\n\n본문2');

// ===== 메타 해석 =====
const meta = resolveFrontMatterMeta(book, { year: 2030 });
check('title: H1 추출', meta.title === '내 책');
check('author: 원고 값', meta.author === '홍길동');
check('publisher/brand 기본값', meta.publisher === 'CozyBuilder Lab' && meta.brand === 'CozyBuilder Lab');
check('year: override', meta.year === 2030);
check('disclaimer/authorBio 기본값', meta.disclaimer === DEFAULT_DISCLAIMER && meta.authorBio === DEFAULT_AUTHOR_BIO);

// 기본값 fallback(빈 메타)
const bareMeta = resolveFrontMatterMeta(parseBook('본문만'), { year: 2026 });
check('title 기본 Untitled Ebook', bareMeta.title === 'Untitled Ebook');
check('author 기본 CozyBuilder', bareMeta.author === 'CozyBuilder');

// ===== Front Matter 컴포넌트 =====
const doc = buildFrontMatter(book, { year: 2030 });
const types = doc.components.map((c) => c.type);
check('컴포넌트 순서: 표지→판권→목차→저자소개→면책', JSON.stringify(types) === JSON.stringify(['TitleBlock', 'SubtitleBlock', 'AuthorBlock', 'CopyrightNotice', 'TableOfContentsList', 'AuthorBio', 'Disclaimer']));
check('판권: 저자/발행/연도 포함', doc.components.some((c) => c.type === 'CopyrightNotice' && c.text.includes('홍길동') && c.text.includes('2030')));
check('TOC: 2장', doc.toc.length === 2 && doc.toc[0].title === '가' && doc.toc[1].title === '나');
check('AuthorBio/Disclaimer heading', doc.components.some((c) => c.type === 'AuthorBio' && c.heading === '저자 소개') && doc.components.some((c) => c.type === 'Disclaimer' && c.heading === '면책 조항'));

// ===== prepend (본문 앞 삽입, 순서 보존) =====
const body = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
const combined = prependFrontMatter(doc.components, body);
check('prepend: 앞쪽이 Front Matter', combined[0].type === 'TitleBlock' && combined[doc.components.length - 1].type === 'Disclaimer');
check('prepend: 본문 순서 유지', JSON.stringify(combined.slice(doc.components.length).map((c) => c.type)) === JSON.stringify(body.map((c) => c.type)));
check('prepend: 길이 = FM + 본문', combined.length === doc.components.length + body.length);

// ===== 빈 원고 fallback =====
const emptyDoc = buildFrontMatter(parseBook('본문만 있는 글'), { year: 2026 });
check('빈 원고: Front Matter 생성(TOC 0)', emptyDoc.components.length === 6 && emptyDoc.toc.length === 0);

// ===== 신규 컴포넌트 렌더 무회귀(HTML/DOCX) =====
const authorBio: Component = { type: 'AuthorBio', heading: '저자 소개', text: '소개 텍스트' };
const disclaimer: Component = { type: 'Disclaimer', heading: '면책 조항', text: '면책 텍스트' };
check('DOCX: AuthorBio Heading2 + 본문', componentToXml(authorBio).includes('Heading2') && componentToXml(authorBio).includes('소개 텍스트'));
check('DOCX: Disclaimer Heading2 + Caption', componentToXml(disclaimer).includes('Heading2') && componentToXml(disclaimer).includes('Caption'));
const layout = applyLayout([{ type: 'ContentPage', components: [authorBio, disclaimer] }], DEFAULT_TOKENS);
const html = renderHtml(layout, DEFAULT_TOKENS, 'fm');
check('HTML: AuthorBio/Disclaimer 렌더', html.includes('저자 소개') && html.includes('소개 텍스트') && html.includes('면책 조항'));
const docx = renderDocx([authorBio, disclaimer], 'fm');
check('DOCX 렌더: PK 시그니처', docx[0] === 0x50 && docx[1] === 0x4b);

// ===== 매니페스트 직렬화 =====
const j = JSON.parse(renderFrontMatterJson(doc));
check('JSON: meta/toc/componentTypes', j.meta.title === '내 책' && Array.isArray(j.toc) && j.componentTypes.length === 7);
check('MD: 목차/저자소개/면책 포함', renderFrontMatterMarkdown(doc).includes('## 목차') && renderFrontMatterMarkdown(doc).includes('## 저자 소개') && renderFrontMatterMarkdown(doc).includes('## 면책 조항'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
