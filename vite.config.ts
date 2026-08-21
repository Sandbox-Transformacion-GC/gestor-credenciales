import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base relativa: permite que el build funcione en GitHub Pages
// sin importar el nombre del repositorio (project page o user page).
export default defineConfig({
  plugins: [react()],
  base: './',
})
