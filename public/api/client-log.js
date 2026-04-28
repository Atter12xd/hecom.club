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
    const body = req.body || {};
    const payload = {
      route: body.route || null,
      level: body.level || "info",
      event: body.event || "unknown",
      detail: body.detail || null,
      ua: req.headers["user-agent"] || null,
      referer: req.headers["referer"] || null,
      ts: new Date().toISOString(),
    };
    console.log("[client-log]", JSON.stringify(payload));
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[client-log] error", err && err.message ? err.message : err);
    return res.status(500).json({ ok: false, error: "internal error" });
  }
};
