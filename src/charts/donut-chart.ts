/**
 * Ebook Publishing System — Donut Chart SVG 생성 (정적, 의존성 0)
 *
 * HTML/EPUB 렌더러 공유. 비율 도넛 + 중앙 라벨/합계. 4색 순환.
 * 범례는 렌더러(HTML/EPUB)에서 DONUT_COLORS 로 생성한다.
 * 주의: erasable syntax only. 순수 함수.
 */

export const DONUT_COLORS: string[] = ['#2563EB', '#16A34A', '#F59E0B', '#9CA3AF'];

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** labels/values → Donut SVG. center 라벨(선택) + 합계 표시. 개수는 min 으로 안전 처리. */
export function buildDonutSvg(labels: string[], values: number[], center: string, unit: string): string {
  const n = Math.min(labels.length, values.length);
  if (n === 0) return '';
  const vals = values.slice(0, n);
  const total = vals.reduce((a, b) => a + b, 0);
  if (total <= 0) return '';

  const r = 40;
  const C = 2 * Math.PI * r;
  let off = 0;
  let segs = '';
  for (let i = 0; i < n; i++) {
    const dash = (vals[i] / total) * C;
    const color = DONUT_COLORS[i % DONUT_COLORS.length];
    segs += `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="${dash.toFixed(1)} ${(C - dash).toFixed(1)}" stroke-dashoffset="${(-off).toFixed(1)}" transform="rotate(-90 60 60)"/>`;
    off += dash;
  }

  const sumText = `${fmt(total)}${unit ? esc(unit) : ''}`;
  const centerSvg = center
    ? `<text x="60" y="56" font-size="9" fill="#9CA3AF" text-anchor="middle">${esc(center)}</text><text x="60" y="71" font-size="13" font-weight="700" fill="#111827" text-anchor="middle">${esc(sumText)}</text>`
    : `<text x="60" y="65" font-size="13" font-weight="700" fill="#111827" text-anchor="middle">${esc(sumText)}</text>`;

  return `<svg viewBox="0 0 120 120" width="130" height="130" xmlns="http://www.w3.org/2000/svg" role="img">${segs}${centerSvg}</svg>`;
}
