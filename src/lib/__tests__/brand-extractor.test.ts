import { extractBrandFromName, ensureBrand } from '../brand-extractor';

describe('Brand Extractor', () => {
    describe('extractBrandFromName', () => {
        it('should extract SNOZU from product name', () => {
            const productName = 'AAAAIR2079 SNOZU 스노즈 아카이브 후리스 배색 윈터 후드 집업 자켓 KIDS-140';
            expect(extractBrandFromName(productName)).toBe('SNOZU');
        });

        it('should extract OSHKOSH from product name', () => {
            const productName = 'AAAADK2043 OSHKOSH 어쩌고 저쩌고';
            expect(extractBrandFromName(productName)).toBe('OSHKOSH');
        });

        it('should handle product names with multiple English words', () => {
            const productName = 'ABC123 NIKE 나이키 티셔츠';
            expect(extractBrandFromName(productName)).toBe('NIKE');
        });

        it('should return empty string if no English brand found', () => {
            const productName = 'ABC123 한글만 있는 상품명';
            expect(extractBrandFromName(productName)).toBe('');
        });

        it('should return empty string for empty input', () => {
            expect(extractBrandFromName('')).toBe('');
        });

        it('should handle brands with numbers', () => {
            const productName = 'XYZ789 BRAND123 브랜드 상품';
            expect(extractBrandFromName(productName)).toBe('BRAND123');
        });

        it('should handle brands with hyphens and ampersands', () => {
            const productName = 'ABC001 H&M 에이치앤엠 티셔츠';
            expect(extractBrandFromName(productName)).toBe('H&M');
        });
    });

    describe('ensureBrand', () => {
        it('should use existing brand if provided', () => {
            const productName = 'AAAAIR2079 SNOZU 스노즈 아카이브';
            const existingBrand = 'CUSTOM_BRAND';
            expect(ensureBrand(productName, existingBrand)).toBe('CUSTOM_BRAND');
        });

        it('should extract brand from name if existing brand is empty', () => {
            const productName = 'AAAAIR2079 SNOZU 스노즈 아카이브';
            expect(ensureBrand(productName, '')).toBe('SNOZU');
        });

        it('should extract brand from name if existing brand is whitespace', () => {
            const productName = 'AAAAIR2079 SNOZU 스노즈 아카이브';
            expect(ensureBrand(productName, '   ')).toBe('SNOZU');
        });

        it('should extract brand from name if no existing brand provided', () => {
            const productName = 'AAAAIR2079 SNOZU 스노즈 아카이브';
            expect(ensureBrand(productName)).toBe('SNOZU');
        });
    });
});
