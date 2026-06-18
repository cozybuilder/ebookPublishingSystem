/**
 * Ebook Publishing System — 출력 프로파일 레지스트리
 *
 * 기준 문서: docs/07_OUTPUT_PROFILES.md, docs/09_SCHEMA_FORMALIZATION.md §3
 *
 * 이번 단계(v0.1)에서는 FullBookPDF / ChecklistPDF 두 프로파일만 구현 대상으로 둔다.
 * 나머지 프로파일 명세는 문서/타입에는 존재하나 빌더 미구현 상태.
 */

import type { OutputProfile } from '../types/output.ts';

export const FullBookPDF: OutputProfile = {
  name: 'FullBookPDF',
  format: 'pdf',
  selector: { scope: 'all' },
  layoutVariant: 'fixed',
};

export const ChecklistPDF: OutputProfile = {
  name: 'ChecklistPDF',
  format: 'pdf',
  selector: { scope: 'filter', blockTypes: ['checklist'] },
  layoutVariant: 'fixed',
};

/** 이번 단계에서 빌더가 지원하는 프로파일 */
export const SUPPORTED_PROFILES: OutputProfile[] = [FullBookPDF, ChecklistPDF];
