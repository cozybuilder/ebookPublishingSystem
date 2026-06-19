/**
 * Ebook Publishing System — 1차 점수 선별
 *
 * require +1000(우선 포함), prefer 순위 가산, avoid 제외, maxPerType 제한, cap 상한.
 * 동점은 원본 등장 순서(index)로 tie-break → 결정론적.
 */

import type { Indexed, SelectorPolicy } from './selector.ts';

export interface PrimaryResult<I> {
  picked: Indexed<I>[];
  pickedIdx: Set<number>;
}

export function scorePrimary<I, T extends string>(
  all: I[],
  getType: (item: I) => T,
  policy: SelectorPolicy<T>,
  primaryAllow: Set<T> | undefined,
  cap: number,
): PrimaryResult<I> {
  const avoid = new Set<T>(policy.avoid ?? []);
  const requireSet = new Set<T>(policy.require ?? []);

  const scored: { item: I; index: number; score: number }[] = [];
  all.forEach((item, index) => {
    const t = getType(item);
    if (primaryAllow && !primaryAllow.has(t)) return;
    if (avoid.has(t)) return;
    let score = 0;
    if (requireSet.has(t)) score += 1000;
    const pi = policy.prefer.indexOf(t);
    if (pi >= 0) score += (policy.prefer.length - pi) * 10;
    scored.push({ item, index, score });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const perType = new Map<T, number>();
  const picked: Indexed<I>[] = [];
  const pickedIdx = new Set<number>();
  for (const s of scored) {
    if (picked.length >= cap) break;
    const t = getType(s.item);
    const max = policy.maxPerType?.[t];
    const used = perType.get(t) ?? 0;
    if (typeof max === 'number' && used >= max) continue;
    perType.set(t, used + 1);
    picked.push({ item: s.item, index: s.index });
    pickedIdx.add(s.index);
  }
  return { picked, pickedIdx };
}
