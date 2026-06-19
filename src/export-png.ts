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
import { existsSync, statSync, mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser, browserNotFoundMessage } from './export/browser.ts';
import { readPngSizeFromFile } from './export/png-size.ts';
import { resolveDetailHeight, isMeasurementValid } from './export/detail-height.ts';

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

function capture(browser: string, htmlPath: string, pngPath: string, width: number, height: number, userDataDir: string): void {
  const url = pathToFileURL(htmlPath).href;
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${userDataDir}`,
    `--window-size=${width},${height}`,
    `--screenshot=${pngPath}`,
    url,
  ];
  execFileSync(browser, args, { stdio: 'ignore' });
}

/**
 * detail HTML 의 실제 콘텐츠 높이를 측정한다(2-pass).
 * 측정 스크립트를 주입한 임시 HTML 을 --dump-dom 으로 로드해 <title> 에 기록된
 * scrollHeight 를 파싱한다. 실패 시 undefined(→ 호출부에서 fallback).
 */
function measureDetailHeight(browser: string, htmlPath: string, userDataDir: string): number | undefined {
  try {
    const html = readFileSync(htmlPath, 'utf8');
    const inject =
      "<script>window.addEventListener('load',function(){document.title=String(Math.ceil(document.documentElement.scrollHeight));});</script>";
    const measured = html.includes('</body>') ? html.replace('</body>', `${inject}</body>`) : html + inject;
    const tmpHtml = resolve(userDataDir, 'measure-detail.html');
    writeFileSync(tmpHtml, measured, 'utf8');
    const url = pathToFileURL(tmpHtml).href;
    const dom = execFileSync(
      browser,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        `--user-data-dir=${userDataDir}`,
        '--virtual-time-budget=3000',
        '--dump-dom',
        url,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    const m = dom.match(/<title>(\d+)<\/title>/);
    return m ? Number(m[1]) : undefined;
  } catch {
    return undefined;
  }
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

      // detail(가변): 콘텐츠 높이 측정 → 자동 높이. 그 외: 고정 규격.
      let captureHeight = t.height;
      let note = '';
      if (t.fullPage) {
        const measured = measureDetailHeight(browser, htmlPath, userDataDir);
        captureHeight = resolveDetailHeight(measured);
        if (isMeasurementValid(measured)) {
          note = ` (auto-height: measured=${measured}, export=${captureHeight})`;
        } else {
          note = ` (⚠ 측정 실패 → fallback height=${captureHeight})`;
        }
      }

      capture(browser, htmlPath, pngPath, t.width, captureHeight, userDataDir);
      if (!existsSync(pngPath) || statSync(pngPath).size === 0) {
        console.error(`  ✗ ${t.name}: PNG 생성 실패`);
        failed++;
        continue;
      }
      const size = readPngSizeFromFile(pngPath);
      const bytes = statSync(pngPath).size;
      const dim = size ? `${size.width}×${size.height}` : 'unknown';
      console.log(`  ✓ ${t.name}: ${pngPath}  (${dim}, ${bytes} bytes)${note}`);
    }
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }

  if (failed > 0) process.exitCode = 1;
}

main();
