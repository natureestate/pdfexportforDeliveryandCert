import React, { useState } from 'react';

interface PolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'terms' | 'privacy';
}

const PolicyModal: React.FC<PolicyModalProps> = ({ isOpen, onClose, type }) => {
    if (!isOpen) return null;

    const isTerms = type === 'terms';
    const title = isTerms ? 'เงื่อนไขการใช้งาน' : 'นโยบายความเป็นส่วนตัว';

    return (
        <>
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
                onClick={onClose}
            >
                {/* Modal Content */}
                <div 
                    className="bg-white rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <h2 className="text-xl font-bold">{title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:text-gray-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4 text-gray-700">
                        {isTerms ? (
                            <>
                                <div className="prose max-w-none">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">1. การยอมรับเงื่อนไข</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        การเข้าใช้งานและใช้บริการของเว็บไซต์นี้ หมายความว่าคุณได้อ่าน ทำความเข้าใจ และยอมรับที่จะปฏิบัติตามเงื่อนไขการใช้งานทั้งหมดที่ระบุไว้ในเอกสารฉบับนี้ 
                                        หากคุณไม่ยอมรับเงื่อนไขใดๆ กรุณาอย่าใช้บริการของเรา
                                    </p>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">2. คำจำกัดความ</h3>
                                    <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                                        <li><strong>"บริการ"</strong> หมายถึง บริการสร้างและจัดการเอกสารออนไลน์ รวมถึงใบส่งมอบงานและใบรับประกันสินค้า</li>
                                        <li><strong>"ผู้ใช้"</strong> หมายถึง บุคคลหรือนิติบุคคลที่เข้าใช้งานและใช้บริการของเว็บไซต์</li>
                                        <li><strong>"ข้อมูล"</strong> หมายถึง ข้อมูลทั้งหมดที่ผู้ใช้ป้อนหรืออัปโหลดผ่านบริการ</li>
                                    </ul>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">3. สิทธิ์ในการใช้งาน</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        คุณได้รับสิทธิ์ให้ใช้บริการของเราเพื่อวัตถุประสงค์ทางธุรกิจที่ถูกต้องตามกฎหมายเท่านั้น 
                                        คุณต้องไม่ใช้บริการเพื่อวัตถุประสงค์ที่ผิดกฎหมาย หรือละเมิดสิทธิ์ของผู้อื่น
                                    </p>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">4. การรับผิดชอบ</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        คุณมีหน้าที่รับผิดชอบต่อความถูกต้องและความสมบูรณ์ของข้อมูลที่คุณป้อนหรืออัปโหลด 
                                        เราไม่รับผิดชอบต่อความเสียหายใดๆ ที่เกิดจากการใช้ข้อมูลที่ไม่ถูกต้องหรือไม่สมบูรณ์
                                    </p>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">5. การยกเลิกบริการ</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เราขอสงวนสิทธิ์ในการระงับหรือยกเลิกการให้บริการแก่ผู้ใช้ที่ละเมิดเงื่อนไขการใช้งาน 
                        หรือใช้บริการในทางที่ผิดกฎหมาย โดยไม่ต้องแจ้งให้ทราบล่วงหน้า
                                    </p>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">6. การเปลี่ยนแปลงเงื่อนไข</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เราขอสงวนสิทธิ์ในการแก้ไขเปลี่ยนแปลงเงื่อนไขการใช้งานได้ตลอดเวลา 
                                        การเปลี่ยนแปลงจะมีผลทันทีหลังจากประกาศบนเว็บไซต์ 
                                        การใช้บริการต่อเนื่องของคุณถือว่าคุณยอมรับเงื่อนไขที่เปลี่ยนแปลงแล้ว
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="prose max-w-none">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">1. ข้อมูลที่เรารวบรวม</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เรารวบรวมข้อมูลส่วนบุคคลที่จำเป็นสำหรับการให้บริการ รวมถึง:
                                    </p>
                                    <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                                        <li>ข้อมูลการเข้าสู่ระบบ (อีเมล, เบอร์โทรศัพท์)</li>
                                        <li>ข้อมูลบริษัทและข้อมูลการติดต่อ</li>
                                        <li>ข้อมูลเอกสารที่คุณสร้าง (ใบส่งมอบงาน, ใบรับประกันสินค้า)</li>
                                        <li>ข้อมูลการใช้งานระบบ (IP Address, Browser, Device Information)</li>
                                    </ul>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">2. วัตถุประสงค์ในการใช้ข้อมูล</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เราใช้ข้อมูลส่วนบุคคลของคุณเพื่อ:
                                    </p>
                                    <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                                        <li>ให้บริการสร้างและจัดการเอกสาร</li>
                                        <li>ปรับปรุงและพัฒนาบริการให้ดีขึ้น</li>
                                        <li>รักษาความปลอดภัยของระบบและป้องกันการฉ้อโกง</li>
                                        <li>ส่งข้อมูลสำคัญเกี่ยวกับบริการและการเปลี่ยนแปลง</li>
                                        <li>ปฏิบัติตามข้อกำหนดทางกฎหมาย</li>
                                    </ul>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">3. การเก็บรักษาข้อมูล</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เราจะเก็บรักษาข้อมูลส่วนบุคคลของคุณไว้ตราบเท่าที่จำเป็นสำหรับการให้บริการ 
                                        หรือตามระยะเวลาที่กฎหมายกำหนด หลังจากนั้นเราจะลบหรือทำลายข้อมูลอย่างปลอดภัย
                                    </p>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">4. การเปิดเผยข้อมูล</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เราจะไม่เปิดเผยข้อมูลส่วนบุคคลของคุณให้กับบุคคลที่สาม ยกเว้นในกรณี:
                                    </p>
                                    <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                                        <li>คุณได้ให้ความยินยอมอย่างชัดเจน</li>
                                        <li>เป็นไปตามข้อกำหนดทางกฎหมายหรือคำสั่งศาล</li>
                                        <li>เพื่อป้องกันหรือระงับอันตรายต่อชีวิต ร่างกาย หรือทรัพย์สิน</li>
                                        <li>กับผู้ให้บริการที่เราใช้ในการให้บริการ (เช่น Firebase, Cloud Storage) ซึ่งมีข้อผูกพันในการรักษาความลับ</li>
                                    </ul>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">5. สิทธิ์ของคุณ</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        ตามพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 คุณมีสิทธิ์:
                                    </p>
                                    <ul className="list-disc list-inside space-y-2 text-sm mb-4">
                                        <li><strong>สิทธิ์ในการเข้าถึง:</strong> ขอรับสำเนาข้อมูลส่วนบุคคลของคุณ</li>
                                        <li><strong>สิทธิ์ในการแก้ไข:</strong> แก้ไขข้อมูลส่วนบุคคลที่ผิดพลาด</li>
                                        <li><strong>สิทธิ์ในการลบ:</strong> ขอลบข้อมูลส่วนบุคคลของคุณ</li>
                                        <li><strong>สิทธิ์ในการระงับ:</strong> ขอระงับการใช้ข้อมูลส่วนบุคคล</li>
                                        <li><strong>สิทธิ์ในการคัดค้าน:</strong> คัดค้านการเก็บรวบรวมหรือใช้ข้อมูลส่วนบุคคล</li>
                                        <li><strong>สิทธิ์ในการถอนความยินยอม:</strong> ถอนความยินยอมที่เคยให้ไว้</li>
                                        <li><strong>สิทธิ์ในการร้องเรียน:</strong> ร้องเรียนต่อคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล</li>
                                    </ul>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">6. ความปลอดภัยของข้อมูล</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เรามีมาตรการรักษาความปลอดภัยที่เหมาะสมทั้งทางเทคนิคและการบริหารจัดการ 
                                        เพื่อป้องกันการเข้าถึง ใช้ เปิดเผย แก้ไข หรือทำลายข้อมูลส่วนบุคคลโดยไม่ได้รับอนุญาต
                                    </p>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">7. การเปลี่ยนแปลงนโยบาย</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        เราอาจแก้ไขเปลี่ยนแปลงนโยบายความเป็นส่วนตัวนี้ได้ตามความเหมาะสม 
                                        การเปลี่ยนแปลงจะมีผลทันทีหลังจากประกาศบนเว็บไซต์ 
                                        เราขอแนะนำให้คุณตรวจสอบนโยบายนี้เป็นระยะ
                                    </p>

                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">8. ติดต่อเรา</h3>
                                    <p className="text-sm leading-relaxed mb-4">
                                        หากคุณมีคำถามหรือต้องการใช้สิทธิ์ตามที่ระบุไว้ข้างต้น 
                                        กรุณาติดต่อเราผ่านช่องทางที่ระบุไว้ในเว็บไซต์
                                    </p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 rounded-b-lg">
                        <button
                            onClick={onClose}
                            className="w-full px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
                        >
                            ปิด
                        </button>
                    </div>
                </div>
            </div>

            {/* CSS Animation */}
            <style>{`
                @keyframes fade-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
            `}</style>
        </>
    );
};

export default PolicyModal;

