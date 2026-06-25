// Vercel Node serverless function (ESM) — Ebook launch token 검증.
// 홈페이지와 동일한 LAUNCH_TOKEN_SECRET(서버 전용 env)으로 HS256 서명을 검증한다.
// 성공: { ok:true, app:"ebook" } / 실패: { ok:false, reason:"invalid"|"expired"|"wrong_app" }
import crypto from "node:crypto";

function timingSafeEq(a, b) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, reason: "invalid" });
  }
  const secret = process.env.LAUNCH_TOKEN_SECRET;
  if (!secret) {
    // 시크릿 미설정은 서버 구성 오류 — 토큰 노출 위험 없이 차단.
    return res.status(500).json({ ok: false, reason: "invalid" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const token = body && body.token;
  if (typeof token !== "string") {
    return res.status(200).json({ ok: false, reason: "invalid" });
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return res.status(200).json({ ok: false, reason: "invalid" });
  }
  const [h, p, sig] = parts;

  // 서명 검증
  const expected = crypto.createHmac("sha256", secret).update(h + "." + p).digest("base64url");
  if (!timingSafeEq(sig, expected)) {
    return res.status(200).json({ ok: false, reason: "invalid" });
  }

  // payload 파싱
  let claims;
  try {
    claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  } catch {
    return res.status(200).json({ ok: false, reason: "invalid" });
  }

  const now = Math.floor(Date.now() / 1000);
  const appKey = claims.app_key != null ? claims.app_key : claims.appKey; // 홈페이지 토큰 키 표기(app_key/appKey) 호환
  if (appKey !== "ebook") {
    return res.status(200).json({ ok: false, reason: "wrong_app" });
  }
  if (typeof claims.exp !== "number" || claims.exp < now) {
    return res.status(200).json({ ok: false, reason: "expired" });
  }
  // iat 유효성(미래 발급/시계 오차 60초 허용)
  if (typeof claims.iat !== "number" || claims.iat > now + 60) {
    return res.status(200).json({ ok: false, reason: "invalid" });
  }

  // v2 확장 지점: claims.jti 를 공유 스토어(KV/Redis)에 1회성 기록해 재사용(replay) 차단.
  // 현재(v1)는 단명 TTL(90s)로만 방어한다.

  return res.status(200).json({ ok: true, app: "ebook" });
}
