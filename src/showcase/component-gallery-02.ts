/**
 * Ebook Publishing System — Component Design System 02/04 검수 데모 갤러리 (엔진 밖)
 *
 * 첨부 02/04 이미지의 13~24번 컴포넌트를 샘플 데이터로 시각 구현(검수 전용).
 * 01/04 와 동일 테마: Primary #2563EB · Success #16A34A · Warning #F59E0B · Danger #EF4444 · Info #3B82F6
 *                    Border #E5E7EB · radius 8 · shadow 0 2px 8px rgba(0,0,0,.06) · Pretendard/Noto · flat.
 *
 * 주의: erasable syntax only. 외부 의존성 0(순수 HTML/CSS).
 */

const CSS = `
@page { size: 430mm 300mm; margin: 16mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #F3F4F6; color: #111827; font-family: Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.wrap { background: #fff; border-radius: 12px; overflow: hidden; }
.top { background: #0F172A; color: #fff; padding: 22px 28px; display: flex; align-items: center; gap: 16px; }
.top h1 { font-size: 22px; font-weight: 700; }
.top .pill { background: rgba(255,255,255,.12); padding: 6px 12px; border-radius: 999px; font-size: 13px; }
.top .note { margin-left: auto; font-size: 12px; color: #cbd5e1; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 24px; }
.cell > h2 { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
.cell > h2 b { color: #2563EB; }
.card { background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 18px; }
.muted { color: #6B7280; }
.fz13 { font-size: 13px; } .fz12 { font-size: 12px; }

/* 13 Before/After */
.ba { display: flex; align-items: center; gap: 10px; }
.ba .box { flex: 1; border-radius: 8px; padding: 12px; font-size: 12px; color: #6B7280; }
.ba .before { background: #F3F4F6; border: 1px solid #E5E7EB; }
.ba .after { background: #EFF5FF; border: 1px solid #DBE7FB; }
.ba .tag { font-size: 11px; font-weight: 700; color: #fff; padding: 3px 10px; border-radius: 6px; display: inline-block; margin-bottom: 8px; }
.ba .before .tag { background: #6B7280; } .ba .after .tag { background: #2563EB; }
.ba .ph { height: 38px; background: #fff; border: 1px solid #E5E7EB; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9CA3AF; margin-bottom: 8px; }
.ba .arr { color: #2563EB; font-size: 18px; }

/* 14 Timeline */
.tl { position: relative; padding-left: 22px; }
.tl::before { content: ""; position: absolute; left: 5px; top: 4px; bottom: 4px; width: 2px; background: #DBE7FB; }
.tl .it { position: relative; padding: 0 0 16px; }
.tl .it:last-child { padding-bottom: 0; }
.tl .it::before { content: ""; position: absolute; left: -22px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 2px solid #2563EB; }
.tl .d { font-weight: 700; font-size: 13px; }
.tl .t { color: #6B7280; font-size: 12px; }

/* 15 Stepper */
.stp { display: flex; align-items: center; justify-content: space-between; }
.stp .s { display: flex; flex-direction: column; align-items: center; gap: 6px; flex: none; }
.stp .n { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #D1D5DB; color: #9CA3AF; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
.stp .s.on .n { background: #2563EB; border-color: #2563EB; color: #fff; }
.stp .l { font-size: 11px; color: #6B7280; } .stp .s.on .l { color: #111827; font-weight: 700; }
.stp .line { flex: 1; height: 2px; background: #E5E7EB; margin: 0 4px 18px; }
.stp-desc { margin-top: 14px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
.stp-desc .t { font-weight: 700; font-size: 13px; } .stp-desc .d { color: #6B7280; font-size: 12px; margin-top: 2px; }

/* 16 Process */
.proc { display: flex; align-items: stretch; gap: 8px; }
.proc .p { flex: 1; min-height: 128px; border: 1px solid #E5E7EB; border-radius: 8px; padding: 18px 10px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.proc .p.on { background: #EFF5FF; border-color: #BFDBFE; }
.proc .ic { width: 48px; height: 48px; border-radius: 12px; background: #EFF6FF; color: #2563EB; display: inline-flex; align-items: center; justify-content: center; font-size: 22px; margin-bottom: 12px; }
.proc .t { font-weight: 700; font-size: 13px; } .proc .d { color: #6B7280; font-size: 11px; margin-top: 4px; line-height: 1.4; }
.proc .arr { display: flex; align-items: center; color: #2563EB; font-weight: 800; font-size: 20px; }

/* 17 Feature */
.feat { display: flex; gap: 12px; align-items: flex-start; }
.feat .ic { width: 40px; height: 40px; border-radius: 999px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; font-size: 18px; flex: none; }
.feat .t { font-weight: 700; font-size: 14px; } .feat .d { color: #6B7280; font-size: 12px; margin: 4px 0 8px; }
.feat .ck { list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #374151; }
.feat .ck li::before { content: "✓ "; color: #2563EB; font-weight: 700; }

/* 18 Comparison */
.cmp { width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
.cmp th, .cmp td { padding: 9px 10px; text-align: center; border-bottom: 1px solid #E5E7EB; }
.cmp th:first-child, .cmp td:first-child { text-align: left; }
.cmp thead th { background: #F3F4F6; color: #374151; font-weight: 600; }
.cmp thead th.pro { background: #2563EB; color: #fff; }
.cmp td.pro { color: #2563EB; font-weight: 700; background: #F5F9FF; }
.cmp tr:last-child td { border-bottom: 0; }

/* 19 Metric */
.met { display: flex; gap: 10px; }
.met .m { flex: 1; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; text-align: center; }
.met .ic { color: #2563EB; font-size: 18px; }
.met .n { font-size: 22px; font-weight: 800; margin: 4px 0 2px; }
.met .l { color: #6B7280; font-size: 11px; }

/* 20 Progress */
.pr .row { margin-bottom: 12px; }
.pr .top2 { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
.pr .bar { height: 8px; background: #E5E7EB; border-radius: 999px; overflow: hidden; }
.pr .bar > i { display: block; height: 100%; background: #2563EB; border-radius: 999px; }
.pr .ok { color: #16A34A; font-weight: 700; }

/* 21 Tabs */
.tabs { display: flex; gap: 18px; border-bottom: 1px solid #E5E7EB; }
.tabs .tab { padding: 8px 2px; font-size: 13px; color: #6B7280; }
.tabs .tab.on { color: #2563EB; font-weight: 700; border-bottom: 2px solid #2563EB; }
.tab-body { padding: 14px 2px; color: #6B7280; font-size: 13px; }

/* 22 Accordion */
.acc .it { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; }
.acc .q { font-weight: 600; font-size: 13px; display: flex; justify-content: space-between; }
.acc .q .c { color: #6B7280; } .acc .a { color: #6B7280; font-size: 12px; margin-top: 8px; line-height: 1.6; }

/* 23 Alert */
.al { display: flex; align-items: center; gap: 10px; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; font-size: 12px; border: 1px solid; }
.al .ic { width: 20px; height: 20px; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; flex: none; }
.al b { font-weight: 700; } .al .x { margin-left: auto; color: #9CA3AF; }
.al.success { background: #F0FDF4; border-color: #BBF7D0; } .al.success .ic { background: #16A34A; }
.al.info { background: #EFF6FF; border-color: #BFDBFE; } .al.info .ic { background: #3B82F6; }
.al.warning { background: #FFFBEB; border-color: #FDE68A; } .al.warning .ic { background: #F59E0B; }
.al.danger { background: #FEF2F2; border-color: #FECACA; } .al.danger .ic { background: #EF4444; }

/* 24 Pagination */
.pg { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.pg .b { min-width: 34px; height: 34px; border: 1px solid #E5E7EB; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; color: #374151; padding: 0 10px; }
.pg .b.on { background: #2563EB; border-color: #2563EB; color: #fff; font-weight: 700; }
.pg-meta { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; font-size: 12px; color: #6B7280; }
.pg-sel { border: 1px solid #E5E7EB; border-radius: 8px; padding: 6px 10px; }
`;

