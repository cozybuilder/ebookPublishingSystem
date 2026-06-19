# DOCX Export 검토 (Feasibility v1)

Markdown → AST → Components 구조를 기반으로 **편집 가능한 .docx**(흐름형 Word 문서)를
생성하는 방식을 검토한다.

> **이 문서는 설계 검토다 — 이번 단계에서 DOCX 를 구현하거나 의존성을 추가하지 않는다.**
> 의존성 추가는 PM 승인 전 금지.

관련: [컴포넌트](03_COMPONENTS.md) · [AST](06_AST_SCHEMA.md) · [출력 프로파일](07_OUTPUT_PROFILES.md) · [PDF 검토](PDF_EXPORT_FEASIBILITY.md)

---

## 0. 전제 / 프로젝트 제약

- **DOCX 는 편집 가능한 흐름형 문서**다(고정 레이아웃 PDF 와 목적이 다름).
  HTML/PDF 테마(Modern/Bento/…) 시각 표현을 1:1 재현하지 않는다 — 워드에서 수정 가능한 구조 우선.
- 프로젝트 컨벤션: **외부 라이브러리 0, Node 내장 모듈만, .ts 직접 실행.**
- 핵심 사실: **.docx = OOXML(ZIP 컨테이너 + XML 파트)**. ZIP 패키징은 Node 내장 `zlib`(deflateRawSync)로
  직접 구성 가능 → "의존성 0 직접 OpenXML 생성"이 기술적으로 실현 가능(아래 4 참고).
- 입력 자산: Components(TitleBlock/Paragraph/QuoteBlock/Checklist/Table/Steps/Warning/Result/Image …)가
  이미 구조화되어 있어, "Component → docx 단락/표"의 직접 매핑이 자연스럽다.

---

## 1. 옵션별 검토

### A. 직접 OpenXML 생성 (의존성 0)  ★ 1순위(정책 부합)

Component → WordprocessingML(`word/document.xml`) 단락/표 XML 로 직렬화하고,
최소 OOXML 파트([Content_Types].xml, _rels, document.xml)를 Node 내장 `zlib` 로 ZIP 패키징.

- **의존성**: 0 (zlib/fs 만). **프로젝트 의존성 0 원칙과 유일하게 완전 부합.**
- **구현 난이도**: 중 — 최소 .docx 골격(필수 파트 4~5개) + 단락/표/리스트 XML 직렬화 + ZIP store/deflate.
  스타일은 styles.xml 로 단순하게(제목/본문/인용 단락 스타일 몇 개).
- **결과 품질/편집성**: 상 — 진짜 Word 문서(네이티브 단락/표/스타일) → 워드에서 자유 편집.
- **한글**: 상 — UTF-8 XML, 폰트는 styles.xml 기본(맑은 고딕 등) 또는 미지정(워드 기본). 안정적.
- **표/리스트/인용**: 상 — w:tbl(표), numbering.xml(리스트), 인용 단락 스타일로 표현 가능.
- **이미지**: 중 — word/media + drawing XML + rels 필요(복잡). v1 은 이미지 슬롯을 placeholder
  텍스트/테두리 단락으로 시작(실이미지 삽입은 v2).
- **확장성**: 상 — styles.xml/템플릿으로 스타일 확장. 자동 생성 엔진과 궁합 좋음(Component → XML 함수형).
- **CI/재현성**: 상 — 순수 Node, 브라우저/외부 도구 불필요. CI 무헤드 환경에서도 동작.
- **단점**: OOXML 스펙 학습 필요(최소 골격은 잘 알려져 있음). 이미지/고급 스타일은 점진 확장.

### B. npm `docx` 라이브러리

- **의존성**: 추가 필요(패키지 + 트랜지티브). 의존성 0 원칙 위배.
- **장점**: API 깔끔, 표/리스트/이미지/섹션/스타일 지원 풍부, 유지보수성 좋음, 한글 OK.
- **단점**: 정책상 설치 금지(승인 필요). 번들/설치 비용. 현 단계 부적합.
- **판정**: 품질·생산성은 최상이나 **의존성 0 위배 → 보류**(승인 시 가장 강력한 후보).

