'use client';

import { VoiceAssistant } from './voice-assistant';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

export function GlobalVoiceAssistant() {
    const pathname = usePathname();

    // Don't show global assistant on the dedicated command page to avoid duplication
    if (pathname === '/admin/command') return null;

    const handleGlobalCommand = async (text: string) => {
        try {
            const res = await fetch('/api/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command: text,
                    model: 'v3.1'
                })
            });

            if (!res.ok) throw new Error('API Error');

            const data = await res.json();

            // Re-sync logic: if command was a sync or change, maybe notify or reload
            if (data.intent === 'sync_naver' || data.intent === 'update_product_price' || data.intent === 'update_product_status') {
                toast.success('변경사항이 처리되었습니다.');
            }

            return data;
        } catch (error) {
            console.error('Global command error:', error);
            return { message: '죄송합니다. 명령을 처리하는 중 오류가 발생했습니다.' };
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[100] md:bottom-10 md:right-10">
            <div className="group relative">
                {/* Floating label for desktop */}
                <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[10px] font-black px-3 py-1.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest shadow-xl hidden md:block border border-slate-700">
                    Antigravity Core
                </div>

                <VoiceAssistant
                    onCommand={handleGlobalCommand}
                    minimal={false}
                />
            </div>
        </div>
    );
}
