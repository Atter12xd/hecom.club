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

async function fetchRows(supabaseUrl, serviceKey, table, query) {
  var u = supabaseUrl.replace(/\/$/, "") + "/rest/v1/" + encodeURIComponent(table) + "?" + query;
  var r = await fetch(u, {
    method: "GET",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      Accept: "application/json",
    },
  });
  if (!r.ok) {
    var txt = await r.text().catch(function () { return ""; });
    throw new Error("select " + table + ": " + (txt || ("HTTP " + r.status)));
  }
  return await r.json().catch(function () { return []; });
}

function statusLabel(s) {
  var m = {
    pending_review: "Borrador (revisión)",
    needs_client_edit: "Corrige cliente",
    accepted: "Aceptado",
    rejected: "Rechazado",
  };
  return m[s] || s || "—";
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { ok: false, error: "Method not allowed" });

  var supabaseUrl = getEnv("SUPABASE_URL") || getEnv("PUBLIC_SUPABASE_URL");
  var serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json(res, 500, { ok: false, error: "Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Vercel." });
  }

  try {
    var clientId = sanitizeText(req.query && req.query.clientId, 80);
    if (!clientId) return json(res, 400, { ok: false, error: "clientId es requerido." });

    var safeClient = encodeURIComponent("eq." + clientId);
    var all = [];

    try {
      var cobros = await fetchRows(
        supabaseUrl,
        serviceKey,
        "cobros",
        "select=id,client_id,fecha,monto,metodo,codigo,comprobante_urls,created_at&client_id=" +
          safeClient +
          "&order=created_at.desc&limit=12"
      );
      for (var i = 0; i < cobros.length; i += 1) {
        all.push({
          kind: cobros[i].metodo === "recarga_cliente_form" ? "recarga" : "cobro",
          amount: Number(cobros[i].monto || 0),
          date: cobros[i].fecha || cobros[i].created_at || null,
          note: cobros[i].codigo || "",
          proof:
            Array.isArray(cobros[i].comprobante_urls) && cobros[i].comprobante_urls[0]
              ? cobros[i].comprobante_urls[0]
              : null,
          source: "cobros",
          submissionId: null,
          approvalStatus: null,
          actionable: false,
        });
      }
    } catch (_) {}

    try {
      var garantias = await fetchRows(
        supabaseUrl,
        serviceKey,
        "garantias",
        "select=id,client_id,valor,estado,created_at&client_id=" +
          safeClient +
          "&order=created_at.desc&limit=12"
      );
      for (var j = 0; j < garantias.length; j += 1) {
        all.push({
          kind: "garantia",
          amount: Number(garantias[j].valor || 0),
          date: garantias[j].created_at || null,
          note: garantias[j].estado ? "Estado: " + garantias[j].estado : "",
          proof: null,
          source: "garantias",
          submissionId: null,
          approvalStatus: null,
          actionable: false,
        });
      }
    } catch (_) {}

    try {
      var forms = await fetchRows(
        supabaseUrl,
        serviceKey,
        "credito_client_form_submissions",
        "select=id,client_id,tipo,monto,fecha_pago,detalle,comprobante_url,created_at,approval_status,manager_feedback&client_id=" +
          safeClient +
          "&order=created_at.desc&limit=16"
      );
      for (var k = 0; k < forms.length; k += 1) {
        var ap = forms[k].approval_status || "pending_review";
        var feedback = forms[k].manager_feedback ? String(forms[k].manager_feedback) : "";
        var noteParts = [];
        if (feedback) noteParts.push("Gestor: " + feedback);
        if (forms[k].detalle) noteParts.push(String(forms[k].detalle));
        all.push({
          kind: forms[k].tipo || "formulario",
          amount: Number(forms[k].monto || 0),
          date: forms[k].fecha_pago || forms[k].created_at || null,
          note: noteParts.join(" · ") || "",
          proof: forms[k].comprobante_url || null,
          source: "credito_client_form_submissions",
          submissionId: forms[k].id || null,
          approvalStatus: ap,
          approvalLabel: statusLabel(ap),
          actionable: ap === "pending_review",
        });
      }
    } catch (_) {}

    all.sort(function (a, b) {
      var ta = a && a.date ? new Date(a.date).getTime() : 0;
      var tb = b && b.date ? new Date(b.date).getTime() : 0;
      return tb - ta;
    });

    var pendingOnly = [];
    try {
      pendingOnly = all.filter(function (x) {
        return x.source === "credito_client_form_submissions" && x.approvalStatus === "pending_review";
      });
    } catch (_) {}

    return json(res, 200, { ok: true, pendingCount: pendingOnly.length, items: all.slice(0, 24) });
  } catch (err) {
    return json(res, 500, { ok: false, error: err && err.message ? err.message : "internal error" });
  }
};
