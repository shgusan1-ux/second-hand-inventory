import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export async function POST(req: Request) {
    if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json({ error: 'OpenAI API Key is missing' }, { status: 500 });
    }

    try {
        const { text, voice = 'alloy' } = await req.json();

        const mp3 = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice as any,
            input: text,
        });

        const buffer = Buffer.from(await mp3.arrayBuffer());

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
            },
        });
    } catch (error: any) {
        console.error('TTS Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
