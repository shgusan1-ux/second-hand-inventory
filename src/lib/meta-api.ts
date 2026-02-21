/**
 * Meta Graph API 클라이언트
 *
 * Facebook 페이지 + Instagram 비즈니스 계정에 콘텐츠 자동 게시
 * Graph API v22.0 사용 (SDK 없이 fetch로 직접 호출)
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v22.0';

// 환경변수에서 설정 로드
function getConfig() {
    return {
        accessToken: process.env.META_ACCESS_TOKEN || '',
        appId: process.env.META_APP_ID || '',
        appSecret: process.env.META_APP_SECRET || '',
        pageId: process.env.META_PAGE_ID || '',
        igAccountId: process.env.META_IG_ACCOUNT_ID || '',
    };
}

// ─── 타입 ─────────────────────────────────────────────

export interface MetaPageInfo {
    id: string;
    name: string;
    access_token: string;
    instagram_business_account?: {
        id: string;
        username?: string;
    };
}

export interface MetaPostResult {
    success: boolean;
    postId?: string;
    postUrl?: string;
    error?: string;
}

export interface MetaTokenInfo {
    isValid: boolean;
    type?: string;       // 'User' | 'Page'
    appId?: string;
    expiresAt?: number;  // epoch seconds (0 = never expires)
    scopes?: string[];
    error?: string;
}

export interface MetaAccountStatus {
    connected: boolean;
    tokenValid: boolean;
    tokenType?: string;
    expiresAt?: number;
    pages: MetaPageInfo[];
    currentPageId?: string;
    currentPageName?: string;
    igAccountId?: string;
    igUsername?: string;
    scopes?: string[];
    missingScopes?: string[];
    error?: string;
}

// ─── 토큰 검증 ────────────────────────────────────────

/**
 * 액세스 토큰 유효성 + 정보 확인
 */
export async function debugToken(accessToken?: string): Promise<MetaTokenInfo> {
    const config = getConfig();
    const token = accessToken || config.accessToken;
    if (!token) return { isValid: false, error: '토큰이 설정되지 않았습니다' };

    try {
        const res = await fetch(
            `${GRAPH_API_BASE}/debug_token?input_token=${token}&access_token=${token}`
        );
        const data = await res.json();

        if (data.error) {
            return { isValid: false, error: data.error.message };
        }

        const info = data.data;
        return {
            isValid: info.is_valid,
            type: info.type,
            appId: info.app_id,
            expiresAt: info.expires_at || 0,
            scopes: info.scopes || [],
        };
    } catch (err: any) {
        return { isValid: false, error: err.message };
    }
}

/**
 * Short-lived User Token → Long-lived User Token (60일)
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
    accessToken?: string;
    expiresIn?: number;
    error?: string;
}> {
    const config = getConfig();
    if (!config.appId || !config.appSecret) {
        return { error: 'META_APP_ID와 META_APP_SECRET이 필요합니다' };
    }

    try {
        const res = await fetch(
            `${GRAPH_API_BASE}/oauth/access_token?` +
            `grant_type=fb_exchange_token&` +
            `client_id=${config.appId}&` +
            `client_secret=${config.appSecret}&` +
            `fb_exchange_token=${shortLivedToken}`
        );
        const data = await res.json();

        if (data.error) {
            return { error: data.error.message };
        }

        return {
            accessToken: data.access_token,
            expiresIn: data.expires_in,
        };
    } catch (err: any) {
        return { error: err.message };
    }
}

// ─── 페이지 & 인스타그램 계정 조회 ────────────────────

/**
 * 연결된 Facebook 페이지 목록 + 각 페이지의 Instagram 비즈니스 계정 조회
 */
export async function getPages(accessToken?: string): Promise<MetaPageInfo[]> {
    const token = accessToken || getConfig().accessToken;
    if (!token) return [];

    try {
        const res = await fetch(
            `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${token}`
        );
        const data = await res.json();

        if (data.error) {
            console.error('[Meta API] getPages error:', data.error.message);
            return [];
        }

        return (data.data || []).map((page: any) => ({
            id: page.id,
            name: page.name,
            access_token: page.access_token,
            instagram_business_account: page.instagram_business_account
                ? { id: page.instagram_business_account.id, username: page.instagram_business_account.username }
                : undefined,
        }));
    } catch (err: any) {
        console.error('[Meta API] getPages fetch error:', err.message);
        return [];
    }
}

