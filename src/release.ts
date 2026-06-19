/**
 * Ebook Publishing System — Release Orchestrator (v2)
 *
 * build:html → build:canvas → export:png → export:pdf 를 단일 Node 프로세스에서
 * 순서대로 실행하고, 단계 로그 / 실패 처리 / 산출물 검증·요약을 출력한다.
 *
 * 실행: npm run build:release  (= node src/release.ts)
 * 산출물은 기존과 동일(각 npm 스크립트 재사용). sparse 는 포함하지 않는다.
 * 외부 라이브러리 0 (Node 내장 child_process 만).
 */

import { execSync } from 'node:child_process';
import { existsSync, statSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readPngSize } from './export/png-size.ts';
import { isPdfBuffer } from './export/pdf-helpers.ts';
import { RELEASE_STEPS, RELEASE_HTML, RELEASE_PNG, RELEASE_PDF } from './release-manifest.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const out = (name: string) => resolve(projectRoot, 'output', name);

function runStep(index: number, total: number, label: string, script: string): void {
  console.log(`\n[${index}/${total}] ${label}  (npm run ${script})`);
  try {
    execSync(`npm run ${script}`, { cwd: projectRoot, stdio: 'inherit' });
  } catch {
    console.error(`\n✗ 릴리스 실패: [${index}/${total}] ${label} (npm run ${script}) 단계에서 중단.`);
    process.exit(1);
  }
}

interface Issue {
  file: string;
  reason: string;
}

function verify(): Issue[] {
  const issues: Issue[] = [];

  for (const f of RELEASE_HTML) {
    if (!existsSync(out(f))) issues.push({ file: f, reason: '없음' });
  }
  for (const f of RELEASE_PNG) {
    const p = out(f);
    if (!existsSync(p)) issues.push({ file: f, reason: '없음' });
    else if (statSync(p).size === 0) issues.push({ file: f, reason: 'size 0' });
    else if (!readPngSize(readFileSync(p).subarray(0, 24))) issues.push({ file: f, reason: 'PNG 헤더 아님' });
  }
  for (const f of RELEASE_PDF) {
    const p = out(f);
    if (!existsSync(p)) issues.push({ file: f, reason: '없음' });
    else if (statSync(p).size === 0) issues.push({ file: f, reason: 'size 0' });
    else if (!isPdfBuffer(readFileSync(p).subarray(0, 8))) issues.push({ file: f, reason: '%PDF 헤더 아님' });
  }
  return issues;
}

function summarize(): void {
  const line = (f: string, withSize: boolean): string => {
    const p = out(f);
    if (!existsSync(p)) return `    ✗ ${f} (없음)`;
    if (!withSize) return `    - ${f}`;
    return `    - ${f} (${statSync(p).size} bytes)`;
  };
  console.log('\n────────────────────────────');
  console.log('✓ 릴리스 산출물 요약');
  console.log('  HTML:');
  for (const f of RELEASE_HTML) console.log(line(f, false));
  console.log('  PNG:');
  for (const f of RELEASE_PNG) console.log(line(f, true));
  console.log('  PDF:');
  for (const f of RELEASE_PDF) console.log(line(f, true));
}

function main(): void {
  console.log('=== Release Orchestrator (HTML → Canvas → PNG → PDF) ===');
  const total = RELEASE_STEPS.length;
  RELEASE_STEPS.forEach((step, i) => runStep(i + 1, total, step.label, step.script));

  const issues = verify();
  if (issues.length > 0) {
    console.error('\n✗ 산출물 검증 실패:');
    for (const it of issues) console.error(`    - ${it.file}: ${it.reason}`);
    process.exit(1);
  }

  summarize();
  console.log('\n✓ 릴리스 완료 — 모든 산출물 생성/검증 통과.');
}

main();
