/**
 * Firebase Cloud Functions
 * รวมฟังก์ชันต่างๆ สำหรับ backend
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Interface สำหรับ request และ response
 */
interface VerifyRecaptchaRequest {
    token: string;
    action: string;
}

interface VerifyRecaptchaResponse {
    success: boolean;
    score: number;
    action: string;
    message?: string;
}

interface SendInvitationEmailRequest {
    invitationId: string;
    email: string;
    companyName: string;
    role: string;
    invitedByName?: string;
    invitedByEmail?: string;
    token: string;
    message?: string;
}

interface SendInvitationEmailResponse {
    success: boolean;
    message: string;
}

/**
 * Cloud Function สำหรับ verify reCAPTCHA token (v2 with App Check)
 * 
 * @param request - { data: { token: string, action: string }, app: AppCheckData }
 * @returns { success: boolean, score: number, action: string }
 */
export const verifyRecaptcha = onCall(
    {
        enforceAppCheck: true, // บังคับให้มี valid App Check token
    },
    async (request): Promise<VerifyRecaptchaResponse> => {
        const { token, action } = request.data as VerifyRecaptchaRequest;

        // Log App Check info
        console.log('App Check verified:', {
            appId: request.app?.appId,
            alreadyConsumed: request.app?.alreadyConsumed,
        });

        // ตรวจสอบ input
        if (!token || !action) {
            throw new HttpsError(
                'invalid-argument',
                'กรุณาระบุ token และ action'
            );
        }

        try {
            // ดึง Secret Key จาก environment config
            const secretKey = functions.config().recaptcha?.secret_key;

            if (!secretKey) {
                // ถ้ายังไม่ได้ตั้งค่า secret key ให้ผ่านไปก่อน (สำหรับ development)
                console.warn('⚠️ reCAPTCHA Secret Key ยังไม่ได้ตั้งค่า');
                return {
                    success: true,
                    score: 1.0,
                    action,
                    message: 'Secret key not configured, bypassing verification'
                };
            }

            // เรียก Google reCAPTCHA API เพื่อ verify token
            const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
            const params = new URLSearchParams({
                secret: secretKey,
                response: token,
            });

            const response = await fetch(verifyUrl, {
                method: 'POST',
                body: params,
            });

            const result = await response.json() as {
                success: boolean;
                score: number;
                action: string;
                challenge_ts: string;
                hostname: string;
                'error-codes'?: string[];
            };

            // ตรวจสอบผลลัพธ์
            if (!result.success) {
                console.error('reCAPTCHA verification failed:', result['error-codes']);
                return {
                    success: false,
                    score: 0,
                    action,
                    message: 'การตรวจสอบ reCAPTCHA ล้มเหลว'
                };
            }

            // ตรวจสอบว่า action ตรงกันหรือไม่
            if (result.action !== action) {
                console.error('Action mismatch:', {
                    expected: action,
                    received: result.action
                });
                return {
                    success: false,
                    score: result.score,
                    action: result.action,
                    message: 'Action ไม่ตรงกัน'
                };
            }

            // Log score สำหรับ monitoring
            console.log('reCAPTCHA verification:', {
                action,
                score: result.score,
                hostname: result.hostname,
                timestamp: result.challenge_ts
            });

            // Return ผลลัพธ์
            return {
                success: true,
                score: result.score,
                action: result.action,
                message: result.score >= 0.5 
                    ? 'ผ่านการตรวจสอบ' 
                    : 'Score ต่ำกว่าเกณฑ์'
            };

        } catch (error) {
            console.error('Error verifying reCAPTCHA:', error);
            throw new HttpsError(
                'internal',
                'เกิดข้อผิดพลาดในการตรวจสอบ reCAPTCHA'
            );
        }
    }
);

/**
 * Cloud Function สำหรับส่งอีเมลเชิญเข้าองค์กร (v2)
 * 
 * @param request - { data: SendInvitationEmailRequest, auth: AuthData }
 * @returns { success: boolean, message: string }
 */
