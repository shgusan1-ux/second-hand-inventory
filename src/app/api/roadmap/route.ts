import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDbInitialized } from '@/lib/db-init';
import { getSession } from '@/lib/auth';

// GET: 로드맵 전체 조회
export async function GET() {
  await ensureDbInitialized();
  const { rows } = await db.query(
    `SELECT * FROM business_roadmap ORDER BY term, sort_order, created_at`
  );
  return NextResponse.json({ items: rows });
}

// POST: 노드 추가
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 수정 가능합니다' }, { status: 403 });
  }

  await ensureDbInitialized();
  const body = await request.json();
  const { term, parentId, content, color } = body;

  if (!term || !content) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  const id = `rm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  // sort_order: 같은 parent 아래 마지막 순서
  const { rows: maxRows } = await db.query(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM business_roadmap WHERE term = $1 AND ${parentId ? 'parent_id = $2' : 'parent_id IS NULL'}`,
    parentId ? [term, parentId] : [term]
  );
  const sortOrder = maxRows[0]?.next_order || 0;

  await db.query(
    `INSERT INTO business_roadmap (id, term, parent_id, content, color, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, term, parentId || null, content, color || null, sortOrder]
  );

  return NextResponse.json({ success: true, id });
}

// PUT: 노드 수정
export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 수정 가능합니다' }, { status: 403 });
  }

  await ensureDbInitialized();
  const body = await request.json();
  const { id, content, color } = body;

  if (!id || !content) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  await db.query(
    `UPDATE business_roadmap SET content = $1, color = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [content, color || null, id]
  );

  return NextResponse.json({ success: true });
}

// DELETE: 노드 삭제 (하위 노드 포함)
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 수정 가능합니다' }, { status: 403 });
  }

  await ensureDbInitialized();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID 필요' }, { status: 400 });
  }

  // 하위 노드도 삭제
  await db.query(`DELETE FROM business_roadmap WHERE parent_id = $1`, [id]);
  await db.query(`DELETE FROM business_roadmap WHERE id = $1`, [id]);

  return NextResponse.json({ success: true });
}
