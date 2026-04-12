// Edge Function: login por magic link (o validación OTP con method: "code").
// Desplegar: supabase functions deploy magic-link-login --no-verify-jwt (o con JWT según tu setup).
// Secrets en Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM, APP_URL (opcional).
//
// Cambios vs. versión solo marketing: redirect permitido también para hecom.club (www, apex y subdominios).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getAppUrl(): string {
  const url = Deno.env.get("APP_URL") || Deno.env.get("PUBLIC_APP_URL") || "";
  if (url) return url.replace(/\/$/, "");
  return "https://www.marketingconholistic.com/credito";
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

/** Dominios a los que sí puede redirigir el magic link (además de marketing holistic). */
function isAllowedRedirectHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "www.marketingconholistic.com" || h === "marketingconholistic.com") return true;
  if (h === "www.hecom.club" || h === "hecom.club") return true;
  if (h.endsWith(".hecom.club")) return true;
  return false;
}

async function sendEmailResend(to: string, actionLink: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurado" };
  const from = Deno.env.get("RESEND_FROM") || "Holistic Marketing <onboarding@resend.dev>";
  const subject = "Tu enlace para entrar — Holistic Marketing";
  const html = `
    <p>Hola,</p>
    <p>Usá el siguiente enlace para entrar a tu panel (caduca en 1 hora):</p>
    <p style="margin: 24px 0;"><a href="${actionLink}" style="display: inline-block; padding: 12px 24px; background: #1b2559; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Entrar al panel</a></p>
    <p style="color: #666; font-size: 13px;">Si no pediste este enlace, podés ignorar este correo.</p>
  `;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message || data?.error || res.statusText };
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = body.email ?? body.e ?? "";
    const email = normalizeEmail(rawEmail);
    const method = (body.method ?? "link") === "code" ? "code" : "link";
    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Indicá un correo válido." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Configuración del servidor incompleta" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: gerenteRow } = await supabase.from("gerentes").select("email").ilike("email", email).maybeSingle();
    const { data: accesoRow } = await supabase.from("clientes_acceso").select("email").ilike("email", email).maybeSingle();
    const allowed = !!(gerenteRow || accesoRow);

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "Correo no registrado. Solo pueden entrar gerentes y clientes con acceso." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (method === "code") {
      return new Response(
        JSON.stringify({ ok: true, use_otp: true, message: "Correo autorizado. Enviá el código desde la app." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const row = gerenteRow || accesoRow!;
    const rawRedirect = body.redirect_to ?? body.redirectTo;
    const trimmedRedirect = typeof rawRedirect === "string" ? rawRedirect.trim() : "";
    let appUrl = trimmedRedirect || getAppUrl();
    try {
      const u = new URL(appUrl.startsWith("http") ? appUrl : `https://${appUrl}`);
      const h = u.hostname.toLowerCase();
      const looksLikeForeignVercel = h.endsWith(".vercel.app") && h.indexOf("marketingconholistic") < 0 && h.indexOf("holistic") < 0 && h.indexOf("hecom") < 0;
      if (h.includes("cmr-chatbot") || looksLikeForeignVercel) {
        if (trimmedRedirect) {
          try {
            const tr = new URL(trimmedRedirect.startsWith("http") ? trimmedRedirect : `https://${trimmedRedirect}`);
            const th = tr.hostname.toLowerCase();
            if (isAllowedRedirectHost(th)) {
              appUrl = trimmedRedirect;
            } else {
              appUrl = "https://www.marketingconholistic.com/credito";
            }
          } catch {
            appUrl = "https://www.marketingconholistic.com/credito";
          }
        } else {
          appUrl = "https://www.marketingconholistic.com/credito";
        }
      }
    } catch {
      /* seguir con appUrl */
    }
    const redirectTo = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: row.email,
      options: { redirectTo },
    });
    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message || "Error al generar el link" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      return new Response(JSON.stringify({ error: "No se pudo generar el link" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sendResult = await sendEmailResend(row.email, actionLink);
    if (sendResult.ok) {
      return new Response(
        JSON.stringify({ ok: true, message: "Revisá tu correo. Abrí el enlace para entrar al panel." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const resendHint = /testing|resend\.dev|domain|verify/i.test(sendResult.error || "")
      ? " Con el dominio de prueba de Resend solo se puede enviar al correo de tu cuenta."
      : "";
    return new Response(
      JSON.stringify({ ok: true, message: "No se pudo enviar el correo (" + (sendResult.error || "") + ")." + resendHint, link: actionLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[magic-link-login]", e);
    return new Response(JSON.stringify({ error: e?.message || "Error interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
