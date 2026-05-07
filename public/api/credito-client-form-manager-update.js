/** Gerente edita datos de un borrador (pending_review) sin pasar por el cliente. */

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

function parseRequestBody(req) {
  var b = req.body;
  if (b === undefined || b === null) return {};
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(b)) {
    try {
      return b.length ? JSON.parse(b.toString("utf8")) : {};
    } catch (_) {
      return {};
    }
  }
  if (typeof b === "string") {
    try {
      return b ? JSON.parse(b) : {};
    } catch (_) {
      return {};
    }
  }
  if (typeof b === "object") return b;
  return {};
}

function normalizeCreditoClienteTipo(raw) {
  var s = String(raw || "").trim().toLowerCase();
  try {
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch (_) {}
  if (s === "recarga") return "recarga";
  if (s === "amortizacion") return "amortizacion";
  var legacyToAmort = { garantia: 1, cobro: 1, gasto_ads: 1, otro: 1 };
  if (legacyToAmort[s]) return "amortizacion";
  return "recarga";
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
  if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed" });

  var supabaseUrl = getEnv("SUPABASE_URL") || getEnv("PUBLIC_SUPABASE_URL");
  var serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { ok: false, error: "Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel." });
  }

  try {
    var body = parseRequestBody(req);
    var id = sanitizeText(body.id, 80);
    if (!id) return json(res, 400, { ok: false, error: "id es requerido." });

    var tipo = normalizeCreditoClienteTipo(body.tipo);
    var monto = Number(body.monto || 0);
    var fechaPago = sanitizeText(body.fecha_pago, 24);
    var telefono = sanitizeText(body.telefono, 40);
    var detalle = sanitizeText(body.detalle, 1200);

    if (!fechaPago || !(monto > 0)) {
      return json(res, 400, { ok: false, error: "fecha y monto válidos son requeridos." });
    }

    var sel =
      supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/credito_client_form_submissions?id=eq." +
      encodeURIComponent(id) +
      "&select=id,approval_status";
    var rGet = await fetch(sel, {
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        Accept: "application/json",
      },
    });
    var rows = await rGet.json().catch(function () { return []; });
    var row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) return json(res, 404, { ok: false, error: "Envío no encontrado." });

    var st = String(row.approval_status || "");
    var allowedStatuses = ["pending_review", "needs_client_edit"];
    if (allowedStatuses.indexOf(st) < 0) {
      return json(res, 400, { ok: false, error: "Solo se puede editar un borrador o uno pendiente de corrección cliente." });
    }

    var nowIso = new Date().toISOString();
    var patch = {
      tipo: tipo,
      monto: monto,
      fecha_pago: fechaPago,
      telefono: telefono,
      detalle: detalle,
      updated_at: nowIso,
    };

    /** Si venía needs_client_edit, al editar desde gerencia volvemos a revisión cerrando el ciclo cliente. */
    if (st === "needs_client_edit") {
      patch.approval_status = "pending_review";
      patch.manager_feedback = null;
      patch.reviewed_at = null;
      patch.reviewed_by = null;
    }

    var qPatch =
      supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/credito_client_form_submissions?id=eq." +
      encodeURIComponent(id);
    var rPatch = await fetch(qPatch, {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: "Bearer " + serviceKey,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(patch),
    });
    if (!rPatch.ok) {
      var tx = await rPatch.text().catch(function () { return ""; });
      return json(res, 500, { ok: false, error: tx || ("HTTP " + rPatch.status) });
    }

    return json(res, 200, { ok: true, approval_status: patch.approval_status || "pending_review" });
  } catch (err) {
    return json(res, 500, { ok: false, error: err && err.message ? err.message : "internal error" });
  }
};
