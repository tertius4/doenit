import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  server: {
    host: "0.0.0.0",
    port: 2002,
    fs: {
      allow: [".."],
    },
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none",
      "Content-Security-Policy":
        "base-uri 'self'; object-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: data: https://apis.google.com https://accounts.google.com https://www.gstatic.com; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com https://*.googleapis.com https://www.gstatic.com; img-src 'self' data: https://www.gstatic.com https://lh3.googleusercontent.com; style-src 'self' 'unsafe-inline'",
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
        manualChunks: (id) => {
          if (id.includes("/chunk/firebase-app")) return "firebase-app";
          if (id.includes("/chunk/firebase-auth")) return "firebase-auth";
          if (id.includes("/chunk/firebase-firestore")) return "firebase-firestore";
          if (id.includes("/chunk/rxdb_helper")) return "rxdb-helper";
          if (id.includes("/chunk/rxdb")) return "rxdb";
        },
      },
    },
  },
});
