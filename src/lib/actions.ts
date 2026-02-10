'use server';

import { db } from './db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashPassword, verifyPassword, createSession, logoutSession, logAction, getSession } from './auth';

// --- Email Verification (Mock) ---
interface VerificationCode {
    email: string;
    code: string;
    expiresAt: number;
}
// Simple in-memory store for demo (Use DB in production)
const verificationCodes: Record<string, VerificationCode> = {};

export async function sendVerificationCode(email: string) {
    // 1. Generate Code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2. Store Code (Expires in 5 mins)
    verificationCodes[email] = {
        email,
        code,
        expiresAt: Date.now() + 5 * 60 * 1000
    };

    // 3. Send Email (Mock)
    console.log(`[EMAIL MOCK] Sending verification code ${code} to ${email}`);

    // 4. Return success
    return { success: true, message: '인증번호가 전송되었습니다. (콘솔 확인)' };
}

export async function verifyEmailCode(email: string, code: string) {
    const record = verificationCodes[email];
    if (!record) return { success: false, error: '인증 번호가 만료되었거나 존재하지 않습니다.' };

    if (Date.now() > record.expiresAt) {
        delete verificationCodes[email];
        return { success: false, error: '인증 번호가 만료되었습니다.' };
    }

    if (record.code !== code) {
        return { success: false, error: '인증 번호가 일치하지 않습니다.' };
    }

    delete verificationCodes[email]; // Consume code
    return { success: true };
}

// --- Security Logs ---
export async function logSecurityAccess(page: string) {
    const session = await getSession();
    const userId = session ? session.id : 'anonymous';
    const userName = session ? session.name : 'Unknown';

    try {
        await db.query(`
            INSERT INTO security_logs (user_id, user_name, action, details)
            VALUES ($1, $2, 'ACCESS', $3)
        `, [userId, userName, `Accessed ${page}`]);
        return { success: true };
    } catch (e) {
        console.error('Security log failed', e);
        return { success: false };
    }
}

export async function getSecurityLogs() {
    try {
        const res = await db.query(`SELECT * FROM security_logs ORDER BY created_at DESC LIMIT 50`);
        return res.rows;
    } catch (e) {
        return [];
    }
}

// --- Auth Actions ---

export async function register(prevState: any, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string; // New field
    const passwordHint = formData.get('passwordHint') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const role = 'user';

    if (!username || !password || !name || !confirmPassword || !passwordHint || !jobTitle) {
        return { success: false, error: '모든 필드를 입력해주세요.' };
    }

    if (password !== confirmPassword) {
        return { success: false, error: '비밀번호가 일치하지 않습니다.' };
    }

    try {
        const hashedPassword = await hashPassword(password);
        const id = Math.random().toString(36).substring(2, 9);

        // Lazy update for email column
        // try {
        //     await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
        // } catch (e) { /* Ignore */ }

        await db.query(
            'INSERT INTO users (id, username, password_hash, name, role, password_hint, job_title, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [id, username, hashedPassword, name, role, passwordHint, jobTitle, email || null]
        );

        await logAction('REGISTER', 'user', id, `Registered user ${username} (${jobTitle})`);
        await createSession(id);
    } catch (e: any) {
        console.error('Registration failed:', e);
        if (e.message.includes('UNIQUE constraint failed') || e.message.includes('unique constraint')) {
            return { success: false, error: '이미 존재하는 ID입니다.' };
        }
        return {
            success: false,
            error: '회원가입 실패: ' + (e.message || String(e))
        };
    }

    redirect('/');
}

// ... login ...

// ... bulkCreateProducts ...

export async function bulkDeleteProducts(ids: string[]) {
    if (!ids || ids.length === 0) return { success: false, error: '삭제할 상품을 선택해주세요.' };

    try {
        // Construct array literal for ANY($1)
        await db.query(`UPDATE products SET status = '폐기' WHERE id = ANY($1)`, [ids]);

        await logAction('BULK_DELETE', 'product', 'bulk', `Deleted ${ids.length} items`);
        revalidatePath('/inventory');
        revalidatePath('/smartstore');
        return { success: true };
    } catch (e) {
        console.error('Bulk delete failed:', e);
        return { success: false, error: '일괄 삭제 실패' };
    }
}

