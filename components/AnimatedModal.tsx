/**
 * AnimatedModal Component
 * Wrapper component สำหรับ Modal ทุกตัวในแอป
 * ใช้ framer-motion ให้ backdrop fade + content spring animation
 * 
 * วิธีใช้:
 * <AnimatedModal isOpen={showModal} onClose={() => setShowModal(false)}>
 *   <div className="...">เนื้อหา modal</div>
 * </AnimatedModal>
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedModalProps {
    /** สถานะเปิด/ปิด modal */
    isOpen: boolean;
    /** ฟังก์ชันปิด modal เมื่อคลิก backdrop (optional - ถ้าไม่ส่งจะไม่ปิดเมื่อคลิก backdrop) */
    onClose?: () => void;
    /** เนื้อหาภายใน modal */
    children: React.ReactNode;
    /** className เพิ่มเติมสำหรับ backdrop */
    backdropClassName?: string;
    /** className เพิ่มเติมสำหรับ content wrapper */
    contentClassName?: string;
    /** ปิดการคลิก backdrop เพื่อปิด modal */
    disableBackdropClose?: boolean;
}

const AnimatedModal: React.FC<AnimatedModalProps> = ({
    isOpen,
    onClose,
    children,
    backdropClassName = '',
    contentClassName = '',
    disableBackdropClose = false,
}) => {
    // จัดการคลิก backdrop
    const handleBackdropClick = () => {
        if (!disableBackdropClose && onClose) {
            onClose();
        }
    };

    // ป้องกัน event bubbling จาก content ไปยัง backdrop
    const handleContentClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 ${backdropClassName}`}
                    onClick={handleBackdropClick}
                >
                    {/* Backdrop - พื้นหลังมืด */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70"
                    />
                    
                    {/* Content - เนื้อหา modal พร้อม spring animation */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ 
                            type: "spring", 
                            stiffness: 350, 
                            damping: 25,
                            mass: 0.8
                        }}
                        className={`relative z-10 ${contentClassName}`}
                        onClick={handleContentClick}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AnimatedModal;
