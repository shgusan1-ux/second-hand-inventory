// Simple manual test for brand extraction
// Run with: node scripts/test-brand-extractor.mjs

function extractBrandFromName(productName) {
    if (!productName) return '';

    const trimmed = productName.trim();
    const parts = trimmed.split(/\s+/);

    for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();

        if (/^[A-Z][A-Z0-9&\-'\.]*$/i.test(part)) {
            return part.toUpperCase();
        }
    }

    return '';
}

function ensureBrand(productName, existingBrand) {
    if (existingBrand && existingBrand.trim()) {
        return existingBrand.trim();
    }
    return extractBrandFromName(productName);
}

// Test cases
console.log('Testing brand extraction...\n');

const tests = [
    {
        name: 'SNOZU extraction',
        input: 'AAAAIR2079 SNOZU 스노즈 아카이브 후리스 배색 윈터 후드 집업 자켓 KIDS-140',
        expected: 'SNOZU'
    },
    {
        name: 'OSHKOSH extraction',
        input: 'AAAADK2043 OSHKOSH 어쩌고 저쩌고',
        expected: 'OSHKOSH'
    },
    {
        name: 'NIKE extraction',
        input: 'ABC123 NIKE 나이키 티셔츠',
        expected: 'NIKE'
    },
    {
        name: 'H&M with ampersand',
        input: 'ABC001 H&M 에이치앤엠 티셔츠',
        expected: 'H&M'
    },
    {
        name: 'Brand with numbers',
        input: 'XYZ789 BRAND123 브랜드 상품',
        expected: 'BRAND123'
    },
    {
        name: 'No English brand',
        input: 'ABC123 한글만 있는 상품명',
        expected: ''
    }
];

let passed = 0;
let failed = 0;

tests.forEach(test => {
    const result = extractBrandFromName(test.input);
    const success = result === test.expected;

    if (success) {
        console.log(`✅ ${test.name}: PASSED`);
        console.log(`   Input: "${test.input}"`);
        console.log(`   Result: "${result}"\n`);
        passed++;
    } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Input: "${test.input}"`);
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Got: "${result}"\n`);
        failed++;
    }
});

// Test ensureBrand
console.log('Testing ensureBrand...\n');

const ensureTests = [
    {
        name: 'Use existing brand',
        productName: 'AAAAIR2079 SNOZU 스노즈',
        existingBrand: 'CUSTOM',
        expected: 'CUSTOM'
    },
    {
        name: 'Extract when empty',
        productName: 'AAAAIR2079 SNOZU 스노즈',
        existingBrand: '',
        expected: 'SNOZU'
    },
    {
        name: 'Extract when undefined',
        productName: 'AAAAIR2079 SNOZU 스노즈',
        existingBrand: undefined,
        expected: 'SNOZU'
    }
];

ensureTests.forEach(test => {
    const result = ensureBrand(test.productName, test.existingBrand);
    const success = result === test.expected;

    if (success) {
        console.log(`✅ ${test.name}: PASSED`);
        console.log(`   Result: "${result}"\n`);
        passed++;
    } else {
        console.log(`❌ ${test.name}: FAILED`);
        console.log(`   Expected: "${test.expected}"`);
        console.log(`   Got: "${result}"\n`);
        failed++;
    }
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passed + failed} tests`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`${'='.repeat(50)}`);

process.exit(failed > 0 ? 1 : 0);
