import { Button } from "@/components/ui/button";
import { Plus, ShieldCheck, Users, Key } from "lucide-react";
import { getSecurityLogs, getUsers } from "@/lib/actions";
import { getPasswords } from "@/lib/security-actions";
import { getSession } from "@/lib/auth";
import { PasswordList } from "./password-list"; // Client Component
import { UserAccountManager } from "./user-account-manager"; // Client Component
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function SecurityPage() {
    const passwords = await getPasswords();
    const logs = await getSecurityLogs();
    const users = await getUsers();
    const session = await getSession();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-8 h-8 text-emerald-600" />
                        보안 센터
                    </h1>
                    <p className="text-slate-500 mt-2">
                        공용 계정 및 시스템 사용자를 안전하게 관리하는 보안 공간입니다.
                    </p>
                </div>
            </div>

            <Tabs defaultValue="passwords" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="passwords" className="flex gap-2">
                        <Key className="w-4 h-4" /> 공용 계정 관리
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex gap-2">
                        <Users className="w-4 h-4" /> 시스템 사용자 관리
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="passwords" className="space-y-6 mt-6">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="text-sm text-slate-600">
                            회사 공용 사이트(도매사이트, 택배사 등) 계정 정보를 관리합니다.
                        </div>
                        {/* Shared Password Add Button - Placeholder for future implementation if needed */}
                        <Button variant="outline" size="sm" className="hidden">
                            <Plus className="w-4 h-4 mr-2" /> 공용 계정 추가
                        </Button>
                    </div>

                    <PasswordList initialPasswords={passwords} />

                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3">
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
                </TabsContent>

                <TabsContent value="users" className="space-y-6 mt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
                        <h4 className="font-bold text-blue-800 text-sm flex gap-2 items-center">
                            <Users className="w-4 h-4" /> 직원 계정 관리
                        </h4>
                        <p className="text-xs text-blue-700 mt-1">
                            ERP 시스템에 접속할 수 있는 직원 계정을 생성하고 관리합니다. <br />
                            **보안 메모**에 2차 인증 정보나 특이사항을 기록할 수 있습니다.
                        </p>
                    </div>
                    <UserAccountManager initialUsers={users} currentUserId={session?.id || ''} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
