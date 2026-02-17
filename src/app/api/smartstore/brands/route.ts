import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';

// GET: 브랜드 목록 조회
export async function GET(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    let query = 'SELECT * FROM custom_brands WHERE is_active = TRUE';
    const params: any[] = [];

    if (search) {
      query += ' AND (brand_name LIKE $1 OR brand_name_ko LIKE $1 OR aliases LIKE $1)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY brand_name ASC';

    const { rows } = await db.query(query, params);

    // aliases JSON 파싱
    const brands = rows.map((r: any) => ({
      ...r,
      aliases: r.aliases ? JSON.parse(r.aliases) : [],
    }));

    return NextResponse.json({ brands });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: 브랜드 추가 (단일 또는 대량)
export async function POST(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const body = await request.json();

    // 대량 등록 처리
    if (Array.isArray(body)) {
      let successCount = 0;
      let errorCount = 0;

      for (const item of body) {
        try {
          const { brand_name, brand_name_ko, aliases, tier, country, notes } = item;
          if (!brand_name) continue;

          const aliasesJson = JSON.stringify(aliases || []);
          await db.query(
            `INSERT INTO custom_brands (brand_name, brand_name_ko, aliases, tier, country, notes)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT(brand_name) DO UPDATE SET
             brand_name_ko=EXCLUDED.brand_name_ko,
             aliases=EXCLUDED.aliases,
             tier=EXCLUDED.tier,
             country=EXCLUDED.country,
             notes=EXCLUDED.notes,
             is_active=TRUE`,
            [brand_name.toUpperCase(), brand_name_ko || null, aliasesJson, tier || 'OTHER', country || null, notes || null]
          );
          successCount++;
        } catch (e) {
          errorCount++;
        }
      }
      return NextResponse.json({ success: true, message: `${successCount}개 브랜드 등록 완료 (실패: ${errorCount})` });
    }

    // 단일 등록 처리
    const { brand_name, brand_name_ko, aliases, tier, country, notes } = body;

    if (!brand_name) {
      return NextResponse.json({ error: '브랜드명은 필수입니다' }, { status: 400 });
    }

    const aliasesJson = JSON.stringify(aliases || []);

    await db.query(
      `INSERT INTO custom_brands (brand_name, brand_name_ko, aliases, tier, country, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(brand_name) DO UPDATE SET
       brand_name_ko=$2, aliases=$3, tier=$4, country=$5, notes=$6, is_active=TRUE`,
      [brand_name.toUpperCase(), brand_name_ko || null, aliasesJson, tier || 'OTHER', country || null, notes || null]
    );

    return NextResponse.json({ success: true, message: `${brand_name} 추가 완료` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: 브랜드 삭제 (논리적 삭제)
export async function DELETE(request: NextRequest) {
  try {
    await ensureDbInitialized();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
    }

    await db.query('UPDATE custom_brands SET is_active = FALSE WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

