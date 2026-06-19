/**
 * Ebook Publishing System — 이미지 자산 참조 규약 (v1)
 *
 * ImageBlock.id 를 기준으로 실제 이미지 파일을 찾는 프로젝트 표준 규약.
 * 출력 트랙(DOCX/PDF/HTML/EPUB/Image Prompt Engine)이 공유한다.
 *
 * 탐색 우선순위(첫 발견 사용):
 *   1) assets/images/<id>.png
 *   2) assets/images/<id>.jpg
 *   3) assets/images/<id>.jpeg
 *   4) assets/<id>.png        (구버전 호환)
 *   5) assets/<id>.jpg        (구버전 호환)
 *   6) assets/<id>.jpeg       (구버전 호환)
 *
 * 순수(후보 경로 목록)와 I/O(파일 탐색)를 분리 — 후보 생성은 무라이브러리 단위 테스트 대상.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type ImageExt = 'png' | 'jpg' | 'jpeg';

export interface ResolvedImage {
  data: Buffer;
  ext: ImageExt;
  path: string;
}

/** id 에 대한 후보 상대경로(우선순위 순). 순수 함수. */
export function imageAssetCandidates(id: string): { rel: string; ext: ImageExt }[] {
  const exts: ImageExt[] = ['png', 'jpg', 'jpeg'];
  const standard = exts.map((ext) => ({ rel: `assets/images/${id}.${ext}`, ext }));
  const legacy = exts.map((ext) => ({ rel: `assets/${id}.${ext}`, ext }));
  return [...standard, ...legacy];
}

/**
 * 규약에 따라 id 의 이미지를 찾는다. 없으면 null.
 * @param id          ImageBlock.id
 * @param projectRoot 프로젝트 루트 절대경로
 * @param exists/read 테스트 주입용(기본 fs)
 */
export function resolveImageAsset(
  id: string,
  projectRoot: string,
  exists: (p: string) => boolean = existsSync,
  read: (p: string) => Buffer = readFileSync,
): ResolvedImage | null {
  for (const c of imageAssetCandidates(id)) {
    const abs = resolve(projectRoot, c.rel);
    if (exists(abs)) return { data: read(abs), ext: c.ext, path: abs };
  }
  return null;
}
