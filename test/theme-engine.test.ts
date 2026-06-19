/**
 * Ebook Publishing System — Theme Engine 단위 테스트 (v0.1)
 *
 * 외부 프레임워크 없이 Node 기본 기능만 사용 (의존성 0).
 * 실행: npm run test:theme  (= node test/theme-engine.test.ts)
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from '../src/parser/parser.ts';
import { buildPages } from '../src/page-builder/page-builder.ts';
import { mapComponents } from '../src/component-mapper/component-mapper.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { FullBookPDF } from '../src/page-builder/profiles.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
import {
  DEFAULT_THEME_NAME,
  getTheme,
  mergeTokens,
  normalizeThemeName,
  resolveThemeByName,
  themeNameForProfile,
} from '../src/theme-engine/theme-engine.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const samplePath = resolve(__dirname, '..', 'samples', 'parser-sample.md');

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('Theme Engine 단위 테스트 실행\n');

// --- 기본 테마 (v3: Modern Glass) ---
check('default theme = ModernGlass', DEFAULT_THEME_NAME === 'ModernGlass');
check('미지정 시 default theme 반환', getTheme().name === 'ModernGlass');

// --- 테마 선택 ---
check('ModernGlass 테마 선택 가능', getTheme('ModernGlass').name === 'ModernGlass');
check('Bento 테마 선택 가능', getTheme('Bento').name === 'Bento');
check('Minimal 테마(레거시) 선택 가능', getTheme('Minimal').name === 'Minimal');
check('theme name 정규화(modern → ModernGlass)', normalizeThemeName('modern') === 'ModernGlass');
check('theme name 정규화(bento → Bento)', normalizeThemeName('BENTO') === 'Bento');
check('theme name 정규화(minimal → Minimal)', normalizeThemeName('minimal') === 'Minimal');
check('theme name 정규화(대문자/별칭 cozy)', normalizeThemeName('COZY') === 'CozyBuilderLab');
check('알 수 없는 이름 → undefined', normalizeThemeName('rainbow') === undefined);

// --- ThemeOverride 합성 ---
const minimalTokens = resolveThemeByName('Minimal').tokens;
check('override 적용: radius.card = 4', minimalTokens.radius.card === 4, `got ${minimalTokens.radius.card}`);
check('override 적용: colors.orange 변경됨', minimalTokens.colors.orange !== DEFAULT_TOKENS.colors.orange);
check('base 상속: colors.navy 유지', minimalTokens.colors.navy === DEFAULT_TOKENS.colors.navy);
check('base 상속: spacing.md 유지', minimalTokens.spacing.md === DEFAULT_TOKENS.spacing.md);
// mergeTokens 직접 호출 검증
const merged = mergeTokens(DEFAULT_TOKENS, { radius: { card: 99 } });
check('mergeTokens: 부분 override', merged.radius.card === 99 && merged.radius.image === DEFAULT_TOKENS.radius.image);
check('mergeTokens: base 불변(원본 미변경)', DEFAULT_TOKENS.radius.card === 12);

// --- 프로파일 기본 테마 (v3) ---
check('FullBookPDF 기본 theme = ModernGlass', themeNameForProfile('FullBookPDF') === 'ModernGlass');
check('ChecklistPDF 기본 theme = ModernGlass', themeNameForProfile('ChecklistPDF') === 'ModernGlass');
check('DetailPageImages 기본 theme = Bento', themeNameForProfile('DetailPageImages') === 'Bento');
check('SNSPromoImages 기본 theme = Bento', themeNameForProfile('SNSPromoImages') === 'Bento');

// --- 합성된 theme 으로 렌더링 ---
const book = parseBook(readFileSync(samplePath, 'utf8'));
const modern = resolveThemeByName('ModernGlass');
const cozy = resolveThemeByName('CozyBuilderLab');
const layout = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), modern.tokens);

const modernHtml = renderHtml(layout, modern.tokens, 'modern', modern.recipe);
const cozyHtml = renderHtml(layout, cozy.tokens, 'cozy', cozy.recipe);

check('렌더 가능: ModernGlass HTML 생성', modernHtml.includes('<section class="page"'));
check('렌더 가능: Cozy HTML 생성', cozyHtml.includes('<section class="page"'));

// Modern Glass 방향 반영: 큰 여백 / 얇은 border / 낮은 shadow
check('ModernGlass: 큰 페이지 여백(96px 80px)', modernHtml.includes('padding: 96px 80px'));
check('ModernGlass: 얇은 연한 border(#ECEEF2)', modernHtml.includes('#ECEEF2'));
check('ModernGlass: 페이지 그림자 없음(box-shadow: none)', modernHtml.includes('box-shadow: none'));
check('ModernGlass: 큰 radius(--r-card 20px)', modernHtml.includes('--r-card: 20px'));
check('ModernGlass: 깔끔한 배경(#f6f7f9)', modernHtml.includes('#f6f7f9'));
check('ModernGlass ≠ Cozy(서로 다른 결과)', modernHtml !== cozyHtml);

// --- Bento 표현 ---
const bento = resolveThemeByName('Bento');
const bentoHtml = renderHtml(layout, bento.tokens, 'bento', bento.recipe);
check('렌더 가능: Bento HTML 생성', bentoHtml.includes('<section class="page"'));
check('Bento: 벤토 그리드 활성(grid-bento)', bentoHtml.includes('grid-bento'));
check('Modern: 세로 흐름(grid-stack)', modernHtml.includes('grid-stack'));
check('Bento ≠ Modern(명확히 다른 표현)', bentoHtml !== modernHtml);
check('Bento: 큰 라운드 타일(--r-card 22px)', bentoHtml.includes('--r-card: 22px'));
check('Bento: 카드 틴트 사용(emphasis 배경)', bentoHtml.includes('#fff6ee'));

// --- 기존 html 후크 유지(회귀 방지) ---
check('Modern: tone 클래스 유지', modernHtml.includes('tone-emphasis'));
check('Modern: Navy HEX 유지', modernHtml.includes('#1F2D5A'));

// --- 요약 ---
console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
