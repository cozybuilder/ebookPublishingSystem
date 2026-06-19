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
import { scopePages, pageScopeLabel } from './page-builder/page-scope.ts';
import { mapComponents } from './component-mapper/component-mapper.ts';
import { applyLayout } from './layout-engine/layout-engine.ts';
import { renderHtml } from './html-renderer/html-renderer.ts';
import { FullBookPDF, ChecklistPDF, KmongPreviewPDF } from './page-builder/profiles.ts';
import { select } from './selector/selector.ts';
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

function render(book: Book, profile: OutputProfile, theme: ResolvedTheme, docTitle: string): string {
  // componentSelector 가 지정된 프로파일만 선별 경로(미지정 → 기존 전체 출력 경로 유지).
  if (profile.componentSelector) {
    // [순서] Page Selector → Component Selector
    const scoped = scopePages(buildPages(book, profile), profile.selector); // 1) 페이지 범위 제한(챕터 윈도우)
    const compPages = mapComponents(book, scoped);
    const flat = compPages.flatMap((p) => p.components);

    const policy = profile.componentSelector; // 2) 컴포넌트 큐레이션
    const primaryAllow = new Set<ComponentType>([...policy.prefer, ...(policy.require ?? [])]);
    const r = select(flat, (c) => c.type, policy, { cap: flat.length, primaryAllow });
    const page: ComponentPage = { type: 'ContentPage', components: r.items };
    const layout = applyLayout([page], theme.tokens);
    return renderHtml(layout, theme.tokens, docTitle, theme.recipe, policy.strategy, pageScopeLabel(profile.selector));
  }

  // 기존 전체 출력 경로(변화 없음)
  const layout = applyLayout(mapComponents(book, buildPages(book, profile)), theme.tokens);
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

  const forced = normalizeThemeName(parseThemeArg());

  // 메인 출력: --theme 강제값 우선, 없으면 프로파일 기본 테마(현재 ModernGlass)
  const fullTheme = forced ? resolveThemeByName(forced) : resolveThemeForProfile('FullBookPDF');
  const checklistTheme = forced ? resolveThemeByName(forced) : resolveThemeForProfile('ChecklistPDF');

  console.log('✓ HTML 빌드 완료 (Theme Engine 연동, default=ModernGlass)');
  console.log(`  입력 : ${inputPath}`);
  write(out('book.html'), render(book, FullBookPDF, fullTheme, title), `[FullBookPDF / ${fullTheme.name}]`);
  write(
    out('book.checklist.html'),
    render(book, ChecklistPDF, checklistTheme, `${title} — 체크리스트`),
    `[ChecklistPDF / ${checklistTheme.name}]`,
  );

  // Modern Glass 검수용 명시 출력(항상 생성)
  const modern = resolveThemeByName('ModernGlass');
  write(
    out('book.modern.html'),
    render(book, FullBookPDF, modern, `${title} (Modern Glass)`),
    '[FullBookPDF / ModernGlass]',
  );

  // Bento 검수용 명시 출력(항상 생성)
  const bento = resolveThemeByName('Bento');
  write(out('book.bento.html'), render(book, FullBookPDF, bento, `${title} (Bento)`), '[FullBookPDF / Bento]');

  // Editorial 검수용 명시 출력(항상 생성)
  const editorial = resolveThemeByName('Editorial');
  write(
    out('book.editorial.html'),
    render(book, FullBookPDF, editorial, `${title} (Editorial)`),
    '[FullBookPDF / Editorial]',
  );

  // Dashboard 검수용 명시 출력(항상 생성)
  const dashboard = resolveThemeByName('Dashboard');
  write(
    out('book.dashboard.html'),
    render(book, FullBookPDF, dashboard, `${title} (Dashboard)`),
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
