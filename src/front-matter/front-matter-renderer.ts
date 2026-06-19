/**
 * Ebook Publishing System — Front Matter 매니페스트 직렬화 (순수)
 *
 * FrontMatterDoc → JSON / Markdown(미리보기). 검수/EPUB 연계용 구조 노출.
 */

import type { FrontMatterDoc } from './front-matter-types.ts';

export function renderFrontMatterJson(doc: FrontMatterDoc): string {
  return JSON.stringify({ meta: doc.meta, toc: doc.toc, componentTypes: doc.components.map((c) => c.type) }, null, 2) + '\n';
}

export function renderFrontMatterMarkdown(doc: FrontMatterDoc): string {
  const m = doc.meta;
  const lines: string[] = [];
  lines.push(`# Front Matter — ${m.title}`);
  lines.push('');
  lines.push(`- 부제: ${m.subtitle ?? '(없음)'}`);
  lines.push(`- 저자: ${m.author}`);
  lines.push(`- 발행: ${m.publisher} / 브랜드: ${m.brand} / ${m.year}`);
  lines.push('');
  lines.push('## 목차');
  if (doc.toc.length === 0) lines.push('- (챕터 없음)');
  for (const t of doc.toc) lines.push(`- ${t.number}. ${t.title}`);
  lines.push('');
  lines.push('## 저자 소개');
  lines.push(m.authorBio);
  lines.push('');
  lines.push('## 면책 조항');
  lines.push(m.disclaimer);
  lines.push('');
  lines.push(`> Front Matter 컴포넌트(${doc.components.length}개): ${doc.components.map((c) => c.type).join(' → ')}`);
  lines.push('');
  return lines.join('\n');
}
