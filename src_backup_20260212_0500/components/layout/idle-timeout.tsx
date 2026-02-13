'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1시간
const EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'] as const;

export function IdleTimeout() {
    const router = useRouter();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleLogout = useCallback(async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch {
            // 실패해도 리다이렉트
        }
        router.replace('/login');
    }, [router]);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(handleLogout, IDLE_TIMEOUT_MS);
    }, [handleLogout]);

    useEffect(() => {
        resetTimer();

        for (const event of EVENTS) {
            window.addEventListener(event, resetTimer, { passive: true });
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            for (const event of EVENTS) {
                window.removeEventListener(event, resetTimer);
            }
        };
    }, [resetTimer]);

    return null;
}
