const fs = require("fs");
const s = fs.readFileSync(
  require("path").join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);
const crAllRe =
  /,crAll=we\.useMemo\(\(\)=>\{const ut="",rt="";let F=Nt[\s\S]*?\},\[Nt,Pe,a,c,o,s\]\),vc=/;
console.log("match", crAllRe.test(s));
const m = s.match(crAllRe);
console.log("len", m ? m[0].length : 0);
if (m) {
  console.log("head", m[0].slice(0, 200));
  console.log("tail", m[0].slice(-120));
}
