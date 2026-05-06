var store = require("./_miplataStore.js");

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  var st = store.getStore();

  if (req.method === "GET") {
    return res.status(200).json(st.debts.slice());
  }

  if (req.method === "POST") {
    var body = req.body && typeof req.body === "object" ? req.body : {};
    var row = Object.assign({}, body, { id: store.newId() });
    st.debts.push(row);
    return res.status(201).json(row);
  }

  return res.status(405).json({ error: "Method not allowed" });
};
