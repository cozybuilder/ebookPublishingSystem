/**
 * Ebook Publishing System — 책 기본정보(저작권/발행) 설정 로더 (v1)
 *
 * 프로젝트별 설정 파일(book.config.json)을 FrontMatterOverrides 로 변환한다.
 * 저작권자/발행자/저자 등이 프로그램 제작자(CozyBuilder)가 아니라 "책을 만드는 사용자"가
 * 되도록, 비어 있지 않은 값만 override 로 채운다(미설정 항목은 기존 기본값 유지).
 *
 * 엔진 파이프라인 무변경 — 기존 FrontMatterOverrides 계약만 사용.
 */

import { readFileSync, existsSync } from 'node:fs';
import type { FrontMatterOverrides } from './front-matter-types.ts';

/** 설정 JSON 객체(부분) → FrontMatterOverrides. 빈 문자열/누락은 무시. 순수 함수. */
export function configToOverrides(raw: unknown): FrontMatterOverrides {
  const o: FrontMatterOverrides = {};
  if (!raw || typeof raw !== 'object') return o;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown): string | undefined =>
    typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

  const title = str(r.title);
  if (title) o.title = title;
  const subtitle = str(r.subtitle);
  if (subtitle) o.subtitle = subtitle;
  const author = str(r.author);
  if (author) o.author = author;
  const publisher = str(r.publisher);
  if (publisher) o.publisher = publisher;
  const brand = str(r.brand);
  if (brand) o.brand = brand;
  const description = str(r.description);
  if (description) o.description = description;
  const authorBio = str(r.authorBio);
  if (authorBio) o.authorBio = authorBio;
  const disclaimer = str(r.disclaimer);
  if (disclaimer) o.disclaimer = disclaimer;

  // year: 숫자 또는 숫자 문자열
  if (typeof r.year === 'number' && Number.isFinite(r.year)) o.year = r.year;
  else {
    const ys = str(r.year);
    if (ys) {
      const n = parseInt(ys, 10);
      if (!Number.isNaN(n)) o.year = n;
    }
  }
  return o;
}

/** book.config.json 경로 → FrontMatterOverrides. 없거나 파싱 실패 시 빈 객체. */
export function loadConfigOverrides(configPath: string): FrontMatterOverrides {
  if (!existsSync(configPath)) return {};
  try {
    return configToOverrides(JSON.parse(readFileSync(configPath, 'utf8')));
  } catch {
    return {};
  }
}
