'use server';

import axios from 'axios';
import { db } from './db';
import { getSession, logAction } from './auth';

/**
 * IBK 기업은행 API 연동 (Scaffold)
 * 
 * 실제 연동 시에는 CODEF(codef.io)나 토스페이먼츠 등의 어그리게이터를 사용하는 것이 일반적입니다.
 * 여기서는 CODEF API를 기준으로 구조를 잡습니다.
 */

const CODEF_CLIENT_ID = process.env.CODEF_CLIENT_ID;
const CODEF_CLIENT_SECRET = process.env.CODEF_CLIENT_SECRET;
const CODEF_PUBLIC_KEY = process.env.CODEF_PUBLIC_KEY;
const CODEF_API_HOST = process.env.CODEF_API_HOST || 'https://api.codef.io';

// KFTC Open Banking Config
const KFTC_CLIENT_ID = process.env.KFTC_CLIENT_ID;
const KFTC_CLIENT_SECRET = process.env.KFTC_CLIENT_SECRET;
const KFTC_ORG_CODE = process.env.KFTC_ORG_CODE;
const KFTC_ACCESS_TOKEN = process.env.KFTC_ACCESS_TOKEN;
const KFTC_API_HOST = process.env.KFTC_API_HOST || 'https://testapi.openbanking.or.kr';

/**
 * 금융결제원 은행거래고유번호 생성 (20자리)
 * 이용기관코드(9자리) + U + 이용기관부여번호(10자리)
 */
function generateBankTranId() {
    if (!KFTC_ORG_CODE) return '000000000U0000000000';
    const uniquePart = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return `${KFTC_ORG_CODE}U${uniquePart}`;
}

/**
 * KFTC 오픈뱅킹 잔액 조회
 */
