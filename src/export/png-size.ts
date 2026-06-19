/**
 * Ebook Publishing System — PNG 헤더에서 width/height 파싱 (의존성 0)
 *
 * PNG 시그니처(8B) + IHDR 청크: length(4) + "IHDR"(4) + width(4 BE) + height(4 BE) ...
 * 외부 라이브러리 없이 이미지 규격을 검증하기 위해 사용.
 */

import { readFileSync } from 'node:fs';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface PngSize {
  width: number;
  height: number;
}

/** PNG 버퍼에서 규격을 읽는다. 유효한 PNG/IHDR 가 아니면 null. */
export function readPngSize(buf: Buffer): PngSize | null {
  if (buf.length < 24) return null;
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  // 바이트 12..16 == "IHDR"
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

/** 파일 경로에서 PNG 규격을 읽는다. */
export function readPngSizeFromFile(path: string): PngSize | null {
  return readPngSize(readFileSync(path));
}
