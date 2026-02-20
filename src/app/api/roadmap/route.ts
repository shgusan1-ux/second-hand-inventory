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
    `INSERT INTO business_roadmap (id, term, parent_id, content, color, sort_order, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, term, parentId || null, content, color || null, sortOrder, 'TODO']
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
  const { id, content, color, status, detailed_plan } = body;

  if (!id) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 });
  }

  // If content is provided, update it. If status is provided, update it.
  // To keep it simple, we expect content to be always present for content updates,
  // but for status-only updates, we might need a different approach or just allow partials?
  // Current frontend sends content.
  // Let's assume we might receive content OR status.

  // Actually, easiest is to just update what's provided or keep old.
  // But standard SQL requires values.
  // Let's do a dynamic query or just update everything assuming frontend sends current state.
  // For now, let's update all three: content, color, status.
  // We'll use COALESCE in SQL to keep existing if null/undefined passed (but JSON keys might be missing).

  // Let's use specific logic.
  if (content) {
    await db.query(
      `UPDATE business_roadmap SET content = $1, color = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [content, color || null, id]
    );
  }

  if (status) {
    await db.query(
      `UPDATE business_roadmap SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, id]
    );
  }

  if (detailed_plan !== undefined) {
    await db.query(
      `UPDATE business_roadmap SET detailed_plan = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [detailed_plan, id]
    );
  }

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
