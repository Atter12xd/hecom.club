const fs = require("fs");
const path = require("path");
const s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const needle = 'children:"Ver últimos 6 meses"})}),h.jsxs("div"';
let idx = 0;
let c = 0;
while (true) {
  const i = s.indexOf(needle, idx);
  if (i < 0) break;
  c++;
  console.log(c, "context before:", JSON.stringify(s.slice(i - 200, i)));
  idx = i + 1;
}
