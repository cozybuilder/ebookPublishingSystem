/**
 * Ebook Publishing System — Upload Mode 빌드 래퍼 (비-엔진)
 *
 * 엔진 코어를 건드리지 않는 마무리(Finishing) 단계.
 *   1) build:release 실행 (기존 엔진 파이프라인 그대로)
 *   2) 대표 PDF 복사: output/book.modern.pdf → output/book.pdf  (테마별 PDF는 그대로 유지)
 *   3) 누락 이미지 슬롯 목록 출력 + output/missing-images.txt 저장 (빌드는 실패시키지 않음)
 *
 * 실행: npm run build   (= node src/build-upload.ts)
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildImagePromptManifest } from './image-prompts/image-prompt-manifest.ts';
import type { AssetLookup } from './image-prompts/image-prompt-manifest.ts';
import { resolveImageAsset } from './assets/image-asset-resolver.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const out = (name: string) => resolve(projectRoot, 'output', name);

function runRelease(): void {
  execSync('npm run build:release', { cwd: projectRoot, stdio: 'inherit' });
}

/** 대표 PDF: modern 테마를 book.pdf 로 복사 (코비 확정: 대표 테마 = modern) */
function copyRepresentativePdf(): void {
  const src = out('book.modern.pdf');
  const dst = out('book.pdf');
  if (!existsSync(src)) {
    console.warn('⚠ book.modern.pdf 가 없어 book.pdf 복사를 건너뜀.');
    return;
  }
  copyFileSync(src, dst);
  console.log('✓ 대표 PDF: book.modern.pdf → book.pdf');
}

/** 크몽 판매용 미리보기 PDF: 엔진 preview 산출물을 kmong-preview.pdf 로 제공 */
function makeKmongPreview(): void {
  const src = out('book.preview.pdf');
  const dst = out('kmong-preview.pdf');
  if (!existsSync(src)) {
    console.warn('⚠ book.preview.pdf 가 없어 kmong-preview.pdf 생성을 건너뜀.');
    return;
  }
  copyFileSync(src, dst);
  console.log('✓ 크몽 미리보기: book.preview.pdf → kmong-preview.pdf');
}

/**
 * 크몽 상세페이지용 이미지 묶음 생성: output/detail-images/.
 * 엔진의 마케팅 자산(canvas 챕터 상세 + preview/promo PNG)을 재사용해 보기 좋은 이름으로 정리.
 * 엔진/테마 미변경. PNG 렌더 실패 시에도 빌드는 계속 진행.
 * @returns 생성된 파일 수
 */
function makeDetailImages(): number {
  const dir = out('detail-images');
  try {
    execSync('npm run build:marketing-assets', { cwd: projectRoot, stdio: 'inherit' });
  } catch {
    console.warn('⚠ 상세 이미지 렌더 단계 실패 — detail-images 생성을 건너뜀(빌드는 계속).');
    return 0;
  }

  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  let count = 0;
  const copyIf = (srcName: string, destName: string): void => {
    const src = out(srcName);
    if (existsSync(src)) {
      copyFileSync(src, resolve(dir, destName));
      count++;
    }
  };

  // 대표 이미지: 실제 표지(assets/images/cover.*)가 있으면 그것을 크몽 대표로,
  // 없으면 기존 요약 미리보기(book.preview.png)를 대표로 사용(무회귀).
  const coverAsset = resolveImageAsset('cover', projectRoot);
  if (coverAsset) {
    copyFileSync(coverAsset.path, resolve(dir, '00-cover.png'));
    count++;
    copyIf('book.preview.png', '01-preview.png'); // 요약 미리보기(보조)
  } else {
    copyIf('book.preview.png', '00-cover.png'); // 표지 자산 없을 때 대표
  }
  copyIf('book.preview.square.png', '02-promo-square.png'); // SNS 정사각 홍보
  copyIf('book.preview.story.png', '03-promo-story.png'); // SNS 스토리 홍보

  // 챕터 상세(챕터 소개 + 그 안의 체크리스트/FAQ/Before-After/카드형 요약 시각화)
  const chapterPngs = readdirSync(out('.'))
    .filter((f) => /^canvas\.chapter(\d+)\.detail\.png$/.test(f))
    .sort();
  for (const f of chapterPngs) {
    const n = f.match(/^canvas\.chapter(\d+)\.detail\.png$/)![1].padStart(2, '0');
    copyIf(f, `chapter-${n}.png`);
  }

  console.log(`✓ 상세 이미지: output/detail-images/ (${count}개)`);
  return count;
}

