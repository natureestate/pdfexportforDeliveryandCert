/**
 * Utility functions สำหรับ shadcn/ui
 * cn() ใช้สำหรับ merge Tailwind classes อย่างปลอดภัย
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * รวม class names และ merge Tailwind classes ที่ซ้ำกัน
 * @example cn("px-2 py-1", "px-4") // => "py-1 px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
