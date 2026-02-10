
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    X, Brain, Sparkles,
    Image as ImageIcon,
    Hash, Palette, AlignLeft
} from "lucide-react";

interface VisionAnalysisProps {
    data: {
        product: any;
        analysis: any;
    };
    onClose: () => void;
}

export function VisionAnalysis({ data, onClose }: VisionAnalysisProps) {
    const { product, analysis } = data;
    const imageUrl = product.images?.[0]?.url || product.images?.representativeImage?.url;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-none rounded-[32px]">
                <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <Brain className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <CardTitle className="text-xl flex items-center gap-2">
                                AI Research Analysis
                                <Badge className="bg-indigo-500 text-[10px] h-4">Enterprise</Badge>
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                {product.name} ({product.originProductNo})
                            </CardDescription>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose}>
                        <X className="w-6 h-6" />
                    </Button>
                </CardHeader>

                <CardContent className="p-0 overflow-y-auto flex-1 bg-slate-50">
                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* Left: Original Product Info */}
                        <div className="p-8 border-r border-slate-200 space-y-8 bg-white">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Source Image
                                </h3>
                                <div className="aspect-square rounded-2xl overflow-hidden border shadow-inner bg-slate-100">
                                    <img src={imageUrl} className="w-full h-full object-cover" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Sparkles className="w-4 h-4" /> AI Recommendations
                                </h3>
                                <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-indigo-900">Stage</span>
                                        <Badge className="bg-indigo-600 text-lg py-1 px-4 rounded-xl">{product.lifecycle?.stage}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-bold text-indigo-900">Category</span>
                                        <Badge variant="outline" className="border-indigo-200 text-indigo-600 text-sm py-1 px-3 bg-white">
                                            {product.archiveInfo?.category || product.internalCategory || 'UNCATEGORIZED'}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-indigo-700 leading-relaxed font-medium pt-2 border-t border-indigo-100">
                                        Matched Keywords: {product.archiveInfo?.breakdown?.textMatches?.join(', ') || 'None'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Right: Vision Data Details */}
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Hash className="w-4 h-4" /> Detected Labels
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.labels.map((label: string, i: number) => (
                                        <Badge key={i} variant="outline" className="bg-white border-slate-200 text-slate-700 text-[11px] py-1 shadow-sm">
                                            {label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Palette className="w-4 h-4" /> Color Profile
                                </h3>
                                <div className="flex gap-4">
                                    {analysis.dominantColors.map((color: string, i: number) => (
                                        <div key={i} className="flex flex-col items-center gap-2">
                                            <div
                                                className="w-12 h-12 rounded-full border shadow-sm ring-2 ring-white"
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className="text-[10px] text-slate-400 font-mono tracking-tighter">Color {i + 1}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <AlignLeft className="w-4 h-4" /> OCR Data
                                </h3>
                                <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                                    {analysis.text || 'No text detected'}
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="outline" className="gap-2 rounded-xl" onClick={onClose}>Close</Button>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 rounded-xl px-6">Apply Classification</Button>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
