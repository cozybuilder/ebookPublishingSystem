/**
 * build-paged.ts — 추가 산출물 book-paged.pdf 전용 경로 (Phase 2-B)
 *
 * 기존 PDF 경로(book.pdf = v6 Blink)는 건드리지 않는다. 이 스크립트는
 * 이미 생성된 output/book.modern.html 을 "인쇄용으로 후처리"한 뒤
 * pagedjs-cli(paged.js) 로 book-paged.pdf 를 생성한다.
 *
 * 후처리(엔진/컴포넌트 미변경 — 문자열 주입만):
 *   - paged 전용 CSS(@page 쪽번호/러닝헤드 마진박스 + v6 표지/앞부속/밀도/절단방지)
 *   - 챕터 섹션에 id, 목차 항목을 링크화(target-counter 로 목차 쪽번호)
 *
 * 실행: npm run build:paged  (사전: npm run build 로 output/book.modern.html 존재)
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { findBrowser, browserNotFoundMessage } from './export/browser.ts';

const SRC_HTML = 'output/book.modern.html';
const INPUT_HTML = 'tmp/book-paged-input.html';
const OUT_PDF = 'output/book-paged.pdf';

/** paged.js 전용 인쇄 CSS (v6 규칙 이식 + 쪽번호/러닝헤드/목차번호) */
const PAGED_CSS = `<style id="paged-build">
@page {
  size: A4; margin: 16mm 17mm;
  @bottom-center { content: counter(page); font: 11px Pretendard, "Noto Sans KR", sans-serif; color: #6B7280; }
  @top-center { content: string(rhead); font: 10px Pretendard, "Noto Sans KR", sans-serif; color: #9CA3AF; letter-spacing: .08em; }
}
@page cover { margin: 0; @bottom-center { content: none } @top-center { content: none } }
@page :first { @bottom-center { content: none } @top-center { content: none } }

.page { box-shadow: none !important; border: none !important; border-radius: 0 !important; margin: 0 !important; width: auto !important; min-height: 0 !important; padding: 0 !important; }
.page-label { display: none !important; }

/* 표지 — full-bleed 그라데이션 + 흰 제목, 내부 전부 투명(흰 띠 방지)
   주의: paged.js 는 page:cover 적용 후 data-page 를 "cover" 로 바꾸므로
        렌더 스타일은 paged 생성 클래스 .pagedjs_cover_page 로 타겟한다. */
.page[data-page="CoverPage"] { page: cover; }
.pagedjs_page.pagedjs_cover_page { background: linear-gradient(160deg,#0D1B3D,#1E3A8A) !important; }
.pagedjs_cover_page * { background: transparent !important; text-align: center !important; }
.pagedjs_cover_page .pagedjs_area { display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 0 24mm; }
.pagedjs_cover_page { color: #fff; }
.pagedjs_cover_page .ty-title { color: #fff !important; font-size: 42px; line-height: 1.25; }
.pagedjs_cover_page .ty-emphasis, .pagedjs_cover_page .ty-caption { color: rgba(255,255,255,.85) !important; }
.pagedjs_cover_page .subtitle-accent { background: #F59E0B !important; margin-left: auto; margin-right: auto; }
/* 표지 이미지가 있으면: A4 전면 full-bleed 이미지(그라데이션/패딩 무시) */
.pagedjs_cover_page:has(.cover-image) { background: #fff !important; }
.pagedjs_cover_page:has(.cover-image) .pagedjs_area { padding: 0 !important; display: block !important; }
.pagedjs_cover_page .cover-image { display: block !important; width: 210mm !important; height: 297mm !important; object-fit: cover !important; margin: 0 !important; }
/* 본문 이미지(실해석 figure): 한 면 안에 들어오도록 높이 제한 + 절단 금지 */
.fig { break-inside: avoid; text-align: center; margin: 8px 0; }
.fig-img { display: block; max-width: 100%; max-height: 120mm; width: auto; margin: 0 auto; border-radius: 8px; }
.fig-cap { font-size: 10px; color: #6B7280; margin-top: 4px; }

/* 앞부속 1흐름: 표지만 새 면, 판권/목차/저자소개/면책은 연속 / 챕터에서만 새 면 */
.page[data-page="CoverPage"] { break-after: page; }
.page[data-page="ChapterPage"] { break-before: page; break-after: avoid; padding-top: 1mm; padding-bottom: 2mm; }
.page[data-page="CopyrightPage"], .page[data-page="TableOfContentsPage"], .page[data-page="ContentPage"] { break-before: avoid; break-after: auto; }

/* 판권 compact imprint */
[data-type="CopyrightNotice"], [data-type="CopyrightNotice"] * { font-size: 10.5px !important; color: #6B7280 !important; line-height: 1.5 !important; margin: 0 !important; }

/* 러닝헤드 소스 = 챕터 제목 */
.ty-chapter { string-set: rhead content(text); }

/* 목차 페이지 번호 (target-counter + leader) */
.toc a.toc-link { text-decoration: none; color: inherit; display: flex; align-items: baseline; }
.toc a.toc-link .toc-leader { flex: 1; border-bottom: 1px dotted #cbd5e1; margin: 0 8px; transform: translateY(-3px); }
.toc a.toc-link::after { content: target-counter(attr(href), page); color: #2563EB; font-weight: 700; }

/* 절단 정책 — 단일 카드/항목은 통째 유지(avoid), 다항목 컨테이너는 항목 사이 분할 허용(auto).
   (코비 3차: 큰 컨테이너는 자연 분할하되 내부 카드/항목은 절대 절단 금지) */
.feat,.al,.file-card,.empty,.skel,.modal-card,.drawer-card,.tip-box,.pop-box,
.before-after,.before-after>div,.faq-item,.quote,blockquote,.chart,.donut-wrap,.slot-frame,.rating,
.stat,.tl-item,.tlc .it,.proc-p,.pg-row,.stp .s,.checklist li,.steps li,tr,
[data-type="ChapterHeading"],[data-type="ResultCard"],[data-type="WarningCard"],
[data-type="CalloutCard"],[data-type="FeatureCard"],[data-type="AlertCard"] { break-inside: avoid; }
.stats,.timeline,.tlc,.pg,.pgn,.stp,.proc,.steps,.checklist,.tree,.tag-group,.chip-group,
table,.tbl,.toc,
[data-type="TableCard"],[data-type="CompareCard"],[data-type="StatsCard"],
[data-type="TimelineCard"],[data-type="TimelineCardList"],[data-type="ProgressCard"],[data-type="StepperCard"] { break-inside: auto; }
p, li { orphans: 3; widows: 3; }
.ty-chapter,.ty-title,.card-label,.chart-title,.feat-t,.proc-t,[data-type="ChapterHeading"] { break-after: avoid; }

/* v6 밀도 */
.card { margin: 12px 0; padding: 18px 20px; }
.stats,.timeline,.tlc,.pg,.pgn,.stp,.proc,.before-after,.checklist,.steps,.tree,.tag-group,.chip-group { margin: 13px 0; }
.ty-body { margin-bottom: 9px; }
.ty-chapter { margin-bottom: 9px; }
.quote { margin: 13px 0; padding: 14px 18px; }
.slot-frame { min-height: 84px; padding: 14px; }
</style>`;

