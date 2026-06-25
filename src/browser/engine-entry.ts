/**
 * Ebook Publishing System — 브라우저용 엔진 엔트리 (Additive)
 *
 * 목적: Studio 셸(웹)이 책 내용 렌더링을 기존 Engine 파이프라인에 위임할 수 있도록,
 *       parser → buildPages → mapComponents → applyLayout → theme-engine → html-renderer
 *       를 단일 브라우저 번들로 노출한다.
 *
 * 원칙:
 *  - 엔진 로직(src/parser, component-mapper, layout-engine, theme-engine, html-renderer, charts) 무수정.
 *  - 이 파일은 "조립 + 노출"만 한다(얇은 어댑터).
 *  - 제외: export-pdf/docx/epub, node:fs, child_process, cover-resolver 의 파일 읽기.
 *    → 이미지(data URI)는 호출자가 주입한다(fs 미사용).
 *
 * 빌드: `npm run build:browser-engine` → public/apps/ebook/engine.bundle.js (esbuild, IIFE, global=EbookEngine)
 */

import { parseBook } from '../parser/parser.ts';
import { buildPages } from '../page-builder/page-builder.ts';
import { mapComponents } from '../component-mapper/component-mapper.ts';
import { applyLayout } from '../layout-engine/layout-engine.ts';
import { renderHtml } from '../html-renderer/html-renderer.ts';
import { resolveThemeByName, mergeTokens } from '../theme-engine/theme-engine.ts';
import { FullBookPDF } from '../page-builder/profiles.ts';
import type { ComponentPage } from '../types/component.ts';
import type { DesignTokens } from '../types/design.ts';
import type { ThemeName } from '../types/theme.ts';

/** 슬라이더/디자인 입력 → DesignTokens 부분 오버라이드(깊은 병합). 전부 선택값. */
export interface TokenOverride {
  fontFamily?: string;
  scale?: Partial<DesignTokens['typography']['scale']>;
  lineHeight?: Partial<DesignTokens['typography']['lineHeight']>;
  spacing?: Partial<DesignTokens['spacing']>;
}

export interface RenderOptions {
  /** 이미지 id → data URI 맵(Studio 슬롯에서 주입). cover-resolver(fs) 대체. */
  images?: Record<string, string>;
  /** 테마 이름(별칭 허용). 기본 ModernGlass. */
  themeName?: string;
  /** 디자인 슬라이더 값 → 토큰 오버라이드. */
  tokenOverride?: TokenOverride;
  /** 문서 제목(미지정 시 책 메타데이터 제목). */
  title?: string;
}

/** ImageBlock 에 호출자가 준 data URI 주입(자산 없으면 placeholder 유지 — 무회귀). */
function embedImages(pages: ComponentPage[], images?: Record<string, string>): ComponentPage[] {
  if (!images) return pages;
  for (const p of pages) {
    for (const c of p.components) {
      if (c.type === 'ImageBlock' && !c.src && images[c.id]) c.src = images[c.id];
    }
  }
  return pages;
}

function withOverride(tokens: DesignTokens, ov?: TokenOverride): DesignTokens {
  if (!ov) return tokens;
  // mergeTokens = deepMerge(base, override). 부분 객체만 넘긴다(엔진 병합 로직 재사용).
  const override: Record<string, unknown> = {};
  const typo: Record<string, unknown> = {};
  if (ov.fontFamily) typo.fontFamily = ov.fontFamily;
  if (ov.scale) typo.scale = ov.scale;
  if (ov.lineHeight) typo.lineHeight = ov.lineHeight;
  if (Object.keys(typo).length) override.typography = typo;
  if (ov.spacing) override.spacing = ov.spacing;
  return mergeTokens(tokens, override as Parameters<typeof mergeTokens>[1]);
}

/**
 * Markdown 원고 → 완성된 책 HTML(<!DOCTYPE> + <style> + 페이지들).
 * Studio 는 이 결과를 Shadow DOM 안에 주입한다(전역 CSS 격리).
 */
export function renderBookHtml(markdown: string, opts: RenderOptions = {}): string {
  const book = parseBook(markdown);
  const title = opts.title || book.metadata.title || '제목 없음';
  const theme = resolveThemeByName((opts.themeName as ThemeName) || 'ModernGlass');
  const tokens = withOverride(theme.tokens, opts.tokenOverride);
  // 본문 전체(49 컴포넌트) 경로 — Front Matter/fs 미사용(브라우저 미리보기용).
  const pages = embedImages(mapComponents(book, buildPages(book, FullBookPDF)), opts.images);
  const layout = applyLayout(pages, tokens);
  return renderHtml(layout, tokens, title, theme.recipe);
}

// 저수준 파이프라인도 노출(STEP2 에서 토큰 매핑을 유연하게 다루기 위해).
export {
  parseBook,
  buildPages,
  mapComponents,
  applyLayout,
  renderHtml,
  resolveThemeByName,
  mergeTokens,
  FullBookPDF,
};
