/**
 * End Customer Project Preview Component
 * Component สำหรับแสดงข้อมูลโครงการลูกค้าปลายทางในเอกสาร PDF/Preview
 * ใช้ใน Preview components ต่างๆ เช่น DeliveryPreview, QuotationPreview เป็นต้น
 */

import React from 'react';
import { EndCustomerProject } from '../types';

interface EndCustomerProjectPreviewProps {
    // ข้อมูล
    hasEndCustomerProject?: boolean;
    endCustomerProject?: EndCustomerProject;
    showEndCustomerInPdf?: boolean;
}

/**
 * Component แสดงข้อมูลโครงการลูกค้าปลายทางใน Preview/PDF
 * แสดงเฉพาะเมื่อ hasEndCustomerProject = true และ showEndCustomerInPdf = true
 */
const EndCustomerProjectPreview: React.FC<EndCustomerProjectPreviewProps> = ({
    hasEndCustomerProject,
    endCustomerProject,
    showEndCustomerInPdf,
}) => {
    // ไม่แสดงถ้าไม่มีข้อมูลหรือไม่ได้เลือกให้แสดงใน PDF
    if (!hasEndCustomerProject || !showEndCustomerInPdf || !endCustomerProject) {
        return null;
    }

    // ไม่แสดงถ้าไม่มีข้อมูลเลย
    if (!endCustomerProject.projectName && !endCustomerProject.projectAddress && !endCustomerProject.contactName) {
        return null;
    }

    return (
        <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md print:bg-purple-50/50 print:border-purple-300">
            <h4 className="text-xs font-semibold text-purple-800 mb-2 flex items-center">
                <span className="mr-1">🏠</span> โครงการลูกค้าปลายทาง
            </h4>
            <div className="text-xs text-gray-700 space-y-1">
                {endCustomerProject.projectName && (
                    <p>
                        <span className="font-medium">โครงการ:</span> {endCustomerProject.projectName}
                    </p>
                )}
                {endCustomerProject.projectAddress && (
                    <p>
                        <span className="font-medium">ที่ตั้ง:</span> {endCustomerProject.projectAddress}
                    </p>
                )}
                {endCustomerProject.contactName && (
                    <p>
                        <span className="font-medium">ผู้ติดต่อ:</span> {endCustomerProject.contactName}
                    </p>
                )}
            </div>
        </div>
    );
};

export default EndCustomerProjectPreview;