interface Sec {
  type: string;
  inner: string; // .page-body 내부 HTML
}

/** 페이지 섹션 분해(타입 + page-body 내부). */
function parseSections(main: string): Sec[] {
  const secs: Sec[] = [];
  const re = /<section class="page"([^>]*)>([\s\S]*?)<\/section>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(main)) !== null) {
    const type = (m[1].match(/data-page="([^"]+)"/) || [, ''])[1] as string;
    const bodyM = m[2].match(/<div class="page-body[^>]*>([\s\S]*)<\/div>/);
    secs.push({ type, inner: bodyM ? bodyM[1] : m[2] });
  }
  return secs;
}

const wrap = (type: string, id: string, inner: string): string =>
  `<section class="page" data-page="${type}"${id ? ` id="${id}"` : ''}>\n<div class="page-body grid-stack">\n${inner}\n</div>\n</section>`;

/**
 * paged.js 용 재구성(컴포넌트/AST 미변경 — HTML 문자열만):
 *   표지=단독 / 앞부속(판권·목차·저자소개·면책)=1섹션 병합 / 챕터=제목+본문 1섹션 병합.
 *   → 제목 단독 면·앞부속 분리(빈 면) 제거, v6 밀도 복원.
 * 동시에 챕터 id 부여 + 목차 항목 링크화(target-counter 목차 쪽번호).
 */
