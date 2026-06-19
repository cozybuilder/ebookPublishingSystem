/**
 * Ebook Publishing System — 폴백 보충
 *
 * 1차 선별 결과가 fallback.minComponents 미만이면 실행.
 * - 이미 선택분 중복 금지
 * - allowTypes 가 있으면 그 안에서만(명시 화이트리스트 → avoid 보다 우선)
 * - allowTypes 가 없으면 avoid 제외
 * - preferTypes 우선, 그다음 useFirstAvailable 시 원고 등장순
 * - cap(전체 상한) 초과 금지
 * - require 타입이 원고에 전혀 없으면 reason='require-missing'(오류 아님)
 */

import type { Indexed, SelectorPolicy } from './selector.ts';

export interface FallbackResult {
  fallback: boolean;
  reason: string | null;
}

export function fallbackFill<I, T extends string>(
  all: I[],
  getType: (item: I) => T,
  policy: SelectorPolicy<T>,
  picked: Indexed<I>[], // in-place 보충
  pickedIdx: Set<number>,
  cap: number,
): FallbackResult {
  const fb = policy.fallback;
  const min = fb?.minComponents ?? 0;
  if (!fb || picked.length >= min) return { fallback: false, reason: null };

  const avoid = new Set<T>(policy.avoid ?? []);
  const requireTypes = policy.require ?? [];
  const requireMissing =
    requireTypes.length > 0 && !requireTypes.some((t) => all.some((i) => getType(i) === t));
  const reason = requireMissing ? 'require-missing' : 'below-min-components';

  const allowFb = fb.allowTypes ? new Set<T>(fb.allowTypes) : null;
  const preferFb = fb.preferTypes ?? [];
  const preferScore = (t: T): number => {
    const idx = preferFb.indexOf(t);
    return idx >= 0 ? preferFb.length - idx : 0;
  };

  let cands = all
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => {
      const t = getType(item);
      if (pickedIdx.has(index)) return false; // 중복 금지
      if (allowFb) return allowFb.has(t); // 화이트리스트(avoid 무시)
      return !avoid.has(t); // 화이트리스트 없으면 avoid 제외
    });
  cands.sort((a, b) => preferScore(getType(b.item)) - preferScore(getType(a.item)) || a.index - b.index);
  if (!fb.useFirstAvailable) {
    cands = cands.filter((x) => preferScore(getType(x.item)) > 0);
  }

  const target = Math.min(min, cap);
  for (const x of cands) {
    if (picked.length >= target) break;
    picked.push({ item: x.item, index: x.index });
    pickedIdx.add(x.index);
  }
  return { fallback: true, reason };
}
