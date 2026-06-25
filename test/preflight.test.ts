/**
 * Ebook Publishing System — 사전 점검(Preflight) 테스트 (v1)
 *
 * 임시 디렉터리에 원고/자산을 구성해 점검 결과를 검증한다. 실행: npm run test:preflight
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { preflight, formatPreflight } from '../src/preflight.ts';

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

console.log('Preflight 테스트 실행\n');

const root = mkdtempSync(resolve(tmpdir(), 'ebook-preflight-'));
mkdirSync(resolve(root, 'input'), { recursive: true });
mkdirSync(resolve(root, 'assets', 'images'), { recursive: true });
const write = (rel: string, s: string) => writeFileSync(resolve(root, rel), s, 'utf8');

try {
  // ── 1) 정상 원고(이미지/표지 없음) ──
  write(
    'input/book.md',
    '# 내 책\n\nsubtitle: 부제\nauthor: 홍길동\n\n## Chapter 1. 첫장\n\n본문\n\n:::image\nid: IMG-001\ntype: chapter\nprompt: 그림\n:::\n',
  );
  const r1 = preflight(resolve(root, 'input/book.md'), root);
  check('정상 원고: ok=true', r1.ok === true);
  check('제목/부제/저자/챕터 파싱', r1.title === '내 책' && r1.subtitle === '부제' && r1.author === '홍길동' && r1.chapters === 1);
  check('표지 없음 → exists=false + 경고', r1.cover.exists === false && r1.warnings.some((w) => w.includes('표지')));
  check('본문 이미지 1개 모두 누락 집계', r1.images.total === 1 && r1.images.missing === 1);
  check('형식 출력: 빌드 준비 완료 + 누락 위치 안내', formatPreflight(r1).includes('빌드 준비 완료') && formatPreflight(r1).includes('IMG-001'));

  // ── 2) 표지+이미지 채워진 경우 ──
  writeFileSync(resolve(root, 'assets/images/cover.png'), Buffer.from([0x89, 0x50]));
  writeFileSync(resolve(root, 'assets/images/IMG-001.png'), Buffer.from([0x89, 0x50]));
  const r2 = preflight(resolve(root, 'input/book.md'), root);
  check('표지/이미지 채움: exists=true, 누락 0', r2.cover.exists === true && r2.images.missing === 0);
  check('채워진 경우 표지 경고 없음', !r2.warnings.some((w) => w.includes('표지')));

  // ── 3) 잘못된 헤딩(챕터 0) → ok=false + 친절 오류 ──
  write('input/bad.md', '# 책\n\n## 들어가며\n\n본문\n');
  const r3 = preflight(resolve(root, 'input/bad.md'), root);
  check('잘못된 헤딩: ok=false', r3.ok === false);
  check('오류 메시지에 Chapter 형식 안내', r3.errors.some((e) => e.includes('## Chapter 1.')));
  check('형식 출력: 진행 불가 안내', formatPreflight(r3).includes('빌드를 진행할 수 없습니다'));

  // ── 4) 원고 파일 없음 ──
  const r4 = preflight(resolve(root, 'input/none.md'), root);
  check('파일 없음: ok=false + 오류', r4.ok === false && r4.errors.some((e) => e.includes('찾을 수 없습니다')));

  // ── 5) 표지(cover) 블록: 본문에서 분리 + prompt 스캔 ──
  write(
    'input/cover.md',
    '# 표지책\n\nauthor: 저자\n\n:::image\nid: cover\ntype: cover\nfilename: cover.png\nprompt: 전자책 표지 디자인 프롬프트\n:::\n\n## Chapter 1. 가\n\n본문\n\n:::image\nid: IMG-001\ntype: chapter\nprompt: 본문 그림\n:::\n',
  );
  const rc = preflight(resolve(root, 'input/cover.md'), root);
  check('cover 블록 prompt 스캔', rc.cover.prompt === '전자책 표지 디자인 프롬프트');
  check('cover 는 본문 이미지에서 제외(IMG-001만)', rc.images.total === 1 && rc.images.items.every((i) => i.id !== 'cover') && rc.images.items[0].id === 'IMG-001');
  // cover 블록 없으면 prompt=null
  check('cover 블록 없으면 prompt null', preflight(resolve(root, 'input/book.md'), root).cover.prompt === null);
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