function restructureForPaged(html: string): string {
  const headEnd = html.indexOf('<main');
  const head = html.slice(0, headEnd);
  const mainStart = html.indexOf('>', headEnd) + 1;
  const mainEnd = html.indexOf('</main>');
  const main = html.slice(mainStart, mainEnd);
  const tail = html.slice(mainEnd); // </main></body></html>

  const secs = parseSections(main);
  const out: string[] = [];
  let chapter = 0;
  let frontInner: string[] = [];
  let curChapterInner: string[] = [];

  const flushFront = (): void => {
    if (frontInner.length) {
      out.push(wrap('TableOfContentsPage', '', frontInner.join('\n')));
      frontInner = [];
    }
  };
  const flushChapter = (): void => {
    if (curChapterInner.length) {
      out.push(wrap('ChapterPage', `ch${chapter}`, curChapterInner.join('\n')));
      curChapterInner = [];
    }
  };

  for (const s of secs) {
    if (s.type === 'CoverPage') {
      out.push(wrap('CoverPage', '', s.inner));
    } else if (s.type === 'ChapterPage') {
      flushFront();
      flushChapter();
      chapter += 1;
      curChapterInner.push(s.inner);
    } else if (chapter === 0) {
      // 챕터 이전 = 앞부속(판권/목차/저자소개/면책) → 병합
      frontInner.push(s.inner);
    } else {
      // 챕터 본문(ContentPage) → 현재 챕터에 합침
      curChapterInner.push(s.inner);
    }
  }
  flushFront();
  flushChapter();

  // 목차 li 를 순서대로 ch{i} 링크화(챕터 수만큼)
  let i = 0;
  let merged = `${head}<main class="book">\n${out.join('\n')}\n${tail}`;
  merged = merged.replace(/<li>([\s\S]*?)<\/li>/g, (full, inner) => {
    if (i >= chapter) return full;
    i += 1;
    return `<li><a class="toc-link" href="#ch${i}"><span class="toc-body">${inner}</span><span class="toc-leader"></span></a></li>`;
  });
  return merged;
}

function main(): void {
  if (!existsSync(SRC_HTML)) {
    console.error(`✗ ${SRC_HTML} 없음. 먼저 'npm run build' 로 생성하세요.`);
    process.exitCode = 1;
    return;
  }
  const browser = findBrowser();
  if (!browser) {
    console.error(browserNotFoundMessage());
    process.exitCode = 1;
    return;
  }
  mkdirSync('tmp', { recursive: true });

  let html = readFileSync(SRC_HTML, 'utf8');
  html = restructureForPaged(html);
  html = html.replace('</head>', `${PAGED_CSS}\n</head>`);
  writeFileSync(INPUT_HTML, html);

  console.log('📄 book-paged.pdf 생성 (pagedjs-cli)…');
  execSync(`npx pagedjs-cli "${INPUT_HTML}" -o "${OUT_PDF}"`, {
    stdio: 'inherit',
    env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: browser },
  });
  console.log(`✓ ${OUT_PDF} 생성 완료 (book.pdf=v6 는 불변).`);
}

main();
