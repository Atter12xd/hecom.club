const fs = require("fs");
const s = fs.readFileSync("credito-app/credito-app.js", "utf8");
const i = s.indexOf('className:"hm-resumen-pro-toolbar"');
console.log(s.slice(i, i + 250));
const j = s.indexOf("hm-resumen-pro-body", i);
console.log("---\n", s.slice(j - 130, j + 90));
