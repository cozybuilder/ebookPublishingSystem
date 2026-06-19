/**
 * Ebook Publishing System — Canvas 빌드 진입점 (rich)
 *
 * input/book.md 기준 캔버스 3종 생성.
 * 실행: npm run build:canvas
 *   - output/canvas.detail.html / canvas.square.html / canvas.story.html
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCanvasFiles } from './canvas/build-canvas-core.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

buildCanvasFiles(resolve(projectRoot, 'input', 'book.md'), '');
