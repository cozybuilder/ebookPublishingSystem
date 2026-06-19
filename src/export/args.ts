/**
 * Ebook Publishing System — export 인자 파싱 (순수 함수)
 *
 * `--prefix <value>` 를 읽어 파일 접두로 정규화한다.
 *  - 미지정/빈값      → '' (기본 canvas.*)
 *  - 'sparse'         → 'sparse.' (canvas.sparse.*)
 *  - 'sparse.'        → 'sparse.' (이미 점으로 끝나면 그대로)
 */
export function parsePrefix(argv: string[]): string {
  const i = argv.indexOf('--prefix');
  if (i < 0) return '';
  const raw = argv[i + 1];
  if (!raw || raw.startsWith('--')) return '';
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
}
