<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# เครื่องมือสร้างเอกสารใบส่งมอบงานและใบรับประกันสินค้า

แอปพลิเคชันสำหรับสร้างเอกสารใบส่งมอบงานและใบรับประกันสินค้าเป็นรูปแบบ PDF โดยใช้ React + TypeScript และไลบรารี jsPDF สำหรับการสร้าง PDF

View your app in AI Studio: https://ai.studio/apps/drive/1yhFfep4VwpvqkcV-CVUMEUjWccFIYz1X

## คุณสมบัติหลัก

- **ใบส่งมอบงาน**: สร้างเอกสารใบส่งมอบงานพร้อมรายการสิ่งของและรายละเอียดโครงการ
- **ใบรับประกันสินค้า**: สร้างใบรับประกันสินค้าพร้อมเงื่อนไขการรับประกัน
- **ตัวอย่างแบบเรียลไทม์**: ดูตัวอย่างเอกสารก่อนสร้าง PDF
- **ดาวน์โหลด PDF**: สร้างและดาวน์โหลดเอกสารเป็นไฟล์ PDF ทันที
- **รองรับภาษาไทย**: ออกแบบมาสำหรับใช้งานภาษาไทยโดยเฉพาะ

## โครงสร้างโปรเจค

```
/
├── components/          # คอมโพเนนต์ React
│   ├── DeliveryForm.tsx     # ฟอร์มใบส่งมอบงาน
│   ├── DeliveryPreview.tsx  # ตัวอย่างใบส่งมอบงาน
│   ├── WarrantyForm.tsx     # ฟอร์มใบรับประกัน
│   ├── WarrantyPreview.tsx  # ตัวอย่างใบรับประกัน
│   └── Header.tsx           # ส่วนหัวของแอป
├── services/
│   └── pdfGenerator.ts      # บริการสร้าง PDF
├── utils/
│   └── dateUtils.ts         # ยูทิลิตี้สำหรับจัดการวันที่
├── constants/
│   └── IBMPlexSansThaiBase64.ts  # ฟอนต์ภาษาไทยสำหรับ PDF
├── types.ts                 # กำหนดประเภทข้อมูล TypeScript
└── App.tsx                  # คอมโพเนนต์หลักของแอป
```

## การติดตั้งและใช้งาน

### ข้อกำหนดเบื้องต้น
- Node.js (เวอร์ชัน 18 ขึ้นไป)
- npm หรือ yarn

### การติดตั้ง

1. **ติดตั้ง dependencies:**
   ```bash
   npm install
   ```

2. **ตั้งค่า environment variables (ถ้าต้องการใช้ Gemini API):**
   สร้างไฟล์ `.env.local` และเพิ่ม:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **รันแอปพลิเคชัน:**
   ```bash
   npm run dev
   ```

## คำสั่งที่ใช้งานได้

### การพัฒนา (Development)

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run dev` | รัน dev server บน port 3000 |
| `npm run dev:host` | รัน dev server พร้อมเปิดให้เข้าถึงจากเครือข่ายภายนอก |
| `npm run restart` | หยุด process ที่ใช้ port 3000 แล้วรัน dev server ใหม่ |
| `npm run restart:host` | หยุด process แล้วรัน dev server ในโหมด network |

### การจัดการ Port

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run kill-port` | หยุด process ที่ใช้ port 3000 อย่างสุภาพ |
| `npm run kill-port:force` | บังคับหยุด process ที่ใช้ port 3000 |

### การ Build และ Deploy

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run build` | สร้างไฟล์สำหรับ production |
| `npm run build:analyze` | สร้างไฟล์พร้อมวิเคราะห์ bundle size |
| `npm run preview` | ทดสอบไฟล์ที่ build แล้วบน port 4173 |
| `npm run preview:host` | ทดสอบไฟล์ที่ build แล้วในโหมด network |

### การดูแลรักษา

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm run clean` | ลบไฟล์ dist และ cache |
| `npm run setup` | ติดตั้ง dependencies และ clean โปรเจค |

### สคริปต์สำหรับจัดการ Development Server

นอกจากคำสั่ง npm แล้ว โปรเจคนี้ยังมีสคริปต์สำหรับจัดการ development server ที่สะดวกมากขึ้น:

#### การรันด้วยสคริปต์ (วิธีที่สะดวกกว่า)

```bash
# รัน development server (หยุด process อัตโนมัติถ้าจำเป็น)
./scripts/dev.sh

# รีสตาร์ท development server
./scripts/restart.sh
```

ดูรายละเอียดเพิ่มเติมได้ที่ [scripts/README.md](scripts/README.md)

## การใช้งานแอปพลิเคชัน

1. **เลือกประเภทเอกสาร**: คลิกที่แท็บ "ใบส่งมอบงาน" หรือ "ใบรับประกันสินค้า"
2. **กรอกข้อมูล**: กรอกข้อมูลในฟอร์มที่ให้ไว้
3. **ดูตัวอย่าง**: ตรวจสอบตัวอย่างเอกสารในส่วนด้านขวา
4. **ดาวน์โหลด PDF**: คลิกปุ่ม "ดาวน์โหลด PDF" เพื่อสร้างและดาวน์โหลดเอกสาร

## เทคโนโลยีที่ใช้

- **React 19** - ไลบรารีสำหรับสร้าง user interface
- **TypeScript** - เพิ่ม type safety ให้กับ JavaScript
- **Vite** - Build tool ที่รวดเร็ว
- **jsPDF** - ไลบรารีสำหรับสร้าง PDF
- **html2canvas** - แปลง HTML เป็นรูปภาพสำหรับ PDF
- **PrimeReact** - ชุดคอมโพเนนต์ UI สำหรับ React
- **Tailwind CSS** - กรอบงาน CSS สำหรับการออกแบบ

## การแก้ไขปัญหา

### ปัญหา Port ถูกใช้งาน

ถ้าพอร์ต 3000 ถูกใช้งานอยู่ สามารถใช้คำสั่ง:
```bash
npm run restart  # แนะนำ - ปลอดภัยและสุภาพ
# หรือ
npm run kill-port  # ถ้าต้องการหยุดอย่างเดียว
```

### การแก้ไขข้อผิดพลาด

1. **ตรวจสอบ dependencies**: รัน `npm install` เพื่อติดตั้ง packages ที่หายไป
2. **ล้าง cache**: รัน `npm run clean` แล้วรัน `npm run dev` ใหม่
3. **ตรวจสอบ Node.js version**: ต้องใช้ Node.js 18 ขึ้นไป

## การพัฒนาเพิ่มเติม

โปรเจคนี้สามารถพัฒนาต่อได้โดย:
- เพิ่มประเภทเอกสารใหม่ๆ
- ปรับปรุงการออกแบบ UI/UX
- เพิ่มการเชื่อมต่อกับฐานข้อมูล
- เพิ่มระบบ authentication
- เพิ่มการส่งออกเอกสารในรูปแบบอื่นๆ (เช่น Word, Excel)

## 📖 เอกสารเพิ่มเติม

- **[pdftutorial.md](pdftutorial.md)** - คู่มือการสร้างและจัดการ PDF สำหรับ LLM
  - การใช้งาน jsPDF และ html2canvas
  - การตั้งค่าฟอนต์ภาษาไทย
  - Best practices และการแก้ไขปัญหา
  - ตัวอย่างโค้ดแบบเต็มรูปแบบ
