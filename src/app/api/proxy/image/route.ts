import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS() {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
    });

    if (!url) return new NextResponse('Missing URL', { status: 400, headers });

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Fetch failed');

        const blob = await response.blob();
        headers.set('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');

        return new NextResponse(blob, { headers });
    } catch (error) {
        console.error('Proxy Error:', error);
        return new NextResponse('Error fetching image', { status: 500, headers });
    }
}
