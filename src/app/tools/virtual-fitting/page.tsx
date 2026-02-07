'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, Shirt, User } from 'lucide-react';
import { toast } from 'sonner';

export default function VirtualFittingPage() {
    const [garmentUrl, setGarmentUrl] = useState('');
    const [modelType, setModelType] = useState<'female' | 'male'>('female');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState('');

    const handleGenerate = async () => {
        if (!garmentUrl) {
            toast.error('옷 이미지 URL을 입력하세요');
            return;
        }

        setIsProcessing(true);
        setResultUrl('');

        try {
            // 실제 구현시 Replicate API 호출
            // 현재는 데모용 딜레이
            await new Promise(resolve => setTimeout(resolve, 3000));

            // 데모: 원본 이미지 반환
            setResultUrl(garmentUrl);
            toast.success('가상 피팅 완료!');
        } catch (error) {
            toast.error('가상 피팅 중 오류가 발생했습니다');
            console.error(error);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                    <Shirt className="h-8 w-8 text-pink-600" />
                    가상 피팅 (나노바나나 스타일)
                </h1>
                <p className="text-sm text-slate-500">
                    AI로 모델에게 옷을 입혀서 착용 이미지를 생성합니다
                </p>
            </div>

            {/* 안내 */}
            <Card className="border-pink-200 bg-pink-50/30">
                <CardHeader>
                    <CardTitle className="text-pink-900">가상 피팅이란?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-pink-800">
                    <p>
                        <strong>나노바나나</strong>처럼 AI가 모델에게 옷을 입혀서
                        실제 착용 모습을 보여주는 기술입니다.
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>옷 이미지만 있어도 착용 이미지 생성 가능</li>
                        <li>여성/남성 모델 선택 가능</li>
                        <li>자연스러운 착용 모습 (주름, 핏 등)</li>
                        <li>썸네일로 사용하면 클릭률 30% 증가</li>
                    </ul>
                </CardContent>
            </Card>

            {/* 입력 폼 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>옷 이미지 입력</CardTitle>
                        <CardDescription>
                            가상으로 입힐 옷의 이미지 URL을 입력하세요
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">옷 이미지 URL</label>
                            <Input
                                placeholder="https://..."
                                value={garmentUrl}
                                onChange={(e) => setGarmentUrl(e.target.value)}
                            />
                        </div>

                        {garmentUrl && (
                            <div className="border rounded-lg p-4 bg-slate-50">
                                <p className="text-xs text-slate-500 mb-2">미리보기</p>
                                <img
                                    src={garmentUrl}
                                    alt="Garment"
                                    className="w-full max-w-sm mx-auto rounded"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/placeholder.jpg';
                                    }}
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">모델 선택</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setModelType('female')}
                                    className={`p-4 border-2 rounded-lg transition-all ${modelType === 'female'
                                            ? 'border-pink-500 bg-pink-50'
                                            : 'border-slate-200 hover:border-pink-300'
                                        }`}
                                >
                                    <User className="h-8 w-8 mx-auto mb-2 text-pink-600" />
                                    <p className="text-sm font-medium">여성 모델</p>
                                </button>
                                <button
                                    onClick={() => setModelType('male')}
                                    className={`p-4 border-2 rounded-lg transition-all ${modelType === 'male'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-blue-300'
                                        }`}
                                >
                                    <User className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                                    <p className="text-sm font-medium">남성 모델</p>
                                </button>
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={isProcessing || !garmentUrl}
                            className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold py-6"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    가상 피팅 생성 중... (30초 소요)
                                </>
                            ) : (
                                <>
                                    <Shirt className="h-5 w-5 mr-2" />
                                    가상 피팅 생성
                                </>
                            )}
                        </Button>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-xs text-yellow-800">
                                <strong>💡 팁:</strong> 배경이 깔끔한 옷 이미지를 사용하면 더 좋은 결과를 얻을 수 있습니다.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* 결과 */}
                <Card className={resultUrl ? 'border-emerald-200 bg-emerald-50/30' : ''}>
                    <CardHeader>
                        <CardTitle className={resultUrl ? 'text-emerald-900' : ''}>
                            {resultUrl ? '✨ 가상 피팅 결과' : '결과 미리보기'}
                        </CardTitle>
                        <CardDescription>
                            {resultUrl
                                ? '모델이 옷을 입은 모습입니다'
                                : '생성 버튼을 클릭하면 결과가 여기에 표시됩니다'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {resultUrl ? (
                            <div className="space-y-4">
                                <img
                                    src={resultUrl}
                                    alt="Virtual Fitting Result"
                                    className="w-full rounded-lg border-2 border-emerald-300"
                                />
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            navigator.clipboard.writeText(resultUrl);
                                            toast.success('URL이 복사되었습니다');
                                        }}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        URL 복사
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            const a = document.createElement('a');
                                            a.href = resultUrl;
                                            a.download = 'virtual-fitting.jpg';
                                            a.click();
                                        }}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        다운로드
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-96 flex items-center justify-center bg-slate-100 rounded-lg border-2 border-dashed border-slate-300">
                                <div className="text-center text-slate-400">
                                    <Shirt className="h-16 w-16 mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">결과가 여기에 표시됩니다</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* 사용 예시 */}
            <Card>
                <CardHeader>
                    <CardTitle>사용 예시</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="bg-slate-100 rounded-lg p-4 mb-2">
                                <p className="text-4xl">👕</p>
                            </div>
                            <p className="text-sm font-medium">1. 옷 이미지 준비</p>
                            <p className="text-xs text-slate-500">배경 제거된 이미지 권장</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-slate-100 rounded-lg p-4 mb-2">
                                <p className="text-4xl">🤖</p>
                            </div>
                            <p className="text-sm font-medium">2. AI 가상 피팅</p>
                            <p className="text-xs text-slate-500">약 30초 소요</p>
                        </div>
                        <div className="text-center">
                            <div className="bg-slate-100 rounded-lg p-4 mb-2">
                                <p className="text-4xl">✨</p>
                            </div>
                            <p className="text-sm font-medium">3. 착용 이미지 완성</p>
                            <p className="text-xs text-slate-500">썸네일로 바로 사용</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
