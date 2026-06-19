/**
 * Ebook Publishing System — 릴리스 산출물 매니페스트 (순수 데이터)
 *
 * 릴리스 오케스트레이터(src/release.ts)와 테스트가 공유하는 검증 대상 목록.
 * 단계 정의와 산출물 목록만 담는다(I/O 없음).
 */

export interface ReleaseStep {
  /** 표시용 라벨 */
  label: string;
  /** npm 스크립트 이름 */
  script: string;
}

/** 릴리스 단계 (순서대로) */
export const RELEASE_STEPS: ReleaseStep[] = [
  { label: 'Build HTML', script: 'build:html' },
  { label: 'Build Canvas', script: 'build:canvas' },
  { label: 'Export PNG', script: 'export:png' },
  { label: 'Export PDF', script: 'export:pdf' },
];

/** 존재만 확인하는 HTML 산출물 */
export const RELEASE_HTML: string[] = [
  'book.html',
  'book.modern.html',
  'book.bento.html',
  'book.editorial.html',
  'book.dashboard.html',
  'book.preview.html',
  'canvas.detail.html',
  'canvas.square.html',
  'canvas.story.html',
];

/** 존재 + size>0 + PNG 헤더 확인 대상 */
export const RELEASE_PNG: string[] = ['canvas.detail.png', 'canvas.square.png', 'canvas.story.png'];

/** 존재 + size>0 + %PDF 헤더 확인 대상 */
export const RELEASE_PDF: string[] = [
  'book.preview.pdf',
  'book.modern.pdf',
  'book.editorial.pdf',
  'book.dashboard.pdf',
  'book.bento.pdf',
];