function cell(n: string, title: string, body: string): string {
  return `<div class="cell"><h2><b>${n}.</b> ${title}</h2>${body}</div>`;
}

export function renderGallery02Html(): string {
  const ba = `<div class="card"><div class="ba">
    <div class="box before"><span class="tag">Before</span><div class="ph">▣</div>기존 방식은 복잡하고 비효율적이었습니다.</div>
    <span class="arr">→</span>
    <div class="box after"><span class="tag">After</span><div class="ph">▣</div>새로운 방식으로 간단하고 효율적으로 개선되었습니다.</div>
  </div></div>`;

  const timeline = `<div class="card"><div class="tl">
    <div class="it"><div class="d">2024.01</div><div class="t">프로젝트 기획 및 요구사항 정의</div></div>
    <div class="it"><div class="d">2024.02</div><div class="t">디자인 시스템 설계 및 검토</div></div>
    <div class="it"><div class="d">2024.03</div><div class="t">개발 및 구현</div></div>
    <div class="it"><div class="d">2024.04</div><div class="t">테스트 및 배포</div></div>
  </div></div>`;

  const stepper = `<div class="card"><div class="stp">
    <div class="s"><div class="n">1</div><div class="l">기획</div></div><div class="line"></div>
    <div class="s on"><div class="n">2</div><div class="l">설계</div></div><div class="line"></div>
    <div class="s"><div class="n">3</div><div class="l">개발</div></div><div class="line"></div>
    <div class="s"><div class="n">4</div><div class="l">완료</div></div>
  </div><div class="stp-desc"><div class="t">2단계: 설계</div><div class="d">디자인 시스템 설계 및 컴포넌트 정의 단계입니다.</div></div></div>`;

  const process = `<div class="card"><div class="proc">
    <div class="p"><div class="ic">🔍</div><div class="t">요구 분석</div><div class="d">요구사항을 분석합니다.</div></div>
    <div class="arr">›</div>
    <div class="p"><div class="ic">✎</div><div class="t">설계</div><div class="d">설계와 계획을 수립합니다.</div></div>
    <div class="arr">›</div>
    <div class="p on"><div class="ic">⚙</div><div class="t">개발</div><div class="d">개발 및 구현을 진행합니다.</div></div>
    <div class="arr">›</div>
    <div class="p"><div class="ic">🚀</div><div class="t">배포</div><div class="d">테스트 후 배포합니다.</div></div>
  </div></div>`;

  const feature = `<div class="card"><div class="feat">
    <div class="ic">🚀</div>
    <div><div class="t">빠른 성능</div><div class="d">최적화된 엔진으로 빠르고 안정적인 성능을 제공합니다.</div>
      <ul class="ck"><li>초고속 렌더링</li><li>메모리 최적화</li><li>안정성 보장</li></ul></div>
    <div style="margin-left:auto;color:#9CA3AF;">›</div>
  </div></div>`;

  const comparison = `<div class="card"><table class="cmp">
    <thead><tr><th>기능</th><th>Basic</th><th class="pro">Pro</th></tr></thead>
    <tbody>
      <tr><td>프로젝트 관리</td><td>○</td><td class="pro">✓</td></tr>
      <tr><td>자료 관리</td><td>○</td><td class="pro">✓</td></tr>
      <tr><td>커스텀 테마</td><td>✕</td><td class="pro">✓</td></tr>
      <tr><td>우선 지원</td><td>✕</td><td class="pro">✓</td></tr>
    </tbody></table></div>`;

  const metric = `<div class="card"><div class="met">
    <div class="m"><div class="ic">👥</div><div class="n">12,458</div><div class="l">총 사용자</div></div>
    <div class="m"><div class="ic">📈</div><div class="n">98.6%</div><div class="l">성공률</div></div>
    <div class="m"><div class="ic">⏱</div><div class="n">2.4s</div><div class="l">평균 처리 시간</div></div>
  </div></div>`;

  const progress = `<div class="card"><div class="pr">
    <div class="row"><div class="top2"><span>전체 진행률</span><b>78%</b></div><div class="bar"><i style="width:78%"></i></div></div>
    <div class="row"><div class="top2"><span>기획</span><span class="ok">완료 ✓</span></div><div class="bar"><i style="width:100%;background:#16A34A"></i></div></div>
    <div class="row"><div class="top2"><span>개발</span><span>78%</span></div><div class="bar"><i style="width:78%"></i></div></div>
    <div class="row"><div class="top2"><span>테스트</span><span>45%</span></div><div class="bar"><i style="width:45%"></i></div></div>
  </div></div>`;

  const tabs = `<div class="card"><div class="tabs">
    <div class="tab on">전체</div><div class="tab">진행 중</div><div class="tab">완료</div><div class="tab">보관</div>
  </div><div class="tab-body">탭 콘텐츠가 여기에 표시됩니다.</div></div>`;

  const accordion = `<div class="card"><div class="acc">
    <div class="it"><div class="q"><span>Q. 디자인 시스템이란 무엇인가요?</span><span class="c">⌃</span></div><div class="a">일관된 UI/UX를 위한 컴포넌트와 가이드의 모음입니다.</div></div>
    <div class="it"><div class="q"><span>Q. 어떻게 사용하나요?</span><span class="c">⌄</span></div></div>
    <div class="it"><div class="q"><span>Q. 커스터마이징이 가능한가요?</span><span class="c">⌄</span></div></div>
  </div></div>`;

  const alert = `<div class="card">
    <div class="al success"><span class="ic">✓</span><span><b>성공</b> 작업이 성공적으로 완료되었습니다.</span><span class="x">✕</span></div>
    <div class="al info"><span class="ic">i</span><span><b>정보</b> 새로운 업데이트가 있습니다.</span><span class="x">✕</span></div>
    <div class="al warning"><span class="ic">!</span><span><b>경고</b> 저장하지 않은 변경사항이 있습니다.</span><span class="x">✕</span></div>
    <div class="al danger"><span class="ic">✕</span><span><b>오류</b> 작업 중 문제가 발생했습니다.</span><span class="x">✕</span></div>
  </div>`;

  const pagination = `<div class="card"><div class="pg">
    <span class="b">‹</span><span class="b">1</span><span class="b on">2</span><span class="b">3</span><span class="b">4</span><span class="b">…</span><span class="b">10</span><span class="b">›</span>
  </div><div class="pg-meta"><span class="pg-sel">10개씩 보기 ▾</span><span>2 / 10 페이지</span></div></div>`;

  const cells = [
    cell('13', 'Before / After', ba),
    cell('14', 'Timeline', timeline),
    cell('15', 'Stepper', stepper),
    cell('16', 'Process', process),
    cell('17', 'Feature Card', feature),
    cell('18', 'Comparison Card', comparison),
    cell('19', 'Metric', metric),
    cell('20', 'Progress Bar', progress),
    cell('21', 'Tabs', tabs),
    cell('22', 'Accordion', accordion),
    cell('23', 'Alert', alert),
    cell('24', 'Pagination', pagination),
  ].join('');

  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>Component Design System 02/04</title><style>${CSS}</style></head><body>
  <div class="wrap">
    <div class="top"><h1>UI 컴포넌트 디자인 시스템</h1><span class="pill">02 / 04 · 13~24번</span><span class="note">검수용 데모 — 샘플 데이터</span></div>
    <div class="grid">${cells}</div>
  </div>
  </body></html>`;
}
