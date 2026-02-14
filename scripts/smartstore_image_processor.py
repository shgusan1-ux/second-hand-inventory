import os
import sys
import re
import cv2
import requests
import numpy as np
from PIL import Image
from io import BytesIO

# Try to import rembg, if not available, fallback to simple processing
try:
    from rembg import remove, new_session
    has_rembg = True
    session = new_session()
except ImportError:
    has_rembg = False

# Configuration
CANVAS_SIZE = (1024, 1024)
BG_COLOR = (240, 240, 240)
PRODUCT_SIZE_RATIO = 0.85
BADGE_OPACITY = 0.4
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Map grades to local files in public/images/grades/
GRADE_ICONS = {
    "S": "../public/images/grades/sgrade.png",
    "A": "../public/images/grades/agrade.png",
    "B": "../public/images/grades/bgrade.png",
    "V": "../public/images/grades/vgrade.png"
}

def process_image_3px_cut(img_pil):
    """경계선을 블러 없이 안쪽으로 3픽셀 깎아 회색선 제거"""
    try:
        # 1) Background removal if available
        if has_rembg:
            no_bg_img = remove(img_pil, session=session)
        else:
            # Fallback: Treat as already having alpha or just use as is
            no_bg_img = img_pil.convert("RGBA")
            
        np_img = np.array(no_bg_img)
        if np_img.shape[2] < 4:
            # No alpha channel, can't erode
            return img_pil.convert("RGBA")
            
        alpha = np_img[:, :, 3]
        
        # 2) [핵심] 3픽셀 침식 (Erosion)
        kernel = np.ones((3, 3), np.uint8)
        alpha_cut = cv2.erode(alpha, kernel, iterations=3) 
        
        np_img[:, :, 3] = alpha_cut
        
        clean_img = Image.fromarray(np_img)
        
        # 3) 영역에 맞춰 크롭
        bbox = clean_img.getbbox()
        return clean_img.crop(bbox) if bbox else clean_img
        
    except Exception as e:
        print(f"이미지 처리 중 오류: {e}", file=sys.stderr)
        return img_pil.convert("RGBA")

def save_optimized_jpg(img_rgba, out_path):
    """배경색 위에 칼같이 잘린 이미지를 합성"""
    final_rgb = Image.new("RGB", img_rgba.size, BG_COLOR)
    final_rgb.paste(img_rgba, (0, 0), img_rgba)
    final_rgb.save(out_path, format="JPEG", quality=95, optimize=True)

def main():
    if len(sys.argv) < 4:
        print("Usage: python smartstore_image_processor.py <input_url_or_path> <grade> <output_path>")
        sys.exit(1)

    input_src = sys.argv[1]
    grade = sys.argv[2].upper()
    out_path = sys.argv[3]

    try:
        # Load image
        if input_src.startswith('http'):
            headers = {"User-Agent": "Mozilla/5.0"}
            resp = requests.get(input_src, headers=headers, timeout=30)
            raw_img = Image.open(BytesIO(resp.content)).convert("RGB")
        else:
            raw_img = Image.open(input_src).convert("RGB")

        # Process: Remove BG and 3px cut
        clothing = process_image_3px_cut(raw_img)

        # 캔버스 배치
        canvas = Image.new("RGBA", CANVAS_SIZE, (0,0,0,0))
        max_side = int(CANVAS_SIZE[0] * PRODUCT_SIZE_RATIO)
        clothing.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        
        ox, oy = (CANVAS_SIZE[0]-clothing.width)//2, (CANVAS_SIZE[1]-clothing.height)//2
        canvas.paste(clothing, (ox, oy), clothing)

        # 등급 배지 합성
        grade_key = grade[0] if grade else ""
        if grade_key in GRADE_ICONS:
            badge_rel_path = GRADE_ICONS[grade_key]
            badge_path = os.path.join(BASE_DIR, badge_rel_path)
            if os.path.exists(badge_path):
                badge = Image.open(badge_path).convert("RGBA")
                bw = int(CANVAS_SIZE[0] * 0.18)
                bh = int(bw * badge.height / badge.width)
                badge = badge.resize((bw, bh), Image.LANCZOS)
                
                # Apply opacity to alpha layer
                alpha_layer = badge.split()[3].point(lambda p: int(p * BADGE_OPACITY))
                badge.putalpha(alpha_layer)
                
                canvas.alpha_composite(badge, (CANVAS_SIZE[0]-bw-50, 50))
            else:
                print(f"Warning: Badge icon not found at {badge_path}", file=sys.stderr)

        # Save result
        save_optimized_jpg(canvas, out_path)
        print(f"Success: {out_path}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
