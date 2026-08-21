import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base relativa: permite que el build funcione en GitHub Pages
// sin importar el nombre del repositorio (project page o user page).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './',
  esbuild: {
    // En producción no queda ni un console.* ni un debugger en el bundle final, por seguridad
    // (que no se filtre nada por consola) y para no dar pistas de la estructura interna del
    // código. En desarrollo (`npm run dev`) sí se ven, para poder depurar normalmente.
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}))
