/**
 * Ebook Publishing System — Markdown → Book AST 파서 (v0.1)
 *
 * 기준 문서:
 *  - docs/01_MARKDOWN_RULES.md (입력 언어 규약)
 *  - docs/06_AST_SCHEMA.md     (AST 구조)
 *  - docs/09_SCHEMA_FORMALIZATION.md (타입 계약)
 *
 * 이 단계의 목표는 오직 Markdown 원고를 Book AST 로 변환하는 것이다.
 * (렌더러 / 레이아웃 / 디자인 토큰 / 출력 프로파일은 다루지 않는다.)
 */

import type {
  Block,
  Book,
  Chapter,
  CompareBlock,
  FaqPair,
  Metadata,
  TableBlock,
} from '../types/ast.ts';

const CONTAINER_BLOCK_NAMES = new Set<string>([
  'checklist',
  'compare',
  'before-after',
  'prompt',
  'steps',
  'faq',
  'warning',
  'result',
  'image',
]);

const CHAPTER_RE = /^##\s+Chapter\s+(\d+)\.\s*(.*)$/i;
const CONTAINER_OPEN_RE = /^:::\s*([a-zA-Z-]+)\s*$/;
const CONTAINER_CLOSE_RE = /^:::\s*$/;

/** 한 줄에서 첫 'key: value' 형태를 분리한다. 매칭 안 되면 null. */
function splitKeyValue(line: string): { key: string; value: string } | null {
  const idx = line.indexOf(':');
  if (idx <= 0) return null;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  if (!/^[a-zA-Z_-]+$/.test(key)) return null;
  return { key, value };
}

/** '- a, b, c' 형태의 리스트 행을 셀 배열로 분리. */
function splitRow(line: string): string[] {
  return stripBullet(line)
    .split(',')
    .map((c) => c.trim());
}

function stripBullet(line: string): string {
  return line.replace(/^\s*-\s+/, '').trim();
}

function isBulletLine(line: string): boolean {
  return /^\s*-\s+/.test(line);
}

function isQuoteLine(line: string): boolean {
  // '>' 또는 '> ...' 형태. (일반 문단을 오인하지 않도록 줄 시작이 '>' 인 경우만)
  return /^\s*>/.test(line);
}

function stripQuoteMarker(line: string): string {
  // 선행 '>' 1개와 뒤따르는 공백 1개 제거 (빈 '>' 줄은 빈 문자열)
  return line.replace(/^\s*>\s?/, '').trim();
}

function isTableLine(line: string): boolean {
  return /^\s*\|.*\|\s*$/.test(line.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-');
}

function splitTableCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);
  return s.split('|').map((c) => c.trim());
}

/**
 * 컨테이너 블록의 내부 줄들을 블록 타입에 맞는 Block 으로 변환한다.
 */
function buildContainerBlock(name: string, body: string[]): Block {
  const nonEmpty = body.filter((l) => l.trim() !== '');

  switch (name) {
    case 'checklist':
      return { type: 'checklist', items: nonEmpty.map(stripBullet) };

    case 'steps':
      return { type: 'steps', items: nonEmpty.map(stripBullet) };

    case 'compare': {
      let columns: string[] = [];
      const rows: string[][] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'columns') {
          columns = kv.value.split(',').map((c) => c.trim());
        } else if (isBulletLine(line)) {
          rows.push(splitRow(line));
        }
      }
      const block: CompareBlock = { type: 'compare', columns, rows };
      return block;
    }

    case 'before-after': {
      let before = '';
      let after = '';
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'before') before = kv.value;
        else if (kv.key === 'after') after = kv.value;
      }
      return { type: 'before-after', before, after };
    }

    case 'faq': {
      const pairs: FaqPair[] = [];
      let current: FaqPair | null = null;
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'q') {
          current = { q: kv.value, a: '' };
          pairs.push(current);
        } else if (kv && kv.key === 'a' && current) {
          current.a = kv.value;
        }
      }
      return { type: 'faq', pairs };
    }

    case 'image': {
      let id = '';
      let imageType = '';
      let prompt = '';
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'id') id = kv.value;
        // 입력 키는 'type' 이지만 AST 에서는 imageType 으로 저장 (docs/09 §1)
        else if (kv.key === 'type') imageType = kv.value;
        else if (kv.key === 'prompt') prompt = kv.value;
      }
      return { type: 'image', id, imageType, prompt };
    }

    case 'prompt':
      return { type: 'prompt', text: body.join('\n').trim() };
    case 'warning':
      return { type: 'warning', text: body.join('\n').trim() };
    case 'result':
      return { type: 'result', text: body.join('\n').trim() };

    default:
      // 알 수 없는 블록 이름 → 본문으로 강등 (방어적 처리)
      return { type: 'paragraph', text: body.join('\n').trim() };
  }
}

