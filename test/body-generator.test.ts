/**
 * Ebook Publishing System — 본문 생성기 테스트 (STEP 1)
 *
 * in-memory(파일 미기록). 실행: npm run test:body
 */

import { planChapters } from '../src/studio/chapter-planner.ts';
import {
  generateManuscript,
  generateChapterBody,
  renderManuscriptMarkdown,
} from '../src/studio/body-generator.ts';

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

console.log('본문 생성기 테스트 실행\n');

// ===== 단권 본문 =====
const planLow = planChapters({ topic: '주식 투자 입문', volumes: 1, difficulty: '하' });
const msLow = generateManuscript(planLow);
check('단권: 챕터 수 = 구성 챕터 수', msLow.chapters.length === 5);
check('본문: 챕터마다 단락 ≥ 3', msLow.chapters.every((c) => c.paragraphs.length >= 3));
check('본문: 첫 단락은 개요(summary)', msLow.chapters[0].paragraphs[0].includes('핵심 정리'));
check('본문: 단락에 주제 포함', msLow.chapters[0].paragraphs.some((p) => p.includes('주식 투자 입문')));
check('본문: 마지막 단락 = 정리/연결', msLow.chapters[0].paragraphs[msLow.chapters[0].paragraphs.length - 1].includes('다음 장'));

// ===== 난이도별 깊이 차등 (하 < 중 < 상) =====
const chHa = generateChapterBody('X', '하', { number: 1, title: 'X 시작하기', summary: 's' });
const chJung = generateChapterBody('X', '중', { number: 1, title: 'X 개요', summary: 's' });
const chSang = generateChapterBody('X', '상', { number: 1, title: 'X 정의', summary: 's' });
check('깊이: 하 < 중 < 상 단락 수', chHa.length < chJung.length && chJung.length < chSang.length);
check('깊이: 하 = 3단락', chHa.length === 3);
check('깊이: 상 = 5단락', chSang.length === 5);

// ===== 다권 본문 (volume 필드 보존) =====
const planMulti = planChapters({ topic: '요리', volumes: 2, difficulty: '중' });
const msMulti = generateManuscript(planMulti);
check('다권: 총 챕터 = 2권 × 7', msMulti.chapters.length === 14);
check('다권: volume 필드 1과 2 존재', msMulti.chapters.some((c) => c.volume === 1) && msMulti.chapters.some((c) => c.volume === 2));
check('다권: 1권/2권 챕터 제목 차별화', msMulti.chapters.find((c) => c.volume === 1 && c.number === 1)!.title !== msMulti.chapters.find((c) => c.volume === 2 && c.number === 1)!.title);

// ===== Markdown 렌더 =====
const md = renderManuscriptMarkdown(planMulti, msMulti);
check('MD: 제목 H1', md.includes('# 요리'));
check('MD: 권 제목 H2(단계 포함)', md.includes('## 요리 1권 (기초)') && md.includes('## 요리 2권 (심화)'));
check('MD: 챕터 H3', md.includes('### 1. '));
check('MD: 본문 단락 포함', md.includes('전공자가 이해하기 쉽도록'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
