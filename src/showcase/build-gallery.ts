/**
 * Ebook Publishing System — Component Design System 01/04 데모 갤러리 빌드 (엔진 밖)
 *
 * renderGalleryHtml() → output/component-gallery.html + .pdf (검수용).
 * 시스템 Chrome --print-to-pdf 재사용. 전자책 출력 로직 미변경.
 *
 * 실행: npm run demo:components
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync, statSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser, browserNotFoundMessage } from '../export/browser.ts';
import { renderGalleryHtml } from './component-gallery.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

function main(): void {
  const outDir = resolve(projectRoot, 'output');
  mkdirSync(outDir, { recursive: true });
  const html = renderGalleryHtml();
  const htmlPath = resolve(outDir, 'component-gallery.html');
  writeFileSync(htmlPath, html, 'utf8');
  console.log(`✓ HTML: ${htmlPath}`);

  const browser = findBrowser();
  if (!browser) {
    console.warn(browserNotFoundMessage());
    console.warn('PDF 생략 — HTML 만 생성됨.');
    return;
  }

  const tmpDir = mkdtempSync(resolve(tmpdir(), 'ebook-gallery-'));
  mkdirSync(resolve(tmpDir, 'profile'), { recursive: true });
  const tmpHtml = resolve(tmpDir, 'gallery.html');
  writeFileSync(tmpHtml, html, 'utf8');
  const pdfPath = resolve(outDir, 'component-gallery.pdf');
  try {
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
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }

  if (existsSync(pdfPath) && statSync(pdfPath).size > 0) {
    console.log(`✓ PDF: ${pdfPath} (${statSync(pdfPath).size} bytes)`);
  } else {
    console.error('✗ PDF 생성 실패');
    process.exit(1);
  }
}

main();
