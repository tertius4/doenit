import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "index.html",
      precompress: false,
    }),
    experimental: {
      remoteFunctions: true,
    },
    // Registered by hand on the web only (src/lib/services/platform.ts): the phone apps must never serve a cached build.
    serviceWorker: {
      register: false,
    },
    alias: {
      $logic: "./src/lib/logic",
      $display: "./src/lib/display",
      $domain: "./src/lib/domain",
      $services: "./src/lib/services",
    },
  },

  compilerOptions: {
    experimental: {
      async: true,
    },
  },

  vitePlugin: {
    inspector: true,
  },
};

export default config;
