import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { setupFiles: ["./tests/support/setup.ts"] },
  server: {
    proxy: {
      "/api": {
        target:
          process.env.PLANNER_API_URL ||
          "https://planner-api-ziyis-studio.vercel.app",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "react",
              test: /node_modules\/(react|react-dom|scheduler)\//,
              priority: 30,
            },
            { name: "auth", test: /node_modules\/@supabase\//, priority: 20 },
            {
              name: "motion",
              test: /node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//,
              priority: 20,
            },
            {
              name: "calendar",
              test: /node_modules\/(react-aria|react-stately|@react-aria|@react-stately|@internationalized|@react-types)[/-]/,
              priority: 20,
            },
            { name: "validation", test: /node_modules\/zod\//, priority: 20 },
          ],
        },
      },
    },
  },
});
