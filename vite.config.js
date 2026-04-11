import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [basicSsl(), tailwindcss(), sveltekit()],
  server: {
    host: '0.0.0.0',
    port: 2002,
    fs: {
      allow: [".."],
    },
    headers: {
      "Content-Security-Policy": "base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://apis.google.com https://accounts.google.com https://www.gstatic.com; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://www.gstatic.com; img-src 'self' data: https://www.gstatic.com https://lh3.googleusercontent.com; style-src 'self' 'unsafe-inline'",
    },
  },
  build: {
    rollupOptions: {
      onLog: (level, log, handler) => {
        if (level === "warn") {
          if (log.message === 'Generated an empty chunk: "rxdb".') {
            return;
          }
          if (log.message === 'Generated an empty chunk: "rxdb-helper".') {
            return;
          }
        }

        handler(level, log);
      },
      output: {
        manualChunks: {
          // Separate chunk for translations
          "firebase-app": ["./src/lib/app/chunk/firebase-app.ts"],
          "firebase-firestore": ["./src/lib/app/chunk/firebase-firestore.ts"],
          rxdb: ["./src/lib/app/chunk/rxdb.ts"],
          "rxdb-helper": ["./src/lib/app/chunk/rxdb_helper.ts"],
        },
        
      },
    },
  },
});
