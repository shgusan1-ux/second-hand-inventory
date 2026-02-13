
export interface ChannelProduct {
    originProductNo: number;
    channelProductNo: number;
    channelServiceType: 'STOREFARM';
    categoryId: string;
    name: string;
    sellerManagementCode?: string;
    statusType: 'SALE' | 'SUSPENSION' | 'OUTOFSTOCK' | 'WAIT' | 'DELETE';
    channelProductDisplayStatusType: 'ON' | 'OFF';
    salePrice: number;
    discountedPrice: number;
    mobileDiscountedPrice?: number;
    stockQuantity: number;
    images?: { url: string }[];
    regDate?: string;
    modDate?: string;
    brandName?: string;
    manufacturerName?: string;
    modelName?: string;
    tags?: string[];
    deliveryAttributeType?: string;
    deliveryFee?: number;
    returnFee?: number;
    exchangeFee?: number;
}

export interface Product {
    originProductNo: number;
    channelProducts: ChannelProduct[];
    exhibitionCategoryIds?: string[];
}

export interface ProductDetailResponse {
    originProduct: {
        statusType: string;
        saleType: string;
        leafCategoryId: string;
        name: string;
        detailContent: string;
        images: {
            representativeImage?: { url: string };
            optionalImages?: { url: string }[];
        };
        salePrice: number;
        stockQuantity: number;
        deliveryInfo?: any;
        detailAttribute?: any;
        customerBenefit?: any;
        optionInfo?: any;
    };
    smartstoreChannelProduct?: any;
}

export interface ProductSearchResponse {
    contents: Product[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
    first: boolean;
    last: boolean;
}

export interface NaverCategory {
    id: string;
    name: string;
    wholeCategoryName: string;
    last: boolean;
}

export interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: "Bearer";
}
