/**
 * Ebook Publishing System — Theme Engine (v0.1)
 *
 * base DesignTokens + ThemeOverride 합성, 테마/프로파일 기반 테마 선택.
 *
 * 기준 문서: docs/10_THEME_ENGINE.md
 *
 * 이번 단계 구현 테마: CozyBuilderLab(default) / Minimal.
 * 합성 모델: 최종 토큰 = deepMerge(DEFAULT_TOKENS, theme.tokenOverride).
 */

import { DEFAULT_TOKENS } from '../design-tokens/default-tokens.ts';
import { BASE_RECIPE } from '../html-renderer/html-renderer.ts';
import type { DesignTokens } from '../types/design.ts';
import type { ProfileName } from '../types/output.ts';
import type {
  ProfileThemeMapping,
  ResolvedTheme,
  StyleRecipe,
  Theme,
  ThemeName,
  ThemeOverride,
  ThemeRegistry,
} from '../types/theme.ts';

export const DEFAULT_THEME_NAME: ThemeName = 'ModernGlass';

// ----- 스타일 레시피 -----

/**
 * Modern Glass (v3 default) — Linear / OpenAI / Apple / Arc / Raycast 방향.
 * 큰 여백, border 중심, 그림자 거의 없음, 색 절제, 깔끔한 흰 배경, 낮은 정보 밀도.
 */
const MODERN_GLASS_RECIPE: StyleRecipe = {
  pageBackground: '#f6f7f9',
  pageShadow: false, // 그림자 대신 얇은 border 로 분리
  pageRadius: 28, // radius 큼
  cardShadow: false, // 그림자 거의 없음
  cardTint: false, // 과한 카드 틴트 제거
  cardBorder: '#ECEEF2', // 얇고 연한 border 중심
  accent: false, // 색 절제(장식 액센트 최소)
  tableHeaderTinted: false, // 엑셀 느낌 표 제거
  checkboxRadius: 6,
  density: 'spacious', // 큰 여백, 낮은 밀도, 숨쉬는 느낌
  cardStyle: 'glass',
  tableStyle: 'open',
  badgeStyle: 'outline',
};

/** CozyBuilder Lab(v2 레거시) = 렌더러 기본 표현 그대로 */
const COZY_RECIPE: StyleRecipe = { ...BASE_RECIPE };

/** Minimal = 그림자 약화, 색 강조 최소, 카드 표현 단순화 */
const MINIMAL_RECIPE: StyleRecipe = {
  pageBackground: '#f5f5f4',
  pageShadow: false,
  pageRadius: 4,
  cardShadow: false,
  cardTint: false,
  cardBorder: '#e5e5e5',
  accent: false,
  tableHeaderTinted: false,
  checkboxRadius: 2,
};

// ----- 테마 정의 -----

const ModernGlass: Theme = {
  name: 'ModernGlass',
  label: 'Modern Glass',
  // 큰 radius 지향 (base 의 navy/타이포/간격은 상속)
  tokenOverride: {
    radius: { card: 20, image: 16 },
  },
  recipe: MODERN_GLASS_RECIPE,
};

const CozyBuilderLab: Theme = {
  name: 'CozyBuilderLab',
  label: 'CozyBuilder Lab',
  // base tokens 그대로 사용 (override 없음)
  recipe: COZY_RECIPE,
};

const Minimal: Theme = {
  name: 'Minimal',
  label: 'Minimal',
  // 색 강조를 낮추고 모서리를 줄임 (base 의 navy 등은 상속)
  tokenOverride: {
    colors: { orange: '#C2703D', cyan: '#5B8A93' },
    radius: { card: 4, image: 4 },
  },
  recipe: MINIMAL_RECIPE,
};

// ----- 레지스트리 -----

export const THEMES: ThemeRegistry = {
  ModernGlass,
  CozyBuilderLab, // v2 레거시(유지)
  Minimal, // v2 레거시(유지)
};

/** 출력 프로파일 → 기본 테마 (Bento 구현 전까지 전부 ModernGlass) */
export const PROFILE_THEME: ProfileThemeMapping = {
  FullBookPDF: 'ModernGlass',
  EditableDOCX: 'ModernGlass',
  KmongPreviewPDF: 'ModernGlass',
  ChecklistPDF: 'ModernGlass',
  DetailPageImages: 'ModernGlass',
  SNSPromoImages: 'ModernGlass',
};

// ----- 합성 -----

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** base 에 override 를 깊게 합성 (override 안 된 값은 base 상속) */
function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : (override as T));
  }
  const out: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const o = (override as Record<string, unknown>)[key];
    const b = (base as Record<string, unknown>)[key];
    if (isPlainObject(b) && isPlainObject(o)) out[key] = deepMerge(b, o);
    else if (o !== undefined) out[key] = o;
  }
  return out as T;
}

/** base DesignTokens 에 ThemeOverride 를 적용해 최종 토큰 산출 */
export function mergeTokens(base: DesignTokens, override?: ThemeOverride): DesignTokens {
  if (!override) return base;
  return deepMerge(base, override);
}

// ----- 선택/해석 -----

const NAME_ALIAS: Record<string, ThemeName> = {
  modernglass: 'ModernGlass',
  'modern glass': 'ModernGlass',
  modern: 'ModernGlass',
  glass: 'ModernGlass',
  cozybuilderlab: 'CozyBuilderLab',
  cozy: 'CozyBuilderLab',
  minimal: 'Minimal',
};

/** 입력 문자열(대소문자/별칭 허용)을 ThemeName 으로 정규화. 실패 시 undefined. */
export function normalizeThemeName(input?: string): ThemeName | undefined {
  if (!input) return undefined;
  return NAME_ALIAS[input.trim().toLowerCase()];
}

/** 이름으로 Theme 선택. 미지정/미지원이면 default theme. */
export function getTheme(name?: ThemeName): Theme {
  if (name && THEMES[name]) return THEMES[name];
  return THEMES[DEFAULT_THEME_NAME];
}

/** 프로파일의 기본 테마 이름 */
export function themeNameForProfile(profile: ProfileName): ThemeName {
  return PROFILE_THEME[profile] ?? DEFAULT_THEME_NAME;
}

/** Theme 을 base 토큰과 합성한 최종 결과(렌더러 입력) */
export function resolveTheme(theme: Theme): ResolvedTheme {
  return {
    name: theme.name,
    tokens: mergeTokens(DEFAULT_TOKENS, theme.tokenOverride),
    recipe: theme.recipe,
  };
}

/** 이름으로 바로 해석 */
export function resolveThemeByName(name?: ThemeName): ResolvedTheme {
  return resolveTheme(getTheme(name));
}

/** 프로파일 기본 테마를 해석 */
export function resolveThemeForProfile(profile: ProfileName): ResolvedTheme {
  return resolveTheme(getTheme(themeNameForProfile(profile)));
}