export const sendInvitationEmail = onCall(
    {
        // กำหนด region และ cors เพื่อแก้ปัญหา CORS error
        region: 'us-central1',
        cors: [
            'https://ecertonline-29a67.web.app',
            'https://ecertonline-29a67.firebaseapp.com',
            'http://localhost:5173',
            'http://localhost:3000',
        ],
    },
    async (request): Promise<SendInvitationEmailResponse> => {
        // ตรวจสอบว่า user login แล้วหรือไม่
        if (!request.auth) {
            throw new HttpsError(
                'unauthenticated',
                'กรุณา Login ก่อนส่งคำเชิญ'
            );
        }

        const {
            invitationId,
            email,
            companyName,
            role,
            invitedByName,
            invitedByEmail,
            token,
            message,
        } = request.data as SendInvitationEmailRequest;

        // ตรวจสอบ input
        if (!invitationId || !email || !companyName || !role || !token) {
            throw new HttpsError(
                'invalid-argument',
                'ข้อมูลไม่ครบถ้วน'
            );
        }

        try {
            // สร้าง invitation link
            const baseUrl = process.env.FUNCTIONS_EMULATOR
                ? 'http://localhost:5173'
                : 'https://your-app-domain.web.app'; // เปลี่ยนเป็น domain จริงของคุณ
            
            const invitationLink = `${baseUrl}/accept-invitation?token=${token}`;

            // สร้างเนื้อหาอีเมล (HTML)
            const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .content {
            padding: 30px;
        }
        .content h2 {
            color: #667eea;
            margin-top: 0;
        }
        .invitation-box {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
        }
        .invitation-box p {
            margin: 5px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }
        .button:hover {
            background: #5568d3;
        }
        .footer {
            background: #f8f9fa;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 10px;
            border-radius: 4px;
            margin: 15px 0;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 คำเชิญเข้าร่วมองค์กร</h1>
        </div>
        <div class="content">
            <h2>สวัสดีค่ะ/ครับ!</h2>
            <p>คุณได้รับคำเชิญให้เข้าร่วมองค์กร <strong>${companyName}</strong></p>
            
            <div class="invitation-box">
                <p><strong>📧 อีเมล:</strong> ${email}</p>
                <p><strong>👤 บทบาท:</strong> ${role === 'admin' ? 'Admin (ผู้จัดการ)' : 'Member (สมาชิกทั่วไป)'}</p>
                ${invitedByName ? `<p><strong>✉️ เชิญโดย:</strong> ${invitedByName}${invitedByEmail ? ` (${invitedByEmail})` : ''}</p>` : ''}
            </div>
            
            ${message ? `
            <div class="invitation-box">
                <p><strong>💬 ข้อความจากผู้เชิญ:</strong></p>
                <p>${message}</p>
            </div>
            ` : ''}
            
            <p>กรุณาคลิกปุ่มด้านล่างเพื่อยอมรับคำเชิญ:</p>
            
            <center>
                <a href="${invitationLink}" class="button">ยอมรับคำเชิญ</a>
            </center>
            
            <div class="warning">
                ⚠️ <strong>หมายเหตุ:</strong> คำเชิญนี้จะหมดอายุใน 7 วัน<br>
                หากคุณไม่ได้ขอคำเชิญนี้ กรุณาเพิกเฉยต่ออีเมลนี้
            </div>
            
            <p style="font-size: 12px; color: #666; margin-top: 20px;">
                หากปุ่มไม่ทำงาน กรุณาคัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:<br>
                <a href="${invitationLink}" style="color: #667eea; word-break: break-all;">${invitationLink}</a>
            </p>
        </div>
        <div class="footer">
            <p>อีเมลนี้ส่งจากระบบจัดการเอกสารอัตโนมัติ</p>
            <p>© ${new Date().getFullYear()} All rights reserved.</p>
        </div>
    </div>
</body>
</html>
            `;

            // สร้างเนื้อหาอีเมล (Plain Text)
            const emailText = `
คำเชิญเข้าร่วมองค์กร

สวัสดีค่ะ/ครับ!

คุณได้รับคำเชิญให้เข้าร่วมองค์กร ${companyName}

รายละเอียด:
- อีเมล: ${email}
- บทบาท: ${role === 'admin' ? 'Admin (ผู้จัดการ)' : 'Member (สมาชิกทั่วไป)'}
${invitedByName ? `- เชิญโดย: ${invitedByName}${invitedByEmail ? ` (${invitedByEmail})` : ''}` : ''}

${message ? `ข้อความจากผู้เชิญ:\n${message}\n` : ''}

กรุณาคลิกลิงก์ด้านล่างเพื่อยอมรับคำเชิญ:
${invitationLink}

หมายเหตุ: คำเชิญนี้จะหมดอายุใน 7 วัน
หากคุณไม่ได้ขอคำเชิญนี้ กรุณาเพิกเฉยต่ออีเมลนี้

---
อีเมลนี้ส่งจากระบบจัดการเอกสารอัตโนมัติ
© ${new Date().getFullYear()} All rights reserved.
            `;

            // บันทึกข้อมูลอีเมลลง Firestore (สำหรับ Email Extension หรือ Custom Email Service)
            await admin.firestore().collection('mail').add({
                to: email,
                message: {
                    subject: `🎉 คำเชิญเข้าร่วมองค์กร ${companyName}`,
                    text: emailText,
                    html: emailHtml,
                },
                invitationId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ ส่งอีเมลเชิญสำเร็จ: ${email} (Invitation ID: ${invitationId})`);

            return {
                success: true,
                message: 'ส่งอีเมลเชิญสำเร็จ',
            };

        } catch (error) {
            console.error('❌ ส่งอีเมลเชิญล้มเหลว:', error);
            throw new HttpsError(
                'internal',
                'เกิดข้อผิดพลาดในการส่งอีเมลเชิญ'
            );
        }
    }
);
