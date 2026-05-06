var store = require("./_miplataStore.js");

function filterByDate(rows, from, to) {
  if (!from || !to) return rows.slice();
  var out = [];
  for (var i = 0; i < rows.length; i++) {
    var d = String(rows[i].date || "");
    if (d >= String(from) && d <= String(to)) out.push(rows[i]);
  }
  return out;
}

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  var st = store.getStore();

  if (req.method === "GET") {
    var from = (req.query && req.query.from) || "";
    var to = (req.query && req.query.to) || "";
    if (from && to) {
      return res.status(200).json(filterByDate(st.expenses, from, to));
    }
    return res.status(200).json(st.expenses.slice());
  }

  if (req.method === "POST") {
    var body = req.body && typeof req.body === "object" ? req.body : {};
    var row = Object.assign({}, body, { id: store.newId() });
    st.expenses.push(row);
    return res.status(201).json(row);
  }

  return res.status(405).json({ error: "Method not allowed" });
};
