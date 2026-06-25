/**
 * Ebook Publishing System — Component Design System 01/04 검수용 데모 갤러리 (엔진 밖)
 *
 * 첨부 01/04 이미지의 12개 컴포넌트를 "샘플 데이터"로 모두 시각 구현한 단일 데모 화면.
 * 전자책 출력(html-renderer) 로직과 분리 — 검수 전용. 실제 원고 매핑과 무관하게 전부 표시.
 *
 * 디자인: 플랫 대시보드. Primary #2563EB · Success #16A34A · Warning #F59E0B · Danger #EF4444
 *         Info #3B82F6 · Border #E5E7EB · Text #111827/#6B7280 · radius 8 · shadow 0 2px 8px rgba(0,0,0,.06)
 *
 * 주의: erasable syntax only. 외부 의존성 0(순수 HTML/CSS 문자열).
 */

const CSS = `
@page { size: 320mm 452mm; margin: 16mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #F3F4F6; color: #111827; font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.wrap { background: #fff; border-radius: 12px; overflow: hidden; }
.top { background: #0F172A; color: #fff; padding: 22px 28px; display: flex; align-items: center; gap: 16px; }
.top h1 { font-size: 22px; font-weight: 700; }
.top .pill { background: rgba(255,255,255,.12); padding: 6px 12px; border-radius: 999px; font-size: 13px; }
.top .note { margin-left: auto; font-size: 12px; color: #cbd5e1; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 24px; }
.cell { }
.cell > h2 { font-size: 16px; font-weight: 700; margin-bottom: 14px; }
.cell > h2 b { color: #2563EB; }

/* 카드 공통 */
.card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 20px; }

/* 01 Table */
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { background: #F3F4F6; color: #374151; font-weight: 600; padding: 10px 12px; text-align: left; border-bottom: 1px solid #E5E7EB; }
td { padding: 10px 12px; border-bottom: 1px solid #E5E7EB; color: #111827; }
tr:last-child td { border-bottom: 0; }
.tbl-wrap { border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }

/* 02 Checklist */
.cl { list-style: none; display: flex; flex-direction: column; gap: 12px; }
.cl li { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.cb { width: 20px; height: 20px; border-radius: 6px; border: 2px solid #D1D5DB; flex: none; }
.cb.on { background: #2563EB; border-color: #2563EB; position: relative; }
.cb.on::after { content: "✓"; position: absolute; inset: 0; color: #fff; font-size: 13px; display: flex; align-items: center; justify-content: center; }
.cl li.done span { text-decoration: line-through; color: #9CA3AF; }

/* 03 FAQ */
.faq { display: flex; flex-direction: column; gap: 10px; }
.faq .it { border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px; }
.faq .q { font-weight: 600; font-size: 14px; display: flex; justify-content: space-between; gap: 10px; }
.faq .q .chev { color: #6B7280; }
.faq .a { color: #6B7280; font-size: 13px; line-height: 1.6; margin-top: 10px; }

/* 04 Quote */
.quote { background: #EFF5FF; border: 1px solid #DBE7FB; border-left: 4px solid #2563EB; border-radius: 8px; padding: 18px 20px 16px 26px; position: relative; }
.quote::before { content: "\\201C"; position: absolute; left: 14px; top: 6px; font-family: Georgia, serif; font-size: 40px; color: #2563EB; line-height: 1; }
.quote p { font-size: 14px; color: #111827; padding-left: 14px; line-height: 1.6; }
.quote .src { text-align: right; color: #6B7280; font-size: 12px; margin-top: 10px; }

/* 05/06/07/08 아이콘 박스 공통 */
.ibox { display: flex; gap: 14px; align-items: flex-start; }
.ic { width: 40px; height: 40px; border-radius: 999px; flex: none; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 18px; }
.ibox .t { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.ibox .d { color: #6B7280; font-size: 13px; line-height: 1.6; }

/* 09 Divider */
.dv { margin: 18px 0; }
.dv.solid { border-top: 1px solid #E5E7EB; }
.dv.dashed { border-top: 1px dashed #CBD5E1; }
.dv.titled { display: flex; align-items: center; gap: 12px; color: #6B7280; font-size: 13px; }
.dv.titled::before, .dv.titled::after { content: ""; flex: 1; border-top: 1px solid #E5E7EB; }
.dv-label { color: #9CA3AF; font-size: 12px; margin-bottom: 4px; }

/* 10 Highlight */
.hl { font-size: 14px; line-height: 1.8; }
.hl mark { background: #FEF08A; color: #111827; padding: 1px 4px; border-radius: 3px; }

/* 11 Badge */
.badges { display: flex; flex-wrap: wrap; gap: 12px; }
.bg { font-size: 12px; font-weight: 600; padding: 7px 16px; border-radius: 7px; line-height: 1.2; display: inline-flex; align-items: center; }
.bg-primary { background: #2563EB; color: #fff; }
.bg-secondary { background: #F3F4F6; color: #374151; }
.bg-success { background: #16A34A; color: #fff; }
.bg-warning { background: #F59E0B; color: #fff; }
.bg-danger { background: #EF4444; color: #fff; }
.bg-soft-blue { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
.bg-soft-red { background: #FEF2F2; color: #EF4444; border: 1px solid #FECACA; }
.bg-soft-cyan { background: #ECFEFF; color: #0891B2; border: 1px solid #A5F3FC; }
.bg-dark { background: #374151; color: #fff; }
.bg-pin { background: #FEF9C3; color: #A16207; border: 1px solid #FDE68A; }

/* 12 Button */
.btn-row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.btn { font-size: 14px; font-weight: 600; padding: 12px 22px; border-radius: 8px; border: 1px solid transparent; cursor: default; line-height: 1.2; display: inline-flex; align-items: center; }
.btn-primary { background: #2563EB; color: #fff; }
.btn-secondary { background: #F3F4F6; color: #374151; }
.btn-outline { background: #fff; color: #2563EB; border-color: #2563EB; }
.btn-ghost { background: transparent; color: #2563EB; }
.btn-sm { padding: 9px 16px; font-size: 13px; }
.btn-lg { padding: 14px 28px; font-size: 16px; }
`;

