/**
 * Ebook Publishing System — PNG Export 순수 함수 테스트 (v1)
 *
 * 브라우저/파일 의존 없는 부분만 검증(브라우저 탐지 로직 + PNG 헤더 파싱).
 * 실제 캡처(export:png)는 환경 의존이라 npm test 에 포함하지 않는다.
 * 실행: npm run test:export
 */

import { findBrowser, BROWSER_CANDIDATES } from '../src/export/browser.ts';
import { readPngSize } from '../src/export/png-size.ts';
import { parsePrefix, parseExportPngArgs } from '../src/export/args.ts';
import { injectPrintCss, htmlToPdfName, isPdfBuffer, PRINT_CSS, PDF_TARGETS } from '../src/export/pdf-helpers.ts';
import {
  resolveDetailHeight,
  isMeasurementValid,
  DETAIL_MIN_HEIGHT,
  DETAIL_MAX_HEIGHT,
  DETAIL_PADDING,
  DETAIL_FALLBACK_HEIGHT,
} from '../src/export/detail-height.ts';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('PNG Export 순수 함수 테스트 실행\n');

// ===== 브라우저 탐지 (주입형: 실제 환경 비의존) =====
const FAKE_CHROME = BROWSER_CANDIDATES[0];

// CHROME_PATH override 우선
check(
  'CHROME_PATH 지정 + 존재 → 그 경로',
  findBrowser({ CHROME_PATH: 'X:\\custom\\chrome.exe' }, (p) => p === 'X:\\custom\\chrome.exe') === 'X:\\custom\\chrome.exe',
);
check(
  'CHROME_PATH 지정 + 부재 → null',
  findBrowser({ CHROME_PATH: 'X:\\missing.exe' }, () => false) === null,
);
// override 없을 때 후보 첫 발견
check(
  'override 없음 + 첫 후보 존재 → 첫 후보',
  findBrowser({}, (p) => p === FAKE_CHROME) === FAKE_CHROME,
);
check(
  'override 없음 + Edge 만 존재 → Edge',
  (() => {
    const edge = BROWSER_CANDIDATES.find((c) => c.includes('msedge.exe'))!;
    return findBrowser({}, (p) => p === edge) === edge;
  })(),
);
check('아무것도 없음 → null', findBrowser({}, () => false) === null);

// ===== PNG 헤더 파싱 =====
function fakePng(width: number, height: number): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const len = Buffer.from([0x00, 0x00, 0x00, 0x0d]); // IHDR length 13
  const type = Buffer.from('IHDR', 'ascii');
  const w = Buffer.alloc(4);
  w.writeUInt32BE(width);
  const h = Buffer.alloc(4);
  h.writeUInt32BE(height);
  const rest = Buffer.alloc(5); // bitdepth/colortype/...
  return Buffer.concat([sig, len, type, w, h, rest]);
}

const sq = readPngSize(fakePng(1080, 1080));
check('PNG 파싱: 1080×1080', !!sq && sq.width === 1080 && sq.height === 1080, JSON.stringify(sq));
const st = readPngSize(fakePng(1080, 1920));
check('PNG 파싱: 1080×1920', !!st && st.width === 1080 && st.height === 1920, JSON.stringify(st));
check('PNG 파싱: 비-PNG 버퍼 → null', readPngSize(Buffer.from('not a png')) === null);
check('PNG 파싱: 너무 짧은 버퍼 → null', readPngSize(Buffer.from([0x89, 0x50])) === null);

// ===== detail auto-height 계산 =====
check('height: 정상 측정 → +padding', resolveDetailHeight(2245) === 2245 + DETAIL_PADDING);
check('height: 소수 → 올림 후 padding', resolveDetailHeight(2244.3) === 2245 + DETAIL_PADDING);
check('height: 최소 clamp', resolveDetailHeight(100) === DETAIL_MIN_HEIGHT);
check('height: 최대 clamp', resolveDetailHeight(99999) === DETAIL_MAX_HEIGHT);
check('height: undefined → fallback', resolveDetailHeight(undefined) === DETAIL_FALLBACK_HEIGHT);
check('height: NaN → fallback', resolveDetailHeight(Number.NaN) === DETAIL_FALLBACK_HEIGHT);
check('height: 0/음수 → fallback', resolveDetailHeight(0) === DETAIL_FALLBACK_HEIGHT && resolveDetailHeight(-5) === DETAIL_FALLBACK_HEIGHT);
check('height: 결과 정수', Number.isInteger(resolveDetailHeight(2245.9)));
check('measurement valid 판정', isMeasurementValid(2245) === true && isMeasurementValid(undefined) === false && isMeasurementValid(0) === false);
check('상수 sanity(min<max, fallback 범위 내)', DETAIL_MIN_HEIGHT < DETAIL_MAX_HEIGHT && DETAIL_FALLBACK_HEIGHT >= DETAIL_MIN_HEIGHT && DETAIL_FALLBACK_HEIGHT <= DETAIL_MAX_HEIGHT);

