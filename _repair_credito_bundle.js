const fs = require("fs");
const path = "credito-app/credito-app.js";
const full = fs.readFileSync(path, "utf8");

const styleKey = 'h.jsx("style",{children:`';
const k = full.indexOf(styleKey);
if (k < 0) {
  console.error("styleKey not found");
  process.exit(1);
}
const bodyStart = k + styleKey.length;
console.log("template body starts at", bodyStart);

/** Index of closing ` for template that starts at bodyStart. Only ${ } is special. */
function findTemplateEnd(s, from) {
  let i = from;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "$" && s[i + 1] === "{") {
      // skip ${ ... } with proper brace balance
      i += 2;
      let depth = 1;
      while (i < s.length && depth > 0) {
        const ch = s[i];
        if (ch === "{") depth++;
        else if (ch === "}") depth--;
        else if (ch === "\\") {
          i++;
        }
        i++;
      }
      continue;
    }
    if (c === "`") return i;
    i++;
  }
  return -1;
}

const closeIdx = findTemplateEnd(full, bodyStart);
console.log("template end backtick at", closeIdx);
if (closeIdx < 0) {
  console.error("no closing backtick");
  process.exit(1);
}

const snip = full.slice(closeIdx, closeIdx + 80);
console.log("after template:", JSON.stringify(snip));

// Optional: collapse newlines inside [bodyStart, closeIdx) to fix any edge-case parsers
const before = full.slice(0, bodyStart);
const body = full.slice(bodyStart, closeIdx);
const after = full.slice(closeIdx);
const bodyFixed = body.replace(/\r?\n/g, "");
const out = before + bodyFixed + after;

try {
  new (require("vm").Script)(out, { filename: path });
  console.log("syntax OK");
} catch (e) {
  console.log("before fix:", e.message);
}

fs.writeFileSync(path, out);
fs.writeFileSync("public/credito-app/credito-app.js", out);
fs.writeFileSync("_import_tools/credito-app/credito-app.js", out);

try {
  new (require("vm").Script)(out, { filename: path });
  console.log("OK: repaired and valid");
} catch (e) {
  console.error("after fix still broken:", e.message);
  process.exit(1);
}
