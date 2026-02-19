// Shared HTML generation functions for product detail pages
export function generateProductDetailHTML(product: any): string {
  const imageUrls = product.image_url ? product.image_url.split(',').map((url: string) => url.trim()) : [];
  const mainImage = imageUrls[0] || '';

  const measurements = parseMeasurements(product);
  const rawMdComment = product.md_comment || generateMDComment(product);
  const mdComment = formatMDComment(rawMdComment);
  const gradeInfo = getGradeInfo(product.condition || 'A급');
  const fabric = product.fabric || '케어라벨 미부착으로 확인불가';

  return `<div style="max-width:860px; margin:0 auto; font-family:'나눔스퀘어','NanumSquare','Malgun Gothic',sans-serif; color:#333; line-height:1.75; letter-spacing:-0.3px;">
  <div style="margin:0 0 30px;">
    <img src="${mainImage}" style="width:100%; height:auto; display:block; margin:0 auto 18px; max-width:860px; border-radius:8px;" />
  </div>

  <div style="text-align:center; margin:60px 0 60px; padding:0 10px;">
    <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:100%; max-width:860px; border-collapse:separate; border-spacing:0;">
      <tbody>
        <tr>
          <td style="background:linear-gradient(180deg, #FDFCF8 0%, #F5F3EC 100%); border:1px solid #D4C9A8; border-radius:16px; padding:45px 30px 40px; text-align:center; box-shadow:0 12px 35px rgba(0,0,0,0.08);">
            <div style="margin:0 0 8px;">
              <span style="display:inline-block; width:60px; height:1px; background:#1A4D3E; vertical-align:middle;"></span>
              <span style="display:inline-block; margin:0 12px; font-size:11px; color:#8B7E6A; letter-spacing:4px; text-transform:uppercase; vertical-align:middle; font-weight:600;">Curated Selection</span>
              <span style="display:inline-block; width:60px; height:1px; background:#1A4D3E; vertical-align:middle;"></span>
            </div>
            <div style="font-size:24px; font-weight:900; margin:0 0 6px; color:#1A4D3E; letter-spacing:1.5px; font-family:Georgia,'Times New Roman',serif;">
              MD's Pick
            </div>
            <div style="width:40px; height:2px; background:#1A4D3E; margin:12px auto 28px;"></div>
            <div style="text-align:left; margin:0 auto; max-width:680px; font-size:14.5px; color:#4A4A4A; line-height:2.0;">
              ${mdComment}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="padding:0 12px; margin:0 0 50px; text-align:center;">
    <h3 style="font-size:19px; font-weight:900; color:#1A4D3E; margin:0 0 20px; letter-spacing:0.8px;">PRODUCT INFO</h3>
    <div style="display:inline-block; text-align:left; width:100%; max-width:520px;">
      <ul style="list-style:none; padding:0; font-size:14px; line-height:2.0; margin:0;">
        <li style="margin:0 0 6px;"><span style="color:#1A4D3E; margin-right:8px;">▪</span> <strong style="display:inline-block; width:86px; color:#555;">BRAND</strong> <b>${product.brand || '-'}</b></li>
        <li style="margin:0 0 6px;"><span style="color:#1A4D3E; margin-right:8px;">▪</span> <strong style="display:inline-block; width:86px; color:#555;">SIZE</strong> ${formatSizeWithGender(product.size, product.name)}</li>
        <li><span style="color:#1A4D3E; margin-right:8px;">▪</span> <strong style="display:inline-block; width:86px; color:#555;">FABRIC</strong> ${fabric}</li>
      </ul>
    </div>
  </div>

  <div style="padding: 0 15px; margin-bottom: 60px;">
    <div style="background-color: #F8F7F2; border: 1px solid #1A4D3E; border-radius: 8px; padding: 30px 20px; text-align: center;">
      <h3 style="font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1A4D3E;">📏 SIZE GUIDE (cm)</h3>
      <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 15px; font-size: 16px; color: #555;">
        ${measurements.map(m => `
        <div style="background: white; border: 1px solid #1A4D3E; border-radius: 6px; padding: 10px 20px; min-width: 120px;">
          <div style="font-size: 12px; color: #888; margin-bottom: 4px;">${m.label}</div>
          <div style="font-size: 18px; font-weight: bold; color: #1A4D3E;">${m.value}</div>
        </div>
        `).join('')}
      </div>
      <p style="margin-top: 20px; font-size: 13px; color: #888; letter-spacing: -0.5px;">* 측정 방법 및 위치에 따라 1~2cm 오차가 발생할 수 있습니다.</p>
    </div>
  </div>

  <div style="text-align: center; margin-bottom: 60px;">
    <h3 style="font-size: 22px; font-weight: bold; color: #1A4D3E; margin-bottom: 35px; letter-spacing: 1px;">DETAIL VIEW</h3>
    ${(() => {
      // [MUST FOLLOW] DETAIL VIEW 이미지 절대 규칙
      // Rule 4: vert.jpg 예외 처리 - vert.jpg가 있으면 다른 모든 상세 이미지 무시
      const hasVert = imageUrls.some((url: string) => url.toLowerCase().includes('vert.jpg'));

      let detailImages = [];
      if (hasVert) {
        // vert.jpg만 출력 (다른 모든 상세 이미지 무시, 중복 방지)
        const vertImage = imageUrls.find((url: string) => url.toLowerCase().includes('vert.jpg'));
        if (vertImage) detailImages.push(vertImage);
      } else {
        // Rule 1: 대표이미지(1번)은 상단에 이미 표시되므로 DETAIL VIEW에서는 2번부터 출력
        // Rule 2: 요약 및 생략 금지 - 2번 이후 이미지를 하나도 누락 없이 출력
        detailImages = imageUrls.length > 1 ? imageUrls.slice(1) : imageUrls;
      }

      // Rule 5: 태그 형식 유지 - 정확한 형식으로 한 줄에 하나씩 출력
      // [FINAL CHECK] 출력 전 검수: detailImages.length 확인
      return detailImages.map((url: string) => `
    <img alt="" src="${url}" style="width:100%; height:auto; display:block; margin:0 auto 18px;" />
    `).join('');
    })()}
  </div>

  <div style="padding:35px 18px; background:#F8F7F2; margin:0 0 60px; text-align:center; border-radius:12px; border:1px solid #EAE8DF;">
    <h3 style="font-size:18px; font-weight:900; margin:0 0 22px; color:#1A4D3E;">✨ CONDITION CHECK</h3>
    <div style="display:inline-block; padding:12px 25px; background:#1A4D3E; color:#fff; font-size:16px; font-weight:900; border-radius:10px; margin-bottom:12px; box-shadow:0 2px 5px rgba(26,77,62,0.18);">GRADE : ${product.condition || 'A급'}</div>
    <p style="font-size:14px; color:#555; line-height:1.6; margin:0;">${gradeInfo}</p>
  </div>
</div>`;
}

