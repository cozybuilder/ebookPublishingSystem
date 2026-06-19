/**
 * Ebook Publishing System — 이미지 프롬프트 매니페스트 테스트 (v1)
 *
 * in-memory(파일 미기록). 실행: npm run test:image-prompts
 */

import { parseBook } from '../src/parser/parser.ts';
import { buildImagePromptManifest, usageHintFor } from '../src/image-prompts/image-prompt-manifest.ts';
import { renderManifestJson, renderManifestMarkdown } from '../src/image-prompts/image-prompt-renderer.ts';
import type { ImageExt } from '../src/assets/image-asset-resolver.ts';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

console.log('이미지 프롬프트 매니페스트 테스트 실행\n');

// usageHint 매핑
check('usageHint: cover/chapter/detail', usageHintFor('cover') === 'cover' && usageHintFor('chapter') === 'chapter' && usageHintFor('detail') === 'detail');
check('usageHint: thumbnail/sns → promo', usageHintFor('thumbnail') === 'promo' && usageHintFor('sns') === 'promo');
check('usageHint: 기타 → generic', usageHintFor('weird') === 'generic');

// 이미지 2개 원고(인메모리)
const md = [
  '# 테스트 책',
  'author: X',
  '',
  '## Chapter 1. 가',
  '',
  ':::image',
  'id: IMG-A',
  'type: cover',
  'prompt: 표지 프롬프트',
  ':::',
  '',
  ':::image',
  'id: IMG-B',
  'type: chapter',
  'prompt: 챕터 프롬프트',
  ':::',
].join('\n');
const book = parseBook(md);

// 자산: IMG-A 만 존재(주입형 lookup)
const lookup = (id: string): { path: string; ext: ImageExt } | null =>
  id === 'IMG-A' ? { path: 'C:/proj/assets/images/IMG-A.png', ext: 'png' } : null;

const m = buildImagePromptManifest(book, lookup);
check('ImageBlock 2개 수집', m.total === 2, `got ${m.total}`);
check('missingCount = 1', m.missingCount === 1);
const a = m.items.find((i) => i.id === 'IMG-A')!;
const b = m.items.find((i) => i.id === 'IMG-B')!;
check('IMG-A: exists true + sourcePath', a.exists === true && a.missing === false && a.sourcePath === 'C:/proj/assets/images/IMG-A.png');
check('IMG-B: missing true + sourcePath null', b.exists === false && b.missing === true && b.sourcePath === null);
check('recommendedPath 항상 assets/images/<id>.png', a.recommendedPath === 'assets/images/IMG-A.png' && b.recommendedPath === 'assets/images/IMG-B.png');
check('type/prompt 보존', a.type === 'cover' && a.prompt === '표지 프롬프트' && b.type === 'chapter');
check('usageHint: cover/chapter', a.usageHint === 'cover' && b.usageHint === 'chapter');

// JSON 구조
const json = JSON.parse(renderManifestJson(m));
check('JSON: title/total/items', json.title === '테스트 책' && json.total === 2 && Array.isArray(json.items));
check('JSON: 항목 필드', json.items[0].id && json.items[0].recommendedPath && typeof json.items[0].missing === 'boolean');

// Markdown
const mdOut = renderManifestMarkdown(m);
check('MD: id/type/prompt/recommendedPath 포함', mdOut.includes('IMG-A') && mdOut.includes('cover') && mdOut.includes('표지 프롬프트') && mdOut.includes('assets/images/IMG-A.png'));
check('MD: missing/exists 표기', mdOut.includes('missing') && mdOut.includes('exists'));

// ImageBlock 없는 원고 → 빈 목록
const emptyBook = parseBook('# 빈 책\n\n## Chapter 1. 가\n\n본문만 있음.');
const em = buildImagePromptManifest(emptyBook, lookup);
check('ImageBlock 없음 → total 0', em.total === 0 && em.items.length === 0);
check('빈 목록 MD 생성', renderManifestMarkdown(em).includes('이미지 슬롯이 없습니다'));
check('빈 목록 JSON 유효', JSON.parse(renderManifestJson(em)).total === 0);

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