/**
 * 전체 연결 상태 확인 (UI에서 사용)
 */
export async function getAccountStatus(): Promise<MetaAccountStatus> {
    const config = getConfig();
    if (!config.accessToken) {
        return {
            connected: false,
            tokenValid: false,
            pages: [],
            error: 'META_ACCESS_TOKEN 환경변수가 설정되지 않았습니다',
        };
    }

    // 토큰 유효성 체크
    const tokenInfo = await debugToken();
    if (!tokenInfo.isValid) {
        return {
            connected: false,
            tokenValid: false,
            pages: [],
            error: `토큰 무효: ${tokenInfo.error}`,
        };
    }

    // 필요 권한 확인
    const requiredScopes = ['pages_manage_posts', 'pages_read_engagement'];
    const igScopes = ['instagram_basic', 'instagram_content_publish'];
    const allRequired = [...requiredScopes, ...igScopes];
    const missingScopes = allRequired.filter(s => !tokenInfo.scopes?.includes(s));

    // 페이지 목록 조회
    const pages = await getPages();

    // 현재 설정된 페이지 찾기
    const currentPage = config.pageId
        ? pages.find(p => p.id === config.pageId)
        : pages[0]; // 미설정 시 첫 번째 페이지

    return {
        connected: true,
        tokenValid: true,
        tokenType: tokenInfo.type,
        expiresAt: tokenInfo.expiresAt,
        pages,
        currentPageId: currentPage?.id,
        currentPageName: currentPage?.name,
        igAccountId: currentPage?.instagram_business_account?.id || config.igAccountId || undefined,
        igUsername: currentPage?.instagram_business_account?.username,
        scopes: tokenInfo.scopes,
        missingScopes: missingScopes.length > 0 ? missingScopes : undefined,
    };
}

// ─── Facebook 페이지 게시 ──────────────────────────────

/**
 * Facebook 페이지에 텍스트 + 이미지 게시
 */
