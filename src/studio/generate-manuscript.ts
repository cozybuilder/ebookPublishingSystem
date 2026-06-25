/**
 * Ebook Publishing System — 본문 생성 CLI (scaffold)
 *
 * 입력: output/chapter-plan.json  (먼저 npm run studio:plan 실행)
 * 출력: output/manuscript.json  (구조화 원고)
 *       output/manuscript.md    (읽기 버전)
 *
 * 방식: scaffold (비용 0 · 오프라인 · 외부 API 미사용)
 *  - 기준정보(Content Assembly Engine) 확정으로 AI API 자동 호출은 제거되었다.
 *
 * 실행: npm run studio:body
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateManuscript, renderManuscriptMarkdown } from './body-generator.ts';
import type { ChapterPlan } from './studio-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

function loadPlan(): ChapterPlan {
  const planPath = resolve(projectRoot, 'output', 'chapter-plan.json');
  if (!existsSync(planPath)) {
    throw new Error('output/chapter-plan.json 이 없습니다. 먼저 npm run studio:plan 을 실행하세요.');
  }
  return JSON.parse(readFileSync(planPath, 'utf8')) as ChapterPlan;
}

function main(): void {
  const plan = loadPlan();
  const ms = generateManuscript(plan);
  const md = renderManuscriptMarkdown(plan, ms);

  const outDir = resolve(projectRoot, 'output');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, 'manuscript.json'), JSON.stringify(ms, null, 2) + '\n', 'utf8');
  writeFileSync(resolve(outDir, 'manuscript.md'), md, 'utf8');

  const paraCount = ms.chapters.reduce((n, c) => n + c.paragraphs.length, 0);
  console.log('✓ 본문 생성 완료 (scaffold)');
  console.log(`  주제   : ${ms.topic}`);
  console.log(`  난이도 : ${ms.difficulty}`);
  console.log(`  권수   : ${ms.volumeCount}`);
  console.log(`  챕터   : ${ms.chapters.length}개 / 단락 : ${paraCount}개`);
  console.log(`  출력   : output/manuscript.json, output/manuscript.md`);
}

main();
