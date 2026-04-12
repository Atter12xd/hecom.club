/**
 * Recibe solo metadatos de apertura de paneles (sin tokens ni URLs completas).
 * En Vercel: Functions → elegí el deployment → Logs, o `vercel logs`.
 */
module.exports = function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        return res.status(204).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    var raw = req.body;
    if (Buffer.isBuffer(raw)) {
        raw = raw.toString('utf8');
    }
    var data = {};
    if (raw && typeof raw === 'object' && !Buffer.isBuffer(raw)) {
        data = raw;
    } else if (typeof raw === 'string') {
        try {
            data = JSON.parse(raw || '{}');
        } catch (_) {
            data = {};
        }
    }

    var safe = {
        ts: data.ts || new Date().toISOString(),
        step: String(data.step || '').slice(0, 80),
        panel: String(data.panel || '').slice(0, 80),
        targetHost: String(data.targetHost || '').slice(0, 120),
        targetPath: String(data.targetPath || '').slice(0, 200),
        hasSnapshot: data.hasSnapshot === true,
        hasAccess: data.hasAccess === true,
        hasRefresh: data.hasRefresh === true,
        usedHandoff: data.usedHandoff === true,
        finalUrlLen: typeof data.finalUrlLen === 'number' ? data.finalUrlLen : null,
        hashLen: typeof data.hashLen === 'number' ? data.hashLen : null,
        syncPopupOpened: data.syncPopupOpened === true,
        err: String(data.err || '').slice(0, 240),
    };

    console.log('[api/handoff-log]', JSON.stringify(safe));

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(204).end();
};