function parseMeasurements(product: any): Array<{ label: string; value: string }> {
  const measurements: Array<{ label: string; value: string }> = [];

  const measurementFields = [
    { key: 'shoulder', label: '어깨' },
    { key: 'chest', label: '가슴' },
    { key: 'waist', label: '허리' },
    { key: 'sleeve', label: '소매' },
    { key: 'length', label: '총장' },
    { key: 'hem', label: '밑단' },
    { key: 'rise', label: '밑위' },
    { key: 'thigh', label: '허벅지' },
    { key: 'inseam', label: '안쪽기장' },
  ];

  measurementFields.forEach(({ key, label }) => {
    if (product[key]) {
      let value = product[key];

      if (key === 'waist' && !isNaN(value)) {
        const cm = parseFloat(value);
        const inches = Math.round((cm * 2) / 2.54);
        value = `${cm}cm (${inches}in)`;
      } else if (!isNaN(value)) {
        value = `${value}cm`;
      }

      measurements.push({ label, value });
    }
  });

  return measurements;
}

function generateMDComment(product: any): string {
  const brand = product.brand || '브랜드';
  const condition = product.condition || 'A급';
  const category = product.category || '아이템';

  const comments = [
    `${brand}의 ${condition} 상품으로, 깔끔한 상태의 ${category}입니다. 실측 사이즈를 꼭 확인해주세요.`,
    `${brand} 정품 ${category}입니다. ${condition} 등급으로 상태가 우수하며, 디테일 사진을 참고해주세요.`,
    `${brand}의 시그니처 ${category}로, ${condition} 컨디션의 제품입니다. 실물 사진 확인 후 구매 부탁드립니다.`,
    `깔끔한 ${condition} 상태의 ${brand} ${category}입니다. 사이즈 가이드를 참고하여 선택해주세요.`,
  ];

  // Use product ID or name length for deterministic selection (avoid Math.random for SSR)
  const index = product.id ? (product.id.length % comments.length) : 0;
  return comments[index];
}

