/**
 * Ebook Publishing System — PDF Export (v1)
 *
 * 시스템 Chrome/Edge 를 headless 로 호출해 book HTML 을 PDF 로 변환한다.
 * 외부 라이브러리 0 (Node 내장 child_process 만). PNG export 의 브라우저 탐지 재사용.
 *
 * print CSS 는 원본 HTML 을 건드리지 않고 임시 HTML(tmp/pdf-export/)에만 주입한다.
 *
 * 실행: npm run export:pdf
 *   - output/book.preview.html → output/book.preview.pdf
 *   - output/book.modern.html  → output/book.modern.pdf
 * (Bento/Dashboard 는 후순위 — v1 미포함)
 *
 * 사전: npm run build:html 로 HTML 생성. 브라우저 탐지: CHROME_PATH > Chrome > Edge.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync, mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser, browserNotFoundMessage } from './export/browser.ts';
import { injectPrintCss, htmlToPdfName, isPdfFile } from './export/pdf-helpers.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const out = (name: string) => resolve(projectRoot, 'output', name);

/** v1 변환 대상 HTML 파일명 (preview → modern 순) */
const TARGETS = ['book.preview.html', 'book.modern.html'];

function toPdf(browser: string, htmlFile: string, tmpDir: string): boolean {
  const srcHtml = out(htmlFile);
  if (!existsSync(srcHtml)) {
    console.error(`  ✗ ${htmlFile}: HTML 없음 (${srcHtml}) — 먼저 npm run build:html`);
    return false;
  }
  // print CSS 를 주입한 임시 HTML 생성(원본 불변)
  const injected = injectPrintCss(readFileSync(srcHtml, 'utf8'));
  const tmpHtml = resolve(tmpDir, htmlFile);
  writeFileSync(tmpHtml, injected, 'utf8');

  const pdfPath = out(htmlToPdfName(htmlFile));
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

  if (!existsSync(pdfPath) || statSync(pdfPath).size === 0) {
    console.error(`  ✗ ${htmlFile}: PDF 생성 실패`);
    return false;
  }
  if (!isPdfFile(pdfPath)) {
    console.error(`  ✗ ${htmlFile}: %PDF 헤더 아님`);
    return false;
  }
  console.log(`  ✓ ${htmlFile} → ${pdfPath}  (${statSync(pdfPath).size} bytes)`);
  return true;
}

function main(): void {
  const browser = findBrowser();
  if (!browser) {
    console.error(browserNotFoundMessage());
    process.exitCode = 1;
    return;
  }

  const tmpDir = mkdtempSync(resolve(tmpdir(), 'ebook-pdf-'));
  mkdirSync(resolve(tmpDir, 'profile'), { recursive: true });
  console.log('✓ PDF Export (headless --print-to-pdf)');
  console.log(`  브라우저 : ${browser}`);

  let failed = 0;
  try {
    for (const htmlFile of TARGETS) {
      if (!toPdf(browser, htmlFile, tmpDir)) failed++;
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  if (failed > 0) process.exitCode = 1;
}

main();
