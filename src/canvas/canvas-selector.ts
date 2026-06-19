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

export function selectComponents(all: LayoutComponent[], profile: CanvasProfile): LayoutComponent[] {
  const sel = profile.selector;
  const avoid = new Set<ComponentType>(sel.avoid ?? []);
  const requireSet = new Set<ComponentType>(sel.require ?? []);
  const allowed = new Set<ComponentType>([...profile.pick, ...(sel.require ?? [])]);

  // 후보: pick/require 에 속하고 avoid 가 아닌 것
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

  // 점수 내림차순, 동점은 원본 순서(결정론적)
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const cap = profile.fit.maxComponents;
  const perType = new Map<ComponentType, number>();
  const picked: Scored[] = [];
  for (const s of scored) {
    if (picked.length >= cap) break;
    const t = s.comp.componentType;
    const max = sel.maxPerType?.[t];
    const used = perType.get(t) ?? 0;
    if (typeof max === 'number' && used >= max) continue;
    perType.set(t, used + 1);
    picked.push(s);
  }

  // 표시 순서는 원고 등장 순서로(자연스러운 위→아래 흐름)
  picked.sort((a, b) => a.index - b.index);
  return picked.map((p) => p.comp);
}
