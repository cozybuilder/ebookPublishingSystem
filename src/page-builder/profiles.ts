/**
 * Ebook Publishing System — 출력 프로파일 레지스트리
 *
 * 기준 문서: docs/07_OUTPUT_PROFILES.md, docs/09_SCHEMA_FORMALIZATION.md §3
 *
 * 이번 단계(v0.1)에서는 FullBookPDF / ChecklistPDF 두 프로파일만 구현 대상으로 둔다.
 * 나머지 프로파일 명세는 문서/타입에는 존재하나 빌더 미구현 상태.
 */

import type { OutputProfile } from '../types/output.ts';
import { MARKETING_SELECTOR } from '../selector/book-selectors.ts';

export const FullBookPDF: OutputProfile = {
  name: 'FullBookPDF',
  format: 'pdf',
  selector: { scope: 'all' },
  layoutVariant: 'fixed',
  // componentSelector 미지정 → 전체 컴포넌트 출력(현재 동작 유지)
};

export const ChecklistPDF: OutputProfile = {
  name: 'ChecklistPDF',
  format: 'pdf',
  selector: { scope: 'filter', blockTypes: ['checklist'] },
  layoutVariant: 'fixed',
};

/**
 * 미리보기(판매 페이지/요약)용 프로파일.
 * 페이지 구조는 FullBook 재사용, 컴포넌트는 marketing selector 로 요약 선별.
 * (Result/Quote/Checklist/Compare/Image/ChapterHeading 중심, Paragraph 제외)
 */
export const KmongPreviewPDF: OutputProfile = {
  name: 'KmongPreviewPDF',
  format: 'pdf',
  selector: { scope: 'range', from: { chapter: 1 }, to: { chapter: 1, blockLimit: 6 } },
  layoutVariant: 'fixed',
  componentSelector: MARKETING_SELECTOR,
};

/** 이번 단계에서 빌더가 지원하는 프로파일 */
export const SUPPORTED_PROFILES: OutputProfile[] = [FullBookPDF, ChecklistPDF, KmongPreviewPDF];
