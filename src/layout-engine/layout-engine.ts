/**
 * Ebook Publishing System — Layout Engine (v0.1)
 *
 * ComponentPage + DesignTokens → LayoutPage 목록.
 *
 * 기준 문서: docs/04_PIPELINE.md [6], docs/08_DESIGN_SYSTEM.md
 *
 * v0.1 범위:
 *  - 각 컴포넌트에 componentId 부여
 *  - pageType / componentType 유지
 *  - tone / typography role / spacing token / radius token 부여
 *  - canvas 정보 부여(이미지 캔버스 프로파일에서만; PDF는 null)
 *  하지 않는 것: PDF/DOCX/이미지 렌더링, 실제 페이지 넘김, 좌표 계산.
 */

import type { ComponentPage } from '../types/component.ts';
import type { ComponentType } from '../types/component.ts';
import type {
  DesignTokens,
  LayoutComponent,
  LayoutPage,
  RadiusToken,
  SpacingToken,
  Tone,
  TypographyRole,
} from '../types/design.ts';

// ----- 컴포넌트 → 토큰 역할 매핑 -----

const TONE_BY_COMPONENT: Partial<Record<ComponentType, Tone>> = {
  WarningCard: 'emphasis',
  ResultCard: 'emphasis',
  PromptCard: 'info',
  StepsCard: 'info',
  FAQCard: 'info',
  ChecklistCard: 'neutral',
  TableCard: 'neutral',
  CompareCard: 'neutral',
  BeforeAfterCard: 'neutral',
};

const TYPOGRAPHY_BY_COMPONENT: Partial<Record<ComponentType, TypographyRole>> = {
  TitleBlock: 'title',
  SubtitleBlock: 'emphasis',
  AuthorBlock: 'caption',
  ChapterHeading: 'chapter',
  CopyrightNotice: 'caption',
  ImageBlock: 'caption',
  // 나머지(Paragraph/카드/TOCList)는 기본 body
};

const RADIUS_BY_COMPONENT: Partial<Record<ComponentType, RadiusToken>> = {
  ImageBlock: 'image',
  ChecklistCard: 'card',
  TableCard: 'card',
  CompareCard: 'card',
  BeforeAfterCard: 'card',
  PromptCard: 'card',
  StepsCard: 'card',
  FAQCard: 'card',
  WarningCard: 'card',
  ResultCard: 'card',
};

const SPACING_BY_COMPONENT: Partial<Record<ComponentType, SpacingToken>> = {
  TitleBlock: 'xl',
  ChapterHeading: 'xl',
  SubtitleBlock: 'sm',
  AuthorBlock: 'sm',
  CopyrightNotice: 'sm',
};

function toneFor(ct: ComponentType): Tone {
  return TONE_BY_COMPONENT[ct] ?? 'neutral';
}
function typographyFor(ct: ComponentType): TypographyRole {
  return TYPOGRAPHY_BY_COMPONENT[ct] ?? 'body';
}
function radiusFor(ct: ComponentType): RadiusToken | null {
  return RADIUS_BY_COMPONENT[ct] ?? null;
}
function spacingFor(ct: ComponentType): SpacingToken {
  return SPACING_BY_COMPONENT[ct] ?? 'md';
}

/** ComponentPage 목록에 디자인 토큰을 적용해 LayoutPage 목록을 만든다. */
export function applyLayout(pages: ComponentPage[], _tokens: DesignTokens): LayoutPage[] {
  let counter = 0;
  const nextId = (): string => `cmp-${String(++counter).padStart(4, '0')}`;

  return pages.map((page) => {
    const components: LayoutComponent[] = page.components.map((component) => ({
      componentId: nextId(),
      componentType: component.type,
      tone: toneFor(component.type),
      typographyRole: typographyFor(component.type),
      spacing: spacingFor(component.type),
      radius: radiusFor(component.type),
      bounds: null, // v0.1: 좌표 미계산
      component,
    }));

    return {
      pageType: page.type,
      chapterIndex: page.chapterIndex,
      canvas: null, // PDF(fixed) 프로파일은 페이지 캔버스 없음. 이미지 프로파일에서 채움(추후)
      components,
    };
  });
}
