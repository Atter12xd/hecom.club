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

async function sbDeleteById(supabaseUrl, serviceKey, table, rowId) {
  if (!rowId) return false;
  var u =
    supabaseUrl.replace(/\/$/, "") +
    "/rest/v1/" +
    encodeURIComponent(table) +
    "?id=eq." +
    encodeURIComponent(String(rowId));
  var r = await fetch(u, {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      Prefer: "return=representation",
    },
  });
  var txt = await r.text().catch(function () { return ""; });
  if (!r.ok) throw new Error("DELETE " + table + ": " + txt);
  return true;
}

/** Aceptaciones anteriores sin applied_row_id: buscar último cobro/garantía que coincida con el formulario. */
async function findLegacyCobroFormulario(supabaseUrl, serviceKey, row) {
  var cid = encodeURIComponent(row.client_id);
  var fecha = encodeURIComponent(String(row.fecha_pago || ""));
  var monto = Number(row.monto || 0);
  if (!(monto > 0) || !fecha || !cid) return null;
  var q =
    "client_id=eq." +
    cid +
    "&fecha=eq." +
    fecha +
    "&monto=eq." +
    monto +
    "&select=id,metodo,codigo,created_at&order=created_at.desc&limit=15";
  var u = supabaseUrl.replace(/\/$/, "") + "/rest/v1/cobros?" + q;
  var r = await fetch(u, {
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json" },
  });
  if (!r.ok) return null;
  var rows = await r.json().catch(function () { return []; });
  if (!Array.isArray(rows)) return null;
  for (var i = 0; i < rows.length; i += 1) {
    var m = rows[i].metodo ? String(rows[i].metodo) : "";
    if (/formulario/i.test(m)) return rows[i];
  }
  return null;
}

async function findLegacyGarantiaFormulario(supabaseUrl, serviceKey, row) {
  var cid = encodeURIComponent(row.client_id);
  var monto = Number(row.monto || 0);
  if (!(monto > 0) || !cid) return null;
  var q =
    "client_id=eq." +
    cid +
    "&valor=eq." +
    monto +
    "&select=id,tipo,descripcion,created_at&order=created_at.desc&limit=15";
  var u = supabaseUrl.replace(/\/$/, "") + "/rest/v1/garantias?" + q;
  var r = await fetch(u, {
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json" },
  });
  if (!r.ok) return null;
  var rows = await r.json().catch(function () { return []; });
  if (!Array.isArray(rows)) return null;
  for (var i = 0; i < rows.length; i += 1) {
    var t = rows[i].tipo ? String(rows[i].tipo) : "";
    if (/formulario/i.test(t)) return rows[i];
  }
  return null;
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
    var action = sanitizeText(body.action, 36);
    var note = sanitizeText(body.note, 2000);
    var reviewedBy = sanitizeText(body.reviewed_by, 200);

    if (!id) return json(res, 400, { ok: false, error: "id es requerido." });

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
    var rowsSel = await sbGet(base, h);
    var row = Array.isArray(rowsSel) && rowsSel[0] ? rowsSel[0] : null;
    if (!row) return json(res, 404, { ok: false, error: "Borrador no encontrado." });

    if (action === "undo_accept") {
      var statU = row.approval_status || "";
      if (statU !== "accepted") {
        return json(res, 400, { ok: false, error: "Solo se puede deshacer un envío ya aceptado." });
      }
      var p = row.payload && typeof row.payload === "object" ? row.payload : {};
      var tTable = p.applied_table ? String(p.applied_table).trim().toLowerCase() : "";
      var tRowId = p.applied_row_id ? String(p.applied_row_id).trim() : "";
      var nowU = new Date().toISOString();
      var deleted = false;

      if (tTable === "cobros" && tRowId) {
        await sbDeleteById(supabaseUrl, serviceKey, "cobros", tRowId);
        deleted = true;
      } else if (tTable === "garantias" && tRowId) {
        await sbDeleteById(supabaseUrl, serviceKey, "garantias", tRowId);
        deleted = true;
      } else {
        var tipoR = row.tipo || "";
        if (tipoR === "garantia") {
          var lg = await findLegacyGarantiaFormulario(supabaseUrl, serviceKey, row);
          if (lg && lg.id) {
            await sbDeleteById(supabaseUrl, serviceKey, "garantias", lg.id);
            deleted = true;
          }
        } else {
          var lc = await findLegacyCobroFormulario(supabaseUrl, serviceKey, row);
          if (lc && lc.id) {
            await sbDeleteById(supabaseUrl, serviceKey, "cobros", lc.id);
            deleted = true;
          }
        }
      }

      var nextPayloadU = Object.assign({}, p, {
        undo_accept_at: nowU,
        undone_by: reviewedBy || null,
      });
      delete nextPayloadU.applied_table;
      delete nextPayloadU.applied_row_id;
      delete nextPayloadU.applied_at;
      delete nextPayloadU.applied_tipo;

      await sbPatch(supabaseUrl, serviceKey, "credito_client_form_submissions", "id=eq." + encodeURIComponent(id), {
        approval_status: "pending_review",
        manager_feedback:
          "Revertido tras aceptar por error. Volvé a revisar o rechazar." +
          (deleted ? "" : " (No se encontró cobro/garantía automático: borrá el movimiento manual en finanzas si hace falta.)"),
        reviewed_at: nowU,
        reviewed_by: reviewedBy || row.reviewed_by || null,
        updated_at: nowU,
        payload: nextPayloadU,
      });

      return json(res, 200, {
        ok: true,
        approval_status: "pending_review",
        deleted_linked_row: deleted,
      });
    }

    if (!action || ["accept", "reject", "request_edit"].indexOf(action) < 0) {
      return json(res, 400, {
        ok: false,
        error: "action debe ser accept, reject, request_edit o undo_accept.",
      });
    }

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

    var inserted = null;
    var appliedTable = null;
    if (tipo === "cobro" || tipo === "recarga" || tipo === "amortizacion") {
      var metodo =
        tipo === "recarga"
          ? "Recarga cliente (formulario)"
          : tipo === "amortizacion"
          ? "Amortización cliente (formulario)"
          : "Cobro cliente (formulario)";
      inserted = await sbInsert(supabaseUrl, serviceKey, "cobros", {
        client_id: clientId,
        fecha: fecha,
        monto: monto,
        metodo: metodo,
        codigo: detalle || "Formulario cliente",
        comprobante_urls: urls.length ? urls : null,
      });
      appliedTable = "cobros";
    } else if (tipo === "garantia") {
      inserted = await sbInsert(supabaseUrl, serviceKey, "garantias", {
        client_id: clientId,
        tipo: "Formulario cliente",
        descripcion: detalle || "Garantía enviada por formulario",
        valor: monto,
        estado: "Vigente",
      });
      appliedTable = "garantias";
    }

    var prevPayload = row.payload && typeof row.payload === "object" ? row.payload : {};
    var baseP = Object.assign({}, prevPayload);
    delete baseP.applied_table;
    delete baseP.applied_row_id;
    delete baseP.applied_at;
    delete baseP.applied_tipo;
    var nextPayload = Object.assign({}, baseP, {
      applied_at: now,
      applied_tipo: tipo,
      applied_table: appliedTable || null,
      applied_row_id: inserted && inserted.id ? String(inserted.id) : null,
    });

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
