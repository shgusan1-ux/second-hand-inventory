import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('c:\\prj\\second-hand-inventory\\temp_new_check.json', 'utf8'));
const products = data?.data?.contents || [];
const newProducts = products.filter(p => p.internalCategory === 'NEW' && p.statusType === 'SALE');
console.log('Total products:', products.length);
console.log('NEW + SALE products:', newProducts.length);

const tierScores = {LUXURY:50, PREMIUM:45, HIGH:40, MIDDLE:30, LOW:20, OTHER:10};

function score(p) {
    let s = 0;
    const cl = p.classification || {};
    if (cl.gender === 'KIDS') return 0;

    let grade = cl.visionGrade || '';
    if (!grade && p.descriptionGrade) grade = p.descriptionGrade + '급';
    if (grade.includes('V')) s += 60;
    else if (grade.includes('S')) s += 50;
    else if (grade.includes('A')) s += 40;
    else if (grade.includes('B')) s += 20;

    s += tierScores[cl.brandTier] || 10;
    const days = p.lifecycle?.daysSince || 0;
    s += Math.max(0, 50 - days * 2);
    s += (cl.confidence || 0) / 4;
    return s;
}

newProducts.sort((a, b) => score(b) - score(a));

console.log('\n=== TOP 15 NEW 상품 (salesScore 기준) ===');
newProducts.slice(0, 15).forEach((p, i) => {
    const s = score(p);
    const cl = p.classification || {};
    const name = (p.name || '').substring(0, 55);
    console.log(`${(i+1).toString().padStart(2)}. [${s.toFixed(0).padStart(4)}점] ${name}`);
    console.log(`     브랜드: ${cl.brand || '?'} | 티어: ${cl.brandTier || '?'} | 등급: ${cl.visionGrade || '-'} | ${p.lifecycle?.daysSince || 0}일 | ID: ${p.originProductNo}`);
});

// Check for DOLCE&GABBANA
const dg = newProducts.find(p => (p.name || '').toUpperCase().includes('DOLCE'));
if (dg) {
    const dgScore = score(dg);
    const dgIdx = newProducts.indexOf(dg);
    console.log(`\n=== DOLCE&GABBANA 확인 ===`);
    console.log(`순위: ${dgIdx + 1} / ${newProducts.length}`);
    console.log(`점수: ${dgScore.toFixed(0)}`);
    console.log(`상품명: ${dg.name}`);
    console.log(`카테고리: ${dg.internalCategory}`);
    console.log(`ID: ${dg.originProductNo}`);
} else {
    console.log('\nDOLCE&GABBANA: NEW 카테고리에 없음');
}
