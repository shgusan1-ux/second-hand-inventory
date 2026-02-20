const fs = require("fs");
const SQ = String.fromCharCode(39);
function s(v) { return SQ + v + SQ; }
const lines = [];
lines.push("/**");
lines.push(" * 전체 상품 정밀 검사 스크립트");
lines.push(" * 실행: node full-audit.js");
lines.push(" */");
lines.push("const { createClient } = require(" + s("@libsql/client") + ");");
lines.push("const client = createClient({");
lines.push("    url: " + s("libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io") + ",");
lines.push("    authToken: " + s("eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA"));
lines.push("});");
fs.writeFileSync("c:/prj/second-hand-inventory/full-audit.js", lines.join(String.fromCharCode(10)), "utf8");
console.log("Header generated");
