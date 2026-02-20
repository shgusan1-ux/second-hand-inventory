'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, AlertCircle, RefreshCw, Calculator } from 'lucide-react';

interface ProfitInsightWidgetProps {
    purchasePrice?: number;
    sellPrice?: number;
    platformFeeRate?: number; // e.g. 0.05 for 5%
}

export function ProfitInsightWidget({ purchasePrice = 0, sellPrice = 0, platformFeeRate = 0.0585 }: ProfitInsightWidgetProps) {
    // 5.85% is typical Naver Smartstore fee (max)

    // Calculate margins
    const revenue = sellPrice;
    const cost = purchasePrice;
    const fee = Math.floor(revenue * platformFeeRate);
    const profit = revenue - cost - fee;
    const marginRate = revenue > 0 ? (profit / revenue) * 100 : 0;

    const isProfitable = profit > 0;
    const isHighMargin = marginRate >= 30;
    const isLowMargin = marginRate < 10 && marginRate >= 0;
    const isLoss = profit < 0;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">AI 수익 분석</h3>
                </div>
                {isHighMargin && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">고수익 예상</span>}
                {isLoss && <span className="text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">적자 경고</span>}
            </div>

            <div className="p-4 grid grid-cols-2 gap-4">
                {/* Visual Graph Bar */}
                <div className="col-span-2 bg-slate-100 dark:bg-slate-700 h-4 rounded-full overflow-hidden flex mb-2 relative group cursor-help">
                    {/* Cost */}
                    <div
                        className="bg-slate-400 h-full relative"
                        style={{ width: `${Math.min(100, (cost / revenue) * 100)}%` }}
                    >
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">원가</span>
                    </div>
                    {/* Fee */}
                    <div
                        className="bg-amber-400 h-full relative"
                        style={{ width: `${Math.min(100, (fee / revenue) * 100)}%` }}
                    >
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">수수료</span>
                    </div>
                    {/* Profit */}
                    <div
                        className={`${profit > 0 ? 'bg-emerald-500' : 'bg-rose-500'} h-full flex-1 relative`}
                    >
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white font-bold opacity-0 group-hover:opacity-100">순수익</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">판매가</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{revenue.toLocaleString()}원</p>
                </div>
                <div className="space-y-1 text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">예상 순수익</p>
                    <p className={`text-lg font-bold ${profit > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {profit > 0 ? '+' : ''}{profit.toLocaleString()}원
                    </p>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                        <span className="text-slate-400 block mb-0.5">매입가</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">{cost.toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">수수료(5.8%)</span>
                        <span className="font-medium text-slate-700 dark:text-slate-200">-{fee.toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-slate-400 block mb-0.5">마진율</span>
                        <span className={`font-bold ${isHighMargin ? 'text-emerald-500' : isLoss ? 'text-rose-500' : 'text-blue-500'}`}>
                            {marginRate.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* AI Comment */}
            <div className="px-4 pb-4">
                <div className="bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-600 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300 flex gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <p>
                        {isHighMargin
                            ? "훌륭합니다! 목표 마진(30%)을 초과 달성했습니다. 적극적인 마케팅을 고려해 보세요."
                            : isLoss
                                ? "주의: 판매가보다 비용이 더 큽니다. 가격을 올리거나 매입가를 낮춰야 합니다."
                                : isLowMargin
                                    ? "마진이 다소 낮습니다. 번들 판매나 추가 할인을 자제하세요."
                                    : "적절한 마진율을 유지하고 있습니다."}
                    </p>
                </div>
            </div>
        </div>
    );
}
