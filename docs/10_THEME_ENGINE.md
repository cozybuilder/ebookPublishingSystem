# Ebook Publishing System — Theme Engine 설계 v0.1

이 문서는 **같은 `book.md` 원고를 여러 디자인 분위기로 재출력**하기 위한 Theme Engine의
목적·책임 범위·구조를 정의한다.

> 본 단계는 **개념/책임 범위 확정**이다.
> Theme Engine 구현 / TypeScript 타입 / HTML Renderer 수정 / PDF·DOCX / 이미지 렌더링 / 외부
> 라이브러리는 포함하지 않는다.

관련 문서: [컴포넌트](03_COMPONENTS.md) · [파이프라인](04_PIPELINE.md) · [출력 프로파일](07_OUTPUT_PROFILES.md) · [디자인 시스템](08_DESIGN_SYSTEM.md) · [스키마 형식화](09_SCHEMA_FORMALIZATION.md)

---

## 1. 목적

Theme Engine은 **하나의 원고(AST → Layout)** 를 **여러 시각 스타일**로 출력하기 위한 시스템이다.

- 원고는 그대로 두고, **디자인 분위기만 교체**한다(단일 원본, 다중 표현).
- 파이프라인 [1]~[5](파서→AST→Page→Component→Layout 역할 부여)는 **테마와 무관하게 공유**된다.
- 테마는 **[6] Layout 적용~[7] Output(렌더)** 에서 "역할(role)을 어떤 구체 스타일로 그릴지"를 결정한다.

> 핵심 원칙: 콘텐츠(무엇을 말하는가)와 시각(어떻게 보이는가)을 분리한다.
> Layout 은 "이 컴포넌트는 emphasis 톤 / title 타이포 역할"이라고만 선언하고,
> **Theme 이 그 역할을 실제 색·폰트·여백·그림자로 해석**한다.

### 예상 테마 (5종)

| 테마 | 분위기 | 한 줄 성격 |
| --- | --- | --- |
| **CozyBuilder Lab** | 기본/브랜드 | 현재 v0.2 HTML 디자인. 부드럽고 따뜻한 상품 톤. |
| **Modern** | 깔끔/현대적 | 직선적, 또렷한 대비, 절제된 색. |
| **Minimal** | 미니멀 | 그림자·색·장식을 최소화, 여백과 타이포 중심. |
| **Premium** | 고급 | 넓은 여백, 강한 대비, 카드 질감·디테일 강화. |
| **Infographic** | 정보 시각화 | 카드·숫자 배지·비교표·체크리스트 시각화 강화. |

---

## 2. Theme 이 제어하는 항목

Theme 은 아래 시각 요소를 제어할 수 있어야 한다. (제어하지 않는 항목은 기본 토큰을 따른다.)

| 분류 | 제어 항목 |
| --- | --- |
| 기초 토큰 | color palette, typography, spacing, radius, shadow |
| 컴포넌트 스타일 | card style, table style, checklist style, steps style, warning style, result style, image slot style |
| 지면 | page style (배경, 마진, 페이지 그림자/라운드 등) |

> Theme 은 **콘텐츠 구조(AST/Page/Component)** 나 **의미 역할(tone/typographyRole)** 을 바꾸지 않는다.
> 바꾸는 것은 오직 "그 역할을 어떻게 보이게 할 것인가"다. (예: emphasis 톤을 Orange 틴트로 vs 굵은 테두리로)

---

## 3. DesignTokens 와 Theme 의 관계

- **DesignTokens(08 문서, 승인 v0.1)** 는 **기본 토큰(base)** 이다 — 색/타이포/간격/라운드/톤/캔버스.
- **Theme 은 DesignTokens 를 기반(base)으로 두고, 일부를 override** 한다.
  - 전체를 새로 정의할 필요 없음. **차분(diff)만 선언**하면 base + override 로 최종 토큰이 합성된다.
  - override 되지 않은 값은 base 토큰을 그대로 상속.
