/**
 * Ebook Publishing System — Theme v4 Preview/Showcase Layer (엔진 밖, 분리)
 *
 * theme-engine(v3) 코어는 동결. 이 레이어는 판매 접점용 "고급 매거진" 비주얼을
 * 별도로 만든다. 2차 방향(재설정):
 *   - 레퍼런스: Apple / Notion / Stripe / Kinfolk / Monocle
 *   - 컬러: White · Warm Gray · Charcoal + Accent Deep Navy (Gold/Emerald/럭셔리 제거)
 *   - 이미지 주도(텍스트 중심 금지), 대담한 헤드라인·여백, 카드형 정보, 그림자 최소
 *
 * 실사진이 없을 때도 잡지 느낌을 내기 위해 이미지 존을 미니멀 편집 그래픽(인라인 SVG)으로 채운다.
 * 실제 이미지(assets/images)가 들어오면 그 자리에 사진을 넣는 구조.
 *
 * 시안 2종: 'magazine'(Kinfolk/Monocle 에디토리얼), 'brand'(Apple/Stripe/Notion 모던).
 *
 * 주의: erasable syntax only. 외부 의존성 0(순수 HTML/CSS/SVG 문자열).
 */

import type { Book } from '../types/ast.ts';

export type ShowcaseVariant = 'magazine' | 'brand';
export const SHOWCASE_VARIANTS: ShowcaseVariant[] = ['magazine', 'brand'];

export interface ShowcaseData {
  title: string;
  subtitle: string;
  author: string;
  chapters: { number: number; title: string }[];
  highlights: string[];
  stats: { chapters: number; blocks: number; images: number };
}

// ── 공통 팔레트 (White · Warm Gray · Charcoal + Deep Navy) ──
const PAPER = '#FAF8F3'; // warm white
const WHITE = '#FFFFFF';
const WARM = '#EAE5DC'; // warm gray (image field base)
const WARM_LINE = '#D8D2C6';
const CHARCOAL = '#26272B';
const INK = '#1A1B1E';
const MUTED = '#85807A';
const NAVY = '#1B2A4A'; // single accent

function textOf(b: unknown): string {
  const t = (b as { text?: string }).text;
  return typeof t === 'string' ? t.trim() : '';
}

