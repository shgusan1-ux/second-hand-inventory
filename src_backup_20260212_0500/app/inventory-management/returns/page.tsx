import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCcw } from 'lucide-react';

export default function ReturnsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <RotateCcw className="h-8 w-8" />
                    반품 관리
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>반품 접수 및 관리</CardTitle>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center text-slate-400">
                    <div className="text-center">
                        <p className="text-lg font-medium mb-2">반품 관리 시스템 준비중</p>
                        <p className="text-sm">월별 반품 내역 저장 및 관리 기능이 곧 업데이트됩니다.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
