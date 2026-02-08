'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Removed unused uploadImage import
import Image from 'next/image';
import { Loader2, Upload, Search, Type, Tag, FileImage } from 'lucide-react';
import { toast } from 'sonner';

export default function VisionTestPage() {
    const [imageUrl, setImageUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        setResult(null);

        // Convert to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setImageUrl(base64String); // Show preview
            analyzeImage(base64String); // Send Base64 directly to API
        };
        reader.onerror = () => {
            toast.error('Failed to read file');
            setIsLoading(false);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async (url: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/vision/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: url }),
            });
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setResult(data);
            toast.success('Analysis complete');
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Analysis failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FileImage className="w-8 h-8 text-blue-600" />
                Google Vision API Test Lab
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Image Input</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter Image URL directly..."
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
                                <Button onClick={() => analyzeImage(imageUrl)} disabled={!imageUrl || isLoading}>
                                    Analyze
                                </Button>
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-muted-foreground">Or Upload File</span>
                                </div>
                            </div>

                            <div className="flex justify-center border-2 border-dashed border-slate-200 rounded-lg p-6 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="text-center">
                                    <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                                    <p className="text-sm font-medium text-slate-600">Click to upload image</p>
                                    <p className="text-xs text-slate-400 mt-1">Supports JPG, PNG, WEBP</p>
                                </div>
                            </div>

                            {imageUrl && (
                                <div className="mt-4 border rounded-lg overflow-hidden relative aspect-square bg-slate-100 flex items-center justify-center">
                                    <Image
                                        src={imageUrl}
                                        alt="Preview"
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Result Section */}
                <div className="space-y-4">
                    {isLoading && (
                        <Card className="h-full flex items-center justify-center min-h-[400px]">
                            <div className="text-center space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto" />
                                <p className="text-slate-500 font-medium">Analyzing with Google Vision AI...</p>
                            </div>
                        </Card>
                    )}

                    {!isLoading && result && (
                        <div className="space-y-4">
                            {/* Brands / Logos */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Tag className="w-4 h-4 text-purple-500" />
                                        Detected Brands / Logos
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {result.analysis?.logos?.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {result.analysis.logos.map((logo: any, i: number) => (
                                                <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 text-sm font-bold rounded-md">
                                                    {logo.description} ({Math.round(logo.score * 100)}%)
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">No logos detected.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Text (OCR) */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Type className="w-4 h-4 text-emerald-500" />
                                        Extracted Text (OCR)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {result.analysis?.text?.length > 0 ? (
                                        <div className="bg-slate-50 p-3 rounded text-sm whitespace-pre-wrap font-mono max-h-40 overflow-auto">
                                            {result.analysis.text[0].description}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">No text detected.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Labels */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Search className="w-4 h-4 text-blue-500" />
                                        Image Labels
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-1.5">
                                        {result.analysis?.labels?.map((label: any, i: number) => (
                                            <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full border border-blue-100">
                                                {label.description} ({Math.round(label.score * 100)}%)
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Raw Keywords */}
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-bold">Extracted Keywords for Search</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-slate-600 bg-yellow-50 p-3 rounded border border-yellow-100">
                                        {result.keywords?.allKeywords}
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
