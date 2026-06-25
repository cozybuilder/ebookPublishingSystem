/**
 * Ebook Publishing System — 챕터 구성 생성기 테스트 (STEP 1)
 *
 * in-memory(파일 미기록). 실행: npm run test:chapter-planner
 */

import { planChapters, validateInput } from '../src/studio/chapter-planner.ts';
import type { StudioInput } from '../src/studio/studio-types.ts';

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
function throws(fn: () => void): boolean {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
}

console.log('챕터 구성 생성기 테스트 실행\n');

// ===== 난이도별 챕터 수 / 단권 =====
const low = planChapters({ topic: '주식 투자 입문', volumes: 1, difficulty: '하' });
check('하: 단권', low.volumes.length === 1 && low.volumeCount === 1);
check('하: 단권 제목 = 주제', low.volumes[0].title === '주식 투자 입문');
check('하: 단권은 단계(stage) 없음', low.volumes[0].stage === undefined);
check('하: 5개 챕터', low.volumes[0].chapters.length === 5);
check('하: 챕터 번호 1..5', low.volumes[0].chapters.every((c, i) => c.number === i + 1));
check('하: 모든 제목에 주제 포함', low.volumes[0].chapters.every((c) => c.title.includes('주식 투자 입문')));
check('하: 요약에 독자(비전공자)', low.volumes[0].chapters[0].summary.includes('비전공자'));

const mid = planChapters({ topic: '데이터 분석', volumes: 1, difficulty: '중' });
check('중: 7개 챕터', mid.volumes[0].chapters.length === 7);
check('중: 요약에 독자(전공자)', mid.volumes[0].chapters[0].summary.includes('전공자'));

const high = planChapters({ topic: '분산 시스템', volumes: 1, difficulty: '상' });
check('상: 9개 챕터', high.volumes[0].chapters.length === 9);
check('상: 요약에 독자(전문가)', high.volumes[0].chapters[0].summary.includes('전문가'));

// ===== 권수 분할 =====
const multi = planChapters({ topic: '요리', volumes: 3, difficulty: '중' });
check('권수 3: 3권 생성', multi.volumes.length === 3 && multi.volumeCount === 3);
check('권수 3: 권 번호 1..3', multi.volumes.every((v, i) => v.volume === i + 1));
check('권수 3: 단계 기초→심화→응용', multi.volumes[0].stage === '기초' && multi.volumes[1].stage === '심화' && multi.volumes[2].stage === '응용');
check('권수 3: 권 제목에 단계 표기', multi.volumes[0].title === '요리 1권 (기초)' && multi.volumes[1].title === '요리 2권 (심화)');
check('권수 3: 각 권 7챕터', multi.volumes.every((v) => v.chapters.length === 7));
check('권수 3: 권별 챕터 구성 차별화', multi.volumes[0].chapters[0].title !== multi.volumes[1].chapters[0].title);

// ===== 정규화 =====
check('주제 앞뒤 공백 trim', planChapters({ topic: '  여행  ', volumes: 1, difficulty: '하' }).topic === '여행');

// ===== 검증 =====
check('검증: 빈 주제 throw', throws(() => validateInput({ topic: '', volumes: 1, difficulty: '하' })));
check('검증: 공백 주제 throw', throws(() => validateInput({ topic: '   ', volumes: 1, difficulty: '하' })));
check('검증: 권수 0 throw', throws(() => validateInput({ topic: 'x', volumes: 0, difficulty: '하' })));
check('검증: 권수 소수 throw', throws(() => validateInput({ topic: 'x', volumes: 1.5, difficulty: '하' })));
check('검증: 잘못된 난이도 throw', throws(() => validateInput({ topic: 'x', volumes: 1, difficulty: '최상' } as StudioInput)));
check('검증: 정상 입력 통과', !throws(() => validateInput({ topic: 'x', volumes: 2, difficulty: '중' })));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
