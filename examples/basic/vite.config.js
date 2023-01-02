/* eslint-disable no-undef */
import * as path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
        alias: {
          'react-table-odata-source': path.resolve(__dirname, '../../dist/index.js'),
        },
      },
      build: {
        rollupOptions: {
            sourcemap: true
        }
      }
})