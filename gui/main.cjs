/**
 * Ebook Publishing System — Electron GUI (사용성 안정화판)
 *
 * 엔진 재개발 없음. GUI 는 기존 빌드 흐름을 "실행만" 한다.
 * 흐름: 원고(.md) 선택 → 이미지 폴더 선택 → 점검(preflight) → 전자책 만들기(build:all)
 *       → 산출물 존재 검증 → 결과 열기.
 *
 * 실행: npm run gui   (electron gui/main.cjs)
 * 주의: Electron main/preload 은 CommonJS(.cjs). repo 는 type:module 이라 .js=ESM 이므로 .cjs 사용.
 */

const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const pfs = require('./project-fs.cjs');

const projectRoot = path.resolve(__dirname, '..');
const out = (n) => path.resolve(projectRoot, 'output', n);

// 엔진 표준(스크래치) 위치 — 프로젝트를 여기로 동기화한 뒤 빌드한다(엔진 무변경).
const canonicalMd = path.resolve(projectRoot, 'input', 'book.md');
const canonicalConfig = path.resolve(projectRoot, 'input', 'book.config.json');
const canonicalImages = path.resolve(projectRoot, 'assets', 'images');
const canonicalOutput = path.resolve(projectRoot, 'output');
// 프로젝트별 작업 공간 루트 — 하나의 책 = 하나의 프로젝트.
const projectsRoot = path.resolve(projectRoot, 'projects');

const STARTER_MD = `# 새 전자책 제목

subtitle: 한 줄 부제
author: 저자 이름

## Chapter 1. 첫 번째 장

여기에 원고를 씁니다. STEP 1의 AI 프롬프트로 원고를 만들어 이 파일에 붙여넣으세요.
`;

const safeName = pfs.safeName;
function listProjectsRaw() { return pfs.listProjects(projectsRoot); }
function seedDefaultProjectIfEmpty() { pfs.seedDefaultProjectIfEmpty(projectsRoot, canonicalMd, canonicalImages); }
// 활성 프로젝트 → 엔진 표준 위치 동기화(섞임 방지: 표준 이미지 폴더 비우고 프로젝트 것만 채움).
function syncProjectIn(projectPath, log) {
  if (!projectPath) return;
  const n = pfs.syncProjectIn(projectPath, canonicalMd, canonicalImages);
  if (log) log(`프로젝트 동기화: 이미지 ${n}개 적용(이전 프로젝트 이미지 비움)\n`);
}
function syncProjectOut(projectPath) { pfs.syncProjectOut(projectPath, canonicalOutput); }

