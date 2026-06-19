/**
 * Ebook Publishing System — Clean Assets (v1)
 *
 * output/ 안의 "재생성 가능한 산출물"만 삭제한다(추적 canonical HTML 은 보존).
 * 실행: npm run clean:assets
 *
 * 삭제 대상: *.png, *.pdf, canvas.chapter*.html, canvas.sparse.*(html/png)
 * 보존: canonical HTML(book.* / canvas.detail|square|story.html 등)
 * 안전장치: output 디렉터리 안만, canonical 이름 제외.
 * 외부 라이브러리 없음(fs.readdirSync + 파일명 패턴).
 */

import { readdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const outputDir = resolve(projectRoot, 'output');

/** 추적되는 canonical HTML (삭제 금지) */
export const CANONICAL_HTML = new Set<string>([
  'book.html',
  'book.checklist.html',
  'book.modern.html',
  'book.bento.html',
  'book.editorial.html',
  'book.dashboard.html',
  'book.preview.html',
  'canvas.detail.html',
  'canvas.square.html',
  'canvas.story.html',
  'book.ast.json',
]);

/**
 * 파일명이 "재생성 산출물(삭제 대상)"인지 순수 판별.
 *  - canonical HTML / JSON 은 항상 보존(false).
 *  - .png / .pdf → 삭제.
 *  - canvas.chapter*.html → 삭제.
 *  - canvas.sparse.* (html/png) → 삭제(fixture, 비추적).
 */
export function isDisposableArtifact(file: string): boolean {
  if (CANONICAL_HTML.has(file)) return false;
  if (file.endsWith('.png')) return true;
  if (file.endsWith('.pdf')) return true;
  if (/^canvas\.chapter\d+\.detail\.html$/.test(file)) return true;
  if (/^canvas\.sparse\..*\.html$/.test(file)) return true;
  return false;
}

function main(): void {
  if (!existsSync(outputDir)) {
    console.log('삭제할 산출물 없음 (output/ 없음)');
    return;
  }
  const targets = readdirSync(outputDir).filter((f) => {
    const p = resolve(outputDir, f);
    return statSync(p).isFile() && isDisposableArtifact(f);
  });

  if (targets.length === 0) {
    console.log('삭제할 산출물 없음');
    return;
  }

  console.log(`✓ clean:assets — 재생성 산출물 ${targets.length}개 삭제`);
  for (const f of targets) {
    rmSync(resolve(outputDir, f), { force: true });
    console.log(`  - ${f}`);
  }
  console.log(`완료: ${targets.length}개 삭제 (canonical HTML 보존)`);
}

main();
