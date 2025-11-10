#!/bin/bash

# สคริปต์สำหรับ Deploy โปรเจกต์ไปที่ Firebase Hosting
# Project: ecertonline-29a67

echo "🚀 เริ่มต้น Deploy โปรเจกต์..."

# ตรวจสอบว่ามี Firebase CLI หรือไม่
if ! command -v firebase &> /dev/null; then
    echo "❌ ไม่พบ Firebase CLI กำลังติดตั้ง..."
    npm install -g firebase-tools
fi

# ตรวจสอบว่ามีการ login หรือไม่
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  ยังไม่ได้ login Firebase"
    echo "📝 กำลังเปิด browser เพื่อ login..."
    firebase login
fi

# Build โปรเจกต์
echo "📦 กำลัง build โปรเจกต์..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build ล้มเหลว!"
    exit 1
fi

# Deploy Firestore Rules
echo "📋 กำลัง deploy Firestore Rules..."
firebase deploy --only firestore:rules

# Deploy Storage Rules
echo "💾 กำลัง deploy Storage Rules..."
firebase deploy --only storage:rules

# Deploy Hosting
echo "🌐 กำลัง deploy Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ Deploy สำเร็จ!"
    echo "🌍 ตรวจสอบ URL ที่: https://ecertonline-29a67.web.app"
else
    echo "❌ Deploy ล้มเหลว!"
    exit 1
fi
