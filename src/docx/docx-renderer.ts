/**
 * Ebook Publishing System — Component → DOCX(WordprocessingML) 렌더러 (v1)
 *
 * 편집 가능한 흐름형 Word 구조 우선(테마 복제 아님).
 * 지원: 제목/본문/인용/체크리스트/표/단계/주의/결과 + 이미지 placeholder.
 * 미지원 타입은 일반 문단으로 안전 fallback.
 */

import { escXml } from './docx-escape.ts';
import { buildDocx, type MediaItem } from './docx-package.ts';
import { emuExtent, imageDimensions, inlineDrawingParagraph, normalizeExt } from './docx-image.ts';
import { fromDataUri } from '../assets/cover-resolver.ts';
import type { Component } from '../types/component.ts';

/**
 * ImageBlock → 실제 이미지 데이터 해석기.
 * 파일을 찾으면 {data, ext} 반환, 없으면 null(→ placeholder fallback).
 */
export type ImageResolver = (block: { id: string; imageType: string; prompt: string }) => {
  data: Buffer;
  ext: string;
} | null;

/** 렌더링 중 이미지 media/관계를 누적하는 컨텍스트 */
interface RenderCtx {
  resolver?: ImageResolver;
  media: MediaItem[];
  /** drawing docPr 고유 id 카운터 */
  docPrSeq: number;
}

const SECT_PR =
  '<w:p/><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';

/** 텍스트 → 런들(여러 줄은 w:br 로 보존) */
function runs(text: string, bold = false): string {
  const rPr = bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return text
    .split('\n')
    .map((ln, i) => `<w:r>${rPr}${i > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${escXml(ln)}</w:t></w:r>`)
    .join('');
}

/**
 * 단락 인라인 변환(==강조==, [[tag:라벨]])을 스타일 런으로. 미포함 시 기존 runs 와 동일.
 * kind: 'hl'(하이라이트) | 'tag'(태그 칩) | ''(일반).
 */
function inlineRuns(text: string): string {
  const segs: { t: string; kind: 'hl' | 'tag' | '' }[] = [];
  const re = /==([^=]+?)==|\[\[tag:\s*([^\]]+?)\s*\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ t: text.slice(last, m.index), kind: '' });
    if (m[1] !== undefined) segs.push({ t: m[1], kind: 'hl' });
    else segs.push({ t: m[2], kind: 'tag' });
    last = re.lastIndex;
  }
  if (last < text.length) segs.push({ t: text.slice(last), kind: '' });
  const rPrOf = (k: 'hl' | 'tag' | ''): string => {
    if (k === 'hl') return '<w:rPr><w:highlight w:val="yellow"/></w:rPr>';
    if (k === 'tag') return '<w:rPr><w:color w:val="2563EB"/><w:shd w:val="clear" w:color="auto" w:fill="EFF6FF"/></w:rPr>';
    return '';
  };
  return segs
    .map((seg) => {
      const rPr = rPrOf(seg.kind);
      return seg.t
        .split('\n')
        .map((ln, i) => `<w:r>${rPr}${i > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${escXml(ln)}</w:t></w:r>`)
        .join('');
    })
    .join('');
}

function inlineParagraph(text: string): string {
  return `<w:p>${inlineRuns(text)}</w:p>`;
}

interface ParaOpts {
  style?: string; // pStyle
  numId?: number; // numbering 참조(steps)
  shadeFill?: string; // 음영(warning/result)
  bordered?: boolean; // 테두리(이미지 placeholder)
  bold?: boolean;
}

