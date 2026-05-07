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
    var clientId = sanitizeText(body.client_id, 80);
    if (!clientId) return json(res, 400, { ok: false, error: "client_id es requerido." });

    var tipo = sanitizeText(body.tipo, 40) || "garantia";
    var monto = Number(body.monto || 0);
    var fechaPago = sanitizeText(body.fecha_pago, 24);
    var clientName = sanitizeText(body.client_name, 140);
    var telefono = sanitizeText(body.telefono, 40);
    var detalle = sanitizeText(body.detalle, 1200);
    var comprobanteUrl = null;
    if (!fechaPago || !(monto > 0)) {
      return json(res, 400, { ok: false, error: "Completa fecha y monto valido." });
    }

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
      var ext = mime.indexOf("png") >= 0 ? "png" : (mime.indexOf("webp") >= 0 ? "webp" : "jpg");
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

    var commonRow = {
      client_id: clientId,
      client_name: clientName,
      tipo: tipo,
      monto: monto,
      fecha_pago: fechaPago,
      telefono: telefono,
      detalle: detalle,
      comprobante_url: comprobanteUrl,
      source: "credito_cliente_form",
      payload: {
        ua: sanitizeText(req.headers["user-agent"], 220),
        ip: sanitizeText(req.headers["x-forwarded-for"], 220),
      },
    };

    var attempts = [];
    if (tipo === "cobro" || tipo === "recarga") {
      attempts.push({
        table: "cobros",
        row: {
          client_id: clientId,
          fecha: fechaPago,
          monto: monto,
          metodo: tipo === "recarga" ? "recarga_cliente_form" : "cliente_form",
          codigo: detalle,
          comprobante_urls: comprobanteUrl ? [comprobanteUrl] : [],
        },
      });
    } else if (tipo === "garantia") {
      attempts.push({
        table: "garantias",
        row: {
          client_id: clientId,
          valor: monto,
          estado: "pendiente",
        },
      });
    }
    attempts.push({ table: "credito_client_form_submissions", row: commonRow });
    attempts.push({ table: "cliente_form_submissions", row: commonRow });

    var inserted = null;
    var usedTable = null;
    var insertErr = null;
    for (var t = 0; t < attempts.length; t += 1) {
      try {
        inserted = await insertRow(supabaseUrl, serviceKey, attempts[t].table, attempts[t].row);
        usedTable = attempts[t].table;
        break;
      } catch (e2) {
        insertErr = e2;
      }
    }
    if (!inserted) {
      return json(res, 500, {
        ok: false,
        error: "No se pudo guardar en Supabase. Revisa tablas de destino para el tipo enviado.",
        detail: insertErr ? insertErr.message : null,
      });
    }
    return json(res, 200, { ok: true, id: inserted.id || null, table: usedTable, data: inserted });
  } catch (err) {
    return json(res, 500, { ok: false, error: err && err.message ? err.message : "internal error" });
  }
};
