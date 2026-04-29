/** Client telemetry: never persist tokens, secrets, or raw URLs with sensitive query/hash. */

var SENSITIVE_PARAM_KEYS = [
  "access_token",
  "refresh_token",
  "token",
  "code",
  "provider_token",
  "provider_refresh_token",
];

var SENSITIVE_DETAIL_KEYS = new Set([
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "password",
  "api_key",
  "anon_key",
  "anonkey",
  "service_role",
  "secret",
]);

function stripSearchParams(u) {
  SENSITIVE_PARAM_KEYS.forEach(function (k) {
    try {
      u.searchParams.delete(k);
    } catch (_) {}
  });
}

function sanitizeUrlString(str, maxLen) {
  if (typeof str !== "string" || !str.length) return str;
  var max = typeof maxLen === "number" ? maxLen : 500;
  try {
    var u = new URL(str);
    u.hash = "";
    stripSearchParams(u);
    var out = u.pathname + (u.search || "");
    if (out.length > max) out = out.slice(0, max) + "…";
    return out;
  } catch (_) {
    var s = str;
    if (s.length > max) s = s.slice(0, max) + "…";
    return s;
  }
}

function sanitizeRefererHeader(ref) {
  if (!ref || typeof ref !== "string") return ref || null;
  try {
    var u = new URL(ref);
    u.hash = "";
    stripSearchParams(u);
    var out = u.origin + u.pathname + (u.search || "");
    if (out.length > 800) out = out.slice(0, 800) + "…";
    return out;
  } catch (_) {
    return sanitizeUrlString(ref, 800);
  }
}

function sanitizeDetail(val, depth) {
  var d = depth == null ? 0 : depth;
  if (d > 8) return "[truncated-depth]";
  if (val === null || val === undefined) return val;
  var t = typeof val;
  if (t === "string") {
    var looksLikeUrl = /^https?:\/\//i.test(val);
    var smellsLikeSecret =
      /access_token|refresh_token|provider_token|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_.-]+/.test(val);
    if (looksLikeUrl || smellsLikeSecret) return sanitizeUrlString(val, 600);
    return val.length > 4000 ? val.slice(0, 4000) + "…" : val;
  }
  if (t !== "object") return val;
  if (Array.isArray(val)) {
    var cap = Math.min(val.length, 40);
    var arr = [];
    for (var i = 0; i < cap; i++) arr.push(sanitizeDetail(val[i], d + 1));
    if (val.length > cap) arr.push("[+" + (val.length - cap) + " items]");
    return arr;
  }
  var out = {};
  var keys = Object.keys(val);
  for (var k = 0; k < keys.length; k++) {
    var key = keys[k];
    var lk = String(key).toLowerCase();
    if (SENSITIVE_DETAIL_KEYS.has(lk)) continue;
    if (lk.indexOf("password") >= 0 || lk.indexOf("secret") >= 0) continue;
    var child = val[key];
    var urlLikeKeys = ["href", "url", "referrer", "referer", "redirect", "src", "path"];
    if (typeof child === "string" && urlLikeKeys.indexOf(lk) >= 0) {
      out[key] = sanitizeUrlString(child, 600);
      continue;
    }
    if (lk === "search" && typeof child === "string" && child.length > 2) {
      try {
        var fake = new URL("https://x.invalid/" + (child.charAt(0) === "?" ? child.slice(1) : child));
        stripSearchParams(fake);
        out[key] = fake.search || "";
      } catch (_) {
        out[key] = sanitizeUrlString(child, 400);
      }
      continue;
    }
    out[key] = sanitizeDetail(child, d + 1);
  }
  return out;
}

module.exports = function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    var body = req.body || {};
    var payload = {
      route: body.route != null ? String(body.route).slice(0, 200) : null,
      level: body.level != null ? String(body.level).slice(0, 32) : "info",
      event: body.event != null ? String(body.event).slice(0, 200) : "unknown",
      detail: sanitizeDetail(body.detail),
      ua:
        req.headers["user-agent"] != null
          ? String(req.headers["user-agent"]).slice(0, 400)
          : null,
      referer: sanitizeRefererHeader(req.headers["referer"] || req.headers["referrer"]),
      ts: new Date().toISOString(),
    };
    console.log("[client-log]", JSON.stringify(payload));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[client-log] error", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: "internal error" });
  }
};
