/**
 * Ebook Publishing System — 표지 이미지(Cover) 테스트 (v1)
 *
 * in-memory(파일 미기록). 실행: npm run test:cover
 *
 * 검증 범위:
 *  - parser: `cover:` 메타 파싱
 *  - cover-resolver: data URI ↔ 버퍼 변환
 *  - front-matter: coverImage override → CoverImage 컴포넌트(있을 때만, 무회귀)
 *  - HTML/PDF: CoverImage 렌더 + full-bleed CSS
 *  - DOCX: CoverImage → inline drawing(media 누적)
 *  - EPUB: cover.xhtml + cover-image 자산 + OPF properties/meta
 */

import { parseBook } from '../src/parser/parser.ts';
import { toDataUri, fromDataUri, imageMime } from '../src/assets/cover-resolver.ts';
import {
  buildFrontMatter,
  resolveFrontMatterMeta,
} from '../src/front-matter/front-matter-generator.ts';
import { withFrontMatterPages, withFrontMatterComponents } from '../src/front-matter/front-matter-apply.ts';
import { applyLayout } from '../src/layout-engine/layout-engine.ts';
import { renderHtml } from '../src/html-renderer/html-renderer.ts';
import { PRINT_CSS } from '../src/export/pdf-helpers.ts';
import { componentToXml, renderDocument } from '../src/docx/docx-renderer.ts';
import { buildEpubModel } from '../src/epub/epub-renderer.ts';
import { contentOpf, buildEpubEntries } from '../src/epub/epub-package.ts';
import { DEFAULT_TOKENS } from '../src/design-tokens/default-tokens.ts';
import type { Component } from '../src/types/component.ts';

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

console.log('Cover(표지 이미지) 테스트 실행\n');

// 최소 유효 PNG(시그니처 + IHDR, 600×800). DOCX 이미지 크기 파싱용.
function tinyPng(width: number, height: number): Buffer {
  const b = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); // IHDR length
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}
const PNG = tinyPng(600, 800);
const COVER_URI = toDataUri(PNG, 'png');

// ===== parser: cover 메타 =====
const bookWithCoverMeta = parseBook('# 책제목\n\nauthor: 저자\ncover: mycover\n\n## Chapter 1. 가\n\n본문');
check('parser: cover 메타 파싱', bookWithCoverMeta.metadata.cover === 'mycover');
const bookNoCover = parseBook('# 책제목\n\nsubtitle: 부제\nauthor: 저자\n\n## Chapter 1. 가\n\n본문');
check('parser: cover 미지정 시 undefined', bookNoCover.metadata.cover === undefined);

// ===== cover-resolver: data URI 변환 =====
check('resolver: imageMime png/jpg', imageMime('png') === 'image/png' && imageMime('jpg') === 'image/jpeg');
check('resolver: toDataUri 형식', COVER_URI.startsWith('data:image/png;base64,'));
const decoded = fromDataUri(COVER_URI);
check('resolver: fromDataUri roundtrip', decoded !== null && decoded.ext === 'png' && decoded.data.equals(PNG));
check('resolver: 비-data URI 는 null', fromDataUri('https://x/y.png') === null);

// ===== front-matter: coverImage override =====
const metaWith = resolveFrontMatterMeta(bookNoCover, { coverImage: COVER_URI });
check('FM meta: coverImage 보존', metaWith.coverImage === COVER_URI);

const fmWith = buildFrontMatter(bookNoCover, { coverImage: COVER_URI });
const typesWith = fmWith.components.map((c) => c.type);
check('FM: coverImage 있으면 CoverImage 가 맨 앞', typesWith[0] === 'CoverImage' && typesWith[1] === 'TitleBlock');

const fmWithout = buildFrontMatter(bookNoCover);
const typesWithout = fmWithout.components.map((c) => c.type);
check(
  'FM: coverImage 없으면 기존 순서(무회귀)',
  JSON.stringify(typesWithout) ===
    JSON.stringify(['TitleBlock', 'SubtitleBlock', 'AuthorBlock', 'CopyrightNotice', 'TableOfContentsList', 'AuthorBio', 'Disclaimer']),
);

// ===== HTML: 표지 면 구성 =====
const pagesWith = withFrontMatterPages(bookNoCover, { coverImage: COVER_URI });
const coverPageWith = pagesWith[0];
const coverTypesWith = coverPageWith.components.map((c) => c.type);
check('HTML: CoverPage 에 이미지(배경)+제목/부제/저자(오버레이)', coverPageWith.type === 'CoverPage' && coverTypesWith.includes('CoverImage') && coverTypesWith.includes('TitleBlock') && coverTypesWith.includes('AuthorBlock'));

const pagesWithout = withFrontMatterPages(bookNoCover);
const coverPageWithout = pagesWithout[0];
check('HTML: 이미지 없으면 텍스트 표지(무회귀)', coverPageWithout.components.every((c) => c.type !== 'CoverImage') && coverPageWithout.components.some((c) => c.type === 'TitleBlock'));

