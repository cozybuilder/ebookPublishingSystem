/**
 * Ebook Publishing System — 이미지 자산 규약 테스트 (v1)
 *
 * 순수 후보 목록 + 주입형 탐색(실파일 비의존). 실행: npm run test:image-asset
 */

import { imageAssetCandidates, resolveImageAsset } from '../src/assets/image-asset-resolver.ts';
import { resolve } from 'node:path';

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

console.log('이미지 자산 규약 테스트 실행\n');

const ROOT = 'C:/proj';

// ===== 후보 목록(순수) =====
const cands = imageAssetCandidates('IMG-001').map((c) => c.rel);
check(
  '후보 순서: images/ png→jpg→jpeg → 레거시 assets/',
  JSON.stringify(cands) ===
    JSON.stringify([
      'assets/images/IMG-001.png',
      'assets/images/IMG-001.jpg',
      'assets/images/IMG-001.jpeg',
      'assets/IMG-001.png',
      'assets/IMG-001.jpg',
      'assets/IMG-001.jpeg',
    ]),
);

const buf = (s: string) => Buffer.from(s);
function resolveWith(id: string, present: string[]) {
  const set = new Set(present.map((p) => resolve(ROOT, p)));
  return resolveImageAsset(id, ROOT, (p) => set.has(p), (p) => buf(p));
}

// ===== 우선순위/탐색 =====
const r1 = resolveWith('A', ['assets/images/A.png', 'assets/images/A.jpg', 'assets/A.png']);
check('images/<id>.png 최우선', !!r1 && r1.ext === 'png' && r1.path.includes('images'));
const r2 = resolveWith('B', ['assets/images/B.jpg', 'assets/images/B.jpeg']);
check('png 없으면 jpg fallback', !!r2 && r2.ext === 'jpg');
const r3 = resolveWith('C', ['assets/images/C.jpeg']);
check('jpg 없으면 jpeg fallback', !!r3 && r3.ext === 'jpeg');

// ===== 레거시 호환 =====
const r4 = resolveWith('D', ['assets/D.png']);
check('레거시 assets/<id>.png 호환', !!r4 && r4.ext === 'png' && !r4.path.includes('images'));
const r5 = resolveWith('E', ['assets/E.jpeg']);
check('레거시 assets/<id>.jpeg 호환', !!r5 && r5.ext === 'jpeg');
// 표준이 레거시보다 우선
const r6 = resolveWith('F', ['assets/F.png', 'assets/images/F.jpeg']);
check('표준(images/jpeg)이 레거시(assets/png)보다 우선', !!r6 && r6.path.includes('images') && r6.ext === 'jpeg');

// ===== 없음 =====
check('파일 없으면 null', resolveWith('Z', []) === null);

// ===== data 로드 =====
const r7 = resolveWith('G', ['assets/images/G.png']);
check('data 로드(주입 read)', !!r7 && r7.data.length > 0);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
