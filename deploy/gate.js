/* Ebook launch gate (V3)
 * 1) 데스크톱(≥1180px) 게이트 — 작은 화면은 실행 차단/안내
 * 2) URL 에서 launch_token 읽기 (없으면 차단)
 * 3) /api/verify-launch 서버 검증 (HS256/exp/iat/app_key)
 * 4) 성공 → 토큰을 URL 에서 제거 + studio 부팅 / 실패 → 차단 화면
 * token 은 실행 허가용. localStorage 장기 저장 금지(sessionStorage 플래그만).
 */
(function () {
  var loading = document.getElementById("launch-loading");
  var blocked = document.getElementById("launch-blocked");
  var mobile = document.getElementById("launch-mobile");
  function showOnly(el) {
    [loading, blocked, mobile].forEach(function (n) { if (n) n.style.display = "none"; });
    if (el) el.style.display = "flex";
  }

  // 1) 데스크톱 전용 게이트 (홈페이지 redirect 는 기기 구분 불가 → 앱에서 처리)
  if (window.matchMedia && window.matchMedia("(max-width: 1179px)").matches) {
    showOnly(mobile);
    return;
  }

  // 2) 토큰 읽기 (query 우선, hash fallback)
  function readToken() {
    var q = new URLSearchParams(location.search);
    var t = q.get("launch_token") || q.get("token");
    if (t) return t;
    var h = (location.hash || "").replace(/^#/, "");
    return new URLSearchParams(h).get("launch_token");
  }
  var token = readToken();
  if (!token) { showOnly(blocked); return; }

  // 3) 서버 검증
  fetch("/api/verify-launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: token }),
  })
    .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
    .then(function (d) {
      if (d && d.ok) {
        // 4) 성공 — 토큰 URL 에서 제거(공유/재사용 방지), 세션 플래그만, studio 부팅
        try { sessionStorage.setItem("ebook_launched", "1"); } catch (e) {}
        history.replaceState(null, "", location.pathname);
        if (loading) loading.style.display = "none";
        if (window.__bootStudio) window.__bootStudio();
      } else {
        showOnly(blocked);
      }
    })
    .catch(function () { showOnly(blocked); });
})();
