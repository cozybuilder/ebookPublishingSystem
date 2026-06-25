/**
 * Ebook Publishing System — 챕터 구성 생성 CLI (STEP 1)
 *
 * 입력: --topic <주제> --volumes <권수> --difficulty <하|중|상>
 *       또는 input/studio-input.json  ({ "topic", "volumes", "difficulty" })
 * 출력: output/chapter-plan.json
 *
 * 실행 예:
 *   npm run studio:plan -- --topic "주식 투자 입문" --volumes 1 --difficulty 하
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planChapters } from './chapter-planner.ts';
import type { Difficulty, StudioInput } from './studio-types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..', '..');

function parseArgs(argv: string[]): Partial<StudioInput> {
  const out: Partial<StudioInput> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--topic') out.topic = argv[++i];
    else if (a === '--volumes') out.volumes = Number(argv[++i]);
    else if (a === '--difficulty') out.difficulty = argv[++i] as Difficulty;
  }
  return out;
}

function loadInput(): StudioInput {
  const args = parseArgs(process.argv.slice(2));
  const hasArgs = args.topic !== undefined || args.volumes !== undefined || args.difficulty !== undefined;
  if (hasArgs) {
    return {
      topic: args.topic ?? '',
      volumes: args.volumes ?? 1,
      difficulty: (args.difficulty ?? '중') as Difficulty,
    };
  }
  const inputPath = resolve(projectRoot, 'input', 'studio-input.json');
  if (existsSync(inputPath)) {
    return JSON.parse(readFileSync(inputPath, 'utf8')) as StudioInput;
  }
  throw new Error(
    '입력이 없습니다. --topic/--volumes/--difficulty 인자 또는 input/studio-input.json 을 제공하세요.',
  );
}

function main(): void {
  const input = loadInput();
  const plan = planChapters(input);

  const outPath = resolve(projectRoot, 'output', 'chapter-plan.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(plan, null, 2) + '\n', 'utf8');

  console.log('✓ 챕터 구성 생성 완료');
  console.log(`  주제   : ${plan.topic}`);
  console.log(`  난이도 : ${plan.difficulty}`);
  console.log(`  권수   : ${plan.volumeCount}`);
  for (const v of plan.volumes) {
    console.log(`  [${v.volume}권] ${v.title} — ${v.chapters.length}개 챕터`);
    for (const c of v.chapters) console.log(`     ${c.number}. ${c.title}`);
  }
  console.log(`  출력   : ${outPath}`);
}

main();
