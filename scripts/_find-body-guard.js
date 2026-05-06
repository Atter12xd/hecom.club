const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const bodyTag = 'className:"hm-resumen-pro-body hm-page-content"';
const i = s.indexOf(bodyTag);
console.log("first hm-resumen-pro-body at", i);
const chunk = s.slice(Math.max(0, i - 400), i + 200);
console.log(chunk);
