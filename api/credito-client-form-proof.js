/** Redirige a URL firmada de Storage (bucket privado) para comprobantes de formulario cliente. */

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

function parseBucketPathFromPublicUrl(fullUrl) {
  var s = String(fullUrl || "").trim().split("?")[0];
  var needle = "/storage/v1/object/public/";
  var i = s.indexOf(needle);
  if (i === -1) return null;
  var rest = s.slice(i + needle.length);
  var slash = rest.indexOf("/");
  if (slash <= 0) return null;
  var bucketRaw = rest.slice(0, slash);
  var objectPath = rest.slice(slash + 1);
  if (!objectPath) return null;
  try {
    return { bucket: decodeURIComponent(bucketRaw), path: objectPath };
  } catch (_) {
    return { bucket: bucketRaw, path: objectPath };
  }
}

async function fetchSubmission(supabaseUrl, serviceKey, id) {
  var u =
    supabaseUrl.replace(/\/$/, "") +
    "/rest/v1/credito_client_form_submissions?id=eq." +
    encodeURIComponent(id) +
    "&select=id,client_id,comprobante_url";
  var r = await fetch(u, {
    headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey, Accept: "application/json" },
  });
  var data = await r.json().catch(function () { return []; });
  return Array.isArray(data) && data[0] ? data[0] : null;
}

async function createSignedAbsoluteUrl(supabaseUrl, serviceKey, bucket, objectPath, expiresSeconds) {
  var proj = supabaseUrl.replace(/\/$/, "");
  var storageV1 = proj + "/storage/v1";
  /* Misma forma que @supabase/storage-js: POST /storage/v1/object/sign/{bucketId}/{relativePath dentro del bucket} */
  var inner = bucket + "/" + String(objectPath || "").replace(/^\/+/, "");
  var signUrl = storageV1 + "/object/sign/" + inner.split("/").map(encodeURIComponent).join("/");

  var r = await fetch(signUrl, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: "Bearer " + serviceKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      expiresIn: Math.min(Math.max(Number(expiresSeconds) || 3600, 60), 604800),
    }),
  });

  var raw = await r.text().catch(function () { return ""; });
  var j = null;
  try {
    j = JSON.parse(raw);
  } catch (_) {}

  var frag =
    (j && (j.signedURL || j.signedUrl || j.signed_URL)) ||
    "";
  frag = String(frag).trim();

  if (!frag) return null;
  if (/^https?:\/\//i.test(frag)) return frag;
  var join = frag.charAt(0) === "/" ? frag : "/" + frag;
  return storageV1 + join;
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }
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

    var row = await fetchSubmission(supabaseUrl, serviceKey, submissionId);
    if (!row) return json(res, 404, { ok: false, error: "No encontrado." });
    if (String(row.client_id) !== String(clientId)) {
      return json(res, 403, { ok: false, error: "No autorizado." });
    }

    var proofUrl = row.comprobante_url ? String(row.comprobante_url).trim() : "";
    if (!proofUrl) return json(res, 404, { ok: false, error: "No hay comprobante." });

    var parsed = parseBucketPathFromPublicUrl(proofUrl);
    if (!parsed) {
      res.status(302).setHeader("Location", proofUrl);
      res.setHeader("Cache-Control", "no-store");
      return res.end();
    }

    var signed = await createSignedAbsoluteUrl(
      supabaseUrl,
      serviceKey,
      parsed.bucket,
      parsed.path,
      3600
    );
    var dest = signed || proofUrl;
    res.status(302).setHeader("Location", dest);
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  } catch (err) {
    return json(res, 500, {
      ok: false,
      error: err && err.message ? err.message : "internal error",
    });
  }
};
