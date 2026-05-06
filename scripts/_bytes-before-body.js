const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const body = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const b = s.indexOf(body);
console.log("last 120 chars before body:");
console.log(JSON.stringify(s.slice(b - 120, b)));
