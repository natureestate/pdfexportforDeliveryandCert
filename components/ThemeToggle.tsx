/**
 * Theme Toggle Component
 * ปุ่มสลับ Dark/Light Mode
 */

import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface ThemeToggleProps {
    showLabel?: boolean;
    className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false, className = '' }) => {
    const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

    // แสดงปุ่มสลับอย่างง่าย
    if (!showLabel) {
        return (
            <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                    resolvedTheme === 'dark'
                        ? 'bg-slate-700 text-yellow-400 hover:bg-slate-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                } ${className}`}
                title={resolvedTheme === 'dark' ? 'เปลี่ยนเป็น Light Mode' : 'เปลี่ยนเป็น Dark Mode'}
            >
                {resolvedTheme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                ) : (
                    <Moon className="w-5 h-5" />
                )}
            </button>
        );
    }

    // แสดงปุ่มพร้อม label และตัวเลือก (compact)
    return (
        <div className={`flex items-center justify-between ${className}`}>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">ธีม</span>
            <div className="inline-flex rounded-md border border-gray-200 dark:border-slate-600 p-0.5 bg-gray-50 dark:bg-slate-700">
                <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                        theme === 'light'
                            ? 'bg-white dark:bg-slate-600 text-amber-500 shadow-sm'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title="Light Mode"
                >
                    <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                        theme === 'dark'
                            ? 'bg-white dark:bg-slate-600 text-indigo-500 shadow-sm'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title="Dark Mode"
                >
                    <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => setTheme('system')}
                    className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                        theme === 'system'
                            ? 'bg-white dark:bg-slate-600 text-emerald-500 shadow-sm'
                            : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                    title="System (Auto)"
                >
                    <Monitor className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

export default ThemeToggle;

