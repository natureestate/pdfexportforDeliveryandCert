/**
 * SignaturePad - Component สำหรับวาดหรือพิมพ์ลายเซ็น
 * 
 * ฟีเจอร์:
 * 1. วาดลายเซ็นด้วยนิ้ว/เมาส์ (Canvas)
 * 2. พิมพ์ชื่อเป็นลายเซ็น (Cursive Font)
 * 3. Export เป็น Base64 PNG
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Type, Eraser, Check, X } from 'lucide-react';
import { SignatureType } from '../types';

// Props สำหรับ SignaturePad
interface SignaturePadProps {
    onSignatureChange: (data: { type: SignatureType; data: string } | null) => void;
    signerName?: string;
    disabled?: boolean;
    className?: string;
}

// Tab สำหรับเลือกประเภทลายเซ็น
type SignatureTab = 'draw' | 'type';

const SignaturePad: React.FC<SignaturePadProps> = ({
    onSignatureChange,
    signerName = '',
    disabled = false,
    className = '',
}) => {
    // State
    const [activeTab, setActiveTab] = useState<SignatureTab>('draw');
    const [typedName, setTypedName] = useState(signerName);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    
    // Refs
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    // อัปเดต typedName เมื่อ signerName เปลี่ยน
    useEffect(() => {
        if (signerName) {
            setTypedName(signerName);
        }
    }, [signerName]);

    // Initialize Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // ตั้งค่าขนาด Canvas ให้ตรงกับ display size
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        context.scale(dpr, dpr);
        context.lineCap = 'round';
        context.strokeStyle = '#1e293b'; // สี slate-800
        context.lineWidth = 2;
        
        // พื้นหลังขาว
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, rect.width, rect.height);
        
        contextRef.current = context;
    }, [activeTab]);

    // ฟังก์ชันสำหรับ Canvas Drawing
    const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        
        const rect = canvas.getBoundingClientRect();
        
        if ('touches' in e) {
            // Touch event
            const touch = e.touches[0];
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top,
            };
        } else {
            // Mouse event
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            };
        }
    }, []);

    const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        
        const { x, y } = getCoordinates(e);
        contextRef.current?.beginPath();
        contextRef.current?.moveTo(x, y);
        setIsDrawing(true);
    }, [disabled, getCoordinates]);

    const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled) return;
        
        e.preventDefault(); // ป้องกัน scroll บน mobile
        
        const { x, y } = getCoordinates(e);
        contextRef.current?.lineTo(x, y);
        contextRef.current?.stroke();
        setHasDrawn(true);
    }, [isDrawing, disabled, getCoordinates]);

    const stopDrawing = useCallback(() => {
        contextRef.current?.closePath();
        setIsDrawing(false);
        
        // Export canvas เป็น Base64 และส่งกลับ
        if (hasDrawn && canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            onSignatureChange({ type: 'draw', data: dataUrl });
        }
    }, [hasDrawn, onSignatureChange]);

    // ล้าง Canvas
    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const context = contextRef.current;
        if (!canvas || !context) return;
        
        const rect = canvas.getBoundingClientRect();
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, rect.width, rect.height);
        setHasDrawn(false);
        onSignatureChange(null);
    }, [onSignatureChange]);

    // Handle Typed Signature
    const handleTypedNameChange = useCallback((value: string) => {
        setTypedName(value);
        if (value.trim()) {
            onSignatureChange({ type: 'typed', data: value.trim() });
        } else {
            onSignatureChange(null);
        }
    }, [onSignatureChange]);

    // เปลี่ยน Tab
    const handleTabChange = useCallback((tab: SignatureTab) => {
        setActiveTab(tab);
        onSignatureChange(null);
        if (tab === 'draw') {
            setHasDrawn(false);
        } else {
            // ถ้ามีชื่อพิมพ์อยู่แล้ว ให้ส่งกลับ
            if (typedName.trim()) {
                onSignatureChange({ type: 'typed', data: typedName.trim() });
            }
        }
    }, [onSignatureChange, typedName]);

    return (
        <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
            {/* Tab Header - เลือกประเภทลายเซ็น */}
            <div className="flex border-b border-slate-200">
                <button
                    type="button"
                    onClick={() => handleTabChange('draw')}
                    disabled={disabled}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                        activeTab === 'draw'
                            ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                            : 'text-slate-600 hover:bg-slate-50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Pencil className="w-4 h-4" />
                    <span>วาดลายเซ็น</span>
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('type')}
                    disabled={disabled}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                        activeTab === 'type'
                            ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600'
                            : 'text-slate-600 hover:bg-slate-50'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Type className="w-4 h-4" />
                    <span>พิมพ์ชื่อ</span>
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'draw' ? (
                    <>
                        {/* Canvas สำหรับวาดลายเซ็น */}
                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                className={`w-full h-40 border border-slate-300 rounded-lg cursor-crosshair touch-none ${
                                    disabled ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                style={{ touchAction: 'none' }}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            
                            {/* Placeholder - แสดงเมื่อยังไม่ได้วาด */}
                            {!hasDrawn && !disabled && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <p className="text-slate-400 text-sm">
                                        วาดลายเซ็นของคุณที่นี่
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ปุ่มล้าง Canvas */}
                        <div className="flex justify-end mt-3">
                            <button
                                type="button"
                                onClick={clearCanvas}
                                disabled={disabled || !hasDrawn}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${
                                    disabled || !hasDrawn ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                <Eraser className="w-4 h-4" />
                                <span>ล้าง</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Input สำหรับพิมพ์ชื่อ */}
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={typedName}
                                onChange={(e) => handleTypedNameChange(e.target.value)}
                                disabled={disabled}
                                placeholder="พิมพ์ชื่อของคุณ"
                                className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg ${
                                    disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
                                }`}
                            />

                            {/* Preview ลายเซ็นแบบ Cursive */}
                            {typedName && (
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                    <p className="text-xs text-slate-500 mb-2">ตัวอย่างลายเซ็น:</p>
                                    <p 
                                        className="text-3xl text-slate-800"
                                        style={{ 
                                            fontFamily: "'Sarabun', 'Segoe Script', 'Lucida Handwriting', cursive",
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        {typedName}
                                    </p>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                        {activeTab === 'draw' 
                            ? hasDrawn ? '✓ มีลายเซ็นแล้ว' : 'กรุณาวาดลายเซ็น'
                            : typedName ? '✓ มีลายเซ็นแล้ว' : 'กรุณาพิมพ์ชื่อ'
                        }
                    </span>
                    {(hasDrawn || typedName) && (
                        <span className="flex items-center gap-1 text-green-600">
                            <Check className="w-3 h-3" />
                            พร้อมใช้งาน
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SignaturePad;

