/**
 * Ebook Publishing System — Book Selector 예시 정책 (v1, 구조만)
 *
 * Book 출력용 컴포넌트 큐레이션 정책 예시. 이번 단계에서는 등록/제공만 하고
 * 실제 Book 렌더링에는 연결하지 않는다(Book 출력 변화 = 0).
 *
 * 사용처(예정): OutputProfile.componentSelector 에 주입 → Component 선별.
 */

import type { ComponentType } from '../types/component.ts';
import type { SelectorPolicy } from './selector.ts';

/** 핵심 요약 중심 (요약본/미리보기) */
export const SUMMARY_SELECTOR: SelectorPolicy<ComponentType> = {
  strategy: 'summary',
  prefer: ['ResultCard', 'ChecklistCard', 'QuoteBlock'],
  maxPerType: { ResultCard: 3, ChecklistCard: 3 },
  fallback: { minComponents: 1, preferTypes: ['ParagraphBlock'], useFirstAvailable: true },
};

/** 실행/절차 중심 (워크북) */
export const WORKFLOW_SELECTOR: SelectorPolicy<ComponentType> = {
  strategy: 'workflow',
  prefer: ['StepsCard', 'ChecklistCard', 'WarningCard', 'TableCard'],
  fallback: { minComponents: 1, useFirstAvailable: true },
};

/** 홍보/세일즈 중심 */
export const MARKETING_SELECTOR: SelectorPolicy<ComponentType> = {
  strategy: 'marketing',
  prefer: ['ChapterHeading', 'ResultCard', 'QuoteBlock', 'ImageBlock', 'CompareCard'],
  fallback: { minComponents: 1, useFirstAvailable: true },
};

/** 읽기 중심 (본문 위주) */
export const READING_SELECTOR: SelectorPolicy<ComponentType> = {
  strategy: 'reading',
  prefer: ['ParagraphBlock', 'QuoteBlock', 'ChapterHeading'],
  avoid: [],
  fallback: { minComponents: 1, useFirstAvailable: true },
};

export const BOOK_SELECTORS: Record<string, SelectorPolicy<ComponentType>> = {
  summary: SUMMARY_SELECTOR,
  workflow: WORKFLOW_SELECTOR,
  marketing: MARKETING_SELECTOR,
  reading: READING_SELECTOR,
};
