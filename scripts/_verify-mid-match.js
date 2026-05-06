const fs = require("fs");
const vm = require("vm");
const path = require("path");
let s = fs.readFileSync(
  path.join(__dirname, "..", "credito-app", "credito-app.js"),
  "utf8"
);

const wrap = 'h.jsxs("div",{className:"hm-report-total-wrap"';
const bodyDash = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const bodyRep = 'h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';

const w1 = s.indexOf(wrap);
const b1 = s.indexOf(bodyDash, w1);
const w2 = s.indexOf(wrap, b1);
const b2 = s.indexOf(bodyRep, w2);
const mid1 = s.slice(w1, b1);
const mid2 = s.slice(w2, b2);

const crAllRe =
  /,crAll=we\.useMemo\(\(\)=>\{const ut="",rt="";let F=Nt[\s\S]*?\},\[Nt,Pe,a,c,o,s\]\),vc=/;
if (crAllRe.test(s)) s = s.replace(crAllRe, ",vc=");
s = s.replace(
  /pie:Ce\}\},\[Nt,Pe,ut,rt,a,c,o,s\]\),\[Nt,Pe,a,c,o,s\]\),vc=/g,
  "pie:Ce}},[Nt,Pe,ut,rt,a,c,o,s]),vc="
);
s = s.replace(/,\[hmTotPan,hmSetTotPan\]=we\.useState\(!1\),/g, ",");

const qceOld =
  'Qce=()=>["this_month","prev_month","month_off_2","month_off_3","month_off_4","month_off_5"].map(e=>{const t=Pf(e),r=t.repPerInicio.slice(0,7);return{id:e,label:Rhe(r)}}),';
const qceNew =
  'Qce=()=>[{id:"all_history",label:"Total"},...["this_month","prev_month","month_off_2","month_off_3","month_off_4","month_off_5"].map(e=>{const t=Pf(e),r=t.repPerInicio.slice(0,7);return{id:e,label:Rhe(r)}})],';
const ptOld =
  'pt=we.useMemo(()=>Pf(xe,xe==="custom"?ot:""),[xe,ot]),ut=pt.repPerInicio,rt=pt.repPerFin,Mt=pt.weeklyMonthYM,$t=we.useMemo(()=>Qce(),[]),Kt=xe==="custom"?x1(y1(mn(ot)||pn())):xe==="last_6"?"Últimos 6 meses":((tl=$t.find(F=>F.id===xe))==null?void 0:tl.label)||"—",';
const ptNew = `pt=we.useMemo(()=>{if(xe==="all_history"){const F=[];for(const P of o)if(P!=null&&P.fechaMovimiento){const W=String(P.fechaMovimiento).slice(0,10);W.length===10&&/^\\d{4}-\\d{2}-\\d{2}$/.test(W)&&F.push(W)}for(const P of s)if(P!=null&&P.fecha){const W=String(P.fecha).slice(0,10);W.length===10&&/^\\d{4}-\\d{2}-\\d{2}$/.test(W)&&F.push(W)}if(!F.length)return Pf("this_month");F.sort();const Q=F[0],he=F[F.length-1],pe=Q.slice(0,7),be=he.slice(0,7),Fe=(Ot,kt)=>\`\${Ot}-\${String(kt).padStart(2,"0")}-01\`,[As,Ts]=pe.split("-").map(Number);return{repPerInicio:Fe(As,Ts),repPerFin:m0(be),weeklyMonthYM:null}}return Pf(xe,xe==="custom"?ot:"")},[xe,ot,o,s]),ut=pt.repPerInicio,rt=pt.repPerFin,Mt=pt.weeklyMonthYM,$t=we.useMemo(()=>Qce(),[]),Kt=xe==="custom"?x1(y1(mn(ot)||pn())):xe==="last_6"?"Últimos 6 meses":xe==="all_history"?"Total":((tl=$t.find(F=>F.id===xe))==null?void 0:tl.label)||"—",`;

if (s.includes(qceOld)) s = s.replace(qceOld, qceNew);
if (s.includes(ptOld)) s = s.replace(ptOld, ptNew);

console.log("mid1 in s", s.includes(mid1));
console.log("mid2 in s", s.includes(mid2));
console.log("split mid1", s.split(mid1).length - 1);

const replDash =
  'h.jsx("button",{type:"button",onClick:()=>Le("all_history"),style:{padding:"6px 12px",borderRadius:8,border:xe==="all_history"?"1.5px solid var(--color-primary)":"1px solid var(--sidebar-border)",background:xe==="all_history"?"var(--sidebar-active)":"var(--color-bg)",color:xe==="all_history"?"var(--color-primary)":"var(--sidebar-text-active)",fontSize:11.5,fontWeight:xe==="all_history"?700:600,cursor:"pointer",fontFamily:"inherit"},children:"Total"}),';

let t = s.replace(mid1, replDash);
try {
  new vm.Script(t.slice(0, t.lastIndexOf("export{")));
  console.log("after mid1 replace: OK");
} catch (e) {
  console.log("after mid1 replace: FAIL", e.message);
}
