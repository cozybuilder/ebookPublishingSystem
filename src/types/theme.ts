/**
 * Ebook Publishing System — Theme 타입
 *
 * 기준 문서: docs/10_THEME_ENGINE.md
 *
 * Theme 은 base DesignTokens 를 상속하고 일부만 override(diff)하며,
 * 토큰만으로 표현하기 어려운 컴포넌트 스타일 변형은 StyleRecipe 로 보강한다.
 *
 * 이번 단계 구현 테마: CozyBuilderLab(default) / Minimal.
 * (Modern / Premium / Infographic 은 v0.2 이후 확장 후보 — 아직 미구현.)
 *
 * 주의: erasable syntax only (Node 타입 스트리핑 호환).
 */

import type { DesignTokens } from './design.ts';
import type { ProfileName } from './output.ts';

/** 깊은 부분 적용 (override diff 표현용) — 타입 전용(런타임 영향 없음) */
export type DeepPartial<T> = T extends object ? { [K in keyof T]?: DeepPartial<T[K]> } : T;

export type ThemeName = 'CozyBuilderLab' | 'Minimal';

/** base DesignTokens 에 덮어쓸 차분(diff). 지정하지 않은 값은 base 상속. */
export type ThemeOverride = DeepPartial<DesignTokens>;

/**
 * 토큰만으로 표현하기 어려운 컴포넌트/지면 스타일 변형 다이얼.
 * 렌더러는 이 레시피를 읽어 CSS 표현을 분기한다(테마 이름은 모른다).
 */
export interface StyleRecipe {
  pageBackground: string; // body 배경
  pageShadow: boolean; // 페이지 그림자 on/off
  pageRadius: number; // 페이지 모서리 반경(px)
  cardShadow: boolean; // 카드 그림자 on/off
  cardTint: boolean; // 의미 톤 카드 배경 틴트 on/off
  cardBorder: string; // 카드 테두리 색
  accent: boolean; // 장식 액센트(부제 바, steps 배지 그림자, hover 등) on/off
  tableHeaderTinted: boolean; // 표 헤더 틴트 vs 플레인
  checkboxRadius: number; // 체크박스 모서리 반경(px)
}

export interface Theme {
  name: ThemeName;
  label: string;
  tokenOverride?: ThemeOverride;
  recipe: StyleRecipe;
}

/** Theme 을 base 와 합성한 최종 결과. 렌더러가 입력으로 받는다. */
export interface ResolvedTheme {
  name: ThemeName;
  tokens: DesignTokens;
  recipe: StyleRecipe;
}

export type ThemeRegistry = Record<ThemeName, Theme>;

/** 출력 프로파일 → 기본 테마 매핑 */
export type ProfileThemeMapping = Record<ProfileName, ThemeName>;
