'use server';

import { db } from './db';
import { getSession, logAction } from './auth';
import { ensureDbInitialized } from './db-init';
import { revalidatePath } from 'next/cache';

const INITIAL_PROPERTIES = [
    { id: 'prop_yudong', name: '유동더센트리즈 (본사)', type: 'Building', address: '부산광역시 ...' },
    { id: 'prop_pumeone', name: '품에안은 B동', type: 'Building', address: '경남 양산시 ...' },
    { id: 'prop_beomeo1', name: '범어 대동 1차', type: 'Apartment', address: '경남 양산시 물금읍 ...' },
    { id: 'prop_beomeo2', name: '범어 대동 2차', type: 'Apartment', address: '경남 양산시 물금읍 ...' },
    { id: 'prop_yeosu', name: '여수 에어비앤비', type: 'Hospitality', address: '전남 여수시 ...' },
    { id: 'prop_seoksan', name: '석산리 토지', type: 'Land', address: '경남 양산시 동면 ...' },
    { id: 'prop_haeundae', name: '해운대 패러그래프', type: 'Office', address: '부산 해운대구 ...' },
];

export async function seedProperties() {
    await ensureDbInitialized();
    try {
        for (const p of INITIAL_PROPERTIES) {
            await db.query(`
                INSERT INTO properties (id, name, type, address)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT(id) DO NOTHING
            `, [p.id, p.name, p.type, p.address]);

            // Seed base units if needed
            if (p.type === 'Building') {
                for (let i = 1; i <= 3; i++) {
                    await db.query(`
                        INSERT INTO units (id, property_id, unit_number, status)
                        VALUES ($1, $2, $3, 'Vacant')
                        ON CONFLICT DO NOTHING
                    `, [`unit_${p.id}_${i}F`, p.id, `${i}층 전체`]);
                }
            }
        }
    } catch (e) {
        console.error('Property seed error:', e);
    }
}

export async function getProperties() {
    await ensureDbInitialized();
    // Seed on first load for demo
    await seedProperties();

    try {
        const res = await db.query(`
            SELECT p.*, 
                (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id) as unit_count,
                (SELECT COUNT(*) FROM units u WHERE u.property_id = p.id AND u.status = 'Occupied') as occupied_count
            FROM properties p 
            ORDER BY created_at DESC
        `);
        return res.rows;
    } catch (e) {
        return [];
    }
}

export async function getPropertyDetails(id: string) {
    await ensureDbInitialized();
    try {
        const prop = await db.query('SELECT * FROM properties WHERE id = $1', [id]);
        if (!prop.rows[0]) return null;

        const units = await db.query(`
            SELECT u.*, 
                lc.tenant_name, lc.end_date as lease_end_date, lc.monthly_rent, lc.payment_day
            FROM units u
            LEFT JOIN lease_contracts lc ON u.id = lc.unit_id AND lc.status = 'Active'
            WHERE u.property_id = $1
            ORDER BY u.unit_number ASC
        `, [id]);

        return { ...prop.rows[0], units: units.rows };
    } catch (e) {
        return null;
    }
}

export async function createUnit(propertyId: string, unitNumber: string, area: number, deposit: number, monthly_rent: number) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    const id = `unit_${Math.random().toString(36).substring(2, 8)}`;
    try {
        await db.query(`
            INSERT INTO units (id, property_id, unit_number, area, deposit, monthly_rent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [id, propertyId, unitNumber, area, deposit, monthly_rent]);
        revalidatePath(`/business/property/${propertyId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function registerLease(unitId: string, data: any) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) return { success: false, error: 'Unauthorized' };

    const id = `lease_${Math.random().toString(36).substring(2, 8)}`;
    try {
        await db.query('BEGIN');

        await db.query(`
            INSERT INTO lease_contracts (
                id, unit_id, tenant_name, tenant_contact, 
                deposit, monthly_rent, management_fee, 
                start_date, end_date, payment_day
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            id, unitId, data.tenant_name, data.tenant_contact,
            data.deposit, data.monthly_rent, data.management_fee,
            data.start_date, data.end_date, data.payment_day
        ]);

        await db.query(`UPDATE units SET status = 'Occupied' WHERE id = $1`, [unitId]);

        await db.query('COMMIT');
        revalidatePath(`/business/property`);
        return { success: true };
    } catch (e: any) {
        await db.query('ROLLBACK');
        return { success: false, error: e.message };
    }
}
