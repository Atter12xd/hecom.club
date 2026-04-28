/**
 * Cliente Supabase para páginas estáticas.
 * Config vía GET /api/supabase-config (env PUBLIC_* en Vercel).
 */
var _clientPromise = null;

function storageKeyForSupabaseUrl(url) {
    try {
        var ref = new URL(String(url).replace(/\/$/, '')).hostname.split('.')[0];
        return ref ? 'sb-' + ref + '-auth-token' : undefined;
    } catch (_) {
        return undefined;
    }
}

export async function getPublicSupabaseConfig() {
    var res = await fetch('/api/supabase-config', { credentials: 'same-origin' });
    if (!res.ok) {
        var errBody = await res.text();
        throw new Error(errBody || 'No se pudo cargar la configuración de Supabase');
    }
    var cfg = await res.json();
    if (!cfg.url || !cfg.anonKey) {
        throw new Error('Respuesta de configuración incompleta');
    }
    return {
        url: cfg.url.replace(/\/$/, ''),
        anonKey: cfg.anonKey,
        magicLinkFunctionUrl: (cfg.magicLinkFunctionUrl || '').trim(),
    };
}

/**
 * Llama al Edge Function magic-link-login (mismo proyecto que PUBLIC_SUPABASE_URL).
 * Opcional en Vercel (y en /api/supabase-config): PUBLIC_MAGIC_LINK_LOGIN_URL = URL completa.
 * @param {'link'|'code'|undefined} method "link" = enlace por Resend; "code" = código por Resend si Auth devuelve email_otp en generate_link, si no correo plantilla Supabase.
 */
export async function invokeMagicLinkLogin(email, redirectTo, method) {
    var m = method === 'code' ? 'code' : 'link';
    var cfg = await getPublicSupabaseConfig();
    var fnUrl = cfg.magicLinkFunctionUrl || cfg.url + '/functions/v1/magic-link-login';
    var res = await fetch(fnUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + cfg.anonKey,
            apikey: cfg.anonKey,
        },
        body: JSON.stringify({
            email: email,
            method: m,
            redirect_to: redirectTo,
        }),
    });
    var data = await res.json().catch(function () {
        return {};
    });
    if (!res.ok) {
        throw new Error(data.error || data.message || 'Error ' + res.status);
    }
    return data;
}

export function getSupabaseClient() {
    if (_clientPromise) return _clientPromise;
    _clientPromise = (async function () {
        var res = await fetch('/api/supabase-config', { credentials: 'same-origin' });
        if (!res.ok) {
            var errBody = await res.text();
            throw new Error(errBody || 'No se pudo cargar la configuración de Supabase');
        }
        var cfg = await res.json();
        if (!cfg.url || !cfg.anonKey) {
            throw new Error('Respuesta de configuración incompleta');
        }
        var mod = await import('https://esm.sh/@supabase/supabase-js@2.49.1');
        var sk = storageKeyForSupabaseUrl(cfg.url);
        var authOpts = {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        };
        if (sk) authOpts.storageKey = sk;
        return mod.createClient(cfg.url, cfg.anonKey, {
            auth: authOpts,
        });
    })();
    return _clientPromise;
}
