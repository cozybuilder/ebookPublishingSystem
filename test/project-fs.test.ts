/**
 * Ebook Publishing System — 프로젝트 작업공간 격리 테스트 (v1)
 *
 * gui/project-fs.cjs(순수 FS)를 require 해 "하나의 책=하나의 프로젝트" 격리를 검증한다.
 * 핵심: syncProjectIn 이 표준 이미지 폴더를 비우고 해당 프로젝트 이미지만 채워 섞임을 막는다.
 * 실행: npm run test:project-fs
 */

import { createRequire } from 'node:module';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pfs = require(resolve(fileURLToPath(import.meta.url), '..', '..', 'gui', 'project-fs.cjs'));

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failures.push(detail ? `${name} — ${detail}` : name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('프로젝트 작업공간 격리 테스트 실행\n');

const root = mkdtempSync(resolve(tmpdir(), 'ebook-pfs-'));
const projectsRoot = join(root, 'projects');
const canonicalMd = join(root, 'input', 'book.md');
const canonicalImages = join(root, 'assets', 'images');
const canonicalOutput = join(root, 'output');
mkdirSync(join(root, 'input'), { recursive: true });
mkdirSync(canonicalImages, { recursive: true });
mkdirSync(canonicalOutput, { recursive: true });

try {
  // ── safeName ──
  check('safeName: 금지문자 제거', pfs.safeName('사랑/이별:50선*?') === '사랑이별50선');
  check('safeName: 빈값 기본', pfs.safeName('   ') === '제목없음');

  // ── 두 프로젝트 생성 + 서로 다른 이미지 ──
  const A = pfs.createProject(projectsRoot, '책A', '# 책A\n\n## Chapter 1. 가\n\n본문');
  const B = pfs.createProject(projectsRoot, '책B', '# 책B\n\n## Chapter 1. 나\n\n본문');
  check('createProject: 생성 ok', A.ok && B.ok);
  check('createProject: 중복 차단', pfs.createProject(projectsRoot, '책A', 'x').ok === false);
  writeFileSync(join(A.path, 'images', 'cover.png'), Buffer.from([0x89]));
  writeFileSync(join(A.path, 'images', 'IMG-001.png'), Buffer.from([0x89]));
  writeFileSync(join(B.path, 'images', 'cover.png'), Buffer.from([0x89]));

  // ── 핵심: A 동기화 → 표준 폴더에 A 이미지 2개만 ──
  const nA = pfs.syncProjectIn(A.path, canonicalMd, canonicalImages);
  check('syncIn(A): 이미지 2개 복사', nA === 2);
  check('syncIn(A): 표준 폴더 = A 이미지(IMG-001 있음)', existsSync(join(canonicalImages, 'IMG-001.png')));
  check('syncIn(A): book.md 반영', existsSync(canonicalMd));

  // ── 누수 방지: B 동기화 → A 의 IMG-001 이 사라지고 B 것만 ──
  const nB = pfs.syncProjectIn(B.path, canonicalMd, canonicalImages);
  check('syncIn(B): 이미지 1개', nB === 1);
  check('★ 누수 방지: B 동기화 후 A 의 IMG-001 제거됨', !existsSync(join(canonicalImages, 'IMG-001.png')));
  check('syncIn(B): 표준 폴더에 cover.png 만', readdirSync(canonicalImages).filter((f) => /\.(png|jpe?g)$/i.test(f)).length === 1);

  // ── syncOut: 산출물 → 프로젝트 output ──
  writeFileSync(join(canonicalOutput, 'book.pdf'), Buffer.from('%PDF-'));
  mkdirSync(join(canonicalOutput, 'detail-images'), { recursive: true });
  writeFileSync(join(canonicalOutput, 'detail-images', '00-cover.png'), Buffer.from([0x89]));
  pfs.syncProjectOut(B.path, canonicalOutput);
  check('syncOut(B): book.pdf 보관', existsSync(join(B.path, 'output', 'book.pdf')));
  check('syncOut(B): detail-images 보관', existsSync(join(B.path, 'output', 'detail-images', '00-cover.png')));

  // ── listProjects ──
  const list = pfs.listProjects(projectsRoot);
  check('listProjects: 2개 + 메타', list.length === 2 && list.every((p: any) => p.hasMd));

  // ── seedDefaultProjectIfEmpty: 빈 projects 에서 흡수 ──
  const root2 = mkdtempSync(resolve(tmpdir(), 'ebook-pfs2-'));
  mkdirSync(join(root2, 'input'), { recursive: true });
  mkdirSync(join(root2, 'assets', 'images'), { recursive: true });
  writeFileSync(join(root2, 'input', 'book.md'), '# 흡수될 책\n\n## Chapter 1. 가\n\n본문');
  writeFileSync(join(root2, 'assets', 'images', 'cover.png'), Buffer.from([0x89]));
  const seeded = pfs.seedDefaultProjectIfEmpty(join(root2, 'projects'), join(root2, 'input', 'book.md'), join(root2, 'assets', 'images'));
  check('seed: 제목 기반 프로젝트 생성', seeded && seeded.name === '흡수될 책');
  check('seed: book.md + 이미지 흡수', existsSync(join(seeded.path, 'book.md')) && existsSync(join(seeded.path, 'images', 'cover.png')));
  check('seed: 이미 있으면 재시드 안 함', pfs.seedDefaultProjectIfEmpty(join(root2, 'projects'), join(root2, 'input', 'book.md'), join(root2, 'assets', 'images')) === null);
  rmSync(root2, { recursive: true, force: true });
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
