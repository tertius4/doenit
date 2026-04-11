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
