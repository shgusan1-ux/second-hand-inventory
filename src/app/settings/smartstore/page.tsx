import { saveSmartStoreConfig, getSmartStoreConfig } from '@/lib/actions';
import { ClientComponent } from './client-component';

export default async function SmartStoreConfigPage() {
    const config = await getSmartStoreConfig();
    const initialSellerId = config?.sellerId || 'ncp_1p4o0e_01'; // Default from user request
    const initialClientId = config?.clientId || '';
    const initialClientSecret = config?.clientSecret || '';

    return (
        <div className="space-y-6 max-w-2xl mx-auto p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">네이버 스마트스토어 API 설정</h1>
                <p className="text-slate-500 mt-2">
                    커머스API 센터에서 발급받은 애플리케이션 정보를 입력해주세요.
                </p>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <ClientComponent
                    initialSellerId={initialSellerId}
                    initialClientId={initialClientId}
                    initialClientSecret={initialClientSecret}
                />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
                <h3 className="font-bold mb-2">📌 API 키 발급 방법</h3>
                <ol className="list-decimal list-inside space-y-1">
                    <li><a href="https://commerceapi.naver.com/" target="_blank" className="underline hover:text-blue-600">네이버 커머스API 센터</a>에 접속하여 로그인합니다.</li>
                    <li>애플리케이션 등록을 선택하고 API 그룹에서 <b>'상품', '주문'</b> 등을 선택합니다.</li>
                    <li>설정 완료 후 발급된 <b>애플리케이션 ID</b>와 <b>시크릿</b>을 위 폼에 입력합니다.</li>
                </ol>
            </div>
        </div>
    );
}
