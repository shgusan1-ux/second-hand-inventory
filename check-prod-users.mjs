import { createClient } from '@libsql/client';

const client = createClient({
  url: 'libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA'
});

console.log('Checking production Turso database users...');
const result = await client.execute('SELECT id, username, name, role, job_title FROM users');
console.log('\nUsers found:', result.rows.length);
result.rows.forEach(user => {
  console.log(`- ${user.username} (${user.name}) - ${user.role} - ${user.job_title}`);
});

await client.close();
