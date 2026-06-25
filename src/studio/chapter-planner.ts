/**
 * Ebook Publishing System — 챕터 구성 생성기 (STEP 1)
 *
 * 주제 + 권수 + 난이도 입력을 받아 챕터 구성을 생성한다.
 * 본문 생성은 다음 단계(현재 범위 밖).
 *
 * 의존성 0. 난이도별 서사 아크를 주제에 적용하는 결정적(deterministic) 생성기.
 * (추후 AI 생성기로 교체 가능 — 동일 입출력 계약 유지)
 *
 * 주의: erasable syntax only.
 */

import type { Difficulty, StudioInput, ChapterPlan, VolumePlan, ChapterOutline } from './studio-types.ts';

const DIFFICULTIES: Difficulty[] = ['하', '중', '상'];

/** 난이도 → 대상 독자 */
const READER: Record<Difficulty, string> = {
  '하': '비전공자',
  '중': '전공자',
  '상': '전문가',
};

/** 난이도 → 챕터 수 */
const CHAPTER_COUNT: Record<Difficulty, number> = {
  '하': 5,
  '중': 7,
  '상': 9,
};

/** 다권 시 권별 단계 (1권 기초 → 2권 심화 → …) */
const STAGES: string[] = ['기초', '심화', '응용', '전문', '마스터'];

/** 단계별 챕터 구성(phase) 풀. 난이도 챕터 수만큼 앞에서 자른다(≥9). */
const STAGE_PHASES: Record<string, string[]> = {
  '기초': ['시작하기', '기본 개념', '꼭 알아야 할 핵심', '기초 용어 정리', '간단한 실습', '자주 하는 실수', '기초 요약', '다음 단계 준비', '전체 복습'],
  '심화': ['심화 개요', '핵심 원리', '주요 구성 요소', '고급 적용 방법', '사례 분석', '심화 포인트', '흔한 함정', '확장 주제', '심화 정리'],
  '응용': ['응용 개요', '실전 시나리오', '문제 해결 패턴', '최적화 기법', '통합 적용', '대규모 사례', '리스크 관리', '자동화와 도구', '응용 정리'],
  '전문': ['전문가 관점', '이론적 토대', '고급 아키텍처', '성능과 트레이드오프', '전략적 설계', '심층 사례', '안티패턴', '미래 동향', '전문가 체크리스트'],
  '마스터': ['마스터 개요', '경계 사례', '극한 최적화', '연구 동향', '자체 프레임워크', '대형 프로젝트', '실패 사례 해부', '지속 개선', '마스터 종합'],
};

/** 권 번호 → 단계 라벨 (정의된 단계를 넘어가면 마지막 단계에 번호를 붙인다) */
function stageFor(volume: number): string {
  if (volume <= STAGES.length) return STAGES[volume - 1];
  return `${STAGES[STAGES.length - 1]} ${volume - STAGES.length + 1}`;
}

/** 단계 라벨 → phase 풀 (확장 단계는 마스터 풀 재사용) */
function phasesFor(stage: string): string[] {
  return STAGE_PHASES[stage] ?? STAGE_PHASES['마스터'];
}

/** 난이도별 챕터 서사 아크 — 단권(volumes=1)에서 사용 */
const ARCS: Record<Difficulty, ((topic: string) => string)[]> = {
  '하': [
    (t) => `${t} 시작하기`,
    (t) => `${t}의 기본 개념`,
    (t) => `${t}에서 꼭 알아야 할 핵심`,
    (t) => `${t} 실생활에 적용하기`,
    (t) => `${t} 자주 하는 실수와 정리`,
  ],
  '중': [
    (t) => `${t} 개요와 배경`,
    (t) => `${t}의 핵심 원리`,
    (t) => `${t} 주요 구성 요소`,
    (t) => `${t} 적용 방법`,
    (t) => `${t} 사례 분석`,
    (t) => `${t} 심화 포인트`,
    (t) => `${t} 요약과 다음 단계`,
  ],
  '상': [
    (t) => `${t} 전문가 관점의 정의`,
    (t) => `${t}의 이론적 토대`,
    (t) => `${t} 고급 기법`,
    (t) => `${t} 최적화와 트레이드오프`,
    (t) => `${t} 실전 전략과 설계`,
    (t) => `${t} 사례 심층 분석`,
    (t) => `${t} 흔한 함정과 안티패턴`,
    (t) => `${t} 미래 동향`,
    (t) => `${t} 종합과 전문가 체크리스트`,
  ],
};

/** 입력 검증. 위반 시 Error throw. */
export function validateInput(input: StudioInput): void {
  if (!input || typeof input.topic !== 'string' || input.topic.trim() === '') {
    throw new Error('주제(topic)는 비어 있을 수 없습니다.');
  }
  if (!Number.isInteger(input.volumes) || input.volumes < 1) {
    throw new Error('권수(volumes)는 1 이상의 정수여야 합니다.');
  }
  if (!DIFFICULTIES.includes(input.difficulty)) {
    throw new Error(`난이도(difficulty)는 ${DIFFICULTIES.join(' / ')} 중 하나여야 합니다.`);
  }
}

/** 주제 + 권수 + 난이도 → 챕터 구성 */
export function planChapters(input: StudioInput): ChapterPlan {
  validateInput(input);

  const topic = input.topic.trim();
  const reader = READER[input.difficulty];
  const count = CHAPTER_COUNT[input.difficulty];
  const single = input.volumes === 1;

  const volumes: VolumePlan[] = [];
  for (let v = 1; v <= input.volumes; v++) {
    // 단권: 난이도 아크 그대로. 다권: 권별 단계(기초→심화→…)로 챕터 구성을 차별화.
    const stage = single ? undefined : stageFor(v);
    const title = single ? topic : `${topic} ${v}권 (${stage})`;
    const titles = single
      ? ARCS[input.difficulty].map((make) => make(topic))
      : phasesFor(stage as string)
          .slice(0, count)
          .map((phase) => `${topic} ${phase}`);

    const chapters: ChapterOutline[] = titles.map((chTitle, i) => ({
      number: i + 1,
      title: chTitle,
      summary: `${reader}를 위한 '${chTitle}' 핵심 정리`,
    }));

    volumes.push({ volume: v, title, stage, chapters });
  }

  return {
    topic,
    difficulty: input.difficulty,
    volumeCount: input.volumes,
    volumes,
  };
}