// build:all 이 만들어내는, 사용자에게 보여줄 핵심 산출물(존재 검증 대상).
const EXPECTED_OUTPUTS = [
  { file: 'book.pdf', label: '전자책 PDF (대표)' },
  { file: 'book-paged.pdf', label: '출판용 PDF (쪽번호·러닝헤드)' },
  { file: 'book.docx', label: 'Word 문서 (DOCX)' },
  { file: 'book.epub', label: '전자책 (EPUB)' },
  { file: 'book.html', label: '웹 미리보기 (HTML)' },
  { file: 'kmong-preview.pdf', label: '크몽 미리보기 PDF' },
];

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 820,
    title: 'Ebook Publishing — 전자책 만들기',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs') },
  });
  win.loadFile(path.join(__dirname, 'index.html'));
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  // 스모크 테스트: SMOKE=1 이면 창 생성 후 자동 종료(렌더 무중단 확인용)
  if (process.env.SMOKE === '1') {
    setTimeout(() => app.quit(), 2500);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('paths', () => ({
  outputDir: path.resolve(projectRoot, 'output'),
  defaultMd: path.resolve(projectRoot, 'input', 'book.md'),
  defaultImages: path.resolve(projectRoot, 'assets', 'images'),
  projectsRoot,
}));

// 프로젝트 목록(첫 실행이면 기존 작업을 프로젝트로 흡수).
ipcMain.handle('list-projects', () => {
  try { seedDefaultProjectIfEmpty(); } catch {}
  return listProjectsRaw();
});

// 새 프로젝트 생성(images/ + output/ 만; 원고는 사용자가 직접 불러와야 "적용됨").
ipcMain.handle('create-project', (e, name) => {
  const r = pfs.createProject(projectsRoot, name, null);
  if (!r.ok) return { ok: false, error: '같은 이름의 프로젝트가 이미 있습니다.', name: r.name, path: r.path };
  return { ok: true, name: r.name, path: r.path };
});

// 원고(.md) 를 프로젝트로 가져오기(book.md 로 복사 + 원본 파일명 기록).
ipcMain.handle('import-manuscript', async (e, payload) => {
  if (!payload || !payload.projectPath) return { ok: false, error: '프로젝트가 선택되지 않았습니다.' };
  const r = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Markdown 원고', extensions: ['md'] }] });
  if (r.canceled) return { ok: false, canceled: true };
  const src = r.filePaths[0];
  fs.copyFileSync(src, path.join(payload.projectPath, 'book.md'));
  try { fs.writeFileSync(path.join(payload.projectPath, 'book.source.txt'), path.basename(src), 'utf8'); } catch {}
  return { ok: true, from: src, sourceName: path.basename(src) };
});

// 이미지 폴더에서 프로젝트 images/ 로 가져오기.
ipcMain.handle('import-images', async (e, payload) => {
  if (!payload || !payload.projectPath) return { ok: false, error: '프로젝트가 선택되지 않았습니다.' };
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (r.canceled) return { ok: false, canceled: true };
  const n = copyFilesInto(r.filePaths[0], path.join(payload.projectPath, 'images'), (f) => /\.(png|jpe?g)$/i.test(f));
  return { ok: true, count: n };
});

// 프로젝트 삭제(폴더 단위). 안전: projectsRoot 하위만 + 메인 프로세스 confirm.
ipcMain.handle('delete-project', async (e, payload) => {
  if (!payload || !payload.projectPath) return { ok: false, error: '프로젝트가 선택되지 않았습니다.' };
  const target = path.resolve(payload.projectPath);
  const within = target.startsWith(path.resolve(projectsRoot) + path.sep);
  if (!within) return { ok: false, error: '프로젝트 폴더만 삭제할 수 있습니다.' };
  const res = await dialog.showMessageBox({
    type: 'warning',
    buttons: ['취소', '삭제'],
    defaultId: 0,
    cancelId: 0,
    message: '이 프로젝트를 삭제할까요?',
    detail: '원고, 이미지, 결과물이 모두 삭제됩니다. 되돌릴 수 없습니다.\n\n' + target,
  });
  if (res.response !== 1) return { ok: false, canceled: true };
  try { fs.rmSync(target, { recursive: true, force: true }); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

// 프로젝트 폴더/이미지 폴더 열기.
ipcMain.handle('open-project-dir', (e, payload) => {
  if (!payload || !payload.projectPath) return '';
  const sub = payload.sub ? path.join(payload.projectPath, payload.sub) : payload.projectPath;
  fs.mkdirSync(sub, { recursive: true });
  return shell.openPath(sub);
});

// 책 기본정보(저작권/발행/저자 등) 읽기/저장 — 프로젝트별 book.config.json.
ipcMain.handle('get-config', (e, payload) => {
  if (!payload || !payload.projectPath) return {};
  return pfs.readConfig(payload.projectPath);
});
ipcMain.handle('save-config', (e, payload) => {
  if (!payload || !payload.projectPath) return { ok: false, error: '프로젝트가 선택되지 않았습니다.' };
  try { pfs.writeConfig(payload.projectPath, payload.config || {}); return { ok: true }; }
  catch (err) { return { ok: false, error: err.message }; }
});

ipcMain.handle('select-md', async () => {
  const r = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Markdown 원고', extensions: ['md'] }],
  });
  return r.canceled ? null : r.filePaths[0];
});

ipcMain.handle('select-images', async () => {
  const r = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});

function copyImages(srcDir) {
  const dst = path.resolve(projectRoot, 'assets', 'images');
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(srcDir)) {
    if (/\.(png|jpe?g)$/i.test(f)) {
      fs.copyFileSync(path.join(srcDir, f), path.join(dst, f));
      n++;
    }
  }
  return n;
}

/** 입력 반영: 활성 프로젝트가 있으면 그 프로젝트를 표준 위치로 동기화(섞임 방지),
 *  없으면 레거시(선택 md/이미지 폴더) 방식. log 콜백 선택. */
// 프로젝트 책 정보 설정 → 표준 위치(input/book.config.json). 없으면 표준 설정 제거(섞임 방지).
function syncConfigIn(projectPath) {
  const src = path.join(projectPath, 'book.config.json');
  if (fs.existsSync(src)) { try { fs.copyFileSync(src, canonicalConfig); } catch {} }
  else { try { fs.rmSync(canonicalConfig, { force: true }); } catch {} }
}

function prepareInputs(payload, log) {
  if (payload && payload.projectPath) {
    syncProjectIn(payload.projectPath, log);
    syncConfigIn(payload.projectPath);
    return;
  }
  if (payload && payload.mdPath) {
    fs.copyFileSync(payload.mdPath, canonicalMd);
    if (log) log(`원고 적용: ${payload.mdPath}\n  → input/book.md\n`);
  } else if (log) {
    log('원고: 기본 input/book.md 사용\n');
  }
  if (payload && payload.imagesDir) {
    const n = copyImages(payload.imagesDir);
    if (log) log(`이미지 적용: ${payload.imagesDir} (${n}개)\n  → assets/images/\n`);
  } else if (log) {
    log('이미지: 기본 assets/images/ 사용\n');
  }
}

/** src/preflight.ts --json 을 실행해 점검 결과(JSON)를 돌려준다. */
function runPreflight() {
  return new Promise((resolve) => {
    const child = spawn('node', ['src/preflight.ts', '--json'], { cwd: projectRoot, shell: true });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));
    child.on('error', (e) => resolve({ ok: false, errors: [`점검 실행 오류: ${e.message}`], warnings: [], images: { items: [] } }));
    child.on('close', () => {
      const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop();
      try {
        resolve(JSON.parse(line));
      } catch (e) {
        resolve({ ok: false, errors: [`점검 결과 해석 실패: ${stderr || (e && e.message) || '알 수 없음'}`], warnings: [], images: { items: [] } });
      }
    });
  });
}

