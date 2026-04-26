import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DRATHOS_');

  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      define: {
        '__DISCORD_WEBHOOK__': JSON.stringify(env.DRATHOS_DISCORD_WEBHOOK || ''),
      },
      base: "./",
      build: {
        outDir: "dist-electron/main",
        minify: false,
        rollupOptions: {
          input: {
            index: resolve(__dirname, "src/main/index.js"),
            installWorker: resolve(__dirname, "src/main/installWorker.js"),
            uninstallWorker: resolve(__dirname, "src/main/uninstallWorker.js"),
          },
        },
      },
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        outDir: "dist-electron/preload",
        rollupOptions: {
          input: {
            index: resolve(__dirname, "src/preload/index.js"),
          },
        },
      },
    },
    renderer: {
      root: "src/renderer",
      base: "./",
      resolve: {
        alias: {
          "@renderer": resolve("src/renderer/src"),
          "@resources": resolve("resources"),
        },
      },
      plugins: [
        react(),
        tailwindcss()
      ],
      build: {
        outDir: "dist-electron/renderer",
        assetsDir: "assets",
        minify: 'esbuild',
        sourcemap: false,
        target: 'esnext',
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
          input: {
            index: resolve(__dirname, "src/renderer/index.html"),
            splash: resolve(__dirname, "src/renderer/splash.html"),
          },
          output: {
            format: 'es',
            manualChunks(id) {
              if (
                id.includes('node_modules/react/') ||
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react-router/') ||
                id.includes('node_modules/scheduler/')
              ) return 'vendor-react';
              if (
                id.includes('node_modules/framer-motion/') ||
                id.includes('node_modules/motion/')
              ) return 'vendor-framer';
              if (id.includes('node_modules/react-icons/')) return 'vendor-icons';
            },
          },
        },
      },
    },
  };
});
