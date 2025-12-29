import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    base: "./",
    build: {
      outDir: "dist-electron/main",
      minify: false, // Désactiver la minification pour éviter les problèmes
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
      target: 'esnext', // Utiliser les fonctionnalités modernes pour éviter eval
      chunkSizeWarningLimit: 2000, // Augmenter la limite pour Electron (app locale)
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
          splash: resolve(__dirname, "src/renderer/splash.html"),
        },
        output: {
          format: 'es', // Format ES modules (pas de eval)
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router'],
            'vendor-framer': ['framer-motion'],
            'vendor-icons': ['react-icons'],
          },
        },
      },
    },
  },
});
