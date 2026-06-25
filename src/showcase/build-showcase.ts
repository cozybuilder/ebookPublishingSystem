/**
 * Ebook Publishing System — Theme v4 Showcase 시안 빌드 (엔진 밖 Preview Layer)
 *
 * input/book.md → 쇼케이스 시안 PDF 2종 → output/showcase/.
 * 시스템 Chrome/Edge 의 --print-to-pdf 재사용(엔진 export 와 동일 방식, 코어 미변경).
 *
 * 실행: npm run showcase
 *   - output/showcase/showcase-editorial.pdf
 *   - output/showcase/showcase-luxury.pdf
 *
 * 사전: 브라우저 탐지 CHROME_PATH > Chrome > Edge.
 */

import { execFileSync } from 'node:child_process';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  statSync,
  mkdtempSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser, browserNotFoundMessage } from '../export/browser.ts';
import { parseBook } from '../parser/parser.ts';
import { buildShowcaseData, renderShowcaseHtml, SHOWCASE_VARIANTS } from './showcase-theme.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

function main(): void {
  const inputPath = resolve(projectRoot, 'input', 'book.md');
  if (!existsSync(inputPath)) {
    console.error('✗ input/book.md 가 없습니다. 먼저 원고를 작성하세요.');
    process.exit(1);
  }

  const browser = findBrowser();
  if (!browser) {
    console.error(browserNotFoundMessage());
    process.exit(1);
  }

  const data = buildShowcaseData(parseBook(readFileSync(inputPath, 'utf8')));
  const outDir = resolve(projectRoot, 'output', 'showcase');
  rmSync(outDir, { recursive: true, force: true }); // 이전 시안 정리(stale 방지)
  mkdirSync(outDir, { recursive: true });

  const tmpDir = mkdtempSync(resolve(tmpdir(), 'ebook-showcase-'));
  mkdirSync(resolve(tmpDir, 'profile'), { recursive: true });

  console.log('=== Theme v4 Showcase 시안 빌드 ===');
  console.log(`  브라우저 : ${browser}`);

  let failed = 0;
  try {
    for (const variant of SHOWCASE_VARIANTS) {
      const html = renderShowcaseHtml(data, variant);
      const tmpHtml = resolve(tmpDir, `showcase-${variant}.html`);
      writeFileSync(tmpHtml, html, 'utf8');

      const pdfPath = resolve(outDir, `showcase-${variant}.pdf`);
      execFileSync(
        browser,
        [
          '--headless=new',
          '--disable-gpu',
          '--no-pdf-header-footer',
          '--no-first-run',
          '--no-default-browser-check',
          `--user-data-dir=${resolve(tmpDir, 'profile')}`,
          `--print-to-pdf=${pdfPath}`,
          pathToFileURL(tmpHtml).href,
        ],
        { stdio: 'ignore' },
      );

      if (existsSync(pdfPath) && statSync(pdfPath).size > 0) {
        console.log(`  ✓ ${variant}: ${pdfPath} (${statSync(pdfPath).size} bytes)`);
      } else {
        console.error(`  ✗ ${variant}: PDF 생성 실패`);
        failed++;
      }
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  console.log('\n시안을 열어 방향을 확인하세요: output/showcase/');
  if (failed > 0) process.exit(1);
}

main();
