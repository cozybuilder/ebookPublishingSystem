/**
 * Ebook Publishing System — Component Design System 04/04 검수 데모 갤러리 (엔진 밖)
 *
 * 첨부 04/04 이미지의 37~49번 컴포넌트를 샘플 데이터로 시각 구현(검수 전용).
 * 01·02·03/04 와 동일 테마: Primary #2563EB · Success #16A34A · Warning #F59E0B · Danger #EF4444 · Info #3B82F6
 *                          Border #E5E7EB · radius 8 · shadow 0 2px 8px rgba(0,0,0,.06) · Pretendard/Noto · flat.
 *
 * 주의: erasable syntax only. 외부 의존성 0(순수 HTML/CSS/SVG).
 */

const CSS = `
@page { size: 430mm 320mm; margin: 16mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #F3F4F6; color: #111827; font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.wrap { background: #fff; border-radius: 12px; overflow: hidden; }
.top { background: #0F172A; color: #fff; padding: 22px 28px; display: flex; align-items: center; gap: 16px; }
.top h1 { font-size: 22px; font-weight: 700; }
.top .pill { background: rgba(255,255,255,.12); padding: 6px 12px; border-radius: 999px; font-size: 13px; }
.top .note { margin-left: auto; font-size: 12px; color: #cbd5e1; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 24px; align-items: start; }
.cell > h2 { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
.cell > h2 b { color: #2563EB; }
.cell.span2 { grid-column: span 2; }
.card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 16px; }
.btn { font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 8px; border: 1px solid transparent; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary { background: #2563EB; color: #fff; }
.btn-secondary { background: #F3F4F6; color: #374151; border-color: #E5E7EB; }
.btn-outline { background: #fff; color: #2563EB; border-color: #2563EB; }
.fld { height: 40px; border: 1px solid #E5E7EB; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 12px; color: #6B7280; }
.muted { color: #6B7280; }

/* 37 Tooltip */
.tip-bubble { background: #1F2937; color: #fff; font-size: 12px; padding: 8px 12px; border-radius: 8px; display: inline-block; position: relative; margin-bottom: 18px; }
.tip-bubble::after { content: ""; position: absolute; left: 24px; bottom: -6px; border: 6px solid transparent; border-top-color: #1F2937; border-bottom: 0; }

/* 38 Popover */
.pop { margin-top: 10px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.pop .h { font-weight: 700; font-size: 13px; display: flex; justify-content: space-between; }
.pop .d { color: #6B7280; font-size: 12px; margin-top: 6px; line-height: 1.6; }

/* 39 Modal */
.modal { border: 1px solid #E5E7EB; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px; }
.modal .h { display: flex; align-items: center; gap: 10px; }
.modal .ic { width: 34px; height: 34px; border-radius: 999px; background: #3B82F6; color: #fff; display: flex; align-items: center; justify-content: center; }
.modal .x { margin-left: auto; color: #9CA3AF; }
.modal .t { font-weight: 700; font-size: 15px; }
.modal .d { color: #6B7280; font-size: 13px; margin: 12px 0 16px; line-height: 1.6; }
.modal .actions { display: flex; justify-content: flex-end; gap: 8px; }

/* 40 Drawer */
.drawer { display: flex; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; min-height: 200px; }
.drawer .bd { flex: 1; background: #9CA3AF; }
.drawer .panel { width: 62%; background: #fff; padding: 16px; border-left: 1px solid #E5E7EB; }
.drawer .ph { display: flex; justify-content: space-between; align-items: center; font-weight: 700; font-size: 14px; margin-bottom: 14px; }
.drawer label { font-size: 12px; color: #374151; display: block; margin: 0 0 6px; }
.drawer .grp { margin-bottom: 14px; }

/* 41 Progress Stepper */
.pstep { display: flex; align-items: center; justify-content: space-between; }
.pstep .s { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.pstep .n { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.pstep .s.done .n { background: #DBEAFE; color: #2563EB; }
.pstep .s.cur .n { background: #2563EB; color: #fff; }
.pstep .l { font-size: 11px; color: #6B7280; } .pstep .s.cur .l { color: #2563EB; font-weight: 700; }
.pstep .line { flex: 1; height: 2px; background: #DBEAFE; margin: 0 4px 18px; }
.pstep-msg { margin-top: 14px; background: #EFF5FF; border: 1px solid #DBE7FB; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #2563EB; }

/* 42 Timeline Card */
.tlc { position: relative; padding-left: 22px; }
.tlc::before { content: ""; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 2px; background: #DBE7FB; }
.tlc .it { position: relative; margin-bottom: 10px; }
.tlc .it::before { content: ""; position: absolute; left: -22px; top: 14px; width: 11px; height: 11px; border-radius: 50%; background: #2563EB; border: 2px solid #fff; box-shadow: 0 0 0 1px #2563EB; }
.tlc .ca { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; display: flex; gap: 10px; }
.tlc .ic { width: 30px; height: 30px; border-radius: 8px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex: none; }
.tlc .dt { font-size: 11px; color: #9CA3AF; }
.tlc .t { font-weight: 700; font-size: 13px; }
.tlc .d { color: #6B7280; font-size: 11px; }

/* 43 Tree */
.tree { font-size: 13px; }
.tree .row { display: flex; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 6px; }
.tree .row.on { background: #EFF5FF; color: #2563EB; font-weight: 600; }
.tree .ind1 { padding-left: 22px; } .tree .ind2 { padding-left: 40px; }
.tree .chev { color: #9CA3AF; width: 12px; }

/* 44 Code Block */
.code { border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
.code .hd { background: #F3F4F6; padding: 8px 12px; display: flex; justify-content: space-between; font-size: 12px; color: #6B7280; }
.code .hd .cp { color: #2563EB; font-weight: 600; }
.code pre { background: #F8FAFC; margin: 0; padding: 12px 14px; font-family: "SF Mono", Consolas, monospace; font-size: 12px; line-height: 1.6; color: #334155; }
.code .kw { color: #7C3AED; } .code .st { color: #16A34A; } .code .fn { color: #2563EB; }

/* 45 File Uploader */
.drop { border: 2px dashed #BFDBFE; border-radius: 8px; background: #F7FAFF; text-align: center; padding: 22px; color: #6B7280; font-size: 12px; }
.drop .ic { font-size: 24px; color: #2563EB; }
.filerow { display: flex; align-items: center; gap: 10px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; margin-top: 12px; font-size: 12px; }
.filerow .bar { flex: 1; height: 6px; background: #E5E7EB; border-radius: 999px; overflow: hidden; }
.filerow .bar > i { display: block; height: 100%; width: 100%; background: #16A34A; }
.filerow .ok { color: #16A34A; }

/* 46 Search Bar */
.search { display: flex; align-items: center; gap: 8px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; font-size: 13px; color: #9CA3AF; }
.rec { display: flex; justify-content: space-between; font-size: 12px; color: #6B7280; margin: 14px 0 8px; }
.rec .clr { color: #2563EB; }
.rtags { display: flex; flex-wrap: wrap; gap: 8px; }
.rtag { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 8px; padding: 5px 10px; color: #374151; }

/* 47 Empty State */
.empty { text-align: center; padding: 14px; }
.empty .ic { width: 56px; height: 56px; border-radius: 12px; background: #F3F4F6; color: #9CA3AF; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 12px; }
.empty .t { font-weight: 700; font-size: 15px; }
.empty .d { color: #6B7280; font-size: 12px; margin: 6px 0 14px; }

/* 48 Skeleton */
.sk { display: flex; flex-direction: column; gap: 12px; }
.sk .line { height: 12px; border-radius: 6px; background: #E5E7EB; }
.sk .av { width: 44px; height: 44px; border-radius: 50%; background: #E5E7EB; }
.sk .row { display: flex; gap: 12px; align-items: center; }
.sk .blocks { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.sk .blk { height: 52px; border-radius: 8px; background: #E5E7EB; }

/* 49 Chart */
.charts { display: flex; gap: 18px; align-items: center; }
.chart-legend { display: flex; gap: 14px; font-size: 11px; color: #6B7280; margin-bottom: 6px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.donut-legend { font-size: 11px; color: #374151; display: flex; flex-direction: column; gap: 6px; }
`;

