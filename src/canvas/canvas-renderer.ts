/**
 * Ebook Publishing System — Image Canvas Renderer (v1)
 *
 * Bento 스타일을 재사용하되, 책 전체가 아니라 선별된 대표 컴포넌트만
 * 고정 규격 캔버스(.canvas)에 담아 브라우저 캡처용 HTML 을 생성한다.
 *
 * 원칙: PNG/JPG 변환·외부 라이브러리 없음. book.*.html 출력과 분리.
 */

import { buildCss, renderLayoutComponent } from '../html-renderer/html-renderer.ts';
import type { DesignTokens, LayoutComponent } from '../types/design.ts';
import type { StyleRecipe } from '../types/theme.ts';
import type { CanvasProfile } from './canvas-profiles.ts';

const CTA_TITLE = 'CozyBuilder Lab';
const CTA_SUB = '읽히는 전자책을 상품처럼 만듭니다';

/** 캔버스 전용 CSS (배경/스테이지/규격/기준선/CTA). Bento CSS 위에 얹는다. */
const CANVAS_CSS = `
body.canvas-body {
  margin: 0; padding: 48px; background: #cfd4db;
  display: flex; flex-direction: column; align-items: center; gap: 48px;
  font-family: var(--font); color: var(--ink);
}
/* 캔버스 영역(캡처 대상) — 배경과 명확히 구분 */
.canvas {
  position: relative; background: #ffffff; overflow: hidden;
  box-shadow: 0 24px 70px rgba(16,24,40,.28); border-radius: 6px;
}
/* viewport/preview 기준선 */
.canvas::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 5;
  border: 1px dashed rgba(31,45,90,.18); border-radius: 6px;
}
.canvas[data-canvas]::after {
  content: attr(data-spec); position: absolute; top: 10px; left: 14px; z-index: 6;
  font-size: 11px; letter-spacing: .1em; color: #98a3b4;
  background: #fff; padding: 2px 8px; border-radius: 6px; border: 1px solid #e7eaef;
}
.canvas .page-body { margin: 0; }
.grid-bento.canvas-single { grid-template-columns: 1fr !important; }

/* 규격 */
.canvas-detail { width: 860px; padding: 64px 48px; }
.canvas-square { width: 1080px; height: 1080px; padding: 80px 64px; }
.canvas-story  { width: 1080px; height: 1920px; padding: 110px 72px; }

/* CTA */
.canvas-cta { margin-top: 36px; text-align: center; border-top: 1px solid #e7eaef; padding-top: 28px; }
.canvas-cta strong { display: block; font-size: 24px; font-weight: 800; color: var(--navy); letter-spacing: -0.01em; }
.canvas-cta span { display: block; margin-top: 6px; font-size: 15px; color: #6b7280; }

/* ===== Auto-Fit: density 별 표현 (고정 높이 캔버스) ===== */
/* compact: 패딩/간격/폰트 약간 축소 */
.canvas-fit-compact .grid-bento { gap: 16px; }
.canvas-fit-compact .card { padding: 20px 22px; }
.canvas-fit-compact [data-type="ResultCard"] .ty-body { font-size: 22px; line-height: 1.3; }
.canvas-fit-compact [data-type="ChapterHeading"] .ty-chapter { font-size: 36px; }
.canvas-fit-compact [data-type="QuoteBlock"] .quote p { font-size: 24px; }

/* tight: 더 강한 축소 */
.canvas-fit-tight .grid-bento { gap: 12px; }
.canvas-fit-tight .card { padding: 16px 18px; }
.canvas-fit-tight [data-type="ResultCard"] .ty-body { font-size: 19px; line-height: 1.25; }
.canvas-fit-tight [data-type="ChapterHeading"] .ty-chapter { font-size: 30px; }
.canvas-fit-tight [data-type="QuoteBlock"] .quote p { font-size: 20px; }

/* ===== 긴 텍스트 안전 처리 (외부 라이브러리 없이 CSS만) ===== */
/* 고정 높이 캔버스에서 긴 문장은 의도된 말줄임으로 보이게 한다 */
.canvas-fit .canvas-clamp,
.canvas-fit [data-type="ResultCard"] .ty-body,
.canvas-fit [data-type="QuoteBlock"] .quote p,
.canvas-fit [data-type="ParagraphBlock"] .ty-body {
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5;
  overflow: hidden; max-height: 9.5em;
}
.canvas-fit-tight [data-type="ResultCard"] .ty-body,
.canvas-fit-tight [data-type="QuoteBlock"] .quote p { -webkit-line-clamp: 4; }
/* 체크리스트가 너무 길면 카드 자체를 넘치지 않게 */
.canvas-fit [data-type="ChecklistCard"] .checklist { max-height: none; }

/* flow: 가변 높이(detail) — 클램프/높이 제한 없음 */
.canvas-fit-flow .card { }
`.trim();

function pickComponents(all: LayoutComponent[], profile: CanvasProfile): LayoutComponent[] {
  const allowed = new Set<string>(profile.pick);
  let sel = all.filter((c) => allowed.has(c.componentType));
  // auto-fit: fit.maxComponents 와 profile.limit 중 더 엄격한 값으로 제한
  const cap = Math.min(profile.fit.maxComponents, profile.limit ?? Infinity);
  if (Number.isFinite(cap)) sel = sel.slice(0, cap);
  return sel;
}

/** 선별된 레이아웃 컴포넌트로 캔버스 HTML 문서를 생성한다. */
export function renderCanvas(
  all: LayoutComponent[],
  tokens: DesignTokens,
  recipe: StyleRecipe,
  profile: CanvasProfile,
  docTitle: string,
): string {
  const css = buildCss(tokens, recipe); // Bento(gridStyle:bento) → BENTO_V2_CSS 포함
  const selected = pickComponents(all, profile);
  const inner = selected.map(renderLayoutComponent).join('\n    ');
  const singleCls = profile.singleColumn ? ' canvas-single' : '';

  // auto-fit 마커: 고정 높이는 density, 가변(detail)은 flow
  const fitKey = profile.fit.mode === 'flow' ? 'flow' : profile.fit.density;
  const fitClass = `canvas-fit canvas-fit-${fitKey}`;
  const spec = `${profile.width}×${profile.height ?? 'auto'} · ${fitKey.toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${docTitle} — canvas:${profile.name}</title>
<style>
${css}
${CANVAS_CSS}
</style>
</head>
<body class="canvas-body">
  <section class="canvas canvas-${profile.name} ${fitClass}" data-canvas="${profile.name}" data-fit="${fitKey}" data-spec="${spec}">
    <div class="page-body grid-bento${singleCls}">
    ${inner}
    </div>
    <div class="canvas-cta">
      <strong>${CTA_TITLE}</strong>
      <span>${CTA_SUB}</span>
    </div>
  </section>
</body>
</html>
`;
}
