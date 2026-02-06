/**
 * useDocumentForm Hook - จัดการ form logic ที่ซ้ำกันในทุก document form
 * รวม handleDataChange, handleItemChange, addItem, removeItem, calculateTotals
 * ใช้แทนที่ logic ที่ copy-paste ใน InvoiceForm, QuotationForm, ReceiptForm,
 * TaxInvoiceForm, PurchaseOrderForm ฯลฯ
 */

import { useCallback } from 'react';

/**
 * Interface สำหรับ item ที่มี quantity, unitPrice, amount (ใช้ร่วมกันทุก form)
 * ทุก item type ต้อง extends interface นี้
 */
interface BaseDocumentItem {
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
    notes?: string;
}

/**
 * Interface สำหรับ document data ที่มี items และ totals
 */
interface BaseDocumentData {
    items: BaseDocumentItem[];
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    discount: number;
    total: number;
    [key: string]: any;
}

/**
 * Options สำหรับ useDocumentForm
 */
interface UseDocumentFormOptions<TData extends BaseDocumentData, TItem extends BaseDocumentItem> {
    /** ข้อมูลปัจจุบันของ form */
    data: TData;
    /** setState function สำหรับอัพเดทข้อมูล */
    setData: React.Dispatch<React.SetStateAction<TData>>;
    /** function สร้าง item ใหม่พร้อมค่าเริ่มต้น */
    createNewItem: () => TItem;
    /**
     * คำนวณ totals เพิ่มเติม (เช่น changeAmount ใน Receipt/TaxInvoice)
     * return object ที่จะ merge กับ data
     */
    computeExtraTotals?: (subtotal: number, taxAmount: number, total: number, data: TData) => Partial<TData>;
}

/**
 * Return type ของ useDocumentForm
 */
interface UseDocumentFormReturn<TData, TItem> {
    /** อัพเดทค่าของ field ใน document data */
    handleDataChange: <K extends keyof TData>(key: K, value: TData[K]) => void;
    /** อัพเดทค่าของ field ใน item ตาม index */
    handleItemChange: (index: number, field: keyof TItem, value: string | number) => void;
    /** เพิ่ม item ใหม่ */
    addItem: () => void;
    /** ลบ item ตาม index */
    removeItem: (index: number) => void;
    /** คำนวณยอดรวมจาก items */
    calculateTotals: (items?: TItem[]) => void;
}

/**
 * Generic hook สำหรับจัดการ document form logic
 *
 * @example
 * ```tsx
 * const { handleDataChange, handleItemChange, addItem, removeItem, calculateTotals } = useDocumentForm({
 *     data,
 *     setData,
 *     createNewItem: () => ({
 *         description: '',
 *         quantity: 1,
 *         unit: 'ชิ้น',
 *         unitPrice: 0,
 *         amount: 0,
 *         notes: '',
 *     }),
 * });
 * ```
 */
export function useDocumentForm<
    TData extends BaseDocumentData,
    TItem extends BaseDocumentItem
>(options: UseDocumentFormOptions<TData, TItem>): UseDocumentFormReturn<TData, TItem> {
    const { data, setData, createNewItem, computeExtraTotals } = options;

    /** อัพเดทค่าใน document data ตาม key */
    const handleDataChange = useCallback(<K extends keyof TData>(key: K, value: TData[K]) => {
        setData(prev => ({ ...prev, [key]: value }));
    }, [setData]);

    /** คำนวณยอดรวมทั้งหมด */
    const calculateTotals = useCallback((items?: TItem[]) => {
        const currentItems = items || (data.items as TItem[]);
        const subtotal = currentItems.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = (subtotal * data.taxRate) / 100;
        const total = subtotal + taxAmount - data.discount;

        const extraTotals = computeExtraTotals
            ? computeExtraTotals(subtotal, taxAmount, total, data)
            : {};

        setData(prev => ({
            ...prev,
            subtotal,
            taxAmount,
            total,
            ...extraTotals,
        }));
    }, [data.items, data.taxRate, data.discount, setData, computeExtraTotals]);

    /** อัพเดทค่าของ field ใน item ตาม index พร้อมคำนวณ amount อัตโนมัติ */
    const handleItemChange = useCallback((index: number, field: keyof TItem, value: string | number) => {
        const newItems = [...data.items] as TItem[];
        const item = newItems[index];
        (item[field] as any) = value;

        // คำนวณ amount อัตโนมัติเมื่อ quantity หรือ unitPrice เปลี่ยน
        if (field === 'quantity' || field === 'unitPrice') {
            item.amount = item.quantity * item.unitPrice;
        }

        handleDataChange('items' as keyof TData, newItems as any);
        calculateTotals(newItems);
    }, [data.items, handleDataChange, calculateTotals]);

    /** เพิ่ม item ใหม่เข้าไปใน list */
    const addItem = useCallback(() => {
        const newItem = createNewItem();
        setData(prev => ({
            ...prev,
            items: [...prev.items, newItem],
        }));
    }, [createNewItem, setData]);

    /** ลบ item ตาม index พร้อมคำนวณยอดรวมใหม่ */
    const removeItem = useCallback((index: number) => {
        const newItems = (data.items as TItem[]).filter((_, i) => i !== index);
        handleDataChange('items' as keyof TData, newItems as any);
        calculateTotals(newItems);
    }, [data.items, handleDataChange, calculateTotals]);

    return {
        handleDataChange,
        handleItemChange,
        addItem,
        removeItem,
        calculateTotals,
    };
}
