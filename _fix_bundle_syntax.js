const fs = require("fs");
const path = "credito-app/credito-app.js";
const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

const L751 = lines[750];
const marker = 'h.jsx("style",{children:`';
const idx = L751.indexOf(marker);
console.log("line751 len", L751.length, "marker idx", idx);

if (idx < 0) {
  console.log("marker not found on 751");
  process.exit(1);
}

// Template starts after opening ` following children:
const tickAfterChildren = L751.indexOf("`", idx + marker.length - 6);
// Actually marker ends with ` so the last char of marker IS backtick - children:` 
// marker = h.jsx("style",{children:`  -> template starts right after this backtick
const t0 = idx + marker.length; // first char inside CSS template
console.log("template start", t0, JSON.stringify(L751.slice(t0, t0 + 60)));

// Scan from t0 for closing backtick - must skip ${}
function findClosingBacktick(s, from) {
  let i = from;
  while (i < s.length) {
    const c = s[i];
    if (c === "`") return i;
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "$" && s[i + 1] === "{") {
      let depth = 1;
      i += 2;
      while (i < s.length && depth > 0) {
        if (s[i] === "{") depth++;
        else if (s[i] === "}") depth--;
        i++;
      }
      continue;
    }
    i++;
  }
  return -1;
}

let closeIn751 = findClosingBacktick(L751, t0);
console.log("closing backtick in 751?", closeIn751);

// If not found in 751, template spans multiple lines - JOIN lines 752..until close found
if (closeIn751 < 0) {
  let merged = L751;
  let lineNum = 751;
  for (let n = 751; n < lines.length; n++) {
    merged += "\n" + lines[n];
    const c = findClosingBacktick(merged, t0);
    console.log("merged up to line", n + 1, "len", merged.length, "close", c);
    if (c >= 0) {
      console.log("FOUND close at merged offset", c);
      console.log("after close snippet", JSON.stringify(merged.slice(c, c + 40)));
      break;
    }
    if (n > 920) break;
  }
}
