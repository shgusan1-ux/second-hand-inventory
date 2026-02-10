
export interface ChannelProduct {
    originProductNo: number;
    channelProductNo: number;
    channelServiceType: 'STOREFARM';
    categoryId: string;
    name: string;
    sellerManagementCode?: string;
    statusType: 'SALE' | 'SUSPENSION' | 'OUTOFSTOCK';
    channelProductDisplayStatusType: 'ON' | 'OFF';
    salePrice: number;
    discountedPrice: number;
    stockQuantity: number;
    images: { url: string }[];
    regDate: string;
    modDate: string;
    brandName?: string;
    manufacturerName?: string;
    modelName?: string;
    tags?: string[];
}

export interface Product {
    originProductNo: number;
    channelProducts: ChannelProduct[];
    exhibitionCategoryIds?: string[];
}

export interface ProductSearchResponse {
    contents: Product[];
    totalCount: number;
    page: number;
    size: number;
}

export interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: "Bearer";
}
