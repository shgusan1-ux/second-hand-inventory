'use server';

import { db } from './db';
import { revalidatePath } from 'next/cache';

export async function getProductsForFabricCheck(limit: number = 50) {
    try {
        const query = `
      SELECT id, name, image_url, fabric, brand, category, size, price_sell
      FROM products 
      WHERE fabric IS NULL OR fabric = '' OR fabric = '정보 없음'
      ORDER BY created_at DESC
      LIMIT $1
    `;
        const res = await db.query(query, [limit]);
        return res.rows;
    } catch (error) {
        console.error('Error fetching products for fabric check:', error);
        return [];
    }
}

export async function updateProductFabric(id: string, fabric: string) {
    try {
        const query = `UPDATE products SET fabric = $1 WHERE id = $2`;
        await db.query(query, [fabric, id]);
        revalidatePath('/inventory');
        return { success: true };
    } catch (error: any) {
        console.error('Error updating fabric:', error);
        return { success: false, error: error.message };
    }
}
