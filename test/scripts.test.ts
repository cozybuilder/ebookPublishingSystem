/**
 * Ebook Publishing System — package.json 스크립트 구성 테스트 (v1)
 *
 * 릴리스 파이프라인 스크립트가 존재하고 올바른 단계 구성을 갖는지 검증한다.
 * 순수(파일 읽기만) — 브라우저/환경 비의존. 실행: npm run test:scripts
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// build:release 구성: html → assets → pdf
const rel = s['build:release'] ?? '';
check('build:release: build:html 포함', rel.includes('build:html'));
check('build:release: build:assets 포함', rel.includes('build:assets'));
check('build:release: export:pdf 포함', rel.includes('export:pdf'));
check('build:release: && 체인(fail-fast)', rel.includes('&&'));

// sparse 는 기본 릴리스에 미포함
check('build:release: sparse 미포함', !rel.includes('sparse'));
check('build:release:sparse: 별도 스크립트 존재', typeof s['build:release:sparse'] === 'string');

// 단계 순서: html → assets → pdf
const iHtml = rel.indexOf('build:html');
const iAssets = rel.indexOf('build:assets');
const iPdf = rel.indexOf('export:pdf');
check('build:release: 순서 html→assets→pdf', iHtml >= 0 && iAssets > iHtml && iPdf > iAssets);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
