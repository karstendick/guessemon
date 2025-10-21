import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Support custom base path from environment variable (for PR previews)
  // Falls back to /guessemon/ for production builds
  base:
    command === 'build' ? (process.env.VITE_BASE_PATH ?? '/guessemon/') : '/',
}));
