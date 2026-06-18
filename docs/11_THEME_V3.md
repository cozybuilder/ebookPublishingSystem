# Ebook Publishing System — Theme v3 설계

이 문서는 Theme **체계 재설계(v3)** 를 정의한다.
Theme Engine 구조(base + override 합성, recipe, registry, profile 매핑)는 그대로 유지하고,
**Theme 콘텐츠(테마 종류와 디자인 방향)만 전면 교체**한다.

> 배경: 기존 CozyBuilder Lab / Minimal(v2) 조합은 차별성이 부족했다.
> v2 테마는 폐기하고, 용도가 뚜렷한 4종 테마(v3)로 전환한다.

> 본 단계는 **문서 설계만** 한다.
> 코드 / HTML / Theme Engine 수정 / PDF / 이미지 / 외부 라이브러리 — 모두 이번 범위 밖.

관련 문서: [디자인 시스템](08_DESIGN_SYSTEM.md) · [Theme Engine 설계](10_THEME_ENGINE.md) · [출력 프로파일](07_OUTPUT_PROFILES.md)

---

## 0. 공통 원칙 (4종 모두)

- **여백과 타이포가 디자인의 중심.** 장식이 아니라 구조와 위계로 고급감을 만든다.
- **색은 절제.** 강조색은 포인트로만. 의미 톤(emphasis/info/neutral)은 유지하되 표현은 차분하게.
- **border 중심, 그림자 최소.** 떠 있는 카드가 아니라 정돈된 면(plane)으로.
- **콘텐츠/구조는 불변.** v3는 AST/Page/Component/역할(tone·typographyRole)을 바꾸지 않는다.
  바뀌는 것은 "역할을 어떻게 보이게 하는가"(토큰 override + recipe)뿐.

---

## 1. Theme 4종 정의

### 1.1 Modern Glass (default)

- **목적** : 브랜드 대표용 기본 테마. 전자책 본편(FullBookPDF 등).
- **디자인 철학** : Linear / Apple / Arc Browser / Raycast / OpenAI 계열의
  "맑고 깔끔한" 인상. 큰 여백, 넓은 행간, 또렷한 타이포 위계.
- **특징**
  - 큰 여백, 낮은 정보 밀도, 읽기 쉬움.
  - radius 확대(부드럽고 현대적).
  - 그림자 최소 → **연한 border 중심**.
  - 카드 배경은 매우 연한 톤(거의 흰색), 톤 구분은 미세하게.
  - 색상 절제. 강조는 얇은 포인트로만.

### 1.2 Bento

- **목적** : 상세페이지 / SNS / 전자책 홍보용. 시선을 끄는 카드형 구성.
- **디자인 철학** : Apple WWDC / OpenAI / Nothing 계열의 "벤토 그리드" 인상.
- **특징**
  - 카드형 레이아웃, 섹션 강조.
  - 숫자 배지(steps/순서) 강조, 정보 시각화 강화.
  - 챕터 대표 카드 / 결과 카드를 시각적으로 부각.
  - 모듈형 블록감(균형 잡힌 카드 그리드 느낌).

### 1.3 Editorial

- **목적** : 에세이 / 자기계발 등 텍스트 중심 콘텐츠.
- **디자인 철학** : Medium / 잡지 / 에세이의 "읽는 호흡" 인상.
- **특징**
  - 텍스트 중심, 카드 최소화.
  - 큰 제목, 넉넉한 본문 행간, 긴 문장 가독성 우선.
  - 표/카드도 본문 흐름을 끊지 않게 절제된 형태로.

### 1.4 Dashboard

- **목적** : 리포트 / 분석 자료. 정보 정리에 최적.
- **디자인 철학** : Claude / Perplexity / ChatGPT 계열의 "정돈된 분석 화면" 인상.
- **특징**
  - 표 / 체크리스트 / 결과 요약을 또렷하게.
  - 정보 밀도는 4종 중 가장 높게 허용(단, 깔끔하게).
  - 데이터·요약 블록 가독성 우선.

---

## 2. 목적 요약표

| Theme | 한 줄 목적 | 핵심 인상 |
| --- | --- | --- |
| **Modern Glass** (default) | 브랜드 대표 / 본편 | 맑고 깔끔, 여백·타이포 중심 |
| **Bento** | 상세·SNS·홍보 | 카드 그리드, 시각 강조 |
| **Editorial** | 에세이·자기계발 | 텍스트·가독성 중심 |
| **Dashboard** | 리포트·분석 | 표·요약 정돈 |

