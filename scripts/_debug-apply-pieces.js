const fs = require("fs");
const path = require("path");
const vm = require("vm");
const file = path.join(__dirname, "..", "credito-app", "credito-app.js");
let s = fs.readFileSync(file, "utf8");

function check(label, src) {
  const i = src.lastIndexOf("export{");
  try {
    new vm.Script(src.slice(0, i), { filename: file });
    console.log("OK:", label);
    return true;
  } catch (e) {
    console.log("FAIL:", label, e.message);
    return false;
  }
}

const crAllRe =
  /,crAll=we\.useMemo\(\(\)=>\{const ut="",rt="";let F=Nt[\s\S]*?\},\[Nt,Pe,a,c,o,s\]\),vc=/;

const qceOld =
  'Qce=()=>["this_month","prev_month","month_off_2","month_off_3","month_off_4","month_off_5"].map(e=>{const t=Pf(e),r=t.repPerInicio.slice(0,7);return{id:e,label:Rhe(r)}}),';
const qceNew =
  'Qce=()=>[{id:"all_history",label:"Total"},...["this_month","prev_month","month_off_2","month_off_3","month_off_4","month_off_5"].map(e=>{const t=Pf(e),r=t.repPerInicio.slice(0,7);return{id:e,label:Rhe(r)}})],';

const ptOld =
  'pt=we.useMemo(()=>Pf(xe,xe==="custom"?ot:""),[xe,ot]),ut=pt.repPerInicio,rt=pt.repPerFin,Mt=pt.weeklyMonthYM,$t=we.useMemo(()=>Qce(),[]),Kt=xe==="custom"?x1(y1(mn(ot)||pn())):xe==="last_6"?"Últimos 6 meses":((tl=$t.find(F=>F.id===xe))==null?void 0:tl.label)||"—",';

const ptNew = `pt=we.useMemo(()=>{if(xe==="all_history"){const F=[];for(const P of o)if(P!=null&&P.fechaMovimiento){const W=String(P.fechaMovimiento).slice(0,10);W.length===10&&/^\\d{4}-\\d{2}-\\d{2}$/.test(W)&&F.push(W)}for(const P of s)if(P!=null&&P.fecha){const W=String(P.fecha).slice(0,10);W.length===10&&/^\\d{4}-\\d{2}-\\d{2}$/.test(W)&&F.push(W)}if(!F.length)return Pf("this_month");F.sort();const Q=F[0],he=F[F.length-1],pe=Q.slice(0,7),be=he.slice(0,7),Fe=(Ot,kt)=>\`\${Ot}-\${String(kt).padStart(2,"0")}-01\`,[As,Ts]=pe.split("-").map(Number);return{repPerInicio:Fe(As,Ts),repPerFin:m0(be),weeklyMonthYM:null}}return Pf(xe,xe==="custom"?ot:"")},[xe,ot,o,s]),ut=pt.repPerInicio,rt=pt.repPerFin,Mt=pt.weeklyMonthYM,$t=we.useMemo(()=>Qce(),[]),Kt=xe==="custom"?x1(y1(mn(ot)||pn())):xe==="last_6"?"Últimos 6 meses":xe==="all_history"?"Total":((tl=$t.find(F=>F.id===xe))==null?void 0:tl.label)||"—",`;

check("orig", s);

let t = s;
if (crAllRe.test(t)) t = t.replace(crAllRe, ",vc=");
t = t.replace(
  /pie:Ce\}\},\[Nt,Pe,ut,rt,a,c,o,s\]\),\[Nt,Pe,a,c,o,s\]\),vc=/g,
  "pie:Ce}},[Nt,Pe,ut,rt,a,c,o,s]),vc="
);
check("after crAll", t);

t = t.replace(/,\[hmTotPan,hmSetTotPan\]=we\.useState\(!1\),/g, ",");
check("after hmTotPan remove", t);

if (t.includes(qceOld)) t = t.replace(qceOld, qceNew);
check("after qce", t);

if (t.includes(ptOld)) t = t.replace(ptOld, ptNew);
check("after pt", t);
