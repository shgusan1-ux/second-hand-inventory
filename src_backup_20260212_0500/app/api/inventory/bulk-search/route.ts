import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const { codes } = await request.json();

        if (!codes || !Array.isArray(codes) || codes.length === 0) {
            return NextResponse.json({ products: [], totalCount: 0 });
        }

        // Batch processing to avoid massive SQL queries
        const CHUNK_SIZE = 500;
        const chunks = [];
        for (let i = 0; i < codes.length; i += CHUNK_SIZE) {
            chunks.push(codes.slice(i, i + CHUNK_SIZE));
        }

        let allProducts: any[] = [];

        // Execute queries in parallel for performance, or sequential for safety.
        // Parallel is fine for read-only.
        const results = await Promise.all(chunks.map(async (chunk) => {
            const sanitizedTerms = chunk.map((t: string) => `'${t.replace(/'/g, "''")}'`);
            const sql = `SELECT * FROM products WHERE id IN (${sanitizedTerms.join(', ')}) ORDER BY created_at DESC`;
            const result = await db.query(sql);
            return result.rows;
        }));

        // Flatten results
        results.forEach(rows => allProducts.push(...rows));

        // Remove duplicates if any (though IDs should be unique per query, user might have dupes)
        const uniqueProducts = Array.from(new Map(allProducts.map(p => [p.id, p])).values());

        return NextResponse.json({
            products: uniqueProducts,
            totalCount: uniqueProducts.length
        });

    } catch (error) {
        console.error('Bulk search error:', error);
        return NextResponse.json({ error: 'Data fetch failed' }, { status: 500 });
    }
}
