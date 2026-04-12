/**
 * Expone solo URL + anon key (públicos). Nunca incluir service role aquí.
 * Variables en Vercel: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY
 */
module.exports = function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
    }
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var url = process.env.PUBLIC_SUPABASE_URL || '';
    var anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
    var magicLinkFunctionUrl = process.env.PUBLIC_MAGIC_LINK_LOGIN_URL || '';

    if (!url || !anonKey) {
        return res.status(503).json({
            error: 'Missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY in Vercel env',
        });
    }

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(200).json({
        url: url,
        anonKey: anonKey,
        magicLinkFunctionUrl: magicLinkFunctionUrl,
    });
};
