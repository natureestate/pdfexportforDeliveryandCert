/**
 * Theme Context
 * Context สำหรับจัดการ Dark/Light Mode
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;                           // ธีมที่เลือก (light/dark/system)
    resolvedTheme: 'light' | 'dark';        // ธีมที่ใช้จริง (หลัง resolve system)
    setTheme: (theme: Theme) => void;       // เปลี่ยนธีม
    toggleTheme: () => void;                // สลับ light/dark
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'app-theme';

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>('system');
    const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

    /**
     * ดึงธีมจาก localStorage
     */
    const getStoredTheme = useCallback((): Theme => {
        if (typeof window === 'undefined') return 'system';
        const stored = localStorage.getItem(THEME_KEY);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
            return stored;
        }
        return 'system';
    }, []);

    /**
     * ตรวจสอบ system preference
     */
    const getSystemTheme = useCallback((): 'light' | 'dark' => {
        if (typeof window === 'undefined') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }, []);

    /**
     * Resolve ธีมที่ใช้จริง
     */
    const resolveTheme = useCallback((currentTheme: Theme): 'light' | 'dark' => {
        if (currentTheme === 'system') {
            return getSystemTheme();
        }
        return currentTheme;
    }, [getSystemTheme]);

    /**
     * Apply ธีมไปที่ DOM
     */
    const applyTheme = useCallback((resolved: 'light' | 'dark') => {
        const root = document.documentElement;
        
        if (resolved === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        // อัปเดต meta theme-color สำหรับ mobile browser
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', resolved === 'dark' ? '#1e293b' : '#ffffff');
        }
    }, []);

    /**
     * เปลี่ยนธีม
     */
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
        
        const resolved = resolveTheme(newTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
    }, [resolveTheme, applyTheme]);

    /**
     * สลับ light/dark
     */
    const toggleTheme = useCallback(() => {
        const newTheme: Theme = resolvedTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
    }, [resolvedTheme, setTheme]);

    /**
     * Initialize theme on mount
     */
    useEffect(() => {
        const storedTheme = getStoredTheme();
        setThemeState(storedTheme);
        
        const resolved = resolveTheme(storedTheme);
        setResolvedTheme(resolved);
        applyTheme(resolved);
    }, [getStoredTheme, resolveTheme, applyTheme]);

    /**
     * Listen for system theme changes
     */
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = () => {
            if (theme === 'system') {
                const resolved = getSystemTheme();
                setResolvedTheme(resolved);
                applyTheme(resolved);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme, getSystemTheme, applyTheme]);

    const value: ThemeContextType = {
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/**
 * Hook สำหรับใช้งาน ThemeContext
 */
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

