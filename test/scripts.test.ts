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

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
