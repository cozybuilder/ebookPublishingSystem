/**
 * Ebook Publishing System — Canvas Selector (범용 selector 위임 래퍼)
 *
 * 큐레이션 로직은 src/selector 의 범용 select() 로 일원화됐다.
 * 이 래퍼는 CanvasProfile(pick/fit/selector)을 범용 select 의 인자로 변환한다.
 * 동작은 이전과 동일(결정론적).
 */

import type { ComponentType } from '../types/component.ts';
import type { LayoutComponent } from '../types/design.ts';
import { select } from '../selector/selector.ts';
import type { CanvasProfile } from './canvas-profiles.ts';

export interface ComponentSelection {
  components: LayoutComponent[];
  fallback: boolean;
  reason: string | null;
}

export function selectComponents(all: LayoutComponent[], profile: CanvasProfile): ComponentSelection {
  const requireTypes = profile.selector.require ?? [];
  // 1차 후보 = pick ∪ require
  const primaryAllow = new Set<ComponentType>([...profile.pick, ...requireTypes]);
  const r = select<LayoutComponent, ComponentType>(
    all,
    (c) => c.componentType,
    profile.selector,
    { cap: profile.fit.maxComponents, primaryAllow },
  );
  return { components: r.items, fallback: r.fallback, reason: r.reason };
}
