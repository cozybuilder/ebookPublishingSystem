/**
 * Ebook Publishing System — 범용 Selector (v1)
 *
 * Canvas 전용이던 selector 를 공통 추상으로 승격한 모듈.
 * 어떤 항목 배열이든 "타입 접근자(getType)"만 주면 점수 기반으로 결정론적 선별한다.
 * (Canvas = LayoutComponent, Book = Component 등에 재사용)
 *
 * 결정론: 점수 내림차순, 동점은 원본 등장 순서로 tie-break.
 */

import { scorePrimary } from './score-selector.ts';
import { fallbackFill } from './fallback.ts';

export type SelectorStrategy = 'priority' | 'marketing' | 'summary' | 'workflow' | 'reading';

/** 후보 부족 시 빈/빈약한 출력 방지 폴백 정책 */
export interface SelectorFallback<T extends string = string> {
  minComponents?: number;
  allowTypes?: T[];
  preferTypes?: T[];
  useFirstAvailable?: boolean;
}

/** 범용 선별 정책 */
export interface SelectorPolicy<T extends string = string> {
  strategy: SelectorStrategy;
  prefer: T[];
  avoid?: T[];
  require?: T[];
  maxPerType?: Partial<Record<T, number>>;
  fallback?: SelectorFallback<T>;
}

export interface SelectionResult<I> {
  items: I[];
  fallback: boolean;
  reason: string | null;
}

export interface SelectOptions<T extends string = string> {
  /** 전체 상한 */
  cap: number;
  /** 1차 후보로 허용할 타입(미지정 시 전체 허용) */
  primaryAllow?: Set<T>;
}

/** 인덱스가 붙은 항목 (내부 공용) */
export interface Indexed<I> {
  item: I;
  index: number;
}

/**
 * 점수 기반 선별 + 폴백. 결정론적.
 */
export function select<I, T extends string = string>(
  all: I[],
  getType: (item: I) => T,
  policy: SelectorPolicy<T>,
  opts: SelectOptions<T>,
): SelectionResult<I> {
  const { picked, pickedIdx } = scorePrimary(all, getType, policy, opts.primaryAllow, opts.cap);
  const { fallback, reason } = fallbackFill(all, getType, policy, picked, pickedIdx, opts.cap);
  picked.sort((a, b) => a.index - b.index); // 표시 순서 = 원고 등장 순서
  return { items: picked.map((p) => p.item), fallback, reason };
}
