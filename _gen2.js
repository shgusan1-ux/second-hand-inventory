const fs = require("fs");
const p = "c:/prj/second-hand-inventory/full-audit.js";
// Read self and extract content after DATA marker
const self = fs.readFileSync(__filename, "utf8");
const marker = "__AUDIT_DATA__";
const idx = self.indexOf(marker);
if (idx < 0) { console.error("No data marker"); process.exit(1); }
const content = self.substring(idx + marker.length + 1);
fs.writeFileSync(p, content, "utf8");
console.log("Written:", content.length, "chars to", p);
process.exit(0);

// __AUDIT_DATA__/**
 * 전체 상품 정밀 검사 스크립트
 */
const { createClient } = require('@libsql/client');
const client = createClient({
    url: 'libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA'
});
