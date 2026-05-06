const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const i = s.indexOf(",crAll=we.useMemo");
console.log("idx", i);
console.log(s.slice(i, i + 500));
