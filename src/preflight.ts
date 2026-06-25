/**
 * Ebook Publishing System — 사전 점검(Preflight) (v1)
 *
 * 빌드 전에 원고/표지/본문 이미지 상태를 사람이 이해하기 쉬운 형태로 점검한다.
 * 엔진 파이프라인(parser/image-prompt-manifest/cover-resolver)을 재사용만 하며 변경하지 않는다.
 *
 * 실행:
 *   npm run preflight                 input/book.md 점검(사람용 출력)
 *   node src/preflight.ts --input <경로>
 *   node src/preflight.ts --json      JSON 한 줄(=GUI/스크립트 연동용)
 *
 * 종료코드: 빌드 가능(파싱 OK + 챕터 1개 이상)=0, 빌드 불가=1. 이미지 누락은 경고일 뿐 실패 아님.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseBook } from './parser/parser.ts';
import { buildImagePromptManifest, type AssetLookup } from './image-prompts/image-prompt-manifest.ts';
import { resolveImageAsset } from './assets/image-asset-resolver.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

export interface PreflightImage {
  id: string;
  type: string;
  prompt: string;
  exists: boolean;
  recommendedPath: string;
  /** cover | chapter | detail | promo | generic — GUI 가 권장 비율/크기 안내에 사용 */
  usageHint: string;
}

export interface PreflightResult {
  ok: boolean;
  input: string;
  title: string;
  subtitle: string | null;
  author: string | null;
  chapters: number;
  cover: { id: string; exists: boolean; recommendedPath: string; prompt: string | null };
  images: { total: number; missing: number; items: PreflightImage[] };
  warnings: string[];
  errors: string[];
}

/** 원고 raw 에서 표지(:::image id|type: cover) 블록의 prompt 를 찾는다. 없으면 null.
 *  (표지 블록이 첫 챕터 앞에 있어 파서가 본문에서 제외해도 GUI 안내용으로 읽는다.) */
export function scanCoverPrompt(raw: string): string | null {
  const re = /:::image\b([\s\S]*?):::/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const body = m[1];
    const idM = /(^|\n)\s*id:\s*([^\n]+)/.exec(body);
    const typeM = /(^|\n)\s*type:\s*([^\n]+)/.exec(body);
    const isCover =
      (idM !== null && idM[2].trim().toLowerCase() === 'cover') ||
      (typeM !== null && typeM[2].trim().toLowerCase() === 'cover');
    if (isCover) {
      const pM = /(^|\n)\s*prompt:\s*([^\n]+)/.exec(body);
      return pM ? pM[2].trim() : null;
    }
  }
  return null;
}

