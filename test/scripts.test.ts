/**
 * Ebook Publishing System — package.json 스크립트 구성 테스트 (v1)
 *
 * 릴리스 파이프라인 스크립트가 존재하고 올바른 단계 구성을 갖는지 검증한다.
 * 순수(파일 읽기만) — 브라우저/환경 비의존. 실행: npm run test:scripts
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RELEASE_STEPS, RELEASE_HTML, RELEASE_PNG, RELEASE_PDF } from '../src/release-manifest.ts';
import { HTML_RULES, PNG_RULES, PDF_RULES, checkHtml, checkPng, checkPdf } from '../src/release-validation.ts';
import { isDisposableArtifact, CANONICAL_HTML } from '../src/clean-assets.ts';
import { previewPromoHtmlName, previewPromoPngName, PREVIEW_PROMO_SPECS } from '../src/canvas/preview-promo-names.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const s = pkg.scripts;

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('package.json 스크립트 구성 테스트 실행\n');

// 핵심 스크립트 존재
for (const key of ['build:html', 'build:canvas', 'build:assets', 'export:png', 'export:pdf', 'build:release', 'test']) {
  check(`스크립트 존재: ${key}`, typeof s[key] === 'string' && s[key].length > 0);
}

// v2: build:release 는 단일 오케스트레이터(node src/release.ts)
const rel = s['build:release'] ?? '';
check('build:release: node src/release.ts 호출', rel === 'node src/release.ts');
check('build:release: sparse 미포함', !rel.includes('sparse'));
check('build:release:sparse: 별도 스크립트 존재', typeof s['build:release:sparse'] === 'string');
check('build:release:sparse: sparse 전용', (s['build:release:sparse'] ?? '').includes('sparse'));
check('build:release:legacy: 기존 체인 보존', (s['build:release:legacy'] ?? '').includes('export:pdf'));
// 기존 원자 스크립트 유지
check('build:assets/export:pdf 유지', typeof s['build:assets'] === 'string' && typeof s['export:pdf'] === 'string');

// 보조 산출물 스크립트 존재(별도 선택)
check('export:png:preview 존재(--preview)', (s['export:png:preview'] ?? '').includes('--preview'));
check('export:png:chapters 존재(--chapters)', (s['export:png:chapters'] ?? '').includes('--chapters'));
check('build:canvas:preview 존재', typeof s['build:canvas:preview'] === 'string');
check('export:png:preview-promo 존재(--preview-promo)', (s['export:png:preview-promo'] ?? '').includes('--preview-promo'));
// preview promo 파일명/규격
check('previewPromoHtmlName(square)', previewPromoHtmlName('square') === 'book.preview.square.html');
check('previewPromoPngName(story)', previewPromoPngName('story') === 'book.preview.story.png');
check('PREVIEW_PROMO_SPECS: square 1080×1080 / story 1080×1920', PREVIEW_PROMO_SPECS.find((x) => x.kind === 'square')!.width === 1080 && PREVIEW_PROMO_SPECS.find((x) => x.kind === 'story')!.height === 1920);
// preview promo HTML 은 disposable(비추적), 단 book.preview.html(canonical)은 보존
check('disposable: book.preview.square.html', isDisposableArtifact('book.preview.square.html') === true);
check('disposable: book.preview.story.html', isDisposableArtifact('book.preview.story.html') === true);
check('preserve: book.preview.html (canonical)', isDisposableArtifact('book.preview.html') === false);
// build:release 미포함
check('build:release: preview-promo 미포함', !rel.includes('preview-promo') && !rel.includes('canvas:preview'));
// build:release 는 preview/chapters PNG 미포함(별도 선택 산출물)
check('build:release: preview/chapters 미포함', !rel.includes('preview') && !rel.includes('chapter'));

// build:marketing-assets 구성: html → chapters canvas → chapters png → preview png
const mkt = s['build:marketing-assets'] ?? '';
check('build:marketing-assets 존재', mkt.length > 0);
check('build:marketing-assets: build:html 포함', mkt.includes('build:html'));
check('build:marketing-assets: chapters 캔버스+PNG 포함', mkt.includes('build:canvas:chapters') && mkt.includes('export:png:chapters'));
check('build:marketing-assets: preview PNG 포함', mkt.includes('export:png:preview'));
check('build:marketing-assets: preview promo 캔버스+PNG 포함', mkt.includes('build:canvas:preview') && mkt.includes('export:png:preview-promo'));
check('build:marketing-assets: PDF 미포함', !mkt.includes('export:pdf'));
check('build:marketing-assets: sparse 미포함', !mkt.includes('sparse'));
check('build:marketing-assets: release 미참조', !mkt.includes('build:release'));
// build:release 가 marketing-assets 를 참조하지 않음
check('build:release: marketing-assets 미포함', !rel.includes('marketing'));
// 순서: html → canvas:chapters → png:chapters → preview
const iH = mkt.indexOf('build:html');
const iCC = mkt.indexOf('build:canvas:chapters');
const iPC = mkt.indexOf('export:png:chapters');
const iPV = mkt.indexOf('export:png:preview');
check('build:marketing-assets: 순서 html→canvas:chapters→png:chapters→preview', iH >= 0 && iCC > iH && iPC > iCC && iPV > iPC);

// 매니페스트 구성(오케스트레이터 검증 대상)
const stepScripts = RELEASE_STEPS.map((x) => x.script);
check(
  'RELEASE_STEPS: html→canvas→png→pdf 순서',
  JSON.stringify(stepScripts) === JSON.stringify(['build:html', 'build:canvas', 'export:png', 'export:pdf']),
);
check('RELEASE_PNG: 3종', RELEASE_PNG.length === 3 && RELEASE_PNG.every((f) => f.endsWith('.png')));
check('RELEASE_PDF: 5종(preview/modern/editorial/dashboard/bento)', RELEASE_PDF.length === 5 && RELEASE_PDF.includes('book.dashboard.pdf') && RELEASE_PDF.includes('book.bento.pdf') && RELEASE_PDF.every((f) => f.endsWith('.pdf')));
check('RELEASE_HTML: book/canvas HTML 포함', RELEASE_HTML.includes('book.html') && RELEASE_HTML.includes('canvas.detail.html'));

// ===== Release Validation v2 (순수 검증 함수) =====
// HTML: 존재+size+마커
check('checkHtml: 정상 통과', checkHtml({ file: 'x', minBytes: 100, markers: ['grid-bento'] }, { exists: true, size: 500 }, '<div class="grid-bento">').length === 0);
check('checkHtml: 없음', checkHtml({ file: 'x', minBytes: 100, markers: [] }, { exists: false, size: 0 }, '').includes('없음'));
check('checkHtml: size 미달', checkHtml({ file: 'x', minBytes: 1000, markers: [] }, { exists: true, size: 10 }, 'x').some((r) => r.startsWith('size<')));
check('checkHtml: 마커 누락', checkHtml({ file: 'x', minBytes: 1, markers: ['var-editorial'] }, { exists: true, size: 50 }, 'no marker').some((r) => r.includes('마커 누락')));

// PNG: 규격
check('checkPng: square 1080×1080 통과', checkPng({ file: 'x', minBytes: 1, width: 1080, height: 1080 }, { exists: true, size: 9000 }, { width: 1080, height: 1080 }).length === 0);
check('checkPng: 규격 불일치', checkPng({ file: 'x', minBytes: 1, width: 1080, height: 1080 }, { exists: true, size: 9000 }, { width: 800, height: 800 }).length === 2);
check('checkPng: detail minHeight 통과', checkPng({ file: 'x', minBytes: 1, width: 860, minHeight: 1200 }, { exists: true, size: 9000 }, { width: 860, height: 2285 }).length === 0);
check('checkPng: detail minHeight 미달', checkPng({ file: 'x', minBytes: 1, width: 860, minHeight: 1200 }, { exists: true, size: 9000 }, { width: 860, height: 800 }).some((r) => r.startsWith('height<')));
check('checkPng: 헤더 아님', checkPng({ file: 'x', minBytes: 1, width: 1080, height: 1080 }, { exists: true, size: 9000 }, null).includes('PNG 헤더 아님'));

// PDF: size + 헤더
check('checkPdf: 정상 통과', checkPdf({ file: 'x', minBytes: 50 }, { exists: true, size: 60000 }, true).length === 0);
check('checkPdf: size 미달', checkPdf({ file: 'x', minBytes: 100000 }, { exists: true, size: 10 }, true).some((r) => r.startsWith('size<')));
check('checkPdf: %PDF 아님', checkPdf({ file: 'x', minBytes: 1 }, { exists: true, size: 60000 }, false).includes('%PDF 헤더 아님'));

// 규칙 커버리지: manifest 와 일치
check('HTML_RULES: RELEASE_HTML 전부 커버', RELEASE_HTML.every((f) => HTML_RULES.some((r) => r.file === f)));
check('PNG_RULES: RELEASE_PNG 전부 커버', RELEASE_PNG.every((f) => PNG_RULES.some((r) => r.file === f)));
check('PDF_RULES: RELEASE_PDF 전부 커버(5종)', PDF_RULES.length === 5 && RELEASE_PDF.every((f) => PDF_RULES.some((r) => r.file === f)));
check('PDF_RULES: preview 50KB / 나머지 100KB', PDF_RULES.find((r) => r.file === 'book.preview.pdf')!.minBytes === 50 * 1024 && PDF_RULES.filter((r) => r.file !== 'book.preview.pdf').every((r) => r.minBytes === 100 * 1024));

// ===== Clean Assets: 삭제 대상 판별 =====
check('clean:assets 스크립트 존재', (s['clean:assets'] ?? '').includes('clean-assets'));
check('clean:test-output 존재', (s['clean:test-output'] ?? '').includes('tmp/test-output'));
check('clean:all = assets + test-output', (s['clean:all'] ?? '').includes('clean:assets') && (s['clean:all'] ?? '').includes('clean:test-output'));

// 삭제 대상(true)
for (const f of ['canvas.detail.png', 'book.modern.pdf', 'canvas.chapter1.detail.html', 'canvas.chapter12.detail.html', 'canvas.sparse.detail.html', 'canvas.sparse.square.html', 'book.preview.png']) {
  check(`disposable: ${f}`, isDisposableArtifact(f) === true);
}
// 보존 대상(false) — canonical HTML / JSON
for (const f of ['book.html', 'book.modern.html', 'book.bento.html', 'book.editorial.html', 'book.dashboard.html', 'book.preview.html', 'canvas.detail.html', 'canvas.square.html', 'canvas.story.html', 'book.ast.json']) {
  check(`preserve(canonical): ${f}`, isDisposableArtifact(f) === false);
}
check('CANONICAL_HTML: book/canvas 핵심 포함', CANONICAL_HTML.has('book.html') && CANONICAL_HTML.has('canvas.story.html'));
// 무관 파일은 삭제 대상 아님(방어)
check('disposable: 무관 .md 아님', isDisposableArtifact('readme.md') === false);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
