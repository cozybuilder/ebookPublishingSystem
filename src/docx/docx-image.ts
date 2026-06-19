/**
 * Ebook Publishing System — DOCX 이미지(Inline Drawing) 헬퍼 (순수)
 *
 * PNG/JPEG 크기 파싱 → EMU 변환(표시 폭 clamp) → WordprocessingML inline drawing XML.
 * 외부 라이브러리 0. (PNG 크기는 export/png-size 재사용)
 */

import { readPngSize } from '../export/png-size.ts';
import { escXml } from './docx-escape.ts';

export type ImageExt = 'png' | 'jpg' | 'jpeg';

const EMU_PER_PX = 9525;
/** 본문 최대 표시 폭(EMU). 약 5.7인치 — A4 본문 폭 안에 안전하게 들어감. */
export const MAX_IMAGE_WIDTH_EMU = 5_486_400;

export function imageContentType(ext: ImageExt): string {
  return ext === 'png' ? 'image/png' : 'image/jpeg';
}

export function normalizeExt(ext: string): ImageExt {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (e === 'png') return 'png';
  if (e === 'jpeg') return 'jpeg';
  return 'jpg';
}

/** JPEG SOF 마커에서 width/height(px) 파싱. 실패 시 null. */
export function jpegDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let off = 2;
  while (off + 9 < buf.length) {
    if (buf[off] !== 0xff) {
      off++;
      continue;
    }
    const marker = buf[off + 1];
    // SOF0..SOF15 (0xC0–0xCF) 제외 0xC4(DHT)/0xC8(JPG)/0xCC(DAC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = buf.readUInt16BE(off + 5);
      const width = buf.readUInt16BE(off + 7);
      return { width, height };
    }
    if (off + 4 > buf.length) break;
    const len = buf.readUInt16BE(off + 2);
    off += 2 + len;
  }
  return null;
}

export function imageDimensions(buf: Buffer, ext: ImageExt): { width: number; height: number } | null {
  if (ext === 'png') return readPngSize(buf.subarray(0, 24));
  return jpegDimensions(buf);
}

/** px 크기 → EMU(표시 폭 clamp, 비율 유지). 크기 파싱 실패 시 기본 폭 사용. */
export function emuExtent(dim: { width: number; height: number } | null): { cx: number; cy: number } {
  if (!dim || dim.width <= 0 || dim.height <= 0) {
    return { cx: MAX_IMAGE_WIDTH_EMU, cy: Math.round((MAX_IMAGE_WIDTH_EMU * 3) / 4) };
  }
  let cx = dim.width * EMU_PER_PX;
  let cy = dim.height * EMU_PER_PX;
  if (cx > MAX_IMAGE_WIDTH_EMU) {
    const scale = MAX_IMAGE_WIDTH_EMU / cx;
    cx = MAX_IMAGE_WIDTH_EMU;
    cy = Math.round(cy * scale);
  }
  return { cx: Math.round(cx), cy };
}

/**
 * inline drawing 문단 XML.
 * @param docPrId   문서 내 고유 drawing id(정수)
 * @param relId     document.xml.rels 의 이미지 관계 id(rIdN)
 * @param cx,cy     EMU 크기
 * @param name      표시 이름(보통 이미지 id)
 */
export function inlineDrawingParagraph(docPrId: number, relId: string, cx: number, cy: number, name: string): string {
  const nm = escXml(name);
  return (
    '<w:p><w:r><w:drawing>' +
    `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${docPrId}" name="${nm}"/>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${nm}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline>` +
    '</w:drawing></w:r></w:p>'
  );
}
