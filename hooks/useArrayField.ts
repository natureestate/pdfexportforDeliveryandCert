/**
 * useArrayField Hook - จัดการ array operations (add, remove, update)
 * ใช้สำหรับ tags, specialties, items และ array field อื่นๆ
 * ลดการเขียน addTag/removeTag/addSpecialty/removeSpecialty ซ้ำกันหลายที่
 */

import { useCallback } from 'react';

interface UseArrayFieldReturn<T> {
    /** เพิ่ม item ใหม่เข้าไปใน array (ถ้ายังไม่มี) */
    add: (item: T) => void;
    /** ลบ item ออกจาก array */
    remove: (item: T) => void;
    /** อัพเดท item ตาม index */
    update: (index: number, item: T) => void;
    /** เพิ่มหลาย items พร้อมกัน (กรองที่ซ้ำออก) */
    addMany: (items: T[]) => void;
    /** ล้าง array ทั้งหมด */
    clear: () => void;
}

/**
 * Generic hook สำหรับจัดการ array fields
 *
 * @param items - array ปัจจุบัน
 * @param onChange - callback เมื่อ array เปลี่ยน
 * @param isEqual - ฟังก์ชันเปรียบเทียบว่า item ซ้ำหรือไม่ (default: strict equality)
 *
 * @example
 * ```tsx
 * // สำหรับ string tags
 * const tagField = useArrayField(formData.tags, (newTags) => {
 *     setFormData({ ...formData, tags: newTags });
 * });
 *
 * // เพิ่ม tag
 * tagField.add('VIP');
 *
 * // ลบ tag
 * tagField.remove('VIP');
 * ```
 */
export function useArrayField<T>(
    items: T[],
    onChange: (newItems: T[]) => void,
    isEqual: (a: T, b: T) => boolean = (a, b) => a === b,
): UseArrayFieldReturn<T> {

    /** เพิ่ม item ใหม่ (ถ้ายังไม่มี) */
    const add = useCallback((item: T) => {
        if (!items.some(existing => isEqual(existing, item))) {
            onChange([...items, item]);
        }
    }, [items, onChange, isEqual]);

    /** ลบ item ออกจาก array */
    const remove = useCallback((item: T) => {
        onChange(items.filter(existing => !isEqual(existing, item)));
    }, [items, onChange, isEqual]);

    /** อัพเดท item ตาม index */
    const update = useCallback((index: number, item: T) => {
        const newItems = [...items];
        newItems[index] = item;
        onChange(newItems);
    }, [items, onChange]);

    /** เพิ่มหลาย items พร้อมกัน (กรองที่ซ้ำออก) */
    const addMany = useCallback((newItems: T[]) => {
        const filtered = newItems.filter(
            item => !items.some(existing => isEqual(existing, item))
        );
        if (filtered.length > 0) {
            onChange([...items, ...filtered]);
        }
    }, [items, onChange, isEqual]);

    /** ล้าง array ทั้งหมด */
    const clear = useCallback(() => {
        onChange([]);
    }, [onChange]);

    return {
        add,
        remove,
        update,
        addMany,
        clear,
    };
}