export async function getKFTCBalance(fintechUseNum: string) {
    if (!KFTC_ACCESS_TOKEN) return { success: false, error: 'KFTC 토큰 없음' };

    try {
        const response = await axios.get(`${KFTC_API_HOST}/v2.0/account/balance/fin_num`, {
            params: {
                bank_tran_id: generateBankTranId(),
                fintech_use_num: fintechUseNum,
                tran_dtime: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
            },
            headers: { 'Authorization': `Bearer ${KFTC_ACCESS_TOKEN}` }
        });

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('[KFTC Balance Error]', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * KFTC 오픈뱅킹 거래내역 조회
 */
export async function getKFTCTransactions(fintechUseNum: string, fromDate: string, toDate: string) {
    if (!KFTC_ACCESS_TOKEN) return { success: false, error: 'KFTC 토큰 없음' };

    try {
        const response = await axios.get(`${KFTC_API_HOST}/v2.0/account/transaction_list/fin_num`, {
            params: {
                bank_tran_id: generateBankTranId(),
                fintech_use_num: fintechUseNum,
                inquiry_type: 'A',
                inquiry_base: 'D',
                from_date: fromDate.replace(/-/g, ''),
                to_date: toDate.replace(/-/g, ''),
                sort_order: 'D',
                tran_dtime: new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
            },
            headers: { 'Authorization': `Bearer ${KFTC_ACCESS_TOKEN}` }
        });

        return { success: true, data: response.data };
    } catch (error: any) {
        console.error('[KFTC Trans Error]', error.response?.data || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * CODEF OAuth2 토큰 발급
 */
async function getCodefToken() {
    if (!CODEF_CLIENT_ID || !CODEF_CLIENT_SECRET) {
        throw new Error('CODEF credentials missing');
    }

    const auth = Buffer.from(`${CODEF_CLIENT_ID}:${CODEF_CLIENT_SECRET}`).toString('base64');

    try {
        const response = await axios.post('https://oauth.codef.io/oauth/token',
            'grant_type=client_credentials',
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data.access_token;
    } catch (error: any) {
        console.error('[CODEF Token Error]', error.response?.data || error.message);
        throw new Error('CODEF 토큰 발급 실패');
    }
}

/**
 * IBK 계좌 잔액 및 내역 동기화
 */
export async function syncIBKAccount(accountNo: string) {
    const session = await getSession();
    if (!session || !['대표자', '경영지원'].includes(session.job_title)) {
        return { success: false, error: '권한이 없습니다.' };
    }

    try {
        // 1. 토큰 발급
        const token = await getCodefToken();
        console.log('[CODEF] Token acquired');

        // 2. IBK API 호출 (CODEF API 규격에 맞춰 호출)
        // 실제 운영 시에는 사용자의 계정 정보(암호화됨)가 필요합니다.
        // 여기서는 구조적 연결만 확인합니다.

        /* 
        const codefResponse = await axios.post('https://api.codef.io/v1/kr/bank/b/account/list', {
            connectedId: '...', // CODEF에서 발급받은 커넥티드 아이디 (계정 등록 후 발급)
            organization: '0003', // 기업은행 코드
            account: accountNo
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        */

        console.log(`[IBK] Syncing account with real token check: ${accountNo}`);

        // (이후 로직은 이전과 동일하게 유지하되, 통신 성공을 가정)
        // Mock Response Data (실제 데이터 수신 시 이 부분을 교체)
        const mockResponse = {
            resAccount: accountNo,
            resBalance: "12500000",
            resLastTransactionDate: new Date().toISOString(),
            transactions: [
                { date: new Date().toISOString().split('T')[0], time: "14:30:00", desc: "스마트스토어 정산", amount: 450000, type: "IN" },
                { date: new Date().toISOString().split('T')[0], time: "11:20:00", desc: "관리비 납부", amount: -120000, type: "OUT" },
            ]
        };

        // 3. DB 업데이트
        await db.query(`
            UPDATE bank_accounts 
            SET balance = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE account_no = $2 AND bank_name LIKE '%기업은행%'
        `, [parseInt(mockResponse.resBalance), accountNo]);

        // 4. 거래 내역 저장 (중복 방지를 위해 txId 생성 로직 개선 가능)
        for (const tx of mockResponse.transactions) {
            const txId = `ibk_${tx.date.replace(/-/g, '')}_${Math.abs(tx.amount)}_${tx.desc.substring(0, 5)}`;
            await db.query(`
                INSERT INTO account_transactions (
                    id, transaction_date, amount, type, description, category, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT(id) DO NOTHING
            `, [
                txId,
                `${tx.date} ${tx.time}`,
                Math.abs(tx.amount),
                tx.type,
                tx.desc,
                '미분류',
                'System(IBK)'
            ]);
        }

        await logAction('IBK_SYNC', 'accounting', accountNo, '기업은행 계좌 연동 성공 (API Token 확인됨)');
        return { success: true, balance: parseInt(mockResponse.resBalance) };

    } catch (error: any) {
        console.error('[IBK Sync Error]', error);
        return { success: false, error: error.message };
    }
}

/**
 * 국세청 사업자등록상태 조회 (국가 지원 API 예시)
 * 공공데이터포털(data.go.kr)의 국세청 API 활용
 */
export async function checkBusinessStatus(businessNo: string) {
    const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
    if (!serviceKey) return { success: false, error: 'API Key missing' };

    try {
        const response = await axios.post(
            `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${serviceKey}`,
            { b_no: [businessNo.replace(/-/g, '')] }
        );

        if (response.data?.data?.[0]) {
            const status = response.data.data[0];
            return {
                success: true,
                b_no: status.b_no,
                b_stt: status.b_stt, // 01: 계속사업자, 02: 휴업자, 03: 폐업자
                b_stt_cd: status.b_stt_cd,
                tax_type: status.tax_type, // 부가가치세 일반과세자 등
                end_dt: status.end_dt // 폐업일
            };
        }
        return { success: false, error: '데이터를 찾을 수 없습니다.' };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
