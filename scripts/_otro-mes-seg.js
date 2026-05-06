const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const needle =
  'children:"Ver últimos 6 meses"})}),h.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"},children:[h.jsx("span",{style:{fontSize:';
let idx = 0;
for (let c = 1; c <= 3; c++) {
  const i = s.indexOf(needle, idx);
  console.log(c, i, s.slice(i + needle.length, i + needle.length + 40));
  idx = i + 1;
}
