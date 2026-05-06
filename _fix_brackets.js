const fs = require("fs");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const bad =
  'children:[Kt," · ",Do(ut)," – ",Do(rt)]})}),h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const good =
  'children:[Kt," · ",Do(ut)," – ",Do(rt)]})]})]})]})}),h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
if (!s.includes(bad)) {
  console.error("pattern not found");
  process.exit(1);
}
fs.writeFileSync("credito-app/credito-app.js", s.replace(bad, good));
console.log("fixed dashboard");
