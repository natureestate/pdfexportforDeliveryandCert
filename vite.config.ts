import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
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
