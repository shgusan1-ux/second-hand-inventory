'use server';

import { db } from './db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hashPassword, verifyPassword, createSession, logoutSession, logAction, getSession } from './auth';

// --- Auth Actions ---

export async function register(prevState: any, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const name = formData.get('name') as string;
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
        const id = Math.random().toString(36).substring(2, 9); // Simple ID generation

        await db.query(
            'INSERT INTO users (id, username, password_hash, name, role, password_hint, job_title) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [id, username, hashedPassword, name, role, passwordHint, jobTitle]
        );

        await logAction('REGISTER', 'user', id, `Registered user ${username} (${jobTitle})`);
        await createSession(id); // Auto login
    } catch (e: any) {
        console.error('Registration failed:', e);
        if (e.message.includes('UNIQUE constraint failed') || e.message.includes('unique constraint')) {
            return { success: false, error: '이미 존재하는 ID입니다.' };
        }
        return { success: false, error: '회원가입 실패' };
    }

    redirect('/');
}

export async function login(prevState: any, formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (!user || !(await verifyPassword(password, user.password_hash))) {
        return { success: false, error: '아이디 또는 비밀번호가 잘못되었습니다.' };
    }

    await createSession(user.id);
    await logAction('LOGIN', 'user', user.id, 'User logged in');
    redirect('/');
}

export async function logout() {
    await logAction('LOGOUT', 'user', 'self', 'User logged out');
    await logoutSession();
    redirect('/login');
}

// --- Inventory Actions ---

export async function bulkCreateProducts(products: any[]) {
    // Note: Iterating is slower but safer for generic abstraction without ORM
    // Also, Postgres transaction management via 'sql' tag is different.
    // We will do parallel inserts for speed, or sequential if consistency matters.
    // Sequential for now to avoid connection limits.

    try {
        for (const item of products) {
            await db.query(`
            INSERT INTO products (id, name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, images, size)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            ON CONFLICT(id) DO UPDATE SET
            name=$2, brand=$3, category=$4, price_consumer=$5, price_sell=$6, status=$7, condition=$8, image_url=$9, md_comment=$10, images=$11, size=$12
           `, [
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
                item.size || ''
            ]);
        }

        await logAction('BULK_CREATE_PRODUCTS', 'product', 'bulk', `${products.length} items`);
        revalidatePath('/inventory');
        revalidatePath('/');
        return { success: true, count: products.length };
    } catch (error) {
        console.error('Bulk create failed:', error);
        return { success: false, error: 'Bulk create failed' };
    }
}



export async function addCategory(formData: FormData) {
    const name = formData.get('name') as string;
    const id = formData.get('id') as string || name.toUpperCase();
    const classification = formData.get('classification') as string || '기타';

    try {
        await db.query(
            'INSERT INTO categories (id, name, classification) VALUES ($1, $2, $3)',
            [id, name, classification]
        );
        await logAction('ADD_CATEGORY', 'category', id, `${name} (${classification})`);
        revalidatePath('/inventory/new');
        revalidatePath('/settings');
    } catch (error) {
        console.error('Failed to add category:', error);

    }
}

export async function deleteCategory(id: string) {
    try {
        await db.query('DELETE FROM categories WHERE id = $1', [id]);
        await logAction('DELETE_CATEGORY', 'category', id);
        revalidatePath('/inventory/new');
        revalidatePath('/settings');
    } catch (error) {
        console.error('Failed to delete category:', error);

    }

}

export async function updateCategory(oldId: string, newId: string, name: string, sort_order: number, classification: string) {
    try {
        if (oldId !== newId) {
            const result = await db.query('SELECT 1 FROM categories WHERE id = $1', [newId]);
            if (result.rows.length > 0) throw new Error('New ID already exists');
        }

        await db.query(`
            UPDATE categories 
            SET id = $1, name = $2, sort_order = $3, classification = $4
            WHERE id = $5
        `, [newId, name, sort_order, classification, oldId]);

        revalidatePath('/inventory/new');
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to update category:', error);
        return { success: false, error: 'Failed to update category' };
    }
}

export async function bulkCreateCategories(categories: { id: string, sort_order: number, name: string, classification: string }[]) {
    try {
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
           INSERT INTO products (id, name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, images, size)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [id, name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, imagesJson, size]);

        await logAction('CREATE_PRODUCT', 'product', id, name);

        revalidatePath('/inventory');
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
        const finalParams: any[] = [name, brand, category, price_consumer, price_sell, status, condition, image_url, md_comment, imagesJson, size];

        if (status === '판매완료') {
            finalQuery = `UPDATE products SET name=$1, brand=$2, category=$3, price_consumer=$4, price_sell=$5, status=$6, condition=$7, image_url=$8, md_comment=$9, images=$10, size=$11, sold_at=$12 WHERE id=$13`;
            finalParams.push(sold_at, id);
        } else {
            // If going back to selling, clear sold_at
            finalQuery = `UPDATE products SET name=$1, brand=$2, category=$3, price_consumer=$4, price_sell=$5, status=$6, condition=$7, image_url=$8, md_comment=$9, images=$10, size=$11, sold_at=NULL WHERE id=$12`;
            finalParams.push(id);
        }

        await db.query(finalQuery, finalParams);
        await logAction('UPDATE_PRODUCT', 'product', id, `${name} (${status})`);

        revalidatePath('/inventory');
        revalidatePath('/');
    } catch (error) {
        console.error('Failed to update product:', error);
    }

    redirect('/inventory');
}



export async function deleteProduct(id: string) {
    try {
        // Soft delete (Discard)
        await db.query('UPDATE products SET status = $1 WHERE id = $2', ['폐기', id]);
        await logAction('DISCARD_PRODUCT', 'product', id, 'Moved to trash');
        revalidatePath('/inventory');
        revalidatePath('/');
    } catch (error) {
        console.error('Failed to discard product', error);
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
        const result = await db.query('SELECT id, username, name, role, job_title, created_at FROM users ORDER BY created_at DESC');
        return result.rows;
    } catch (e) {
        console.error('Failed to get users:', e);
        return [];
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
        await db.query('DELETE FROM users WHERE id = $1', [targetId]);
        await logAction('DELETE_USER', 'user', targetId, 'Deleted by admin');
        revalidatePath('/settings/users');
        return { success: true };
    } catch (e) {
        console.error('Failed to delete user:', e);
        return { success: false, error: 'Failed' };
    }
}



// --- Dashboard Tasks Actions ---

export async function getDashboardTasks() {
    // Lazy init table
    try {
        await db.query(`
           CREATE TABLE IF NOT EXISTS dashboard_tasks (
               id TEXT PRIMARY KEY,
               content TEXT NOT NULL,
               created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
               is_completed BOOLEAN DEFAULT FALSE,
               completed_at TIMESTAMP
           )
       `);
    } catch (e) {
        console.error("Task table init error (ignorable if exists)", e);
    }

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
