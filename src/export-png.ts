/**
 * Ebook Publishing System — PNG Export (v1)
 *
 * 시스템 Chrome/Edge 를 headless 로 호출해 캔버스 HTML 을 PNG 로 캡처한다.
 * 외부 라이브러리 0 (Node 내장 child_process 만).
 *
 * 실행: npm run export:png
 *   - output/canvas.detail.html → output/canvas.detail.png
 *   - output/canvas.square.html → output/canvas.square.png  (1080×1080)
 *   - output/canvas.story.html  → output/canvas.story.png   (1080×1920)
 *
 * 브라우저 탐지: CHROME_PATH > Windows 기본 Chrome > Windows 기본 Edge.
 * 사전: npm run build:canvas 로 HTML 이 생성되어 있어야 한다.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser, browserNotFoundMessage } from './export/browser.ts';
import { readPngSizeFromFile } from './export/png-size.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const out = (name: string) => resolve(projectRoot, 'output', name);

interface Target {
  name: string;
  width: number;
  height: number;
  /** detail: 전체 페이지 캡처 의도(가변 높이 → 넉넉한 window 높이) */
  fullPage?: boolean;
}

const TARGETS: Target[] = [
  { name: 'detail', width: 860, height: 2600, fullPage: true },
  { name: 'square', width: 1080, height: 1080 },
  { name: 'story', width: 1080, height: 1920 },
];

function capture(browser: string, htmlPath: string, pngPath: string, t: Target, userDataDir: string): void {
  const url = pathToFileURL(htmlPath).href;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${t.width},${t.height}`,
    `--screenshot=${pngPath}`,
    url,
  ];
  execFileSync(browser, args, { stdio: 'ignore' });
}

function main(): void {
  const browser = findBrowser();
  if (!browser) {
    console.error(browserNotFoundMessage());
    process.exitCode = 1;
    return;
  }

  const userDataDir = mkdtempSync(resolve(tmpdir(), 'ebook-png-'));
  console.log('✓ PNG Export (headless)');
  console.log(`  브라우저 : ${browser}`);

  let failed = 0;
  try {
    for (const t of TARGETS) {
      const htmlPath = out(`canvas.${t.name}.html`);
      const pngPath = out(`canvas.${t.name}.png`);
      if (!existsSync(htmlPath)) {
        console.error(`  ✗ ${t.name}: HTML 없음 (${htmlPath}) — 먼저 npm run build:canvas`);
        failed++;
        continue;
      }
      capture(browser, htmlPath, pngPath, t, userDataDir);
      if (!existsSync(pngPath) || statSync(pngPath).size === 0) {
        console.error(`  ✗ ${t.name}: PNG 생성 실패`);
        failed++;
        continue;
      }
      const size = readPngSizeFromFile(pngPath);
      const bytes = statSync(pngPath).size;
      const dim = size ? `${size.width}×${size.height}` : 'unknown';
      const note = t.fullPage ? ' (전체 페이지 캡처: 높이 가변, window 높이 기준)' : '';
      console.log(`  ✓ ${t.name}: ${pngPath}  (${dim}, ${bytes} bytes)${note}`);
    }
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }

  if (failed > 0) process.exitCode = 1;
}

main();
