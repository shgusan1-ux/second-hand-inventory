import { removeBackground } from "@imgly/background-removal";

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
    const blob = await removeBackground(proxiedUrl, {
        publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal-data@1.7.0/dist/',
        debug: true,
        progress: (key, current, total) => {
            console.log(`[Background Removal] ${key}: ${current}/${total}`);
        }
    });

    // 2. Load cleaned image
    const imgBitmap = await createImageBitmap(blob);

    // 3. Setup Canvas (1024x1024 standart)
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context failed');

    // Fill Background (Clean Gray/White)
    ctx.fillStyle = '#F0F0F0';
    ctx.fillRect(0, 0, 1024, 1024);

    // 4. Draw Product (Center & Fit)
    // Calculate aspect ratio to fit within 85% of canvas (approx 870px)
    const targetSize = 1024 * 0.85;
    const scale = Math.min(targetSize / imgBitmap.width, targetSize / imgBitmap.height);
    const w = imgBitmap.width * scale;
    const h = imgBitmap.height * scale;
    const x = (1024 - w) / 2;
    const y = (1024 - h) / 2;

    ctx.drawImage(imgBitmap, x, y, w, h);

    // 5. Draw Badge
    // We need to load badge images. Assuming they are in /images/grades/
    const badgeUrl = `/images/grades/${grade.toLowerCase()}grade.png`;
    try {
        const badgeImg = await loadImage(badgeUrl);
        const badgeWidth = 1024 * 0.18; // 18% size
        const badgeHeight = badgeWidth * (badgeImg.height / badgeImg.width);

        // Draw badge at top-right with padding
        // Opacity 1.0 (or set ctx.globalAlpha = 0.8 etc)
        ctx.drawImage(badgeImg, 1024 - badgeWidth - 50, 50, badgeWidth, badgeHeight);
    } catch (e) {
        console.error('Failed to load badge:', badgeUrl);
    }

    // 6. Export to Blob
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
        }, 'image/jpeg', 0.95);
    });
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
