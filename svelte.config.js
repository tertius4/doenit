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
      $logic: "./src/lib/v2/logic",
      $display: "./src/lib/v2/display",
      $domain: "./src/lib/v2/domain",
      $services: "./src/lib/v2/services",
    },
  },

  compilerOptions: {
    experimental: {
      async: true,
    },
  },

  vitePlugin: {
    inspector: false,
  },
};

export default config;
