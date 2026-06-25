/**
 * Ebook Publishing System — 표지 이미지 해석기 (v1)
 *
 * 표지 이미지 자산(id 기본 'cover')을 찾아 data URI 로 만든다(HTML/PDF 임베드용).
 * 자산 탐색은 기존 image-asset-resolver 규약을 그대로 재사용한다
 * (assets/images/cover.png|jpg|jpeg → assets/cover.* 호환).
 *
 * 순수성: 파일 I/O 는 image-asset-resolver 에 위임(테스트 주입 가능).
 * data URI ↔ 버퍼 변환은 무라이브러리 순수 함수.
 */

import { resolveImageAsset, type ImageExt } from './image-asset-resolver.ts';

/** ext → image MIME */
export function imageMime(ext: ImageExt): string {
  return ext === 'png' ? 'image/png' : 'image/jpeg';
}

/** 이미지 버퍼 → data URI */
export function toDataUri(data: Buffer, ext: ImageExt): string {
  return `data:${imageMime(ext)};base64,${data.toString('base64')}`;
}

/** data URI → { data, ext }. base64 이미지 data URI 가 아니면 null. */
export function fromDataUri(uri: string): { data: Buffer; ext: ImageExt } | null {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/s.exec(uri);
  if (!m) return null;
  const ext: ImageExt = m[1] === 'png' ? 'png' : m[1] === 'jpeg' ? 'jpeg' : 'jpg';
  return { data: Buffer.from(m[2], 'base64'), ext };
}

/**
 * 자산 id 의 이미지를 찾아 data URI 로 반환. 없으면 null.
 * 표지·본문 이미지(ImageBlock) 등 HTML/PDF 임베드에 공통 사용.
 * @param projectRoot 프로젝트 루트 절대경로
 * @param id          자산 id
 */
export function resolveImageDataUri(projectRoot: string, id: string): string | null {
  const found = resolveImageAsset(id, projectRoot);
  return found ? toDataUri(found.data, found.ext) : null;
}

/**
 * 표지 이미지를 찾아 data URI 로 반환. 없으면 null.
 * @param projectRoot 프로젝트 루트 절대경로
 * @param id          표지 자산 id (기본 'cover')
 */
export function resolveCoverDataUri(projectRoot: string, id = 'cover'): string | null {
  return resolveImageDataUri(projectRoot, id);
}
