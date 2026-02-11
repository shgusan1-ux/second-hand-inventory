import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// PUT: 브랜드 수정
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized();
    const { id } = await params;
    const body = await request.json();
    const { brand_name, brand_name_ko, aliases, tier, country, notes } = body;

    const aliasesJson = aliases ? JSON.stringify(aliases) : null;

    await db.query(
      `UPDATE custom_brands SET
        brand_name = COALESCE($1, brand_name),
        brand_name_ko = $2,
        aliases = COALESCE($3, aliases),
        tier = COALESCE($4, tier),
        country = $5,
        notes = $6,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [brand_name?.toUpperCase() || null, brand_name_ko, aliasesJson, tier, country || null, notes || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 브랜드 삭제 (소프트 삭제)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureDbInitialized();
    const { id } = await params;

    await db.query(
      `UPDATE custom_brands SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