export async function login(prevState: any, formData: FormData) {
    try {
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user || !(await verifyPassword(password, user.password_hash))) {
            return { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' };
        }

    // 6 AM Login Restriction Check - DISABLED due to schema mismatch
    // TODO: Re-enable after fixing attendance_logs table structure
    /*
    try {
        const lastLogRes = await db.query('SELECT type, created_at FROM attendance_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.id]);
        if (lastLogRes.rows.length > 0) {
            const lastLog = lastLogRes.rows[0];
            if (lastLog.type === '퇴근') {
                const lastOut = new Date(lastLog.created_at);
                const now = new Date();

                // Calculate release time (Next 6 AM)
                const releaseTime = new Date(lastOut);
                if (lastOut.getHours() >= 6) {
                    // If clocked out after 6 AM, release is tomorrow 6 AM
                    releaseTime.setDate(releaseTime.getDate() + 1);
                }
                // If clocked out before 6 AM (e.g. 2 AM), release is today 6 AM (Default behavior if we didn't add day? No, need to set hour)
                // Actually, if clocked out at 2 AM, allow login at 6 AM same day.
                // If clocked out at 20:00, allow login at 6 AM next day.

                releaseTime.setHours(6, 0, 0, 0);

                if (now < releaseTime) {
                    return {
                        success: false,
                        error: `퇴근 후에는 익일 오전 6시까지 로그인이 제한됩니다.\n(가능 시간: ${releaseTime.toLocaleString()})`
                    };
                }
            }
        }
    } catch (e) {
        console.error("Login restriction check failed", e);
    }
    */

        await createSession(user.id);
        await logAction('LOGIN', 'user', user.id, 'User logged in');
        // redirect('/'); // Removed immediate redirect
        return { success: true };
    } catch (error) {
        console.error('[LOGIN] Login failed:', error);
        return {
            success: false,
            error: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.\n' + (error instanceof Error ? error.message : String(error))
        };
    }
}

export async function logout() {
    await logAction('LOGOUT', 'user', 'self', 'User logged out');
    await logoutSession();
    redirect('/login');
}

// --- Inventory Actions ---

function parseExcelDate(value: any): string | null {
    if (!value) return null;
    const strVal = String(value).trim();
    if (!strVal) return null;

    // Check if it's an Excel serial date (numeric)
    // Excel dates usually > 20000 (year 1954)
    if (/^\d+(\.\d+)?$/.test(strVal)) {
        const serial = parseFloat(strVal);
        if (serial > 20000 && serial < 80000) { // Safety range
            // Excel base date: Dec 30, 1899. 25569 is offset to Unix Epoch
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            return date.toISOString();
        }
    }
    return strVal;
}

// ...
export async function bulkCreateProducts(products: any[]) {
    if (!products || products.length === 0) return { success: true, count: 0 };

    try {
        // Lazy Column Init
        try {
            // Remove 'IF NOT EXISTS' for better SQLite compatibility (older versions)
            // If column exists, it throws an error which we catch and ignore.
            await db.query(`ALTER TABLE products ADD COLUMN master_reg_date TIMESTAMP`);
        } catch (e) {
            // Ignore "duplicate column" or "column exists" errors
            // console.log("Column add result:", e); 
        }

        // Construct Bulk Insert Query (Multi-row Insert)
        const valueTuples = [];
        const params = [];
        let paramIndex = 1;

        for (const item of products) {
            params.push(
                item.id,
                item.name,
                item.brand,
                item.category,
                item.price_consumer || 0,
                item.price_sell || 0,
                item.status || '판매중',
                item.condition || 'A급',
                item.image_url || '',
                item.md_comment || '',
                item.images ? JSON.stringify(item.images) : '[]',
                item.size || '',
                parseExcelDate(item.master_reg_date) || null
            );

            // Create placeholders for this row ($1, $2, ... $13)
            // Ensure sequential indexing
            const placeholders = Array.from({ length: 13 }, (_, i) => `$${paramIndex + i}`).join(', ');
            valueTuples.push(`(${placeholders})`);
            paramIndex += 13;
        }

        const query = `
            INSERT INTO products (id, name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, images, size, master_reg_date)
            VALUES ${valueTuples.join(', ')}
            ON CONFLICT(id) DO UPDATE SET
            name=EXCLUDED.name,
            brand=EXCLUDED.brand,
            category=EXCLUDED.category,
            price_consumer=EXCLUDED.price_consumer,
            price_sell=EXCLUDED.price_sell,
            status=EXCLUDED.status,
            condition=EXCLUDED.condition,
            image_url=EXCLUDED.image_url,
            md_comment=EXCLUDED.md_comment,
            images=EXCLUDED.images,
            size=EXCLUDED.size,
            master_reg_date=EXCLUDED.master_reg_date
        `;

        await db.query(query, params);

        await logAction('BULK_CREATE_PRODUCTS', 'product', 'bulk', `${products.length} items`);
        revalidatePath('/inventory');
        revalidatePath('/smartstore');
        revalidatePath('/');
        return { success: true, count: products.length };
    } catch (error: any) {
        console.error('Bulk create failed:', error);
        return { success: false, error: error.message || 'Bulk create failed' };
    }
}
// ...
export async function bulkCreateCategories(categories: { id: string, sort_order: number, name: string, classification: string }[]) {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                classification TEXT DEFAULT '기타',
                sort_order INTEGER DEFAULT 0
            )
        `);

        for (const item of categories) {
            await db.query(`
                INSERT INTO categories (id, sort_order, name, classification)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT(id) DO UPDATE SET
                sort_order=$2, name=$3, classification=$4
             `, [item.id, item.sort_order, item.name, item.classification]);
        }

        revalidatePath('/inventory/new');
        revalidatePath('/settings');
        return { success: true, count: categories.length };
    } catch (error) {
        console.error('Bulk create categories failed:', error);
        return { success: false, error: 'Bulk create categories failed' };
    }
}

export async function addCategory(formData: FormData) {
    const name = formData.get('name') as string;
    const classification = formData.get('classification') as string || '기타';

    if (!name) return { success: false, error: '이름을 입력해주세요.' };

    try {
        const id = Math.random().toString(36).substring(2, 9);
        await db.query('INSERT INTO categories (id, name, classification, sort_order) VALUES ($1, $2, $3, $4)', [id, name, classification, 0]);
        revalidatePath('/settings');
        return { success: true };
    } catch (e) {
        return { success: false, error: '카테고리 추가 실패' };
    }
}

export async function updateCategory(targetId: string, newId: string, name: string, sort_order: number, classification: string) {
    try {
        // If ID is changing, we might need to handle FKs, but for now simple update.
        // Assuming cascade or no constraints for this simple app, or just update.
        // But updating PK in Postgres is tricky if referenced.
        // Let's assume we update fields. If ID changes, we update ID too.
        await db.query(`
            UPDATE categories 
            SET id = $1, name = $2, sort_order = $3, classification = $4
            WHERE id = $5
        `, [newId, name, sort_order, classification, targetId]);

        revalidatePath('/settings');
        return { success: true };
    } catch (e) {
        console.error('Update category failed', e);
        return { success: false, error: '카테고리 수정 실패' };
    }
}

export async function deleteCategory(id: string) {
    try {
        await db.query('DELETE FROM categories WHERE id = $1', [id]);
        revalidatePath('/settings');
        return { success: true };
    } catch (e) {
        return { success: false, error: '카테고리 삭제 실패' };
    }
}

export async function createProduct(formData: FormData) {
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const brand = formData.get('brand') as string;
    const category = formData.get('category') as string;
    const price_consumer = Number(formData.get('price_consumer'));
    const price_sell = Number(formData.get('price_sell'));
    const status = formData.get('status') as string || '판매중';
    const condition = formData.get('condition') as string;
    const size = formData.get('size') as string || '';
    const md_comment = formData.get('md_comment') as string;
    const master_reg_date = formData.get('master_reg_date') as string || new Date().toISOString().split('T')[0];

    // Images handling
    const images: string[] = [];
    for (let i = 0; i < 5; i++) {
        const img = formData.get(`image_${i}`) as string;
        if (img) images.push(img);
    }
    const image_url = images.length > 0 ? images[0] : '';
    const imagesJson = JSON.stringify(images);

    try {
        await db.query(`
           INSERT INTO products (id, name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, images, size, master_reg_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [id, name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, imagesJson, size, master_reg_date]);

        await logAction('CREATE_PRODUCT', 'product', id, name);

        revalidatePath('/inventory');
        revalidatePath('/smartstore');
        revalidatePath('/');
    } catch (error) {
        console.error('Failed to create product:', error);
    }

    redirect('/inventory');
}

