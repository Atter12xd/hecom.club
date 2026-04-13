// Edge Function: magic link y código por correo, ambos vía Resend cuando Supabase devuelve `email_otp` en generateLink.
// Código: lo genera Auth (no es “random” nuestro); es de un solo uso y caduca como el enlace.
// Fallback código sin email_otp: signInWithOtp (correo plantilla Supabase, no Resend) — raro en proyectos actuales.
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM; SUPABASE_ANON_KEY solo para ese fallback.
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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Dominios a los que sí puede redirigir el magic link (además de marketing holistic). */
function isAllowedRedirectHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "www.marketingconholistic.com" || h === "marketingconholistic.com") return true;
  if (h === "www.hecom.club" || h === "hecom.club") return true;
  if (h.endsWith(".hecom.club")) return true;
  return false;
}

async function sendEmailResend(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no configurado" };
  const from = Deno.env.get("RESEND_FROM") || "Holistic Marketing <onboarding@resend.dev>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from, to, subject, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.message || data?.error || res.statusText };
  return { ok: true };
}

async function sendMagicLinkEmailResend(to: string, actionLink: string): Promise<{ ok: boolean; error?: string }> {
  const safeHref = escapeHtml(actionLink);
  const html = `
    <p>Hola,</p>
    <p>Usá el siguiente enlace para entrar a tu panel (caduca en 1 hora):</p>
    <p style="margin: 24px 0;"><a href="${safeHref}" style="display: inline-block; padding: 12px 24px; background: #1b2559; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Entrar al panel</a></p>
    <p style="color: #666; font-size: 13px;">Si no pediste este enlace, podés ignorar este correo.</p>
  `;
  return sendEmailResend(to, "Tu enlace para entrar — Holistic Marketing", html);
}

/** Mismo remitente/marca que el magic link; el OTP lo generó Supabase en generateLink. */
async function sendOtpEmailResend(to: string, otp: string, actionLink: string | undefined): Promise<{ ok: boolean; error?: string }> {
  const code = escapeHtml(otp.replace(/\s/g, ""));
  const linkBlock =
    actionLink && actionLink.length > 0
      ? `<p style="margin: 20px 0 0; font-size: 14px; color: #555;">Si preferís abrir un enlace en lugar del código:</p>
    <p style="margin: 8px 0 0;"><a href="${escapeHtml(actionLink)}" style="display: inline-block; padding: 10px 20px; background: #1b2559; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Entrar con enlace</a></p>`
      : "";
  const html = `
    <p>Hola,</p>
    <p>Tu código para entrar (un solo uso, caduca pronto):</p>
    <p style="margin: 20px 0; padding: 20px 16px; background: #f4f6fb; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
      <span style="font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.25em; color: #1b2559;">${code}</span>
    </p>
    <p style="color: #444; font-size: 14px;">Ingresalo en la pantalla de inicio de sesión donde elegiste «Código por correo».</p>
    ${linkBlock}
    <p style="color: #666; font-size: 13px; margin-top: 24px;">Si no pediste este código, podés ignorar este correo.</p>
  `;
  return sendEmailResend(to, "Tu código para entrar — Holistic Marketing", html);
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
      return new Response(JSON.stringify({ error: linkError.message || "Error al generar el acceso" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const actionLink = linkData?.properties?.action_link;
    const emailOtp = linkData?.properties?.email_otp;

    if (method === "code") {
      const otpStr = emailOtp != null && String(emailOtp).trim() !== "" ? String(emailOtp).trim() : "";
      if (otpStr) {
        const sendResult = await sendOtpEmailResend(row.email, otpStr, actionLink || undefined);
        if (sendResult.ok) {
          return new Response(
            JSON.stringify({
              ok: true,
              method: "code",
              message: "Revisá tu correo: te enviamos el código con el mismo remitente que el enlace mágico.",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const resendHint = /testing|resend\.dev|domain|verify/i.test(sendResult.error || "")
          ? " Con el dominio de prueba de Resend solo se puede enviar al correo de tu cuenta."
          : "";
        return new Response(
          JSON.stringify({
            ok: true,
            method: "code",
            message: "No se pudo enviar el correo con Resend (" + (sendResult.error || "") + ")." + resendHint,
            link: actionLink,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      if (!anonKey) {
        return new Response(
          JSON.stringify({
            error:
              "Este proyecto no devolvió código en generate_link. Agregá SUPABASE_ANON_KEY para el envío por plantilla Auth, o actualizá Supabase Auth.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const anon = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { error: otpError } = await anon.auth.signInWithOtp({
        email: row.email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      });
      if (otpError) {
        return new Response(
          JSON.stringify({ error: otpError.message || "No se pudo enviar el código." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          method: "code",
          message:
            "Revisá tu correo (puede ser la plantilla de Supabase, no Resend). Si querés el mismo diseño que el enlace, el servidor debe devolver email_otp en generate_link.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!actionLink) {
      return new Response(JSON.stringify({ error: "No se pudo generar el link" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sendResult = await sendMagicLinkEmailResend(row.email, actionLink);
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
