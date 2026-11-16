import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { handleProxy } from "./api/proxy.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "one-api-local",
      configureServer(server) {
        server.middlewares.use("/api/proxy", async (req, res) => {
          const buffers: Buffer[] = [];
          for await (const chunk of req) buffers.push(Buffer.from(chunk));
          const request = new Request(
            `http://localhost:3000/api/proxy${req.url}`,
            {
              method: req.method,
              headers: req.headers as Record<string, string>,
              ...(req.method !== "GET" && req.method !== "HEAD"
                ? { body: Buffer.concat(buffers) }
                : {}),
            },
          );
          const response = await handleProxy(request);
          res.writeHead(response.status, Object.fromEntries(response.headers));
          res.end(Buffer.from(await response.arrayBuffer()));
        });
      },
    },
  ],
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
