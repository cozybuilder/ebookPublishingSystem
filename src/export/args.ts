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
 * PDF export 실행 모드.
 *  - all: PDF_TARGETS 전체
 *  - target: 지정 1개(PDF_TARGETS 내)
 */
export type ExportPdfMode = { kind: 'all' } | { kind: 'target'; target: string };

/**
 * argv → ExportPdfMode (순수). 잘못된 입력이면 Error throw.
 * @param argv      process.argv 등
 * @param validTargets  허용 대상 목록(PDF_TARGETS)
 */
export function parseExportPdfArgs(argv: string[], validTargets: readonly string[]): ExportPdfMode {
  const occurrences = argv.filter((a) => a === '--target').length;
  if (occurrences === 0) return { kind: 'all' };
  if (occurrences > 1) throw new Error('--target 은 한 번만 지정할 수 있습니다.');

  const i = argv.indexOf('--target');
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error('--target 값이 필요합니다 (예: --target book.preview.html).');
  if (!validTargets.includes(value)) {
    throw new Error(`알 수 없는 --target: ${value} (가능: ${validTargets.join(', ')})`);
  }
  return { kind: 'target', target: value };
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
