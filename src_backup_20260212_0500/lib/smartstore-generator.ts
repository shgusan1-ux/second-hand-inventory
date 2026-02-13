
interface ProductData {
  id: string;
  name: string;
  brand: string;
  size: string;
  category: string;
  condition: string;
  md_comment: string;
  images: string[] | string;
  price_sell: number;
  price_consumer: number;
}

export function generateSmartStoreHeader(product: ProductData) {
  const images = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
  const mainImage = images[0] || 'https://via.placeholder.com/800x800?text=No+Image';
  const detailImages = images.slice(1);

  // Grade Logic
  let grade = 'A';
  let gradeTitle = 'Excellent';
  let gradeDesc = '사용감이 적고 깨끗한 상태';
  let gradeColor = '#1A4D3E';

  const cond = (product.condition || '').toUpperCase();
  if (cond.includes('S') || cond === '새상품') {
    grade = 'S'; gradeTitle = 'Mint / Deadstock'; gradeDesc = '택이 부착된 미사용 새상품'; gradeColor = '#D4AF37'; // Gold
  } else if (cond.includes('A') || cond === 'A급') {
    grade = 'A'; gradeTitle = 'Excellent'; gradeDesc = '사용감이 적고 오염/하자가 없는 최상급 상태'; gradeColor = '#1A4D3E';
  } else if (cond.includes('B')) {
    grade = 'B'; gradeTitle = 'Very Good'; gradeDesc = '자연스러운 사용감이 존재하나 양호한 상태'; gradeColor = '#555';
  } else if (cond.includes('V') || cond.includes('빈티지')) {
    grade = 'V'; gradeTitle = 'Vintage'; gradeDesc = '세월의 흔적이 멋스러운 빈티지 제품'; gradeColor = '#A0522D';
  }

  // Styles
  const containerStyle = "max-width:860px; margin:0 auto; font-family:'Pretendard','나눔스퀘어',sans-serif; color:#333; line-height:1.6;";
  const sectionStyle = "margin-bottom: 60px; padding: 0 10px;";
  const titleStyle = "font-size: 24px; font-weight: 800; color: #000; margin-bottom: 20px; text-align: center; letter-spacing: -0.5px;";
  const boxStyle = "background-color: #FAFAFA; border: 1px solid #EEE; border-radius: 12px; padding: 30px; text-align: center;";

  // Content
  const trustHeader = `
        <div style="text-align:center; padding: 40px 0; border-bottom: 1px solid #eee; margin-bottom: 40px;">
            <p style="font-size: 14px; font-weight: 600; color: #1A4D3E; margin-bottom: 10px; letter-spacing: 2px;">PREMIUM VINTAGE SELECTION</p>
            <h2 style="font-size: 28px; font-weight: 900; margin: 0; line-height: 1.3;">엄격하게 선별하고<br>완벽하게 관리합니다.</h2>
            <div style="display: flex; justify-content: center; gap: 30px; margin-top: 30px; font-size: 13px; color: #666;">
                <div>
                     <span style="display:block; font-size:24px; margin-bottom:5px;">🧴</span>
                     <span>스팀 살균/세탁</span>
                </div>
                <div>
                     <span style="display:block; font-size:24px; margin-bottom:5px;">🔍</span>
                     <span>이중 정품 검수</span>
                </div>
                <div>
                     <span style="display:block; font-size:24px; margin-bottom:5px;">📦</span>
                     <span>오후 2시 당일발송</span>
                </div>
            </div>
        </div>
    `;

  const productInfo = `
        <div style="${sectionStyle}">
            <h3 style="${titleStyle}">PRODUCT INFO</h3>
            <div style="${boxStyle}">
                <div style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">${product.brand}</div>
                <div style="font-size: 16px; color: #555; margin-bottom: 30px;">${product.name}</div>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr>
                        <th style="padding: 12px; border-bottom: 1px solid #eee; color: #888; width: 30%;">표기 사이즈</th>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold;">${product.size || '실측 참조'}</td>
                    </tr>
                    <tr>
                        <th style="padding: 12px; border-bottom: 1px solid #eee; color: #888;">상태 등급</th>
                        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: ${gradeColor};">${grade} Grade (${gradeTitle})</td>
                    </tr>
                </table>
            </div>
        </div>
    `;

  const mdComment = `
        <div style="${sectionStyle}">
            <div style="position: relative; background: #FFF; border: 2px solid #1A4D3E; border-radius: 0 20px 0 20px; padding: 40px 30px; box-shadow: 10px 10px 0 #EAEAEA;">
                <div style="position: absolute; top: -15px; left: 30px; background: #1A4D3E; color: #FFF; padding: 5px 15px; font-weight: bold; font-size: 14px;">MD's COMMENT</div>
                <p style="font-size: 16px; line-height: 1.8; color: #333; margin: 0; white-space: pre-wrap;">${product.md_comment || '특별한 설명이 없습니다.'}</p>
            </div>
        </div>
    `;

  const gradeCheck = `
        <div style="${sectionStyle}">
             <h3 style="${titleStyle}">CONDITION CHECK</h3>
             <div style="display: flex; justify-content: center; gap: 10px; margin-bottom: 20px;">
                 ${['S', 'A', 'B', 'V'].map(g => `
                    <div style="
                        width: 60px; height: 60px; 
                        border-radius: 50%; 
                        display: flex; align-items: center; justify-content: center;
                        font-weight: 900; font-size: 20px;
                        ${grade === g ? `background: ${gradeColor}; color: #fff; transform: scale(1.2); box-shadow: 0 5px 15px rgba(0,0,0,0.2);` : `background: #eee; color: #ccc;`}
                    ">${g}</div>
                 `).join('')}
             </div>
             <div style="text-align: center; font-size: 15px; font-weight: bold; color: ${gradeColor};">
                현재 상품 등급: <span style="font-size: 18px;">${grade}</span> (${gradeDesc})
             </div>
        </div>
    `;

  const details = `
        <div style="text-align: center; margin-bottom: 80px;">
            <p style="font-size: 14px; color: #888; margin-bottom: 20px;">▼ 상세 이미지 확인하기 ▼</p>
            ${detailImages.map((img: string) => `<img src="${img}" style="width:100%; max-width:100%; display:block; margin: 0 auto 10px;" loading="lazy" />`).join('')}
        </div>
    `;

  return `
<div style="${containerStyle}">
    ${trustHeader}
    <div style="margin-bottom: 50px;">
        <img src="${mainImage}" style="width:100%; border-radius: 8px;" alt="Main Image" />
    </div>
    ${productInfo}
    ${mdComment}
    ${gradeCheck}
    ${details}
</div>
    `;
}