export async function updateProduct(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const brand = formData.get('brand') as string;
    const category = formData.get('category') as string;
    const price_consumer = Number(formData.get('price_consumer'));
    const price_sell = Number(formData.get('price_sell'));
    const status = formData.get('status') as string;
    const condition = formData.get('condition') as string;
    const size = formData.get('size') as string || '';
    const md_comment = formData.get('md_comment') as string;
    const fabric = formData.get('fabric') as string || '';
    const master_reg_date = formData.get('master_reg_date') as string || null;

    // Images handling
    const images: string[] = [];
    for (let i = 0; i < 5; i++) {
        const img = formData.get(`image_${i}`) as string;
        if (img) images.push(img);
    }
    const image_url = images.length > 0 ? images[0] : '';
    const imagesJson = JSON.stringify(images);

    const sold_at = status === '판매완료' ? new Date().toISOString() : null;

    try {
        // Simple update approach for dynamic params
        let finalQuery = '';
        const finalParams: any[] = [name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, imagesJson, size, fabric, master_reg_date];

        if (status === '판매완료') {
            finalQuery = `UPDATE products SET name=$1, brand=$2, category=$3, price_consumer=$4, price_sell=$5, status=$6, condition=$7, image_url=$8, md_comment=$9, images=$10, size=$11, fabric=$12, master_reg_date=COALESCE($13, master_reg_date), sold_at=$14 WHERE id=$15`;
            finalParams.push(sold_at, id);
        } else {
            // If going back to selling, clear sold_at
            finalQuery = `UPDATE products SET name=$1, brand=$2, category=$3, price_consumer=$4, price_sell=$5, status=$6, condition=$7, image_url=$8, md_comment=$9, images=$10, size=$11, fabric=$12, master_reg_date=COALESCE($13, master_reg_date), sold_at=NULL WHERE id=$14`;
            finalParams.push(id);
        }

        await db.query(finalQuery, finalParams);
        await logAction('UPDATE_PRODUCT', 'product', id, `${name} (${status})`);

        revalidatePath('/inventory');
        revalidatePath('/smartstore');
        revalidatePath('/');
    } catch (error) {
        console.error('Failed to update product:', error);
    }

    redirect('/inventory');
}

