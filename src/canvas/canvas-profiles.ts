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

export interface CanvasProfile {
  name: CanvasName;
  /** 캔버스 폭(px) */
  width: number;
  /** 캔버스 높이(px). null = 내용에 따라 가변(detail) */
  height: number | null;
  /** 포함할 컴포넌트 타입(우선순위 순) */
  pick: ComponentType[];
  /** 최대 컴포넌트 수(undefined = 제한 없음) */
  limit?: number;
  /** 단일 컬럼 강제(square/story) */
  singleColumn: boolean;
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
  height: null, // 세로형 긴 이미지(가변)
  pick: PRIORITY,
  singleColumn: false, // 벤토 2열 리듬 허용
};

export const SQUARE_CANVAS: CanvasProfile = {
  name: 'square',
  width: 1080,
  height: 1080,
  pick: ['ResultCard', 'QuoteBlock', 'ChecklistCard'], // 핵심 1~3개
  limit: 3,
  singleColumn: true,
};

export const STORY_CANVAS: CanvasProfile = {
  name: 'story',
  width: 1080,
  height: 1920,
  pick: ['ChapterHeading', 'ResultCard'], // 챕터 + 결과 + CTA
  limit: 2,
  singleColumn: true,
};

export const CANVAS_PROFILES: CanvasProfile[] = [DETAIL_CANVAS, SQUARE_CANVAS, STORY_CANVAS];
