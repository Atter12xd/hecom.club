const fs = require("fs");
const s = fs.readFileSync("C:/Users/Public/Documents/hecom.club/public/credito-app/credito-app.js", "utf8");
const needles = ['gerentes").update', "gerentes').update"];
for (const n of needles) {
  const i = s.indexOf(n);
  console.log(n, i);
  if (i >= 0) console.log(s.slice(Math.max(0, i - 150), i + 1800));
}
