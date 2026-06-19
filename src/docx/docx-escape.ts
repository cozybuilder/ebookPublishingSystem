/**
 * Ebook Publishing System — DOCX XML escape (순수)
 *
 * WordprocessingML(XML) 텍스트/속성에 안전한 이스케이프. UTF-8 한글/이모지 그대로 보존.
 */
export function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
