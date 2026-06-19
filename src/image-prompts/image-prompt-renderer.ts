/**
 * Ebook Publishing System — 이미지 프롬프트 매니페스트 직렬화 (순수)
 *
 * manifest → JSON 문자열 / Markdown 문자열.
 */

import type { ImagePromptManifest } from './image-prompt-manifest.ts';

export function renderManifestJson(m: ImagePromptManifest): string {
  return JSON.stringify(m, null, 2) + '\n';
}

export function renderManifestMarkdown(m: ImagePromptManifest): string {
  const lines: string[] = [];
  lines.push(`# 이미지 프롬프트 — ${m.title}`);
  lines.push('');
  lines.push(`- 총 이미지 슬롯: ${m.total}`);
  lines.push(`- 생성 필요(missing): ${m.missingCount}`);
  lines.push('');
  if (m.items.length === 0) {
    lines.push('_이미지 슬롯이 없습니다._');
    lines.push('');
    return lines.join('\n');
  }
  for (const it of m.items) {
    const status = it.exists ? `✅ exists (${it.sourcePath})` : '⬜ missing';
    lines.push(`## ${it.id}  (${it.type} · ${it.usageHint})`);
    lines.push('');
    lines.push(`- status: ${status}`);
    lines.push(`- recommendedPath: \`${it.recommendedPath}\``);
    lines.push('- prompt:');
    lines.push('');
    lines.push('```text');
    lines.push(it.prompt);
    lines.push('```');
    lines.push('');
  }
  return lines.join('\n');
}
