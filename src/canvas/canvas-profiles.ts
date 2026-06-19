/**
 * Ebook Publishing System — Canvas Profile (v1)
 *
 * 이미지형 캔버스 출력 규격. 책 전체가 아니라 판매/홍보용 대표 섹션만 담는다.
 * (PNG/JPG 변환은 아직 하지 않는다 — 브라우저 캡처용 HTML 캔버스만 생성)
 *
 * 기준 문서: docs/07_OUTPUT_PROFILES.md (DetailPageImages / SNSPromoImages)
 */

import type { ComponentType } from '../types/component.ts';

export type CanvasName = 'detail' | 'square' | 'story';

export type FitDensity = 'normal' | 'compact' | 'tight';

/**
 * 고정 높이 캔버스의 자동 맞춤(auto-fit) 정책.
 *  - mode 'fixed'  : 고정 높이(square/story). maxComponents/density 로 잘림 방지.
 *  - mode 'flow'   : 높이 가변(detail). auto-fit 비대상.
 */
export interface FitPolicy {
  mode: 'fixed' | 'flow';
  /** 캔버스에 담을 최대 컴포넌트 수 */
  maxComponents: number;
  /** 표현 밀도(폰트/패딩/간격 축소 정도) */
  density: FitDensity;
  /** 전체 스케일(선택, 1 = 100%) */
  scale?: number;
}

export interface CanvasProfile {
  name: CanvasName;
  /** 캔버스 폭(px) */
  width: number;
  /** 캔버스 높이(px). null = 내용에 따라 가변(detail) */
  height: number | null;
  /** 포함할 컴포넌트 타입(우선순위 순) */
  pick: ComponentType[];
  /** 최대 컴포넌트 수(undefined = 제한 없음, fit.maxComponents 보다 우선순위 낮음) */
  limit?: number;
  /** 단일 컬럼 강제(square/story) */
  singleColumn: boolean;
  /** auto-fit 정책 */
  fit: FitPolicy;
}

/** 포함 우선순위 (요청 6) */
const PRIORITY: ComponentType[] = [
  'ChapterHeading',
  'ResultCard',
  'QuoteBlock',
  'ChecklistCard',
  'StepsCard',
  'CompareCard',
  'WarningCard',
  'ImageBlock',
];

export const DETAIL_CANVAS: CanvasProfile = {
  name: 'detail',
  width: 860,
  height: null, // 세로형 긴 이미지(가변) → auto-fit 비대상
  pick: PRIORITY,
  singleColumn: false, // 벤토 2열 리듬 허용
  fit: { mode: 'flow', maxComponents: 99, density: 'normal' },
};

export const SQUARE_CANVAS: CanvasProfile = {
  name: 'square',
  width: 1080,
  height: 1080,
  pick: ['ResultCard', 'QuoteBlock', 'ChecklistCard'], // 핵심 후보
  singleColumn: true,
  // 1080×1080: 핵심 1~2개 중심, compact
  fit: { mode: 'fixed', maxComponents: 2, density: 'compact' },
};

export const STORY_CANVAS: CanvasProfile = {
  name: 'story',
  width: 1080,
  height: 1920,
  pick: ['ChapterHeading', 'ResultCard'], // 챕터 + 결과 + CTA
  singleColumn: true,
  // 1080×1920: ChapterHeading + ResultCard + CTA 중심, compact
  fit: { mode: 'fixed', maxComponents: 2, density: 'compact' },
};

export const CANVAS_PROFILES: CanvasProfile[] = [DETAIL_CANVAS, SQUARE_CANVAS, STORY_CANVAS];
