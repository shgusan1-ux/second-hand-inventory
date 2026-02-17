// @imgly/background-removal은 WASM/ONNX 기반 — SSR에서 초기화 에러 방지를 위해 동적 import
// import { removeBackground } from "@imgly/background-removal";

interface ProcessOptions {
    imageUrl: string;
    grade: string; // S, A, B, V
}

export async function processImageWithBadge({ imageUrl, grade }: ProcessOptions): Promise<Blob> {
    // 1. Remove background (Client-side AI)
    // Use Proxy to avoid CORS issues with simple-image fetching inside library
    // Use absolute URL for proxy to prevent imgly from prepending publicPath (if that happens)
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const proxiedUrl = `${origin}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
    console.log('Starting background removal for:', proxiedUrl);

    // Note: @imgly/background-removal fetches the image internally.
    try {
        console.log(`[Processor] Requesting background removal...`);
        console.log(`[Processor] Model Path: ${origin}/models-proxy/ (isnet_quint8)`);

        // 동적 import — 실제 사용 시에만 WASM/ONNX 모듈 로드
        const { removeBackground } = await import("@imgly/background-removal");

        const blob = await removeBackground(proxiedUrl, {
            // Next.js rewrite가 /models-proxy/ → staticimgly.com으로 프록시 (CORS 우회)
            publicPath: `${origin}/models-proxy/`,
            model: 'isnet_quint8', // 44MB (fp16: 88MB, full: 176MB) - 충분한 품질, 빠른 다운로드
            debug: true,
            progress: (key, current, total) => {
                console.log(`[Processor] Progress (${key}): ${Math.round(current / total * 100)}%`);
            }
        });
        console.log(`[Processor] Background removed! Blob size: ${blob.size} bytes`);

        // 2. Load cleaned image
        const imgBitmap = await createImageBitmap(blob);
        console.log(`[Processor] Image bitmap created: ${imgBitmap.width}x${imgBitmap.height}`);

        // 3. Setup Canvas (1024x1024 standsart)
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');

        // Fill Background (Clean Gray/White)
        ctx.fillStyle = '#F0F0F0';
        ctx.fillRect(0, 0, 1024, 1024);

        // 4. Draw Product (Center & Fit)
        const targetSize = 1024 * 0.85;
        const scale = Math.min(targetSize / imgBitmap.width, targetSize / imgBitmap.height);
        const w = imgBitmap.width * scale;
        const h = imgBitmap.height * scale;
        const x = (1024 - w) / 2;
        const y = (1024 - h) / 2;

        ctx.drawImage(imgBitmap, x, y, w, h);

        // 5. Draw Badge (Python 기준: BADGE_OPACITY = 0.4)
        const badgeUrl = `/images/grades/${grade.toLowerCase()}grade.png`;
        console.log(`[Processor] Loading badge: ${badgeUrl}`);
        try {
            const badgeImg = await loadImage(badgeUrl);
            const badgeWidth = 1024 * 0.18; // 18% size
            const badgeHeight = badgeWidth * (badgeImg.height / badgeImg.width);
            ctx.globalAlpha = 0.4; // 배지 불투명도 40%
            ctx.drawImage(badgeImg, 1024 - badgeWidth - 50, 50, badgeWidth, badgeHeight);
            ctx.globalAlpha = 1.0; // 복원
            console.log(`[Processor] Badge composite success (opacity: 0.4)`);
        } catch (e) {
            ctx.globalAlpha = 1.0; // 에러 시에도 복원
            console.error('[Processor] Failed to load badge (skipping):', badgeUrl);
        }

        // 6. Export to Blob
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => {
                if (blob) {
                    console.log(`[Processor] Final thumbnail generated: ${blob.size} bytes`);
                    resolve(blob);
                }
                else reject(new Error('Canvas to Blob failed'));
            }, 'image/jpeg', 0.95);
        });

    } catch (e: any) {
        console.error('[Processor] Critical Error:', e);
        throw e;
    }
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Important for CORS
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}