// MD 코멘트의 [제목] 패턴을 헤리티지 스타일 서브헤딩으로 변환
function formatMDComment(raw: string): string {
    // 한글 섹션 제목 → 영어로 통일 (기존 저장된 한글 제목도 변환)
    let text = raw;
    text = text.replace(/\[브랜드\s*헤리티지\]/g, '[Brand Heritage]');
    text = text.replace(/\[디테일\s*가이드\]/g, '[Detail Guide]');
    text = text.replace(/\[아카이브\s*밸류\]/g, '[Archive Value]');
    text = text.replace(/\[컬렉터\s*코멘트\]/g, "[Collector's Comment]");

    // [제목] 패턴을 스타일링된 소제목으로 변환
    // Collector's Comment는 필기체(cursive) 스타일 적용
    let html = text.replace(/\[([^\]]+)\]/g, (_match, title) => {
        const isCollectorComment = /collector/i.test(title) || /컬렉터\s*코멘트/.test(title);
        if (isCollectorComment) {
            // Collector's Comment: 필기체 스타일 제목 + 이탤릭 본문
            return `</p><div style="margin:32px 0 10px; text-align:center;"><span style="display:inline-block; font-size:15px; font-weight:400; color:#1A4D3E; letter-spacing:1px; font-family:'Palatino Linotype','Book Antiqua','Georgia',cursive; font-style:italic; border-bottom:1px solid #D4C9A8; padding-bottom:4px;">${title}</span></div><p style="margin:0; font-size:15px; color:#5A5A5A; line-height:2.0; font-family:'Palatino Linotype','Book Antiqua','Georgia',cursive; font-style:italic; text-align:center;">`;
        }
        return `</p><div style="margin:28px 0 10px; text-align:center;"><span style="display:inline-block; font-size:13px; font-weight:800; color:#1A4D3E; letter-spacing:2.5px; text-transform:uppercase; font-family:Georgia,'Times New Roman',serif; border-bottom:2px solid #D4C9A8; padding-bottom:4px;">${title}</span></div><p style="margin:0; font-size:14.5px; color:#4A4A4A; line-height:2.0;">`;
    });
    // 줄바꿈 처리
    html = html.replace(/\n/g, '<br>');
    // 첫 번째 빈 </p> 제거
    html = html.replace(/^<\/p>/, '');
    // 마지막에 <p> 닫기 보정
    if (!html.endsWith('</p>')) html += '</p>';
    return html;
}

function formatSizeWithGender(size: string | undefined, productName: string | undefined): string {
    if (!size) return '-';
    // 상품명에서 성별 추출 (예: "BURBERRY 코트 MAN-XL" → MAN)
    const genderMatch = (productName || '').match(/(MAN|WOMAN|KIDS|UNISEX)-\S+$/);
    if (genderMatch) {
        const gender = genderMatch[1] === 'UNISEX' ? 'UNISEX' : genderMatch[1];
        // 이미 성별 prefix가 포함된 사이즈면 그대로 반환
        if (size.startsWith(gender)) return size;
        return `${gender}-${size}`;
    }
    return size;
}

function getGradeInfo(condition: string): string {
  const gradeMap: Record<string, string> = {
    'S': '새상품 수준의 최상급 컨디션입니다.',
    'S급': '새상품 수준의 최상급 컨디션입니다.',
    'A': '매우 우수한 상태로, 사용감이 거의 없습니다.',
    'A급': '매우 우수한 상태로, 사용감이 거의 없습니다.',
    'B': '일부 데미지나 하자가 있을 수 있으니 사진을 꼭 참조해주세요.',
    'B급': '일부 데미지나 하자가 있을 수 있으니 사진을 꼭 참조해주세요.',
    'V': '빈티지 특성상 사용감이 존재하며, 이것이 제품의 매력입니다.',
    'V급': '빈티지 특성상 사용감이 존재하며, 이것이 제품의 매력입니다.',
  };

  return gradeMap[condition] || '상태는 사진을 참고해주세요.';
}
