/**
 * useSearch Hook - จัดการ debounced search logic
 * ใช้แทน search patterns ที่ซ้ำกันใน CRMPage, CustomerSelector, ContractorSelector
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSearchOptions {
    /** ฟังก์ชัน search ที่จะเรียกเมื่อ searchTerm เปลี่ยน */
    onSearch: (searchTerm: string) => Promise<void> | void;
    /** ฟังก์ชันที่จะเรียกเมื่อ searchTerm ว่าง (เช่น โหลดข้อมูลทั้งหมด) */
    onClear?: () => Promise<void> | void;
    /** ระยะเวลา debounce เป็น milliseconds (default: 300ms) */
    debounceMs?: number;
    /** เปิด debounce หรือไม่ (default: true) - ถ้า false จะต้องเรียก search เอง */
    autoSearch?: boolean;
}

interface UseSearchReturn {
    /** ค่า search ปัจจุบัน */
    searchTerm: string;
    /** อัพเดทค่า search */
    setSearchTerm: (value: string) => void;
    /** เรียก search manually (ใช้เมื่อ autoSearch เป็น false) */
    triggerSearch: () => void;
    /** ล้างค่า search */
    clearSearch: () => void;
    /** กำลังค้นหาอยู่หรือไม่ */
    isSearching: boolean;
}

/**
 * Hook สำหรับจัดการ search พร้อม debounce
 *
 * @example
 * ```tsx
 * // แบบ auto-search (debounce)
 * const { searchTerm, setSearchTerm } = useSearch({
 *     onSearch: async (term) => {
 *         const results = await searchCustomers(companyId, term);
 *         setCustomers(results);
 *     },
 *     onClear: () => loadAllCustomers(),
 *     debounceMs: 300,
 * });
 *
 * // แบบ manual search (กด Enter/ปุ่ม)
 * const { searchTerm, setSearchTerm, triggerSearch } = useSearch({
 *     onSearch: async (term) => {
 *         const results = await searchCustomers(companyId, term);
 *         setCustomers(results);
 *     },
 *     autoSearch: false,
 * });
 * ```
 */
export function useSearch(options: UseSearchOptions): UseSearchReturn {
    const {
        onSearch,
        onClear,
        debounceMs = 300,
        autoSearch = true,
    } = options;

    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const onSearchRef = useRef(onSearch);
    const onClearRef = useRef(onClear);

    // อัพเดท refs เพื่อหลีกเลี่ยง stale closures
    useEffect(() => {
        onSearchRef.current = onSearch;
    }, [onSearch]);

    useEffect(() => {
        onClearRef.current = onClear;
    }, [onClear]);

    // Debounced auto-search
    useEffect(() => {
        if (!autoSearch) return;

        const debounce = setTimeout(async () => {
            if (searchTerm.trim()) {
                setIsSearching(true);
                try {
                    await onSearchRef.current(searchTerm.trim());
                } finally {
                    setIsSearching(false);
                }
            } else if (onClearRef.current) {
                await onClearRef.current();
            }
        }, debounceMs);

        return () => clearTimeout(debounce);
    }, [searchTerm, debounceMs, autoSearch]);

    /** เรียก search manually */
    const triggerSearch = useCallback(async () => {
        if (searchTerm.trim()) {
            setIsSearching(true);
            try {
                await onSearchRef.current(searchTerm.trim());
            } finally {
                setIsSearching(false);
            }
        } else if (onClearRef.current) {
            await onClearRef.current();
        }
    }, [searchTerm]);

    /** ล้างค่า search และเรียก onClear */
    const clearSearch = useCallback(async () => {
        setSearchTerm('');
        if (onClearRef.current) {
            await onClearRef.current();
        }
    }, []);

    return {
        searchTerm,
        setSearchTerm,
        triggerSearch,
        clearSearch,
        isSearching,
    };
}
