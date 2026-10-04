import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("recharts") || id.includes("d3-")) {
            return "charts";
          }

          if (id.includes("socket.io")) {
            return "socket";
          }

          if (id.includes("xlsx") || id.includes("qrcode")) {
            return "export";
          }

          if (
            id.includes("react-dom") ||
            id.includes("react-router") ||
            id.includes("/react/") ||
            id.includes("scheduler")
          ) {
            return "react-vendor";
          }

          if (id.includes("@tanstack") || id.includes("axios") || id.includes("lucide-react")) {
            return "app-vendor";
          }
        },
      },
    },
  },
  server: {
    host: true,
  },
});