function gridCell(n: string, title: string, body: string): string {
  return `<div class="cell"><h2><b>${n}.</b> ${title}</h2>${body}</div>`;
}

function iconBox(bg: string, icon: string, title: string, desc: string, cardStyle: string): string {
  return `<div class="card" style="${cardStyle}"><div class="ibox"><div class="ic" style="background:${bg}">${icon}</div><div><div class="t">${title}</div><div class="d">${desc}</div></div></div></div>`;
}

export function renderGalleryHtml(): string {
  const table = `<div class="card"><div class="tbl-wrap"><table>
    <thead><tr><th>이름</th><th>이메일</th><th>역할</th><th>상태</th></tr></thead>
    <tbody>
      <tr><td>김코비</td><td>kobi@example.com</td><td>PM</td><td><span class="bg bg-success">활성</span></td></tr>
      <tr><td>이클로</td><td>clo@example.com</td><td>Developer</td><td><span class="bg bg-success">활성</span></td></tr>
      <tr><td>박코지</td><td>cozy@example.com</td><td>CEO</td><td><span class="bg bg-warning">대기</span></td></tr>
    </tbody></table></div></div>`;

  const checklist = `<div class="card"><ul class="cl">
    <li class="done"><span class="cb on"></span><span>요구사항 분석</span></li>
    <li class="done"><span class="cb on"></span><span>UI 디자인 시안 제작</span></li>
    <li><span class="cb"></span><span>컴포넌트 구현</span></li>
    <li><span class="cb"></span><span>테스트 및 검수</span></li>
    <li><span class="cb"></span><span>배포</span></li>
  </ul></div>`;

  const faq = `<div class="card"><div class="faq">
    <div class="it"><div class="q"><span>Q. 이 시스템은 무엇인가요?</span><span class="chev">⌃</span></div><div class="a">49개 UI 컴포넌트를 일관된 디자인으로 제공하기 위한 디자인 시스템입니다.</div></div>
    <div class="it"><div class="q"><span>Q. 사용 방법은 어떻게 되나요?</span><span class="chev">⌄</span></div></div>
    <div class="it"><div class="q"><span>Q. 커스터마이징이 가능한가요?</span><span class="chev">⌄</span></div></div>
  </div></div>`;

  const quote = `<div class="quote"><p>디자인은 어떻게 보이고 느껴지는가가 아니라, 어떻게 동작하는가이다.</p><div class="src">– Steve Jobs</div></div>`;

  const info = iconBox('#3B82F6', 'i', '정보 안내', '이 카드는 중요한 정보를 사용자에게 전달할 때 사용됩니다.', '');
  const tip = iconBox('#16A34A', '💡', '팁', '사용자에게 유용한 팁이나 힌트를 제공할 때 사용합니다.', 'background:#F0FDF4; border-color:#BBF7D0;');
  const warn = iconBox('#F59E0B', '⚠', '경고', '주의가 필요한 작업이나 위험 요소를 안내할 때 사용합니다.', 'background:#FFFBEB; border-color:#FDE68A;');
  const note = iconBox('#7C3AED', '✎', '노트', '추가 설명이나 메모가 필요한 내용을 보여줄 때 사용합니다.', 'background:#F5F3FF; border-color:#DDD6FE;');

  const divider = `<div class="card">
    <div class="dv-label">기본 구분선</div><div class="dv solid"></div>
    <div class="dv-label">점선 구분선</div><div class="dv dashed"></div>
    <div class="dv-label">가운데 제목형</div><div class="dv titled">Section Title</div>
  </div>`;

  const highlight = `<div class="card"><div class="hl">이 문장은 <mark>중요한 내용</mark>을 강조하기 위한 하이라이트 스타일입니다.</div></div>`;

  const badge = `<div class="card"><div class="badges" style="margin-bottom:12px;">
    <span class="bg bg-primary">Primary</span><span class="bg bg-secondary">Secondary</span><span class="bg bg-success">Success</span><span class="bg bg-warning">Warning</span><span class="bg bg-danger">Danger</span>
  </div><div class="badges">
    <span class="bg bg-soft-blue">New</span><span class="bg bg-soft-red">Hot</span><span class="bg bg-soft-cyan">Beta</span><span class="bg bg-dark">Pro</span><span class="bg bg-pin">★ 인기</span>
  </div></div>`;

  const button = `<div class="card"><div class="btn-row" style="margin-bottom:14px;">
    <span class="btn btn-primary">Primary</span><span class="btn btn-secondary">Secondary</span><span class="btn btn-outline">Outline</span><span class="btn btn-ghost">Ghost</span>
  </div><div class="btn-row">
    <span class="btn btn-primary btn-sm">Small</span><span class="btn btn-primary">Medium</span><span class="btn btn-primary btn-lg">Large</span><span class="btn btn-outline">♡ Icon</span>
  </div></div>`;

  const cells = [
    gridCell('01', 'Table', table),
    gridCell('02', 'Checklist', checklist),
    gridCell('03', 'FAQ', faq),
    gridCell('04', 'Quote', `<div class="card" style="padding:0;border:0;box-shadow:none;background:transparent">${quote}</div>`),
    gridCell('05', 'Info Card', info),
    gridCell('06', 'Tip Box', tip),
    gridCell('07', 'Warning Box', warn),
    gridCell('08', 'Note Box', note),
    gridCell('09', 'Divider', divider),
    gridCell('10', 'Highlight', highlight),
    gridCell('11', 'Badge', badge),
    gridCell('12', 'Button', button),
  ].join('');

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Component Design System 01/04</title><style>${CSS}</style></head><body>
  <div class="wrap">
    <div class="top"><h1>UI 컴포넌트 디자인 시스템</h1><span class="pill">01 / 04 · 12개 컴포넌트</span><span class="note">검수용 데모 — 샘플 데이터</span></div>
    <div class="grid">${cells}</div>
  </div>
  </body></html>`;
}
