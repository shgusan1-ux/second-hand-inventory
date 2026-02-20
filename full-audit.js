/**
 * 전체 상품 정밀 검사 스크립트
 * 실행: node full-audit.js
 */
const { createClient } = require('@libsql/client');
const client = createClient({
    url: 'libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io',
    authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA'
});
function printTable(title, rows) {
    console.log('');
    console.log('='.repeat(72));
    console.log('  ' + title);
    console.log('='.repeat(72));
    if (!rows || rows.length === 0) { console.log('  (데이터 없음)'); return; }
    const keys = Object.keys(rows[0]);
    const widths = keys.map(k => {
        const maxD = Math.max(...rows.map(r => String(r[k] != null ? r[k] : '').length));
        return Math.max(k.length, maxD, 4);
    });
    console.log('  ' + keys.map((k,i) => k.padEnd(widths[i])).join(' | '));
    console.log('  ' + widths.map(w => '-'.repeat(w)).join('-+-'));
    rows.forEach(row => {
        const line = keys.map((k,i) => {
            const v = String(row[k] != null ? row[k] : '');
            if (!isNaN(Number(v)) && v !== '') return v.padStart(widths[i]);
            return v.padEnd(widths[i]);
        }).join(' | ');
        console.log('  ' + line);
    });
}
