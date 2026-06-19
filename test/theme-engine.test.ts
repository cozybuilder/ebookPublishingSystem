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

// --- Bento v2 표현 ---
const bento = resolveThemeByName('Bento');
const bentoHtml = renderHtml(layout, bento.tokens, 'bento', bento.recipe);
check('렌더 가능: Bento HTML 생성', bentoHtml.includes('<section class="page"'));
check('Bento: 벤토 그리드 활성(grid-bento)', bentoHtml.includes('grid-bento'));
check('Modern: 세로 흐름(grid-stack)', modernHtml.includes('grid-stack'));
check('Bento ≠ Modern(명확히 다른 표현)', bentoHtml !== modernHtml);
check('Bento: 큰 라운드 타일(--r-card 22px)', bentoHtml.includes('--r-card: 22px'));

// Bento v2 컴포넌트 스타일
check('Bento v2: ChapterHeading hero(CHAPTER eyebrow)', bentoHtml.includes('content: "CHAPTER"'));
check('Bento v2: ResultCard highlight', bentoHtml.includes('[data-type="ResultCard"].card'));
check('Bento v2: ChecklistCard item card', bentoHtml.includes('[data-type="ChecklistCard"] .checklist li'));
check('Bento v2: StepsCard flow', bentoHtml.includes('[data-type="StepsCard"] .steps li::before'));
check('Bento v2: TableCard row card(thead 숨김)', bentoHtml.includes('[data-type="TableCard"] thead { display: none'));
check('Bento v2: CompareCard VS 구조', bentoHtml.includes('[data-type="CompareCard"]'));
check('Bento v2: WarningCard 인사이트 카드', bentoHtml.includes('[data-type="WarningCard"].card'));
check('Bento v2: ImageBlock 대표 비주얼', bentoHtml.includes('[data-type="ImageBlock"] .slot-frame'));

// Modern Glass 에 Bento v2 스타일이 섞이지 않음(규칙 출력 자체 없음)
check('무유출: Modern 에 grid-bento 규칙 없음', !modernHtml.includes('grid-bento'));
check('무유출: Modern 에 Bento hero eyebrow 없음', !modernHtml.includes('content: "CHAPTER"'));

// --- Editorial 표현 ---
check('Editorial 테마 선택 가능', getTheme('Editorial').name === 'Editorial');
check('theme name 정규화(editorial)', normalizeThemeName('Editorial') === 'Editorial');
const editorial = resolveThemeByName('Editorial');
const editorialHtml = renderHtml(layout, editorial.tokens, 'editorial', editorial.recipe);
check('렌더 가능: Editorial HTML 생성', editorialHtml.includes('<section class="page"'));
check('Editorial: var-editorial 스코프 활성', editorialHtml.includes('page-body grid-stack var-editorial'));
check('Editorial: 매거진 특집(FEATURE eyebrow)', editorialHtml.includes('content: "FEATURE"'));
check('Editorial: 읽기 컬럼(max-width 680px)', editorialHtml.includes('.page-body.var-editorial { max-width: 680px'));
check('Editorial: 세리프 제목', editorialHtml.includes('Noto Serif KR'));
check('Editorial ≠ Modern', editorialHtml !== modernHtml);
check('Editorial ≠ Bento', editorialHtml !== bentoHtml);

// Editorial 무유출: Modern / Bento 에 Editorial 규칙 없음
check('무유출: Modern 에 var-editorial 규칙 없음', !modernHtml.includes('var-editorial'));
check('무유출: Modern 에 FEATURE eyebrow 없음', !modernHtml.includes('content: "FEATURE"'));
check('무유출: Bento 에 var-editorial 규칙 없음', !bentoHtml.includes('var-editorial'));
check('무유출: Bento 에 FEATURE eyebrow 없음', !bentoHtml.includes('content: "FEATURE"'));

// --- Dashboard 표현 ---
check('Dashboard 테마 선택 가능', getTheme('Dashboard').name === 'Dashboard');
check('theme name 정규화(report → Dashboard)', normalizeThemeName('report') === 'Dashboard');
check('theme name 정규화(ops → Dashboard)', normalizeThemeName('OPS') === 'Dashboard');
const dashboard = resolveThemeByName('Dashboard');
const dashboardHtml = renderHtml(layout, dashboard.tokens, 'dashboard', dashboard.recipe);
check('렌더 가능: Dashboard HTML 생성', dashboardHtml.includes('<section class="page"'));
check('Dashboard: var-dashboard 스코프 활성', dashboardHtml.includes('page-body grid-stack var-dashboard'));
check('Dashboard: ChapterHeading SECTION 헤더', dashboardHtml.includes('content: "SECTION"'));
check('Dashboard: ResultCard KPI 카드', dashboardHtml.includes('content: "KPI"'));
check('Dashboard: WarningCard risk 패널', dashboardHtml.includes('[data-type="WarningCard"].card'));
check('Dashboard: QuoteBlock NOTE 패널', dashboardHtml.includes('content: "NOTE"'));
check('Dashboard: TableCard database table', dashboardHtml.includes('[data-type="TableCard"] .tbl'));
check('Dashboard ≠ Modern/Bento/Editorial', dashboardHtml !== modernHtml && dashboardHtml !== bentoHtml && dashboardHtml !== editorialHtml);

// Dashboard 무유출
check('무유출: Modern 에 var-dashboard 없음', !modernHtml.includes('var-dashboard'));
check('무유출: Bento 에 var-dashboard 없음', !bentoHtml.includes('var-dashboard'));
check('무유출: Editorial 에 var-dashboard 없음', !editorialHtml.includes('var-dashboard'));
check('무유출: Modern 에 SECTION 헤더 없음', !modernHtml.includes('content: "SECTION"'));

// --- QuoteBlock 테마별 스타일 ---
check('Quote: 공통 마크업(blockquote.quote)', modernHtml.includes('<blockquote class="quote">'));
check('Modern Glass: 기본 인용 스타일(.quote 규칙)', modernHtml.includes('.quote {'));
check('Bento: 메시지 카드 인용([data-type="QuoteBlock"] .quote)', bentoHtml.includes('[data-type="QuoteBlock"] .quote'));
check('Editorial: 매거진 인용([data-type="QuoteBlock"] .quote)', editorialHtml.includes('[data-type="QuoteBlock"] .quote'));
check('무유출: Modern 에 Bento 메시지 인용 규칙 없음', !modernHtml.includes('.grid-bento [data-type="QuoteBlock"]'));

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
