import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const api = { "/api": { target: "http://127.0.0.1:8000", changeOrigin: false } };

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5173, proxy: api },
  preview: { port: 4173, proxy: api },
});
