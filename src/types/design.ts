/**
 * Ebook Publishing System — Design Token / Layout 타입
 *
 * 기준 문서: docs/08_DESIGN_SYSTEM.md (승인된 토큰 v0.1), docs/09_SCHEMA_FORMALIZATION.md §4
 *
 * 주의: erasable syntax only (Node 타입 스트리핑 호환).
 */

import type { Component, ComponentType } from './component.ts';
import type { PageType } from './output.ts';

// ===== 토큰 키 =====
export type Tone = 'emphasis' | 'info' | 'neutral';
export type TypographyRole = 'title' | 'chapter' | 'body' | 'caption' | 'emphasis';
export type SpacingToken = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type RadiusToken = 'card' | 'image';
export type CanvasName = 'square' | 'vertical' | 'detailBanner';

// ===== Design Tokens =====
export interface ColorTokens {
  navy: string;
  orange: string;
  cyan: string;
  ink: string;
  gray: string;
  paper: string;
}

export interface TypographyScale {
  title: number;
  chapter: number;
  body: number;
  caption: number;
  emphasis: number;
}

export interface TypographyTokens {
  fontFamily: 'system' | string;
  scale: TypographyScale;
  lineHeight: { body: number; heading: number };
}

export interface SpacingScale {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

export interface RadiusTokens {
  card: number;
  image: number;
}

export interface CanvasSpec {
  ratio: string;
  width: number;
  height: number;
}

export type CanvasTokens = Record<CanvasName, CanvasSpec>;

/** 카드 의미 톤 매핑 (블록 타입 키 기준) */
export type CardToneMap = Record<
  'checklist' | 'table' | 'compare' | 'before-after' | 'prompt' | 'steps' | 'faq' | 'warning' | 'result',
  Tone
>;

export interface DesignTokens {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: SpacingScale;
  radius: RadiusTokens;
  cardTone: CardToneMap;
  canvas: CanvasTokens;
}

// ===== Layout 구조 =====

/** 좌표 배치는 v0.1에서 계산하지 않는다 (이후 단계). 구조만 정의. */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutComponent {
  componentId: string;
  componentType: ComponentType;
  tone: Tone;
  typographyRole: TypographyRole;
  spacing: SpacingToken;
  radius: RadiusToken | null;
  bounds: Bounds | null; // v0.1: 미계산(null)
  component: Component; // 렌더러가 사용할 원본 컴포넌트 데이터
}

export interface LayoutPage {
  pageType: PageType;
  chapterIndex?: number;
  canvas: CanvasSpec | null; // 이미지 캔버스 프로파일에서만 채워짐(v0.1 PDF=null)
  components: LayoutComponent[];
}
