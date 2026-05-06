const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const needle = ",Pf=(e,t=\"\")=>";
const i = s.indexOf(needle);
console.log("idx", i);
if (i >= 0) console.log(s.slice(i, i + 4500));