/** 원고 텍스트 + 프로젝트 루트 → 사전 점검 결과(순수에 가까운 평가, 자산 존재 I/O 포함). */
export function preflight(inputPath: string, root: string = projectRoot): PreflightResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!existsSync(inputPath)) {
    return {
      ok: false,
      input: inputPath,
      title: '',
      subtitle: null,
      author: null,
      chapters: 0,
      cover: { id: 'cover', exists: false, recommendedPath: 'assets/images/cover.png' },
      images: { total: 0, missing: 0, items: [] },
      warnings,
      errors: [`원고 파일을 찾을 수 없습니다: ${inputPath}`],
    };
  }

  const raw = readFileSync(inputPath, 'utf8');
  const book = parseBook(raw);

  // 파싱 진단: 챕터 0개면 가장 흔한 원인(잘못된 헤딩 형식)을 친절히 안내
  if (book.chapters.length === 0) {
    const strayHeadings = raw
      .split(/\r?\n/)
      .filter((l) => /^##\s+/.test(l.trim()) && !/^##\s+Chapter\s+\d+\./i.test(l.trim()));
    if (strayHeadings.length > 0) {
      errors.push(
        `챕터를 찾지 못했습니다. 장 제목은 "## Chapter 1. 제목" 형식이어야 합니다. ` +
          `예: ${strayHeadings[0].trim()} → "## Chapter 1. ${strayHeadings[0].replace(/^##\s+/, '').trim()}"`,
      );
    } else {
      errors.push('챕터를 찾지 못했습니다. 최소 1개의 "## Chapter 1. 제목" 장이 필요합니다.');
    }
  }
  if (book.metadata.title.trim() === '') {
    warnings.push('제목(맨 위 "# 제목")이 비어 있습니다. 표지/판권에 "Untitled Ebook" 으로 표시됩니다.');
  }

  // 표지 이미지(assets/images/cover.* 또는 cover: 메타의 id)
  const coverId = book.metadata.cover ?? 'cover';
  const coverFound = resolveImageAsset(coverId, root, existsSync, () => Buffer.alloc(0));
  if (!coverFound) {
    warnings.push(`표지 이미지가 없습니다(assets/images/${coverId}.png). 텍스트 표지로 생성됩니다.`);
  }

  // 본문 이미지 슬롯(존재 여부만; 바이트 로딩 회피)
  const lookup: AssetLookup = (id) => {
    const r = resolveImageAsset(id, root, existsSync, () => Buffer.alloc(0));
    return r ? { path: r.path, ext: r.ext } : null;
  };
  const manifest = buildImagePromptManifest(book, lookup);
  // 표지(id/type cover)는 본문 이미지 목록에서 제외(표지 카드로 따로) — 개수도 본문 기준으로.
  const bodyItems = manifest.items.filter((i) => i.id.toLowerCase() !== 'cover' && i.usageHint !== 'cover');
  const bodyMissing = bodyItems.filter((i) => i.missing).length;
  if (bodyMissing > 0) {
    warnings.push(`본문 이미지 ${bodyItems.length}개 중 ${bodyMissing}개가 없습니다. 해당 자리는 자리표시자로 생성됩니다.`);
  }

  return {
    ok: errors.length === 0,
    input: inputPath,
    title: book.metadata.title,
    subtitle: book.metadata.subtitle ?? null,
    author: book.metadata.author ?? null,
    chapters: book.chapters.length,
    cover: { id: coverId, exists: !!coverFound, recommendedPath: `assets/images/${coverId}.png`, prompt: scanCoverPrompt(raw) },
    images: {
      total: bodyItems.length,
      missing: bodyMissing,
      items: bodyItems.map((i) => ({
        id: i.id,
        type: i.type,
        prompt: i.prompt,
        exists: i.exists,
        recommendedPath: i.recommendedPath,
        usageHint: i.usageHint,
      })),
    },
    warnings,
    errors,
  };
}

/** 사람용 출력(콘솔/GUI 로그). */
export function formatPreflight(r: PreflightResult): string {
  const L: string[] = [];
  L.push(`원고 점검: ${r.input}`);
  if (r.errors.length > 0) {
    for (const e of r.errors) L.push(`  ✗ ${e}`);
    L.push('  → 빌드를 진행할 수 없습니다. 위 문제를 먼저 해결하세요.');
    return L.join('\n');
  }
  L.push(`  ✓ 제목: ${r.title || '(없음)'}`);
  if (r.subtitle) L.push(`  ✓ 부제: ${r.subtitle}`);
  if (r.author) L.push(`  ✓ 저자: ${r.author}`);
  L.push(`  ✓ 챕터: ${r.chapters}개`);
  L.push(`  ${r.cover.exists ? '✓' : '·'} 표지 이미지: ${r.cover.exists ? r.cover.recommendedPath : '없음 → 텍스트 표지로 생성'}`);
  const ready = r.images.total - r.images.missing;
  L.push(`  ${r.images.missing === 0 ? '✓' : '·'} 본문 이미지: ${r.images.total}개 중 ${ready}개 준비${r.images.missing ? ` (누락 ${r.images.missing})` : ''}`);
  for (const it of r.images.items) {
    L.push(`      ${it.exists ? '✓' : '✗'} ${it.id}${it.exists ? '' : `  → 넣을 위치: ${it.recommendedPath}`}`);
  }
  if (r.warnings.length > 0) {
    L.push('  안내:');
    for (const w of r.warnings) L.push(`    · ${w}`);
  }
  L.push('  → 빌드 준비 완료.');
  return L.join('\n');
}

// CLI 실행(직접 실행 시에만). import 시에는 부작용 없음.
const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const i = process.argv.indexOf('--input');
  const inputPath = i >= 0 && process.argv[i + 1] ? resolve(projectRoot, process.argv[i + 1]) : resolve(projectRoot, 'input', 'book.md');
  const r = preflight(inputPath);
  if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(r) + '\n');
  } else {
    console.log(formatPreflight(r));
  }
  process.exitCode = r.ok ? 0 : 1;
}
