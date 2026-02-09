import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

interface ClassificationRule {
    archive: string;
    rules: {
        minDays?: number;
        maxDays?: number;
        keywords?: string[];
        brands?: string[];
        categoryClass?: string;
    }[];
}

const DEFAULT_RULES: ClassificationRule[] = [
    {
        archive: 'NEW',
        rules: [{ maxDays: 7 }]
    },
    {
        archive: 'CURATED',
        rules: [
            { minDays: 8, maxDays: 21 },
            { categoryClass: 'CURATED' }
        ]
    },
    {
        archive: 'CLEARANCE',
        rules: [{ minDays: 22 }]
    },
    {
        archive: 'MILITARY',
        rules: [{ keywords: ['M65', 'MA-1', 'BDU', 'ALPHA', 'ROTHCO'], categoryClass: 'MILITARY' }]
    },
    {
        archive: 'WORKWEAR',
        rules: [{ keywords: ['CARHARTT', 'DICKIES', 'WORKWEAR'], categoryClass: 'WORKWEAR' }]
    },
    {
        archive: 'JAPAN',
        rules: [{ brands: ['VISVIM', 'KAPITAL', 'WTAPS', 'NEIGHBORHOOD'], categoryClass: 'JAPAN' }]
    },
    {
        archive: 'EUROPE',
        rules: [{ brands: ['BARBOUR', 'BURBERRY', 'LAVENHAM'], categoryClass: 'EUROPE' }]
    },
    {
        archive: 'BRITISH',
        rules: [{ brands: ['FRED PERRY', 'BEN SHERMAN', 'BARACUTA'], categoryClass: 'BRITISH' }]
    }
];

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') !== '0'; // default true

    try {
        // 1. Fetch products
        const productsRes = await db.query(`
            SELECT p.id, p.name, p.brand, p.created_at, p.master_reg_date, p.archive, p.archive_locked, c.classification as cat_class
            FROM products p
            LEFT JOIN categories c ON p.category = c.id
            WHERE p.status = '판매중'
        `);

        const products = productsRes.rows;
        const now = new Date();
        const results: any[] = [];
        let moveCount = 0;

        for (const p of products) {
            if (p.archive_locked) continue;

            const regDate = p.master_reg_date ? new Date(p.master_reg_date) : new Date(p.created_at);
            const days = Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));

            let targetArchive = 'ETC';
            const brand = (p.brand || '').toUpperCase();
            const name = (p.name || '').toUpperCase();

            // apply rules in order
            for (const group of DEFAULT_RULES) {
                let matched = false;
                for (const rule of group.rules) {
                    // Check date
                    if (rule.minDays !== undefined && days < rule.minDays) continue;
                    if (rule.maxDays !== undefined && days > rule.maxDays) continue;

                    // Check category classification (priority)
                    if (rule.categoryClass && p.cat_class === rule.categoryClass) {
                        matched = true;
                        break;
                    }

                    // Check keywords
                    if (rule.keywords?.some(k => name.includes(k.toUpperCase()))) {
                        matched = true;
                        break;
                    }

                    // Check brands
                    if (rule.brands?.some(b => brand.includes(b.toUpperCase()))) {
                        matched = true;
                        break;
                    }

                    // Specific date match if no conditions above
                    if (rule.minDays !== undefined || rule.maxDays !== undefined) {
                        matched = true;
                        break;
                    }
                }
                if (matched) {
                    targetArchive = group.archive;
                    break;
                }
            }

            if (p.archive !== targetArchive) {
                moveCount++;
                if (results.length < 20) {
                    results.push({
                        id: p.id,
                        name: p.name,
                        old: p.archive || 'NEW',
                        new: targetArchive,
                        days
                    });
                }

                if (!dryRun) {
                    await db.query(`UPDATE products SET archive = $1 WHERE id = $2`, [targetArchive, p.id]);
                }
            }
        }

        return NextResponse.json({
            success: true,
            dryRun,
            moveCount,
            samples: results
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
