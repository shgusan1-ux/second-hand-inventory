const fs=require("fs");const lines=[];function L(s){lines.push(s);}
L("const { createClient } = require("@libsql/client");");
L("");
L("const client = createClient({");
L("    url: "libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io",");
fs.writeFileSync("c:/prj/second-hand-inventory/check-images.js",lines.join("
"));
console.log("ok");