### C. Pizzip + docxtemplater (템플릿 기반)

- **의존성**: 추가 필요(2개+). 의존성 0 위배.
- **장점**: 디자이너가 만든 .docx 템플릿에 데이터 주입 → 스타일 유지 우수. 정형 문서에 강함.
- **단점**: 자동 생성 엔진(가변 컴포넌트 순서/개수)과 궁합은 보통 — 반복 블록/조건 로직이 템플릿 문법에 종속.
  설치 금지. 템플릿 관리 부담.
- **판정**: 스타일 고정 양식엔 좋지만 가변 콘텐츠엔 과함 + 의존성 → 보류.

### D. HTML → DOCX 변환 (html-docx-js 등)

- **의존성**: 추가 필요.
- **품질/호환성**: **하~중** — 대개 HTML 을 Word 가 읽는 "filtered HTML/altchunk"로 감싸는 수준 →
  표/스타일/한글 폰트 재현이 불안정, 편집성도 어중간(네이티브 단락 아님). 버전별 깨짐.
- **판정**: **비추천** — 편집 가능성/품질 모두 약함. DOCX 의 목적(편집 가능 구조)에 역행.

### E. LibreOffice / Word CLI 변환

- **의존성**: 외부 프로그램(LibreOffice soffice / Word) 설치 필요.
- **장점**: HTML/PDF → DOCX 변환 품질 양호(soffice --convert-to docx).
- **단점**: **환경 의존 심함** — CI/서버에 LibreOffice 설치 필요(수백 MB), Windows/리눅스 차이,
  헤드리스 안정성 이슈. 자동 출판 재현성 저하. (PNG/PDF 의 "이미 설치된 시스템 브라우저" 와 달리
  LibreOffice 는 기본 미설치.)
- **판정**: 재현성·환경 부담으로 보류. 변환 품질은 좋으나 도입 비용 큼.

---

## 2. 비교 요약

| 옵션 | 의존성 | 난이도 | 편집성 | 한글 | 표/리스트/인용 | 이미지 | CI/재현성 | 종합 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A. 직접 OpenXML | 0 ✅ | 중 | 상 | 상 | 상 | 중(v2) | 상 | ★ 추천(정책 부합) |
| B. npm docx | 추가 ❌ | 하 | 상 | 상 | 상 | 상 | 상 | 보류(승인 시 1순위 대안) |
| C. docxtemplater | 추가 ❌ | 중 | 상 | 상 | 중 | 상 | 중 | 보류 |
| D. html-docx-js | 추가 ❌ | 하 | 하 | 중 | 하 | 하 | 중 | 비추천 |
| E. LibreOffice CLI | 외부설치 ❌ | 중 | 상 | 상 | 상 | 상 | 하 | 보류 |

---

## 3. 결론

- **추천 1순위**: **A. 직접 OpenXML 생성(의존성 0).**
  - 유일하게 "외부 라이브러리 0" 원칙에 부합하고, Component 구조 → 단락/표 XML 매핑이 자연스러우며,
    네이티브 Word 편집성·한글·CI 재현성이 모두 양호. 이미지만 v2 로 미룬다.
- **승인 시 대안**: B(npm `docx`) — 의존성 허용이 결정되면 생산성/이미지까지 최상. v1 빠른 완성용.
- **비추천**: D(html-docx-js, 품질/편집성 약함).
- **보류**: C(템플릿, 가변 콘텐츠 부적합), E(LibreOffice, 환경 의존).

---

## 4. v1 구현 범위 제안 (다음 단계, 승인 시)

- 출력: **`output/book.docx`** (FullBook AST 기반 흐름형). 단일 파일.
- 방식: 직접 OpenXML(의존성 0). `src/export-docx.ts` + `npm run export:docx`.
- 변환 대상 컴포넌트(편집 가능 구조만): 제목/본문/인용/체크리스트/표/단계/주의박스/결과.
  - 이미지 슬롯: placeholder 단락(테두리/회색 박스 + "[이미지: id/type/prompt]") 으로 시작(실삽입 v2).
