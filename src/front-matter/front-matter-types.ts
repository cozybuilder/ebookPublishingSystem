/**
 * Ebook Publishing System — Front Matter 타입 (v1)
 *
 * 전자책 앞부분(표지/판권/목차/저자 소개/면책)을 위한 메타데이터와 산출 구조.
 */

import type { Component } from '../types/component.ts';

export interface FrontMatterMeta {
  title: string;
  subtitle?: string;
  author: string;
  publisher: string;
  brand: string;
  year: number;
  description?: string;
  disclaimer: string;
  authorBio: string;
}

/** 사용자 override(부분). 미지정 값은 기본값으로 채워진다. */
export type FrontMatterOverrides = Partial<FrontMatterMeta>;

export interface TocEntry {
  number: number;
  title: string;
}

export interface FrontMatterDoc {
  meta: FrontMatterMeta;
  /** EPUB 등에서 사용할 목차 구조(챕터 순서 보존) */
  toc: TocEntry[];
  /** 본문 앞에 prepend 될 Front Matter 컴포넌트들 */
  components: Component[];
}
