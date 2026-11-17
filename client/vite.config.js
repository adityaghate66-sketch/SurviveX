import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load only VITE_* variables explicitly (avoids relying on import.meta.env
  // being populated while the config itself is being evaluated).
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:4000'

  return {
    plugins: [react()],
    server: {
      // Expose the dev server on the LAN so a friend on the same WiFi can open it.
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