export function buildShowcaseData(book: Book): ShowcaseData {
  const allBlocks = book.chapters.flatMap((c) => c.blocks);
  const results = allBlocks.filter((b) => b.type === 'result').map(textOf).filter(Boolean);
  const firstParas = book.chapters
    .map((c) => textOf(c.blocks.find((b) => b.type === 'paragraph')))
    .filter(Boolean);
  const highlights = (results.length ? results : firstParas).slice(0, 3);

  return {
    title: book.metadata.title,
    subtitle: book.metadata.subtitle ?? '',
    author: book.metadata.author ?? 'CozyBuilder Lab',
    chapters: book.chapters.map((c) => ({ number: c.number, title: c.title })),
    highlights,
    stats: {
      chapters: book.chapters.length,
      blocks: allBlocks.length,
      images: allBlocks.filter((b) => b.type === 'image').length,
    },
  };
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function clip(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t;
}

/** 미니멀 편집 그래픽(이미지 존). 사진이 들어올 자리. flat, navy+warm+charcoal. */
function heroSvg(kind: 'aperture' | 'strata' | 'frame'): string {
  const open = '<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">';
  if (kind === 'strata') {
    return `${open}
      <rect width="100" height="100" fill="${WARM}"/>
      <rect width="100" height="38" fill="${NAVY}"/>
      <rect y="38" width="100" height="9" fill="${CHARCOAL}"/>
      <circle cx="78" cy="19" r="11" fill="none" stroke="${WARM}" stroke-width="0.8" opacity="0.6"/>
    </svg>`;
  }
  if (kind === 'frame') {
    return `${open}
      <rect width="100" height="100" fill="${WARM}"/>
      <rect x="14" y="14" width="72" height="72" fill="none" stroke="${NAVY}" stroke-width="1"/>
      <rect x="22" y="22" width="40" height="40" fill="${NAVY}" opacity="0.92"/>
      <line x1="62" y1="62" x2="86" y2="86" stroke="${CHARCOAL}" stroke-width="1"/>
    </svg>`;
  }
  // aperture
  return `${open}
    <rect width="100" height="100" fill="${WARM}"/>
    <circle cx="70" cy="74" r="42" fill="${NAVY}"/>
    <circle cx="70" cy="74" r="42" fill="none" stroke="${CHARCOAL}" stroke-width="0.6" opacity="0.5"/>
    <circle cx="70" cy="74" r="54" fill="none" stroke="${CHARCOAL}" stroke-width="0.5" opacity="0.35"/>
    <rect x="12" y="12" width="14" height="14" fill="${CHARCOAL}"/>
  </svg>`;
}

interface Tokens {
  bg: string;
  ink: string;
  display: string;
  label: string;
  titlePt: number;
  serif: boolean;
}
const TOKENS: Record<ShowcaseVariant, Tokens> = {
  magazine: {
    bg: PAPER,
    ink: CHARCOAL,
    display: "Georgia, 'Times New Roman', serif",
    label: "'Helvetica Neue', Arial, sans-serif",
    titlePt: 46,
    serif: true,
  },
  brand: {
    bg: WHITE,
    ink: INK,
    display: "'Helvetica Neue', Arial, sans-serif",
    label: "'Helvetica Neue', Arial, sans-serif",
    titlePt: 52,
    serif: false,
  },
};

function css(t: Tokens): string {
  return `
  @page { size: 152mm 229mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: ${t.bg}; color: ${t.ink}; font-family: ${t.label}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { position: relative; width: 152mm; height: 229mm; overflow: hidden; page-break-after: always; background: ${t.bg}; }
  .page:last-child { page-break-after: auto; }
  .pad { padding: 16mm 15mm; }
  .eyebrow { font-size: 9pt; letter-spacing: .38em; text-transform: uppercase; color: ${NAVY}; font-weight: 700; }
  .muted { color: ${MUTED}; }
  .hairline { height: 1px; background: ${WARM_LINE}; border: 0; }
  .navybar { height: 3px; width: 46px; background: ${NAVY}; border: 0; }

  /* Cover — 이미지 주도 */
  .cover-hero { position: absolute; top: 0; left: 0; right: 0; height: 60%; }
  .cover-band { position: absolute; left: 0; right: 0; bottom: 0; height: 40%; background: ${t.bg}; padding: 12mm 15mm 14mm; display: flex; flex-direction: column; }
  .cover-title { font-family: ${t.display}; font-weight: 700; font-size: ${t.titlePt}pt; line-height: .98; letter-spacing: -.02em; color: ${t.ink}; }
  .cover-sub { font-size: 12pt; line-height: 1.5; color: ${MUTED}; margin-top: 7mm; max-width: 90%; ${t.serif ? `font-family:${t.display}; font-style:italic;` : ''} }
  .cover-foot { margin-top: auto; display: flex; align-items: center; gap: 5mm; }
  .cover-author { font-size: 10.5pt; font-weight: 700; letter-spacing: .02em; color: ${t.ink}; }
  .cover-brand { font-size: 8.5pt; letter-spacing: .3em; text-transform: uppercase; color: ${MUTED}; }

  /* Contents — 썸네일 있는 매거진 목차 */
  .h-kicker { font-family: ${t.display}; font-weight: 700; font-size: 30pt; color: ${t.ink}; letter-spacing: -.01em; }
  .toc-row { display: flex; align-items: center; gap: 7mm; padding: 6mm 0; }
  .toc-thumb { width: 26mm; height: 18mm; flex: none; overflow: hidden; border-radius: 2px; }
  .toc-num { font-family: ${t.display}; font-size: 13pt; font-weight: 700; color: ${NAVY}; width: 22px; }
  .toc-name { font-size: 14pt; font-weight: 700; color: ${t.ink}; line-height: 1.2; }

  /* Showcase — 큰 이미지 + 카드 */
  .feature { width: 100%; height: 64mm; overflow: hidden; border-radius: 2px; }
  .stats { display: flex; gap: 12mm; margin: 10mm 0; }
  .stat-n { font-family: ${t.display}; font-size: 30pt; font-weight: 700; color: ${NAVY}; line-height: 1; }
  .stat-l { font-size: 8pt; letter-spacing: .26em; text-transform: uppercase; color: ${MUTED}; margin-top: 2.5mm; }
  .cards { display: flex; flex-direction: column; gap: 5mm; }
  .card { background: ${WHITE}; border: 1px solid ${WARM_LINE}; border-left: 3px solid ${NAVY}; border-radius: 0; padding: 6mm 7mm; }
  .card-k { font-size: 8pt; letter-spacing: .28em; text-transform: uppercase; color: ${NAVY}; font-weight: 700; }
  .card-v { font-family: ${t.display}; font-size: 13pt; line-height: 1.5; color: ${t.ink}; margin-top: 2.5mm; }
  `;
}

function coverPage(d: ShowcaseData, t: Tokens): string {
  return `
  <section class="page">
    <div class="cover-hero">${heroSvg('aperture')}</div>
    <div class="cover-band">
      <div class="eyebrow">Premium edition</div>
      <h1 class="cover-title" style="margin-top:6mm">${esc(d.title)}</h1>
      <hr class="navybar" style="margin-top:7mm" />
      ${d.subtitle ? `<p class="cover-sub">${esc(d.subtitle)}</p>` : ''}
      <div class="cover-foot">
        <span class="cover-author">${esc(d.author)}</span>
        <span class="cover-brand">CozyBuilder Lab</span>
      </div>
    </div>
  </section>`;
}

function tocPage(d: ShowcaseData, t: Tokens): string {
  const kinds: ('aperture' | 'strata' | 'frame')[] = ['strata', 'frame', 'aperture'];
  const rows = d.chapters
    .map(
      (c, i) => `
      <div class="toc-row">
        <div class="toc-thumb">${heroSvg(kinds[i % kinds.length])}</div>
        <div class="toc-num">${String(c.number).padStart(2, '0')}</div>
        <div class="toc-name">${esc(c.title)}</div>
      </div>
      <hr class="hairline" />`,
    )
    .join('');
  return `
  <section class="page pad">
    <div class="eyebrow">Contents</div>
    <h2 class="h-kicker" style="margin-top:5mm">목차</h2>
    <hr class="hairline" style="margin-top:9mm" />
    ${rows}
  </section>`;
}

function showcasePage(d: ShowcaseData, t: Tokens): string {
  const cards = d.highlights
    .map(
      (h, i) => `
      <div class="card">
        <div class="card-k">Inside ${String(i + 1).padStart(2, '0')}</div>
        <div class="card-v">${esc(clip(h, 110))}</div>
      </div>`,
    )
    .join('');
  return `
  <section class="page pad">
    <div class="feature">${heroSvg('strata')}</div>
    <div class="stats">
      <div><div class="stat-n">${d.stats.chapters}</div><div class="stat-l">Chapters</div></div>
      <div><div class="stat-n">${d.stats.blocks}</div><div class="stat-l">Visual blocks</div></div>
      <div><div class="stat-n">${d.stats.images}</div><div class="stat-l">Images</div></div>
    </div>
    <div class="cards">${cards}</div>
  </section>`;
}

export function renderShowcaseHtml(d: ShowcaseData, variant: ShowcaseVariant): string {
  const t = TOKENS[variant];
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(d.title)} — ${variant}</title><style>${css(t)}</style></head><body>${coverPage(d, t)}${tocPage(d, t)}${showcasePage(d, t)}</body></html>`;
}
