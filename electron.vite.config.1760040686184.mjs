// electron.vite.config.mjs
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var __electron_vite_injected_dirname = "C:\\Users\\lai2v\\Desktop\\valt.pm\\DrathosApp\\drathos";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__electron_vite_injected_dirname, "src/main/index.js")
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    preload: {
      build: {
        rollupOptions: {
          input: {
            index: resolve(__electron_vite_injected_dirname, "src/preload/index.js")
          }
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [react(), tailwindcss()],
    renderer: {
      root: ".",
      build: {
        rollupOptions: {
          input: {
            index: resolve(__electron_vite_injected_dirname, "index.html")
          }
        }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
