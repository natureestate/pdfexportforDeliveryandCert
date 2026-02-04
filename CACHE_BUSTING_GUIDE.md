# Cache Busting Configuration Guide

คู่มือการตั้งค่า Cache Busting สำหรับโปรเจค NE Doc Form

## สารบัญ

1. [ภาพรวม](#ภาพรวม)
2. [กลยุทธ์ Cache Busting](#กลยุทธ์-cache-busting)
3. [การตั้งค่า Vite](#การตั้งค่า-vite)
4. [Service Worker](#service-worker)
5. [Firebase Hosting Headers](#firebase-hosting-headers)
6. [สรุปการทำงาน](#สรุปการทำงาน)
7. [การแก้ปัญหา](#การแก้ปัญหา)

---

## ภาพรวม

Cache Busting คือเทคนิคที่ทำให้ browser โหลดไฟล์เวอร์ชันใหม่แทนที่จะใช้ไฟล์เก่าที่ cache ไว้ โปรเจคนี้ใช้หลายวิธีร่วมกัน:

```
┌─────────────────────────────────────────────────────────────┐
│                    Cache Busting Strategy                    │
├─────────────────────────────────────────────────────────────┤
│  1. File Hash        → ชื่อไฟล์มี hash (เช่น index-abc123.js)│
│  2. Build Version    → Service Worker มี version ที่เปลี่ยน  │
│  3. HTTP Headers     → กำหนด Cache-Control ตามประเภทไฟล์    │
│  4. Service Worker   → จัดการ cache strategy ฝั่ง client    │
└─────────────────────────────────────────────────────────────┘
```

---

## กลยุทธ์ Cache Busting

### ประเภทไฟล์และ Cache Strategy

| ประเภทไฟล์ | Hash ในชื่อ | Cache-Control | Strategy |
|-----------|-------------|---------------|----------|
| `index.html` | ไม่มี | `no-cache, max-age=0` | Network-First |
| `manifest.json` | ไม่มี | `no-cache, max-age=0` | Network-First |
| `sw.js` | ไม่มี | `no-cache, max-age=0` | Network-First |
| `*.js, *.css` | มี | `max-age=31536000, immutable` | Cache-First |
| `*.png, *.jpg, *.svg` | มี | `max-age=31536000, immutable` | Cache-First |
| `*.woff, *.woff2` | มี | `max-age=31536000, immutable` | Cache-First |

### หลักการ

1. **ไฟล์ที่มี hash** → Cache นาน 1 ปี (immutable)
2. **ไฟล์สำคัญ** (HTML, SW, manifest) → ไม่ cache, โหลดใหม่ทุกครั้ง
3. **Service Worker** → ตรวจสอบ version และลบ cache เก่าอัตโนมัติ

---

## การตั้งค่า Vite

### ไฟล์: `vite.config.ts`

### 1. Plugin Inject Build Version

```typescript
// Plugin สำหรับ inject build version เข้าไปใน Service Worker
function injectServiceWorkerVersion(): Plugin {
  let buildVersion: string;
  
  return {
    name: 'inject-sw-version',
    buildStart() {
      // สร้าง build version จาก timestamp เมื่อเริ่ม build
      buildVersion = Date.now().toString(36);
    },
    generateBundle() {
      // อ่านไฟล์ sw.js จาก public folder
      const swPath = path.resolve(__dirname, 'public/sw.js');
      if (fs.existsSync(swPath)) {
        let swContent = fs.readFileSync(swPath, 'utf-8');
        
        // แทนที่ __BUILD_VERSION__ ด้วย build version จริง
        swContent = swContent.replace(/__BUILD_VERSION__/g, buildVersion);
        
        // เขียนไฟล์ที่แก้ไขแล้วไปที่ dist folder
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: swContent
        });
      }
    },
    writeBundle() {
      // แก้ไขไฟล์ sw.js ใน dist folder หลังจาก build เสร็จ
      const distSwPath = path.resolve(__dirname, 'dist/sw.js');
      if (fs.existsSync(distSwPath)) {
        let swContent = fs.readFileSync(distSwPath, 'utf-8');
        swContent = swContent.replace(/__BUILD_VERSION__/g, buildVersion);
        fs.writeFileSync(distSwPath, swContent, 'utf-8');
      }
    }
  };
}
```

### 2. Build Output Configuration

```typescript
build: {
  rollupOptions: {
    output: {
      // ใช้ hash ในชื่อไฟล์เสมอ
      entryFileNames: 'assets/[name]-[hash].js',
      chunkFileNames: 'assets/[name]-[hash].js',
      assetFileNames: (assetInfo) => {
        // Service Worker ไม่ต้องมี hash
        if (assetInfo.name === 'sw.js') {
          return 'sw.js';
        }
        // HTML ไม่ต้องมี hash
        if (assetInfo.name && assetInfo.name.endsWith('.html')) {
          return '[name][extname]';
        }
        // Assets อื่นๆ ใช้ hash
        return `assets/[name]-[hash][extname]`;
      }
    }
  }
}
```

### 3. Development Server Headers

```typescript
// การตั้งค่า server สำหรับ localhost
server: {
  headers: {
    // ห้าม cache index.html ใน development
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  }
},
// การตั้งค่า preview server (npm run preview)
preview: {
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  }
}
```

---

## Service Worker

### ไฟล์: `public/sw.js`

### 1. Cache Version

```javascript
// Cache version - จะถูก inject โดย Vite plugin ระหว่าง build
const CACHE_NAME = 'ne-doc-form-__BUILD_VERSION__';
const BUILD_VERSION = '__BUILD_VERSION__';
```

**หมายเหตุ:** `__BUILD_VERSION__` จะถูกแทนที่ด้วย timestamp เช่น `ne-doc-form-m5x7k9p`

### 2. Network-First Paths

```javascript
// ไฟล์ที่ต้องใช้ network-first strategy (ไม่ควร cache)
const NETWORK_FIRST_PATHS = [
  '/index.html',
  '/manifest.json',
  '/sw.js'
];
```

### 3. Install Event

```javascript
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...', CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Cache only essential static files
        return cache.addAll([
          '/icon-192x192.svg',
          '/icon-512x512.svg'
        ]);
      })
  );
  self.skipWaiting(); // Activate immediately
});
```

### 4. Activate Event - ลบ Cache เก่า

```javascript
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // ลบ cache เก่าทั้งหมดที่ไม่ตรงกับ cache name ปัจจุบัน
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Take control of all pages
});
```

### 5. Fetch Event - Cache Strategy

```javascript
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Skip Firebase and external API requests
  if (url.origin.includes('firebase') || 
      url.origin.includes('googleapis.com')) {
    return;
  }

  const isNetworkFirst = NETWORK_FIRST_PATHS.some(path => 
    url.pathname === path || url.pathname.endsWith(path)
  );

  if (isNetworkFirst) {
    // Network-first strategy
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first strategy สำหรับ assets
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) return response;
          
          return fetch(event.request)
            .then((fetchResponse) => {
              // Cache assets ที่มี hash (ไฟล์ใน /assets/)
              if (url.pathname.startsWith('/assets/')) {
                caches.open(CACHE_NAME)
                  .then((cache) => cache.put(event.request, fetchResponse.clone()));
              }
              return fetchResponse;
            });
        })
    );
  }
});
```

---

## Firebase Hosting Headers

### ไฟล์: `firebase.json`

### Cache Headers Configuration

```json
{
  "hosting": {
    "headers": [
      {
        "source": "/index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, max-age=0, must-revalidate"
          }
        ]
      },
      {
        "source": "**/*.@(js|mjs|jsx|ts|tsx)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(png|jpg|jpeg|gif|svg|ico|webp|avif)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(woff|woff2|ttf|eot|otf)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "/manifest.json",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, max-age=0, must-revalidate"
          }
        ]
      },
      {
        "source": "/sw.js",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, max-age=0, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

### สรุป Cache Headers

| ไฟล์ | max-age | หมายเหตุ |
|------|---------|----------|
| `index.html` | 0 | โหลดใหม่ทุกครั้ง |
| `manifest.json` | 0 | โหลดใหม่ทุกครั้ง |
| `sw.js` | 0 | โหลดใหม่ทุกครั้ง |
| `*.js, *.css` | 31536000 (1 ปี) | immutable เพราะมี hash |
| `*.png, *.jpg, *.svg` | 31536000 (1 ปี) | immutable เพราะมี hash |
| `*.woff, *.woff2` | 31536000 (1 ปี) | immutable เพราะมี hash |

---

## สรุปการทำงาน

### Flow เมื่อ Deploy ใหม่

```
┌─────────────────────────────────────────────────────────────┐
│                    Deploy Flow                               │
├─────────────────────────────────────────────────────────────┤
│  1. npm run build                                            │
│     ├── สร้างไฟล์ JS/CSS พร้อม hash ใหม่                      │
│     └── Inject build version ใน sw.js                        │
│                                                              │
│  2. firebase deploy                                          │
│     └── อัปโหลดไฟล์ใหม่ไป Firebase Hosting                   │
│                                                              │
│  3. User เปิดเว็บ                                            │
│     ├── Browser โหลด index.html (no-cache)                   │
│     ├── index.html ชี้ไปยังไฟล์ JS/CSS ใหม่ (hash ใหม่)        │
│     ├── Browser โหลดไฟล์ใหม่ (ไม่มีใน cache)                  │
│     └── Service Worker อัปเดต (version ใหม่)                 │
│                                                              │
│  4. Service Worker Activate                                  │
│     └── ลบ cache เก่าที่มี version ไม่ตรง                     │
└─────────────────────────────────────────────────────────────┘
```

### ทำไมถึงทำงานได้

1. **index.html ไม่ถูก cache** → Browser โหลด HTML ใหม่ทุกครั้ง
2. **HTML ชี้ไปยังไฟล์ที่มี hash ใหม่** → เช่น `index-abc123.js` → `index-xyz789.js`
3. **Browser ไม่มีไฟล์ hash ใหม่ใน cache** → ต้องโหลดจาก server
4. **Service Worker มี version ใหม่** → ลบ cache เก่าทั้งหมด

---

## การแก้ปัญหา

### ปัญหา: User ยังเห็นเวอร์ชันเก่า

**สาเหตุที่เป็นไปได้:**

1. **CDN Cache** - Firebase Hosting อาจ cache ไว้
2. **Browser Cache** - Browser อาจ cache index.html
3. **Service Worker เก่า** - SW ยังไม่อัปเดต

**วิธีแก้:**

```bash
# 1. Clear CDN Cache (Firebase)
firebase hosting:channel:deploy preview --expires 1h

# 2. แนะนำให้ User
# - กด Ctrl+Shift+R (Hard Refresh)
# - หรือ Clear Browser Cache
# - หรือเปิดใน Incognito Mode

# 3. ตรวจสอบ Service Worker
# - เปิด DevTools > Application > Service Workers
# - กด "Update" หรือ "Unregister"
```

### ปัญหา: Service Worker ไม่อัปเดต

**ตรวจสอบ:**

1. เปิด DevTools > Application > Service Workers
2. ดู Status ว่าเป็น "activated and is running" หรือไม่
3. ดู Cache Storage ว่ามี cache name ที่ถูกต้องหรือไม่

**วิธีแก้:**

```javascript
// เพิ่มใน Console
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});
// แล้ว refresh หน้า
```

### ปัญหา: ไฟล์ไม่มี Hash

**ตรวจสอบ:**

1. ดูใน `dist/assets/` ว่าไฟล์มี hash หรือไม่
2. ตรวจสอบ `vite.config.ts` ว่าตั้งค่าถูกต้อง

**ตัวอย่างไฟล์ที่ถูกต้อง:**

```
dist/
├── index.html              # ไม่มี hash
├── sw.js                   # ไม่มี hash
├── manifest.json           # ไม่มี hash
└── assets/
    ├── index-BsIaW6zR.js   # มี hash ✓
    ├── index-D7s95aKd.css  # มี hash ✓
    └── logo-aGzT-_H7.png   # มี hash ✓
```

---

## Best Practices

1. **ไม่แก้ไขไฟล์ใน `dist/` โดยตรง** - ให้แก้ source แล้ว build ใหม่
2. **ใช้ `npm run build` ทุกครั้งก่อน deploy** - เพื่อให้ได้ hash ใหม่
3. **ตรวจสอบ Service Worker หลัง deploy** - ดูว่า version อัปเดตหรือไม่
4. **ใช้ DevTools Network tab** - ตรวจสอบว่าไฟล์โหลดจาก cache หรือ network

---

## อ้างอิง

- [Vite Build Options](https://vitejs.dev/config/build-options.html)
- [Firebase Hosting Configuration](https://firebase.google.com/docs/hosting/full-config)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
