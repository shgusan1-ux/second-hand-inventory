const { createClient } = require('@libsql/client');

const url = "libsql://second-hand-inventory-shgusan1-ux.aws-ap-northeast-1.turso.io";
const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDIyNjYwNDQsImlhdCI6MTc3MDczMDA0NCwiaWQiOiI5NWQ2ZWVmNC05MGQ2LTQ3ZDYtYTNlZi0wMzFmYTkzOGYyNGMiLCJyaWQiOiJmYWUyYjI4Yy0zM2I5LTQ2OGItYmEwOS1lMmY3NTQxYjQ5ODYifQ.l1mNE_w5wXuLTm5OhVrG-YI4gBlYHTL-D4BZxMbnsT_z4kqeKHAspRbPThXRnXL6kH-wcy5n5fUmjvROKjGIDA";

async function testConnection() {
  try {
    console.log('[TEST] Connecting to Turso...');
    const client = createClient({ url, authToken });

    console.log('[TEST] Creating test table...');
    await client.execute(`
      CREATE TABLE IF NOT EXISTS test_table (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      );
    `);

    console.log('[TEST] Inserting test data...');
    await client.execute({
      sql: 'INSERT OR REPLACE INTO test_table (id, name) VALUES (?, ?)',
      args: ['test1', 'Test Name']
    });

    console.log('[TEST] Querying test data...');
    const result = await client.execute('SELECT * FROM test_table');
    console.log('[TEST] Query result:', result.rows);

    console.log('[TEST] ✅ Connection successful!');
  } catch (e) {
    console.error('[TEST] ❌ Connection failed:', e);
    console.error('[TEST] Error details:', e.message);
    console.error('[TEST] Stack:', e.stack);
  }
}

testConnection();
