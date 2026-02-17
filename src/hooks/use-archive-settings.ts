import { useState, useEffect, useCallback } from 'react';

export interface ArchiveCategory {
    category_id: string;
    display_name: string;
    sort_order: number;
}

export function useArchiveSettings() {
    const [categories, setCategories] = useState<ArchiveCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/smartstore/settings/archive');
            const data = await res.json();
            if (data.success) {
                setCategories(data.settings);
            }
        } catch (e) {
            console.error('Failed to fetch archive categories', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    const updateCategory = async (id: string, displayName: string, sortOrder: number) => {
        try {
            const res = await fetch('/api/smartstore/settings/archive', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category_id: id, display_name: displayName, sort_order: sortOrder }),
            });
            const data = await res.json();
            if (data.success) {
                await fetchCategories();
                return true;
            }
        } catch (e) {
            console.error('Failed to update category', e);
        }
        return false;
    };

    return { categories, loading, updateCategory, refresh: fetchCategories };
}
