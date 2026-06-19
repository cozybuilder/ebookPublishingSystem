/**
 * Ebook Publishing System — Page Scope Selector (v1)
 *
 * OutputProfile.selector(scope/range)를 Page 목록에 적용해 "페이지 범위"를 제한한다.
 * componentSelector 보다 먼저 동작한다: Page Selector → Component Selector.
 *
 * 기준 문서: docs/07_OUTPUT_PROFILES.md, docs/09_SCHEMA_FORMALIZATION.md §3
 *
 * v1 지원:
 *  - scope 'all'    : 전체 페이지(변화 없음).
 *  - scope 'range'  : 챕터 윈도우[from.chapter..to.chapter] (1-based ordinal) + 메타데이터 페이지.
 *  - scope 'filter'/'excerpt' : v1 미적용(전체 통과 — 추후 확장).
 */

import type { Page } from '../types/output.ts';
import type { Selector } from '../types/output.ts';

/** selector 에 따라 페이지 범위를 제한한다. 미제한 시 입력 그대로 반환. */
export function scopePages(pages: Page[], selector: Selector | undefined): Page[] {
  if (!selector || selector.scope === 'all') return pages;

  if (selector.scope === 'range') {
    const fromIdx = selector.from.chapter - 1; // 1-based ordinal → 0-based chapterIndex
    const toIdx = selector.to.chapter - 1;
    return pages.filter((p) => {
      if (p.chapterIndex === undefined) return true; // 메타데이터 페이지(Cover/Copyright/TOC) 유지
      return p.chapterIndex >= fromIdx && p.chapterIndex <= toIdx;
    });
  }

  // filter / excerpt 는 v1 에서 페이지 범위를 제한하지 않는다(전체 통과).
  return pages;
}

/** 디버그 마커용 라벨. scope 'all'(또는 미지정)이면 undefined → 마커 없음. */
export function pageScopeLabel(selector: Selector | undefined): string | undefined {
  if (!selector || selector.scope === 'all') return undefined;
  if (selector.scope === 'range') {
    // v1: 챕터 윈도우만 적용(blockLimit 은 v2 후보 — 라벨도 적용분만 표기).
    return `range:ch${selector.from.chapter}-${selector.to.chapter}`;
  }
  return selector.scope; // 'filter' | 'excerpt'
}
