# PWA Setup Guide

## สิ่งที่ติดตั้งแล้ว

### 1. **Manifest.json**
- ไฟล์: `public/manifest.json`
- กำหนดข้อมูลแอปพลิเคชัน เช่น ชื่อ, ไอคอน, theme color
- รองรับการติดตั้งเป็น PWA

### 2. **Service Worker**
- ไฟล์: `public/sw.js`
- รองรับ offline caching
- Cache app shell และ static assets
- Skip caching สำหรับ Firebase และ external APIs

### 3. **Icons**
- `public/icon-192x192.svg` - Icon ขนาด 192x192
- `public/icon-512x512.svg` - Icon ขนาด 512x512

### 4. **Meta Tags**
- เพิ่มใน `index.html`:
  - PWA manifest link
  - Apple touch icon
  - Theme color
  - Apple mobile web app meta tags

## วิธีใช้งาน

### บน Desktop (Chrome/Edge)
1. เปิดเว็บไซต์ในเบราว์เซอร์
2. คลิกที่ไอคอน "ติดตั้ง" ใน address bar
3. หรือไปที่เมนู (⋮) > "ติดตั้งแอป"

### บน Mobile (Android)
1. เปิดเว็บไซต์ใน Chrome
2. เมนู (⋮) > "เพิ่มไปยังหน้าจอหลัก"
3. หรือจะเห็นปุ่ม "ติดตั้ง" ใน address bar

### บน Mobile (iOS/Safari)
1. เปิดเว็บไซต์ใน Safari
2. คลิกปุ่ม Share (□↑)
3. เลือก "เพิ่มไปยังหน้าจอหลัก"

## คุณสมบัติ

- ✅ **Standalone Mode**: เปิดแบบเต็มจอ (ไม่มี address bar)
- ✅ **Offline Support**: ใช้งานได้บางส่วนเมื่อไม่มีอินเทอร์เน็ต
- ✅ **Fast Loading**: Cache static assets
- ✅ **App-like Experience**: รู้สึกเหมือนแอปจริง

## การตรวจสอบ

1. เปิด Developer Tools (F12)
2. ไปที่แท็บ "Application" > "Service Workers"
3. ตรวจสอบว่า Service Worker ถูก register แล้ว
4. ตรวจสอบ "Manifest" ว่าข้อมูลถูกต้อง

## หมายเหตุ

- Service Worker จะทำงานเฉพาะใน HTTPS หรือ localhost
- ต้อง rebuild และ deploy ใหม่เพื่อให้ PWA ทำงาน
- Icons ใช้ SVG format (รองรับทุกเบราว์เซอร์)

