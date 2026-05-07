/** Cliente abre borrador marcado como needs_client_edit (+ submissionId). */

function getEnv(name) {
  var v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : "";
}

function json(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(payload));
}

function sanitizeText(v, maxLen) {
  if (v == null) return null;
  var s = String(v).trim();
  if (!s) return null;
  if (maxLen && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "Method not allowed" });

  var supabaseUrl = getEnv("SUPABASE_URL") || getEnv("PUBLIC_SUPABASE_URL");
  var serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { ok: false, error: "Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel." });
  }

  try {
    var submissionId = sanitizeText(req.query && req.query.submissionId, 80);
    var clientId = sanitizeText(req.query && req.query.clientId, 80);
    if (!submissionId || !clientId) {
      return json(res, 400, { ok: false, error: "submissionId y clientId son requeridos." });
    }

    var u =
      supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/credito_client_form_submissions?id=eq." +
      encodeURIComponent(submissionId) +
      "&select=id,client_id,approval_status,manager_feedback,tipo,monto,fecha_pago,telefono,detalle,comprobante_url,client_name";
    var r = await fetch(u, {
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json" },
    });
    var txt = await r.text().catch(function () { return ""; });
    if (!r.ok) return json(res, 500, { ok: false, error: txt || ("HTTP " + r.status) });
    var rows;
    try {
      rows = JSON.parse(txt);
    } catch (_) {
      rows = [];
    }
    var row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) return json(res, 404, { ok: false, error: "No encontrado." });
    if (String(row.client_id) !== String(clientId)) {
      return json(res, 403, { ok: false, error: "No autorizado." });
    }
    if (String(row.approval_status || "") !== "needs_client_edit") {
      return json(res, 400, { ok: false, error: "Este envío no está abierto para edición por el cliente." });
    }

    return json(res, 200, {
      ok: true,
      submission: {
        id: row.id,
        tipo: row.tipo,
        monto: row.monto,
        fecha_pago: row.fecha_pago,
        telefono: row.telefono,
        detalle: row.detalle,
        comprobante_url: row.comprobante_url || null,
        client_name: row.client_name || null,
        manager_feedback: row.manager_feedback || "",
      },
    });
  } catch (err) {
    return json(res, 500, { ok: false, error: err && err.message ? err.message : "internal error" });
  }
};
