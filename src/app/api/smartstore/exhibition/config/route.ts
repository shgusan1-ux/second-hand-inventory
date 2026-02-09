import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        success: true,
        ids: {
            CURATED: process.env.SMARTSTORE_CURATED_ID,
            ARCHIVE: process.env.SMARTSTORE_ARCHIVE_ROOT_ID,
            CLEARANCE: process.env.SMARTSTORE_CLEARANCE_ID,
            MILITARY: process.env.SMARTSTORE_ARCHIVE_MILITARY_ID,
            WORKWEAR: process.env.SMARTSTORE_ARCHIVE_WORKWEAR_ID,
            JAPAN: process.env.SMARTSTORE_ARCHIVE_JAPAN_ID,
            EUROPE: process.env.SMARTSTORE_ARCHIVE_EUROPE_ID,
            BRITISH: process.env.SMARTSTORE_ARCHIVE_BRITISH_ID
        }
    });
}