function paragraph(text: string, opts: ParaOpts = {}): string {
  const pPrParts: string[] = [];
  if (opts.style) pPrParts.push(`<w:pStyle w:val="${opts.style}"/>`);
  if (opts.numId) pPrParts.push(`<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${opts.numId}"/></w:numPr>`);
  if (opts.shadeFill) pPrParts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${opts.shadeFill}"/>`);
  if (opts.bordered) {
    pPrParts.push(
      '<w:pBdr><w:top w:val="dashed" w:sz="6" w:space="4" w:color="9AA0A6"/><w:left w:val="dashed" w:sz="6" w:space="4" w:color="9AA0A6"/><w:bottom w:val="dashed" w:sz="6" w:space="4" w:color="9AA0A6"/><w:right w:val="dashed" w:sz="6" w:space="4" w:color="9AA0A6"/></w:pBdr>',
    );
  }
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join('')}</w:pPr>` : '';
  return `<w:p>${pPr}${runs(text, opts.bold)}</w:p>`;
}

/** 라벨(굵게) + 본문 한 문단 */
function labeledParagraph(label: string, text: string, shadeFill?: string): string {
  const pPr = shadeFill ? `<w:pPr><w:shd w:val="clear" w:color="auto" w:fill="${shadeFill}"/></w:pPr>` : '';
  const labelRun = `<w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escXml(label)} </w:t></w:r>`;
  return `<w:p>${pPr}${labelRun}${runs(text)}</w:p>`;
}

function tableXml(columns: string[], rows: string[][]): string {
  const border = '<w:tblBorders>' +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
      .map((s) => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="D8DEE9"/>`)
      .join('') +
    '</w:tblBorders>';
  const tblPr = `<w:tblPr><w:tblW w:w="0" w:type="auto"/>${border}</w:tblPr>`;
  const cell = (text: string, bold: boolean): string =>
    `<w:tc><w:tcPr/><w:p>${runs(text, bold)}</w:p></w:tc>`;
  const headRow = `<w:tr>${columns.map((c) => cell(c, true)).join('')}</w:tr>`;
  const bodyRows = rows.map((r) => `<w:tr>${r.map((c) => cell(c, false)).join('')}</w:tr>`).join('');
  return `<w:tbl>${tblPr}${headRow}${bodyRows}</w:tbl>`;
}

/** 이미지 placeholder 문단(이미지 미해석 시 fallback) */
function imagePlaceholder(c: { id: string; imageType: string; prompt: string }): string {
  return paragraph(`[IMAGE SLOT: ${c.id} / ${c.imageType} / ${c.prompt}]`, { bordered: true });
}

/** ImageBlock → inline drawing(해석 성공) 또는 placeholder. media/관계는 ctx 에 누적. */
function imageXml(c: { id: string; imageType: string; prompt: string }, ctx: RenderCtx): string {
  const resolved = ctx.resolver?.(c);
  if (!resolved) return imagePlaceholder(c);

  const ext = normalizeExt(resolved.ext);
  const index = ctx.media.length + 1; // image1, image2 ...
  const fileName = `image${index}.${ext}`;
  const relId = `rId${100 + index}`; // styles=rId1/numbering=rId2 와 충돌 없는 영역
  ctx.media.push({ fileName, relId, ext, data: resolved.data });

  const { cx, cy } = emuExtent(imageDimensions(resolved.data, ext));
  ctx.docPrSeq += 1;
  return inlineDrawingParagraph(ctx.docPrSeq, relId, cx, cy, c.id);
}

/** 표지 이미지(data URI) → 본문 폭 inline drawing. 디코드 실패 시 빈 문자열(표지 텍스트가 대체). */
function coverImageXml(src: string, ctx: RenderCtx): string {
  const decoded = fromDataUri(src);
  if (!decoded) return '';
  const ext = normalizeExt(decoded.ext);
  const index = ctx.media.length + 1;
  const fileName = `image${index}.${ext}`;
  const relId = `rId${100 + index}`;
  ctx.media.push({ fileName, relId, ext, data: decoded.data });
  const { cx, cy } = emuExtent(imageDimensions(decoded.data, ext));
  ctx.docPrSeq += 1;
  return inlineDrawingParagraph(ctx.docPrSeq, relId, cx, cy, 'cover');
}

