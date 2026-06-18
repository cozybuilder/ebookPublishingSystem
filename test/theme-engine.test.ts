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

// --- 기본 테마 ---
check('default theme = CozyBuilderLab', DEFAULT_THEME_NAME === 'CozyBuilderLab');
check('미지정 시 default theme 반환', getTheme().name === 'CozyBuilderLab');

// --- Minimal 선택 가능 ---
check('Minimal 테마 선택 가능', getTheme('Minimal').name === 'Minimal');
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

// --- 프로파일 기본 테마 ---
check('FullBookPDF 기본 theme = CozyBuilderLab', themeNameForProfile('FullBookPDF') === 'CozyBuilderLab');
check('ChecklistPDF 기본 theme = Minimal', themeNameForProfile('ChecklistPDF') === 'Minimal');

// --- 합성된 theme 으로 렌더링 ---
const book = parseBook(readFileSync(samplePath, 'utf8'));
const cozy = resolveThemeByName('CozyBuilderLab');
const minimal = resolveThemeByName('Minimal');
const layout = applyLayout(mapComponents(book, buildPages(book, FullBookPDF)), cozy.tokens);

const cozyHtml = renderHtml(layout, cozy.tokens, 'cozy', cozy.recipe);
const minimalHtml = renderHtml(layout, minimal.tokens, 'minimal', minimal.recipe);

check('렌더 가능: Cozy HTML 생성', cozyHtml.includes('<section class="page"'));
check('렌더 가능: Minimal HTML 생성', minimalHtml.includes('<section class="page"'));
check('Minimal recipe 반영: 페이지 배경 #f5f5f4', minimalHtml.includes('#f5f5f4'));
check('Minimal recipe 반영: --r-card 4px', minimalHtml.includes('--r-card: 4px'));
check('Cozy recipe 유지: 그라데이션 배경', cozyHtml.includes('linear-gradient(180deg, #f1eee7'));
check('두 테마 결과가 서로 다름', cozyHtml !== minimalHtml);

// --- 기존 html 후크 유지(회귀 방지) ---
check('Cozy: tone-emphasis 유지', cozyHtml.includes('tone-emphasis'));
check('Cozy: Navy HEX 유지', cozyHtml.includes('#1F2D5A'));

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