const htmlWith = renderHtml(applyLayout(pagesWith, DEFAULT_TOKENS), DEFAULT_TOKENS, 'book');
check('HTML: <img class="cover-image"> + data URI', htmlWith.includes('class="cover-image"') && htmlWith.includes('data:image/png;base64,'));
check('HTML CSS: cover-image full-bleed 규칙', htmlWith.includes('.cover-image') && htmlWith.includes(':has(.cover-image)'));
check('PDF PRINT_CSS: cover full-bleed(210mm×297mm)', PRINT_CSS.includes('.cover-image') && PRINT_CSS.includes('210mm') && PRINT_CSS.includes('297mm'));

// ===== DOCX: CoverImage → inline drawing =====
const coverComp: Component = { type: 'CoverImage', src: COVER_URI, alt: '표지' };
const ctx = { media: [] as { fileName: string; relId: string; ext: string; data: Buffer }[], docPrSeq: 0 };
const coverXml = componentToXml(coverComp, ctx);
check('DOCX: CoverImage → w:drawing', coverXml.includes('<w:drawing>') && coverXml.includes('r:embed='));
check('DOCX: media 누적(이미지 1)', ctx.media.length === 1 && ctx.media[0].ext === 'png');

const compsWith = withFrontMatterComponents(bookNoCover, { coverImage: COVER_URI });
check('DOCX flow: 첫 컴포넌트 CoverImage', compsWith[0].type === 'CoverImage');
const docOut = renderDocument(compsWith);
check('DOCX flow: 문서에 drawing 포함', docOut.xml.includes('<w:drawing>') && docOut.media.length >= 1);

// 잘못된 src 는 빈 문자열(안전 fallback)
const badCover: Component = { type: 'CoverImage', src: 'not-a-data-uri', alt: '' };
check('DOCX: 잘못된 src 는 빈 출력(안전)', componentToXml(badCover, { media: [], docPrSeq: 0 }) === '');

// ===== EPUB: cover.xhtml + cover-image 자산 =====
const OPTS = { uuid: 'urn:uuid:cover-0000', modified: '2026-06-21T00:00:00Z' };
const modelWith = buildEpubModel(bookNoCover, { ...OPTS, overrides: { coverImage: COVER_URI } });
const namesWith = buildEpubEntries(modelWith).map((e) => e.name);
check('EPUB: cover.xhtml 생성', namesWith.includes('OEBPS/text/cover.xhtml'));
check('EPUB: cover 이미지 자산 포함', namesWith.includes('OEBPS/images/cover.png'));
check('EPUB: spine 첫 문서가 cover', modelWith.docs[0].id === 'cover');
check('EPUB: nav(목차)에 표지 미포함', !modelWith.nav.some((n) => n.href.includes('cover.xhtml')));
const opfWith = contentOpf(modelWith);
check('OPF: cover-image properties', opfWith.includes('properties="cover-image"') && opfWith.includes('href="images/cover.png"'));
check('OPF: EPUB2 호환 meta name="cover"', opfWith.includes('<meta name="cover" content="cover-image"/>'));
const coverDocBody = buildEpubEntries(modelWith).find((e) => e.name === 'OEBPS/text/cover.xhtml')!.data.toString('utf8');
check('EPUB: cover.xhtml <img> src', coverDocBody.includes('src="../images/cover.png"') && coverDocBody.includes('cover-page'));

// ===== 본문 이미지(ImageBlock) HTML 실임베드 =====
const imgWithSrc = applyLayout(
  [{ type: 'ContentPage', components: [{ type: 'ImageBlock', id: 'IMG-001', imageType: 'chapter', prompt: '작업 공간', src: COVER_URI }] }],
  DEFAULT_TOKENS,
);
const htmlImg = renderHtml(imgWithSrc, DEFAULT_TOKENS, 'img');
check('HTML 본문 이미지: src 있으면 figure/fig-img 렌더', htmlImg.includes('class="fig-img"') && htmlImg.includes('data:image/png;base64,') && !htmlImg.includes('IMAGE SLOT'));
check('HTML 본문 이미지: 프롬프트가 캡션/alt 로', htmlImg.includes('작업 공간'));

const imgNoSrc = applyLayout(
  [{ type: 'ContentPage', components: [{ type: 'ImageBlock', id: 'IMG-999', imageType: 'chapter', prompt: '없는 이미지' }] }],
  DEFAULT_TOKENS,
);
const htmlNoSrc = renderHtml(imgNoSrc, DEFAULT_TOKENS, 'img');
check('HTML 본문 이미지: src 없으면 placeholder 슬롯(무회귀)', htmlNoSrc.includes('IMAGE SLOT') && !htmlNoSrc.includes('class="fig-img"'));

// 이미지 없으면 cover.xhtml 미생성(무회귀)
const modelWithout = buildEpubModel(bookNoCover, OPTS);
const namesWithout = buildEpubEntries(modelWithout).map((e) => e.name);
check('EPUB: 이미지 없으면 cover.xhtml 미생성', !namesWithout.includes('OEBPS/text/cover.xhtml'));
check('EPUB: 이미지 없으면 meta cover 미포함', !contentOpf(modelWithout).includes('name="cover"'));

console.log('\n────────────────────────────');
if (failures.length === 0) {
  console.log(`✓ 전체 통과 — ${passed}개 검증 성공`);
  process.exitCode = 0;
} else {
  console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`);
  for (const f of failures) console.log(`   - ${f}`);
  process.exitCode = 1;
}