// 점검만: 입력 반영 후 preflight 결과 반환(빌드 안 함).
ipcMain.handle('preflight', async (event, payload) => {
  try {
    prepareInputs(payload, null);
  } catch (e) {
    return { ok: false, errors: [`입력 준비 오류: ${e.message}`], warnings: [], images: { items: [] } };
  }
  return await runPreflight();
});

// 미리보기: 입력 반영 → HTML 만 생성(npm run build:html, Chrome 불필요·빠름). 이미지 없으면 자리표시자.
ipcMain.handle('preview', async (event, payload) => {
  const wc = event.sender;
  const log = (s) => wc.send('build-log', s);
  const stage = (s) => wc.send('build-stage', s);
  try {
    stage('미리보기 준비 중…');
    prepareInputs(payload, log);
  } catch (e) {
    log(`✗ 준비 단계 오류: ${e.message}\n`);
    return { ok: false, error: e.message };
  }
  // 파싱 가능 여부 먼저 확인(빈/잘못된 원고면 미리보기도 의미 없음)
  const pre = await runPreflight();
  if (!pre.ok) {
    log('\n=== 원고 점검 실패 — 미리보기를 만들 수 없습니다 ===\n');
    for (const e of pre.errors || []) log(`  ✗ ${e}\n`);
    return { ok: false, preflight: pre };
  }
  return await new Promise((resolve) => {
    log('\n=== 미리보기 생성 (npm run build:html) ===\n');
    stage('미리보기 HTML 생성 중…');
    const child = spawn('npm', ['run', 'build:html'], { cwd: projectRoot, shell: true });
    child.stdout.on('data', (d) => log(d.toString()));
    child.stderr.on('data', (d) => log(d.toString()));
    child.on('error', (e) => log(`✗ 실행 오류: ${e.message}\n`));
    child.on('close', (code) => {
      const htmlPath = out('book.html');
      const exists = fs.existsSync(htmlPath);
      // 미리보기 HTML 을 프로젝트 output 으로 복사(자기완결형 — 이미지는 data URI 임베드).
      let finalPath = htmlPath;
      const proj = payload && payload.projectPath;
      if (exists && proj) {
        try {
          const dstDir = path.join(proj, 'output');
          fs.mkdirSync(dstDir, { recursive: true });
          finalPath = path.join(dstDir, 'book.html');
          fs.copyFileSync(htmlPath, finalPath);
        } catch (e2) { log(`⚠ 프로젝트 미리보기 보관 오류: ${e2.message}\n`); finalPath = htmlPath; }
      }
      stage(code === 0 && exists ? '미리보기 준비됨' : '오류');
      log(`\n미리보기 종료 (code ${code}).${exists ? ' ' + (proj ? '프로젝트 output/book.html' : 'output/book.html') + ' 준비됨.' : ' HTML 생성 실패.'}\n`);
      resolve({ ok: code === 0 && exists, path: finalPath, preflight: pre });
    });
  });
});

