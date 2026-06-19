/**
 * Ebook Publishing System — Preview 컴포넌트 선별 (공용)
 *
 * OutputProfile(componentSelector 보유, 예: KmongPreviewPDF)에 대해
 * Page Scope → blockLimit → Component Selector 를 적용한 "preview 컴포넌트"를 산출한다.
 * build-html(preview HTML) 과 build-preview-canvas(promo 이미지)가 동일 결과를 공유한다.
 */

import { buildPages } from './page-builder/page-builder.ts';
import { scopePages, limitContent, rangeBlockLimit } from './page-builder/page-scope.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { select } from './selector/selector.ts';
import type { Book } from './types/ast.ts';
import type { Component, ComponentType } from './types/component.ts';
import type { OutputProfile } from './types/output.ts';

/** componentSelector 가 지정된 프로파일의 preview 선별 컴포넌트 목록(순서 보존). */
export function previewComponents(book: Book, profile: OutputProfile): Component[] {
  const policy = profile.componentSelector;
  if (!policy) {
    // selector 미지정 → 전체 컴포넌트(현 동작 유지)
    return mapComponents(book, buildPages(book, profile)).flatMap((p) => p.components);
  }
  const scoped = scopePages(buildPages(book, profile), profile.selector);
  const limited = limitContent(mapComponents(book, scoped), rangeBlockLimit(profile.selector));
  const flat = limited.flatMap((p) => p.components);
  const primaryAllow = new Set<ComponentType>([...policy.prefer, ...(policy.require ?? [])]);
  return select(flat, (c) => c.type, policy, { cap: flat.length, primaryAllow }).items;
}
