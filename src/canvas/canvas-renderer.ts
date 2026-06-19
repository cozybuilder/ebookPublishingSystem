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
`.trim();

function pickComponents(all: LayoutComponent[], profile: CanvasProfile): LayoutComponent[] {
  const allowed = new Set<string>(profile.pick);
  let sel = all.filter((c) => allowed.has(c.componentType));
  if (typeof profile.limit === 'number') sel = sel.slice(0, profile.limit);
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
  const spec = `${profile.width}×${profile.height ?? 'auto'}`;

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
  <section class="canvas canvas-${profile.name}" data-canvas="${profile.name}" data-spec="${spec}">
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
