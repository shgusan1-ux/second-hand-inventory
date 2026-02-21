'use client';

import { useState, useEffect, useActionState } from 'react';
import { saveMetaConfig, testMetaConnection } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface MetaConfig {
    accessToken?: string;
    appId?: string;
    appSecret?: string;
    pageId?: string;
    igAccountId?: string;
}

interface MetaStatusData {
    connected: boolean;
    tokenValid: boolean;
    tokenType?: string;
    expiresAt?: number;
    currentPageName?: string;
    igUsername?: string;
    scopes?: string[];
    missingScopes?: string[];
    pages?: Array<{ id: string; name: string }>;
    error?: string;
}

interface SnsPost {
    id: string;
    platform: string;
    post_id: string;
    post_url: string;
    message: string;
    image_url: string;
    status: string;
    created_at: string;
}

const PLATFORM_NAMES: Record<string, string> = {
    'facebook': '페이스북',
    'instagram-feed': '인스타 피드',
    'instagram-story': '인스타 스토리',
};

export function MetaClientComponent({
    initialConfig,
    recentPosts,
}: {
    initialConfig: MetaConfig | null;
    recentPosts: SnsPost[];
}) {
    // 연결 상태
    const [status, setStatus] = useState<MetaStatusData | null>(null);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);

    // 테스트
    const [isTesting, setIsTesting] = useState(false);
    const [testPages, setTestPages] = useState<Array<{
        id: string; name: string; igId?: string; igUsername?: string;
    }>>([]);

    // 폼 값
    const [pageId, setPageId] = useState(initialConfig?.pageId || '');
    const [igAccountId, setIgAccountId] = useState(initialConfig?.igAccountId || '');

    // 폼 서버 액션
    const [, formAction, isPending] = useActionState(async (_prevState: any, formData: FormData) => {
        // pageId, igAccountId는 hidden이 아닌 select에서 가져올 수 있으므로 수동 추가
        formData.set('pageId', pageId);
        formData.set('igAccountId', igAccountId);

        const result = await saveMetaConfig(formData);
        if (result.success) {
            toast.success('Meta API 설정이 저장되었습니다.');
            // 상태 새로고침
            fetchStatus();
        } else {
            toast.error(result.error || '설정 저장 실패');
        }
        return result;
    }, null);

    // 연결 상태 조회
    const fetchStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const res = await fetch('/api/sns/meta');
            const data = await res.json();
            setStatus(data);
        } catch {
            setStatus({ connected: false, tokenValid: false });
        } finally {
            setIsLoadingStatus(false);
        }
    };

    useEffect(() => { fetchStatus(); }, []);

    // 연동 테스트
    const handleTest = async () => {
        setIsTesting(true);
        try {
            const result = await testMetaConnection();
            if (result.success) {
                toast.success(result.message);
                if (result.pages && result.pages.length > 0) {
                    setTestPages(result.pages);
                    // 첫 번째 페이지 자동 선택
                    if (!pageId) {
                        setPageId(result.pages[0].id);
                        setIgAccountId(result.pages[0].igId || '');
                    }
                }
            } else {
                toast.error(result.error || '연동 테스트 실패');
                setTestPages([]);
            }
        } catch (e) {
            toast.error('연동 테스트 중 오류가 발생했습니다.');
        } finally {
            setIsTesting(false);
        }
    };

    // 토큰 만료 계산
    const formatExpiry = (epoch: number) => {
        if (!epoch || epoch === 0) return '만료 없음 (영구)';
        const d = new Date(epoch * 1000);
        const now = Date.now();
        const diff = d.getTime() - now;
        if (diff < 0) return '만료됨';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}일 후 만료 (${d.toLocaleDateString('ko-KR')})`;
        if (hours > 0) return `${hours}시간 후 만료`;
        return `${Math.floor(diff / (1000 * 60))}분 후 만료`;
    };

    return (
        <div className="space-y-6">
            {/* ─── 연결 상태 카드 ─── */}
            <div className={`p-5 rounded-lg border ${
                status?.connected && status?.tokenValid
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
            }`}>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-slate-900">연결 상태</h2>
                    <button
                        onClick={fetchStatus}
                        disabled={isLoadingStatus}
                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                    >
                        {isLoadingStatus ? '확인 중...' : '새로고침'}
                    </button>
                </div>

                {isLoadingStatus ? (
                    <p className="text-sm text-slate-500">연결 상태 확인 중...</p>
                ) : status?.connected && status?.tokenValid ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                            <span className="text-sm font-bold text-emerald-700">연결됨</span>
                            <span className="text-xs text-slate-500">
                                ({status.tokenType} 토큰)
                            </span>
                        </div>

                        {status.expiresAt !== undefined && (
                            <p className="text-xs text-slate-600">
                                토큰 만료: {formatExpiry(status.expiresAt)}
                            </p>
                        )}

                        {status.currentPageName && (
                            <p className="text-xs text-slate-600">
                                Facebook 페이지: <b>{status.currentPageName}</b>
                            </p>
                        )}

                        {status.igUsername && (
                            <p className="text-xs text-slate-600">
                                Instagram: <b>@{status.igUsername}</b>
                            </p>
                        )}

                        {/* 권한 배지 */}
                        {status.scopes && status.scopes.length > 0 && (
                            <div className="pt-2">
                                <p className="text-xs font-bold text-slate-500 mb-1">보유 권한</p>
                                <div className="flex flex-wrap gap-1">
                                    {status.scopes.map(s => (
                                        <span key={s} className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {status.missingScopes && status.missingScopes.length > 0 && (
                            <div className="pt-1">
                                <p className="text-xs font-bold text-red-500 mb-1">부족한 권한</p>
                                <div className="flex flex-wrap gap-1">
                                    {status.missingScopes.map(s => (
                                        <span key={s} className="px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                            <span className="text-sm font-bold text-red-700">미연결</span>
                        </div>
                        {status?.error && (
                            <p className="text-xs text-red-600">{status.error}</p>
                        )}
                    </div>
                )}
            </div>

            {/* ─── 토큰 설정 폼 ─── */}
            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-4">API 설정</h2>
                <form action={formAction} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="accessToken">Access Token</Label>
                        <textarea
                            id="accessToken"
                            name="accessToken"
                            defaultValue={initialConfig?.accessToken ? '••••••••' : ''}
                            placeholder="Graph API Explorer에서 생성한 액세스 토큰을 붙여넣으세요"
                            className="w-full px-3 py-2 border rounded-md text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            onFocus={(e) => {
                                if (e.target.value === '••••••••') e.target.value = '';
                            }}
                        />
                        <p className="text-xs text-slate-500">
                            토큰은 암호화되어 저장됩니다. 빈 값으로 저장하면 기존 토큰이 유지됩니다.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="appId">App ID</Label>
                            <Input
                                id="appId"
                                name="appId"
                                defaultValue={initialConfig?.appId || ''}
                                placeholder="Meta 앱 ID"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="appSecret">App Secret</Label>
                            <Input
                                id="appSecret"
                                name="appSecret"
                                defaultValue={initialConfig?.appSecret ? '••••••••' : ''}
                                placeholder="Meta 앱 시크릿"
                                type="password"
                                onFocus={(e) => {
                                    if (e.target.value === '••••••••') e.target.value = '';
                                }}
                            />
                        </div>
                    </div>

                    {/* 페이지 선택 */}
                    {testPages.length > 0 && (
                        <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                            <Label>Facebook 페이지 선택</Label>
                            <select
                                value={pageId}
                                onChange={(e) => {
                                    setPageId(e.target.value);
                                    const selected = testPages.find(p => p.id === e.target.value);
                                    setIgAccountId(selected?.igId || '');
                                }}
                                className="w-full px-3 py-2 border rounded-md text-sm"
                            >
                                <option value="">페이지 선택...</option>
                                {testPages.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} {p.igUsername ? `(@${p.igUsername})` : ''}
                                    </option>
                                ))}
                            </select>
                            {igAccountId && (
                                <p className="text-xs text-blue-600">
                                    Instagram 계정 ID: {igAccountId}
                                </p>
                            )}
                        </div>
                    )}

                    {/* 현재 설정된 페이지 (테스트 전) */}
                    {!testPages.length && initialConfig?.pageId && (
                        <div className="text-xs text-slate-500 p-2 bg-slate-50 rounded">
                            설정된 Page ID: {initialConfig.pageId}
                            {initialConfig.igAccountId && ` / IG: ${initialConfig.igAccountId}`}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={handleTest}
                            disabled={isTesting || isPending}
                        >
                            {isTesting ? '테스트 중...' : '연동 테스트'}
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isPending || isTesting}
                        >
                            {isPending ? '저장 중...' : '설정 저장'}
                        </Button>
                    </div>
                </form>
            </div>

            {/* ─── 게시 이력 ─── */}
            {recentPosts.length > 0 && (
                <div className="bg-white p-6 rounded-lg border shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">
                        최근 게시 이력 ({recentPosts.length}건)
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-xs text-slate-500">
                                    <th className="pb-2 pr-3">플랫폼</th>
                                    <th className="pb-2 pr-3">메시지</th>
                                    <th className="pb-2 pr-3">상태</th>
                                    <th className="pb-2">게시일</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentPosts.map(post => (
                                    <tr key={post.id} className="border-b last:border-0">
                                        <td className="py-2 pr-3">
                                            <span className="px-2 py-0.5 text-xs bg-slate-100 rounded font-bold">
                                                {PLATFORM_NAMES[post.platform] || post.platform}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-3 max-w-[200px]">
                                            {post.post_url ? (
                                                <a
                                                    href={post.post_url}
                                                    target="_blank"
                                                    className="text-blue-600 hover:underline truncate block"
                                                >
                                                    {post.message?.slice(0, 50) || '게시물 보기'}
                                                </a>
                                            ) : (
                                                <span className="text-slate-500 truncate block">
                                                    {post.message?.slice(0, 50) || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-2 pr-3">
                                            <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                                                post.status === 'published'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {post.status === 'published' ? '게시됨' : post.status}
                                            </span>
                                        </td>
                                        <td className="py-2 text-xs text-slate-500">
                                            {new Date(post.created_at).toLocaleString('ko-KR', {
                                                month: 'short', day: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
