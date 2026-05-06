const fs = require("fs");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const needle = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const i = s.indexOf(needle);
console.log(JSON.stringify(s.slice(i - 80, i + 40)));
