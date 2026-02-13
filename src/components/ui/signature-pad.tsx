'use client';

import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, PenLine } from 'lucide-react';

interface SignaturePadProps {
    onEnd: (dataUrl: string | null) => void;
}

export function SignaturePad({ onEnd }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // High DPI Support
        const ratio = window.devicePixelRatio || 1;
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(ratio, ratio);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 2; // thinner for pen-like feel
            ctx.strokeStyle = '#000000';
        }
    }, []);

    const getPos = (e: any) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: any) => {
        e.preventDefault(); // prevent scrolling on touch
        setIsDrawing(true);
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: any) => {
        e.preventDefault();
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
            if (!hasSignature) setHasSignature(true);
        }
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const canvas = canvasRef.current;
            if (canvas && hasSignature) {
                onEnd(canvas.toDataURL('image/png'));
            }
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height); // clear scaled rect
            setHasSignature(false);
            onEnd(null);
        }
    };

    return (
        <div className="space-y-2">
            <div className="border-2 border-slate-300 border-dashed rounded-lg bg-white overflow-hidden touch-none relative h-40 w-full">
                <canvas
                    ref={canvasRef}
                    className="w-full h-full block cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 select-none">
                        <PenLine className="w-4 h-4 mr-2" />
                        여기에 서명하세요
                    </div>
                )}
            </div>
            <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={clear} className="text-slate-500 h-8 text-xs hover:text-red-500">
                    <Eraser className="w-3.5 h-3.5 mr-1" />
                    지우기
                </Button>
            </div>
        </div>
    );
}
