/**
 * Ebook Publishing System — 승인된 디자인 토큰 v0.1
 *
 * 기준: docs/08_DESIGN_SYSTEM.md (코비 리뷰 → 코지 확인 → 승인 완료).
 * 변경은 디자인 승인 절차를 거쳐야 한다.
 */

import type { DesignTokens } from '../types/design.ts';

export const DEFAULT_TOKENS: DesignTokens = {
  colors: {
    navy: '#1F2D5A',
    orange: '#F5821F',
    cyan: '#1FB6C9',
    ink: '#1A1A1A',
    gray: '#9AA0A6',
    paper: '#FFFFFF',
  },
  typography: {
    fontFamily: 'system',
    scale: { title: 40, chapter: 28, body: 16, caption: 12, emphasis: 18 },
    lineHeight: { body: 1.7, heading: 1.3 },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 },
  radius: { card: 12, image: 8 },
  cardTone: {
    warning: 'emphasis',
    result: 'emphasis',
    prompt: 'info',
    steps: 'info',
    faq: 'info',
    checklist: 'neutral',
    table: 'neutral',
    compare: 'neutral',
    'before-after': 'neutral',
  },
  canvas: {
    square: { ratio: '1:1', width: 1080, height: 1080 },
    vertical: { ratio: '9:16', width: 1080, height: 1920 },
    detailBanner: { ratio: 'verticalLong', width: 1080, height: 3240 },
  },
};
