/**
 * Ebook Publishing System — 시스템 브라우저 탐지 (PNG export v1)
 *
 * 외부 라이브러리 없이 설치된 Chrome/Edge 를 headless 캡처에 사용한다.
 * 탐지 우선순위: CHROME_PATH 환경변수 → Windows 기본 Chrome → Windows 기본 Edge.
 */

import { existsSync } from 'node:fs';

/** Windows 기본 설치 경로 후보(Chrome 우선, 그다음 Edge). */
export const BROWSER_CANDIDATES: string[] = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

/**
 * 사용할 브라우저 실행 파일 경로를 찾는다.
 * @param env  process.env (테스트 주입 가능)
 * @param exists  파일 존재 검사기(테스트 주입 가능)
 * @returns 경로 문자열, 없으면 null
 */
export function findBrowser(
  env: Record<string, string | undefined> = process.env,
  exists: (p: string) => boolean = existsSync,
): string | null {
  const override = env.CHROME_PATH;
  if (override && override.trim() !== '') {
    return exists(override) ? override : null; // override 지정 시 그 경로만 신뢰
  }
  for (const candidate of BROWSER_CANDIDATES) {
    if (exists(candidate)) return candidate;
  }
  return null;
}

/** 탐지 실패 시 사용자 안내 메시지. */
export function browserNotFoundMessage(): string {
  return [
    'PNG export 용 브라우저(Chrome/Edge)를 찾지 못했습니다.',
    '해결: 환경변수 CHROME_PATH 에 chrome.exe 또는 msedge.exe 경로를 지정하세요.',
    '예) set CHROME_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"',
    '탐지 후보:',
    ...BROWSER_CANDIDATES.map((c) => `  - ${c}`),
  ].join('\n');
}
