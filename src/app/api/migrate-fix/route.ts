import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // classification 컬럼 존재 여부 확인 후 추가
        console.log('Starting migration: adding classification column to categories...');

        await db.query(`
            ALTER TABLE categories 
            ADD COLUMN IF NOT EXISTS classification TEXT;
        `);

        console.log('Migration successful: classification column added.');

        return NextResponse.json({
            success: true,
            message: 'Column "classification" added to "categories" table successfully.'
        });
    } catch (error: any) {
        console.error('Migration failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
