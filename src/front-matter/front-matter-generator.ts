/**
 * Ebook Publishing System — Front Matter 생성기 (v1)
 *
 * Book 메타데이터(+기본값)로 표지/판권/목차/저자 소개/면책 컴포넌트를 만들고,
 * 본문 컴포넌트 앞에 prepend 한다. 기존 Component 최대 재사용 + 최소 신규(AuthorBio/Disclaimer).
 * 순수 함수(메타 해석/컴포넌트 조립). 기본 on, 추후 옵션화 가능한 구조.
 */

import type { Book } from '../types/ast.ts';
import type { Component } from '../types/component.ts';
import type { FrontMatterDoc, FrontMatterMeta, FrontMatterOverrides, TocEntry } from './front-matter-types.ts';

export const DEFAULT_DISCLAIMER =
  '본 전자책의 내용은 정보 제공을 목적으로 하며, 적용 결과에 대한 책임은 독자 본인에게 있습니다. ' +
  '무단 복제·배포를 금합니다.';

export const DEFAULT_AUTHOR_BIO =
  'CozyBuilder Lab은 읽히는 전자책을 상품처럼 만드는 출판 시스템을 연구합니다.';

/** Book + override → 기본값이 채워진 FrontMatterMeta */
export function resolveFrontMatterMeta(book: Book, overrides: FrontMatterOverrides = {}): FrontMatterMeta {
  const title = overrides.title ?? (book.metadata.title?.trim() ? book.metadata.title : 'Untitled Ebook');
  return {
    title,
    subtitle: overrides.subtitle ?? book.metadata.subtitle,
    author: overrides.author ?? book.metadata.author ?? 'CozyBuilder',
    publisher: overrides.publisher ?? 'CozyBuilder Lab',
    brand: overrides.brand ?? 'CozyBuilder Lab',
    year: overrides.year ?? new Date().getFullYear(),
    description: overrides.description ?? book.metadata.subtitle,
    disclaimer: overrides.disclaimer ?? DEFAULT_DISCLAIMER,
    authorBio: overrides.authorBio ?? DEFAULT_AUTHOR_BIO,
    coverImage: overrides.coverImage,
  };
}

function tocOf(book: Book): TocEntry[] {
  return book.chapters.map((c) => ({ number: c.number, title: c.title }));
}

/** 메타 → Front Matter 컴포넌트 시퀀스(표지 → 판권 → 목차 → 저자 소개 → 면책) */
export function frontMatterComponents(meta: FrontMatterMeta, toc: TocEntry[]): Component[] {
  const components: Component[] = [];

  // 0) 표지 이미지(있을 때만) — 표지 면 맨 앞. 없으면 기존 텍스트 표지 그대로(무회귀).
  if (meta.coverImage) {
    components.push({ type: 'CoverImage', src: meta.coverImage, alt: meta.title });
  }

  // 1) 표지
  components.push({ type: 'TitleBlock', text: meta.title });
  if (meta.subtitle) components.push({ type: 'SubtitleBlock', text: meta.subtitle });
  components.push({ type: 'AuthorBlock', text: meta.author });

  // 2) 판권
  const copyright =
    `《${meta.title}》\n` +
    `저자 ${meta.author} · 발행 ${meta.publisher}\n` +
    `© ${meta.year} ${meta.brand}. All rights reserved.`;
  components.push({ type: 'CopyrightNotice', text: copyright });

  // 3) 목차
  components.push({ type: 'TableOfContentsList', entries: toc });

  // 4) 저자 소개
  components.push({ type: 'AuthorBio', heading: '저자 소개', text: meta.authorBio });

  // 5) 면책 조항
  components.push({ type: 'Disclaimer', heading: '면책 조항', text: meta.disclaimer });

  return components;
}

/** Book(+override) → FrontMatterDoc */
export function buildFrontMatter(book: Book, overrides: FrontMatterOverrides = {}): FrontMatterDoc {
  const meta = resolveFrontMatterMeta(book, overrides);
  const toc = tocOf(book);
  return { meta, toc, components: frontMatterComponents(meta, toc) };
}

/** Front Matter 컴포넌트를 본문 컴포넌트 앞에 prepend(본문 순서 보존). */
export function prependFrontMatter(frontMatter: Component[], body: Component[]): Component[] {
  return [...frontMatter, ...body];
}
