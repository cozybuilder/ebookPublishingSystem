/**
 * Ebook Publishing System — 본문 생성기 (STEP 1)
 *
 * 챕터 구성(ChapterPlan)을 입력으로 각 챕터의 본문을 생성한다.
 * 입력 출처: output/chapter-plan.json (CLI 단계에서 로드)
 *
 * 의존성 0. 난이도/단계 정보를 반영한 결정적(deterministic) 본문 스캐폴드.
 * (추후 Claude API 생성으로 교체 검토 — 동일 입출력 계약 유지)
 *
 * 주의: erasable syntax only.
 */

import type {
  Difficulty,
  ChapterPlan,
  ChapterOutline,
  Manuscript,
  ManuscriptChapter,
} from './studio-types.ts';

const READER: Record<Difficulty, string> = {
  '하': '비전공자',
  '중': '전공자',
  '상': '전문가',
};

/** 난이도별 추가 단락(깊이 차등): 하 0 / 중 1 / 상 2 */
const EXTRA: Record<Difficulty, string[]> = {
  '하': [],
  '중': ['대표 사례를 통해 적용 방법을 구체적으로 보여준다.'],
  '상': ['대표 사례를 심층 분석한다.', '흔한 함정과 트레이드오프를 짚고 심화 논점을 제시한다.'],
};

/** 챕터 1개의 본문 단락 생성 */
export function generateChapterBody(
  topic: string,
  difficulty: Difficulty,
  chapter: ChapterOutline,
): string[] {
  const reader = READER[difficulty];
  return [
    `${chapter.summary}.`,
    `${reader}가 이해하기 쉽도록 ${topic}의 '${chapter.title}'를 핵심 위주로 설명한다.`,
    ...EXTRA[difficulty],
    `이 장의 요점을 정리하고, 다음 장으로 자연스럽게 연결한다.`,
  ];
}

/** ChapterPlan → Manuscript (모든 권/챕터의 본문 생성) */
export function generateManuscript(plan: ChapterPlan): Manuscript {
  const chapters: ManuscriptChapter[] = [];
  for (const v of plan.volumes) {
    for (const ch of v.chapters) {
      chapters.push({
        volume: v.volume,
        number: ch.number,
        title: ch.title,
        paragraphs: generateChapterBody(plan.topic, plan.difficulty, ch),
      });
    }
  }
  return {
    topic: plan.topic,
    difficulty: plan.difficulty,
    volumeCount: plan.volumeCount,
    chapters,
  };
}

/** 원고 승인용 사람이 읽기 좋은 Markdown 렌더 */
export function renderManuscriptMarkdown(plan: ChapterPlan, ms: Manuscript): string {
  const lines: string[] = [];
  lines.push(`# ${plan.topic}`, '', `> 난이도: ${plan.difficulty} · ${plan.volumeCount}권`, '');
  for (const v of plan.volumes) {
    lines.push(`## ${v.title}`, '');
    for (const ch of v.chapters) {
      lines.push(`### ${ch.number}. ${ch.title}`, '');
      const body = ms.chapters.find((c) => c.volume === v.volume && c.number === ch.number);
      if (body) {
        for (const p of body.paragraphs) lines.push(p, '');
      }
    }
  }
  return lines.join('\n').trimEnd() + '\n';
}
