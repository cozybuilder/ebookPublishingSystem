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
  gridStyle: 'stack',
  variant: 'none',
};

/**
 * Bento (v3) — Apple WWDC / OpenAI / Nothing 방향.
 * 벤토 그리드(카드 크기 차이), 숫자 배지 강조, 정보 그룹화, 챕터 대표 카드,
 * 핵심 결과 강조. 상세페이지/SNS/홍보용.
 */
const BENTO_RECIPE: StyleRecipe = {
  pageBackground: '#f1f2f4',
  pageShadow: false,
  pageRadius: 28,
  cardShadow: false,
  cardTint: true, // 의미 톤 카드에 존재감(warning/result/info 독립)
  cardBorder: '#E6E8EC',
  accent: true, // 숫자 배지/액센트 강조
  tableHeaderTinted: true, // OpenAI 정보 카드형 표 헤더
  checkboxRadius: 8,
  density: 'comfortable',
  cardStyle: 'soft',
  tableStyle: 'lined',
  badgeStyle: 'solid', // 강한 숫자 배지
  gridStyle: 'bento', // 벤토 그리드
  variant: 'none',
};

/**
 * Editorial (v3) — premium magazine / digital report 방향.
 * 긴 글을 읽기 편한 넓은 여백, 세리프 제목 위계, 기사형 요약/표/주석.
 * Bento보다 차분하고 Modern보다 출판물스럽다.
 */
const EDITORIAL_RECIPE: StyleRecipe = {
  pageBackground: '#efece5', // 따뜻한 종이 톤
  pageShadow: true, // 인쇄된 지면 느낌(은은한 그림자)
  pageRadius: 6, // 낮은 라운드(출판물)
  cardShadow: false,
  cardTint: false,
  cardBorder: '#e3ded5', // 따뜻한 hairline
  accent: false, // 차분하게
  tableHeaderTinted: false,
  checkboxRadius: 3,
  density: 'spacious', // 읽기 위한 넓은 여백
  cardStyle: 'soft',
  tableStyle: 'lined',
  badgeStyle: 'outline',
  gridStyle: 'stack',
  variant: 'editorial', // Editorial 전용 CSS 활성
};

/**
 * Dashboard (v3) — SaaS dashboard / Notion database / Linear board 방향.
 * 체크리스트·표·단계·결과·비교 중심 운영 문서. 차분하지만 정보 밀도 높음.
 */
const DASHBOARD_RECIPE: StyleRecipe = {
  pageBackground: '#eef1f5', // 옅은 운영 화면 배경
  pageShadow: false,
  pageRadius: 12,
  cardShadow: false,
  cardTint: false,
  cardBorder: '#e7eaef',
  accent: true, // 상태/배지 표현 활성
  tableHeaderTinted: true,
  checkboxRadius: 6,
  density: 'comfortable', // 정보 밀도 높게(여백 과하지 않게)
  cardStyle: 'soft',
  tableStyle: 'lined',
  badgeStyle: 'solid',
  gridStyle: 'stack',
  variant: 'dashboard', // Dashboard 전용 CSS 활성
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
  density: 'comfortable',
  cardStyle: 'soft',
  tableStyle: 'lined',
  badgeStyle: 'outline',
  gridStyle: 'stack',
  variant: 'none',
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

const Bento: Theme = {
  name: 'Bento',
  label: 'Bento',
  // 큰 라운드 타일 (base 색/타이포/간격은 상속)
  tokenOverride: {
    radius: { card: 22, image: 18 },
  },
  recipe: BENTO_RECIPE,
};

const Editorial: Theme = {
  name: 'Editorial',
  label: 'Editorial',
  // 출판물 느낌의 낮은 라운드 (base 색/타이포/간격 상속)
  tokenOverride: {
    radius: { card: 8, image: 6 },
  },
  recipe: EDITORIAL_RECIPE,
};

const Dashboard: Theme = {
  name: 'Dashboard',
  label: 'Dashboard',
  tokenOverride: {
    radius: { card: 12, image: 10 },
  },
  recipe: DASHBOARD_RECIPE,
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
  Bento,
  Editorial,
  Dashboard,
  CozyBuilderLab, // v2 레거시(유지)
  Minimal, // v2 레거시(유지)
};

/** 출력 프로파일 → 기본 테마 */
export const PROFILE_THEME: ProfileThemeMapping = {
  FullBookPDF: 'ModernGlass',
  EditableDOCX: 'ModernGlass',
  KmongPreviewPDF: 'ModernGlass',
  ChecklistPDF: 'ModernGlass',
  DetailPageImages: 'Bento',
  SNSPromoImages: 'Bento',
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
  bento: 'Bento',
  editorial: 'Editorial',
  magazine: 'Editorial',
  dashboard: 'Dashboard',
  report: 'Dashboard',
  ops: 'Dashboard',
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
