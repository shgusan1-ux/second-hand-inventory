// @imgly/background-removal은 WASM/ONNX 기반 — SSR에서 초기화 에러 방지를 위해 동적 import
// import { removeBackground } from "@imgly/background-removal";

// 모듈 캐시: 한 번 import하면 재사용
let _bgRemovalModule: any = null;
let _preloadPromise: Promise<any> | null = null;

/**
 * 페이지 로드 시 사전 호출하여 WASM 모듈을 미리 로드
 */
export function preloadBackgroundRemoval(): void {
    if (_bgRemovalModule || _preloadPromise) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    console.log('[Processor] 배경제거 모델 사전 로드 시작...');
    _preloadPromise = import("@imgly/background-removal").then(mod => {
        _bgRemovalModule = mod;
        console.log('[Processor] 배경제거 모듈 로드 완료 (WASM ready)');
        return mod;
    }).catch(err => {
        console.warn('[Processor] 사전 로드 실패 (사용 시 재시도):', err);
        _preloadPromise = null;
    });
}

async function getBgRemovalModule() {
    if (_bgRemovalModule) return _bgRemovalModule;
    if (_preloadPromise) return await _preloadPromise;
    _bgRemovalModule = await import("@imgly/background-removal");
    return _bgRemovalModule;
}

interface ProcessOptions {
    imageUrl: string;
    grade: string; // S, A, B, V
    quickMode?: boolean; // true = 배경제거 없이 뱃지만 합성 (빠름)
}

export async function processImageWithBadge({ imageUrl, grade, quickMode = false }: ProcessOptions): Promise<Blob> {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    try {
        let imgBitmap: ImageBitmap;

        if (quickMode) {
            // 빠른 모드: 배경제거 없이 원본 이미지에 뱃지만 합성
            console.log('[Processor] 빠른 모드: 배경제거 건너뜀');
            const img = await loadImage(imageUrl);
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.naturalWidth;
            tempCanvas.height = img.naturalHeight;
            const tempCtx = tempCanvas.getContext('2d')!;
            tempCtx.drawImage(img, 0, 0);
            imgBitmap = await createImageBitmap(tempCanvas);
        } else {
            // 풀 모드: 배경제거 + 뱃지 합성
            const proxiedUrl = `${origin}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;
            console.log('Starting background removal for:', proxiedUrl);
            console.log(`[Processor] Requesting background removal...`);
            console.log(`[Processor] Model Path: ${origin}/models-proxy/ (isnet_quint8)`);

            const { removeBackground } = await getBgRemovalModule();

            const blob = await removeBackground(proxiedUrl, {
                publicPath: `${origin}/models-proxy/`,
                model: 'isnet_quint8',
                debug: true,
                progress: (key: string, current: number, total: number) => {
                    console.log(`[Processor] Progress (${key}): ${Math.round(current / total * 100)}%`);
                }
            });
            console.log(`[Processor] Background removed! Blob size: ${blob.size} bytes`);
            imgBitmap = await createImageBitmap(blob);
        }

        console.log(`[Processor] Image bitmap created: ${imgBitmap.width}x${imgBitmap.height}`);

        // 3. Setup Canvas (1024x1024)
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