/** 빌드 완료 요약 — 사용자가 무엇이 만들어졌는지 한눈에 */
function printSummary(detailCount: number): void {
  console.log('\n════════════════════════════');
  console.log('Created:');
  for (const f of ['book.pdf', 'book.docx', 'book.epub', 'kmong-preview.pdf']) {
    if (existsSync(out(f))) console.log(`  ${f}`);
  }
  console.log('');
  console.log('Detail Images:');
  console.log(`  ${detailCount} files  (output/detail-images/)`);
  console.log('════════════════════════════');
}

/** 누락 이미지 슬롯 목록 출력 + 파일 저장. 빌드는 실패시키지 않는다. */
function reportMissingImages(): void {
  const inputPath = resolve(projectRoot, 'input', 'book.md');
  if (!existsSync(inputPath)) return;

  const book = parseBook(readFileSync(inputPath, 'utf8'));
  const lookup: AssetLookup = (id) => {
    // 존재 여부만 필요하므로 read 는 빈 버퍼로 주입(이미지 바이트 로딩 회피).
    const r = resolveImageAsset(id, projectRoot, undefined, () => Buffer.alloc(0));
    return r ? { path: r.path, ext: r.ext } : null;
  };

  const manifest = buildImagePromptManifest(book, lookup);
  const missing = manifest.items.filter((i) => i.missing);
  const txtPath = out('missing-images.txt');

  if (missing.length === 0) {
    writeFileSync(txtPath, '모든 이미지 자산이 준비되었습니다. (누락 없음)\n', 'utf8');
    console.log('✓ 이미지 자산: 누락 없음');
    return;
  }

  const lines: string[] = [];
  lines.push('Missing images:');
  for (const m of missing) lines.push(`- ${m.id}`);
  lines.push('');
  lines.push('Please add:');
  for (const m of missing) lines.push(m.recommendedPath);
  const text = lines.join('\n') + '\n';

  writeFileSync(txtPath, text, 'utf8');
  console.log('');
  console.log(text.trimEnd());
  console.log(`\n(누락 ${missing.length}개 — output/missing-images.txt 에 저장. 빌드는 계속 진행됨.)`);
}

/** 첫 사용자용 친절한 사전 점검. 문제가 있으면 안내 후 종료. */
function preflight(): void {
  const inputPath = resolve(projectRoot, 'input', 'book.md');
  if (!existsSync(inputPath)) {
    console.error(
      [
        '✗ 원고 파일을 찾을 수 없습니다: input/book.md',
        '',
        '처음이신가요? 3단계면 됩니다:',
        '  1) input/book.md 에 원고를 작성하세요. (예제 원고가 input/book.md 에 들어 있습니다)',
        '  2) assets/images/ 에 이미지(<슬롯id>.png)를 넣으세요. (선택)',
        '  3) npm run build 를 다시 실행하세요.',
        '',
        '자세한 작성법은 README.md 의 "빠른 시작"을 참고하세요.',
      ].join('\n'),
    );
    process.exit(1);
  }
}

function main(): void {
  console.log('=== Upload Mode 빌드 (전자책 + 크몽 판매 자료) ===');
  preflight();
  runRelease();

  console.log('\n--- 마무리: 판매 자료 조립 ---');
  copyRepresentativePdf(); // 대표 PDF (modern → book.pdf)
  makeKmongPreview(); // 크몽 미리보기 PDF
  const detailCount = makeDetailImages(); // 크몽 상세 이미지 묶음
  reportMissingImages(); // 누락 이미지 안내

  printSummary(detailCount);
  console.log('\n✓ Upload Mode 빌드 완료.');
}

main();
