/**
 * Ebook Publishing System — 이미지 프롬프트 매니페스트 (v1)
 *
 * Book 의 ImageBlock(컴포넌트)을 수집해 "생성해야 할 이미지 목록"을 만든다.
 * 실제 AI 생성 호출 없음 — 생성 전 단계의 manifest.
 *
 * 자산 존재 확인은 image-asset-resolver 규약(assets/images/<id>.* 우선)을 재사용.
 * 순수(매니페스트 조립) + I/O(자산 탐색기 주입) 분리.
 */

import type { Book } from '../types/ast.ts';
import { buildPages } from '../page-builder/page-builder.ts';
import { mapComponents } from '../component-mapper/component-mapper.ts';
import { FullBookPDF } from '../page-builder/profiles.ts';
import type { ImageExt } from '../assets/image-asset-resolver.ts';

export type UsageHint = 'cover' | 'chapter' | 'detail' | 'promo' | 'generic';

export interface ImagePromptItem {
  id: string;
  type: string; // ImageBlock.imageType
  prompt: string;
  recommendedPath: string; // 항상 assets/images/<id>.png
  exists: boolean;
  missing: boolean;
  sourcePath: string | null; // 발견된 실제 경로(없으면 null)
  usageHint: UsageHint;
}

export interface ImagePromptManifest {
  title: string;
  total: number;
  missingCount: number;
  items: ImagePromptItem[];
}

/** imageType → usageHint 매핑 */
export function usageHintFor(imageType: string): UsageHint {
  const t = imageType.toLowerCase();
  if (t === 'cover') return 'cover';
  if (t === 'chapter') return 'chapter';
  if (t === 'detail') return 'detail';
  if (t === 'thumbnail' || t === 'promo' || t === 'sns') return 'promo';
  return 'generic';
}

/** 자산 탐색기 시그니처(존재 시 경로/확장자 반환, 없으면 null) — image-asset-resolver 주입용 */
export type AssetLookup = (id: string) => { path: string; ext: ImageExt } | null;

/** Book 의 ImageBlock 들을 매니페스트로. assetLookup 으로 존재 여부 판정. */
export function buildImagePromptManifest(book: Book, assetLookup: AssetLookup): ImagePromptManifest {
  const components = mapComponents(book, buildPages(book, FullBookPDF)).flatMap((p) => p.components);
  const items: ImagePromptItem[] = [];

  for (const c of components) {
    if (c.type !== 'ImageBlock') continue;
    const found = assetLookup(c.id);
    items.push({
      id: c.id,
      type: c.imageType,
      prompt: c.prompt,
      recommendedPath: `assets/images/${c.id}.png`,
      exists: found !== null,
      missing: found === null,
      sourcePath: found ? found.path : null,
      usageHint: usageHintFor(c.imageType),
    });
  }

  return {
    title: book.metadata.title,
    total: items.length,
    missingCount: items.filter((i) => i.missing).length,
    items,
  };
}
