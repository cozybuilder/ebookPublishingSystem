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
  ResultVariant,
  AlertVariant,
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
  'info',
  'tip',
  'note',
  'divider',
  'timeline',
  'stats',
  'chart',
  'feature',
  'progress',
  'stepper',
  'timeline-card',
  'compare-card',
  'alert',
  'process',
  'rating',
  'tags',
  'chips',
  'tree',
  'pagination',
  'empty',
  'search',
  'tooltip',
  'popover',
  'modal',
  'drawer',
  'skeleton',
  'file',
  'image',
]);

const HR_RE = /^(-{3,}|\*{3,}|_{3,})$/;
const FENCE_OPEN_RE = /^```([\w+-]*)\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;

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

/** 라벨 목록 파싱(태그/칩): '- 라벨' 불릿 또는 쉼표 구분 모두 허용. */
function parseLabelList(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    if (line.trim() === '') continue;
    if (isBulletLine(line)) {
      out.push(stripBullet(line));
      continue;
    }
    for (const part of line.split(',')) {
      const p = part.trim();
      if (p !== '') out.push(p);
    }
  }
  return out;
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
    case 'result': {
      // 첫 비어있지 않은 줄이 `variant: success|info|warning|error` 면 변형으로 처리.
      // (선언이 없으면 기존 동작 그대로 — 회귀 0)
      const lines = [...body];
      let variant: ResultVariant | undefined;
      const firstIdx = lines.findIndex((l) => l.trim() !== '');
      if (firstIdx !== -1) {
        const kv = splitKeyValue(lines[firstIdx]);
        if (kv && kv.key === 'variant') {
          const v = kv.value.trim().toLowerCase();
          if (v === 'success' || v === 'info' || v === 'warning' || v === 'error') {
            variant = v;
            lines.splice(0, firstIdx + 1);
          }
        }
      }
      return { type: 'result', text: lines.join('\n').trim(), variant };
    }
    case 'info':
    case 'tip':
    case 'note':
      return { type: 'callout', variant: name, text: body.join('\n').trim() };
    case 'divider':
      return { type: 'divider' };

    case 'timeline': {
      const items: { date: string; title: string; desc: string }[] = [];
      let chunk: string[] = [];
      const pushChunk = () => {
        if (chunk.length === 0) return;
        items.push({
          date: (chunk[0] ?? '').trim(),
          title: (chunk[1] ?? '').trim(),
          desc: chunk.slice(2).map((s) => s.trim()).join(' '),
        });
        chunk = [];
      };
      for (const line of body) {
        if (line.trim() === '') pushChunk();
        else chunk.push(line);
      }
      pushChunk();
      return { type: 'timeline', items };
    }

    case 'stats': {
      const items: { icon: string; value: string; label: string }[] = [];
      let cur: { icon: string; value: string; label: string } | null = null;
      for (const line of body) {
        if (line.trim() === '') {
          if (cur) {
            items.push(cur);
            cur = null;
          }
          continue;
        }
        const kv = splitKeyValue(line.trim());
        if (!kv) continue;
        if (!cur) cur = { icon: '', value: '', label: '' };
        if (kv.key === 'icon') cur.icon = kv.value;
        else if (kv.key === 'value') cur.value = kv.value;
        else if (kv.key === 'label') cur.label = kv.value;
      }
      if (cur) items.push(cur);
      return { type: 'stats', items };
    }

    case 'chart': {
      let chartType = 'bar';
      let title = '';
      let unit = '';
      let center = '';
      let labels: string[] = [];
      let values: number[] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'type') chartType = kv.value;
        else if (kv.key === 'title') title = kv.value;
        else if (kv.key === 'unit') unit = kv.value;
        else if (kv.key === 'center') center = kv.value;
        else if (kv.key === 'labels') labels = kv.value.split(',').map((s) => s.trim()).filter((s) => s !== '');
        else if (kv.key === 'values') values = kv.value.split(',').map((s) => Number(s.trim())).filter((nv) => !Number.isNaN(nv));
      }
      return { type: 'chart', chartType, title, unit, center, labels, values };
    }

    case 'feature': {
      // icon/title/desc = key-value, '- ' 불릿 = 체크리스트 항목 (title 외 모두 선택)
      let icon = '';
      let title = '';
      let desc = '';
      const items: string[] = [];
      for (const line of nonEmpty) {
        if (isBulletLine(line)) {
          items.push(stripBullet(line));
          continue;
        }
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'icon') icon = kv.value;
        else if (kv.key === 'title') title = kv.value;
        else if (kv.key === 'desc') desc = kv.value;
      }
      return { type: 'feature', icon, title, desc, items };
    }

    case 'progress': {
      // 각 줄 = `라벨: 퍼센트`. 첫 항목=전체 진행률. 라벨은 한글 가능하므로
      // splitKeyValue(ASCII 키 전용) 대신 첫 콜론 기준으로 직접 분리. 0~100 clamp.
      const items: { label: string; percent: number }[] = [];
      for (const line of nonEmpty) {
        const idx = line.indexOf(':');
        if (idx <= 0) continue;
        const label = line.slice(0, idx).trim();
        const n = Number(line.slice(idx + 1).replace('%', '').trim());
        if (label === '' || Number.isNaN(n)) continue;
        const percent = Math.max(0, Math.min(100, n));
        items.push({ label, percent });
      }
      return { type: 'progress', items };
    }

    case 'stepper': {
      // current/desc = ASCII key-value, '- ' 불릿 = 단계 라벨. current 는 1~N clamp.
      let current = 1;
      let desc = '';
      const steps: string[] = [];
      for (const line of nonEmpty) {
        if (isBulletLine(line)) {
          steps.push(stripBullet(line));
          continue;
        }
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'current') {
          const n = Number(kv.value.trim());
          if (!Number.isNaN(n)) current = Math.round(n);
        } else if (kv.key === 'desc') desc = kv.value;
      }
      current = steps.length > 0 ? Math.max(1, Math.min(steps.length, current)) : 1;
      return { type: 'stepper', current, desc, steps };
    }

    case 'timeline-card': {
      // 빈 줄로 항목 구분, 항목 내부 date(선택)/title(필수)/desc(선택) 키-값.
      const items: { date: string; title: string; desc: string }[] = [];
      let cur: { date: string; title: string; desc: string } | null = null;
      const pushCur = () => {
        if (cur && cur.title !== '') items.push(cur);
        cur = null;
      };
      for (const line of body) {
        if (line.trim() === '') {
          pushCur();
          continue;
        }
        const kv = splitKeyValue(line.trim());
        if (!kv) continue;
        if (!cur) cur = { date: '', title: '', desc: '' };
        if (kv.key === 'date') cur.date = kv.value;
        else if (kv.key === 'title') cur.title = kv.value;
        else if (kv.key === 'desc') cur.desc = kv.value;
      }
      pushCur();
      return { type: 'timeline-card', items };
    }

    case 'compare-card': {
      // 기존 compare 문법 + highlight(강조 열, 선택)
      let columns: string[] = [];
      let highlight = '';
      const rows: string[][] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'columns') columns = kv.value.split(',').map((c) => c.trim());
        else if (kv && kv.key === 'highlight') highlight = kv.value.trim();
        else if (isBulletLine(line)) rows.push(splitRow(line));
      }
      return { type: 'compare-card', columns, highlight, rows };
    }

    case 'alert': {
      let variant: AlertVariant = 'info';
      const textLines: string[] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'variant') {
          const v = kv.value.trim().toLowerCase();
          if (v === 'success' || v === 'info' || v === 'warning' || v === 'error') variant = v;
        } else if (kv && kv.key === 'text') textLines.push(kv.value);
        else textLines.push(line.trim());
      }
      return { type: 'alert', variant, text: textLines.join(' ').trim() };
    }

    case 'process': {
      // 빈 줄로 항목 구분, icon(선택)/title/desc 키-값
      const items: { icon: string; title: string; desc: string }[] = [];
      let cur: { icon: string; title: string; desc: string } | null = null;
      const push = () => {
        if (cur && cur.title !== '') items.push(cur);
        cur = null;
      };
      for (const line of body) {
        if (line.trim() === '') {
          push();
          continue;
        }
        const kv = splitKeyValue(line.trim());
        if (!kv) continue;
        if (!cur) cur = { icon: '', title: '', desc: '' };
        if (kv.key === 'icon') cur.icon = kv.value;
        else if (kv.key === 'title') cur.title = kv.value;
        else if (kv.key === 'desc') cur.desc = kv.value;
      }
      push();
      return { type: 'process', items };
    }

    case 'rating': {
      let value = 0;
      let max = 5;
      let label = '';
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'value') {
          const n = Number(kv.value.trim());
          if (!Number.isNaN(n)) value = n;
        } else if (kv.key === 'max') {
          const n = Number(kv.value.trim());
          if (!Number.isNaN(n) && n > 0) max = n;
        } else if (kv.key === 'label') label = kv.value;
      }
      value = Math.max(0, Math.min(max, value));
      return { type: 'rating', value, max, label };
    }

    case 'tags':
      return { type: 'tags', items: parseLabelList(nonEmpty) };

    case 'chips':
      return { type: 'chips', items: parseLabelList(nonEmpty) };

    case 'tree': {
      // 들여쓰기(공백 2칸 또는 탭 = 1단계) + '- ' 불릿
      const items: { depth: number; label: string }[] = [];
      for (const raw of body) {
        if (raw.trim() === '') continue;
        const m = raw.match(/^(\s*)-\s+(.*)$/);
        if (!m) continue;
        const indent = m[1].replace(/\t/g, '  ');
        const depth = Math.floor(indent.length / 2);
        items.push({ depth, label: m[2].trim() });
      }
      return { type: 'tree', items };
    }

    case 'pagination': {
      let current = 1;
      let total = 1;
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'current') {
          const n = Number(kv.value.trim());
          if (!Number.isNaN(n)) current = n;
        } else if (kv.key === 'total') {
          const n = Number(kv.value.trim());
          if (!Number.isNaN(n)) total = n;
        }
      }
      total = Math.max(1, Math.round(total));
      current = Math.max(1, Math.min(total, Math.round(current)));
      return { type: 'pagination', current, total };
    }

    case 'empty': {
      let icon = '';
      let title = '';
      let desc = '';
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'icon') icon = kv.value;
        else if (kv.key === 'title') title = kv.value;
        else if (kv.key === 'desc') desc = kv.value;
      }
      return { type: 'empty', icon, title, desc };
    }

    case 'search': {
      let placeholder = '';
      let query = '';
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'placeholder') placeholder = kv.value;
        else if (kv.key === 'query') query = kv.value;
      }
      return { type: 'search', placeholder, query };
    }

    case 'tooltip': {
      let label = '';
      const textLines: string[] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'label') label = kv.value;
        else if (kv && kv.key === 'text') textLines.push(kv.value);
        else textLines.push(line.trim());
      }
      return { type: 'tooltip', label, text: textLines.join(' ').trim() };
    }

    case 'popover': {
      let title = '';
      const textLines: string[] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'title') title = kv.value;
        else if (kv && kv.key === 'text') textLines.push(kv.value);
        else textLines.push(line.trim());
      }
      return { type: 'popover', title, text: textLines.join(' ').trim() };
    }

    case 'modal': {
      let title = '';
      const textLines: string[] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'title') title = kv.value;
        else if (kv && kv.key === 'text') textLines.push(kv.value);
        else textLines.push(line.trim());
      }
      return { type: 'modal', title, text: textLines.join(' ').trim() };
    }

    case 'drawer': {
      let title = '';
      const textLines: string[] = [];
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'title') title = kv.value;
        else if (kv && kv.key === 'text') textLines.push(kv.value);
        else textLines.push(line.trim());
      }
      return { type: 'drawer', title, text: textLines.join(' ').trim() };
    }

    case 'skeleton': {
      let lines = 3;
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (kv && kv.key === 'lines') {
          const n = Number(kv.value.trim());
          if (!Number.isNaN(n) && n > 0) lines = Math.min(12, Math.round(n));
        }
      }
      return { type: 'skeleton', lines };
    }

    case 'file': {
      let name = '';
      let size = '';
      let fileType = '';
      for (const line of nonEmpty) {
        const kv = splitKeyValue(line);
        if (!kv) continue;
        if (kv.key === 'name') name = kv.value;
        else if (kv.key === 'size') size = kv.value;
        else if (kv.key === 'type') fileType = kv.value;
      }
      return { type: 'file', name, size, fileType };
    }

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
    if (kv && kv.key === 'cover') {
      metadata.cover = kv.value;
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

    // 단독 수평선(`---` / `***` / `___`) → 구분선 블록
    if (HR_RE.test(t)) {
      flushParagraph();
      if (current) current.blocks.push({ type: 'divider' });
      continue;
    }

    // 코드 펜스(```lang … ```): 내부는 원문 그대로 보존
    const fence = t.match(FENCE_OPEN_RE);
    if (fence) {
      flushParagraph();
      const lang = (fence[1] ?? '').trim();
      const codeLines: string[] = [];
      i++;
      for (; i < lines.length; i++) {
        if (FENCE_CLOSE_RE.test(lines[i].trim())) break;
        codeLines.push(lines[i]);
      }
      if (current) current.blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
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