- 스타일: styles.xml 에 Heading1/2, Normal, Quote, Caption 정도만(테마 복제 아님 — 워드 기본 톤).
- **Modern/Editorial/Bento/Dashboard 스타일 복제 아님.** Preview/Dashboard/Bento 변형은 후순위.
- 산출물 정책: `output/*.docx` 는 재생성 가능 → gitignore 권장(PNG/PDF 와 동일). clean:assets 대상에 추가.
- 테스트: 순수 함수(컴포넌트 → document.xml 조각 생성, [Content_Types]/rels 골격, ZIP 헤더 검증).
  실제 .docx 를 Word 로 여는 검증은 수동/육안.

### 최소 OOXML 골격 (직접 생성 시 필요한 파트)
```text
book.docx (ZIP)
├─ [Content_Types].xml          # 파트 MIME 선언
├─ _rels/.rels                  # 패키지 → document 관계
├─ word/document.xml            # 본문(단락/표/리스트)
├─ word/_rels/document.xml.rels # document → styles/numbering/media 관계
├─ word/styles.xml              # Heading/Normal/Quote 스타일
└─ word/numbering.xml           # 체크리스트/단계 리스트 정의(선택)
```
- ZIP 패키징: Node `zlib.deflateRawSync` + 직접 로컬/센트럴 디렉터리 레코드 작성(또는 STORE 무압축).
  외부 zip 라이브러리 없이 가능(소규모 .docx 라 STORE 도 허용).

---

## 5. Component → DOCX 매핑 초안

| Component | DOCX 표현 |
| --- | --- |
| TitleBlock | Heading1 단락(책 제목) |
| SubtitleBlock | 부제 단락(Subtitle/큰 본문) |
| AuthorBlock | Caption 단락 |
| ChapterHeading | Heading1/2 단락("Chapter N. 제목") |
| TableOfContentsList | 번호 목록 단락(또는 단순 목록) |
| CopyrightNotice | Normal 단락(줄바꿈 보존) |
| ParagraphBlock | Normal 단락 |
| QuoteBlock | Quote 단락 스타일(들여쓰기 + 이탤릭) |
| ChecklistCard | 체크 기호(☐) 선행 리스트 단락 |
| StepsCard | 번호 리스트(numbering.xml) |
| TableCard / CompareCard | w:tbl(헤더 행 + 데이터 행) |
| WarningCard | 음영/테두리 단락 + "주의" 라벨 |
| ResultCard | 강조 단락 + "핵심 결과" 라벨 |
| FAQCard | Q/A 단락 반복 |
| ImageBlock | placeholder 단락(v1) / drawing 삽입(v2) |

> Component 가 이미 데이터(텍스트/항목/행)를 갖고 있어, 각 타입 → XML 직렬화 함수로 1:1 매핑 가능.

---

## 6. PDF/HTML 과 분리해야 하는 이유

- **PDF/HTML**: 고정 레이아웃 + 테마(Modern/Bento/…) 시각 표현. 브라우저 렌더 자산 재사용.
- **DOCX**: 흐름형 편집 문서. 워드 단락/표/스타일 모델이 달라 HTML/CSS 와 표현 모델 자체가 상이 →
  테마 CSS 재사용 불가. 별도 직렬화 트랙(Component → OOXML)이 필요.
- 따라서 DOCX 는 **별도 export 트랙**(src/export-docx.ts)으로 두고, 기존 렌더/테마와 결합하지 않는다.
  (07 출력 전략의 EditableDOCX 프로파일이 이 트랙으로 실체화됨.)

---

## 7. 의존성 추가 전 승인 사항

- A(직접 OpenXML) 채택 시: **의존성 추가 없음** → 승인 불필요(코드만 추가).
- 만약 B/C(npm docx/templater) 로 가려면: "외부 라이브러리 설치 금지" 정책 해제가 선행 조건 → PM 승인 필요.
  (권장: 우선 A 로 v1 을 만들고, 이미지/고급 스타일 요구가 커지면 B 도입을 재검토.)

---

본 검토는 v1 기준이며, 실제 DOCX export 구현은 별도 단계(승인 후)에서 진행한다.
