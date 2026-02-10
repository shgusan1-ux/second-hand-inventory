import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:inventory.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
});

const username = '01033081114';
const password = 'zmffldkd1*';
const name = '관리자';
const role = 'admin';
const job_title = '대표자';

async function createUser() {
    try {
        console.log('Hashing password...');
        const password_hash = await bcrypt.hash(password, 10);

        console.log('Creating user...');
        const userId = Math.random().toString(36).substring(2, 10);

        await client.execute({
            sql: `INSERT INTO users (id, username, password_hash, name, role, job_title, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            args: [userId, username, password_hash, name, role, job_title]
        });

        console.log('✅ User created successfully!');
        console.log(`   ID: ${userId}`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
        console.log(`   Name: ${name}`);
        console.log(`   Role: ${role}`);
        console.log(`   Job Title: ${job_title}`);

    } catch (error) {
        console.error('❌ Error creating user:', error);
    } finally {
        client.close();
    }
}

createUser();
