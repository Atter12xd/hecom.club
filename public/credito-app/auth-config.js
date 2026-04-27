(function () {
  window.__SUPABASE_URL__ = window.__SUPABASE_URL__ || "";
  window.__SUPABASE_ANON_KEY__ = window.__SUPABASE_ANON_KEY__ || "";
  window.__MARKETING_STORAGE_API__ = window.__MARKETING_STORAGE_API__ || "";
  window.__APP_ORIGIN_FALLBACK__ = window.__APP_ORIGIN_FALLBACK__ || "https://www.hecom.club";
  window.__KNOWN_APP_HOSTS__ = window.__KNOWN_APP_HOSTS__ || [
    "www.marketingconholistic.com",
    "marketingconholistic.com",
    "www.hecom.club",
    "hecom.club",
  ];

  try {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/supabase-config", false);
    xhr.send(null);
    if (xhr.status >= 200 && xhr.status < 300) {
      var cfg = JSON.parse(xhr.responseText || "{}");
      if (cfg && cfg.url && cfg.anonKey) {
        window.__SUPABASE_URL__ = String(cfg.url);
        window.__SUPABASE_ANON_KEY__ = String(cfg.anonKey);
      }
    }
  } catch (_) {
    // Dejar fallback en blanco; la app mostrará el error de config si aplica.
  }
})();