- 추가로 Theme 은 토큰만으로 표현하기 어려운 **컴포넌트 스타일 변형(style recipe)** 을 가질 수 있다
  (예: 카드 그림자 강도, 표 헤더 처리, 체크박스 모양, steps 연결선 유무).

```text
DesignTokens (base, 승인 v0.1)
        │
        ├── CozyBuilder Lab Theme : override 거의 없음 (= 현재 v0.2 디자인 기준)
        ├── Minimal Theme         : shadow ↓, color 대비 ↓, 장식 최소
        ├── Premium Theme         : spacing ↑, 대비 ↑, 카드 질감/디테일 ↑
        ├── Modern Theme          : 직선/또렷한 대비, 색 절제
        └── Infographic Theme     : 카드/숫자 배지/비교표/체크리스트 시각화 강화
```

### 테마별 방향 (개념)

- **CozyBuilder Lab** : 현재 v0.2 HTML 디자인을 기준으로 한다(브랜드 기본값).
- **Minimal** : 그림자와 색상을 줄인다(테두리·틴트 최소, 흑백+포인트 1색).
- **Premium** : 여백·대비·카드 질감을 강화한다.
- **Infographic** : 카드, 숫자 배지, 비교표, 체크리스트 시각화를 강화한다.
- **Modern** : 라운드·그림자를 낮추고 직선/또렷한 대비로 현대적 인상을 준다.

---

## 4. Theme Registry 개념

여러 Theme 을 **등록하고 이름으로 선택**할 수 있어야 한다.

- **default theme** : 미지정 시 사용할 기본 테마 = `CozyBuilder Lab`.
- **theme name 선택** : 빌드/렌더 시 테마 이름으로 선택(예: `--theme=Premium`).
- **출력 프로파일별 기본 theme** : 각 OutputProfile 이 권장 기본 테마를 가질 수 있다.

### 프로파일별 기본 테마 (제안)

| 출력 프로파일 | 기본 테마 | 이유 |
| --- | --- | --- |
| FullBookPDF | CozyBuilder Lab | 본편 브랜드 기본 톤 |
| EditableDOCX | CozyBuilder Lab | 본편과 동일 기준(편집본) |
| KmongPreviewPDF | Premium | 구매 전환용 — 고급 인상 강화 |
| DetailPageImages | Infographic | 상세페이지 — 정보 시각화 강조 |
| SNSPromoImages | Infographic | 후킹·시각 임팩트 강조 |
| ChecklistPDF | Minimal | 실전 부록 — 군더더기 없이 |

> 프로파일 기본값은 "권장값"이며, 명시적으로 theme name 을 주면 override 된다.
> (선택 우선순위: 명시 theme > 프로파일 기본 theme > default theme)

---

## 5. 책임 경계 (요약)

- **Theme 이 하는 일** : 역할(tone/typographyRole/spacing/radius 등) → 구체 시각값으로 해석,
  컴포넌트 스타일 변형 제공, base 토큰 override 합성.
- **Theme 이 하지 않는 일** : 콘텐츠/구조 변경, 페이지 선택(=출력 프로파일의 selector 책임),
  블록→컴포넌트 매핑(=Component Mapper 책임), 출력 포맷 결정(=프로파일의 format 책임).

---

## 6. 파이프라인 내 위치 (예정)

```text
... → [5] Component 매핑 → [6] Layout(역할 부여) → ★Theme 해석★ → [7] Output(렌더)
```

- 현재 HTML Renderer 는 DEFAULT_TOKENS 를 직접 사용한다.
- Theme Engine 도입 시: 렌더러는 "선택된 Theme 이 합성한 최종 토큰 + 스타일 레시피"를 입력으로 받는다.
- 즉 렌더러는 테마를 모른 채 "최종 스타일"만 받도록 유지 → 렌더러/테마 결합도 최소화.

---

본 정의는 v0.1 기준안이며, 구현(타입/레지스트리/합성 로직) 단계에서 보완될 수 있다.
