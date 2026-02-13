import { ProductForm } from '@/components/inventory/product-form';
import { CornerLogisImportForm } from '@/components/inventory/corner-logis-import';
import { BulkProductForm } from '@/components/inventory/bulk-product-form';
import { getCategories } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
    const categories = await getCategories();

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">재고 등록</h1>
                <p className="text-slate-500 mt-2">
                    개별 상품 등록, 엑셀 대량 등록 및 코너로지스 가져오기를 수행합니다.
                </p>
            </div>

            <Tabs defaultValue="single" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="single">개별 상품 등록</TabsTrigger>
                    <TabsTrigger value="bulk">대량 등록 (Excel)</TabsTrigger>
                    <TabsTrigger value="conor">코너로지스 가져오기</TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="mt-6">
                    <div className="bg-white rounded-lg border p-6">
                        <ProductForm categories={categories} />
                    </div>
                </TabsContent>

                <TabsContent value="bulk" className="mt-6">
                    <BulkProductForm />
                </TabsContent>

                <TabsContent value="conor" className="mt-6">
                    <CornerLogisImportForm />
                </TabsContent>
            </Tabs>
        </div>
    );
}
