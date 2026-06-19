/**
 * Ebook Publishing System — EPUB(XHTML) escape (순수)
 */
export function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** 여러 줄 텍스트 → XHTML(escape + <br/>) */
export function nl2brXhtml(s: string): string {
  return escXml(s).replace(/\n/g, '<br/>');
}
