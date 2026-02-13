'use server';

import { getSession } from './auth';
import { db } from './db';
import { revalidatePath } from 'next/cache';

// --- Database Schema ---

async function ensureKBTables() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS kb_categories (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            order_index INTEGER DEFAULT 0
        )
    `);

    await db.query(`
        CREATE TABLE IF NOT EXISTS kb_articles (
            id TEXT PRIMARY KEY,
            category_id TEXT,
            title TEXT NOT NULL,
            content TEXT, -- HTML or Markdown
            author_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            views INTEGER DEFAULT 0,
            FOREIGN KEY (category_id) REFERENCES kb_categories(id)
        )
    `);
}

// --- Types ---
export interface KBCategory {
    id: string;
    name: string;
    description: string;
    order_index: number;
}

export interface KBArticle {
    id: string;
    category_id: string;
    title: string;
    content: string;
    author_id: string;
    created_at: string;
    updated_at: string;
    views: number;
    author_name?: string;
    category_name?: string;
}

// --- Actions ---

export async function getCategories() {
    await ensureKBTables();
    try {
        const res = await db.query('SELECT * FROM kb_categories ORDER BY order_index ASC');
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function createCategory(name: string, description: string) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원', '개발팀'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    await ensureKBTables();
    const id = Math.random().toString(36).substring(2, 10);
    try {
        await db.query('INSERT INTO kb_categories (id, name, description) VALUES ($1, $2, $3)', [id, name, description]);
        revalidatePath('/business/support');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getArticles(categoryId?: string, search?: string) {
    await ensureKBTables();
    try {
        let query = `
            SELECT a.*, u.name as author_name, c.name as category_name
            FROM kb_articles a
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN kb_categories c ON a.category_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (categoryId) {
            params.push(categoryId);
            query += ` AND category_id = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (title LIKE $${params.length} OR content LIKE $${params.length})`;
        }

        query += ' ORDER BY created_at DESC';

        const res = await db.query(query, params);
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function getArticle(id: string) {
    await ensureKBTables();
    try {
        // Increment views
        await db.query('UPDATE kb_articles SET views = views + 1 WHERE id = $1', [id]);

        const res = await db.query(`
            SELECT a.*, u.name as author_name, c.name as category_name
            FROM kb_articles a
            LEFT JOIN users u ON a.author_id = u.id
            LEFT JOIN kb_categories c ON a.category_id = c.id
            WHERE a.id = $1
        `, [id]);
        return res.rows[0];
    } catch (e) {
        return null;
    }
}

export async function createArticle(data: { categoryId: string, title: string, content: string }) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    await ensureKBTables();
    const id = Math.random().toString(36).substring(2, 12);

    try {
        await db.query(`
            INSERT INTO kb_articles (id, category_id, title, content, author_id)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, data.categoryId, data.title, data.content, session.id]);

        revalidatePath('/business/support');
        return { success: true, id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateArticle(id: string, data: { categoryId: string, title: string, content: string }) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    try {
        await db.query(`
            UPDATE kb_articles 
            SET category_id = $1, title = $2, content = $3, updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
        `, [data.categoryId, data.title, data.content, id]);

        revalidatePath(`/business/support/article/${id}`);
        revalidatePath('/business/support');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteArticle(id: string) {
    const session = await getSession();
    if (!session) return { success: false, error: 'Login required' };

    try {
        await db.query('DELETE FROM kb_articles WHERE id = $1', [id]);
        revalidatePath('/business/support');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}
