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

/**
 * PNG export 실행 모드.
 *  - canvas: 기본(detail/square/story), prefix 로 입력 세트 전환('' | 'sparse.')
 *  - chapters / preview / preview-promo: 전용 모드
 */
export type ExportPngMode =
  | { kind: 'canvas'; prefix: string }
  | { kind: 'chapters' }
  | { kind: 'preview' }
  | { kind: 'preview-promo' };

const MODE_FLAGS = ['--chapters', '--preview', '--preview-promo'] as const;

/**
 * argv → ExportPngMode (순수). 잘못된 조합이면 Error throw.
 * 정책:
 *  - 명시 모드 플래그(--chapters/--preview/--preview-promo)는 최대 1개.
 *  - --prefix 는 canvas 모드에서만 허용(명시 모드와 함께 오면 오류).
 */
export function parseExportPngArgs(argv: string[]): ExportPngMode {
  const present = MODE_FLAGS.filter((f) => argv.includes(f));
  const hasPrefix = argv.includes('--prefix');

  if (present.length > 1) {
    throw new Error(`PNG export 모드는 하나만 지정할 수 있습니다: ${present.join(', ')}`);
  }
  if (present.length === 1) {
    if (hasPrefix) {
      throw new Error(`--prefix 는 기본 canvas 모드에서만 사용할 수 있습니다(${present[0]} 와 함께 사용 불가).`);
    }
    const flag = present[0];
    if (flag === '--chapters') return { kind: 'chapters' };
    if (flag === '--preview') return { kind: 'preview' };
    return { kind: 'preview-promo' };
  }
  // 명시 모드 없음 → canvas (+prefix)
  return { kind: 'canvas', prefix: parsePrefix(argv) };
}