// ===== --prefix 파싱 =====
check('prefix: 미지정 → ""', parsePrefix(['node', 'x']) === '');
check('prefix: sparse → "sparse."', parsePrefix(['--prefix', 'sparse']) === 'sparse.');
check('prefix: "sparse." → 그대로', parsePrefix(['--prefix', 'sparse.']) === 'sparse.');
check('prefix: 값 없음 → ""', parsePrefix(['--prefix']) === '');
check('prefix: 다음 인자가 플래그 → ""', parsePrefix(['--prefix', '--other']) === '');
check('prefix: 빈문자 → ""', parsePrefix(['--prefix', '']) === '');

// ===== parseExportPngArgs (모드 파싱) =====
function mode(argv: string[]) {
  return parseExportPngArgs(['node', 'export-png.ts', ...argv]);
}
const mCanvas = mode([]);
check('mode: 기본 canvas, prefix ""', mCanvas.kind === 'canvas' && mCanvas.kind === 'canvas' && mCanvas.prefix === '');
const mSparse = mode(['--prefix', 'sparse']);
check('mode: --prefix sparse → canvas prefix "sparse."', mSparse.kind === 'canvas' && mSparse.prefix === 'sparse.');
const mSparseDot = mode(['--prefix', 'sparse.']);
check('mode: --prefix sparse. → "sparse."', mSparseDot.kind === 'canvas' && mSparseDot.prefix === 'sparse.');
check('mode: --chapters', mode(['--chapters']).kind === 'chapters');
check('mode: --preview', mode(['--preview']).kind === 'preview');
check('mode: --preview-promo', mode(['--preview-promo']).kind === 'preview-promo');

function throws(argv: string[]): boolean {
  try {
    mode(argv);
    return false;
  } catch {
    return true;
  }
}
check('mode 오류: --chapters + --preview', throws(['--chapters', '--preview']));
check('mode 오류: --preview + --preview-promo', throws(['--preview', '--preview-promo']));
check('mode 오류: --preview + --prefix', throws(['--preview', '--prefix', 'sparse']));
check('mode 오류: --chapters + --prefix', throws(['--chapters', '--prefix', 'x']));
check('mode 정상: --prefix 단독은 canvas', mode(['--prefix', 'sparse']).kind === 'canvas');

// ===== PDF export 순수 함수 =====
// print CSS 주입(임시 HTML 대상) — 원본 문자열 불변 검증
const sampleHtml = '<html><head><title>t</title></head><body><div class="page"></div></body></html>';
const injected = injectPrintCss(sampleHtml);
check('injectPrintCss: </head> 직전 주입', injected.includes('data-pdf-print="v1"') && injected.indexOf('data-pdf-print') < injected.indexOf('</head>'));
check('injectPrintCss: 원본 문자열 불변(입력 보존)', sampleHtml === '<html><head><title>t</title></head><body><div class="page"></div></body></html>');
check('injectPrintCss: @page A4 포함', injected.includes('@page') && injected.includes('A4'));
check('injectPrintCss: break-inside 보호', injected.includes('break-inside: avoid'));
check('injectPrintCss: print-color-adjust 포함', injected.includes('print-color-adjust: exact'));
check('injectPrintCss: </head> 없으면 앞에 prepend', injectPrintCss('<body>x</body>').startsWith(PRINT_CSS));

// html → pdf 매핑
check('htmlToPdfName: book.modern.html → .pdf', htmlToPdfName('book.modern.html') === 'book.modern.pdf');
check('htmlToPdfName: 경로 포함', htmlToPdfName('output/book.preview.html') === 'output/book.preview.pdf');

// %PDF 헤더
check('isPdfBuffer: %PDF- → true', isPdfBuffer(Buffer.from('%PDF-1.7\n...')) === true);
check('isPdfBuffer: 비-PDF → false', isPdfBuffer(Buffer.from('<html>')) === false);
check('isPdfBuffer: 짧은 버퍼 → false', isPdfBuffer(Buffer.from('%PD')) === false);

// PDF 대상 목록(preview/modern/editorial/dashboard/bento 5종)
check('PDF_TARGETS: 5종 전부 포함', ['book.preview.html', 'book.modern.html', 'book.editorial.html', 'book.dashboard.html', 'book.bento.html'].every((f) => PDF_TARGETS.includes(f)));
check('PDF_TARGETS: Bento 포함', PDF_TARGETS.includes('book.bento.html'));
check('PDF_TARGETS: 5종 모두 .html', PDF_TARGETS.length === 5 && PDF_TARGETS.every((f) => f.endsWith('.html')));

// Bento print 단일컬럼 보정 마커
check('PRINT_CSS: .grid-bento 단일컬럼(display block)', PRINT_CSS.includes('.grid-bento') && PRINT_CSS.includes('display: block !important'));
check('PRINT_CSS: grid 자식 width 100%', PRINT_CSS.includes('width: 100% !important'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
