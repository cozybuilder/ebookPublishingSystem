/**
 * Ebook Publishing System — PNG Export 순수 함수 테스트 (v1)
 *
 * 브라우저/파일 의존 없는 부분만 검증(브라우저 탐지 로직 + PNG 헤더 파싱).
 * 실제 캡처(export:png)는 환경 의존이라 npm test 에 포함하지 않는다.
 * 실행: npm run test:export
 */

import { findBrowser, BROWSER_CANDIDATES } from '../src/export/browser.ts';
import { readPngSize } from '../src/export/png-size.ts';

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

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