/** 단일 Component → DOCX XML 조각 (이미지 누적용 ctx; 미지정 시 placeholder 경로) */
export function componentToXml(c: Component, ctx: RenderCtx = { media: [], docPrSeq: 0 }): string {
  switch (c.type) {
    case 'CoverImage':
      return coverImageXml(c.src, ctx);
    case 'TitleBlock':
      return paragraph(c.text, { style: 'Heading1' });
    case 'SubtitleBlock':
      return paragraph(c.text, { bold: true });
    case 'AuthorBlock':
      return paragraph(c.text, { style: 'Caption' });
    case 'ChapterHeading':
      return paragraph(`Chapter ${c.number}. ${c.title}`, { style: 'Heading1' });
    case 'TableOfContentsList':
      return c.entries.map((e) => paragraph(`${e.number}. ${e.title}`, { numId: 1 })).join('');
    case 'CopyrightNotice':
      return paragraph(c.text, { style: 'Caption' });
    case 'AuthorBio':
      return paragraph(c.heading, { style: 'Heading2' }) + paragraph(c.text);
    case 'Disclaimer':
      return paragraph(c.heading, { style: 'Heading2' }) + paragraph(c.text, { style: 'Caption' });
    case 'ParagraphBlock':
      return inlineParagraph(c.text);
    case 'QuoteBlock':
      return paragraph(c.text, { style: 'Quote' });
    case 'ChecklistCard':
      return c.items.map((it) => paragraph(`☐ ${it}`)).join('');
    case 'StepsCard':
      return c.items.map((it) => paragraph(it, { numId: 1 })).join('');
    case 'TableCard':
    case 'CompareCard':
      return tableXml(c.columns, c.rows);
    case 'WarningCard':
      return labeledParagraph('주의:', c.text, 'FFF1E6');
    case 'ResultCard': {
      const rL: Record<string, string> = { success: '성공:', info: '정보:', warning: '주의:', error: '오류:' };
      const rT: Record<string, string> = { success: 'F0FDF4', info: 'EFF6FF', warning: 'FFFBEB', error: 'FEF2F2' };
      const rLabel = c.variant ? rL[c.variant] : '핵심 결과:';
      const rTint = c.variant ? rT[c.variant] : 'EAF2FB';
      return labeledParagraph(rLabel, c.text, rTint);
    }
    case 'CalloutCard': {
      const L: Record<string, string> = { info: '정보:', tip: '팁:', note: '노트:' };
      const T: Record<string, string> = { info: 'EFF6FF', tip: 'F0FDF4', note: 'F5F3FF' };
      return labeledParagraph(L[c.variant] ?? '정보:', c.text, T[c.variant] ?? 'EFF6FF');
    }
    case 'Divider':
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="E5E7EB"/></w:pBdr></w:pPr></w:p>';
    case 'CodeBlock': {
      const label = c.lang ? labeledParagraph('코드:', c.lang, 'F3F4F6') : '';
      const codeRuns = c.code
        .split('\n')
        .map((ln, i) => `<w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/></w:rPr>${i > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${escXml(ln)}</w:t></w:r>`)
        .join('');
      return label + `<w:p><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/></w:pPr>${codeRuns}</w:p>`;
    }
    case 'FAQCard':
      return c.pairs.map((p) => `${labeledParagraph('Q.', p.q)}${labeledParagraph('A.', p.a)}`).join('');
    case 'TimelineCard':
      return c.items
        .map((it) => paragraph(it.date, { style: 'Caption' }) + paragraph(it.title, { bold: true }) + (it.desc ? paragraph(it.desc) : ''))
        .join('');
    case 'StatsCard':
      return c.items
        .map((it) => paragraph(`${it.icon ? it.icon + ' ' : ''}${it.value}`, { bold: true }) + paragraph(it.label, { style: 'Caption' }))
        .join('');
    case 'ChartCard': {
      const n = Math.min(c.labels.length, c.values.length);
      const head = ['항목', c.unit ? `값 (${c.unit})` : '값'];
      const rows: string[][] = [];
      for (let i = 0; i < n; i++) rows.push([c.labels[i], String(c.values[i])]);
      return (c.title ? paragraph(c.title, { bold: true }) : '') + tableXml(head, rows);
    }
    case 'TimelineCardList':
      // 수직선 그래픽 생략 → 날짜(caption) + 제목(bold) + 설명 목록. date 없으면 생략.
      return c.items
        .map(
          (it) =>
            (it.date ? paragraph(it.date, { style: 'Caption' }) : '') +
            paragraph(it.title, { bold: true }) +
            (it.desc ? paragraph(it.desc) : ''),
        )
        .join('');
    case 'StepperCard': {
      // 가로 그래픽 대신 번호 목록 + 현재 단계만 음영(◀ 현재). 완료=✓.
      if (c.steps.length === 0) return '';
      const cur = c.current;
      let out = c.steps
        .map((label, idx) => {
          const s = idx + 1;
          const done = s < cur;
          const isCur = s === cur;
          const txt = `${s}. ${label}${done ? ' ✓' : ''}${isCur ? ' ◀ 현재' : ''}`;
          return paragraph(txt, { bold: isCur, shadeFill: isCur ? 'EAF1FB' : undefined });
        })
        .join('');
      if (c.desc) {
        const curLabel = c.steps[cur - 1] ?? '';
        out += paragraph(`${cur}단계: ${curLabel}`, { bold: true });
        out += paragraph(c.desc, { style: 'Caption' });
      }
      return out;
    }
    case 'ProgressCard':
      // 막대 표현이 제한적 → "라벨 — NN%(완료)" 텍스트 + 음영. 첫 항목=전체(굵게).
      return c.items
        .map((it, i) => {
          const done = it.percent >= 100;
          const txt = `${it.label} — ${done ? '완료 ✓' : it.percent + '%'}`;
          return paragraph(txt, { bold: i === 0 || done, shadeFill: done ? 'E6F4EA' : 'EAF1FB' });
        })
        .join('');
    case 'FeatureCard': {
      const head = paragraph(`${c.icon ? c.icon + ' ' : ''}${c.title}`, { bold: true });
      const desc = c.desc ? paragraph(c.desc) : '';
      const items = c.items.map((it) => paragraph(`✓ ${it}`)).join('');
      return head + desc + items;
    }
    case 'ComparisonCard':
      return tableXml(c.columns, c.rows);
    case 'AlertCard': {
      const L: Record<string, string> = { success: '성공:', info: '정보:', warning: '경고:', error: '오류:' };
      const T: Record<string, string> = { success: 'EAF7EE', info: 'EAF1FB', warning: 'FFF7E6', error: 'FDECEC' };
      return labeledParagraph(L[c.variant] ?? '정보:', c.text, T[c.variant] ?? 'EAF1FB');
    }
    case 'ProcessCard':
      return c.items
        .map((it) => paragraph(`${it.icon ? it.icon + ' ' : ''}${it.title}`, { bold: true }) + (it.desc ? paragraph(it.desc, { style: 'Caption' }) : ''))
        .join('');
    case 'RatingCard': {
      const filled = Math.round(c.value);
      const stars = '★'.repeat(Math.max(0, filled)) + '☆'.repeat(Math.max(0, c.max - filled));
      return paragraph(`${stars}  ${c.value} / ${c.max}${c.label ? '  ' + c.label : ''}`, { bold: true });
    }
    case 'TagGroup':
    case 'ChipGroup':
      return paragraph(c.items.join('   ·   '));
    case 'TreeCard':
      return c.items.map((it) => paragraph(`${'    '.repeat(it.depth)}└ ${it.label}`)).join('');
    case 'PaginationCard':
      return paragraph(`${c.current} / ${c.total} 페이지`, { style: 'Caption' });
    case 'EmptyState':
      return paragraph(`${c.icon ? c.icon + ' ' : ''}${c.title}`, { bold: true }) + (c.desc ? paragraph(c.desc, { style: 'Caption' }) : '');
    case 'SearchBar':
      return paragraph(`검색: ${c.query || c.placeholder}`, { shadeFill: 'F3F4F6' });
    case 'TooltipBox':
      return labeledParagraph(c.label ? `${c.label}:` : '설명:', c.text, 'F9FAFB');
    case 'PopoverBox':
      return (c.title ? paragraph(c.title, { bold: true }) : '') + paragraph(c.text, { shadeFill: 'F9FAFB' });
    case 'ModalCard':
      return paragraph(c.title, { bold: true, shadeFill: 'EAF1FB' }) + paragraph(c.text, { shadeFill: 'EAF1FB' });
    case 'DrawerCard':
      return paragraph(c.title, { bold: true, shadeFill: 'EAF1FB' }) + paragraph(c.text, { shadeFill: 'EAF1FB' });
    case 'SkeletonCard':
      return paragraph('[ 콘텐츠 자리 (준비 중) ]', { style: 'Caption', shadeFill: 'F3F4F6' });
    case 'FileCard': {
      const sub = [c.fileType, c.size].filter((s) => s !== '').join(' · ');
      return paragraph(`📄 ${c.name}`, { bold: true }) + (sub ? paragraph(sub, { style: 'Caption' }) : '');
    }
    case 'ImageBlock':
      return imageXml(c, ctx);
    default:
      // 안전 fallback: 알 수 없는 컴포넌트는 일반 문단
      return paragraph(String((c as { type?: string }).type ?? ''));
  }
}

/** Components → { document.xml, media } */
export function renderDocument(components: Component[], resolver?: ImageResolver): { xml: string; media: MediaItem[] } {
  const ctx: RenderCtx = { resolver, media: [], docPrSeq: 0 };
  const body = components.map((c) => componentToXml(c, ctx)).join('');
  const xml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<w:body>${body}${SECT_PR}</w:body></w:document>`;
  return { xml, media: ctx.media };
}

/** Components → document.xml 전체(이미지 없음 경로, 하위호환) */
export function renderDocumentXml(components: Component[], resolver?: ImageResolver): string {
  return renderDocument(components, resolver).xml;
}

/** Components → .docx Buffer */
export function renderDocx(components: Component[], title: string, resolver?: ImageResolver): Buffer {
  const { xml, media } = renderDocument(components, resolver);
  return buildDocx(xml, title, media);
}
