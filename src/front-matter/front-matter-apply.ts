/**
 * Ebook Publishing System — Front Matter 출력 적용 (v1)
 *
 * 기본 ON. page-builder 가 만든 자동 앞페이지(Cover/Copyright/TOC)를 Front Matter 시스템 산출로
 * 대체하여 중복 없이 표지/판권/목차/저자 소개/면책 + 본문을 구성한다.
 *
 * - withFrontMatterPages: HTML 용(페이지 구조 보존). FM 페이지 + 챕터 본문 페이지.
 * - withFrontMatterComponents: DOCX 용(컴포넌트 흐름). prependFrontMatter(FM, 챕터 본문).
 *
 * canvas/marketing/preview/image-prompts 에는 사용하지 않는다(본문/요약 중심 유지).
 */

import type { Book } from '../types/ast.ts';
import type { Component, ComponentPage } from '../types/component.ts';
import { buildPages } from '../page-builder/page-builder.ts';
import { mapComponents } from '../component-mapper/component-mapper.ts';
import { FullBookPDF } from '../page-builder/profiles.ts';
import { buildFrontMatter, prependFrontMatter } from './front-matter-generator.ts';
import type { FrontMatterOverrides } from './front-matter-types.ts';

/** page-builder 자동 앞페이지(메타 기반) — Front Matter 로 대체되는 대상 */
const AUTO_FRONT_PAGES = new Set(['CoverPage', 'CopyrightPage', 'TableOfContentsPage']);

/** Front Matter 컴포넌트를 페이지로 그룹화(표지/판권/목차/Front-extra) */
function frontMatterPages(book: Book, overrides?: FrontMatterOverrides): ComponentPage[] {
  const fm = buildFrontMatter(book, overrides).components;
  const pick = (types: string[]): Component[] => fm.filter((c) => types.includes(c.type));
  return [
    { type: 'CoverPage', components: pick(['TitleBlock', 'SubtitleBlock', 'AuthorBlock']) },
    { type: 'CopyrightPage', components: pick(['CopyrightNotice']) },
    { type: 'TableOfContentsPage', components: pick(['TableOfContentsList']) },
    { type: 'ContentPage', components: pick(['AuthorBio', 'Disclaimer']) },
  ];
}

/** HTML 용: FM 페이지 + 챕터 본문 페이지(자동 앞페이지 제외). */
export function withFrontMatterPages(book: Book, overrides?: FrontMatterOverrides): ComponentPage[] {
  const bodyPages = buildPages(book, FullBookPDF).filter((p) => !AUTO_FRONT_PAGES.has(p.type));
  const body = mapComponents(book, bodyPages);
  return [...frontMatterPages(book, overrides), ...body];
}

/** DOCX 용: prependFrontMatter(FM 컴포넌트, 챕터 본문 컴포넌트). */
export function withFrontMatterComponents(book: Book, overrides?: FrontMatterOverrides): Component[] {
  const bodyPages = buildPages(book, FullBookPDF).filter((p) => !AUTO_FRONT_PAGES.has(p.type));
  const body = mapComponents(book, bodyPages).flatMap((p) => p.components);
  return prependFrontMatter(buildFrontMatter(book, overrides).components, body);
}
