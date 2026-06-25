# Ebook 독립 배포 루트 (deploy/)

`ebook.cozybuilder.co.kr` 로 배포되는 **정적 앱 + 검증 API**. 엔진 소스(이 레포 루트)의
산출물 `engine.bundle.js` 를 포함한 "배포 래퍼"다. (Single Source of Truth = 이 레포)

## 구성
- `index.html` — Ebook Studio 셸 (루트 `studio.html` 복사 + launch gate 래핑)
- `engine.bundle.js` — 엔진 번들 (루트 빌드 산출물 복사/동기화)
- `gate.js` — 실행 게이트: 데스크톱 체크 → launch_token 검증 → 성공 시 studio 부팅
- `api/verify-launch.js` — 서버리스 토큰 검증 (HS256/exp/iat/app_key)
- `vercel.json` — cleanUrls + Node 함수 런타임

## 실행 경로 (직접 URL 접근 차단)
공식 진입은 홈페이지만:
`cozybuilder.co.kr/apps/ebook` → 권한 확인 → launch token 발급 →
`ebook.cozybuilder.co.kr/?launch_token=<token>` → `/api/verify-launch` 검증 → 실행.
토큰 없음/위조/만료 → 차단 화면("CozyBuilder 홈페이지에서 실행해주세요").

## Vercel 설정
- **Root Directory: `deploy`** (이 폴더만 배포 — 엔진 소스 전체 노출 방지)
- **Env (서버 전용): `LAUNCH_TOKEN_SECRET`** = 홈페이지와 **동일 값**. NEXT_PUBLIC 금지.
- engine.bundle.js 갱신 시 루트 빌드 후 이 폴더로 복사(동기화).

## 토큰 형식 (홈페이지 lib/launch-token.ts 와 호환)
HS256/HMAC-SHA256. payload: `{ sub, app_key:"ebook", iat, exp(iat+90s), jti }`.
검증: 서명 + `app_key==="ebook"` + `exp>=now` + `iat<=now+60`. jti 재사용 차단은 v2.
