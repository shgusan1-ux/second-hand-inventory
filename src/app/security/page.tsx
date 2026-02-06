import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck } from "lucide-react";
import { getSecurityLogs } from "@/lib/actions";
import { getPasswords } from "@/lib/security-actions";
import { PasswordList } from "./password-list"; // Client Component

export default async function SecurityPage() {
    const passwords = await getPasswords();
    const logs = await getSecurityLogs();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                        보안 센터
                    </h1>
                    <p className="text-slate-500 mt-2">
                        공용 계정 및 비밀번호를 안전하게 관리하는 공간입니다.<br />
                        <span className="text-red-500 font-bold text-xs">⚠️ 비밀번호 유출에 각별히 주의해주세요.</span>
                    </p>
                </div>
                {/* Add Button could be a Client Component or Dialog trigger */}
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                    <Plus className="w-4 h-4 mr-2" /> 새 계정 등록
                </Button>
            </div>

            <PasswordList initialPasswords={passwords} />

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mt-8 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                    <h4 className="font-bold text-yellow-800 text-sm">보안 수칙</h4>
                    <ul className="list-disc list-inside text-xs text-yellow-700 mt-1 space-y-1">
                        <li>퇴사자 발생 시 즉시 주요 계정의 비밀번호를 변경하세요.</li>
                        <li>비밀번호는 최소 3개월에 한 번씩 변경하는 것을 권장합니다.</li>
                        <li>이 페이지의 내용은 외부로 유출되지 않도록 주의하세요.</li>
                    </ul>
                </div>
            </div>

            {/* Security Logs Section */}
            <div className="mt-8 border-t pt-8">
                <h2 className="text-lg font-bold text-slate-800 mb-4">보안 접속 로그</h2>
                <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-2 text-xs font-medium text-slate-500">시간</th>
                                <th className="px-4 py-2 text-xs font-medium text-slate-500">사용자</th>
                                <th className="px-4 py-2 text-xs font-medium text-slate-500">활동</th>
                                <th className="px-4 py-2 text-xs font-medium text-slate-500">상세</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {logs.map((log: any) => (
                                <tr key={log.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-2 text-slate-600 font-mono text-xs">
                                        {new Date(log.created_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2 font-medium text-slate-900">{log.user_name}</td>
                                    <td className="px-4 py-2 text-slate-700">{log.action}</td>
                                    <td className="px-4 py-2 text-slate-500">{log.details}</td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">로그가 없습니다.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
