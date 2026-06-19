/**
 * Ebook Publishing System — Component → DOCX(WordprocessingML) 렌더러 (v1)
 *
 * 편집 가능한 흐름형 Word 구조 우선(테마 복제 아님).
 * 지원: 제목/본문/인용/체크리스트/표/단계/주의/결과 + 이미지 placeholder.
 * 미지원 타입은 일반 문단으로 안전 fallback.
 */

import { escXml } from './docx-escape.ts';
import { buildDocx } from './docx-package.ts';
import type { Component } from '../types/component.ts';

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

/** 단일 Component → DOCX XML 조각 */
export function componentToXml(c: Component): string {
  switch (c.type) {
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
    case 'ParagraphBlock':
      return paragraph(c.text);
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
    case 'ResultCard':
      return labeledParagraph('핵심 결과:', c.text, 'EAF2FB');
    case 'FAQCard':
      return c.pairs.map((p) => `${labeledParagraph('Q.', p.q)}${labeledParagraph('A.', p.a)}`).join('');
    case 'ImageBlock':
      return paragraph(`[IMAGE SLOT: ${c.id} / ${c.imageType} / ${c.prompt}]`, { bordered: true });
    default:
      // 안전 fallback: 알 수 없는 컴포넌트는 일반 문단
      return paragraph(String((c as { type?: string }).type ?? ''));
  }
}

/** Components → document.xml 전체 */
export function renderDocumentXml(components: Component[]): string {
  const body = components.map(componentToXml).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    `<w:body>${body}${SECT_PR}</w:body></w:document>`
  );
}

/** Components → .docx Buffer */
export function renderDocx(components: Component[], title: string): Buffer {
  return buildDocx(renderDocumentXml(components), title);
}
