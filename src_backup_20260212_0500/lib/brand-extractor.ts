/**
 * Extracts the English brand name from a product name string.
 * 
 * Rules:
 * - After the product code, the first English word (uppercase letters) is the brand
 * - Examples:
 *   - "AAAAIR2079 SNOZU 스노즈 아카이브..." → "SNOZU"
 *   - "AAAADK2043 OSHKOSH 어쩌고 저쩌고" → "OSHKOSH"
 * 
 * @param productName - The full product name string
 * @returns The extracted brand name (English only), or empty string if not found
 */
export function extractBrandFromName(productName: string): string {
    if (!productName) return '';

    // Remove leading/trailing whitespace
    const trimmed = productName.trim();

    // Split by spaces
    const parts = trimmed.split(/\s+/);

    // Skip the first part (product code) and find the first English word
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i].trim();

        // Check if this part contains only English letters (A-Z, a-z)
        // We'll be flexible and allow uppercase brand names
        if (/^[A-Z][A-Z0-9&\-'\.]*$/i.test(part)) {
            // Return the uppercase version for consistency
            return part.toUpperCase();
        }
    }

    return '';
}

/**
 * Extracts brand from product name if brand field is empty
 * 
 * @param productName - The product name
 * @param existingBrand - The existing brand value (if any)
 * @returns The brand name (uses existing if provided, otherwise extracts from name)
 */
export function ensureBrand(productName: string, existingBrand?: string): string {
    // If brand is already provided and not empty, use it
    if (existingBrand && existingBrand.trim()) {
        return existingBrand.trim();
    }

    // Otherwise, extract from product name
    return extractBrandFromName(productName);
}