/** Markdown 원고 전체를 Book AST 로 변환한다. */
export function parseBook(markdown: string): Book {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  const metadata: Metadata = { title: '' };
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;

  let i = 0;

  // ---- 1) 문서 상단 메타데이터 ----
  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (t === '') continue;

    if (t.startsWith('# ') && !t.startsWith('## ')) {
      metadata.title = t.slice(2).trim();
      continue;
    }
    const kv = splitKeyValue(t);
    if (kv && kv.key === 'subtitle') {
      metadata.subtitle = kv.value;
      continue;
    }
    if (kv && kv.key === 'author') {
      metadata.author = kv.value;
      continue;
    }
    // 메타데이터가 아닌 첫 콘텐츠 줄 → 챕터 본문 파싱으로 넘어감
    break;
  }

  // ---- 2) 챕터 / 블록 본문 ----
  let paragraphBuf: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    const text = paragraphBuf.join(' ').replace(/\s+/g, ' ').trim();
    paragraphBuf = [];
    if (text === '') return;
    if (current) current.blocks.push({ type: 'paragraph', text });
  };

  for (; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    // 챕터 경계
    const chapterMatch = t.match(CHAPTER_RE);
    if (chapterMatch) {
      flushParagraph();
      current = {
        number: Number(chapterMatch[1]),
        title: chapterMatch[2].trim(),
        blocks: [],
      };
      chapters.push(current);
      continue;
    }

    // 빈 줄 → 문단 종료
    if (t === '') {
      flushParagraph();
      continue;
    }

    // 컨테이너 블록 시작
    const open = t.match(CONTAINER_OPEN_RE);
    if (open && CONTAINER_BLOCK_NAMES.has(open[1])) {
      flushParagraph();
      const name = open[1];
      const body: string[] = [];
      i++;
      for (; i < lines.length; i++) {
        if (CONTAINER_CLOSE_RE.test(lines[i].trim())) break;
        body.push(lines[i]);
      }
      const block = buildContainerBlock(name, body);
      if (current) current.blocks.push(block);
      continue;
    }

    // 인용문 (Markdown blockquote): '>' 로 시작하는 연속 줄을 하나의 quote 로 묶는다.
    // 빈 줄 또는 '>' 가 아닌 줄에서 종료. '>' 기호는 텍스트에서 제거한다.
    if (isQuoteLine(line)) {
      flushParagraph();
      const quoteLines: string[] = [];
      for (; i < lines.length; i++) {
        if (!isQuoteLine(lines[i])) {
          i--; // 인용문 아닌 줄은 다음 루프에서 다시 처리
          break;
        }
        quoteLines.push(stripQuoteMarker(lines[i]));
      }
      const text = quoteLines.join(' ').replace(/\s+/g, ' ').trim();
      if (current && text !== '') current.blocks.push({ type: 'quote', text });
      continue;
    }

    // 표준 Markdown 표
    if (isTableLine(line)) {
      flushParagraph();
      const tableLines: string[] = [];
      for (; i < lines.length; i++) {
        if (!isTableLine(lines[i])) {
          i--; // 표 아닌 줄은 다음 루프에서 다시 처리
          break;
        }
        tableLines.push(lines[i]);
      }
      const table = buildTable(tableLines);
      if (current && table) current.blocks.push(table);
      continue;
    }

    // 그 외 → 본문 누적
    paragraphBuf.push(t);
  }
  flushParagraph();

  return { metadata, chapters };
}

function buildTable(tableLines: string[]): TableBlock | null {
  if (tableLines.length === 0) return null;
  const rowsRaw = tableLines.map(splitTableCells);
  const columns = rowsRaw[0];
  // 둘째 줄이 구분선(---)이면 데이터에서 제외
  let dataStart = 1;
  if (tableLines.length > 1 && isTableSeparator(tableLines[1])) dataStart = 2;
  const rows = rowsRaw.slice(dataStart);
  return { type: 'table', columns, rows };
}
