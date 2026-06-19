/**
 * Ebook Publishing System — Preview Promo(SNS) 캔버스 파일명/규격 (순수)
 *
 * book.preview.html 의 preview 선별 컴포넌트 기반 SNS 홍보 이미지.
 *   book.preview.square.html/png (1080×1080)
 *   book.preview.story.html/png  (1080×1920)
 */

export type PromoKind = 'square' | 'story';

export interface PromoSpec {
  kind: PromoKind;
  width: number;
  height: number;
}

export const PREVIEW_PROMO_SPECS: PromoSpec[] = [
  { kind: 'square', width: 1080, height: 1080 },
  { kind: 'story', width: 1080, height: 1920 },
];

export function previewPromoHtmlName(kind: PromoKind): string {
  return `book.preview.${kind}.html`;
}

export function previewPromoPngName(kind: PromoKind): string {
  return `book.preview.${kind}.png`;
}
