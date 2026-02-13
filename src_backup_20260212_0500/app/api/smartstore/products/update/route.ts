import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { handleApiError, handleSuccess } from '@/lib/api-utils';

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, name, category } = body;

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        await ensureDbInitialized();

        // Check if override exists to handle partial updates gracefully?
        // Actually, let's assume client sends current state for simplicity or use COALESCE in SQL
        // But COALESCE with EXCLUDED is standard pattern:
        // SET col = COALESCE(EXCLUDED.col, table.col) -- No, EXCLUDED contains the NEW values.
        // If I pass NULL in VALUES, EXCLUDED.col is NULL.
        // So I can use: 
        // INSERT INTO ... VALUES ($1, $2, $3)
        // ON CONFLICT (id) DO UPDATE SET 
        //   product_name = COALESCE($2, product_overrides.product_name),
        //   internal_category = COALESCE($3, product_overrides.internal_category)

        // However, empty string is valid name? Maybe. But undefined/null is "no change".

        const productName = name === undefined ? null : name;
        const internalCategory = category === undefined ? null : category;

        await db.query(`
            INSERT INTO product_overrides (id, product_name, internal_category, updated_at)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE 
            SET product_name = COALESCE($2, product_overrides.product_name),
                internal_category = COALESCE($3, product_overrides.internal_category),
                updated_at = CURRENT_TIMESTAMP
        `, [id, productName, internalCategory]);

        return handleSuccess({ success: true, message: 'Updated successfully' });
    } catch (error: any) {
        return handleApiError(error, 'Update Product Override');
    }
}
