/**
 * Ebook Publishing System — Test Output Isolation 검증 (v1)
 *
 * 테스트 실행이 실제 output/ canonical 산출물을 건드리지 않음을 보장한다.
 * - output/ 의 모든 파일 해시를 스냅샷
 * - 파일을 쓰는 테스트들(html-renderer/canvas/theme-engine)을 서브프로세스로 실행
 * - 실행 후 output/ 해시가 불변인지 확인
 * - 테스트 산출물은 tmp/test-output/ 에 생성됐는지 확인
 *
 * 의존성 0: node:crypto / node:child_process / node:fs 만 사용(Git 비의존).
 * 실행: npm run test:isolation
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outputDir = resolve(root, 'output');

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

function hashDir(dir: string): Map<string, string> {
  const m = new Map<string, string>();
  if (!existsSync(dir)) return m;
  for (const f of readdirSync(dir)) {
    const p = resolve(dir, f);
    if (!statSync(p).isFile()) continue;
    m.set(f, createHash('sha256').update(readFileSync(p)).digest('hex'));
  }
  return m;
}

console.log('Test Output Isolation 검증 실행\n');

const before = hashDir(outputDir);

// 파일을 쓰는 테스트들을 서브프로세스로 실행(이들이 output/ 를 오염시키면 안 됨)
const fileWritingTests = ['html-renderer', 'canvas', 'theme-engine'];
let subOk = true;
for (const t of fileWritingTests) {
  try {
    execFileSync(process.execPath, [resolve(root, 'test', `${t}.test.ts`)], { stdio: 'ignore' });
  } catch {
    subOk = false;
    failures.push(`서브 테스트 실행 실패: ${t}`);
  }
}
check('파일 쓰기 테스트 서브프로세스 정상 실행', subOk);

const after = hashDir(outputDir);

// output/ 불변 검증(해시 비교)
check('output/ 파일 수 불변', before.size === after.size, `before=${before.size}, after=${after.size}`);
const changed: string[] = [];
for (const [f, h] of before) {
  if (after.get(f) !== h) changed.push(f);
}
check('output/ 전체 파일 해시 불변(테스트 미오염)', changed.length === 0, changed.length ? `변경됨: ${changed.join(', ')}` : '');

// 테스트 산출물이 tmp/test-output/ 에 분리 생성됐는지
const tmpDir = resolve(root, 'tmp', 'test-output');
check(
  'tmp/test-output/ 에 테스트 산출물 생성(분리 확인)',
  existsSync(resolve(tmpDir, 'book.html')) && existsSync(resolve(tmpDir, 'canvas.detail.html')),
);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
