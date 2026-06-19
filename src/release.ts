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
import { RELEASE_STEPS } from './release-manifest.ts';
import {
  HTML_RULES,
  PNG_RULES,
  PDF_RULES,
  checkHtml,
  checkPng,
  checkPdf,
  type FileFact,
} from './release-validation.ts';

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
  reasons: string[];
}

function fact(file: string): FileFact {
  const p = out(file);
  return existsSync(p) ? { exists: true, size: statSync(p).size } : { exists: false, size: 0 };
}
function content(file: string): string {
  try {
    return readFileSync(out(file), 'utf8');
  } catch {
    return '';
  }
}
function pngOf(file: string): { width: number; height: number } | null {
  try {
    return readPngSize(readFileSync(out(file)).subarray(0, 24));
  } catch {
    return null;
  }
}
function pdfOf(file: string): boolean {
  try {
    return isPdfBuffer(readFileSync(out(file)).subarray(0, 8));
  } catch {
    return false;
  }
}

/** 강화된 검증: 존재 + size 임계 + 마커/규격/헤더 */
function verify(): Issue[] {
  const issues: Issue[] = [];
  for (const rule of HTML_RULES) {
    const reasons = checkHtml(rule, fact(rule.file), content(rule.file));
    if (reasons.length) issues.push({ file: rule.file, reasons });
  }
  for (const rule of PNG_RULES) {
    const reasons = checkPng(rule, fact(rule.file), pngOf(rule.file));
    if (reasons.length) issues.push({ file: rule.file, reasons });
  }
  for (const rule of PDF_RULES) {
    const reasons = checkPdf(rule, fact(rule.file), pdfOf(rule.file));
    if (reasons.length) issues.push({ file: rule.file, reasons });
  }
  return issues;
}

function summarize(): void {
  console.log('\n────────────────────────────');
  console.log('✓ 릴리스 산출물 요약 (검증 통과)');
  console.log(`  HTML: ${HTML_RULES.length}종 OK`);
  for (const r of HTML_RULES) console.log(`    - ${r.file}`);
  console.log(`  PNG: ${PNG_RULES.length}종 OK`);
  for (const r of PNG_RULES) {
    const s = pngOf(r.file);
    console.log(`    - ${r.file} (${s ? `${s.width}×${s.height}` : '?'}, ${fact(r.file).size} bytes)`);
  }
  console.log(`  PDF: ${PDF_RULES.length}종 OK`);
  for (const r of PDF_RULES) console.log(`    - ${r.file} (${fact(r.file).size} bytes)`);
}

function main(): void {
  console.log('=== Release Orchestrator (HTML → Canvas → PNG → PDF) ===');
  const total = RELEASE_STEPS.length;
  RELEASE_STEPS.forEach((step, i) => runStep(i + 1, total, step.label, step.script));

  const issues = verify();
  if (issues.length > 0) {
    console.error('\n✗ 산출물 검증 실패:');
    for (const it of issues) console.error(`    - ${it.file}: ${it.reasons.join(', ')}`);
    process.exit(1);
  }

  summarize();
  console.log('\n✓ 릴리스 완료 — 모든 산출물 생성/검증 통과.');
}

main();
