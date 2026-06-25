/**
 * Ebook Publishing System — Studio 타입 (STEP 1)
 *
 * 입력(주제/권수/난이도)과 챕터 구성(Outline) 산출 구조.
 * 기준: PROJECT_CONSTITUTION.md (입력 / 워크플로우)
 *
 * 주의: erasable syntax only (Node 타입 스트리핑) — enum/namespace 사용 안 함.
 */

export type Difficulty = '하' | '중' | '상';

/** STEP 1 입력 */
export interface StudioInput {
  topic: string; // 주제
  volumes: number; // 권수 (1 이상 정수)
  difficulty: Difficulty; // 난이도
}

/** 챕터 1개의 구성(개요 단계 — 본문 없음) */
export interface ChapterOutline {
  number: number; // 권 내 챕터 순번 (1부터)
  title: string;
  summary: string; // 한 줄 개요
}

/** 권(volume) 1개의 챕터 묶음 */
export interface VolumePlan {
  volume: number; // 권 번호 (1부터)
  title: string;
  stage?: string; // 권별 단계(기초/심화/...) — 다권일 때만 부여
  chapters: ChapterOutline[];
}

/** 챕터 구성 생성 결과 */
export interface ChapterPlan {
  topic: string;
  difficulty: Difficulty;
  volumeCount: number;
  volumes: VolumePlan[];
}

// ===== 본문 생성 (chapter-plan → manuscript) =====

/** 본문이 채워진 챕터 1개 */
export interface ManuscriptChapter {
  volume: number; // 권 번호
  number: number; // 권 내 챕터 순번
  title: string;
  paragraphs: string[]; // 본문 단락
}

/** 본문 생성 결과(원고) */
export interface Manuscript {
  topic: string;
  difficulty: Difficulty;
  volumeCount: number;
  chapters: ManuscriptChapter[]; // 모든 권의 챕터를 평탄화(volume 필드로 구분)
}
