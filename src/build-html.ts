/**
 * Ebook Publishing System — HTML 빌드 진입점 (v0.2 — Theme Engine 연동)
 *
 * input/book.md → AST → Page → Component → Layout → (Theme 해석) → HTML → 저장.
 * 실행:
 *   npm run build:html                  기본(프로파일별 기본 테마)
 *   npm run build:html -- --theme minimal   메인 출력에 Minimal 강제 적용
 *
 * 산출물:
 *  - output/book.html, output/book.checklist.html        (메인)
 *  - output/book.minimal.html, output/book.checklist.minimal.html (Minimal 데모)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildPages } from './page-builder/page-builder.ts';
import { pageScopeLabel } from './page-builder/page-scope.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { applyLayout } from './layout-engine/layout-engine.ts';
import { renderHtml } from './html-renderer/html-renderer.ts';
import { FullBookPDF, ChecklistPDF, KmongPreviewPDF } from './page-builder/profiles.ts';
import { previewComponents } from './preview-components.ts';
import { withFrontMatterPages } from './front-matter/front-matter-apply.ts';
import { resolveCoverDataUri, resolveImageDataUri } from './assets/cover-resolver.ts';
import { loadConfigOverrides } from './front-matter/front-matter-config.ts';
import type { FrontMatterOverrides } from './front-matter/front-matter-types.ts';
import {
  normalizeThemeName,
  resolveThemeByName,
  resolveThemeForProfile,
} from './theme-engine/theme-engine.ts';
import type { Book } from './types/ast.ts';
import type { ComponentType } from './types/component.ts';
import type { ComponentPage } from './types/component.ts';
import type { OutputProfile } from './types/output.ts';
import type { ResolvedTheme } from './types/theme.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const inputPath = resolve(projectRoot, 'input', 'book.md');
const out = (name: string) => resolve(projectRoot, 'output', name);

function parseThemeArg(): string | undefined {
  const i = process.argv.indexOf('--theme');
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

// 자산 id → data URI 캐시(같은 이미지를 테마별 렌더마다 재인코딩하지 않도록).
const imageCache = new Map<string, string | null>();
function imageSrcFor(id: string): string | undefined {
  if (!imageCache.has(id)) imageCache.set(id, resolveImageDataUri(projectRoot, id));
  return imageCache.get(id) ?? undefined;
}
/** ImageBlock 에 실제 이미지(data URI)를 주입. 자산 없으면 placeholder 슬롯 유지(무회귀). */
function embedImages(pages: ComponentPage[]): ComponentPage[] {
  for (const p of pages) {
    for (const c of p.components) {
      if (c.type === 'ImageBlock' && !c.src) {
        const src = imageSrcFor(c.id);
        if (src) c.src = src;
      }
    }
  }
  return pages;
}

function render(
  book: Book,
  profile: OutputProfile,
  theme: ResolvedTheme,
  docTitle: string,
  frontMatter: FrontMatterOverrides = {},
): string {
  // componentSelector 가 지정된 프로파일만 선별 경로(미지정 → 기존 전체 출력 경로 유지).
  if (profile.componentSelector) {
    // Page range → blockLimit → Component Selector (공용 헬퍼)
    const items = previewComponents(book, profile);
    const page: ComponentPage = { type: 'ContentPage', components: items };
    const layout = applyLayout(embedImages([page]), theme.tokens);
    return renderHtml(
      layout,
      theme.tokens,
      docTitle,
      theme.recipe,
      profile.componentSelector.strategy,
      pageScopeLabel(profile.selector),
    );
  }

  // FullBook: Front Matter(표지/판권/목차/저자 소개/면책) + 본문 (기본 ON)
  if (profile.name === 'FullBookPDF') {
    const layout = applyLayout(embedImages(withFrontMatterPages(book, frontMatter)), theme.tokens);
    return renderHtml(layout, theme.tokens, docTitle, theme.recipe);
  }

  // 그 외(예: ChecklistPDF) — Front Matter 미적용, 기존 경로 유지
  const layout = applyLayout(embedImages(mapComponents(book, buildPages(book, profile))), theme.tokens);
  return renderHtml(layout, theme.tokens, docTitle, theme.recipe);
}

function write(path: string, html: string, label: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html, 'utf8');
  console.log(`  ${label} → ${path}  (${html.length} bytes)`);
}

function main(): void {
  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const title = book.metadata.title;

  // 표지 이미지(assets/images/cover.png|jpg, 또는 cover: 메타의 id) — 있으면 표지 면에 적용.
  const coverImage = resolveCoverDataUri(projectRoot, book.metadata.cover ?? 'cover') ?? undefined;
  // 책 기본정보(저작권/발행/저자 등) — 프로젝트 설정(input/book.config.json)이 있으면 사용자 값 우선.
  const config = loadConfigOverrides(resolve(projectRoot, 'input', 'book.config.json'));
  const fm: FrontMatterOverrides = { ...config, coverImage };
  if (coverImage) console.log('  표지 이미지: 적용됨 (cover 자산 발견)');
  if (Object.keys(config).length > 0) console.log(`  책 정보 설정 적용: ${Object.keys(config).join(', ')}`);

  const forced = normalizeThemeName(parseThemeArg());

  // 메인 출력: --theme 강제값 우선, 없으면 프로파일 기본 테마(현재 ModernGlass)
  const fullTheme = forced ? resolveThemeByName(forced) : resolveThemeForProfile('FullBookPDF');
  const checklistTheme = forced ? resolveThemeByName(forced) : resolveThemeForProfile('ChecklistPDF');

  console.log('✓ HTML 빌드 완료 (Theme Engine 연동, default=ModernGlass)');
  console.log(`  입력 : ${inputPath}`);
  write(out('book.html'), render(book, FullBookPDF, fullTheme, title, fm), `[FullBookPDF / ${fullTheme.name}]`);
  write(
    out('book.checklist.html'),
    render(book, ChecklistPDF, checklistTheme, `${title} — 체크리스트`),
    `[ChecklistPDF / ${checklistTheme.name}]`,
  );

  // Modern Glass 검수용 명시 출력(항상 생성)
  const modern = resolveThemeByName('ModernGlass');
  write(
    out('book.modern.html'),
    render(book, FullBookPDF, modern, `${title} (Modern Glass)`, fm),
    '[FullBookPDF / ModernGlass]',
  );

  // Bento 검수용 명시 출력(항상 생성)
  const bento = resolveThemeByName('Bento');
  write(out('book.bento.html'), render(book, FullBookPDF, bento, `${title} (Bento)`, fm), '[FullBookPDF / Bento]');

  // Editorial 검수용 명시 출력(항상 생성)
  const editorial = resolveThemeByName('Editorial');
  write(
    out('book.editorial.html'),
    render(book, FullBookPDF, editorial, `${title} (Editorial)`, fm),
    '[FullBookPDF / Editorial]',
  );

  // Dashboard 검수용 명시 출력(항상 생성)
  const dashboard = resolveThemeByName('Dashboard');
  write(
    out('book.dashboard.html'),
    render(book, FullBookPDF, dashboard, `${title} (Dashboard)`, fm),
    '[FullBookPDF / Dashboard]',
  );

  // 미리보기(판매/요약) — componentSelector(marketing) 적용
  const previewTheme = resolveThemeForProfile('KmongPreviewPDF');
  write(
    out('book.preview.html'),
    render(book, KmongPreviewPDF, previewTheme, `${title} — 미리보기`),
    `[KmongPreviewPDF / ${previewTheme.name} / selector=marketing]`,
  );
}

main();
