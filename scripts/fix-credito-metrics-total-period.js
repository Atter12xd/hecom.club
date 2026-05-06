/**
 * Período "Total" = all_history; quita panel desplegable y crAll; cierra JSX.
 */
const fs = require("fs");
const path = require("path");
const file = path.join(__dirname, "..", "credito-app", "credito-app.js");
let s = fs.readFileSync(file, "utf8");

function checkSyntax(src) {
  const i = src.lastIndexOf("export{");
  const toCheck = i >= 0 ? src.slice(0, i) : src;
  try {
    new (require("vm").Script)(toCheck, { filename: file });
    return true;
  } catch (e) {
    return e.message;
  }
}

const qceOld =
  'Qce=()=>["this_month","prev_month","month_off_2","month_off_3","month_off_4","month_off_5"].map(e=>{const t=Pf(e),r=t.repPerInicio.slice(0,7);return{id:e,label:Rhe(r)}}),';
const qceNew =
  'Qce=()=>[{id:"all_history",label:"Total"},...["this_month","prev_month","month_off_2","month_off_3","month_off_4","month_off_5"].map(e=>{const t=Pf(e),r=t.repPerInicio.slice(0,7);return{id:e,label:Rhe(r)}})],';
if (s.includes(qceOld)) s = s.replace(qceOld, qceNew);

const ptOld =
  'pt=we.useMemo(()=>Pf(xe,xe==="custom"?ot:""),[xe,ot]),ut=pt.repPerInicio,rt=pt.repPerFin,Mt=pt.weeklyMonthYM,$t=we.useMemo(()=>Qce(),[]),Kt=xe==="custom"?x1(y1(mn(ot)||pn())):xe==="last_6"?"Últimos 6 meses":((tl=$t.find(F=>F.id===xe))==null?void 0:tl.label)||"—",';
const ptNew = `pt=we.useMemo(()=>{if(xe==="all_history"){const F=[];for(const P of o)if(P!=null&&P.fechaMovimiento){const W=String(P.fechaMovimiento).slice(0,10);W.length===10&&/^\\d{4}-\\d{2}-\\d{2}$/.test(W)&&F.push(W)}for(const P of s)if(P!=null&&P.fecha){const W=String(P.fecha).slice(0,10);W.length===10&&/^\\d{4}-\\d{2}-\\d{2}$/.test(W)&&F.push(W)}if(!F.length)return Pf("this_month");F.sort();const Q=F[0],he=F[F.length-1],pe=Q.slice(0,7),be=he.slice(0,7),Fe=(Ot,kt)=>\`\${Ot}-\${String(kt).padStart(2,"0")}-01\`,[As,Ts]=pe.split("-").map(Number),[Si,ks]=be.split("-").map(Number);return{repPerInicio:Fe(As,Ts),repPerFin:m0(be),weeklyMonthYM:null}}return Pf(xe,xe==="custom"?ot:"")},[xe,ot,o,s]),ut=pt.repPerInicio,rt=pt.repPerFin,Mt=pt.weeklyMonthYM,$t=we.useMemo(()=>Qce(),[]),Kt=xe==="custom"?x1(y1(mn(ot)||pn())):xe==="last_6"?"Últimos 6 meses":((tl=$t.find(F=>F.id===xe))==null?void 0:tl.label)||"—",`;
if (s.includes(ptOld)) s = s.replace(ptOld, ptNew);

s = s.replace(/,\[hmTotPan,hmSetTotPan\]=we\.useState\(!1\),/g, ",");

const crAllRe =
  /,crAll=we\.useMemo\(\(\)=>\{const ut="",rt="";let F=Nt[\s\S]*?\},\[Nt,Pe,a,c,o,s\]\),vc=/;
if (crAllRe.test(s)) s = s.replace(crAllRe, ",vc=");

s = s.replace(
  /pie:Ce\}\},\[Nt,Pe,ut,rt,a,c,o,s\]\),\[Nt,Pe,a,c,o,s\]\),vc=/g,
  "pie:Ce}},[Nt,Pe,ut,rt,a,c,o,s]),vc="
);

const spanTail = 'children:[Kt," · ",Do(ut)," – ",Do(rt)]}),';
const closeDashboard =
  ']})]})]})]})]})}),';
const closeReportes = "]})]})]})]})]}),";
const bodyDiv = 'h.jsx("div",{className:"hm-resumen-pro-body hm-page-content"';
const metricasDiv = 'h.jsxs("div",{className:"hm-detail-stats hm-metricas-kpi-row"';

function stripWrap(nextMarker) {
  const needle = `${spanTail}h.jsxs("div",{className:"hm-report-total-wrap"`;
  const i = s.indexOf(needle);
  if (i < 0) return false;
  const j = s.indexOf(nextMarker, i);
  if (j < 0) throw new Error("missing " + nextMarker.slice(0, 50));
  s = s.slice(0, i) + spanTail + (nextMarker === bodyDiv ? closeDashboard : closeReportes) + s.slice(j);
  return true;
}

stripWrap(bodyDiv);
stripWrap(metricasDiv);

const err =
  checkSyntax(s) !== true
    ? checkSyntax(s)
    : s.includes("hm-report-total-wrap")
      ? "still hm-report-total-wrap"
      : s.includes("hmTotPan")
        ? "still hmTotPan"
        : s.includes("crAll")
          ? "still crAll"
          : null;

if (err) {
  console.error("FAIL:", err);
  process.exit(1);
}

fs.writeFileSync(file, s);
console.log("OK:", file);