function cell(n: string, title: string, body: string, span?: boolean): string {
  return `<div class="cell${span ? ' span2' : ''}"><h2><b>${n}.</b> ${title}</h2>${body}</div>`;
}

function lineChart(): string {
  // 2 lines over 6 months, y 0..150
  const mx = [20, 64, 108, 152, 196, 240];
  const sales = [55, 70, 95, 88, 110, 125];
  const profit = [25, 35, 40, 50, 60, 70];
  const y = (v: number) => 150 - (v / 150) * 130 + 6;
  const pts = (arr: number[]) => arr.map((v, i) => `${mx[i]},${y(v).toFixed(1)}`).join(' ');
  const dots = (arr: number[], c: string) => arr.map((v, i) => `<circle cx="${mx[i]}" cy="${y(v).toFixed(1)}" r="3" fill="${c}"/>`).join('');
  return `<svg viewBox="0 0 260 175" width="100%" height="150">
    ${[0, 50, 100, 150].map((g) => `<line x1="18" x2="252" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}" stroke="#EEF1F6"/><text x="0" y="${(y(g) + 3).toFixed(1)}" font-size="8" fill="#9CA3AF">${g}</text>`).join('')}
    <polyline points="${pts(sales)}" fill="none" stroke="#2563EB" stroke-width="2"/>
    <polyline points="${pts(profit)}" fill="none" stroke="#16A34A" stroke-width="2"/>
    ${dots(sales, '#2563EB')}${dots(profit, '#16A34A')}
    ${['1월', '2월', '3월', '4월', '5월', '6월'].map((m, i) => `<text x="${mx[i]}" y="170" font-size="8" fill="#9CA3AF" text-anchor="middle">${m}</text>`).join('')}
  </svg>`;
}

function donut(): string {
  const C = 251.33;
  const seg = (pct: number, color: string, offset: number) =>
    `<circle cx="60" cy="60" r="40" fill="none" stroke="${color}" stroke-width="18" stroke-dasharray="${((pct / 100) * C).toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}" transform="rotate(-90 60 60)"/>`;
  let off = 0;
  const parts = [
    { p: 45, c: '#2563EB' },
    { p: 30, c: '#16A34A' },
    { p: 15, c: '#F59E0B' },
    { p: 10, c: '#9CA3AF' },
  ];
  const circles = parts
    .map((s) => {
      const c = seg(s.p, s.c, -off);
      off += (s.p / 100) * C;
      return c;
    })
    .join('');
  return `<svg viewBox="0 0 120 120" width="120" height="120">${circles}
    <text x="60" y="56" font-size="8" fill="#9CA3AF" text-anchor="middle">총 매출</text>
    <text x="60" y="70" font-size="10" font-weight="700" fill="#111827" text-anchor="middle">12,458,000원</text>
  </svg>`;
}

export function renderGallery04Html(): string {
  const tooltip = `<div class="card"><div style="text-align:center"><span class="muted" style="font-size:18px">ⓘ</span> <span class="tip-bubble">도움말 내용이 여기에 표시됩니다.</span><div><span class="btn btn-outline">호버하세요</span></div></div></div>`;

  const popover = `<div class="card"><span class="fld" style="width:130px">자세히 보기 ▾</span>
    <div class="pop"><div class="h">상세 정보 <span class="muted">✕</span></div><div class="d">이곳에 추가 설명이나 상세 정보를 표시합니다.</div></div></div>`;

  const modal = `<div class="card" style="padding:0;border:0;box-shadow:none"><div class="modal"><div class="h"><span class="ic">i</span><span class="t">알림</span><span class="x">✕</span></div><div class="d">작업이 성공적으로 완료되었습니다. 계속 진행하시겠습니까?</div><div class="actions"><span class="btn btn-secondary">취소</span><span class="btn btn-primary">확인</span></div></div></div>`;

  const drawer = `<div class="card" style="padding:0;border:0;box-shadow:none"><div class="drawer"><div class="bd"></div><div class="panel"><div class="ph">필터 <span class="muted">✕</span></div>
    <div class="grp"><label>카테고리</label><div class="fld">전체 <span>▾</span></div></div>
    <div class="grp"><label>정렬</label><div class="fld">최신순 <span>▾</span></div></div>
    <span class="btn btn-primary" style="width:100%;justify-content:center">적용하기</span></div></div></div>`;

  const pstep = `<div class="card"><div class="pstep">
    <div class="s done"><div class="n">✓</div><div class="l">주문 접수</div></div><div class="line"></div>
    <div class="s done"><div class="n">✓</div><div class="l">결제 완료</div></div><div class="line"></div>
    <div class="s done"><div class="n">✓</div><div class="l">배송 준비</div></div><div class="line"></div>
    <div class="s cur"><div class="n">4</div><div class="l">배송 완료</div></div>
  </div><div class="pstep-msg">🚚 배송이 완료되었습니다.</div></div>`;

  const timeline = `<div class="card"><div class="tlc">
    <div class="it"><div class="ca"><span class="ic">✉</span><div><div class="dt">2024-05-01 09:00</div><div class="t">주문 접수</div><div class="d">고객 주문이 접수되었습니다.</div></div></div></div>
    <div class="it"><div class="ca"><span class="ic" style="background:#F0FDF4;color:#16A34A">✓</span><div><div class="dt">2024-05-01 14:30</div><div class="t">결제 완료</div><div class="d">결제가 완료되었습니다.</div></div></div></div>
    <div class="it"><div class="ca"><span class="ic">🚚</span><div><div class="dt">2024-05-02 10:15</div><div class="t">배송 시작</div><div class="d">상품 배송이 시작되었습니다.</div></div></div></div>
  </div></div>`;

  const tree = `<div class="card"><div class="tree">
    <div class="row"><span class="chev">⌄</span>📁 프로젝트</div>
    <div class="row ind1"><span class="chev">⌄</span>📁 UI 디자인 시스템</div>
    <div class="row ind2 on">📁 컴포넌트</div>
    <div class="row ind2"><span class="chev">›</span>📁 가이드</div>
    <div class="row"><span class="chev">›</span>📁 문서</div>
    <div class="row"><span class="chev">›</span>📁 리소스</div>
  </div></div>`;

  const code = `<div class="card" style="padding:0;border:0;box-shadow:none"><div class="code"><div class="hd"><span>JavaScript</span><span class="cp">복사</span></div><pre><span class="kw">function</span> <span class="fn">greet</span>(name) {
  <span class="kw">const</span> message = <span class="st">\`Hello, \${name}!\`</span>;
  <span class="kw">return</span> message;
}

<span class="fn">greet</span>(<span class="st">'사용자'</span>);</pre></div></div>`;

  const uploader = `<div class="card"><div class="drop"><div class="ic">⬆</div><div style="margin-top:6px">파일을 드래그하거나 클릭하여 업로드하세요</div><div style="font-size:11px;margin-top:2px">PNG, JPG, PDF (최대 10MB)</div></div>
    <div class="filerow"><span>📄</span><div style="flex:none"><div style="font-weight:600">design-system.pdf</div><div class="muted" style="font-size:11px">2.4 MB</div></div><div class="bar"><i></i></div><span>100%</span><span class="ok">✓</span></div></div>`;

  const search = `<div class="card"><div class="search">🔍 검색어를 입력하세요...</div>
    <div class="rec"><span>최근 검색</span><span class="clr">모두 지우기</span></div>
    <div class="rtags"><span class="rtag">디자인 시스템 ✕</span><span class="rtag">컴포넌트 ✕</span><span class="rtag">가이드라인 ✕</span></div></div>`;

  const empty = `<div class="card"><div class="empty"><div class="ic">🗀</div><div class="t">데이터가 없습니다.</div><div class="d">아직 등록된 항목이 없습니다.</div><span class="btn btn-outline">새로 만들기</span></div></div>`;

  const skeleton = `<div class="card"><div class="sk">
    <div class="row"><div class="av"></div><div style="flex:1"><div class="line" style="width:60%"></div><div class="line" style="width:40%;margin-top:8px"></div></div></div>
    <div class="line"></div><div class="line" style="width:85%"></div>
    <div class="blocks"><div class="blk"></div><div class="blk"></div><div class="blk"></div></div>
  </div></div>`;

  const chart = `<div class="card"><div class="charts">
    <div style="flex:1"><div class="chart-legend"><span><span class="dot" style="background:#2563EB"></span>매출</span><span><span class="dot" style="background:#16A34A"></span>이익</span></div>${lineChart()}</div>
    <div style="display:flex;gap:12px;align-items:center">${donut()}<div class="donut-legend">
      <span><span class="dot" style="background:#2563EB"></span>제품 A 45%</span>
      <span><span class="dot" style="background:#16A34A"></span>제품 B 30%</span>
      <span><span class="dot" style="background:#F59E0B"></span>제품 C 15%</span>
      <span><span class="dot" style="background:#9CA3AF"></span>기타 10%</span>
    </div></div>
  </div></div>`;

  const cells = [
    cell('37', 'Tooltip', tooltip),
    cell('38', 'Popover', popover),
    cell('39', 'Modal', modal),
    cell('40', 'Drawer', drawer),
    cell('41', 'Progress Stepper', pstep),
    cell('42', 'Timeline Card', timeline),
    cell('43', 'Tree', tree),
    cell('44', 'Code Block', code),
    cell('45', 'File Uploader', uploader),
    cell('46', 'Search Bar', search),
    cell('47', 'Empty State', empty),
    cell('48', 'Skeleton', skeleton),
    cell('49', 'Chart', chart, true),
  ].join('');

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Component Design System 04/04</title><style>${CSS}</style></head><body>
  <div class="wrap">
    <div class="top"><h1>UI 컴포넌트 디자인 시스템</h1><span class="pill">04 / 04 · 37~49번</span><span class="note">검수용 데모 — 샘플 데이터</span></div>
    <div class="grid">${cells}</div>
  </div>
  </body></html>`;
}