export async function postToFacebook(options: {
    message: string;
    imageUrl?: string;
    link?: string;
}): Promise<MetaPostResult> {
    const config = getConfig();
    const pages = await getPages();
    const page = config.pageId
        ? pages.find(p => p.id === config.pageId)
        : pages[0];

    if (!page) {
        return { success: false, error: '연결된 Facebook 페이지가 없습니다. 페이지 권한을 확인해주세요.' };
    }

    const pageToken = page.access_token;

    try {
        let postId: string;

        if (options.imageUrl) {
            // 이미지 + 텍스트 게시
            const res = await fetch(`${GRAPH_API_BASE}/${page.id}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: options.imageUrl,
                    message: options.message,
                    access_token: pageToken,
                }),
            });
            const data = await res.json();
            if (data.error) {
                return { success: false, error: data.error.message };
            }
            postId = data.post_id || data.id;
        } else {
            // 텍스트만 게시
            const params: any = {
                message: options.message,
                access_token: pageToken,
            };
            if (options.link) params.link = options.link;

            const res = await fetch(`${GRAPH_API_BASE}/${page.id}/feed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params),
            });
            const data = await res.json();
            if (data.error) {
                return { success: false, error: data.error.message };
            }
            postId = data.id;
        }

        console.log(`[Meta API] Facebook 게시 성공: ${postId}`);
        return {
            success: true,
            postId,
            postUrl: `https://www.facebook.com/${postId}`,
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Instagram 게시 ────────────────────────────────────

/**
 * Instagram 비즈니스 계정에 이미지 + 캡션 게시
 *
 * 2단계 프로세스:
 * 1. 미디어 컨테이너 생성 (이미지 URL + 캡션)
 * 2. 컨테이너 발행
 */
export async function postToInstagram(options: {
    imageUrl: string;     // 공개 접근 가능한 이미지 URL (필수)
    caption: string;      // 캡션 + 해시태그
}): Promise<MetaPostResult> {
    const config = getConfig();
    const pages = await getPages();
    const page = config.pageId
        ? pages.find(p => p.id === config.pageId)
        : pages[0];

    if (!page) {
        return { success: false, error: '연결된 Facebook 페이지가 없습니다' };
    }

    const igAccountId = page.instagram_business_account?.id || config.igAccountId;
    if (!igAccountId) {
        return { success: false, error: '인스타그램 비즈니스 계정이 연결되지 않았습니다. Facebook 페이지에 Instagram 계정을 연결해주세요.' };
    }

    const pageToken = page.access_token;

    try {
        // Step 1: 미디어 컨테이너 생성
        const containerRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: options.imageUrl,
                caption: options.caption,
                access_token: pageToken,
            }),
        });
        const containerData = await containerRes.json();
        if (containerData.error) {
            return { success: false, error: `컨테이너 생성 실패: ${containerData.error.message}` };
        }

        const containerId = containerData.id;
        console.log(`[Meta API] IG 컨테이너 생성: ${containerId}`);

        // Step 2: 컨테이너 상태 확인 (이미지 처리 대기)
        let status = 'IN_PROGRESS';
        let retries = 0;
        while (status === 'IN_PROGRESS' && retries < 30) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(
                `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${pageToken}`
            );
            const statusData = await statusRes.json();
            status = statusData.status_code || 'FINISHED';
            retries++;
        }

        if (status === 'ERROR') {
            return { success: false, error: 'Instagram 미디어 처리 중 오류 발생' };
        }

        // Step 3: 발행
        const publishRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: containerId,
                access_token: pageToken,
            }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) {
            return { success: false, error: `발행 실패: ${publishData.error.message}` };
        }

        const mediaId = publishData.id;
        console.log(`[Meta API] Instagram 게시 성공: ${mediaId}`);

        // 게시물 permalink 가져오기
        const permalinkRes = await fetch(
            `${GRAPH_API_BASE}/${mediaId}?fields=permalink&access_token=${pageToken}`
        );
        const permalinkData = await permalinkRes.json();

        return {
            success: true,
            postId: mediaId,
            postUrl: permalinkData.permalink || `https://www.instagram.com/`,
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

// ─── Instagram 스토리 게시 ─────────────────────────────

/**
 * Instagram 스토리 게시
 */
export async function postToInstagramStory(options: {
    imageUrl: string;
}): Promise<MetaPostResult> {
    const config = getConfig();
    const pages = await getPages();
    const page = config.pageId
        ? pages.find(p => p.id === config.pageId)
        : pages[0];

    if (!page) {
        return { success: false, error: '연결된 Facebook 페이지가 없습니다' };
    }

    const igAccountId = page.instagram_business_account?.id || config.igAccountId;
    if (!igAccountId) {
        return { success: false, error: '인스타그램 비즈니스 계정이 연결되지 않았습니다' };
    }

    const pageToken = page.access_token;

    try {
        // 스토리 컨테이너 생성
        const containerRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: options.imageUrl,
                media_type: 'STORIES',
                access_token: pageToken,
            }),
        });
        const containerData = await containerRes.json();
        if (containerData.error) {
            return { success: false, error: `스토리 컨테이너 생성 실패: ${containerData.error.message}` };
        }

        const containerId = containerData.id;

        // 처리 대기
        let status = 'IN_PROGRESS';
        let retries = 0;
        while (status === 'IN_PROGRESS' && retries < 30) {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await fetch(
                `${GRAPH_API_BASE}/${containerId}?fields=status_code&access_token=${pageToken}`
            );
            const statusData = await statusRes.json();
            status = statusData.status_code || 'FINISHED';
            retries++;
        }

        // 발행
        const publishRes = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: containerId,
                access_token: pageToken,
            }),
        });
        const publishData = await publishRes.json();
        if (publishData.error) {
            return { success: false, error: `스토리 발행 실패: ${publishData.error.message}` };
        }

        console.log(`[Meta API] Instagram 스토리 게시 성공: ${publishData.id}`);
        return {
            success: true,
            postId: publishData.id,
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
