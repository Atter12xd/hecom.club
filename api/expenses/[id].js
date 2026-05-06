var store = require("../_miplataStore.js");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  var id = req.query && req.query.id ? String(req.query.id) : "";
  var st = store.getStore();
  var ix = -1;
  for (var i = 0; i < st.expenses.length; i++) {
    if (String(st.expenses[i].id) === id) {
      ix = i;
      break;
    }
  }
  if (ix < 0) {
    return res.status(404).json({ error: "Not found" });
  }
  st.expenses.splice(ix, 1);
  return res.status(204).end();
};
