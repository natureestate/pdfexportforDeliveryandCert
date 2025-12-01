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

    // แสดงปุ่มพร้อม label และตัวเลือก
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ธีม:</span>
            <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-600 p-1 bg-gray-50 dark:bg-slate-700">
                <button
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        theme === 'light'
                            ? 'bg-white dark:bg-slate-600 text-amber-600 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    title="Light Mode"
                >
                    <Sun className="w-4 h-4" />
                    <span className="hidden sm:inline">Light</span>
                </button>
                <button
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        theme === 'dark'
                            ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    title="Dark Mode"
                >
                    <Moon className="w-4 h-4" />
                    <span className="hidden sm:inline">Dark</span>
                </button>
                <button
                    onClick={() => setTheme('system')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        theme === 'system'
                            ? 'bg-white dark:bg-slate-600 text-green-600 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    title="System (Auto)"
                >
                    <Monitor className="w-4 h-4" />
                    <span className="hidden sm:inline">Auto</span>
                </button>
            </div>
        </div>
    );
};

export default ThemeToggle;

