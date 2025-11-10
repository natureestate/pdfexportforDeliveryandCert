import path from 'path';
import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

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

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [
        react(),
        injectServiceWorkerVersion()
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // การตั้งค่า build เพื่อให้แน่ใจว่าไฟล์มี hash เสมอ
      build: {
        rollupOptions: {
          output: {
            // ใช้ hash ในชื่อไฟล์เสมอ
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: (assetInfo) => {
              // สำหรับ assets อื่นๆ (CSS, images, etc.)
              if (assetInfo.name === 'sw.js') {
                return 'sw.js'; // Service Worker ไม่ต้องมี hash
              }
              if (assetInfo.name && assetInfo.name.endsWith('.html')) {
                return '[name][extname]'; // HTML ไม่ต้องมี hash
              }
              // Assets อื่นๆ ใช้ hash
              const info = assetInfo.name?.split('.') || [];
              const ext = info[info.length - 1];
              if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(ext)) {
                return `assets/[name]-[hash][extname]`;
              }
              return `assets/[name]-[hash][extname]`;
            }
          }
        }
      },
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
          // ห้าม cache index.html ใน preview mode
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        }
      }
    };
});
