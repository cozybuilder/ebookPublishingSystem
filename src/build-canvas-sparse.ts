/**
 * Ebook Publishing System — Canvas 빌드 진입점 (sparse, 폴백 검증용)
 *
 * samples/canvas-sparse.md 기준 캔버스 3종 생성.
 * 실행: npm run build:canvas:sparse
 *   - output/canvas.sparse.detail.html / canvas.sparse.square.html / canvas.sparse.story.html
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCanvasFiles } from './canvas/build-canvas-core.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

buildCanvasFiles(resolve(projectRoot, 'samples', 'canvas-sparse.md'), 'sparse.');
