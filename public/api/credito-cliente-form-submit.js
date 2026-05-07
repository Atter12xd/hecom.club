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

function parseDataUrl(dataUrl) {
  var m = String(dataUrl || "").match(/^data:([a-z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/i);
  if (!m) return null;
  return { mime: m[1].toLowerCase(), b64: m[2] };
}

/** Vercel a veces entrega el body como string o Buffer; unificar a objeto. */
function parseRequestBody(req) {
  var b = req.body;
  if (b === undefined || b === null) return {};
  if (Buffer.isBuffer(b)) {
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

/** Un solo canal de tipos en negocio: recarga | amortizacion; mapea legacy y acentos. */
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

async function uploadToBucket(supabaseUrl, serviceKey, bucket, path, buffer, mimeType) {
  var u = supabaseUrl.replace(/\/$/, "") + "/storage/v1/object/" + encodeURIComponent(bucket) + "/" + path;
  var r = await fetch(u, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": mimeType || "application/octet-stream",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!r.ok) {
    var txt = await r.text().catch(function () { return ""; });
    throw new Error("storage " + bucket + ": " + (txt || ("HTTP " + r.status)));
  }
  return supabaseUrl.replace(/\/$/, "") + "/storage/v1/object/public/" + encodeURIComponent(bucket) + "/" + path;
}

async function insertRow(supabaseUrl, serviceKey, table, row) {
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
  if (!r.ok) {
    var txt = await r.text().catch(function () { return ""; });
    throw new Error("insert " + table + ": " + (txt || ("HTTP " + r.status)));
  }
  var data = await r.json().catch(function () { return []; });
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function patchRow(supabaseUrl, serviceKey, table, id, patch) {
  var q = supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + encodeURIComponent(table) + "?id=eq." + encodeURIComponent(id);
  var r = await fetch(q, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  if (!r.ok) {
    var txt = await r.text().catch(function () { return ""; });
    throw new Error("patch " + table + ": " + (txt || ("HTTP " + r.status)));
  }
  var data = await r.json().catch(function () { return []; });
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function getRowById(supabaseUrl, serviceKey, id) {
  var u =
    supabaseUrl.replace(/\/$/, "") +
    "/rest/v1/credito_client_form_submissions?id=eq." +
    encodeURIComponent(id) +
    "&select=*";
  var r = await fetch(u, {
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json" },
  });
  if (!r.ok) return null;
  var data = await r.json().catch(function () { return []; });
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
    var body = parseRequestBody(req);
    var clientId = sanitizeText(body.client_id, 80);
    if (!clientId) return json(res, 400, { ok: false, error: "client_id es requerido." });

    var tipo = normalizeCreditoClienteTipo(body.tipo);
    var fechaPago = sanitizeText(body.fecha_pago, 24);
    var clientName = sanitizeText(body.client_name, 140);
    var telefono = sanitizeText(body.telefono, 40);
    var detalle = sanitizeText(body.detalle, 1200);
    var monto = Number(body.monto || 0);
    var resubmitId = sanitizeText(body.submission_id || body.resubmit_id, 80);
    var removeComprobante =
      body.remove_comprobante === true ||
      body.remove_comprobante === "true" ||
      body.remove_comprobante === 1 ||
      body.remove_comprobante === "1";

    if (!fechaPago || !(monto > 0)) {
      return json(res, 400, { ok: false, error: "Completa fecha y monto valido." });
    }

    var comprobanteUrl = null;
    if (body.file_data_url) {
      var parsed = parseDataUrl(body.file_data_url);
      if (!parsed) return json(res, 400, { ok: false, error: "Comprobante invalido." });
      var mime = parsed.mime;
      if (!/^image\/(jpeg|jpg|png|webp)$/i.test(mime)) {
        return json(res, 400, { ok: false, error: "Solo imagen JPG, PNG o WEBP." });
      }
      var fileBuffer = Buffer.from(parsed.b64, "base64");
      if (fileBuffer.length > 4 * 1024 * 1024) {
        return json(res, 400, { ok: false, error: "Comprobante supera 4MB." });
      }
      var ext = mime.indexOf("png") >= 0 ? "png" : mime.indexOf("webp") >= 0 ? "webp" : "jpg";
      var filePath = "cliente-" + clientId + "/" + Date.now() + "-comprobante." + ext;
      var buckets = ["comprobantes_clientes", "comprobantes", "garantias_comprobantes", "avatars"];
      var uploadErr = null;
      for (var i = 0; i < buckets.length; i += 1) {
        try {
          comprobanteUrl = await uploadToBucket(supabaseUrl, serviceKey, buckets[i], filePath, fileBuffer, mime);
          break;
        } catch (e) {
          uploadErr = e;
        }
      }
      if (!comprobanteUrl && uploadErr) {
        return json(res, 500, { ok: false, error: "No se pudo subir comprobante: " + uploadErr.message });
      }
    }

    var nowIso = new Date().toISOString();
    var basePayload = {
      ua: sanitizeText(req.headers["user-agent"], 220),
      ip: sanitizeText(req.headers["x-forwarded-for"], 220),
    };

    /* Reenvío del cliente después de Pedir corrección */
    if (resubmitId) {
      var existing = await getRowById(supabaseUrl, serviceKey, resubmitId);
      if (!existing || String(existing.client_id) !== String(clientId)) {
        return json(res, 403, { ok: false, error: "No autorizado para actualizar este envío." });
      }
      var st = existing.approval_status || "";
      if (st !== "needs_client_edit") {
        return json(res, 400, { ok: false, error: "Este envío no está pendiente de corrección del cliente." });
      }
      var prevP = existing.payload && typeof existing.payload === "object" ? existing.payload : {};
      var patch = {
        tipo: tipo,
        monto: monto,
        fecha_pago: fechaPago,
        telefono: telefono,
        detalle: detalle,
        client_name: clientName || existing.client_name,
        approval_status: "pending_review",
        manager_feedback: null,
        reviewed_at: null,
        reviewed_by: null,
        updated_at: nowIso,
        payload: Object.assign({}, prevP, basePayload, { client_resubmit_at: nowIso }),
      };
      if (comprobanteUrl) patch.comprobante_url = comprobanteUrl;
      else if (removeComprobante) patch.comprobante_url = null;
      var patched = await patchRow(supabaseUrl, serviceKey, "credito_client_form_submissions", resubmitId, patch);
      return json(res, 200, {
        ok: true,
        id: patched && patched.id ? patched.id : resubmitId,
        table: "credito_client_form_submissions",
        approval_status: "pending_review",
        message: "Borrador reenviado. Un gerente lo revisará de nuevo.",
        data: patched,
      });
    }

    /** Nuevo borrador: siempre espera revisión gerente — no crear cobros/garantías hasta aceptación. */
    var draftRow = {
      client_id: clientId,
      client_name: clientName,
      tipo: tipo,
      monto: monto,
      fecha_pago: fechaPago,
      telefono: telefono,
      detalle: detalle,
      comprobante_url: comprobanteUrl,
      source: "credito_cliente_form",
      approval_status: "pending_review",
      manager_feedback: null,
      reviewed_at: null,
      reviewed_by: null,
      payload: basePayload,
    };

    var inserted = await insertRow(supabaseUrl, serviceKey, "credito_client_form_submissions", draftRow);
    return json(res, 200, {
      ok: true,
      id: inserted.id || null,
      table: "credito_client_form_submissions",
      approval_status: "pending_review",
      message:
        "Borrador guardado. Un gerente debe aceptar o solicitar cambios antes de registrar en cuenta.",
      data: inserted,
    });
  } catch (err) {
    return json(res, 500, { ok: false, error: err && err.message ? err.message : "internal error" });
  }
};
