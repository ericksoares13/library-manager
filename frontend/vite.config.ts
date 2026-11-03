import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento o Vite serve o front e repassa a API para o Spring Boot
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
