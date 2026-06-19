/**
 * Ebook Publishing System — Canvas Selector (v1)
 *
 * 캔버스에 담을 컴포넌트를 목적(strategy)에 맞게 점수 기반으로 큐레이션한다.
 *
 * 결정론적 보장:
 *  - 점수 내림차순으로 선별하되, 동점은 원고 등장 순서(원본 인덱스)로 tie-break.
 *  - 같은 입력 → 항상 같은 출력.
 *
 * 규칙:
 *  - require 타입: 큰 가산점(우선 포함)
 *  - prefer 타입: 순위 가산점(앞일수록 높음)
 *  - avoid 타입: 후보에서 제외
 *  - maxPerType: 같은 타입 반복 제한
 *  - fit.maxComponents: 전체 상한
 */

import type { ComponentType } from '../types/component.ts';
import type { LayoutComponent } from '../types/design.ts';
import type { CanvasProfile } from './canvas-profiles.ts';

interface Scored {
  comp: LayoutComponent;
  index: number; // 원고 등장 순서(tie-breaker)
  score: number;
}

export interface SelectionResult {
  components: LayoutComponent[];
  /** 폴백 실행 여부 */
  fallback: boolean;
  /** 폴백 사유(미실행 시 null) */
  reason: string | null;
}

export function selectComponents(all: LayoutComponent[], profile: CanvasProfile): SelectionResult {
  const sel = profile.selector;
  const avoid = new Set<ComponentType>(sel.avoid ?? []);
  const requireSet = new Set<ComponentType>(sel.require ?? []);
  const allowed = new Set<ComponentType>([...profile.pick, ...(sel.require ?? [])]);
  const cap = profile.fit.maxComponents;

  // ----- 1차 선별(점수 기반) -----
  const scored: Scored[] = [];
  all.forEach((comp, index) => {
    const t = comp.componentType;
    if (!allowed.has(t) || avoid.has(t)) return;
    let score = 0;
    if (requireSet.has(t)) score += 1000;
    const pi = sel.prefer.indexOf(t);
    if (pi >= 0) score += (sel.prefer.length - pi) * 10;
    scored.push({ comp, index, score });
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const perType = new Map<ComponentType, number>();
  const picked: Scored[] = [];
  const pickedIdx = new Set<number>();
  for (const s of scored) {
    if (picked.length >= cap) break;
    const t = s.comp.componentType;
    const max = sel.maxPerType?.[t];
    const used = perType.get(t) ?? 0;
    if (typeof max === 'number' && used >= max) continue;
    perType.set(t, used + 1);
    picked.push(s);
    pickedIdx.add(s.index);
  }

  // ----- 폴백 -----
  const fb = sel.fallback;
  const min = fb?.minComponents ?? 0;
  let fallback = false;
  let reason: string | null = null;

  if (fb && picked.length < min) {
    fallback = true;
    // require 타입이 원고에 아예 없으면 사유를 구분(오류 없이 폴백)
    const requireTypes = sel.require ?? [];
    const requireMissing =
      requireTypes.length > 0 && !requireTypes.some((t) => all.some((c) => c.componentType === t));
    reason = requireMissing ? 'require-missing' : 'below-min-components';

    const allowFb = fb.allowTypes ? new Set<ComponentType>(fb.allowTypes) : null;
    const preferFb = fb.preferTypes ?? [];
    const preferScore = (t: ComponentType): number => {
      const idx = preferFb.indexOf(t);
      return idx >= 0 ? preferFb.length - idx : 0;
    };

    // 폴백 후보: 미선택 + (allowTypes 화이트리스트 / 없으면 avoid 제외)
    // allowTypes 는 명시적 화이트리스트이므로 avoid 보다 우선한다.
    let fbCandidates = all
      .map((comp, index) => ({ comp, index }))
      .filter(({ comp, index }) => {
        const t = comp.componentType;
        if (pickedIdx.has(index)) return false; // 중복 금지
        if (allowFb) return allowFb.has(t); // 화이트리스트 안에서만(avoid 무시)
        return !avoid.has(t); // 화이트리스트 없으면 avoid 제외
      });
    // preferTypes 우선, 그다음 원고 순서
    fbCandidates.sort(
      (a, b) => preferScore(b.comp.componentType) - preferScore(a.comp.componentType) || a.index - b.index,
    );
    // useFirstAvailable 가 아니면 preferTypes 에 속한 것만
    if (!fb.useFirstAvailable) {
      fbCandidates = fbCandidates.filter((x) => preferScore(x.comp.componentType) > 0);
    }

    const target = Math.min(min, cap); // 상한을 넘지 않게
    for (const x of fbCandidates) {
      if (picked.length >= target) break;
      picked.push({ comp: x.comp, index: x.index, score: -1 });
      pickedIdx.add(x.index);
    }
  }

  // 표시 순서는 원고 등장 순서로(자연스러운 위→아래 흐름)
  picked.sort((a, b) => a.index - b.index);
  return { components: picked.map((p) => p.comp), fallback, reason };
}
