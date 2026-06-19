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
import { existsSync, statSync, mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser, browserNotFoundMessage } from './export/browser.ts';
import { readPngSizeFromFile } from './export/png-size.ts';
import { resolveDetailHeight, isMeasurementValid } from './export/detail-height.ts';
import { parsePrefix } from './export/args.ts';
import { chapterOrdinalFromHtml, chapterDetailPngName } from './canvas/chapter-names.ts';

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

/** detail(가변 높이) HTML 1개를 PNG 로 캡처. 성공 여부 반환. */
function exportDetail(browser: string, htmlPath: string, pngPath: string, label: string, userDataDir: string): boolean {
  const measured = measureDetailHeight(browser, htmlPath, userDataDir);
  const captureHeight = resolveDetailHeight(measured);
  capture(browser, htmlPath, pngPath, 860, captureHeight, userDataDir);
  if (!existsSync(pngPath) || statSync(pngPath).size === 0) {
    console.error(`  ✗ ${label}: PNG 생성 실패`);
    return false;
  }
  const size = readPngSizeFromFile(pngPath);
  const dim = size ? `${size.width}×${size.height}` : 'unknown';
  const note = isMeasurementValid(measured) ? `measured=${measured}` : '⚠ 측정 실패 fallback';
  console.log(`  ✓ ${label}: ${pngPath}  (${dim}, ${statSync(pngPath).size} bytes, ${note})`);
  return true;
}

/** --chapters: output/canvas.chapterN.detail.html 전부를 PNG 로 변환 */
function exportChapters(browser: string, userDataDir: string): number {
  const outputDir = resolve(projectRoot, 'output');
  const files = readdirSync(outputDir)
    .map((f) => ({ f, ord: chapterOrdinalFromHtml(f) }))
    .filter((x): x is { f: string; ord: number } => x.ord !== null)
    .sort((a, b) => a.ord - b.ord);

  if (files.length === 0) {
    console.error('  ✗ 챕터 상세 HTML 없음 — 먼저 npm run build:canvas:chapters');
    return 1;
  }
  let failed = 0;
  for (const { f, ord } of files) {
    const ok = exportDetail(browser, resolve(outputDir, f), resolve(outputDir, chapterDetailPngName(ord)), `chapter${ord}`, userDataDir);
    if (!ok) failed++;
  }
  return failed;
}

function main(): void {
  const browser = findBrowser();
  if (!browser) {
    console.error(browserNotFoundMessage());
    process.exitCode = 1;
    return;
  }

  // --preview 모드: book.preview.html → book.preview.png (가변 높이, width 860 / 상세페이지 삽입용)
  if (process.argv.includes('--preview')) {
    const userDataDir = mkdtempSync(resolve(tmpdir(), 'ebook-png-pv-'));
    console.log('✓ PNG Export (preview)');
    console.log(`  브라우저 : ${browser}`);
    let failed = 0;
    try {
      const htmlPath = out('book.preview.html');
      if (!existsSync(htmlPath)) {
        console.error('  ✗ preview: book.preview.html 없음 — 먼저 npm run build:html');
        failed = 1;
      } else if (!exportDetail(browser, htmlPath, out('book.preview.png'), 'preview', userDataDir)) {
        failed = 1;
      }
    } finally {
      rmSync(userDataDir, { recursive: true, force: true });
    }
    if (failed > 0) process.exitCode = 1;
    return;
  }

  // --chapters 모드: 챕터별 detail HTML → PNG (기존 detail/square/story 와 분리)
  if (process.argv.includes('--chapters')) {
    const userDataDir = mkdtempSync(resolve(tmpdir(), 'ebook-png-ch-'));
    console.log('✓ PNG Export (chapters)');
    console.log(`  브라우저 : ${browser}`);
    let failed = 0;
    try {
      failed = exportChapters(browser, userDataDir);
    } finally {
      rmSync(userDataDir, { recursive: true, force: true });
    }
    if (failed > 0) process.exitCode = 1;
    return;
  }

  const prefix = parsePrefix(process.argv); // '' | 'sparse.'
  const userDataDir = mkdtempSync(resolve(tmpdir(), 'ebook-png-'));
  console.log(`✓ PNG Export (headless${prefix ? `, prefix="${prefix}"` : ''})`);
  console.log(`  브라우저 : ${browser}`);

  let failed = 0;
  try {
    for (const t of TARGETS) {
      const htmlPath = out(`canvas.${prefix}${t.name}.html`);
      const pngPath = out(`canvas.${prefix}${t.name}.png`);
      if (!existsSync(htmlPath)) {
        console.error(`  ✗ ${prefix}${t.name}: HTML 없음 (${htmlPath}) — 먼저 build:canvas${prefix ? ':sparse' : ''}`);
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
        console.error(`  ✗ ${prefix}${t.name}: PNG 생성 실패`);
        failed++;
        continue;
      }
      const size = readPngSizeFromFile(pngPath);
      const bytes = statSync(pngPath).size;
      const dim = size ? `${size.width}×${size.height}` : 'unknown';
      console.log(`  ✓ ${prefix}${t.name}: ${pngPath}  (${dim}, ${bytes} bytes)${note}`);
    }
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }

  if (failed > 0) process.exitCode = 1;
}

main();
