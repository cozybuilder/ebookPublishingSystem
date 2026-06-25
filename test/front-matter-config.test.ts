/**
 * Ebook Publishing System — 책 기본정보 설정 → FrontMatterOverrides 테스트 (v1)
 * 실행: npm run test:front-matter-config
 */

import { configToOverrides } from '../src/front-matter/front-matter-config.ts';
import { resolveFrontMatterMeta, buildFrontMatter } from '../src/front-matter/front-matter-generator.ts';
import { parseBook } from '../src/parser/parser.ts';

let passed = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail?: string): void {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failures.push(detail ? `${name} — ${detail}` : name); console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

console.log('책 기본정보 설정 테스트 실행\n');

// ── 빈/누락 값 무시 ──
const empty = configToOverrides({ author: '', publisher: '   ', title: undefined });
check('빈 문자열/누락은 override 안 함', Object.keys(empty).length === 0);

// ── 값 매핑 ──
const o = configToOverrides({ author: '김작가', publisher: '김작가 출판', brand: '김작가', year: '2027', authorBio: '소개글', disclaimer: '면책문', subtitle: '부제', title: '내 책' });
check('문자열 필드 매핑', o.author === '김작가' && o.publisher === '김작가 출판' && o.brand === '김작가' && o.subtitle === '부제' && o.title === '내 책');
check('authorBio/disclaimer 매핑', o.authorBio === '소개글' && o.disclaimer === '면책문');
check('year 문자열→숫자', o.year === 2027);
check('year 숫자 그대로', configToOverrides({ year: 2030 }).year === 2030);
check('비객체 입력 안전', Object.keys(configToOverrides(null)).length === 0 && Object.keys(configToOverrides('x')).length === 0);

// ── front-matter 에 실제 반영(저작권/발행) ──
const book = parseBook('# 원고제목\n\nauthor: 원고저자\n\n## Chapter 1. 가\n\n본문');
const meta = resolveFrontMatterMeta(book, configToOverrides({ author: '사용자저자', publisher: '사용자출판', brand: '사용자권리자', year: 2028 }));
check('설정이 저자/발행/저작권자/연도 override', meta.author === '사용자저자' && meta.publisher === '사용자출판' && meta.brand === '사용자권리자' && meta.year === 2028);

const doc = buildFrontMatter(book, configToOverrides({ author: '사용자저자', publisher: '사용자출판', brand: '사용자권리자', year: 2028 }));
const copyright = doc.components.find((c) => c.type === 'CopyrightNotice') as { text: string } | undefined;
check('판권 고지가 사용자 값 반영(CozyBuilder 없음)', !!copyright && copyright.text.includes('사용자저자') && copyright.text.includes('사용자출판') && copyright.text.includes('사용자권리자') && copyright.text.includes('2028') && !copyright.text.includes('CozyBuilder'));

// ── 설정 없으면 기존 기본값 유지(무회귀) ──
const metaDefault = resolveFrontMatterMeta(book, configToOverrides({}));
check('미설정 시 기본 발행자 유지', metaDefault.publisher === 'CozyBuilder Lab' && metaDefault.author === '원고저자');

console.log('\n────────────────────────────');
if (failures.length === 0) { console.log(`✓ 전체 통과 — ${passed}개 검증 성공`); process.exitCode = 0; }
else { console.log(`✗ 실패 ${failures.length}개 / 성공 ${passed}개`); for (const f of failures) console.log(`   - ${f}`); process.exitCode = 1; }
