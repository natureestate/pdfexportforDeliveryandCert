/**
 * useEntitySelector Hook - จัดการ entity selection logic
 * รวม search, recent items, CRUD operations สำหรับ entity selectors
 * ใช้แทน logic ที่ซ้ำกันใน CustomerSelector และ ContractorSelector
 */

import { useState, useCallback, useEffect } from 'react';
import { useCompany } from '../contexts/CompanyContext';

/** Entity พื้นฐานที่ต้องมี id */
interface BaseEntity {
    id?: string;
    companyId: string;
    userId: string;
    [key: string]: any;
}

/**
 * Service functions ที่ต้องส่งเข้ามา
 */
interface EntityServiceFunctions<T extends BaseEntity> {
    /** โหลด entities ทั้งหมด */
    loadAll: (companyId: string) => Promise<T[]>;
    /** ค้นหา entities */
    search: (companyId: string, searchTerm: string) => Promise<T[]>;
    /** โหลด entities ล่าสุด */
    loadRecent: (companyId: string, limit: number) => Promise<T[]>;
    /** บันทึก entity ใหม่ */
    save: (entity: Omit<T, 'id'>) => Promise<string>;
    /** อัพเดท entity */
    update: (id: string, entity: Partial<T>) => Promise<void>;
    /** ลบ entity */
    remove: (id: string) => Promise<void>;
}

interface UseEntitySelectorOptions<T extends BaseEntity> {
    /** Service functions สำหรับ CRUD operations */
    services: EntityServiceFunctions<T>;
    /** จำนวน recent items ที่จะโหลด (default: 5) */
    recentLimit?: number;
}

interface UseEntitySelectorReturn<T extends BaseEntity> {
    /** รายการ entities */
    entities: T[];
    /** รายการ entities ล่าสุด */
    recentEntities: T[];
    /** กำลังโหลดข้อมูล */
    isLoading: boolean;
    /** ค่า search ปัจจุบัน */
    searchText: string;
    /** อัพเดทค่า search */
    setSearchText: (value: string) => void;
    /** เรียก search */
    handleSearch: () => Promise<void>;
    /** โหลดข้อมูลทั้งหมด */
    loadEntities: () => Promise<void>;
    /** โหลด entities ล่าสุด */
    loadRecentEntities: () => Promise<void>;
    /** บันทึก entity ใหม่ */
    saveEntity: (entity: Omit<T, 'id'>) => Promise<string>;
    /** อัพเดท entity */
    updateEntity: (id: string, entity: Partial<T>) => Promise<void>;
    /** ลบ entity */
    removeEntity: (id: string) => Promise<void>;
    /** โหลดข้อมูลทั้งหมดใหม่ (entities + recent) */
    refresh: () => Promise<void>;
}

/**
 * Generic hook สำหรับ entity selector components
 *
 * @example
 * ```tsx
 * const {
 *     entities: customers,
 *     recentEntities: recentCustomers,
 *     isLoading,
 *     searchText,
 *     setSearchText,
 *     handleSearch,
 *     saveEntity,
 * } = useEntitySelector({
 *     services: {
 *         loadAll: (companyId) => getCustomers(companyId),
 *         search: (companyId, term) => searchCustomers(companyId, term),
 *         loadRecent: (companyId, limit) => getRecentCustomers(companyId, limit),
 *         save: (customer) => saveCustomer(customer),
 *         update: (id, data) => updateCustomer(id, data),
 *         remove: (id) => deleteCustomer(id),
 *     },
 * });
 * ```
 */
export function useEntitySelector<T extends BaseEntity>(
    options: UseEntitySelectorOptions<T>
): UseEntitySelectorReturn<T> {
    const { services, recentLimit = 5 } = options;
    const { currentCompany } = useCompany();

    const [entities, setEntities] = useState<T[]>([]);
    const [recentEntities, setRecentEntities] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    /** โหลด entities ทั้งหมด */
    const loadEntities = useCallback(async () => {
        if (!currentCompany?.id) return;

        setIsLoading(true);
        try {
            const data = await services.loadAll(currentCompany.id);
            setEntities(data);
        } catch (error) {
            console.error('Failed to load entities:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentCompany?.id, services]);

    /** โหลด entities ล่าสุด */
    const loadRecentEntities = useCallback(async () => {
        if (!currentCompany?.id) return;

        try {
            const data = await services.loadRecent(currentCompany.id, recentLimit);
            setRecentEntities(data);
        } catch (error) {
            console.error('Failed to load recent entities:', error);
        }
    }, [currentCompany?.id, services, recentLimit]);

    /** ค้นหา entities */
    const handleSearch = useCallback(async () => {
        if (!currentCompany?.id || !searchText.trim()) {
            await loadEntities();
            return;
        }

        setIsLoading(true);
        try {
            const results = await services.search(currentCompany.id, searchText);
            setEntities(results);
        } catch (error) {
            console.error('Failed to search entities:', error);
        } finally {
            setIsLoading(false);
        }
    }, [currentCompany?.id, searchText, services, loadEntities]);

    /** บันทึก entity ใหม่ */
    const saveEntity = useCallback(async (entity: Omit<T, 'id'>) => {
        const id = await services.save(entity);
        await loadEntities();
        await loadRecentEntities();
        return id;
    }, [services, loadEntities, loadRecentEntities]);

    /** อัพเดท entity */
    const updateEntity = useCallback(async (id: string, entity: Partial<T>) => {
        await services.update(id, entity);
        await loadEntities();
        await loadRecentEntities();
    }, [services, loadEntities, loadRecentEntities]);

    /** ลบ entity */
    const removeEntity = useCallback(async (id: string) => {
        await services.remove(id);
        setEntities(prev => prev.filter(e => e.id !== id));
        await loadRecentEntities();
    }, [services, loadRecentEntities]);

    /** โหลดข้อมูลทั้งหมดใหม่ */
    const refresh = useCallback(async () => {
        await Promise.all([loadEntities(), loadRecentEntities()]);
    }, [loadEntities, loadRecentEntities]);

    return {
        entities,
        recentEntities,
        isLoading,
        searchText,
        setSearchText,
        handleSearch,
        loadEntities,
        loadRecentEntities,
        saveEntity,
        updateEntity,
        removeEntity,
        refresh,
    };
}
