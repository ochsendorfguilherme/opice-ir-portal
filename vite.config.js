import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) {
              return 'pdf-tools'
            }
            if (id.includes('@dnd-kit')) {
              return 'drag-drop'
            }
            if (id.includes('lucide-react')) {
              return 'icons'
            }
            if (id.includes('react-router-dom')) {
              return 'router'
            }
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'react-vendor'
            }
          }
          return undefined
        },
      },
    },
  },
})
