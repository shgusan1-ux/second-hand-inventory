const { Client } = require('pg');
const db = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres' // This is probably wrong, I should check db.ts
});
// Actually, I should just use the app's db module.
