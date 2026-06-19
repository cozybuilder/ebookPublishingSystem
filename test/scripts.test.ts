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
check('RELEASE_PDF: 3종(preview/modern/editorial)', RELEASE_PDF.length === 3 && RELEASE_PDF.every((f) => f.endsWith('.pdf')));
check('RELEASE_HTML: book/canvas HTML 포함', RELEASE_HTML.includes('book.html') && RELEASE_HTML.includes('canvas.detail.html'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
