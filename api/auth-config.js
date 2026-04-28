/**
 * Mismo origen que /api/supabase-config: inyecta PUBLIC_* de Vercel en el cliente.
 * Pantallas cargan este script antes de Supabase UMD (misma fuente que /api/supabase-config).
 */
module.exports = function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method not allowed');
  }

  var url = (process.env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  var anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
  var marketingStorage = (process.env.PUBLIC_MARKETING_STORAGE_API || '').trim();

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  var hosts = JSON.stringify([
    'www.marketingconholistic.com',
    'marketingconholistic.com',
    'www.hecom.club',
    'hecom.club',
  ]);

  var lines = [
    'window.__SUPABASE_URL__=' + JSON.stringify(url) + ';',
    'window.__SUPABASE_ANON_KEY__=' + JSON.stringify(anonKey) + ';',
    'window.__MARKETING_STORAGE_API__=' + JSON.stringify(marketingStorage) + ';',
    'window.__APP_ORIGIN_FALLBACK__=' + JSON.stringify('https://www.hecom.club') + ';',
    'window.__KNOWN_APP_HOSTS__=' + hosts + ';',
  ];

  if (!url || !anonKey) {
    lines.push(
      'console.error("[Hecom] auth-config: definí PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY en Vercel (Environment Variables).");'
    );
  }

  return res.status(200).send(lines.join('\n'));
};
