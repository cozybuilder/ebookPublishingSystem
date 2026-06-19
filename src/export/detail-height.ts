/**
 * Ebook Publishing System — detail 캔버스 자동 높이 계산 (PNG export v2)
 *
 * 측정값(또는 측정 실패)을 받아 최종 캡처 높이를 결정하는 순수 함수.
 * 외부 의존성 없음 — 단위 테스트 가능.
 */

export const DETAIL_MIN_HEIGHT = 1200;
export const DETAIL_MAX_HEIGHT = 12000;
export const DETAIL_PADDING = 40;
/** 측정 실패 시 fallback (v1 의 고정 높이) */
export const DETAIL_FALLBACK_HEIGHT = 2600;

/**
 * 측정된 콘텐츠 높이로부터 최종 export 높이를 계산한다.
 *  - 여유 padding(+40) 추가
 *  - [MIN, MAX] 로 clamp
 *  - 정수화
 * @param measured 측정 높이(px). 유효하지 않으면(undefined/NaN/<=0) fallback 사용.
 */
export function resolveDetailHeight(measured: number | undefined | null): number {
  if (measured === undefined || measured === null || !Number.isFinite(measured) || measured <= 0) {
    return DETAIL_FALLBACK_HEIGHT;
  }
  const withPad = Math.ceil(measured) + DETAIL_PADDING;
  return Math.max(DETAIL_MIN_HEIGHT, Math.min(DETAIL_MAX_HEIGHT, withPad));
}

/** 측정 실패 여부(로그/마커용). */
export function isMeasurementValid(measured: number | undefined | null): boolean {
  return typeof measured === 'number' && Number.isFinite(measured) && measured > 0;
}
