const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
let i = 0;
const needle = "hmTotPan";
while (true) {
  const j = s.indexOf(needle, i);
  if (j < 0) break;
  console.log("at", j, JSON.stringify(s.slice(Math.max(0, j - 40), j + 60)));
  i = j + 1;
}