// 텍스트 클립보드 복사(프롬프트/예시 복사용).
ipcMain.handle('copy-text', (e, text) => {
  clipboard.writeText(String(text == null ? '' : text));
  return true;
});

// 빌드: 입력 반영 → 점검(실패면 중단) → build:all → 산출물 존재 검증.
ipcMain.handle('build', async (event, payload) => {
  const wc = event.sender;
  const log = (s) => wc.send('build-log', s);
  const stage = (s) => wc.send('build-stage', s);

  try {
    stage('입력 준비 중…');
    prepareInputs(payload, log);
  } catch (e) {
    log(`✗ 준비 단계 오류: ${e.message}\n`);
    return { ok: false, stage: 'prepare', files: [], outputs: [], detailCount: 0 };
  }

  // 사전 점검 — 파싱 불가(챕터 없음/파일 없음)면 빌드하지 않고 친절히 중단
  stage('원고 점검 중…');
  const pre = await runPreflight();
  if (!pre.ok) {
    log('\n=== 원고 점검 실패 — 빌드를 진행하지 않습니다 ===\n');
    for (const e of pre.errors || []) log(`  ✗ ${e}\n`);
    return { ok: false, stage: 'preflight', preflight: pre, files: [], outputs: [], detailCount: 0 };
  }
  for (const w of pre.warnings || []) log(`  · ${w}\n`);

  return await new Promise((resolve) => {
    log('\n=== 전자책 생성 시작 (npm run build:all) ===\n');
    stage('전자책 생성 중… (PDF/DOCX/EPUB)');
    const child = spawn('npm', ['run', 'build:all'], { cwd: projectRoot, shell: true });
    child.stdout.on('data', (d) => {
      const s = d.toString();
      log(s);
      // 진행 단계 힌트: 릴리스 [k/n] 라벨 또는 paged 렌더링 라인
      const m = s.match(/\[(\d+)\/(\d+)\]\s+([^\n(]+)/);
      if (m) stage(`생성 중 ${m[1]}/${m[2]} — ${m[3].trim()}`);
      else if (/book-paged\.pdf 생성/.test(s)) stage('출판용 PDF(book-paged.pdf) 생성 중…');
    });
    child.stderr.on('data', (d) => log(d.toString()));
    child.on('error', (e) => log(`✗ 실행 오류: ${e.message}\n`));
    child.on('close', (code) => {
      // 산출물을 프로젝트 output 으로 보관(섞임 방지) 후, 그 위치 기준으로 검증.
      const proj = payload && payload.projectPath;
      try { syncProjectOut(proj); } catch (e2) { log(`⚠ 프로젝트 보관 오류: ${e2.message}\n`); }
      const outDir = proj ? path.join(proj, 'output') : canonicalOutput;
      const outputs = EXPECTED_OUTPUTS.map((o) => ({
        ...o,
        exists: fs.existsSync(path.join(outDir, o.file)),
        path: path.join(outDir, o.file),
      }));
      const files = outputs.filter((o) => o.exists).map((o) => o.file);
      const missing = outputs.filter((o) => !o.exists);
      const detailDir = path.join(outDir, 'detail-images');
      const detailCount = fs.existsSync(detailDir) ? fs.readdirSync(detailDir).length : 0;

      if (missing.length > 0) {
        log(`\n⚠ 일부 산출물이 생성되지 않았습니다: ${missing.map((m) => m.file).join(', ')}\n`);
      }
      log(`\n빌드 종료 (code ${code}). 산출물 ${files.length}/${EXPECTED_OUTPUTS.length}개 확인.${proj ? ' (프로젝트 output 에 보관됨)' : ''}\n`);
      stage(code === 0 && missing.length === 0 ? '완료' : '오류');
      resolve({
        ok: code === 0 && missing.length === 0,
        code,
        stage: 'build',
        outputs,
        files,
        detailCount,
        outputDir: outDir,
      });
    });
  });
});

ipcMain.handle('open-path', async (e, p) => {
  const r = await shell.openPath(p);
  return r; // '' = 성공
});
