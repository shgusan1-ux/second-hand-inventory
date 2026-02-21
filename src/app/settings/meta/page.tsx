import { getMetaConfig, getSnsPosts } from '@/lib/actions';
import { MetaClientComponent } from './client-component';

export const dynamic = 'force-dynamic';

export default async function MetaSettingsPage() {
    const config = await getMetaConfig();
    const { posts } = await getSnsPosts(20);

    return (
        <div className="space-y-6 max-w-3xl mx-auto p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Meta API 설정
                </h1>
                <p className="text-slate-500 mt-2">
                    Facebook 페이지 및 Instagram 비즈니스 계정 연동을 관리합니다.
                </p>
            </div>

            <MetaClientComponent
                initialConfig={config}
                recentPosts={posts}
            />

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                <h3 className="font-bold mb-2">📌 설정 방법</h3>
                <ol className="list-decimal list-inside space-y-1.5">
                    <li><a href="https://developers.facebook.com/apps/" target="_blank" className="underline hover:text-blue-600">Meta 개발자 콘솔</a>에서 앱을 생성합니다.</li>
                    <li>앱 설정 → 기본 설정에서 <b>App ID</b>와 <b>App Secret</b>을 확인합니다.</li>
                    <li><a href="https://developers.facebook.com/tools/explorer/" target="_blank" className="underline hover:text-blue-600">Graph API Explorer</a>에서 토큰을 생성합니다.</li>
                    <li>필수 권한: <code className="bg-blue-100 px-1 rounded">pages_manage_posts</code>, <code className="bg-blue-100 px-1 rounded">instagram_basic</code>, <code className="bg-blue-100 px-1 rounded">instagram_content_publish</code></li>
                    <li>토큰 생성 시 Facebook 페이지를 선택하고, Instagram 비즈니스 계정이 연결되어 있어야 합니다.</li>
                </ol>
            </div>
        </div>
    );
}
