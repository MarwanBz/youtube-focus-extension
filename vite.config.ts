import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import { resolve } from "path";
import manifest from "./manifest.json";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const googleClientId = env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID in environment.");
  }

  return {
    plugins: [
      react(),
      crx({
        manifest: {
          ...manifest,
          permissions: [...new Set([...(manifest.permissions ?? []), "identity"])],
          oauth2: {
            client_id: googleClientId,
            scopes: ["https://www.googleapis.com/auth/youtube.readonly"],
          },
        },
      }),
    ],
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      cors: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "index.html"),
          options: resolve(__dirname, "options.html"),
        },
      },
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@lib": resolve(__dirname, "./lib"),
      },
    },
  };
});
