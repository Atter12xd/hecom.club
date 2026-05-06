const fs = require("fs");
const vm = require("vm");
const path = require("path");
let s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);

const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const w1 = s.indexOf(wrap);
const b1 = s.indexOf(bodyDash, w1);
const mid1 = s.slice(w1, b1);

const replWrap =
  'h.jsxs("div",{className:"hm-report-total-wrap",style:{width:"100%",marginTop:6},children:[h.jsx("button",{type:"button",onClick:()=>Le("all_history"),style:{padding:"6px 12px",borderRadius:8,border:xe==="all_history"?"1.5px solid var(--color-primary)":"1px solid var(--sidebar-border)",background:xe==="all_history"?"var(--sidebar-active)":"var(--color-bg)",color:xe==="all_history"?"var(--color-primary)":"var(--sidebar-text-active)",fontSize:11.5,fontWeight:xe==="all_history"?700:600,cursor:"pointer",fontFamily:"inherit"},children:"Total"})]}),';

const t = s.replace(mid1, replWrap);
try {
  new vm.Script(t.slice(0, t.lastIndexOf("export{")));
  console.log("replace mid with thin wrap: OK");
} catch (e) {
  console.log("FAIL", e.message);
}
