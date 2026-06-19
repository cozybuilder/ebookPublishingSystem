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
import type { ComponentPage, ComponentType } from '../types/component.ts';

/**
 * 구조 요소(blockLimit 카운트 제외): 커버/판권/목차/챕터 제목.
 * 이들은 blockLimit 과 무관하게 항상 보존된다(첫 챕터 제목이 잘리지 않도록).
 */
const STRUCTURE_COMPONENTS = new Set<ComponentType>([
  'TitleBlock',
  'SubtitleBlock',
  'AuthorBlock',
  'ChapterHeading',
  'TableOfContentsList',
  'CopyrightNotice',
]);

export function isStructureComponent(type: ComponentType): boolean {
  return STRUCTURE_COMPONENTS.has(type);
}

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

/** range 의 콘텐츠 blockLimit (scope 가 range 가 아니면 undefined). */
export function rangeBlockLimit(selector: Selector | undefined): number | undefined {
  if (selector && selector.scope === 'range') return selector.to.blockLimit;
  return undefined;
}

/**
 * blockLimit 적용 (mapComponents 이후, componentSelector 이전).
 *  - 구조 요소(STRUCTURE_COMPONENTS)는 항상 보존, 카운트 제외(ChapterHeading 등).
 *  - 콘텐츠 컴포넌트만 등장 순서대로 N개까지 유지, 초과분 제외.
 *  - 단순 slice 가 아니라 구조/콘텐츠를 구분한다.
 */
export function limitContent(pages: ComponentPage[], limit: number | undefined): ComponentPage[] {
  if (limit === undefined) return pages;
  let count = 0;
  const out: ComponentPage[] = [];
  for (const page of pages) {
    const kept = page.components.filter((c) => {
      if (STRUCTURE_COMPONENTS.has(c.type)) return true; // 구조 요소: 항상 보존
      if (count < limit) {
        count++;
        return true; // 콘텐츠: 한도 내 유지
      }
      return false; // 한도 초과 콘텐츠: 제외
    });
    if (kept.length > 0) out.push({ ...page, components: kept });
  }
  return out;
}

/** 디버그 마커용 라벨. scope 'all'(또는 미지정)이면 undefined → 마커 없음. */
export function pageScopeLabel(selector: Selector | undefined): string | undefined {
  if (!selector || selector.scope === 'all') return undefined;
  if (selector.scope === 'range') {
    const limit = selector.to.blockLimit;
    return `range:ch${selector.from.chapter}-${selector.to.chapter}${limit ? `:block${limit}` : ''}`;
  }
  return selector.scope; // 'filter' | 'excerpt'
}
