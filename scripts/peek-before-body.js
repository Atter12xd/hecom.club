const fs = require("fs");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const needle = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const i = s.indexOf(needle);
console.log("idx", i);
console.log(JSON.stringify(s.slice(i - 120, i)));
