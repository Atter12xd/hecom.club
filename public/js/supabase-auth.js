/**
 * Cliente Supabase para páginas estáticas.
 * Config vía GET /api/supabase-config (env PUBLIC_* en Vercel).
 */
var _clientPromise = null;

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
        return mod.createClient(cfg.url, cfg.anonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
            },
        });
    })();
    return _clientPromise;
}
