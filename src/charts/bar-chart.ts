/**
 * Ebook Publishing System — Bar Chart SVG 생성 (정적, 의존성 0)
 *
 * HTML/EPUB 렌더러가 공유. 막대(Primary #2563EB) + y축 자동 눈금 + 값/라벨.
 * 주의: erasable syntax only. 순수 함수(부수효과 없음).
 */

function esc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 데이터 최대값 → 보기 좋은 상한(1/2/5 × 10^n) */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / pow;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nf * pow;
}

function fmt(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** labels/values → Bar Chart SVG 문자열(<svg>…</svg>). 개수는 min(labels,values) 으로 안전 처리. */
export function buildBarSvg(labels: string[], values: number[]): string {
  const n = Math.min(labels.length, values.length);
  if (n === 0) return '';
  const W = 380;
  const H = 210;
  const left = 44;
  const right = 364;
  const top = 16;
  const bottom = 170;
  const plotH = bottom - top;
  const plotW = right - left;
  const max = niceMax(Math.max(...values.slice(0, n), 0));
  const slotW = plotW / n;
  const barW = Math.min(slotW * 0.55, 56);
  const yOf = (v: number): number => bottom - (v / max) * plotH;

  let grid = '';
  for (let i = 0; i <= 4; i++) {
    const v = (max * i) / 4;
    const y = yOf(v);
    grid +=
      `<line x1="${left}" y1="${y.toFixed(1)}" x2="${right}" y2="${y.toFixed(1)}" stroke="${i === 0 ? '#E5E7EB' : '#F1F3F6'}"/>` +
      `<text x="${left - 6}" y="${(y + 3).toFixed(1)}" font-size="9" fill="#9CA3AF" text-anchor="end">${fmt(v)}</text>`;
  }

  let bars = '';
  for (let i = 0; i < n; i++) {
    const cx = left + slotW * i + slotW / 2;
    const v = values[i];
    const y = yOf(v);
    const h = bottom - y;
    bars +=
      `<rect x="${(cx - barW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="#2563EB"/>` +
      `<text x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}" font-size="10" font-weight="700" fill="#1D4ED8" text-anchor="middle">${esc(fmt(v))}</text>` +
      `<text x="${cx.toFixed(1)}" y="186" font-size="10" fill="#374151" text-anchor="middle">${esc(labels[i])}</text>`;
  }

  const axisY = `<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#E5E7EB"/>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" role="img">${grid}${axisY}${bars}</svg>`;
}
