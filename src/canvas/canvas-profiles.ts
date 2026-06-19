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

export type SelectorStrategy = 'priority' | 'marketing' | 'summary' | 'workflow';

/**
 * 캔버스에 담을 컴포넌트를 목적에 맞게 자동 큐레이션하는 정책.
 * 결정론적: 같은 입력이면 같은 출력(점수 동점은 원고 등장 순서로 tie-break).
 */
export interface CanvasSelector {
  strategy: SelectorStrategy;
  /** 가산점 대상(우선 포함되도록) */
  prefer: ComponentType[];
  /** 감점/제외 대상 */
  avoid?: ComponentType[];
  /** 반드시 포함(가능하면 1순위) */
  require?: ComponentType[];
  /** 타입별 최대 개수(같은 카드 반복 방지) */
  maxPerType?: Partial<Record<ComponentType, number>>;
}

export interface CanvasProfile {
  name: CanvasName;
  /** 캔버스 폭(px) */
  width: number;
  /** 캔버스 높이(px). null = 내용에 따라 가변(detail) */
  height: number | null;
  /** 후보 컴포넌트 타입(이 안에서 selector 가 큐레이션) */
  pick: ComponentType[];
  /** 단일 컬럼 강제(square/story) */
  singleColumn: boolean;
  /** auto-fit 정책 */
  fit: FitPolicy;
  /** 컴포넌트 큐레이션 정책 */
  selector: CanvasSelector;
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
  fit: { mode: 'flow', maxComponents: 8, density: 'normal' },
  // 상세페이지: 여러 타입을 골고루
  selector: {
    strategy: 'marketing',
    prefer: PRIORITY,
    maxPerType: { ParagraphBlock: 0 },
  },
};

export const SQUARE_CANVAS: CanvasProfile = {
  name: 'square',
  width: 1080,
  height: 1080,
  pick: ['ResultCard', 'QuoteBlock', 'ChecklistCard'],
  singleColumn: true,
  fit: { mode: 'fixed', maxComponents: 2, density: 'compact' },
  // SNS 정사각: 핵심 요약 카드 중심, 같은 카드 반복 방지
  selector: {
    strategy: 'summary',
    prefer: ['ResultCard', 'QuoteBlock', 'ChecklistCard'],
    avoid: ['ChapterHeading'],
    maxPerType: { ResultCard: 1, QuoteBlock: 1, ChecklistCard: 1 },
  },
};

export const STORY_CANVAS: CanvasProfile = {
  name: 'story',
  width: 1080,
  height: 1920,
  pick: ['ChapterHeading', 'ResultCard', 'QuoteBlock'],
  singleColumn: true,
  fit: { mode: 'fixed', maxComponents: 2, density: 'compact' },
  // 세로 커버: ChapterHeading 필수 + 결과/인용
  selector: {
    strategy: 'marketing',
    require: ['ChapterHeading'],
    prefer: ['ResultCard', 'QuoteBlock'],
    maxPerType: { ChapterHeading: 1, ResultCard: 1, QuoteBlock: 1 },
  },
};

export const CANVAS_PROFILES: CanvasProfile[] = [DETAIL_CANVAS, SQUARE_CANVAS, STORY_CANVAS];
