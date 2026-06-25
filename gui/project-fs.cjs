/**
 * Ebook Publishing System — 프로젝트 작업공간 파일 연산(순수 FS, 테스트 가능)
 *
 * "하나의 책 = 하나의 프로젝트" 격리의 핵심 로직. Electron 비의존(fs/path 만) →
 * 단위 테스트(test/project-fs.test.ts)에서 require 해 검증한다.
 *
 * 섞임 방지 원칙: 활성 프로젝트를 엔진 표준 위치로 동기화할 때, 표준 이미지 폴더를
 * "비우고(clear)" 해당 프로젝트의 이미지만 복사한다. → 이전 책 이미지가 다음 책에 섞이지 않음.
 */

const fs = require('node:fs');
const path = require('node:path');

const IMG_RE = /\.(png|jpe?g)$/i;

function safeName(s) {
  return String(s == null ? '' : s).replace(/[\\/:*?"<>|\n\r\t]/g, '').trim().slice(0, 60) || '제목없음';
}

function countImages(dir) {
  try { return fs.readdirSync(dir).filter((f) => IMG_RE.test(f)).length; } catch { return 0; }
}

/** 디렉터리 "내용"만 비운다(폴더 자체는 유지/생성). */
function clearDirContents(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f), { recursive: true, force: true });
}

/** src 의 (필터 통과) 파일들을 dst 로 복사. 반환=복사 개수. */
function copyFilesInto(src, dst, filter) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(src)) {
    const s = path.join(src, f);
    try { if (fs.statSync(s).isFile() && (!filter || filter(f))) { fs.copyFileSync(s, path.join(dst, f)); n++; } } catch {}
  }
  return n;
}

function firstH1Title(mdPath) {
  try {
    for (const line of fs.readFileSync(mdPath, 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith('# ') && !t.startsWith('## ')) return t.slice(2).trim();
    }
  } catch {}
  return '';
}

/** 프로젝트에 적용된 원본 원고 파일명(불러오기 시 기록). 없으면 null. */
function readSourceName(projectDir) {
  try { return fs.readFileSync(path.join(projectDir, 'book.source.txt'), 'utf8').trim() || null; } catch { return null; }
}

/** projectsRoot 하위의 프로젝트 목록. */
function listProjects(projectsRoot) {
  fs.mkdirSync(projectsRoot, { recursive: true });
  return fs.readdirSync(projectsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const p = path.join(projectsRoot, d.name);
      return { name: d.name, path: p, hasMd: fs.existsSync(path.join(p, 'book.md')), imageCount: countImages(path.join(p, 'images')), sourceName: readSourceName(p) };
    });
}

/** 새 프로젝트 생성(images/output 만; book.md 는 만들지 않음 → "원고 없음"으로 시작).
 *  starterMd 가 명시되면 그때만 book.md 시드(흡수 등 특수용). 중복은 폴더 존재로 판정. */
function createProject(projectsRoot, name, starterMd) {
  const nm = safeName(name);
  const dir = path.join(projectsRoot, nm);
  const exists = fs.existsSync(dir);
  fs.mkdirSync(path.join(dir, 'images'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'output'), { recursive: true });
  if (!exists && starterMd != null) fs.writeFileSync(path.join(dir, 'book.md'), starterMd, 'utf8');
  return { ok: !exists, name: nm, path: dir, existed: exists };
}

/** 첫 실행(프로젝트 없음) + 기존 작업(canonicalMd) 있으면 손실 없이 프로젝트로 흡수. */
function seedDefaultProjectIfEmpty(projectsRoot, canonicalMd, canonicalImages) {
  if (listProjects(projectsRoot).length > 0) return null;
  if (!fs.existsSync(canonicalMd)) return null;
  const name = safeName(firstH1Title(canonicalMd) || '내 전자책');
  const dir = path.join(projectsRoot, name);
  fs.mkdirSync(path.join(dir, 'images'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'output'), { recursive: true });
  fs.copyFileSync(canonicalMd, path.join(dir, 'book.md'));
  copyFilesInto(canonicalImages, path.join(dir, 'images'), (f) => IMG_RE.test(f));
  return { name, path: dir };
}

/** 활성 프로젝트 → 엔진 표준 위치 동기화(섞임 방지: 표준 이미지 폴더 비우고 프로젝트 것만 채움). */
function syncProjectIn(projectPath, canonicalMd, canonicalImages) {
  if (!projectPath) return 0;
  const md = path.join(projectPath, 'book.md');
  // 원고가 있으면 반영, 없으면 placeholder 로 덮어써서 다른 프로젝트 원고가 새지 않게 한다.
  if (fs.existsSync(md)) fs.copyFileSync(md, canonicalMd);
  else fs.writeFileSync(canonicalMd, '# (원고 없음)\n', 'utf8');
  clearDirContents(canonicalImages);
  return copyFilesInto(path.join(projectPath, 'images'), canonicalImages, (f) => IMG_RE.test(f));
}

/** 빌드 산출물 → 프로젝트 output 보관(섞임 방지). */
function syncProjectOut(projectPath, canonicalOutput) {
  if (!projectPath) return;
  const dst = path.join(projectPath, 'output');
  clearDirContents(dst);
  copyFilesInto(canonicalOutput, dst, null);
  const di = path.join(canonicalOutput, 'detail-images');
  if (fs.existsSync(di)) copyFilesInto(di, path.join(dst, 'detail-images'), null);
}

/** 프로젝트 책 기본정보 설정(book.config.json) 읽기. 없으면 {}. */
function readConfig(projectDir) {
  try { return JSON.parse(fs.readFileSync(path.join(projectDir, 'book.config.json'), 'utf8')); } catch { return {}; }
}
/** 프로젝트 책 기본정보 설정 저장. */
function writeConfig(projectDir, cfg) {
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'book.config.json'), JSON.stringify(cfg || {}, null, 2), 'utf8');
  return true;
}

module.exports = {
  IMG_RE, safeName, countImages, clearDirContents, copyFilesInto, firstH1Title,
  listProjects, createProject, seedDefaultProjectIfEmpty, syncProjectIn, syncProjectOut,
  readConfig, writeConfig,
};