export async function bulkUpdateFromExcel(products: any[]) {
    if (!products || products.length === 0) return { success: true, count: 0, details: [] };

    const details: { id: string, name: string, status: 'success' | 'error', message?: string }[] = [];
    let successCount = 0;
    let failCount = 0;

    try {
        for (const item of products) {
            if (!item.id) {
                failCount++;
                details.push({ id: 'UNKNOWN', name: item.name || 'Unknown', status: 'error', message: 'ID가 없습니다.' });
                continue;
            }

            try {
                // Build dynamic update query based on present fields
                const updates: string[] = [];
                const params: any[] = [];
                let pIdx = 1;

                if (item.name !== undefined) { updates.push(`name = $${pIdx++}`); params.push(item.name); }
                if (item.brand !== undefined) { updates.push(`brand = $${pIdx++}`); params.push(item.brand); }
                if (item.category !== undefined) { updates.push(`category = $${pIdx++}`); params.push(item.category); }
                if (item.price_consumer !== undefined) { updates.push(`price_consumer = $${pIdx++}`); params.push(Number(item.price_consumer)); }
                if (item.price_sell !== undefined) { updates.push(`price_sell = $${pIdx++}`); params.push(Number(item.price_sell)); }
                if (item.status !== undefined) { updates.push(`status = $${pIdx++}`); params.push(item.status); }
                if (item.condition !== undefined) { updates.push(`condition = $${pIdx++}`); params.push(item.condition); }
                if (item.size !== undefined) { updates.push(`size = $${pIdx++}`); params.push(item.size); }
                if (item.master_reg_date !== undefined) {
                    const parsedDate = parseExcelDate(item.master_reg_date);
                    updates.push(`master_reg_date = $${pIdx++}`);
                    params.push(parsedDate || null);
                }

                // Only update if there are fields to update
                if (updates.length > 0) {
                    params.push(item.id);
                    // Use a simpler query without joins
                    const result = await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${pIdx}`, params);

                    if (result.rowCount === 0) {
                        failCount++;
                        details.push({ id: item.id, name: item.name, status: 'error', message: 'ID와 일치하는 상품을 찾을 수 없습니다.' });
                    } else {
                        successCount++;
                        details.push({ id: item.id, name: item.name, status: 'success' });
                    }
                } else {
                    // No fields to update
                    successCount++;
                    details.push({ id: item.id, name: item.name, status: 'success', message: '변경 사항 없음' });
                }
            } catch (innerError: any) {
                failCount++;
                details.push({ id: item.id, name: item.name, status: 'error', message: innerError.message || '업데이트 중 오류 발생' });
            }
        }

        await logAction('BULK_UPDATE_EXCEL', 'product', 'bulk', `Updated ${successCount} items, Failed ${failCount}`);
        revalidatePath('/inventory');
        revalidatePath('/smartstore');
        revalidatePath('/');

        return { success: true, count: successCount, failCount, details };

    } catch (error: any) {
        console.error('Bulk excel update failed:', error);
        return { success: false, error: error.message || 'Excel update failed' };
    }
}



export async function deleteProduct(id: string) {
    try {
        // Soft delete (Discard)
        await db.query('UPDATE products SET status = $1 WHERE id = $2', ['폐기', id]);
        await logAction('DISCARD_PRODUCT', 'product', id, 'Moved to trash');
        revalidatePath('/inventory');
        revalidatePath('/smartstore');
        revalidatePath('/');
    } catch (error) {
        console.error('Failed to discard product', error);
    }
}

export async function restoreProduct(id: string) {
    try {
        await db.query(`UPDATE products SET status = '판매중' WHERE id = $1`, [id]);
        await logAction('RESTORE_PRODUCT', 'product', id, 'Restored from trash');
        revalidatePath('/inventory');
        revalidatePath('/inventory/discarded');
        revalidatePath('/smartstore');
        revalidatePath('/');
    } catch (error) {
        console.error('Failed to restore product', error);
    }
}

export async function permanentlyDeleteProduct(id: string) {
    try {
        await db.query(`DELETE FROM products WHERE id = $1`, [id]);
        await logAction('PERMANENT_DELETE_PRODUCT', 'product', id, 'Permanently deleted');
        revalidatePath('/inventory');
        revalidatePath('/inventory/discarded');
    } catch (error) {
        console.error('Failed to permanently delete product', error);
    }
}

// --- User Management Actions ---

export async function getUsers() {
    // Permission check
    const session = await getSession();
    if (!session) return [];

    // Strict check: Only specific job titles
    const allowedJobs = ['대표자', '경영지원'];
    if (!allowedJobs.includes(session.job_title)) {
        return [];
    }

    try {
        // Added security_memo to selection
        const result = await db.query('SELECT id, username, name, role, job_title, email, created_at, security_memo FROM users ORDER BY created_at DESC');
        return result.rows;
    } catch (e) {
        console.error('Failed to get users:', e);
        return [];
    }
}

export async function createUser(prevState: any, formData: FormData) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) {
        return { success: false, error: '권한이 없습니다.' };
    }

    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const email = formData.get('email') as string;
    const securityMemo = formData.get('securityMemo') as string;

    if (!username || !password || !name || !jobTitle) {
        return { success: false, error: '필수 항목을 입력해주세요.' };
    }

    try {
        const hashedPassword = await hashPassword(password);
        const id = Math.random().toString(36).substring(2, 9);
        const role = 'user'; // Default role
        const passwordHint = 'Admin Created';

        // Ensure columns exist (Robust)
        // try {
        //     await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS security_memo TEXT`);
        // } catch (e) { /* ignore */ }
        // try {
        //     await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
        // } catch (e) { /* ignore */ }

        await db.query(
            'INSERT INTO users (id, username, password_hash, name, role, password_hint, job_title, email, security_memo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [id, username, hashedPassword, name, role, passwordHint, jobTitle, email || null, securityMemo || '']
        );

        await logAction('CREATE_USER', 'user', id, `Created by admin: ${username}`);
        revalidatePath('/settings/users');
        return { success: true, message: '사용자가 등록되었습니다.' };
    } catch (e: any) {
        console.error('Create user failed:', e);
        if (e.message.includes('UNIQUE constraint') || e.message.includes('unique constraint')) {
            return { success: false, error: '이미 존재하는 아이디입니다.' };
        }
        return { success: false, error: '사용자 등록 실패: ' + e.message };
    }
}

export async function updateUser(prevState: any, formData: FormData) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) {
        return { success: false, error: '권한이 없습니다.' };
    }

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const jobTitle = formData.get('jobTitle') as string;
    const email = formData.get('email') as string;
    const securityMemo = formData.get('securityMemo') as string;
    const newPassword = formData.get('newPassword') as string;

    if (!id || !name || !jobTitle) {
        return { success: false, error: '필수 항목을 입력해주세요.' };
    }

    try {
        const updates: string[] = [];
        const params: any[] = [];
        let pIdx = 1;

        updates.push(`name = $${pIdx++}`); params.push(name);
        updates.push(`job_title = $${pIdx++}`); params.push(jobTitle);
        updates.push(`email = $${pIdx++}`); params.push(email || null);
        updates.push(`security_memo = $${pIdx++}`); params.push(securityMemo || '');

        if (newPassword && newPassword.trim()) {
            const hashedPassword = await hashPassword(newPassword);
            updates.push(`password_hash = $${pIdx++}`);
            params.push(hashedPassword);
        }

        params.push(id);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${pIdx}`;

        await db.query(query, params);
        await logAction('UPDATE_USER', 'user', id, `Updated by admin`);

        revalidatePath('/settings/users');
        return { success: true, message: '사용자 정보가 수정되었습니다.' };
    } catch (e: any) {
        console.error('Update user failed:', e);
        return { success: false, error: '사용자 수정 실패' };
    }
}

export async function getUsersForOrgChart() {
    const session = await getSession();
    if (!session) return [];

    try {
        // Anyone logged in can view the org chart
        const result = await db.query('SELECT id, username, name, job_title, email, created_at FROM users ORDER BY CASE WHEN job_title = \'대표자\' THEN 1 WHEN job_title = \'총매니저\' THEN 2 WHEN job_title = \'경영지원\' THEN 3 WHEN job_title = \'실장\' THEN 4 WHEN job_title = \'과장\' THEN 5 WHEN job_title = \'주임\' THEN 6 ELSE 7 END, name ASC');
        return result.rows;
    } catch (e) {
        console.error('Failed to get org chart users:', e);
        return [];
    }
}

export async function sendMessage(receiverId: string, content: string) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    if (!content.trim()) return { success: false, error: '내용을 입력해주세요.' };

    try {
        await db.query(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1, $2, $3)',
            [session.id, receiverId, content]
        );

        revalidatePath('/');
        return { success: true };
    } catch (e) {
        console.error('Send message failed:', e);
        return { success: false, error: '메시지 전송 실패' };
    }
}

export async function getUserUnreadMessageCount() {
    const session = await getSession();
    if (!session) return 0;

    try {
        const res = await db.query('SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND is_read = FALSE', [session.id]);
        return parseInt(res.rows[0].count || '0');
    } catch (e) {
        return 0;
    }
}

export async function deleteUser(targetId: string) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    const allowedJobs = ['대표자', '경영지원'];
    if (!allowedJobs.includes(session.job_title)) {
        return { success: false, error: 'Permission denied' };
    }

    if (session.id === targetId) {
        return { success: false, error: 'Cannot delete yourself' };
    }

    try {
        await db.query('BEGIN');

        // Delete related data first
        // 1. Attendance Logs
        await db.query('DELETE FROM attendance_logs WHERE user_id = $1', [targetId]);

        // 2. Audit Logs
        await db.query('DELETE FROM audit_logs WHERE user_id = $1', [targetId]);

        // 3. Security Logs
        await db.query('DELETE FROM security_logs WHERE user_id = $1', [targetId]);

        // 4. Messages (Both sent and received)
        await db.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $2', [targetId, targetId]);

        // 5. User Permissions
        await db.query('DELETE FROM user_permissions WHERE user_id = $1', [targetId]);

        // 6. Delete User
        const deleteRes = await db.query('DELETE FROM users WHERE id = $1', [targetId]);

        if (deleteRes.rowCount === 0) {
            throw new Error('User not found in database');
        }

        await db.query('COMMIT');

        // Log the action (System log?) - Can't log with the deleted user ID if valid FK required for logAction caller? 
        // But the caller is 'session.id' (Admin), so it's fine.
        await logAction('DELETE_USER', 'user', targetId, 'Deleted by admin');

        revalidatePath('/settings/users');
        revalidatePath('/members');
        return { success: true };
    } catch (e: any) {
        await db.query('ROLLBACK');
        console.error('Failed to delete user:', e);
        return { success: false, error: e.message || 'Failed to delete user' };
    }
}



// --- Dashboard Tasks Actions ---

export async function getDashboardTasks() {
    try {
        // Also insert dummy data if empty for demo
        const check = await db.query('SELECT COUNT(*) as count FROM dashboard_tasks');
        if (check.rows[0].count === '0' || check.rows[0].count === 0) {
            const id1 = Math.random().toString(36).substring(7);
            const id2 = Math.random().toString(36).substring(7);
            await db.query(`INSERT INTO dashboard_tasks (id, content) VALUES ($1, '스마트스토어 카테고리 매핑 확인 필요'), ($2, '반품 목록 엑셀 정리')`, [id1, id2]);
        }

        const res = await db.query(`SELECT * FROM dashboard_tasks ORDER BY is_completed ASC, created_at DESC LIMIT 20`);
        return res.rows;
    } catch (e) {
        console.error("Get tasks failed", e);
        return [];
    }
}

export async function toggleTaskcheck(id: string, status: boolean) {
    try {
        await db.query(`UPDATE dashboard_tasks SET is_completed = $1, completed_at = $2 WHERE id = $3`,
            [status, status ? new Date().toISOString() : null, id]);
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        return { success: false };
    }
}

// --- Settings Actions ---

export async function changePassword(prevState: any, formData: FormData) {
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { success: false, error: '모든 필드를 입력해주세요.' };
    }

    if (newPassword !== confirmPassword) {
        return { success: false, error: '새 비밀번호가 일치하지 않습니다.' };
    }

    try {
        // Verify current password
        const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [session.id]);
        const user = userRes.rows[0];

        if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
            return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
        }

        const newHash = await hashPassword(newPassword);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, session.id]);
        await logAction('CHANGE_PASSWORD', 'user', session.id, 'Password changed');

        return { success: true };
    } catch (e) {
        console.error("Password change failed", e);
        return { success: false, error: '비밀번호 변경 실패' };
    }
}
// ... (existing code)

export async function getPasswordHint(username: string, name: string) {
    try {
        const res = await db.query('SELECT password_hint FROM users WHERE username = $1 AND name = $2', [username, name]);
        if (res.rows.length === 0) {
            return { success: false, error: '일치하는 정보가 없습니다.' };
        }
        return { success: true, hint: res.rows[0].password_hint };
    } catch (e) {
        return { success: false, error: '오류가 발생했습니다.' };
    }
}

export async function getInventoryForExport(searchParams: any) {
    // Replicate search logic from page.tsx (ideally refactor to shared)
    // Updated to support JOIN with categories for better search and display
    const query = searchParams.q || '';
    const excludeCode = searchParams.excludeCode || '';
    const startDate = searchParams.startDate || '';
    const endDate = searchParams.endDate || '';
    const statusParam = searchParams.status || '';
    const categoriesParam = searchParams.category || searchParams.categories || '';
    const conditionsParam = searchParams.conditions || '';
    const sizesParam = searchParams.sizes || '';

    let sqlConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Status
    if (statusParam) {
        const statuses = statusParam.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (statuses.length > 0) {
            const placeholders = statuses.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.status IN (${placeholders.join(', ')})`);
            params.push(...statuses);
        }
    } else {
        sqlConditions.push(`p.status != '폐기'`);
    }

    // Categories
    if (categoriesParam) {
        const cats = categoriesParam.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (cats.length > 0) {
            const placeholders = cats.map(() => `$${paramIndex++}`);
            // Filter by ID or Name
            sqlConditions.push(`(p.category IN (${placeholders.join(', ')}) OR c.name IN (${placeholders.join(', ')}))`);
            // We push the same values twice for the OR condition? 
            // Postgres DOES NOT support named parameters easily here with pg library without tricks.
            // Let's stick to simple ID match for filter, but user might want name match.
            // Actually, usually category filter is IDs. Let's assume IDs.
            // params.push(...cats); -> mismatched param count if we double placeholders.
            // Let's just do p.category check for safe filtering. The UI usually passes IDs.
            // Wait, previous code was id IN ... 
            // Let's keep it simple: p.category IN ...
            // If the UI passes names, this might break.
            // But typical filter involves IDs.
            // Revert: sqlConditions.push(`p.category IN (${placeholders.join(', ')})`);
            // params.push(...cats);
        }
        // Refined:
        const placeholders = cats.map(() => `$${paramIndex++}`);
        sqlConditions.push(`p.category IN (${placeholders.join(', ')})`);
        params.push(...cats);
    }

    // Conditions
    if (conditionsParam) {
        const conds = conditionsParam.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (conds.length > 0) {
            const placeholders = conds.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.condition IN (${placeholders.join(', ')})`);
            params.push(...conds);
        }
    }

    // Sizes
    if (sizesParam) {
        const sizes = sizesParam.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (sizes.length > 0) {
            const placeholders = sizes.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.size IN (${placeholders.join(', ')})`);
            params.push(...sizes);
        }
    }

    // Search Query (Bulk)
    if (query) {
        const terms = query.split(/[\n,]+/).map((s: string) => s.trim()).filter(Boolean);
        if (terms.length > 1) {
            // Bulk ID Search
            const placeholders = terms.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.id IN (${placeholders.join(', ')})`);
            params.push(...terms);
        } else {
            // Text Search (Name, Brand, ID, Category Name, Classification)
            sqlConditions.push(`(p.name LIKE $${paramIndex} OR p.id LIKE $${paramIndex} OR p.brand LIKE $${paramIndex} OR c.name LIKE $${paramIndex} OR c.classification LIKE $${paramIndex})`);
            const likeQuery = `%${query}%`;
            params.push(likeQuery); // We reuse the same param? 
            // In 'pg', $1 can be used multiple times? Yes. 
            // BUT wait, `paramIndex` is incremented ONCE. 
            // Current manual logic: `sqlConditions.push ... $paramIndex ...`
            // If I use $paramIndex 5 times, I only push 1 param.
            // This is correct for positional params in Postgres if I use the SAME syntax? 
            // No, standard pg usually uses specific index. $1, $1, $1 is fine.
            // So:
            // sqlConditions.push(`(p.name LIKE $${paramIndex} OR ... OR c.classification LIKE $${paramIndex})`);
            // params.push(`%${query}%`);
            paramIndex++;
        }
    }

    // Exclude Code
    if (excludeCode) {
        const excludes = excludeCode.split(/[\n,\t\s]+/).map((s: string) => s.trim()).filter(Boolean);
        if (excludes.length > 0) {
            const placeholders = excludes.map(() => `$${paramIndex++}`);
            sqlConditions.push(`p.id NOT IN (${placeholders.join(', ')})`);
            params.push(...excludes);
        }
    }

    // Date Range
    if (startDate) {
        sqlConditions.push(`p.created_at >= $${paramIndex}`);
        params.push(`${startDate} 00:00:00`);
        paramIndex++;
    }
    if (endDate) {
        sqlConditions.push(`p.created_at <= $${paramIndex}`);
        params.push(`${endDate} 23:59:59`);
        paramIndex++;
    }

    const whereClause = sqlConditions.length > 0 ? `WHERE ${sqlConditions.join(' AND ')}` : '';

    try {
        // Updated Query with JOIN
        const sql = `
            SELECT p.*, c.name as category_name, c.classification as category_classification 
            FROM products p 
            LEFT JOIN categories c ON p.category = c.id
            ${whereClause} 
            ORDER BY p.created_at DESC
        `;
        const result = await db.query(sql, params);
        return result.rows;
    } catch (e) {
        console.error('Export failed:', e);
        return [];
    }
}

export async function searchProducts(searchParams: any) {
    // Reuses getInventoryForExport logic but explicitly for search action (POST)
    return getInventoryForExport(searchParams);
}
// Memo Actions
export async function addMemo(content: string) {
    const session = await getSession();
    const author = session ? session.name : '익명';

    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS memos (
                id SERIAL PRIMARY KEY,
                content TEXT NOT NULL,
                author_name VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await db.query('INSERT INTO memos (content, author_name) VALUES ($1, $2)', [content, author]);
        return { success: true };
    } catch (e) {
        return { success: false, error: '메모 저장 실패' };
    }
}

// Bulk Update Action
export async function bulkUpdateProducts(ids: string[], updates: any) {
    // Valid fields to update
    const allowedFields = ['category', 'status', 'condition', 'size', 'price_sell', 'price_consumer', 'brand'];
    const fieldsToUpdate = Object.keys(updates).filter(key => allowedFields.includes(key) && updates[key] !== '' && updates[key] !== null);

    if (fieldsToUpdate.length === 0) {
        return { success: false, error: '변경할 항목이 없습니다.' };
    }

    try {
        const values = fieldsToUpdate.map(key => updates[key]);

        // SQLite has a parameter limit (usually 999).
        // Since we bind update values + IDs, we need to be careful.
        // Chunk size: (999 - values.length) roughly. 500 is safe.
        const CHUNK_SIZE = 500;

        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunkIds = ids.slice(i, i + CHUNK_SIZE);

            const setClauses = fieldsToUpdate.map((key, index) => `${key} = $${index + 1}`);
            const idPlaceholders = chunkIds.map((_, idx) => `$${values.length + 1 + idx}`).join(', ');

            const query = `
                UPDATE products
                SET ${setClauses.join(', ')}
                WHERE id IN (${idPlaceholders})
            `;

            await db.query(query, [...values, ...chunkIds]);
        }

        await logAction('BULK_UPDATE', 'product', 'bulk', `Updated ${ids.length} items: ${fieldsToUpdate.join(', ')}`);
        revalidatePath('/inventory');
        revalidatePath('/smartstore');
        return { success: true };
    } catch (e: any) {
        console.error('Bulk update failed:', e);
        return { success: false, error: e.message || '일괄 수정 실패' };
    }
}

export async function addMemoComment(memoId: number, content: string) {
    const session = await getSession();
    const author = session ? session.name : '익명';

    try {
        await db.query('INSERT INTO memo_comments (memo_id, content, author_name) VALUES ($1, $2, $3)', [memoId, content, author]);
        revalidatePath('/');
        return { success: true };
    } catch (e) {
        return { success: false, error: '댓글 등록 실패' };
    }
}

export async function getMemos() {
    try {
        const res = await db.query('SELECT * FROM memos ORDER BY created_at DESC LIMIT 20');
        const memos = res.rows;

        if (memos.length > 0) {
            const memoIds = memos.map((m: any) => m.id);
            const placeholders = memoIds.map((_, i) => `$${i + 1}`).join(',');

            try {
                const commentRes = await db.query(`
                    SELECT * FROM memo_comments 
                    WHERE memo_id IN (${placeholders}) 
                    ORDER BY created_at ASC
                `, memoIds);

                const comments = commentRes.rows;

                memos.forEach((m: any) => {
                    m.comments = comments.filter((c: any) => c.memo_id === m.id);
                });
            } catch (e) {
                console.error("Failed to fetch memo comments:", e);
                memos.forEach((m: any) => m.comments = []);
            }
        }

        return memos;
    } catch (e) {
        console.error("Failed to get memos:", e);
        return [];
    }
}

export async function bulkUpdateProductsAI(ids: string[], options: { grade: boolean, price: boolean, description: boolean, name: boolean }) {
    if (!ids || ids.length === 0) return { success: false, error: '선택된 상품이 없습니다.' };

    try {
        const CHUNK_SIZE = 500;
        let successCount = 0;

        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
            const chunkIds = ids.slice(i, i + CHUNK_SIZE);
            const params = [chunkIds];

            // Build dynamic update query
            let updates = [];

            if (options.grade) {
                // Compatible random logic
                updates.push(`condition = CASE WHEN ABS(RANDOM() % 10) > 5 THEN 'S급' ELSE 'A급' END`);
            }
            if (options.price) {
                // Set fixed increment for demo instead of random cast
                updates.push(`price_sell = price_sell + 5000`);
            }
            if (options.description) {
                updates.push(`md_comment = 'AI 분석 추천 상품 (상태 우수)'`);
            }

            if (updates.length > 0) {
                const placeholders = chunkIds.map((_, i) => `$${i + 1}`).join(',');
                await db.query(`UPDATE products SET ${updates.join(', ')} WHERE id IN (${placeholders})`, chunkIds);
                successCount += chunkIds.length;
            }
        }

        if (successCount > 0) {
            await logAction('BULK_AI_UPDATE', 'product', 'bulk', `AI Updated ${successCount} items`);
            revalidatePath('/inventory');
            revalidatePath('/smartstore');
            return { success: true, count: successCount };
        } else {
            return { success: false, error: '선택된 AI 작업이 없습니다.' };
        }

    } catch (e: any) {
        console.error('AI Bulk Update Failed', e);
        return { success: false, error: e.message || 'AI 일괄 작업 실패' };
    }
}

// --- SmartStore Integration Actions ---

export async function saveSmartStoreConfig(formData: FormData) {
    const session = await getSession();
    if (!session || (session.job_title !== '대표자' && session.job_title !== '경영지원' && session.job_title !== '총매니저')) {
        return { success: false, error: '권한이 없습니다.' };
    }

    const sellerId = formData.get('sellerId') as string;
    const clientId = formData.get('clientId') as string;
    const clientSecret = formData.get('clientSecret') as string;

    if (!sellerId || !clientId || !clientSecret) {
        return { success: false, error: '모든 필드를 입력해주세요.' };
    }

    try {
        // Upsert configuration
        const config = { sellerId, clientId, clientSecret };
        const query = `
                INSERT INTO system_settings(key, value) VALUES('smartstore_config', $1)
                ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP
                `;
        await db.query(query, [JSON.stringify(config)]);

        await logAction('UPDATE_CONFIG', 'system', 'smartstore', 'Updated API credentials');
        revalidatePath('/settings/smartstore');
        return { success: true };
    } catch (e) {
        console.error('Save config failed:', e);
        return { success: false, error: '설정 저장 실패' };
    }
}

export async function getSmartStoreConfig() {
    const session = await getSession();
    if (!session) return null;

    try {
        const res = await db.query("SELECT value FROM system_settings WHERE key = 'smartstore_config'");
        if (res.rows.length > 0) {
            return JSON.parse(res.rows[0].value);
        }
        return null; // No config found
    } catch (e) {
        console.error('Get config failed:', e);
        return null;
    }
}

export async function testSmartStoreConnection() {
    const session = await getSession();
    if (!session) return { success: false, error: 'Unauthorized' };

    try {
        const { createSmartStoreClient } = await import('./smartstore');
        const client = await createSmartStoreClient();
        if (!client) {
            return { success: false, error: 'API 설정이 완료되지 않았습니다.' };
        }

        const token = await client.getAccessToken();
        if (token) {
            return { success: true, message: '연동 성공! 토큰이 발급되었습니다.' };
        } else {
            return { success: false, error: '연동 실패. Client ID와 Secret을 확인해주세요.' };
        }
    } catch (e: any) {
        console.error('Connection test failed:', e);
        return { success: false, error: e.message || '연동 테스트 중 오류가 발생했습니다.' };
    }
}
