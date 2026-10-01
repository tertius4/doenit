import tailwindcss from "@tailwindcss/vite";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

const codeSplitting = () => {
  return {
    name: "split-heavy-dependencies",
    applyToEnvironment: (environment) => environment.name === "client",
    config() {
      return {
        build: {
          rollupOptions: {
            output: {
              codeSplitting: {
                groups: [
                  {
                    name: "rxdb",
                    test: /node_modules[\\/](rxdb|dexie|rxjs)[\\/]/,
                    priority: 30,
                  },
                  {
                    name: "ajv",
                    test: /node_modules[\\/](ajv|ajv-formats|fast-uri|json-schema-traverse)[\\/]/,
                    priority: 40,
                  },
                  {
                    name: "firebase",
                    test: /node_modules[\\/](@firebase|firebase)[\\/]/,
                    priority: 20,
                  },
                ],
              },
            },
          },
        },
      };
    },
  };
};

export default defineConfig({
  plugins: [tailwindcss(), sveltekit(), codeSplitting()],
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
});
