var store = require("../_miplataStore.js");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  var id = req.query && req.query.id ? String(req.query.id) : "";
  var st = store.getStore();
  var ix = -1;
  for (var i = 0; i < st.loans.length; i++) {
    if (String(st.loans[i].id) === id) {
      ix = i;
      break;
    }
  }
  if (ix < 0) {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method === "DELETE") {
    st.loans.splice(ix, 1);
    return res.status(204).end();
  }

  if (req.method === "PATCH") {
    var patch = req.body && typeof req.body === "object" ? req.body : {};
    st.loans[ix] = Object.assign({}, st.loans[ix], patch, { id: st.loans[ix].id });
    return res.status(200).json(st.loans[ix]);
  }

  return res.status(405).json({ error: "Method not allowed" });
};
