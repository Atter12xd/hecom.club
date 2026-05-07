/** Gerente: aceptar | rechazar | pedir correccion sobre un borrador de formulario cliente. */

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

async function sbGet(url, headers) {
  var r = await fetch(url, { method: "GET", headers: headers });
  var txt = await r.text().catch(function () { return ""; });
  if (!r.ok) throw new Error(txt || ("HTTP " + r.status));
  try {
    return JSON.parse(txt);
  } catch (_) {
    return [];
  }
}

async function sbPatch(supabaseUrl, serviceKey, table, query, patch) {
  var u =
    supabaseUrl.replace(/\/$/, "") +
    "/rest/v1/" +
    encodeURIComponent(table) +
    "?" +
    query;
  var r = await fetch(u, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  var txt = await r.text().catch(function () { return ""; });
  if (!r.ok) throw new Error("PATCH " + table + ": " + txt);
  try {
    var data = JSON.parse(txt);
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

async function sbInsert(supabaseUrl, serviceKey, table, row) {
  var u = supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + encodeURIComponent(table);
  var r = await fetch(u, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });
  var txt = await r.text().catch(function () { return ""; });
  if (!r.ok) throw new Error("insert " + table + ": " + txt);
  var data = JSON.parse(txt);
  return Array.isArray(data) && data[0] ? data[0] : null;
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
    var body = req.body || {};
    var id = sanitizeText(body.id, 80);
    var action = sanitizeText(body.action, 32);
    var note = sanitizeText(body.note, 2000);
    var reviewedBy = sanitizeText(body.reviewed_by, 200);

    if (!id) return json(res, 400, { ok: false, error: "id es requerido." });
    if (!action || ["accept", "reject", "request_edit"].indexOf(action) < 0) {
      return json(res, 400, { ok: false, error: "action debe ser accept, reject o request_edit." });
    }

    var h = {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      Accept: "application/json",
    };
    var base =
      supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/credito_client_form_submissions?id=eq." +
      encodeURIComponent(id) +
      "&select=*";
    var rows = await sbGet(base, h);
    var row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    if (!row) return json(res, 404, { ok: false, error: "Borrador no encontrado." });

    var status = row.approval_status || "pending_review";
    if (status !== "pending_review") {
      return json(res, 400, { ok: false, error: "Solo se puede actuar sobre borradores en revision (pending_review)." });
    }

    var now = new Date().toISOString();

    if (action === "reject") {
      await sbPatch(supabaseUrl, serviceKey, "credito_client_form_submissions", "id=eq." + encodeURIComponent(id), {
        approval_status: "rejected",
        manager_feedback: note || "Rechazado.",
        reviewed_at: now,
        reviewed_by: reviewedBy || null,
        updated_at: now,
      });
      return json(res, 200, { ok: true, approval_status: "rejected" });
    }

    if (action === "request_edit") {
      if (!note) return json(res, 400, { ok: false, error: "Incluye un mensaje para el cliente (campo note)." });
      await sbPatch(supabaseUrl, serviceKey, "credito_client_form_submissions", "id=eq." + encodeURIComponent(id), {
        approval_status: "needs_client_edit",
        manager_feedback: note,
        reviewed_at: now,
        reviewed_by: reviewedBy || null,
        updated_at: now,
      });
      return json(res, 200, { ok: true, approval_status: "needs_client_edit" });
    }

    /* accept */
    var tipo = row.tipo || "garantia";
    var monto = Number(row.monto || 0);
    var fecha = row.fecha_pago || null;
    var clientId = row.client_id;
    var urls = [];
    if (row.comprobante_url) urls = [String(row.comprobante_url)];
    var detalle = row.detalle || null;

    if (tipo === "cobro" || tipo === "recarga" || tipo === "amortizacion") {
      var metodo =
        tipo === "recarga"
          ? "Recarga cliente (formulario)"
          : tipo === "amortizacion"
          ? "Amortización cliente (formulario)"
          : "Cobro cliente (formulario)";
      await sbInsert(supabaseUrl, serviceKey, "cobros", {
        client_id: clientId,
        fecha: fecha,
        monto: monto,
        metodo: metodo,
        codigo: detalle || "Formulario cliente",
        comprobante_urls: urls.length ? urls : null,
      });
    } else if (tipo === "garantia") {
      await sbInsert(supabaseUrl, serviceKey, "garantias", {
        client_id: clientId,
        tipo: "Formulario cliente",
        descripcion: detalle || "Garantía enviada por formulario",
        valor: monto,
        estado: "Vigente",
      });
    }

    var prevPayload = row.payload && typeof row.payload === "object" ? row.payload : {};
    var nextPayload = Object.assign({}, prevPayload, { applied_at: now, applied_tipo: tipo });

    await sbPatch(supabaseUrl, serviceKey, "credito_client_form_submissions", "id=eq." + encodeURIComponent(id), {
      approval_status: "accepted",
      manager_feedback: note || null,
      reviewed_at: now,
      reviewed_by: reviewedBy || null,
      updated_at: now,
      payload: nextPayload,
    });

    return json(res, 200, { ok: true, approval_status: "accepted" });
  } catch (err) {
    return json(res, 500, { ok: false, error: err && err.message ? err.message : "internal error" });
  }
};
