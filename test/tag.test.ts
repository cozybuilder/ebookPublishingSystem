/**
 * Ebook Publishing System — Tag 인라인 태그 테스트 (실매핑 4차)
 *
 * [[tag:라벨]] → 단락 내부 태그 칩. ParagraphBlock 한정, Highlight 와 공존, 회귀 0. 실행: npm run test:tag
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

console.log('Tag 인라인 테스트 실행\n');

const book = parseBook('# 책\n\n## Chapter 1. 가\n\n주제 [[tag:디자인]] [[tag:AI 영상]] [[tag:초보자]]\n');
const html = renderHtml(applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), DEFAULT_TOKENS), DEFAULT_TOKENS, '책');
check('HTML: 태그 칩 3개', (html.match(/<span class="tag-inline">/g) || []).length === 3);
check('HTML: 라벨 보존(AI 영상 등)', html.includes('>디자인</span>') && html.includes('>AI 영상</span>') && html.includes('>초보자</span>'));
check('HTML: .tag-inline CSS 존재', html.includes('.tag-inline {'));

// 공존: ==강조== + [[tag:..]]
const both: Component = { type: 'ParagraphBlock', text: '이건 ==중요== [[tag:핵심]]' };
const layoutBoth = applyLayout([{ type: 'ContentPage', components: [both] }], DEFAULT_TOKENS);
const htmlBoth = renderHtml(layoutBoth, DEFAULT_TOKENS, 'x');
check('공존: mark + tag 동시', htmlBoth.includes('<mark class="hl">중요</mark>') && htmlBoth.includes('<span class="tag-inline">핵심</span>'));

// DOCX / EPUB
const para: Component = { type: 'ParagraphBlock', text: '주제 [[tag:디자인]]' };
const dx = componentToXml(para);
check('DOCX: 태그 런(색+음영) + 라벨', dx.includes('w:color w:val="2563EB"') && dx.includes('EFF6FF') && dx.includes('디자인'));
const ex = componentToXhtml(para, { media: [] } as never);
check('EPUB: tag-inline span', ex.includes('<span class="tag-inline">디자인</span>'));

// 회귀: 태그 없는 단락 변화 없음
const plain: Component = { type: 'ParagraphBlock', text: '태그 없는 일반 문장.' };
check('회귀: 일반 단락 변화 없음', !componentToXml(plain).includes('2563EB') && !componentToXhtml(plain, { media: [] } as never).includes('tag-inline'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
