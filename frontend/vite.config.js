// This is the main function from Vite.
import { defineConfig } from "vite";

// This enables React support in Vite
import react from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite"

// What it does:
// Helps handle file/folder paths
// Used for alias setup like @/src
import path from "path"


export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve : {
    alias: {
      "@" : path.resolve(__dirname, "./src"),
    },
  },

  server: {
    proxy : {
      "/api": {
          target: "http://localhost:5000",
          changeOrigin: true,
      },
    },
  },
});
// The proxy means frontend calls /api/... automatically forward to the backend.
// No CORS issues in development.