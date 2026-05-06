const fs = require("fs");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const a = s.indexOf('Do(rt)]}),h.jsxs("div",{className:"hm-report-total-wrap"');
const b = s.indexOf('h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"', a);
const mid = s.slice(a + "Do(rt)]}),".length, b);
console.log("mid length", mid.length);
console.log("starts", mid.slice(0, 60));
console.log("ends", mid.slice(-80));