---

## 3. 프로파일별 추천 Theme

| 출력 프로파일 | 추천 Theme | 이유 |
| --- | --- | --- |
| FullBookPDF | Modern Glass | 본편 브랜드 기본 |
| EditableDOCX | Modern Glass | 본편과 동일 기준(편집본) |
| KmongPreviewPDF | Modern Glass | 본편 미리보기 일관성 (홍보 강조가 필요하면 Bento 선택 가능) |
| DetailPageImages | Bento | 상세페이지 카드형 시각 강조 |
| SNSPromoImages | Bento | SNS 후킹·시각 임팩트 |
| ChecklistPDF | Dashboard | 체크리스트/요약 정돈 |
| (에세이형 원고) | Editorial | 텍스트 중심 콘텐츠 |

> 매핑은 권장값(기본). 선택 우선순위는 기존과 동일: 명시 theme > 프로파일 기본 theme > default theme.
> default theme = **Modern Glass**.

---

## 4. 기존 CozyBuilder Lab Theme와의 차이

| 항목 | CozyBuilder Lab (v2) | Theme v3 (Modern Glass 기준) |
| --- | --- | --- |
| 인상 | 따뜻한 그라데이션, 카드 틴트 | 맑고 중립적, 면(plane) 중심 |
| 그림자 | 페이지·카드 부드러운 그림자 | 최소(거의 없음), border로 분리 |
| 배경 | 오프화이트 그라데이션 | 차분한 단색/거의 흰색 |
| 카드 틴트 | 강조=연주황 / 정보=연청록 | 매우 연한 톤(거의 흰색), 미세한 구분 |
| 강조선 | (이미 제거됨) 톤별 좌측 라인 흔적 | 좌측 굵은 강조선 완전 배제 |
| 색 사용 | 톤 색을 배경에 적극 사용 | 색 절제, 포인트로만 |
| 여백 | 보통~넓음 | 더 크게(낮은 밀도) |
| radius | 카드 16 / 페이지 22 | 확대 지향(더 부드럽게) |
| 정체성 | 단일 브랜드 톤 | 용도별 4종 분화 |

> 핵심 전환: "따뜻한 단일 브랜드 톤" → "맑고 절제된 + 용도별 분화". CozyBuilder Lab(v2)은 폐기.

---

## 5. v3에서 제거되는 요소

- ❌ 과도한 그림자 (페이지/카드의 무거운 box-shadow)
- ❌ 블로그 느낌 (장식적·캐주얼한 표현)
- ❌ 엑셀 느낌 표 (격자·진한 헤더 채움 → 라인 최소·여백 중심으로)
- ❌ 좌측 굵은 강조선 (tone 좌측 바)
- ❌ 과한 카드 틴트 (진한 배경 색칠 → 매우 연한 톤 또는 무틴트)

---

## 6. 디자인 참고 방향 (레퍼런스)

| Theme | 레퍼런스 |
| --- | --- |
| Modern Glass | Linear · Apple · Arc Browser · Raycast · OpenAI |
| Bento | Apple WWDC · OpenAI · Nothing |
| Editorial | Medium · 잡지 · 에세이 |
| Dashboard | Claude · Perplexity · ChatGPT |

---

## 7. 구현 시 고려 (다음 단계 메모, 이번엔 미구현)

- Theme Engine 구조(타입/registry/합성/profile 매핑)는 그대로 재사용.
  v3는 **ThemeName 목록 교체 + 각 테마의 tokenOverride/recipe 재정의**로 구현 가능.
- recipe 다이얼이 v3 표현을 담기에 충분한지 점검 필요(예: 정보 밀도, border 스타일,
  배지 강조 정도 등 새 다이얼이 필요할 수 있음).
- 기본 토큰(08, 승인 v0.1)은 유지하되, v3 방향(여백 확대·radius 확대·색 절제)에 맞춰
  토큰 override 또는 토큰 값 조정이 필요한지 별도 검토 — **디자인 승인 절차 대상**.

---

본 설계는 v3 기준안이며, 구현 착수 시 타입/레시피/토큰 조정으로 보완된다.
